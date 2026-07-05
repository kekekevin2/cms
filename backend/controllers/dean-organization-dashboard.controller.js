const db = require("../models");

// Helper: resolve department for Dean or CollegeDepartment user
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

const { Op } = require("sequelize");

// Get organization dashboard statistics
exports.getOrganizationDashboard = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    // Get total organizations
    const totalOrganizations = await db.Organization.count({
      where: { department: dean.department },
    });

    // Get organizations with member counts
    const organizationsWithMembers = await db.Organization.findAll({
      where: { department: dean.department },
      attributes: ["organization_id", "organization_name"],
      include: [
        {
          model: db.OrganizationMember,
          as: "members",
          attributes: [],
        },
      ],
      group: ["organizations.organization_id"],
      raw: true,
    });

    const totalMembers = await db.OrganizationMember.count({
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
          attributes: [],
        },
      ],
    });

    // Get document statistics
    const totalDocuments = await db.OrganizationDocument.count({
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
          attributes: [],
        },
      ],
    });

    const pendingDocuments = await db.OrganizationDocument.count({
      where: { status: "pending" },
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
          attributes: [],
        },
      ],
    });

    const approvedDocuments = await db.OrganizationDocument.count({
      where: { status: "approved" },
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
          attributes: [],
        },
      ],
    });

    const rejectedDocuments = await db.OrganizationDocument.count({
      where: { status: "rejected" },
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
          attributes: [],
        },
      ],
    });

    // Get total advisers
    const totalAdvisers = await db.OrganizationAdviser.count({
      where: { is_active: true },
      include: [
        {
          model: db.Organization,
          where: { department: dean.department },
          attributes: [],
        },
      ],
    });

    // Get event statistics - temporarily disabled due to missing association
    const totalEvents = 0; // TODO: Add OrganizationEvent -> Organization association in models/index.js

    // Get recent documents
    const recentDocuments = await db.OrganizationDocument.findAll({
      limit: 5,
      order: [["submitted_date", "DESC"]],
      include: [
        {
          model: db.Organization,
          as: "organization",
          where: { department: dean.department },
          attributes: ["organization_id", "organization_name"],
        },
        {
          model: db.DocumentType,
          as: "document_type",
          attributes: ["document_type_id", "type_name"],
        },
      ],
    });

    // Get organizations with their stats
    const organizationStats = await db.Organization.findAll({
      where: { department: dean.department },
      attributes: ["organization_id", "organization_name"],
      include: [
        {
          model: db.Faculty,
          as: "faculty",
          attributes: ["first_name", "middle_name", "last_name"],
          required: false, // Make optional - don't fail if no faculty
        },
        {
          model: db.OrganizationMember,
          as: "members",
          attributes: ["member_id"],
          required: false, // Make optional
        },
        {
          model: db.OrganizationDocument,
          as: "documents",
          attributes: ["document_id", "status"],
          required: false, // Make optional
        },
      ],
    });

    res.json({
      statistics: {
        totalOrganizations,
        totalMembers,
        totalDocuments,
        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,
        totalAdvisers,
        totalEvents,
        approvedEvents: 0, // TODO: Add OrganizationEvent associations
        pendingEvents: 0,  // TODO: Add OrganizationEvent associations
      },
      recentDocuments,
      organizationStats,
    });
  } catch (error) {
    console.error("Get organization dashboard error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Error fetching dashboard data",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get member demographics for a specific organization
exports.getMemberDemographics = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const { organizationId, academicYearId, semester, activeOnly } = req.query;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    if (!organizationId) {
      return res.status(400).json({ message: "Organization ID is required" });
    }

    // Verify organization belongs to dean's department
    const organization = await db.Organization.findOne({
      where: {
        organization_id: organizationId,
        department: dean.department,
      },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Build where clause for members
    const whereClause = {
      organization_id: organizationId,
    };

    if (academicYearId) {
      whereClause.academic_year_id = academicYearId;
    }

    if (semester) {
      whereClause.semester = semester;
    }

    if (activeOnly === "true") {
      whereClause.is_active = true;
    }

    // Get all members matching criteria
    const members = await db.OrganizationMember.findAll({
      where: whereClause,
      attributes: ["member_id", "gender", "program", "year_level", "is_active"],
    });

    // Calculate statistics
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.is_active).length;

    // Gender distribution
    const maleCount = members.filter((m) => m.gender === "Male").length;
    const femaleCount = members.filter((m) => m.gender === "Female").length;
    const malePercentage =
      totalMembers > 0 ? ((maleCount / totalMembers) * 100).toFixed(1) : 0;
    const femalePercentage =
      totalMembers > 0 ? ((femaleCount / totalMembers) * 100).toFixed(1) : 0;

    // Program distribution
    const programMap = {};
    members.forEach((m) => {
      if (m.program) {
        programMap[m.program] = (programMap[m.program] || 0) + 1;
      }
    });

    const byProgram = Object.entries(programMap)
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count);

    // Year level distribution
    const yearLevelMap = {};
    members.forEach((m) => {
      if (m.year_level) {
        yearLevelMap[m.year_level] = (yearLevelMap[m.year_level] || 0) + 1;
      }
    });

    const membersByYearLevel = Object.entries(yearLevelMap)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => {
        const order = [
          "1st Year",
          "2nd Year",
          "3rd Year",
          "4th Year",
          "5th Year",
        ];
        return order.indexOf(a.year) - order.indexOf(b.year);
      });

    res.json({
      demographics: {
        maleCount,
        femaleCount,
        malePercentage: parseFloat(malePercentage),
        femalePercentage: parseFloat(femalePercentage),
        byProgram,
      },
      stats: {
        totalMembers,
        activeMembers,
        membersByYearLevel,
      },
    });
  } catch (error) {
    console.error("Get member demographics error:", error);
    res.status(500).json({ message: "Error fetching member demographics" });
  }
};
