const express = require("express");
const router = express.Router();
const requirementController = require("../controllers/dean-requirement.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Get all requirement submissions for dean's department
router.get("/", requirementController.getAllRequirements);

// Get department-wide statistics
router.get("/statistics", requirementController.getDepartmentStatistics);

// Get a specific faculty's requirements and statistics
router.get(
  "/faculty/:faculty_id",
  requirementController.getFacultyRequirements,
);

// Validate a requirement (approve)
router.put(
  "/:submission_id/validate",
  requirementController.validateRequirement,
);

// Return a requirement (needs revision)
router.put("/:submission_id/return", requirementController.returnRequirement);

// Download a requirement file
router.get(
  "/:submission_id/download",
  requirementController.downloadRequirement,
);

// Set faculty clearance status (manual override)
router.put(
  "/faculty/:faculty_id/clearance-status",
  requirementController.setFacultyClearanceStatus,
);

module.exports = router;

module.exports = router;
