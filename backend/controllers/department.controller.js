const db = require("../models");
const Department = db.Department;
const Campus = db.Campus;
const { Op } = require("sequelize");

// Get all departments for a campus (paginated + search)
exports.getDepartments = async (req, res) => {
	try {
		const { campus_id } = req.query;

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const search = req.query.search || "";

		const whereClause = {
			...(campus_id ? { campus_id } : {}),
			...(search ? { department_name: { [Op.like]: `%${search}%` } } : {}),
		};

		const { count, rows } = await Department.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: Campus,
					as: "campus",
					attributes: ["campus_id", "campus_name"],
				},
			],
			limit,
			offset,
			order: [["department_name", "ASC"]],
		});

		res.json({
			departments: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get departments error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Get single department
exports.getDepartment = async (req, res) => {
	try {
		const { id } = req.params;
		const department = await Department.findByPk(id, {
			include: [
				{
					model: Campus,
					as: "campus",
					attributes: ["campus_id", "campus_name"],
				},
			],
		});

		if (!department) {
			return res.status(404).json({ message: "Department not found" });
		}

		res.json(department);
	} catch (error) {
		console.error("Get department error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Create department
exports.createDepartment = async (req, res) => {
	try {
		const { campus_id, department_name, acronym, is_active } = req.body;

		if (!campus_id || !department_name) {
			return res
				.status(400)
				.json({ message: "campus_id and department_name are required" });
		}

		const campus = await Campus.findByPk(campus_id);
		if (!campus) {
			return res.status(404).json({ message: "Campus not found" });
		}

		// Check duplicate within the same campus
		const existing = await Department.findOne({
			where: { campus_id, department_name },
		});
		if (existing) {
			return res.status(409).json({
				message: `Department "${department_name}" already exists in this campus`,
			});
		}

		const department = await Department.create({
			campus_id,
			department_name,
			acronym: acronym || null,
			is_active: is_active !== undefined ? is_active : true,
		});

		res
			.status(201)
			.json({ message: "Department created successfully", department });
	} catch (error) {
		console.error("Create department error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Update department
exports.updateDepartment = async (req, res) => {
	try {
		const { id } = req.params;
		const { department_name, acronym, is_active } = req.body;

		const department = await Department.findByPk(id);
		if (!department) {
			return res.status(404).json({ message: "Department not found" });
		}

		// Check duplicate name in the same campus (excluding self)
		if (department_name && department_name !== department.department_name) {
			const existing = await Department.findOne({
				where: {
					campus_id: department.campus_id,
					department_name,
					department_id: { [Op.ne]: id },
				},
			});
			if (existing) {
				return res.status(409).json({
					message: `Department "${department_name}" already exists in this campus`,
				});
			}
		}

		await department.update({
			department_name: department_name || department.department_name,
			acronym: acronym !== undefined ? acronym : department.acronym,
			is_active: is_active !== undefined ? is_active : department.is_active,
		});

		res.json({ message: "Department updated successfully", department });
	} catch (error) {
		console.error("Update department error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

// Delete department
exports.deleteDepartment = async (req, res) => {
	try {
		const { id } = req.params;
		const department = await Department.findByPk(id);
		if (!department) {
			return res.status(404).json({ message: "Department not found" });
		}

		await department.destroy();
		res.json({ message: "Department deleted successfully" });
	} catch (error) {
		console.error("Delete department error:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
