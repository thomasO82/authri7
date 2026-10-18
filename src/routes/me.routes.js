const express = require("express");
const requireAuth = require("../middleware/require-auth");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: {
      username: req.authUser.username,
      ...(req.authUser.email ? { email: req.authUser.email } : {}),
    },
  });
});

module.exports = router;
