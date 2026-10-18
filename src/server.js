require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET est obligatoire. Configurez-le dans votre environnement ou fichier .env.");
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";
const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "invalid_request" });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = jwt.sign(
    { username: ADMIN_USERNAME },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" },
  );

  return res.status(200).json({
    token,
    token_type: "Bearer",
    expires_in: 3600,
  });
});

app.get("/api/me", (req, res) => {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const payload = jwt.verify(match[1], JWT_SECRET, { algorithms: ["HS256"] });

    if (typeof payload.username !== "string") {
      return res.status(401).json({ error: "unauthorized" });
    }

    return res.status(200).json({
      user: { username: payload.username },
    });
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_request" });
  }

  return res.status(500).json({ error: "internal_server_error" });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Serveur d'authentification disponible sur http://localhost:${PORT}`);
  });
}

module.exports = app;
