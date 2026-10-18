const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByUsername } = require("../db/database");
const { sendError, sendValidationError, validationDetail } = require("../utils/http-errors");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
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

function validateCredentials(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      details: [
        validationDetail("body", "required", "Envoyez un objet JSON avec les champs username et password."),
      ],
    };
  }

  const details = [];
  let username;
  let password;

  if (body.username === undefined) {
    details.push(validationDetail("username", "required", "Le nom d'utilisateur est obligatoire."));
  } else if (typeof body.username !== "string") {
    details.push(validationDetail("username", "invalid_type", "Le nom d'utilisateur doit être une chaîne de caractères."));
  } else {
    username = body.username.trim();
    const usernameLength = Array.from(username).length;

    if (usernameLength < 3 || usernameLength > 32) {
      details.push(validationDetail(
        "username",
        "invalid_length",
        `Le nom d'utilisateur contient ${usernameLength} caractères après suppression des espaces; il en faut entre 3 et 32.`,
      ));
    }

    if (!/^[A-Za-z0-9_.-]*$/.test(username)) {
      details.push(validationDetail(
        "username",
        "invalid_characters",
        "Le nom d'utilisateur ne peut contenir que des lettres ASCII, des chiffres, un point, un tiret ou un tiret bas.",
      ));
    }
  }

  if (body.password === undefined) {
    details.push(validationDetail("password", "required", "Le mot de passe est obligatoire."));
  } else if (typeof body.password !== "string") {
    details.push(validationDetail("password", "invalid_type", "Le mot de passe doit être une chaîne de caractères."));
  } else {
    password = body.password;
    const passwordLength = Array.from(password).length;
    const passwordBytes = Buffer.byteLength(password, "utf8");

    if (passwordLength < 8) {
      details.push(validationDetail(
        "password",
        "too_short",
        `Le mot de passe contient ${passwordLength} caractères; le minimum est de 8.`,
      ));
    }

    if (passwordBytes > 72) {
      details.push(validationDetail(
        "password",
        "too_long",
        `Le mot de passe occupe ${passwordBytes} octets UTF-8; le maximum est de 72 octets.`,
      ));
    }
  }

  return { details, username, password };
}

function sendUsernameTaken(res) {
  return sendError(
    res,
    409,
    "username_taken",
    "Ce nom d'utilisateur est déjà utilisé. Choisissez-en un autre.",
    [validationDetail("username", "already_taken", "Les noms d'utilisateur sont uniques sans distinction de casse.")],
  );
}

router.post("/register", async (req, res) => {
  const { details, username, password } = validateCredentials(req.body);

  if (details.length) {
    return sendValidationError(res, details);
  }

  if (findUserByUsername(username)) {
    return sendUsernameTaken(res);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = createUser(username, passwordHash);
    return res.status(201).json({
      user: { username: user.username },
      ...tokenResponse(user),
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return sendUsernameTaken(res);
    }

    throw error;
  }
});

router.post("/login", async (req, res) => {
  const { details, username, password } = validateCredentials(req.body);

  if (details.length) {
    return sendValidationError(res, details);
  }

  const user = findUserByUsername(username);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return sendError(
      res,
      401,
      "invalid_credentials",
      "Nom d'utilisateur ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez.",
    );
  }

  return res.status(200).json(tokenResponse(user));
});

module.exports = router;
