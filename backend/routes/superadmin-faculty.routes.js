const express = require("express");
const router = express.Router();
const facultyController = require("../controllers/superadmin-faculty.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(checkRole("superadmin"));

// READ ONLY - Superadmin can only view faculty
router.get("/", facultyController.getFaculty);

module.exports = router;
