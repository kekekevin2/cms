const db = require("../models");

// Helper: resolve department for Dean or CollegeDepartment user
async function getDepartmentForUser(userId) {
  const dean = await db.Dean.findOne({ where: { user_id: userId } });
  if (dean) return { department: dean.department, dean };
  const cd = await db.CollegeDepartment.findOne({
    where: { user_id: userId },
    include: [{ model: db.Department, as: 'department', attributes: ['department_name'] }],
  });
  if (cd && cd.department) return { department: cd.department.department_name, dean: null };
  return null;
}

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

// Get all organizations for dean's department
exports.getOrganizations = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    const whereClause = {
      department: dean.department,
    };

    if (search) {
      whereClause.organization_name = { [Op.like]: `%${search}%` };
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
          model: db.Faculty,
          attributes: [
            "faculty_id",
            "employee_id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
          ],
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

    // Add email to each organization from the User model
    const organizationsWithEmail = rows.map((org) => {
      const orgData = org.toJSON();
      return {
        ...orgData,
        email: orgData.user?.email || null,
      };
    });

    res.json({
      organizations: organizationsWithEmail,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get organizations error:", error);
    res.status(500).json({ message: "Error fetching organizations" });
  }
};

// Create organization
exports.createOrganization = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const {
      organization_name,
      description,
      email,
      adviser_id_1,
    } = req.body;

    if (!organization_name || !email || !adviser_id_1) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Organization name, email, and adviser are required",
      });
    }

    // Validate adviser_id_1
    if (!adviser_id_1 || adviser_id_1 === 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Adviser is required",
      });
    }

    const adviser1 = await db.Faculty.findOne({
      where: {
        faculty_id: adviser_id_1,
        department: dean.department,
      },
    });

    if (!adviser1) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Adviser not found in your department",
      });
    }

    // Check email usage limit (max 3 accounts: 1 org, 1 faculty, 1 dean)
    const { checkEmailUsageLimit } = require('../utils/email-validator');
    const emailCheck = await checkEmailUsageLimit(email, 'organization');
    
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
        role: "organization",
      },
      { transaction },
    );

    // Create organization
    const organization = await db.Organization.create(
      {
        organization_name,
        description,
        department: dean.department,
        faculty_id: null,
        user_id: user.user_id,
      },
      { transaction },
    );

    // Create adviser assignment
    await db.OrganizationAdviser.create(
      {
        organization_id: organization.organization_id,
        faculty_id: adviser_id_1,
        assigned_date: new Date(),
        is_active: true,
      },
      { transaction },
    );

    await transaction.commit();

    // Send credentials via email (non-blocking)
    let emailSent = false;
    try {
      const emailResult = await sendAccountCredentials(
        email,
        organization_name,
        generatedPassword,
        "organization",
      );
      emailSent = emailResult.success;

      if (!emailResult.success) {
        console.error("Failed to send email:", emailResult.error);
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    res.status(201).json({
      message: "Organization created successfully",
      organization,
      emailSent,
      generatedPassword, // Always return password for modal display
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create organization error:", error);
    res.status(500).json({ message: "Error creating organization" });
  }
};

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { id } = req.params;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const { organization_name, description } = req.body;

    const organization = await db.Organization.findOne({
      where: {
        organization_id: id,
        department: dean.department,
      },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Update organization
    await organization.update({
      organization_name,
      description,
    });

    res.json({
      message: "Organization updated successfully",
      organization,
    });
  } catch (error) {
    console.error("Update organization error:", error);
    res.status(500).json({ message: "Error updating organization" });
  }
};

// Delete organization
exports.deleteOrganization = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const deanId = req.user.user_id;
    const { id } = req.params;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const organization = await db.Organization.findOne({
      where: {
        organization_id: id,
        department: dean.department,
      },
    });

    if (!organization) {
      await transaction.rollback();
      return res.status(404).json({ message: "Organization not found" });
    }

    // Delete user account
    await db.User.destroy({
      where: { user_id: organization.user_id },
      transaction,
    });

    // Delete organization
    await organization.destroy({ transaction });

    await transaction.commit();

    res.json({ message: "Organization deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete organization error:", error);
    res.status(500).json({ message: "Error deleting organization" });
  }
};

// Assign adviser to organization
exports.assignAdviser = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const deanId = req.user.user_id;
    const { id } = req.params;
    const { faculty_id } = req.body;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Check if organization exists and belongs to dean's department
    const organization = await db.Organization.findOne({
      where: {
        organization_id: id,
        department: dean.department,
      },
    });

    if (!organization) {
      await transaction.rollback();
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check if faculty exists and belongs to dean's department
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id,
        department: dean.department,
      },
    });

    if (!faculty) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Faculty not found in your department",
      });
    }

    // Deactivate any existing active advisers for this organization
    await db.OrganizationAdviser.update(
      { is_active: false },
      {
        where: {
          organization_id: id,
          is_active: true,
        },
        transaction,
      },
    );

    // Create new adviser assignment
    const adviser = await db.OrganizationAdviser.create(
      {
        organization_id: id,
        faculty_id,
        assigned_date: new Date(),
        is_active: true,
      },
      { transaction },
    );

    await transaction.commit();

    // Fetch the complete adviser data
    const adviserWithFaculty = await db.OrganizationAdviser.findOne({
      where: { adviser_id: adviser.adviser_id },
      include: [
        {
          model: db.Faculty,
          as: "adviser",
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
    });

    res.json({
      message: "Adviser assigned successfully",
      adviser: adviserWithFaculty,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign adviser error:", error);
    res.status(500).json({ message: "Error assigning adviser" });
  }
};

// Remove adviser from organization
exports.removeAdviser = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { id } = req.params;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Check if organization exists and belongs to dean's department
    const organization = await db.Organization.findOne({
      where: {
        organization_id: id,
        department: dean.department,
      },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Deactivate active advisers for this organization
    const updated = await db.OrganizationAdviser.update(
      { is_active: false },
      {
        where: {
          organization_id: id,
          is_active: true,
        },
      },
    );

    if (updated[0] === 0) {
      return res.status(404).json({ message: "No active adviser found" });
    }

    res.json({ message: "Adviser removed successfully" });
  } catch (error) {
    console.error("Remove adviser error:", error);
    res.status(500).json({ message: "Error removing adviser" });
  }
};

// Reset organization password
exports.resetOrganizationPassword = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { id } = req.params;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Check if organization exists and belongs to dean's department
    const organization = await db.Organization.findOne({
      where: {
        organization_id: id,
        department: dean.department,
      },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Get user account
    const user = await db.User.findOne({
      where: { user_id: organization.user_id },
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
    try {
      await sendAccountCredentials(
        user.email,
        organization.organization_name,
        newPassword,
        "organization",
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
