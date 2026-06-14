const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/superadmin-dashboard.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(checkRole("superadmin"));

router.get("/statistics", dashboardController.getDashboardStatistics);

module.exports = router;
