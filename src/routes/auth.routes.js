const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByUsername } = require("../db/database");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
const BCRYPT_ROUNDS = 12;

function createToken(user) {
  return jwt.sign(
    { username: user.username },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "1h",
      subject: String(user.id),
    },
  );
}

function tokenResponse(user) {
  return {
    token: createToken(user),
    token_type: "Bearer",
    expires_in: 3600,
  };
}

router.post("/register", async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "invalid_request" });
  }

  const normalizedUsername = username.trim();
  const passwordLength = [...password].length;
  const passwordBytes = Buffer.byteLength(password, "utf8");

  if (
    !USERNAME_PATTERN.test(normalizedUsername) ||
    passwordLength < 8 ||
    passwordBytes > 72
  ) {
    return res.status(400).json({ error: "invalid_request" });
  }

  if (findUserByUsername(normalizedUsername)) {
    return res.status(409).json({ error: "username_taken" });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = createUser(normalizedUsername, passwordHash);
    return res.status(201).json({
      user: { username: user.username },
      ...tokenResponse(user),
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "username_taken" });
    }

    throw error;
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "invalid_request" });
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const user = findUserByUsername(username.trim());

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  return res.status(200).json(tokenResponse(user));
});

module.exports = router;
