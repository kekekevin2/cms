const express = require("express");
const router = express.Router();
const deanController = require("../controllers/dean.controller");
const deanOrgDashboardController = require("../controllers/dean-organization-dashboard.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Get current dean's profile
router.get(
  "/profile",
  verifyToken,
  checkRole("dean", "college_department"),
  deanController.getProfile,
);

// Get organization dashboard statistics
router.get(
  "/organizations/dashboard",
  verifyToken,
  checkRole("dean", "college_department"),
  deanOrgDashboardController.getOrganizationDashboard,
);

// Get member demographics for an organization
router.get(
  "/organizations/member-demographics",
  verifyToken,
  checkRole("dean", "college_department"),
  deanOrgDashboardController.getMemberDemographics,
);

module.exports = router;
