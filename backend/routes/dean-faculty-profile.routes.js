const express = require("express");
const router = express.Router();
const facultyProfileController = require("../controllers/faculty-profile.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Middleware - Dean access only
router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Get all faculty profiles in dean's department (summary)
router.get("/", facultyProfileController.getAllFacultyProfilesByDean);

// Get complete profile for a specific faculty
router.get(
  "/:facultyId",
  facultyProfileController.getFacultyCompleteProfileByDean,
);

module.exports = router;
