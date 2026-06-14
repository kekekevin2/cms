const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middleware/auth.middleware");
const verifyRecaptcha = require("../middleware/recaptcha.middleware");

// Public routes with reCAPTCHA protection
router.post("/login", verifyRecaptcha, authController.login);
router.post("/register", authController.register);
router.post("/create-admin", authController.createAdmin);
router.post("/create-superadmin", authController.createSuperadmin);

// Protected routes
router.get("/profile", verifyToken, authController.getProfile);
router.post("/change-password", verifyToken, authController.changePassword);

module.exports = router;
