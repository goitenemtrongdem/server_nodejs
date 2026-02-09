const express = require("express");
const router = express.Router();
const authService = require("../services/auth.service");
const authController = require("../controllers/auth.controller");
router.post("/signup-request", async (req, res) => {
  try {
    const { email, password } = req.body;
    await authService.signupRequest({ email, password });
    res.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    await authService.verifyEmail(req.query.token);
    res.send("✅ Email verified successfully. You can close this tab.");
  } catch (err) {
    res.status(400).send(err.message);
  }
});
router.post("/after-verify", authController.afterVerify);
module.exports = router;
