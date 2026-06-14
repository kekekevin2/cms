const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/organization-event-analytics.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Dean analytics routes
router.get(
  "/sdg-per-year",
  verifyToken,
  checkRole("dean", "college_department"),
  analyticsController.deanGetEventsBySDGPerYear,
);

module.exports = router;
