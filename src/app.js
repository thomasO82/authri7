const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openApiDocument = require("./openapi");
const authRouter = require("./routes/auth.routes");
const meRouter = require("./routes/me.routes");

const app = express();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use("/api", authRouter);
app.use("/api", meRouter);

app.use((err, req, res, next) => {
  const parserErrors = {
    "entity.parse.failed": 400,
    "request.aborted": 400,
    "entity.too.large": 413,
    "encoding.unsupported": 415,
    "charset.unsupported": 415,
  };
  const status = parserErrors[err.type];

  if (status) {
    return res.status(status).json({
      error: status === 413 ? "payload_too_large" : status === 415 ? "unsupported_encoding" : "invalid_request",
    });
  }

  return res.status(500).json({ error: "internal_server_error" });
});

module.exports = app;
