const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Admin dashboard
router.get("/", verifyToken, checkRole("admin"), (req, res) => {
	res.json({
		message: "Admin Dashboard",
		user: req.user,
	});
});

module.exports = router;
