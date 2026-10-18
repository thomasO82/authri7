const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || typeof payload.username !== "string") {
      return res.status(401).json({ error: "unauthorized" });
    }

    req.authUser = {
      id: payload.sub,
      username: payload.username,
    };

    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized" });
  }
}

module.exports = requireAuth;
