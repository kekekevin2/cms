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

    // Static departments list (matches dropdown.controller.js)
    const departments = [
      {
        department_id: 1,
        department_name: "College of Engineering",
        department_acronym: "COE",
      },
      {
        department_id: 2,
        department_name: "College of Education",
        department_acronym: "COED",
      },
      {
        department_id: 3,
        department_name: "College of Arts and Sciences",
        department_acronym: "CAS",
      },
      {
        department_id: 4,
        department_name: "College of Business Administration",
        department_acronym: "CBA",
      },
      {
        department_id: 5,
        department_name: "College of Information Technology",
        department_acronym: "CIT",
      },
      {
        department_id: 6,
        department_name: "College of Nursing",
        department_acronym: "CON",
      },
    ];

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

    // Map department names to department objects with acronyms
    const facultyWithDepartments = rows.map((faculty) => {
      const facultyData = faculty.toJSON();

      // Find matching department by name
      if (facultyData.department) {
        const dept = departments.find(
          (d) => d.department_name === facultyData.department,
        );

        if (dept) {
          facultyData.department = {
            department_id: dept.department_id,
            department_name: dept.department_name,
            department_acronym: dept.department_acronym,
          };
        }
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
