const express = require("express");
const router = express.Router();
const eventController = require("../controllers/dean-organization-events.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and dean role
router.use(verifyToken, checkRole("dean", "college_department"));

// Get all organization events
router.get("/", eventController.getOrganizationEvents);

// Download event file
router.get("/:id/download", eventController.downloadEventFile);

module.exports = router;
