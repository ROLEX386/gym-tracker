const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

// Serve static admin files
app.use(express.static(path.join(__dirname, 'admin')));

// Redirect all non-API paths to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin Dashboard running on http://localhost:${PORT}`);
});
