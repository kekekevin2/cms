const db = require("../models");
const { Op } = require("sequelize");

// Get all organizations with pagination (READ ONLY for superadmin)
exports.getOrganizations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const department = req.query.department || "";

    const whereClause = {};

    if (search) {
      whereClause.organization_name = { [Op.like]: `%${search}%` };
    }

    if (department) {
      whereClause.department = { [Op.like]: `%${department}%` };
    }

    const { count, rows } = await db.Organization.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["organization_name", "ASC"]],
      include: [
        {
          model: db.User,
          attributes: ["email"],
        },
        {
          model: db.OrganizationAdviser,
          where: { is_active: true },
          required: false,
          include: [
            {
              model: db.Faculty,
              as: "Faculty",
              attributes: [
                "faculty_id",
                "employee_id",
                "first_name",
                "middle_name",
                "last_name",
                "email",
              ],
            },
          ],
        },
      ],
    });

    res.json({
      organizations: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get organizations error:", error);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};
