const db = require("../models");
const CollegeDepartment = db.CollegeDepartment;
const Campus = db.Campus;
const Department = db.Department;
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const { sendAccountCredentials } = require("../utils/email");

const generatePassword = () => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

exports.getCollegeDepartments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const campus_id = req.query.campus_id
      ? parseInt(req.query.campus_id)
      : null;
    const offset = (page - 1) * limit;

    const whereClause = {
      ...(campus_id ? { campus_id } : {}),
      ...(search ? { name: { [Op.like]: `%${search}%` } } : {}),
    };

    const { count, rows } = await CollegeDepartment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Campus,
          as: "campus",
          attributes: ["campus_id", "campus_name"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["department_id", "department_name", "acronym"],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      collegeDepartments: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch college departments" });
  }
};

exports.getCollegeDepartmentById = async (req, res) => {
  try {
    const record = await CollegeDepartment.findByPk(req.params.id, {
      include: [
        { model: Campus, as: "campus" },
        { model: Department, as: "department" },
      ],
    });
    if (!record) return res.status(404).json({ message: "Not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch record" });
  }
};

exports.createCollegeDepartment = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      name,
      email,
      campus_id,
      department_id,
      dean_name,
      contact_number,
      is_active,
    } = req.body;

    if (!name || !name.trim()) {
      await transaction.rollback();
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email || !email.trim()) {
      await transaction.rollback();
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is already used for an ACTIVE college_department account
    const existingUser = await db.User.findOne({
      where: { email: normalizedEmail, role: "college_department" },
      include: [
        {
          model: db.CollegeDepartment,
          as: "college_department",
          required: false,
        },
      ],
    });

    if (existingUser) {
      // If user exists AND has a college department profile, it's truly a duplicate
      if (existingUser.college_department) {
        await transaction.rollback();
        return res.status(400).json({
          message:
            "A college department account with this email already exists",
        });
      }

      // If user exists but NO college department profile (orphaned), delete the orphaned user
      console.log(
        `⚠️  Found orphaned user record (user_id: ${existingUser.user_id}, email: ${normalizedEmail}). Cleaning up...`,
      );
      await existingUser.destroy({ transaction });
      console.log(`✅ Orphaned user record deleted. Proceeding with creation.`);
    }

    const generatedPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const user = await db.User.create(
      {
        email: normalizedEmail,
        password: hashedPassword,
        role: "college_department",
      },
      { transaction },
    );

    const record = await CollegeDepartment.create(
      {
        name: name.trim(),
        email: normalizedEmail,
        campus_id: campus_id || null,
        department_id: department_id || null,
        dean_name: dean_name ? dean_name.trim() : null,
        contact_number: contact_number ? contact_number.trim() : null,
        user_id: user.user_id,
        is_active: is_active !== undefined ? is_active : true,
      },
      { transaction },
    );

    await transaction.commit();

    // Send credentials email (non-blocking)
    let emailSent = false;
    try {
      const result = await sendAccountCredentials(
        normalizedEmail,
        name.trim(),
        generatedPassword,
        "college_department",
      );
      emailSent = result.success;
      if (!result.success) console.error("Failed to send email:", result.error);
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    res.status(201).json({
      message: "College department created",
      record,
      emailSent,
      generatedPassword: !emailSent ? generatedPassword : undefined,
    });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ message: "Failed to create college department" });
  }
};

exports.updateCollegeDepartment = async (req, res) => {
  try {
    const record = await CollegeDepartment.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: "Not found" });

    const {
      name,
      email,
      campus_id,
      department_id,
      dean_name,
      contact_number,
      is_active,
    } = req.body;

    await record.update({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
      ...(campus_id !== undefined ? { campus_id: campus_id || null } : {}),
      ...(department_id !== undefined
        ? { department_id: department_id || null }
        : {}),
      ...(dean_name !== undefined
        ? { dean_name: dean_name ? dean_name.trim() : null }
        : {}),
      ...(contact_number !== undefined
        ? { contact_number: contact_number ? contact_number.trim() : null }
        : {}),
      ...(is_active !== undefined ? { is_active } : {}),
    });

    res.json({ message: "College department updated", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update college department" });
  }
};

exports.deleteCollegeDepartment = async (req, res) => {
  try {
    const record = await CollegeDepartment.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: "Not found" });
    await record.destroy();
    res.json({ message: "College department deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete college department" });
  }
};
