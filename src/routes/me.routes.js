const express = require("express");
const requireAuth = require("../middleware/require-auth");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: {
      ...(req.authUser.username ? { username: req.authUser.username } : {}),
      email: req.authUser.email,
      id: req.authUser.id
    },
  });
});

module.exports = router;
