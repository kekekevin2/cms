const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/dean-faculty-notification.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and dean role
router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Get faculty list for notifications
router.get("/faculty-list", notificationController.getFacultyList);

// Send notification to selected faculty
router.post("/send", notificationController.sendNotification);

module.exports = router;
