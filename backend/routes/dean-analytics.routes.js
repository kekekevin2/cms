const express = require("express");
const router = express.Router();
const deanAnalyticsController = require("../controllers/dean-analytics.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and dean role
router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Get faculty demographics analytics
router.get("/demographics", deanAnalyticsController.getFacultyDemographics);

// Get education analytics
router.get("/education", deanAnalyticsController.getEducationAnalytics);

// Get research analytics
router.get("/research", deanAnalyticsController.getResearchAnalytics);

module.exports = router;
