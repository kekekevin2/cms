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

const { Op } = require("sequelize");

// Get advisers for organization
// AUTOMATIC RETRIEVAL: Returns active adviser(s) assigned by Dean during org creation or via assignAdviser
// Organization users cannot manually select advisers - only Dean can assign/update advisers
// This ensures data consistency across the system
exports.getAdvisers = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    // Fetch only active advisers (is_active = true)
    // When Dean updates adviser, old records are set to is_active = false
    const advisers = await db.OrganizationAdviser.findAll({
      where: {
        organization_id: organization.organization_id,
        is_active: true,
      },
      include: [
        {
          model: db.Faculty,
          as: "Faculty",
          required: false,
          attributes: [
            "faculty_id",
            "employee_id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "contact_number",
            "department",
            "position_level",
            "academic_rank",
            "employment_status",
            "educational_attainment",
            "campus",
            "telephone_number",
            "birth_date",
            "age",
            "civil_status",
            "home_address",
            "photo_url",
            "signature_url"
          ],
        },
      ],
      order: [["assigned_date", "ASC"]],
    });

    res.json({ advisers });
  } catch (error) {
    console.error("Get advisers error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ message: "Error fetching advisers" });
  }
};

// For Dean - Get advisers for a specific organization
exports.deanGetOrganizationAdvisers = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { organizationId } = req.params;

    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Check if organization belongs to dean's department
    const organization = await db.Organization.findOne({
      where: {
        organization_id: organizationId,
        department: dean.department,
      },
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found in your department",
      });
    }

    const advisers = await db.OrganizationAdviser.findAll({
      where: {
        organization_id: organizationId,
      },
      include: [
        {
          model: db.Faculty,
          as: "Faculty",
          required: false,
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
      order: [
        ["is_active", "DESC"],
        ["assigned_date", "ASC"],
      ],
    });

    res.json({ advisers });
  } catch (error) {
    console.error("Dean get organization advisers error:", error);
    res.status(500).json({ message: "Error fetching advisers" });
  }
};

// For Dean - Assign adviser to organization
exports.deanAssignAdviser = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { organizationId } = req.params;
    const { faculty_id } = req.body;

    if (!faculty_id) {
      return res.status(400).json({ message: "Faculty ID is required" });
    }

    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Check organization
    const organization = await db.Organization.findOne({
      where: {
        organization_id: organizationId,
        department: dean.department,
      },
    });

    if (!organization) {
      return res.status(404).json({
        message: "Organization not found in your department",
      });
    }

    // Check faculty
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        message: "Faculty not found in your department",
      });
    }

    // Check if already assigned
    const existingAdviser = await db.OrganizationAdviser.findOne({
      where: {
        organization_id: organizationId,
        faculty_id,
        is_active: true,
      },
    });

    if (existingAdviser) {
      return res.status(400).json({
        message:
          "This faculty is already an active adviser for this organization",
      });
    }

    // Check maximum advisers (2)
    const activeAdvisersCount = await db.OrganizationAdviser.count({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
    });

    if (activeAdvisersCount >= 2) {
      return res.status(400).json({
        message: "Maximum of 2 active advisers allowed per organization",
      });
    }

    // Create adviser assignment
    const adviser = await db.OrganizationAdviser.create({
      organization_id: organizationId,
      faculty_id,
      assigned_date: new Date(),
      is_active: true,
    });

    res.status(201).json({
      message: "Adviser assigned successfully",
      adviser,
    });
  } catch (error) {
    console.error("Dean assign adviser error:", error);
    res.status(500).json({ message: "Error assigning adviser" });
  }
};

// For Dean - Remove/deactivate adviser
exports.deanRemoveAdviser = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { id } = req.params;

    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const adviser = await db.OrganizationAdviser.findOne({
      where: { adviser_id: id },
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
        },
      ],
    });

    if (!adviser) {
      return res.status(404).json({
        message: "Adviser assignment not found or not in your department",
      });
    }

    await adviser.update({ is_active: false });

    res.json({ message: "Adviser removed successfully" });
  } catch (error) {
    console.error("Dean remove adviser error:", error);
    res.status(500).json({ message: "Error removing adviser" });
  }
};

