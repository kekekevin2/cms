const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/superadmin-dashboard.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(checkRole("superadmin"));

// Get dashboard statistics
router.get("/statistics", dashboardController.getDashboardStatistics);

// Legacy route
router.get("/", (req, res) => {
	res.json({
		message: "Superadmin Dashboard",
		user: req.user,
	});
});

module.exports = router;
