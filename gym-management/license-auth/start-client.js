const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static client files
app.use(express.static(path.join(__dirname, 'client')));

// Redirect all non-API paths to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Client App running on http://localhost:${PORT}`);
});
