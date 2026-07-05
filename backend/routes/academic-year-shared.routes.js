const express = require("express");
const router = express.Router();
const db = require("../models");
const verifyToken = require("../middleware/auth.middleware");

// All authenticated users can get academic years (used in dropdowns)
router.get("/", verifyToken, async (req, res) => {
	try {
		const academicYears = await db.AcademicYear.findAll({
			order: [["year_start", "DESC"]],
		});
		res.json({ academicYears });
	} catch (error) {
		console.error("Get academic years error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

// Get current active academic year
router.get("/current", verifyToken, async (req, res) => {
	try {
		const academicYear = await db.AcademicYear.findOne({
			where: { is_active: true },
			order: [["year_start", "DESC"]],
		});
		res.json({ academicYear });
	} catch (error) {
		console.error("Get current academic year error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
});

module.exports = router;
