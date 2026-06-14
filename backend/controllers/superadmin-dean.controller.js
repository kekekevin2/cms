const db = require("../models");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const { sendAccountCredentials } = require("../utils/email");

// Generate secure random password
const generatePassword = () => {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Generate 5-digit employee ID
const generateEmployeeId = async () => {
  let employeeId;
  let exists = true;

  while (exists) {
    // Generate random 5-digit number
    employeeId = Math.floor(10000 + Math.random() * 90000).toString();

    // Check if it already exists
    const existing = await db.Dean.findOne({
      where: { employee_id: employeeId },
    });
    exists = !!existing;
  }

  return employeeId;
};

// Get all deans with pagination
exports.getDeans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const department = req.query.department;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (department) {
      whereClause.department = department;
    }

    const { count, rows } = await db.Dean.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["last_name", "ASC"]],
    });

    res.json({
      deans: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get deans error:", error);
    res.status(500).json({ message: "Error fetching deans" });
  }
};

// Create dean
exports.createDean = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      employee_id,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      department,
      position_level,
    } = req.body;

    if (!employee_id || !first_name || !last_name || !email || !department) {
      await transaction.rollback();
      return res.status(400).json({
        message:
          "Employee ID, first name, last name, email, and department are required",
      });
    }

    // Validate employee_id is 5 digits
    if (!/^\d{5}$/.test(employee_id)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Employee ID must be exactly 5 digits",
      });
    }

    // Check if employee_id already exists
    const existingEmployeeId = await db.Dean.findOne({
      where: { employee_id },
    });
    if (existingEmployeeId) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Employee ID already exists",
      });
    }

    // Check email usage limit (max 3 accounts: 1 org, 1 faculty, 1 dean)
    const { checkEmailUsageLimit } = require('../utils/email-validator');
    const emailCheck = await checkEmailUsageLimit(email, 'dean');
    
    if (!emailCheck.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        message: emailCheck.message,
        usage: emailCheck.usage,
      });
    }

    // Check if department already has a dean
    const existingDean = await db.Dean.findOne({
      where: { department },
    });
    if (existingDean) {
      await transaction.rollback();
      return res.status(400).json({
        message: "This department already has a dean assigned",
      });
    }

    // Generate employee ID and secure password
    const generatedPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create user account
    const user = await db.User.create(
      {
        email,
        password: hashedPassword,
        role: "dean",
      },
      { transaction },
    );

    // Create dean profile
    const dean = await db.Dean.create(
      {
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        contact_number,
        department,
        position_level,
        user_id: user.user_id,
      },
      { transaction },
    );

    await transaction.commit();

    // Send credentials via email (non-blocking, won't fail the request)
    let emailSent = false;
    try {
      const emailResult = await sendAccountCredentials(
        email,
        first_name,
        generatedPassword,
        "dean",
      );
      emailSent = emailResult.success;

      if (!emailResult.success) {
        console.error("Failed to send email:", emailResult.error);
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    res.status(201).json({
      message: "Dean created successfully",
      dean,
      emailSent,
      generatedPassword: !emailSent ? generatedPassword : undefined, // Return password if email failed
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create dean error:", error);
    res.status(500).json({ message: "Error creating dean" });
  }
};

// Update dean
exports.updateDean = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      employee_id,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      department,
      position_level,
    } = req.body;

    const dean = await db.Dean.findByPk(id);
    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    // Validate employee_id is 5 digits
    if (!/^\d{5}$/.test(employee_id)) {
      return res.status(400).json({
        message: "Employee ID must be exactly 5 digits",
      });
    }

    // Check if employee_id is being changed and if it already exists
    if (employee_id !== dean.employee_id) {
      const existingEmployeeId = await db.Dean.findOne({
        where: {
          employee_id,
          dean_id: { [Op.ne]: id },
        },
      });
      if (existingEmployeeId) {
        return res.status(400).json({
          message: "Employee ID already exists",
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (email !== dean.email) {
      const existingUser = await db.User.findOne({
        where: {
          email,
          user_id: { [Op.ne]: dean.user_id },
        },
      });
      if (existingUser) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
    }

    // Check if department is being changed and if new department already has a dean
    if (department !== dean.department) {
      const existingDean = await db.Dean.findOne({
        where: {
          department,
          dean_id: { [Op.ne]: id },
        },
      });
      if (existingDean) {
        return res.status(400).json({
          message: "This department already has a dean assigned",
        });
      }
    }

    // Update dean
    await dean.update({
      employee_id,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      department,
      position_level,
    });

    // Update user email if changed
    if (email !== dean.email) {
      await db.User.update({ email }, { where: { user_id: dean.user_id } });
    }

    res.json({
      message: "Dean updated successfully",
      dean,
    });
  } catch (error) {
    console.error("Update dean error:", error);
    res.status(500).json({ message: "Error updating dean" });
  }
};

// Delete dean
exports.deleteDean = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;

    const dean = await db.Dean.findByPk(id);
    if (!dean) {
      await transaction.rollback();
      return res.status(404).json({ message: "Dean not found" });
    }

    // Delete user account
    await db.User.destroy({
      where: { user_id: dean.user_id },
      transaction,
    });

    // Delete dean profile
    await dean.destroy({ transaction });

    await transaction.commit();

    res.json({ message: "Dean deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete dean error:", error);
    res.status(500).json({ message: "Error deleting dean" });
  }
};
