const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'database.sqlite');

let db;

function getDb() {
  return db;
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS license_requests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      businessName TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      status TEXT NOT NULL,
      denialReason TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS download_tokens (
      id TEXT PRIMARY KEY,
      requestId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS download_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      ipAddress TEXT NOT NULL,
      downloadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveDb();
  console.log('Database initialized.');
}

// Helper: run a SQL statement and save to disk
function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// Helper: get a single row
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Helper: get all rows
function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

module.exports = { initDb, run, get, all, saveDb };
