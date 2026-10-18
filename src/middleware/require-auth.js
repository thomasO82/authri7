const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/http-errors");

function unauthorized(res, message) {
  return sendError(res, 401, "unauthorized", message);
}

function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";

  if (!authorization) {
    return unauthorized(res, "Jeton manquant. Envoyez-le dans l'en-tête Authorization: Bearer <token>.");
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return unauthorized(res, "En-tête Authorization invalide. Le format attendu est Bearer <token>.");
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      (payload.username !== undefined && typeof payload.username !== "string")
    ) {
      return unauthorized(res, "Le jeton ne contient pas les informations d'identité attendues. Reconnectez-vous.");
    }

    req.authUser = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
    };

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return unauthorized(res, "Le jeton a expiré. Reconnectez-vous pour en obtenir un nouveau.");
    }

    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      return unauthorized(res, "Le jeton est invalide ou n'est pas encore actif. Vérifiez-le ou reconnectez-vous.");
    }

    return unauthorized(res, "Impossible de vérifier le jeton. Reconnectez-vous pour en obtenir un nouveau.");
  }
}

module.exports = requireAuth;
