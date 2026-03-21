const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./models/request');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: ['http://localhost:3001', 'http://localhost:3002'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API Routes
const licenseRoutes = require('./routes/license');
const adminRoutes = require('./routes/admin');

// Use API Routes
app.use('/api', licenseRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'License Auth API running' });
});

// Initialize DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ License Auth API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});
