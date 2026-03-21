const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const { initDb, get, run, del } = require('./db.js');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to validate PEM formatted public key
function isValidPublicKey(key) {
    if (!key || typeof key !== 'string') return false;
    return key.includes('-----BEGIN PUBLIC KEY-----') && key.includes('-----END PUBLIC KEY-----');
}

// Set up rate limiters for security
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { error: 'Too many requests, please try again later.' }
});

app.use('/register', apiLimiter);
app.use('/request-auth', apiLimiter);
app.use('/verify', apiLimiter);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_gym_tracker_key';

// Keep WebSocket connections in memory since they cannot be stored in DB
const pendingSockets = new Map(); // sessionId -> { desktopSocket }
const mobileSockets = new Map(); // deviceId -> ws connection

// 1. Mobile App registers its generated public key
app.post('/register', (req, res) => {
    const { publicKey } = req.body;
    if (!isValidPublicKey(publicKey)) return res.status(400).json({ error: 'Valid RSA Public key (PEM) required' });

    const deviceId = crypto.randomUUID();
    run('INSERT INTO registered_devices (deviceId, publicKey) VALUES (?, ?)', [deviceId, publicKey]);
    console.log(`Mobile device registered: ${deviceId}`);
    
    // We also return the deviceId so the mobile app can identify itself later
    res.json({ deviceId, message: 'Registered successfully' });
});

// 2. Desktop App requests authentication (starts login process)
app.post('/request-auth', (req, res) => {
    const sessionId = crypto.randomUUID();
    run('INSERT INTO pending_sessions (sessionId, status) VALUES (?, ?)', [sessionId, 'pending']);
    pendingSockets.set(sessionId, { desktopSocket: null });
    
    console.log(`New auth request generated: ${sessionId}`);

    // Notify all connected mobile apps about the new request
    const authRequestPayload = JSON.stringify({
        type: 'auth_request',
        sessionId,
        message: 'New login attempt from Desktop App',
        timestamp: Date.now()
    });
    
    let notified = false;
    for (const [deviceId, ws] of mobileSockets.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(authRequestPayload);
            notified = true;
        }
    }

    if (!notified) {
         console.log('Warning: No mobile devices connected via WS to receive the request.');
    }

    res.json({ sessionId, message: 'Auth requested' });
});

// 3. Mobile App sends back its signed approval
app.post('/verify', (req, res) => {
    const { sessionId, deviceId, signature, payload } = req.body;
    
    const sessionRecord = get('SELECT * FROM pending_sessions WHERE sessionId = ? AND status = ?', [sessionId, 'pending']);
    if (!sessionRecord) {
        return res.status(400).json({ error: 'Invalid or expired session' });
    }
    
    const deviceRecord = get('SELECT publicKey FROM registered_devices WHERE deviceId = ?', [deviceId]);
    if (!deviceRecord) {
        return res.status(400).json({ error: 'Unregistered device. Please register first.' });
    }

    // Verify the cryptographical signature using the registered public key
    try {
        const verify = crypto.createVerify('SHA256');
        verify.update(JSON.stringify(payload)); // The payload should be what the signature is based on
        verify.end();
        
        const isValid = verify.verify(deviceRecord.publicKey, signature, 'base64');
        
        if (!isValid) {
            console.log(`Invalid signature for session ${sessionId} by device ${deviceId}`);
            return res.status(403).json({ error: 'Invalid cryptographic signature' });
        }
        
        console.log(`Signature verified for device ${deviceId}. Payload action: ${payload.action}`);

        if (payload.action === 'Approve') {
            // Success! Issue a JWT for the Desktop App to use
            const token = jwt.sign(
                { authorized: true, sessionId, source: 'desktop_app' }, 
                JWT_SECRET, 
                { expiresIn: '8h' }
            );
            
            // Read the dynamically generated AES Keys from .env
            let aesKey = process.env.AES_KEY || null;
            let aesIv = process.env.AES_IV || null;
            
            // Push JWT & Decryption keys to the waiting desktop installer via WebSocket
            const session = pendingSockets.get(sessionId);
            if (session && session.desktopSocket && session.desktopSocket.readyState === WebSocket.OPEN) {
                session.desktopSocket.send(JSON.stringify({
                    type: 'auth_success',
                    token,
                    aesKey,
                    aesIv
                }));
            }
            
            del('DELETE FROM pending_sessions WHERE sessionId = ?', [sessionId]);
            pendingSockets.delete(sessionId);
            res.json({ success: true, message: 'Authorization successful' });
        } else {
            // Request was actively denied
            const session = pendingSockets.get(sessionId);
            if (session && session.desktopSocket && session.desktopSocket.readyState === WebSocket.OPEN) {
                session.desktopSocket.send(JSON.stringify({
                    type: 'auth_denied',
                    message: 'Login request denied by mobile authenticator'
                }));
            }
            del('DELETE FROM pending_sessions WHERE sessionId = ?', [sessionId]);
            pendingSockets.delete(sessionId);
            res.json({ success: true, message: 'Authorization denied' });
        }
    } catch (err) {
        console.error('Error verifying signature:', err);
        res.status(500).json({ error: 'Internal server error during verification' });
    }
});

// WebSocket Setup (/relay)
wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    // Add ping/pong to detect stale connections
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    
    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Desktop App identifies itself to wait for a specific session
            if (data.type === 'desktop_connect') {
                const { sessionId } = data;
                const sessionRecord = get('SELECT * FROM pending_sessions WHERE sessionId = ?', [sessionId]);
                
                if (sessionRecord) {
                    if (!pendingSockets.has(sessionId)) {
                        pendingSockets.set(sessionId, { desktopSocket: ws });
                    } else {
                        const session = pendingSockets.get(sessionId);
                        session.desktopSocket = ws;
                    }
                    console.log(`Desktop app WS connected for pending session ${sessionId}`);
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Unknown session ID' }));
                }
            } 
            // Mobile App identifies itself to receive incoming push requests
            else if (data.type === 'mobile_connect') {
                const { deviceId } = data;
                const deviceRecord = get('SELECT * FROM registered_devices WHERE deviceId = ?', [deviceId]);
                
                if (deviceRecord) {
                    mobileSockets.set(deviceId, ws);
                    console.log(`Mobile app WS connected for deviceId ${deviceId}`);
                    
                    ws.on('close', () => {
                        console.log(`Mobile app WS disconnected for deviceId ${deviceId}`);
                        mobileSockets.delete(deviceId);
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Unregistered device instance' }));
                }
            }
        } catch (e) {
            console.error('Invalid WS message payload received', e);
        }
    });
});

const PORT = process.env.PORT || 3005;

// Initialize Database then Start Server
initDb().then(() => {
    server.listen(PORT, () => {
        console.log(`Auth Bridge Server logically running on http://localhost:${PORT}`);
    });

    // Cleanup interval for stale WebSocket connections
    setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

}).catch(err => {
    console.error('Failed to init DB:', err);
    process.exit(1);
});