// For Organization - Update adviser information
exports.updateAdviser = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;
    const { 
      first_name, 
      middle_name, 
      last_name,
      email, 
      contact_number,
      academic_rank,
      employment_status,
      educational_attainment,
      campus,
      telephone_number,
      birth_date,
      age,
      civil_status,
      home_address,
      length_of_service
    } = req.body;

    console.log("=== Update adviser request ===");
    console.log("Adviser ID:", id);
    console.log("User ID:", userId);
    console.log("📥 Received fields:");
    console.log("  academic_rank:", academic_rank);
    console.log("  employment_status:", employment_status);
    console.log("  educational_attainment:", educational_attainment);
    console.log("  campus:", campus);
    console.log("  contact_number:", contact_number);
    console.log("  telephone_number:", telephone_number);
    console.log("  email:", email);
    console.log("  birth_date:", birth_date);
    console.log("  age:", age);
    console.log("  civil_status:", civil_status);
    console.log("  home_address:", home_address);
    console.log("  length_of_service:", length_of_service);

    // Get organization
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization profile not found" });
    }

    // Get adviser assignment
    const adviserAssignment = await db.OrganizationAdviser.findOne({
      where: {
        adviser_id: id,
        organization_id: organization.organization_id,
        is_active: true,
      },
      include: [
        {
          model: db.Faculty,
          as: "Faculty",
        },
      ],
    });

    if (!adviserAssignment) {
      return res.status(404).json({ message: "Adviser not found" });
    }

    // Update faculty information - ALL fields
    const faculty = adviserAssignment.Faculty;
    
    const updateData = {};
    
    // Basic fields
    if (first_name !== undefined && first_name !== '') updateData.first_name = first_name;
    if (middle_name !== undefined) updateData.middle_name = middle_name || null;
    if (last_name !== undefined && last_name !== '') updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email || null;
    if (contact_number !== undefined) updateData.contact_number = contact_number || null;
    
    // Profile fields - accept any value including empty strings, but convert empty to null
    if (academic_rank !== undefined) {
      updateData.academic_rank = academic_rank !== '' ? academic_rank : null;
      console.log("  ✅ Setting academic_rank to:", updateData.academic_rank);
    }
    if (employment_status !== undefined) {
      updateData.employment_status = employment_status !== '' ? employment_status : null;
      console.log("  ✅ Setting employment_status to:", updateData.employment_status);
    }
    if (educational_attainment !== undefined) {
      updateData.educational_attainment = educational_attainment !== '' ? educational_attainment : null;
      console.log("  ✅ Setting educational_attainment to:", updateData.educational_attainment);
    }
    if (campus !== undefined) {
      updateData.campus = campus !== '' ? campus : null;
      console.log("  ✅ Setting campus to:", updateData.campus);
    }
    if (telephone_number !== undefined) {
      updateData.telephone_number = telephone_number !== '' ? telephone_number : null;
      console.log("  ✅ Setting telephone_number to:", updateData.telephone_number);
    }
    if (birth_date !== undefined) {
      updateData.birth_date = birth_date !== '' ? birth_date : null;
      console.log("  ✅ Setting birth_date to:", updateData.birth_date);
    }
    if (age !== undefined) {
      updateData.age = age !== '' ? age : null;
      console.log("  ✅ Setting age to:", updateData.age);
    }
    if (civil_status !== undefined) {
      updateData.civil_status = civil_status !== '' ? civil_status : null;
      console.log("  ✅ Setting civil_status to:", updateData.civil_status);
    }
    if (home_address !== undefined) {
      updateData.home_address = home_address !== '' ? home_address : null;
      console.log("  ✅ Setting home_address to:", updateData.home_address);
    }
    
    if (Object.keys(updateData).length > 0) {
      console.log("💾 Updating faculty with data:", updateData);
      await faculty.update(updateData);
      console.log("✅ Faculty update completed");
    } else {
      console.log("⚠️ No fields to update");
    }

    // Handle photo upload if provided
    if (req.files && req.files.photo) {
      const photoUrl = req.files.photo[0].path.replace(/\\/g, '/').replace('uploads/', '/uploads/');
      await faculty.update({ photo_url: photoUrl });
    }

    // Handle signature upload if provided
    if (req.files && req.files.signature) {
      const signatureUrl = req.files.signature[0].path.replace(/\\/g, '/').replace('uploads/', '/uploads/');
      await faculty.update({ signature_url: signatureUrl });
    }

    // Update length of service in the adviser assignment if provided
    if (length_of_service !== undefined) {
      await adviserAssignment.update({ length_of_service: length_of_service || null });
    }

    console.log("✅ All updates completed successfully");

    // Reload with updated data - INCLUDING ALL PROFILE FIELDS
    await adviserAssignment.reload({
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
            "contact_number",
            "department",
            "position_level",
            "academic_rank",
            "employment_status",
            "educational_attainment",
            "campus",
            "telephone_number",
            "birth_date",
            "age",
            "civil_status",
            "home_address",
            "photo_url",
            "signature_url"
          ],
        },
      ],
    });

    console.log("📤 Sending response with updated adviser data:");
    console.log("  academic_rank:", adviserAssignment.Faculty.academic_rank);
    console.log("  employment_status:", adviserAssignment.Faculty.employment_status);
    console.log("  campus:", adviserAssignment.Faculty.campus);

    res.json({
      message: "Adviser updated successfully",
      adviser: adviserAssignment,
    });
  } catch (error) {
    console.error("Update adviser error:", error);
    res.status(500).json({ message: "Error updating adviser" });
  }
};
