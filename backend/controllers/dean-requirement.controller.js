const db = require("../models");
const { Op } = require("sequelize");
const path = require("path");
const storage = require("../utils/storage");

// Helper: resolve department name for Dean or CollegeDepartment user
async function getDepartmentForUser(userId) {
  const dean = await db.Dean.findOne({ where: { user_id: userId } });
  if (dean) return { department: dean.department, dean };

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
    return { department: cd.department.department_name, dean: null };
  return null;
}

// Get all requirement submissions for dean's department faculty
exports.getAllRequirements = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const faculty_id = req.query.faculty_id;
    const academic_year_id = req.query.academic_year_id;
    const semester = req.query.semester;
    const status = req.query.status;
    const search = req.query.search || "";

    // Get all active (non-archived) faculty in dean's department
    const facultyList = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      attributes: ["faculty_id"],
    });

    const facultyIds = facultyList.map((f) => f.faculty_id);

    if (facultyIds.length === 0) {
      return res.json({
        requirements: [],
        currentPage: page,
        totalPages: 0,
        totalItems: 0,
      });
    }

    // Build where clause
    const whereClause = {
      faculty_id: { [Op.in]: facultyIds },
    };

    if (faculty_id) {
      whereClause.faculty_id = faculty_id;
    }

    if (academic_year_id) {
      whereClause.academic_year_id = academic_year_id;
    }

    if (semester) {
      whereClause.semester = semester;
    }

    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await db.RequirementSubmission.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["submission_date", "DESC"]],
      include: [
        {
          model: db.Faculty,
          attributes: [
            "faculty_id",
            "employee_id",
            "first_name",
            "middle_name",
            "last_name",
            "department",
          ],
          where: search
            ? {
                [Op.or]: [
                  { first_name: { [Op.like]: `%${search}%` } },
                  { last_name: { [Op.like]: `%${search}%` } },
                  { employee_id: { [Op.like]: `%${search}%` } },
                ],
              }
            : undefined,
        },
        {
          model: db.AcademicYear,
          attributes: ["academic_year_id", "year_start", "year_end"],
        },
        {
          model: db.RequirementFile,
          as: "files",
          attributes: [
            "file_id",
            "file_path",
            "file_name",
            "file_size",
            "upload_date",
          ],
        },
      ],
    });

    res.json({
      requirements: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get all requirements error:", error);
    res.status(500).json({ message: "Error fetching requirements" });
  }
};

