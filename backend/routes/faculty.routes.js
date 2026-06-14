const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Faculty dashboard
router.get("/", verifyToken, checkRole("faculty"), (req, res) => {
	res.json({
		message: "Faculty Dashboard",
		user: req.user,
	});
});

module.exports = router;
