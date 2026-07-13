const db = require("../models");
const { Op } = require("sequelize");

// Generate 5-digit employee ID for faculty
const generateEmployeeId = async () => {
  let employeeId;
  let exists = true;

  while (exists) {
    // Generate random 5-digit number
    employeeId = Math.floor(10000 + Math.random() * 90000).toString();

    // Check if it already exists
    const existing = await db.Faculty.findOne({
      where: { employee_id: employeeId },
    });
    exists = !!existing;
  }

  return employeeId;  
};

// Get all faculty with pagination (READ ONLY for superadmin)
exports.getFaculty = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const department_id = req.query.department_id;

    // Fetch all departments from database instead of using static list
    const departments = await db.Department.findAll({
      attributes: ['department_id', 'department_name', 'acronym'],
      where: { is_active: true }
    });

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Filter by department name if department_id is provided
    if (department_id) {
      const dept = departments.find(
        (d) => d.department_id === parseInt(department_id),
      );
      if (dept) {
        whereClause.department = dept.department_name;
      }
    }

    const { count, rows } = await db.Faculty.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["last_name", "ASC"]],
    });

    // Map department names to department objects with acronyms from database
    const facultyWithDepartments = rows.map((faculty) => {
      const facultyData = faculty.toJSON();

      // Find matching department by exact name from database
      if (facultyData.department) {
        const dept = departments.find(
          (d) => d.department_name === facultyData.department,
        );

        if (dept) {
          facultyData.department = {
            department_id: dept.department_id,
            department_name: dept.department_name,
            department_acronym: dept.acronym,
          };
        } else {
          // If no exact match found, keep as string but wrap in object for consistency
          facultyData.department = {
            department_id: null,
            department_name: facultyData.department,
            department_acronym: null,
          };
        }
      } else {
        facultyData.department = null;
      }

      return facultyData;
    });

    res.json({
      faculty: facultyWithDepartments,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get faculty error:", error);
    res.status(500).json({ message: "Error fetching faculty" });
  }
};
