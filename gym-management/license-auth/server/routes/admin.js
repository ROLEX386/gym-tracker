const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('../models/request');
const { generateToken, parseExpiryToMs, sendEmail } = require('../utils/token');
const requireAdminAuth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USERNAME) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// GET /api/admin/requests
router.get('/requests', requireAdminAuth, (req, res) => {
  const { status } = req.query;

  try {
    let rows;
    if (status && status !== 'all') {
      rows = db.all('SELECT * FROM license_requests WHERE status = ? ORDER BY createdAt DESC', [status]);
    } else {
      rows = db.all('SELECT * FROM license_requests ORDER BY createdAt DESC', []);
    }
    res.json(rows);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/approve/:requestId
router.post('/approve/:requestId', requireAdminAuth, async (req, res) => {
  const { requestId } = req.params;

  try {
    const request = db.get('SELECT * FROM license_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status === 'approved') {
      return res.status(400).json({ error: 'Request already approved' });
    }

    const tokenExpiryStr = config.downloadTokenExpiry || '15m';
    const expiresAt = new Date(Date.now() + parseExpiryToMs(tokenExpiryStr)).toISOString();

    const { v4: uuidv4 } = require('uuid');
    const tokenId = uuidv4();
    const tokenStr = generateToken();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO download_tokens (id, requestId, deviceId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [tokenId, requestId, request.deviceId, tokenStr, expiresAt, now]
    );

    db.run(
      `UPDATE license_requests SET status = 'approved', updatedAt = ? WHERE id = ?`,
      [now, requestId]
    );

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      await sendEmail(
        request.email,
        "Your Gym Management Pro License is Approved!",
        `Hello ${request.name},\n\nYour request has been approved. Your download will start automatically in the client app. The link is valid for ${tokenExpiryStr}.`
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in approve:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/deny/:requestId
router.post('/deny/:requestId', requireAdminAuth, async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  try {
    const request = db.get('SELECT * FROM license_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    db.run(
      `UPDATE license_requests SET status = 'denied', denialReason = ?, updatedAt = ? WHERE id = ?`,
      [reason, new Date().toISOString(), requestId]
    );

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      await sendEmail(
        request.email,
        "License Request Update",
        `Hello ${request.name},\n\nYour request was denied.\n\nReason: ${reason}\n\nContact: ${config.adminEmail}`
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in deny:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/revoke/:requestId — Cancel an approved license
router.post('/revoke/:requestId', requireAdminAuth, async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  try {
    const request = db.get('SELECT * FROM license_requests WHERE id = ?', [requestId]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'approved') {
      return res.status(400).json({ error: 'Request is not approved' });
    }

    const now = new Date().toISOString();

    // Expire all download tokens for this request
    db.run(
      `UPDATE download_tokens SET used = 1 WHERE requestId = ?`,
      [requestId]
    );

    // Set status back to denied with the revocation reason
    db.run(
      `UPDATE license_requests SET status = 'denied', denialReason = ?, updatedAt = ? WHERE id = ?`,
      [reason || 'License revoked by administrator', now, requestId]
    );

    // Send revocation email if SMTP configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      await sendEmail(
        request.email,
        "License Request Update",
        `Hello ${request.name},\n\nYour approved license for ${config.softwareName} has been revoked.\n\nReason: ${reason || 'Revoked by administrator'}\n\nContact: ${config.adminEmail}`
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in revoke:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
