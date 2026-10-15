const router = require("express").Router();
const controller = require("../controllers/pds-template-config.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication
router.use(verifyToken);

/**
 * Public route: Get active configuration
 * Accessible to all authenticated users (for PDS generation)
 */
router.get("/active", controller.getActiveConfig);

/**
 * Super Admin only routes
 * These routes are protected and only accessible to super admin users
 */

// Save new configuration
router.post("/", checkRole("admin"), controller.saveConfig);

// Get configuration history
router.get("/history", checkRole("admin"), controller.getConfigHistory);

// Get specific configuration by ID
router.get("/:id", checkRole("admin"), controller.getConfigById);

// Restore a previous configuration
router.put("/:id/restore", checkRole("admin"), controller.restoreConfig);

module.exports = router;
