const express = require("express");
const router = express.Router();
const dropdownController = require("../controllers/dropdown.controller");
const verifyToken = require("../middleware/auth.middleware");

// All dropdown routes require authentication
router.use(verifyToken);

// Dropdown routes
router.get("/departments", dropdownController.getDepartments);
router.get("/programs", dropdownController.getPrograms);
router.get("/sections", dropdownController.getSections);
router.get("/organizations", dropdownController.getOrganizations);
router.get("/academic-years", dropdownController.getAcademicYears);
router.get("/position-levels", dropdownController.getPositionLevels);
router.get("/dean-position-levels", dropdownController.getDeanPositionLevels);

module.exports = router;
