const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const db = require('../models/request');

// Load config
const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Rate limit for license requests (3 per hour per IP)
const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many requests from this IP, please try again after an hour' }
});

// POST /api/request-license
router.post('/request-license', requestLimiter, (req, res) => {
  const { name, email, businessName, deviceId } = req.body;

  if (!name || !email || !businessName || !deviceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existing = db.get('SELECT id FROM license_requests WHERE deviceId = ? AND status = ?', [deviceId, 'approved']);
    if (existing) {
      return res.status(400).json({ error: 'Device already has an approved license' });
    }

    const { v4: uuidv4 } = require('uuid');
    const requestId = uuidv4();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO license_requests (id, name, email, businessName, deviceId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, name, email, businessName, deviceId, 'pending', now, now]
    );

    res.json({ requestId, status: 'pending' });
  } catch (error) {
    console.error('Error in request-license:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/check-status/:requestId
router.get('/check-status/:requestId', (req, res) => {
  const { requestId } = req.params;

  try {
    const request = db.get('SELECT status, denialReason FROM license_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status === 'approved') {
      const tokenRecord = db.get(
        'SELECT token FROM download_tokens WHERE requestId = ? ORDER BY createdAt DESC LIMIT 1',
        [requestId]
      );
      if (tokenRecord) {
        return res.json({
          status: 'approved',
          downloadUrl: `http://localhost:3000/api/download/${tokenRecord.token}`
        });
      }
      return res.json({ status: 'approved' });
    }

    if (request.status === 'denied') {
      return res.json({ status: 'denied', reason: request.denialReason });
    }

    res.json({ status: 'pending' });
  } catch (error) {
    console.error('Error in check-status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/download/:token
router.get('/download/:token', (req, res) => {
  const { token } = req.params;
  const clientDeviceId = req.headers['x-device-id'] || req.query.deviceId;

  try {
    const tokenRecord = db.get('SELECT * FROM download_tokens WHERE token = ?', [token]);

    if (!tokenRecord) {
      return res.status(403).json({ error: 'Invalid download token' });
    }

    if (tokenRecord.used) {
      return res.status(403).json({ error: 'Token already used' });
    }

    if (new Date(tokenRecord.expiresAt) < new Date()) {
      return res.status(403).json({ error: 'Token expired' });
    }

    if (clientDeviceId && tokenRecord.deviceId !== clientDeviceId) {
      return res.status(403).json({ error: 'Device ID mismatch' });
    }

    db.run('UPDATE download_tokens SET used = 1 WHERE id = ?', [tokenRecord.id]);

    const ipAddress = req.ip || req.connection.remoteAddress;
    db.run(
      'INSERT INTO download_logs (requestId, deviceId, ipAddress, downloadedAt) VALUES (?, ?, ?, ?)',
      [tokenRecord.requestId, tokenRecord.deviceId, ipAddress, new Date().toISOString()]
    );

    // Resolve the file path relative to the config directory
    const softwarePath = config.softwareFilePath.replace(/^\.\.\//, '');
    const filePath = path.resolve(__dirname, '..', '..', '..', softwarePath);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found at: ${filePath}`);
      return res.status(404).json({ error: 'Software file not found on server' });
    }

    res.download(filePath, 'GymManagementSetup.exe');
  } catch (error) {
    console.error('Error in download:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
