const express = require("express");
const router = express.Router();
const orgController = require("../controllers/superadmin-organization.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(checkRole("superadmin"));

// READ ONLY - Superadmin can only view organizations
router.get("/", orgController.getOrganizations);

module.exports = router;
