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
    const { organizationId } = req.query;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    const dean = { department: deanInfo.department };

    // Build reusable organization filter. When organizationId is provided,
    // scope everything to that single organization (still restricted to the
    // dean's department for security).
    const orgWhere = { department: dean.department };
    if (organizationId) {
      orgWhere.organization_id = organizationId;

      // Verify the organization belongs to this dean's department
      const orgExists = await db.Organization.findOne({ where: orgWhere });
      if (!orgExists) {
        return res.status(404).json({ message: "Organization not found" });
      }
    }

    // Get total organizations (1 when scoped)
    const totalOrganizations = await db.Organization.count({
      where: orgWhere,
    });

    // Get organizations with member counts
    const organizationsWithMembers = await db.Organization.findAll({
      where: orgWhere,
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
          where: orgWhere,
          attributes: [],
        },
      ],
    });

    // Get document statistics
    const totalDocuments = await db.OrganizationDocument.count({
      include: [
        {
          model: db.Organization,
          where: orgWhere,
          attributes: [],
        },
      ],
    });

    const pendingDocuments = await db.OrganizationDocument.count({
      where: { status: "pending" },
      include: [
        {
          model: db.Organization,
          where: orgWhere,
          attributes: [],
        },
      ],
    });

    const approvedDocuments = await db.OrganizationDocument.count({
      where: { status: "approved" },
      include: [
        {
          model: db.Organization,
          where: orgWhere,
          attributes: [],
        },
      ],
    });

    const rejectedDocuments = await db.OrganizationDocument.count({
      where: { status: "rejected" },
      include: [
        {
          model: db.Organization,
          where: orgWhere,
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
          where: orgWhere,
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
          where: orgWhere,
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
      where: orgWhere,
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

    // ------------------------------------------------------------------
    // Member breakdown by Position and Year Level.
    // Mirrors the Organization Portal (dashboards/organization/organization.ts)
    // exactly so that the same charts render with consistent rules:
    //   - "Total Members" = regular members (officers excluded)
    //   - Position counts: "Member" is always counted; officer positions
    //     are counted only when they came from the Officers Profile
    //     (upload_id is null). Officer positions imported from bulk
    //     uploads are intentionally ignored.
    //   - Year level counts: regular members only.
    // Data is scoped by `orgWhere` so it reflects either the whole
    // department (aggregated) or a single organization when
    // organizationId is provided.
    // ------------------------------------------------------------------
    const membersForBreakdown = await db.OrganizationMember.findAll({
      attributes: ["position", "year_level", "is_active", "upload_id"],
      include: [
        {
          model: db.Organization,
          where: orgWhere,
          attributes: [],
        },
      ],
    });

    const officerPositionsSet = new Set([
      "adviser",
      "advisor",
      "president",
      "vice president",
      "vp",
      "secretary",
      "assistant secretary",
      "asst. secretary",
      "asst secretary",
      "treasurer",
      "assistant treasurer",
      "asst. treasurer",
      "asst treasurer",
      "auditor",
      "p.r.o.",
      "pro",
      "pio",
      "business manager",
      "media and publicity head",
      "media and publicity committee",
      "media and publicity",
      "commdrrm head",
      "commdrrm committee",
      "1st year representative",
      "first year representative",
      "2nd year representative",
      "second year representative",
      "3rd year representative",
      "third year representative",
      "4th year representative",
      "fourth year representative",
      "year representative",
    ]);

    const normalizePosition = (value) =>
      (value == null ? "" : String(value))
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

    const isOfficer = (m) => officerPositionsSet.has(normalizePosition(m.position));

    const regularMembers = membersForBreakdown.filter((m) => !isOfficer(m));
    const memberTotalMembers = regularMembers.length;
    const memberActiveMembers = regularMembers.filter((m) => m.is_active).length;

    const positionCounts = {};
    membersForBreakdown.forEach((m) => {
      const normalized = normalizePosition(m.position);
      if (!normalized) return;

      const isFromExcel = m.upload_id !== null && m.upload_id !== undefined;

      if (normalized === "member") {
        // Regular members — always count regardless of source.
        positionCounts[m.position] = (positionCounts[m.position] || 0) + 1;
      } else if (isOfficer(m) && !isFromExcel) {
        // Officer role added via Officers Profile (not bulk-imported).
        positionCounts[m.position] = (positionCounts[m.position] || 0) + 1;
      }
    });

    const membersByPosition = Object.entries(positionCounts).map(([position, count]) => ({
      position,
      count,
    }));

    const yearCounts = {};
    regularMembers.forEach((m) => {
      if (m.year_level && String(m.year_level).trim() !== "") {
        yearCounts[m.year_level] = (yearCounts[m.year_level] || 0) + 1;
      }
    });

    const yearOrder = [
      "1st Year",
      "2nd Year",
      "3rd Year",
      "4th Year",
      "5th Year",
    ];
    const membersByYearLevel = Object.entries(yearCounts)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => yearOrder.indexOf(a.year) - yearOrder.indexOf(b.year));

    const memberStats = {
      totalMembers: memberTotalMembers,
      activeMembers: memberActiveMembers,
      membersByPosition,
      membersByYearLevel,
    };

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
      memberStats,
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

// Get member demographics.
// When `organizationId` is provided, returns data for that single
// organization. When omitted, aggregates across every organization in
// the dean's department.
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

    // Build where clause for members. When scoped to one org, verify it
    // belongs to the dean's department first. Otherwise, aggregate over
    // all orgs in the department.
    const whereClause = {};

    if (organizationId) {
      const organization = await db.Organization.findOne({
        where: {
          organization_id: organizationId,
          department: dean.department,
        },
      });

      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      whereClause.organization_id = organizationId;
    } else {
      // Aggregate: pull every org id belonging to this department and
      // constrain the member query to those ids. This keeps demographics
      // scoped to the dean's department without requiring an eager
      // include (which would complicate the group-by counts below).
      const departmentOrgs = await db.Organization.findAll({
        where: { department: dean.department },
        attributes: ["organization_id"],
      });
      const orgIds = departmentOrgs.map((o) => o.organization_id);

      if (orgIds.length === 0) {
        return res.json({
          demographics: {
            maleCount: 0,
            femaleCount: 0,
            malePercentage: 0,
            femalePercentage: 0,
            byProgram: [],
          },
          stats: {
            totalMembers: 0,
            activeMembers: 0,
            membersByYearLevel: [],
          },
        });
      }

      whereClause.organization_id = { [Op.in]: orgIds };
    }

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
