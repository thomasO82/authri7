const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi");
const authRouter = require("./routes/auth.routes");
const meRouter = require("./routes/me.routes");
const { sendError } = require("./utils/http-errors");

const app = express();

app.use(express.json({ limit: "100kb" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api", authRouter);
app.use("/api", meRouter);

app.use("/api", (req, res) => {
  return sendError(res, 404, "not_found", `La route ${req.method} ${req.originalUrl} n'existe pas.`);
});

app.use((req, res) => {
  return sendError(res, 404, "not_found", `La route ${req.method} ${req.originalUrl} n'existe pas.`);
});

app.use((err, req, res, next) => {
  const parserErrors = {
    "entity.parse.failed": 400,
    "request.aborted": 400,
    "entity.too.large": 413,
    "encoding.unsupported": 415,
    "charset.unsupported": 415,
  };
  const status = parserErrors[err.type];

  if (status === 413) {
    const limit = err.limit || 102400;
    return sendError(
      res,
      413,
      "payload_too_large",
      `Le corps de la requête dépasse la limite de ${limit} octets. Réduisez sa taille puis réessayez.`,
    );
  }

  if (status === 415) {
    return sendError(
      res,
      415,
      "unsupported_encoding",
      "L'encodage ou le jeu de caractères de la requête n'est pas pris en charge. Utilisez JSON en UTF-8.",
    );
  }

  if (err.type === "request.aborted") {
    return sendError(res, 400, "invalid_request", "La requête a été interrompue avant sa réception complète. Réessayez.");
  }

  if (err.type === "entity.parse.failed") {
    return sendError(
      res,
      400,
      "invalid_request",
      "Le corps n'est pas un JSON valide. Vérifiez les guillemets, virgules et accolades.",
      [{ field: "body", code: "invalid_json", message: "Impossible de lire le corps JSON envoyé." }],
    );
  }

  if (status === 400) {
    return sendError(res, 400, "invalid_request", "La requête est invalide. Vérifiez les données envoyées.");
  }

  return sendError(res, 500, "internal_server_error", "Une erreur interne est survenue. Réessayez plus tard.");
});

module.exports = app;
