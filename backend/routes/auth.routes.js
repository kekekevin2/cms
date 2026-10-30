const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middleware/auth.middleware");
const verifyRecaptcha = require("../middleware/recaptcha.middleware");
const { getRecaptchaConfig } = require("../config/recaptcha.config");

// The site key is intentionally public: browsers need it to render reCAPTCHA.
// Keep the matching secret key on the server only.
router.get("/recaptcha-config", (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const { siteKey, secretKey, enabled } = getRecaptchaConfig();
    if (!siteKey || (enabled && !secretKey)) {
      return res.status(503).json({ message: "reCAPTCHA is not configured" });
    }
    res.json({ siteKey });
  } catch {
    return res.status(503).json({ message: "reCAPTCHA is not configured" });
  }
});

// Public routes with reCAPTCHA protection
router.post("/login", verifyRecaptcha, authController.login);
router.post("/register", authController.register);
router.post("/create-admin", authController.createAdmin);
router.post("/create-superadmin", authController.createSuperadmin);

// Protected routes
router.get("/profile", verifyToken, authController.getProfile);
router.post("/change-password", verifyToken, authController.changePassword);

module.exports = router;
