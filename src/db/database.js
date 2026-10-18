const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dataDirectory = path.resolve(__dirname, "../../data");
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "auth.sqlite"));

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const findUserStatement = database.prepare(
  "SELECT id, username, password_hash FROM users WHERE username = ?",
);
const insertUserStatement = database.prepare(
  "INSERT INTO users (username, password_hash) VALUES (?, ?)",
);

function findUserByUsername(username) {
  return findUserStatement.get(username);
}

function createUser(username, passwordHash) {
  const result = insertUserStatement.run(username, passwordHash);

  return {
    id: Number(result.lastInsertRowid),
    username,
  };
}

module.exports = {
  createUser,
  findUserByUsername,
};
