const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dataDirectory = path.resolve(__dirname, "../../data");
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(path.join(dataDirectory, "auth.sqlite"));

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const columns = database.prepare("PRAGMA table_info(users)").all();
if (columns.some((column) => column.name === "username")) {
  const emailExpression = columns.some((column) => column.name === "email") ? "email" : "NULL";
  const removeUsernameColumn = database.transaction(() => {
    database.exec(`
      CREATE TABLE users_without_username (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    database.exec(`
      INSERT INTO users_without_username (id, email, password_hash, created_at)
      SELECT id, ${emailExpression}, password_hash, created_at FROM users
    `);
    database.exec("DROP TABLE users");
    database.exec("ALTER TABLE users_without_username RENAME TO users");
  });

  removeUsernameColumn();
}

const findUserByEmailStatement = database.prepare(
  "SELECT id, email, password_hash FROM users WHERE email = ? COLLATE NOCASE",
);
const insertUserStatement = database.prepare(
  "INSERT INTO users (email, password_hash) VALUES (?, ?)",
);

function findUserByEmail(email) {
  return findUserByEmailStatement.get(email);
}

function createUser(email, passwordHash) {
  const result = insertUserStatement.run(email, passwordHash);

  return {
    id: Number(result.lastInsertRowid),
    email,
  };
}

module.exports = {
  createUser,
  findUserByEmail,
};
