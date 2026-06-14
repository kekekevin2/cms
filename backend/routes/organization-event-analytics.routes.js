const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/organization-event-analytics.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Organization analytics routes
router.get(
  "/sdg-per-year",
  verifyToken,
  checkRole("organization"),
  analyticsController.getEventsBySDGPerYear,
);

router.get(
  "/statistics",
  verifyToken,
  checkRole("organization"),
  analyticsController.getEventStatistics,
);

module.exports = router;
