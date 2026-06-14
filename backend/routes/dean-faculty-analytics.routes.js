const express = require("express");
const router = express.Router();
const deanFacultyAnalyticsController = require("../controllers/dean-faculty-analytics.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Middleware
router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Get research involvement statistics (for pie chart)
router.get(
  "/research-involvement",
  deanFacultyAnalyticsController.getResearchInvolvement,
);

// Get extension services involvement statistics (for pie chart)
router.get(
  "/extension-involvement",
  deanFacultyAnalyticsController.getExtensionInvolvement,
);

// Get seminars/trainings/conferences involvement statistics (for pie chart)
router.get(
  "/seminars-involvement",
  deanFacultyAnalyticsController.getSeminarsInvolvement,
);

// Get awards statistics (for pie chart)
router.get("/awards", deanFacultyAnalyticsController.getAwardsStatistics);

// Get professional membership statistics (for pie chart)
router.get(
  "/memberships",
  deanFacultyAnalyticsController.getMembershipStatistics,
);

// Get comprehensive dashboard analytics (all charts data)
router.get("/dashboard", deanFacultyAnalyticsController.getDashboardAnalytics);

// Get detailed extension activities for PDF generation
router.get(
  "/extension-activities-details",
  deanFacultyAnalyticsController.getExtensionActivitiesDetails,
);

// Get detailed research activities for PDF generation
router.get(
  "/research-activities-details",
  deanFacultyAnalyticsController.getResearchActivitiesDetails,
);

// Get detailed seminars/trainings for PDF generation
router.get(
  "/seminars-trainings-details",
  deanFacultyAnalyticsController.getSeminarsTrainingsDetails,
);

// Get detailed data for single faculty PDF generation
router.get(
  "/extension-activities-by-faculty",
  deanFacultyAnalyticsController.getExtensionActivitiesDetailsByFaculty,
);

router.get(
  "/research-activities-by-faculty",
  deanFacultyAnalyticsController.getResearchActivitiesDetailsByFaculty,
);

router.get(
  "/seminars-trainings-by-faculty",
  deanFacultyAnalyticsController.getSeminarsTrainingsDetailsByFaculty,
);

module.exports = router;
