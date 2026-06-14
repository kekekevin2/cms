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

// Resolve department name for either Dean or CollegeDepartment user
async function getDepartmentForUser(userId) {
  // Try Dean first
  const dean = await db.Dean.findOne({ where: { user_id: userId } });
  if (dean) return { department: dean.department, source: "dean" };

  // Fall back to CollegeDepartment
  const cd = await db.CollegeDepartment.findOne({
    where: { user_id: userId },
    include: [
      {
        model: db.Department,
        as: "department",
        attributes: ["department_name"],
      },
    ],
  });
  if (cd && cd.department)
    return {
      department: cd.department.department_name,
      source: "college_department",
    };

  return null;
}

// Get all faculty for dean's department
exports.getFaculty = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'No department profile found for this user' });
    }
    const dean = { department: deanInfo.department };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const whereClause = {
      department: dean.department,
      is_active: true, // Only show active faculty
    };

    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await db.Faculty.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["last_name", "ASC"]],
    });

    res.json({
      faculty: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get faculty error:", error);
    res.status(500).json({ message: "Error fetching faculty" });
  }
};

// Create faculty
exports.createFaculty = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const userId = req.user.user_id;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'No department profile found for this user' });
    }
    const dean = { department: deanInfo.department };

    const {
      employee_id,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      position_level,
    } = req.body;

    if (!employee_id || !first_name || !last_name || !email) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Employee ID, first name, last name, and email are required",
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
    const existingEmployeeId = await db.Faculty.findOne({
      where: { employee_id },
    });
    if (existingEmployeeId) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Employee ID already exists",
      });
    }

    // Check email usage limit (max 3 accounts: 1 org, 1 faculty, 1 dean)
    const { checkEmailUsageLimit } = require("../utils/email-validator");
    const emailCheck = await checkEmailUsageLimit(email, "faculty");

    if (!emailCheck.allowed) {
      await transaction.rollback();
      return res.status(400).json({
        message: emailCheck.message,
        usage: emailCheck.usage,
      });
    }

    // Generate secure password
    const generatedPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create user account
    const user = await db.User.create(
      {
        email,
        password: hashedPassword,
        role: "faculty",
      },
      { transaction },
    );

    // Create faculty profile
    const faculty = await db.Faculty.create(
      {
        employee_id,
        first_name,
        middle_name,
        last_name,
        email,
        contact_number,
        department: dean.department,
        position_level,
        user_id: user.user_id,
      },
      { transaction },
    );

    await transaction.commit();

    // Send credentials via email (non-blocking)
    let emailSent = false;
    try {
      const emailResult = await sendAccountCredentials(
        email,
        first_name,
        generatedPassword,
        "faculty",
      );
      emailSent = emailResult.success;

      if (!emailResult.success) {
        console.error("Failed to send email:", emailResult.error);
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    res.status(201).json({
      message: "Faculty created successfully",
      faculty,
      emailSent,
      generatedPassword: !emailSent ? generatedPassword : undefined,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create faculty error:", error);
    res.status(500).json({ message: "Error creating faculty" });
  }
};

// Update faculty
exports.updateFaculty = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    const {
      employee_id,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      position_level,
    } = req.body;

    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: id,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Validate employee_id is 5 digits
    if (!/^\d{5}$/.test(employee_id)) {
      return res.status(400).json({
        message: "Employee ID must be exactly 5 digits",
      });
    }

    // Check if employee_id is being changed and if it already exists
    if (employee_id !== faculty.employee_id) {
      const existingEmployeeId = await db.Faculty.findOne({
        where: {
          employee_id,
          faculty_id: { [Op.ne]: id },
        },
      });
      if (existingEmployeeId) {
        return res.status(400).json({
          message: "Employee ID already exists",
        });
      }
    }

    // Check if email is being changed and if it already exists
    if (email !== faculty.email) {
      const existingUser = await db.User.findOne({
        where: {
          email,
          user_id: { [Op.ne]: faculty.user_id },
        },
      });
      if (existingUser) {
        return res.status(400).json({
          message: "Email already exists",
        });
      }
    }

    // Update faculty
    await faculty.update({
      employee_id,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      position_level,
    });

    // Update user email if changed
    if (email !== faculty.email) {
      await db.User.update({ email }, { where: { user_id: faculty.user_id } });
    }

    res.json({
      message: "Faculty updated successfully",
      faculty,
    });
  } catch (error) {
    console.error("Update faculty error:", error);
    res.status(500).json({ message: "Error updating faculty" });
  }
};

// Delete faculty
exports.deleteFaculty = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      await transaction.rollback();
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: id,
        department: dean.department,
      },
    });

    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Delete user account
    await db.User.destroy({
      where: { user_id: faculty.user_id },
      transaction,
    });

    // Delete faculty profile
    await faculty.destroy({ transaction });

    await transaction.commit();

    res.json({ message: "Faculty deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete faculty error:", error);
    res.status(500).json({ message: "Error deleting faculty" });
  }
};

