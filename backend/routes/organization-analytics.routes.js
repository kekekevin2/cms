const express = require("express");
const router = express.Router();
const documentController = require("../controllers/organization-document.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Organization analytics routes - SDG data from reports
router.get(
  "/sdg-per-year",
  verifyToken,
  checkRole("organization"),
  documentController.getReportsBySDGPerYear,
);

// Dean analytics routes - SDG data from all organizations in department
router.get(
  "/dean/sdg-per-year",
  verifyToken,
  checkRole("dean", "college_department"),
  documentController.deanGetReportsBySDGPerYear,
);

module.exports = router;