// Get a specific faculty's requirements and statistics
exports.getFacultyRequirements = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;
    const { faculty_id } = req.params;
    const academic_year_id = req.query.academic_year_id;
    const semester = req.query.semester;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Verify faculty belongs to dean's department
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Faculty not found in your department" });
    }

    // Build where clause
    const whereClause = {
      faculty_id,
    };

    if (academic_year_id) {
      whereClause.academic_year_id = academic_year_id;
    }

    if (semester) {
      whereClause.semester = semester;
    }

    // Get all requirements
    const requirements = await db.RequirementSubmission.findAll({
      where: whereClause,
      order: [["submission_date", "DESC"]],
      include: [
        {
          model: db.AcademicYear,
          attributes: ["academic_year_id", "year_start", "year_end"],
        },
        {
          model: db.RequirementFile,
          as: "files",
          attributes: [
            "file_id",
            "file_path",
            "file_name",
            "file_size",
            "upload_date",
          ],
        },
      ],
    });

    // Load period-specific clearance if a specific period is selected
    let periodClearance = null;
    if (academic_year_id && semester) {
      periodClearance = await db.FacultyClearance.findOne({
        where: { faculty_id, academic_year_id, semester },
      });
    }

    // Calculate statistics
    const total = requirements.length;
    const validated = requirements.filter(
      (r) => r.status === "validated",
    ).length;
    const pending = requirements.filter((r) => r.status === "pending").length;
    const returned = requirements.filter((r) => r.status === "returned").length;

    res.json({
      faculty,
      requirements,
      period_clearance: periodClearance
        ? {
            clearance_status: periodClearance.clearance_status,
            clearance_remarks: periodClearance.clearance_remarks,
            clearance_date: periodClearance.clearance_date,
          }
        : null,
      statistics: {
        total_requirements: total,
        validated,
        pending,
        returned,
        completion_rate: total > 0 ? ((validated / total) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error("Get faculty requirements error:", error);
    res.status(500).json({ message: "Error fetching faculty requirements" });
  }
};

// Get department-wide statistics
exports.getDepartmentStatistics = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;
    const academic_year_id = req.query.academic_year_id;
    const semester = req.query.semester;

    console.log(
      "🔍 getDepartmentStatistics - Looking for dean with user_id:",
      deanUserId,
    );
    console.log("🔍 Token data:", req.user);

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!dean) {
      console.error("❌ Dean profile not found for user_id:", deanUserId);
      console.error("Available dean user_ids in database:");
      const allDeans = await db.Dean.findAll({
        attributes: ["dean_id", "user_id", "first_name", "last_name"],
      });
      console.error(
        allDeans.map(
          (d) =>
            `Dean ID: ${d.dean_id}, User ID: ${d.user_id}, Name: ${d.first_name} ${d.last_name}`,
        ),
      );
      return res.status(404).json({
        message: "Dean profile not found",
        debug: {
          user_id: deanUserId,
          hint: "Try logging out and logging back in to refresh your session",
        },
      });
    }

    console.log(
      "✅ Found dean:",
      dean.first_name,
      dean.last_name,
      "Department:",
      dean.department,
    );

    // Get all active (non-archived) faculty in dean's department
    const facultyList = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
    });

    // Count faculties by clearance status
    const clearedFacultiesCount = facultyList.filter(
      (f) => f.clearance_status === "cleared",
    ).length;
    const withholdingFacultiesCount = facultyList.filter(
      (f) => f.clearance_status === "withholding",
    ).length;
    const pendingFacultiesCount = facultyList.filter(
      (f) => f.clearance_status === "pending",
    ).length;

    // Get requirement statistics for the department
    const facultyIds = facultyList.map((f) => f.faculty_id);
    const requirementWhere = {
      faculty_id: { [Op.in]: facultyIds },
    };

    if (academic_year_id) {
      requirementWhere.academic_year_id = academic_year_id;
    }

    if (semester) {
      requirementWhere.semester = semester;
    }

    const requirements = await db.RequirementSubmission.findAll({
      where: requirementWhere,
    });

    // Each faculty must submit 15 standard requirements per period
    const STANDARD_REQUIREMENTS_PER_FACULTY = 15;
    const expectedTotalRequirements =
      facultyList.length * STANDARD_REQUIREMENTS_PER_FACULTY;

    const totalRequirements = requirements.length;
    const validatedRequirements = requirements.filter(
      (r) => r.status === "validated",
    ).length;
    const pendingRequirements = requirements.filter(
      (r) => r.status === "pending",
    ).length;
    const returnedRequirements = requirements.filter(
      (r) => r.status === "returned",
    ).length;

    // Calculate completion rate based on validated requirements vs expected total
    const completionRate =
      expectedTotalRequirements > 0
        ? ((validatedRequirements / expectedTotalRequirements) * 100).toFixed(2)
        : "0.00";

    res.json({
      total_faculty: facultyList.length,
      cleared_faculties: clearedFacultiesCount,
      withholding_faculties: withholdingFacultiesCount,
      pending_faculties: pendingFacultiesCount,
      faculty_clearance_rate:
        facultyList.length > 0
          ? ((clearedFacultiesCount / facultyList.length) * 100).toFixed(2)
          : "0.00",
      total_requirements: expectedTotalRequirements, // Expected total (15 per faculty)
      validated: validatedRequirements,
      pending: pendingRequirements,
      returned: returnedRequirements,
      completion_rate: completionRate,
    });
  } catch (error) {
    console.error("Get department statistics error:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
};

// Validate a requirement (approve)
exports.validateRequirement = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;
    const { submission_id } = req.params;
    const { remarks } = req.body;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Find submission and verify it belongs to dean's department
    const submission = await db.RequirementSubmission.findOne({
      where: { submission_id },
      include: [
        {
          model: db.Faculty,
          where: { department: dean.department },
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Update submission status
    submission.status = "validated";
    submission.dean_remarks = remarks || "Approved";
    submission.validated_by = deanUserId;
    submission.validated_date = new Date();
    await submission.save();

    // Auto-update faculty clearance status after dean validation
    const faculty_id = submission.faculty_id;
    await updateFacultyClearanceStatus(
      faculty_id,
      submission.academic_year_id,
      submission.semester,
    );

    res.json({
      message: "Requirement validated successfully",
      submission,
    });
  } catch (error) {
    console.error("Validate requirement error:", error);
    res.status(500).json({ message: "Error validating requirement" });
  }
};

// Return a requirement (reject/needs revision)
exports.returnRequirement = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;
    const { submission_id } = req.params;
    const { remarks } = req.body;

    if (!remarks) {
      return res
        .status(400)
        .json({ message: "Remarks are required when returning a requirement" });
    }

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Find submission and verify it belongs to dean's department
    const submission = await db.RequirementSubmission.findOne({
      where: { submission_id },
      include: [
        {
          model: db.Faculty,
          where: { department: dean.department },
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Update submission status
    submission.status = "returned";
    submission.dean_remarks = remarks;
    submission.validated_by = deanUserId;
    submission.validated_date = new Date();
    await submission.save();

    // Auto-update faculty clearance status after dean returns requirement
    const faculty_id = submission.faculty_id;
    await updateFacultyClearanceStatus(
      faculty_id,
      submission.academic_year_id,
      submission.semester,
    );

    res.json({
      message: "Requirement returned successfully",
      submission,
    });
  } catch (error) {
    console.error("Return requirement error:", error);
    res.status(500).json({ message: "Error returning requirement" });
  }
};

// Download a requirement file
exports.downloadRequirement = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;
    const { submission_id } = req.params;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Find submission and verify it belongs to dean's department
    const submission = await db.RequirementSubmission.findOne({
      where: { submission_id },
      include: [
        {
          model: db.Faculty,
          where: { department: dean.department },
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const url = await storage.getUrl(submission.file_path, {
      download: true,
      filename: submission.file_name,
    });
    res.json({ url });
  } catch (error) {
    console.error("Download requirement error:", error);
    res.status(500).json({ message: "Error downloading requirement" });
  }
};

// Manually set faculty clearance status (dean override)
exports.setFacultyClearanceStatus = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;
    const { faculty_id } = req.params;
    const clearance_status = req.body.clearance_status || req.body.status;
    const { remarks, academic_year_id, semester } = req.body;

    // Validate status
    if (!["pending", "cleared", "withholding"].includes(clearance_status)) {
      return res.status(400).json({
        message:
          "Invalid status. Must be 'pending', 'cleared', or 'withholding'",
      });
    }

    if (!academic_year_id || !semester) {
      return res.status(400).json({
        message: "academic_year_id and semester are required",
      });
    }

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Verify faculty belongs to dean's department
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Faculty not found in your department" });
    }

    // Upsert per-period clearance record
    await db.FacultyClearance.upsert({
      faculty_id,
      academic_year_id,
      semester,
      clearance_status,
      clearance_remarks: remarks || null,
      clearance_date: new Date(),
      set_by_dean_id: dean.dean_id,
    });

    // Also update global clearance_status on faculty for backwards compatibility
    await db.Faculty.update(
      {
        clearance_status,
        clearance_remarks: remarks || null,
        clearance_date: new Date(),
      },
      { where: { faculty_id } },
    );

    res.json({
      message: "Faculty clearance status updated successfully",
      faculty_id,
      clearance_status,
      academic_year_id,
      semester,
    });
  } catch (error) {
    console.error("Set faculty clearance status error:", error);
    res
      .status(500)
      .json({ message: "Error updating faculty clearance status" });
  }
};

// Helper function to auto-calculate and update faculty clearance status per period
async function updateFacultyClearanceStatus(
  faculty_id,
  academic_year_id,
  semester,
) {
  try {
    const whereClause = { faculty_id };
    if (academic_year_id) whereClause.academic_year_id = academic_year_id;
    if (semester) whereClause.semester = semester;

    const requirements = await db.RequirementSubmission.findAll({
      where: whereClause,
    });

    let clearance_status = "pending";
    if (requirements.length > 0) {
      const returnedCount = requirements.filter(
        (r) => r.status === "returned",
      ).length;
      const validatedCount = requirements.filter(
        (r) => r.status === "validated",
      ).length;

      if (returnedCount > 0) {
        clearance_status = "withholding";
      } else if (validatedCount === requirements.length) {
        clearance_status = "cleared";
      }
    }

    // Upsert per-period clearance
    if (academic_year_id && semester) {
      await db.FacultyClearance.upsert({
        faculty_id,
        academic_year_id,
        semester,
        clearance_status,
        clearance_date: new Date(),
        set_by_dean_id: null,
      });
    }

    // Also update global clearance_status on faculty
    await db.Faculty.update(
      {
        clearance_status,
        clearance_date: new Date(),
      },
      { where: { faculty_id } },
    );
  } catch (error) {
    console.error("Update faculty clearance status error:", error);
  }
}
