const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dataDirectory = path.resolve(__dirname, "../../data");
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "auth.sqlite"));

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const columns = database.prepare("PRAGMA table_info(users)").all();
if (!columns.some((column) => column.name === "username")) {
  database.exec("ALTER TABLE users ADD COLUMN username TEXT");
}

database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
  ON users(username COLLATE NOCASE)
  WHERE username IS NOT NULL
`);

const findUserByEmailStatement = database.prepare(
  "SELECT id, username, email, password_hash FROM users WHERE email = ? COLLATE NOCASE",
);
const findUserByUsernameStatement = database.prepare(
  "SELECT id, username, email, password_hash FROM users WHERE username = ? COLLATE NOCASE",
);
const insertUserStatement = database.prepare(
  "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
);

function findUserByEmail(email) {
  return findUserByEmailStatement.get(email);
}

function findUserByUsername(username) {
  return findUserByUsernameStatement.get(username);
}

function createUser(username, email, passwordHash) {
  const result = insertUserStatement.run(username, email, passwordHash);

  return {
    id: Number(result.lastInsertRowid),
    username,
    email,
  };
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
};
