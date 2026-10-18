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

let columns = database.prepare("PRAGMA table_info(users)").all();
if (!columns.some((column) => column.name === "email")) {
  database.exec("ALTER TABLE users ADD COLUMN email TEXT");
  columns = database.prepare("PRAGMA table_info(users)").all();
}

if (!columns.some((column) => column.name === "username")) {
  database.exec("ALTER TABLE users ADD COLUMN username TEXT");
}

const usernameUniqueIndexes = database.prepare("PRAGMA index_list(users)").all().filter((index) => {
  if (!index.unique) return false;

  const escapedIndexName = index.name.replace(/"/g, '""');
  const indexColumns = database.prepare(`PRAGMA index_info("${escapedIndexName}")`).all();
  return indexColumns.length === 1 && indexColumns[0].name === "username";
});

if (usernameUniqueIndexes.length) {
  const removeUsernameUniqueness = database.transaction(() => {
    database.exec(`
      CREATE TABLE users_without_username_unique (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    database.exec(`
      INSERT INTO users_without_username_unique (id, username, email, password_hash, created_at)
      SELECT id, username, email, password_hash, created_at FROM users
    `);
    database.exec("DROP TABLE users");
    database.exec("ALTER TABLE users_without_username_unique RENAME TO users");
  });

  removeUsernameUniqueness();
}

const findUserByEmailStatement = database.prepare(
  "SELECT id, username, email, password_hash FROM users WHERE email = ? COLLATE NOCASE",
);
const insertUserStatement = database.prepare(
  "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
);

function findUserByEmail(email) {
  return findUserByEmailStatement.get(email);
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
};
