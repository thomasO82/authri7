const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  createUser,
  findUserByEmail,
  findUserByUsername,
} = require("../db/database");
const { sendError, sendValidationError, validationDetail } = require("../utils/http-errors");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const BCRYPT_ROUNDS = 12;

function createToken(user) {
  const claims = { username: user.username };
  if (user.email) {
    claims.email = user.email;
  }

  return jwt.sign(claims, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
    subject: String(user.id),
  });
}

function tokenResponse(user) {
  return {
    token: createToken(user),
    token_type: "Bearer",
    expires_in: 3600,
  };
}

function validateUsername(value, details) {
  if (value === undefined) {
    details.push(validationDetail("username", "required", "Le nom d'utilisateur est obligatoire."));
    return undefined;
  }

  if (typeof value !== "string") {
    details.push(validationDetail("username", "invalid_type", "Le nom d'utilisateur doit être une chaîne de caractères."));
    return undefined;
  }

  const username = value.trim();
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

  return username;
}

function validateEmail(value, details) {
  if (value === undefined) {
    details.push(validationDetail("email", "required", "L'adresse e-mail est obligatoire."));
    return undefined;
  }

  if (typeof value !== "string") {
    details.push(validationDetail("email", "invalid_type", "L'adresse e-mail doit être une chaîne de caractères."));
    return undefined;
  }

  const email = value.trim().toLowerCase();
  const emailLength = Array.from(email).length;

  if (emailLength > 254) {
    details.push(validationDetail(
      "email",
      "too_long",
      `L'adresse e-mail contient ${emailLength} caractères après normalisation; le maximum est de 254.`,
    ));
  }

  if (!EMAIL_PATTERN.test(email)) {
    details.push(validationDetail(
      "email",
      "invalid_format",
      "L'adresse e-mail doit contenir un nom, le caractère @ et un domaine avec une extension (exemple : nom@exemple.fr).",
    ));
  }

  return email;
}

function validatePassword(value, details) {
  if (value === undefined) {
    details.push(validationDetail("password", "required", "Le mot de passe est obligatoire."));
    return undefined;
  }

  if (typeof value !== "string") {
    details.push(validationDetail("password", "invalid_type", "Le mot de passe doit être une chaîne de caractères."));
    return undefined;
  }

  const passwordLength = Array.from(value).length;
  const passwordBytes = Buffer.byteLength(value, "utf8");

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

  return value;
}

function validateRegistration(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      details: [validationDetail("body", "required", "Envoyez un objet JSON avec les champs username, email et password.")],
    };
  }

  const details = [];
  return {
    username: validateUsername(body.username, details),
    email: validateEmail(body.email, details),
    password: validatePassword(body.password, details),
    details,
  };
}

function validateLogin(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      details: [validationDetail("body", "required", "Envoyez un objet JSON avec les champs email et password.")],
    };
  }

  const details = [];
  if (body.username !== undefined) {
    details.push(validationDetail(
      "username",
      "unsupported_field",
      "La connexion par nom d'utilisateur n'est pas acceptée. Utilisez le champ email.",
    ));
  }

  const email = validateEmail(body.email, details);
  const password = validatePassword(body.password, details);
  return { details, email, password };
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

function sendEmailTaken(res) {
  return sendError(
    res,
    409,
    "email_taken",
    "Cette adresse e-mail est déjà associée à un compte. Utilisez une autre adresse ou connectez-vous.",
    [validationDetail("email", "already_taken", "Les adresses e-mail sont normalisées en minuscules et uniques.")],
  );
}

router.post("/register", async (req, res) => {
  const { details, username, email, password } = validateRegistration(req.body);

  if (details.length) {
    return sendValidationError(res, details);
  }

  if (findUserByUsername(username)) {
    return sendUsernameTaken(res);
  }

  if (findUserByEmail(email)) {
    return sendEmailTaken(res);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const user = createUser(username, email, passwordHash);
    return res.status(201).json({
      user: { username: user.username, email: user.email },
      ...tokenResponse(user),
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      if (findUserByEmail(email)) {
        return sendEmailTaken(res);
      }

      if (findUserByUsername(username)) {
        return sendUsernameTaken(res);
      }
    }

    throw error;
  }
});

router.post("/login", async (req, res) => {
  const { details, email, password } = validateLogin(req.body);

  if (details.length) {
    return sendValidationError(res, details);
  }

  const user = findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return sendError(
      res,
      401,
      "invalid_credentials",
      "Adresse e-mail ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez.",
    );
  }

  return res.status(200).json(tokenResponse(user));
});

module.exports = router;
