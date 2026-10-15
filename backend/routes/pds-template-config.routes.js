const router = require("express").Router();
const controller = require("../controllers/pds-template-config.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const { makeUpload, MB } = require("../utils/upload");

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

// Upload the template PDF the positions are set against
const uploadTemplate = makeUpload({ folder: "pds-templates", allowedTypes: ["application/pdf"], maxSize: 20 * MB });
router.post("/template", checkRole("superadmin", "admin"), uploadTemplate.single("template"), controller.uploadTemplate);
// Declared before GET /:id so "templates" isn't treated as a config id
router.get("/templates", checkRole("superadmin", "admin"), controller.listTemplates);
router.delete("/templates/:id", checkRole("superadmin", "admin"), controller.deleteTemplate);

// Save new configuration
router.post("/", checkRole("superadmin", "admin"), controller.saveConfig);

// Get configuration history
router.get("/history", checkRole("superadmin", "admin"), controller.getConfigHistory);

// Get specific configuration by ID
router.get("/:id", checkRole("superadmin", "admin"), controller.getConfigById);

// Restore a previous configuration
router.put("/:id/restore", checkRole("superadmin", "admin"), controller.restoreConfig);

module.exports = router;
