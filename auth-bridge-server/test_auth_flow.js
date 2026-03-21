const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');

const API_URL = 'http://localhost:3005';
const WS_URL = 'ws://localhost:3005';

async function testFlow() {
  console.log('1. Starting test flow...');
  
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  let deviceId;
  try {
    console.log('2. Registering device...');
    const regRes = await axios.post(`${API_URL}/register`, { publicKey });
    deviceId = regRes.data.deviceId;
    console.log('Device registered:', deviceId);
  } catch(e) { console.error('Register Fail:', e.response?.data || e.message); return; }

  const mobileWs = new WebSocket(WS_URL);
  mobileWs.on('error', (err) => console.error('Mobile WS Error:', err));
  
  // Register mobile connection
  await new Promise((resolve) => {
    mobileWs.on('open', () => {
      mobileWs.send(JSON.stringify({ type: 'mobile_connect', deviceId }));
      console.log('Mobile WS connected.');
      resolve();
    });
  });

  // PRE-REGISTER Handler to avoid race conditions
  let currentSessionId;
  mobileWs.on('message', async (msg) => {
      console.log('Mobile WS received:', msg.toString());
      const data = JSON.parse(msg.toString());
      if (data.type === 'auth_request') {
          console.log('4. Mobile received request. Session:', data.sessionId);
          if (data.sessionId === currentSessionId) {
              console.log('Approving...');
              const payload = { action: 'Approve', sessionId: data.sessionId, timestamp: Date.now() };
              const sign = crypto.createSign('SHA256');
              sign.update(JSON.stringify(payload));
              sign.end();
              const signature = sign.sign(privateKey, 'base64');
              
              try {
                 await axios.post(`${API_URL}/verify`, {
                     sessionId: data.sessionId,
                     deviceId,
                     signature,
                     payload
                 });
                 console.log('Verification sent.');
              } catch(e) {
                 console.error('Verify failed:', e.response?.data || e.message);
              }
          }
      }
  });

  console.log('3. Desktop requesting auth...');
  const authReq = await axios.post(`${API_URL}/request-auth`);
  currentSessionId = authReq.data.sessionId;
  console.log('Auth requested, session:', currentSessionId);

  const desktopWs = new WebSocket(WS_URL);
  desktopWs.on('error', (err) => console.error('Desktop WS Error:', err));
  desktopWs.on('open', () => {
      desktopWs.send(JSON.stringify({ type: 'desktop_connect', sessionId: currentSessionId }));
      console.log('Desktop WS connected.');
  });

  desktopWs.on('message', (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.type === 'auth_success') {
          console.log('5. Success! Received token from WS.');
          console.log('Test completed successfully.');
          process.exit(0);
      } else if (data.type === 'auth_denied') {
          console.log('Denied by device.');
          process.exit(1);
      }
  });
}

testFlow();