// Reset faculty password
exports.resetFacultyPassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    // Check if faculty exists and belongs to dean's department
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: id,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Get user account
    const user = await db.User.findOne({
      where: { user_id: faculty.user_id },
    });

    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await user.update({ password: hashedPassword });

    // Send new credentials via email (non-blocking)
    const facultyName = faculty.middle_name
      ? `${faculty.first_name} ${faculty.middle_name} ${faculty.last_name}`
      : `${faculty.first_name} ${faculty.last_name}`;

    try {
      await sendAccountCredentials(
        user.email,
        facultyName,
        newPassword,
        "faculty",
      );
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    res.json({
      message: "Password reset successfully",
      newPassword,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};

// Get faculty full profile for PDF export
exports.getFacultyFullProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { facultyId } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    // Get faculty and verify they belong to dean's department
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: facultyId,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found or does not belong to your department",
      });
    }

    // Get all profile data
    const [
      personalProfile,
      academicProfiles,
      employmentProfiles,
      memberships,
      awards,
    ] = await Promise.all([
      db.FacultyPersonalProfile.findOne({
        where: { faculty_id: facultyId },
      }),
      db.FacultyAcademicProfile.findAll({
        where: { faculty_id: facultyId },
        order: [["year_graduated", "DESC"]],
      }),
      db.FacultyEmploymentProfile.findAll({
        where: { faculty_id: facultyId },
        order: [["date_from", "DESC"]],
      }),
      db.FacultyProfessionalMembership.findAll({
        where: { faculty_id: facultyId },
        order: [["date_joined", "DESC"]],
      }),
      db.FacultyAwards.findAll({
        where: { faculty_id: facultyId },
        order: [["date_received", "DESC"]],
      }),
    ]);

    // Get eligibilities from PDS if exists
    let eligibilities = [];
    const pds = await db.PersonalDataSheet.findOne({
      where: { faculty_id: facultyId },
      include: [
        {
          model: db.PDSEligibility,
          as: "eligibilities",
        },
      ],
    });
    if (pds && pds.eligibilities) {
      eligibilities = pds.eligibilities;
    }

    // Get courses handled (from requirements or other source)
    // This is a placeholder - adjust based on your actual data structure
    const coursesHandled = [];

    res.json({
      personal: personalProfile || null,
      academic: academicProfiles || [],
      employment: employmentProfiles || [],
      memberships: memberships || [],
      awards: awards || [],
      eligibilities: eligibilities || [],
      coursesHandled: coursesHandled,
      faculty: {
        employee_id: faculty.employee_id,
        first_name: faculty.first_name,
        middle_name: faculty.middle_name,
        last_name: faculty.last_name,
        email: faculty.email,
        contact_number: faculty.contact_number,
        department: faculty.department,
        position_level: faculty.position_level,
      },
    });
  } catch (error) {
    console.error("Error fetching faculty full profile:", error);
    res.status(500).json({
      message: "Error fetching faculty profile",
      error: error.message,
    });
  }
};

// Get disabled faculty for dean's department
exports.getDisabledFaculty = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'No department profile found for this user' });
    }
    const dean = { department: deanInfo.department };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const whereClause = {
      department: dean.department,
      is_active: false, // Only show disabled faculty
    };

    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await db.Faculty.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["last_name", "ASC"]],
    });

    res.json({
      faculty: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get disabled faculty error:", error);
    res.status(500).json({ message: "Error fetching disabled faculty" });
  }
};

// Disable faculty account (soft delete)
exports.disableFaculty = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      await transaction.rollback();
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: id,
        department: dean.department,
      },
    });

    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Check if already disabled
    if (!faculty.is_active) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Faculty account is already disabled" });
    }

    // Disable faculty account
    await faculty.update({ is_active: false }, { transaction });

    // Also disable the associated user account
    await db.User.update(
      { is_active: false },
      { where: { user_id: faculty.user_id }, transaction },
    );

    await transaction.commit();

    res.json({
      message: "Faculty account disabled successfully",
      faculty,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Disable faculty error:", error);
    res.status(500).json({ message: "Error disabling faculty account" });
  }
};

// Restore faculty account
exports.restoreFaculty = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      await transaction.rollback();
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: id,
        department: dean.department,
      },
    });

    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Check if already active
    if (faculty.is_active) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Faculty account is already active" });
    }

    // Restore faculty account
    await faculty.update({ is_active: true }, { transaction });

    // Also restore the associated user account
    await db.User.update(
      { is_active: true },
      { where: { user_id: faculty.user_id }, transaction },
    );

    await transaction.commit();

    res.json({
      message: "Faculty account restored successfully",
      faculty,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Restore faculty error:", error);
    res.status(500).json({ message: "Error restoring faculty account" });
  }
};

// Permanently delete faculty (only for disabled accounts)
exports.permanentlyDeleteFaculty = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Resolve department from Dean or CollegeDepartment
    const deanInfo = await getDepartmentForUser(userId);
    if (!deanInfo) {
      await transaction.rollback();
      return res.status(404).json({ message: "No department profile found for this user" });
    }
    const dean = { department: deanInfo.department };

    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: id,
        department: dean.department,
      },
    });

    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Only allow permanent deletion of disabled accounts
    if (faculty.is_active) {
      await transaction.rollback();
      return res.status(400).json({
        message:
          "Cannot permanently delete an active account. Please disable it first.",
      });
    }

    // Delete user account
    await db.User.destroy({
      where: { user_id: faculty.user_id },
      transaction,
    });

    // Delete faculty profile
    await faculty.destroy({ transaction });

    await transaction.commit();

    res.json({ message: "Faculty permanently deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Permanently delete faculty error:", error);
    res.status(500).json({ message: "Error permanently deleting faculty" });
  }
};
