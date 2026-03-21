const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Create reusable transporter object using the default SMTP transport
let transporter = null;

const isSmtpConfigured = 
  process.env.SMTP_USER && 
  process.env.SMTP_USER !== 'your@gmail.com' && 
  process.env.SMTP_PASS && 
  process.env.SMTP_PASS !== 'your_app_password';

if (isSmtpConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("✅ SMTP Transporter initialized");
  } catch (error) {
    console.error("❌ Failed to initialize SMTP transporter:", error.message);
  }
} else {
  console.log("ℹ️ SMTP not configured or using placeholders. Email notifications will be skipped.");
}

/**
 * Generate a random UUID token
 */
function generateToken() {
  return uuidv4();
}

/**
 * Parses time strings like "15m", "1h", "24h" to milliseconds
 */
function parseExpiryToMs(expiryStr) {
  const match = expiryStr.match(/^(\d+)([a-z])$/);
  if (!match) return 15 * 60 * 1000; // default 15m
  const amount = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'm') return amount * 60 * 1000;
  if (unit === 'h') return amount * 60 * 60 * 1000;
  if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000;
}

/**
 * Send email
 */
async function sendEmail(to, subject, text, html) {
  if (!transporter) {
    console.log(`ℹ️ Email skipped (transporter not initialized): ${subject} to ${to}`);
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from: `"License Manager" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    console.log("Message sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

module.exports = {
  generateToken,
  parseExpiryToMs,
  sendEmail
};
