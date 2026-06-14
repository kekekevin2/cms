const db = require("../models");
const Campus = db.Campus;
const { Op } = require("sequelize");

// Get all campuses with pagination
exports.getCampuses = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const search = req.query.search || "";

		const whereClause = search
			? { campus_name: { [Op.like]: `%${search}%` } }
			: {};

		const { count, rows } = await Campus.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["campus_name", "ASC"]],
		});
		console.log(
			`Fetched campuses: ${rows.length} of ${count} total (page ${page})`,
		);
		res.json({
			campuses: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get campuses error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Get single campus
exports.getCampus = async (req, res) => {
	try {
		const { id } = req.params;
		const campus = await Campus.findByPk(id);

		if (!campus) {
			return res.status(404).json({ message: "Campus not found" });
		}

		res.json(campus);
	} catch (error) {
		console.error("Get campus error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Create campus
exports.createCampus = async (req, res) => {
	try {
		const { campus_name, is_active } = req.body;

		if (!campus_name) {
			return res.status(400).json({ message: "Campus name is required" });
		}

		const campus = await Campus.create({
			campus_name,
			is_active: is_active !== undefined ? is_active : true,
		});

		res.status(201).json({ message: "Campus created successfully", campus });
	} catch (error) {
		console.error("Create campus error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Update campus
exports.updateCampus = async (req, res) => {
	try {
		const { id } = req.params;
		const { campus_name, is_active } = req.body;

		const campus = await Campus.findByPk(id);
		if (!campus) {
			return res.status(404).json({ message: "Campus not found" });
		}

		await campus.update({
			campus_name: campus_name || campus.campus_name,
			is_active: is_active !== undefined ? is_active : campus.is_active,
		});

		res.json({ message: "Campus updated successfully", campus });
	} catch (error) {
		console.error("Update campus error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Delete campus
exports.deleteCampus = async (req, res) => {
	try {
		const { id } = req.params;
		const campus = await Campus.findByPk(id);

		if (!campus) {
			return res.status(404).json({ message: "Campus not found" });
		}

		await campus.destroy();
		res.json({ message: "Campus deleted successfully" });
	} catch (error) {
		console.error("Delete campus error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
