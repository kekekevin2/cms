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

// Get faculty involvement in research-related activities
exports.getResearchInvolvement = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyResearchActivities,
          as: "research_activities",
          required: false,
          where: academicYearId
            ? {
                date: {
                  [Op.between]: [
                    db.sequelize.literal(
                      `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                    db.sequelize.literal(
                      `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                  ],
                },
              }
            : undefined,
        },
      ],
    });

    // Calculate involvement statistics
    const stats = faculty.map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: `${f.first_name} ${f.last_name}`,
      count: f.research_activities ? f.research_activities.length : 0,
    }));

    // Calculate total and percentages
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const data = stats
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(0) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      title:
        "Faculty Involvement in Research-related Seminars/Workshops/Trainings/Conferences",
      subtitle: "(Permanent and Temporary)",
      data,
      total,
    });
  } catch (error) {
    console.error("Get research involvement error:", error);
    res.status(500).json({ message: "Error fetching research involvement" });
  }
};

// Get faculty involvement in extension services
exports.getExtensionInvolvement = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyExtensionActivities,
          as: "extension_activities",
          required: false,
          where: academicYearId
            ? {
                date_of_implementation: {
                  [Op.between]: [
                    db.sequelize.literal(
                      `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                    db.sequelize.literal(
                      `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                  ],
                },
              }
            : undefined,
        },
      ],
    });

    // Calculate involvement statistics
    const stats = faculty.map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: `${f.first_name} ${f.last_name}`,
      count: f.extension_activities ? f.extension_activities.length : 0,
    }));

    // Calculate total and percentages
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const data = stats
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(0) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      title: "Faculty Involvement in Extension Services",
      subtitle: "(Permanent and Temporary)",
      data,
      total,
    });
  } catch (error) {
    console.error("Get extension involvement error:", error);
    res.status(500).json({ message: "Error fetching extension involvement" });
  }
};

// Get faculty involvement in seminars/trainings/conferences
exports.getSeminarsInvolvement = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultySeminarsTrainings,
          as: "seminars_trainings",
          required: false,
          where: academicYearId
            ? {
                date: {
                  [Op.between]: [
                    db.sequelize.literal(
                      `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                    db.sequelize.literal(
                      `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                  ],
                },
              }
            : undefined,
        },
      ],
    });

    // Calculate involvement statistics
    const stats = faculty.map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: `${f.first_name} ${f.last_name}`,
      count: f.seminars_trainings ? f.seminars_trainings.length : 0,
    }));

    // Calculate total and percentages
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const data = stats
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(0) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      title: "Faculty Involvement in Seminars/Workshops/Trainings/Conferences",
      subtitle: "(Permanent and Temporary)",
      data,
      total,
    });
  } catch (error) {
    console.error("Get seminars involvement error:", error);
    res.status(500).json({ message: "Error fetching seminars involvement" });
  }
};

// Get faculty awards statistics
exports.getAwardsStatistics = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyAwards,
          as: "awards",
          required: false,
          where: academicYearId
            ? {
                date_received: {
                  [Op.between]: [
                    db.sequelize.literal(
                      `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                    db.sequelize.literal(
                      `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                    ),
                  ],
                },
              }
            : undefined,
        },
      ],
    });

    // Calculate awards statistics
    const stats = faculty.map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: `${f.first_name} ${f.last_name}`,
      count: f.awards ? f.awards.length : 0,
    }));

    // Calculate total and percentages
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const data = stats
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(0) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      title: "Faculty Awards Received",
      subtitle: "(Permanent and Temporary)",
      data,
      total,
    });
  } catch (error) {
    console.error("Get awards statistics error:", error);
    res.status(500).json({ message: "Error fetching awards statistics" });
  }
};

// Get faculty professional membership statistics
exports.getMembershipStatistics = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get all active (non-archived) faculty in dean's department
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyProfessionalMembership,
          as: "professional_memberships",
          required: false,
          where: {
            is_active: true,
          },
        },
      ],
    });

    // Calculate membership statistics
    const stats = faculty.map((f) => ({
      faculty_id: f.faculty_id,
      faculty_name: `${f.first_name} ${f.last_name}`,
      count: f.professional_memberships ? f.professional_memberships.length : 0,
    }));

    // Calculate total and percentages
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const data = stats
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        percentage: total > 0 ? ((s.count / total) * 100).toFixed(0) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      title: "Faculty Professional Memberships",
      subtitle: "(Active Memberships)",
      data,
      total,
    });
  } catch (error) {
    console.error("Get membership statistics error:", error);
    res.status(500).json({ message: "Error fetching membership statistics" });
  }
};

// Get detailed faculty extension activities for PDF generation
exports.getExtensionActivitiesDetails = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department with extension activities
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyExtensionActivities,
          as: "extension_activities",
          required: true,
          where: academicYearId
            ? {
                date_from: {
                  [Op.gte]: db.sequelize.literal(
                    `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                  ),
                },
                date_to: {
                  [Op.lte]: db.sequelize.literal(
                    `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                  ),
                },
              }
            : undefined,
        },
      ],
      order: [
        [
          { model: db.FacultyExtensionActivities, as: "extension_activities" },
          "date_from",
          "DESC",
        ],
      ],
    });

    // Format data for PDF
    const facultyList = faculty.map((f) => ({
      faculty_name:
        `${f.last_name}, ${f.first_name} ${f.middle_name || ""}`.trim(),
      activities: f.extension_activities.map((activity) => ({
        title: activity.extension_title,
        date: activity.date_of_implementation,
        beneficiary: activity.beneficiary,
        location: activity.location,
      })),
    }));

    res.json({
      title:
        "List of Faculty Involvement in Extension Services (Permanent and Temporary)",
      department: dean.department,
      facultyList,
    });
  } catch (error) {
    console.error("Get extension activities details error:", error);
    res
      .status(500)
      .json({ message: "Error fetching extension activities details" });
  }
};

// Get detailed faculty research activities for PDF generation
exports.getResearchActivitiesDetails = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department with research activities
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyResearchActivities,
          as: "research_activities",
          required: true,
          where: academicYearId
            ? {
                date_from: {
                  [Op.gte]: db.sequelize.literal(
                    `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                  ),
                },
                date_to: {
                  [Op.lte]: db.sequelize.literal(
                    `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                  ),
                },
              }
            : undefined,
        },
      ],
      order: [
        [
          { model: db.FacultyResearchActivities, as: "research_activities" },
          "date_from",
          "DESC",
        ],
      ],
    });

    // Format data for PDF
    const facultyList = faculty.map((f) => ({
      faculty_name:
        `${f.last_name}, ${f.first_name} ${f.middle_name || ""}`.trim(),
      activities: f.research_activities.map((activity) => ({
        title: activity.research_title,
        category: activity.category,
        date: activity.date,
        sponsoring_agency: activity.sponsoring_agency,
      })),
    }));

    res.json({
      title:
        "List of Faculty Involvement in Research-related Seminars/Workshops/Trainings/Conferences (Permanent and Temporary)",
      department: dean.department,
      facultyList,
    });
  } catch (error) {
    console.error("Get research activities details error:", error);
    res
      .status(500)
      .json({ message: "Error fetching research activities details" });
  }
};

// Get detailed faculty seminars/trainings for PDF generation
exports.getSeminarsTrainingsDetails = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department with seminars/trainings
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultySeminarsTrainings,
          as: "seminars_trainings",
          required: true,
          where: academicYearId
            ? {
                date_from: {
                  [Op.gte]: db.sequelize.literal(
                    `(SELECT start_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                  ),
                },
                date_to: {
                  [Op.lte]: db.sequelize.literal(
                    `(SELECT end_date FROM academic_years WHERE academic_year_id = ${academicYearId})`,
                  ),
                },
              }
            : undefined,
        },
      ],
      order: [
        [
          { model: db.FacultySeminarsTrainings, as: "seminars_trainings" },
          "date_from",
          "DESC",
        ],
      ],
    });

    // Format data for PDF
    const facultyList = faculty.map((f) => ({
      faculty_name:
        `${f.last_name}, ${f.first_name} ${f.middle_name || ""}`.trim(),
      activities: f.seminars_trainings.map((activity) => ({
        title: activity.title,
        category: activity.category,
        date: activity.date,
        sponsoring_agency: activity.sponsoring_agency,
      })),
    }));

    res.json({
      title:
        "List of Faculty Involvement in Seminars/Workshops/Trainings/Conferences",
      department: dean.department,
      facultyList,
    });
  } catch (error) {
    console.error("Get seminars trainings details error:", error);
    res
      .status(500)
      .json({ message: "Error fetching seminars trainings details" });
  }
};

// Get comprehensive faculty analytics dashboard
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const academicYearId = req.query.academic_year_id;

    // Get all active (non-archived) faculty in dean's department with all profile data
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department, is_active: true },
      include: [
        {
          model: db.FacultyResearchActivities,
          as: "research_activities",
          required: false,
        },
        {
          model: db.FacultyExtensionActivities,
          as: "extension_activities",
          required: false,
        },
        {
          model: db.FacultySeminarsTrainings,
          as: "seminars_trainings",
          required: false,
        },
        {
          model: db.FacultyAwards,
          as: "awards",
          required: false,
        },
        {
          model: db.FacultyProfessionalMembership,
          as: "professional_memberships",
          required: false,
          where: { is_active: true },
        },
      ],
    });

    // Calculate statistics for each category
    const calculateStats = (category) => {
      const stats = faculty.map((f) => ({
        faculty_id: f.faculty_id,
        faculty_name: `${f.first_name} ${f.last_name}`,
        count: f[category] ? f[category].length : 0,
      }));

      const total = stats.reduce((sum, s) => sum + s.count, 0);
      return stats
        .filter((s) => s.count > 0)
        .map((s) => ({
          ...s,
          percentage: total > 0 ? ((s.count / total) * 100).toFixed(0) : 0,
        }))
        .sort((a, b) => b.count - a.count);
    };

    res.json({
      research_involvement: {
        title:
          "Faculty Involvement in Research-related Seminars/Workshops/Trainings/Conferences",
        data: calculateStats("research_activities"),
      },
      extension_involvement: {
        title: "Faculty Involvement in Extension Services",
        data: calculateStats("extension_activities"),
      },
      seminars_involvement: {
        title:
          "Faculty Involvement in Seminars/Workshops/Trainings/Conferences",
        data: calculateStats("seminars_trainings"),
      },
      awards: {
        title: "Faculty Awards Received",
        data: calculateStats("awards"),
      },
      memberships: {
        title: "Faculty Professional Memberships",
        data: calculateStats("professional_memberships"),
      },
      total_faculty: faculty.length,
    });
  } catch (error) {
    console.error("Get dashboard analytics error:", error);
    res.status(500).json({ message: "Error fetching dashboard analytics" });
  }
};

// Get detailed faculty extension activities for single faculty PDF generation
exports.getExtensionActivitiesDetailsByFaculty = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const facultyId = req.query.faculty_id;
    if (!facultyId)
      return res.status(400).json({ message: "Faculty ID is required" });

    const faculty = await db.Faculty.findOne({
      where: { faculty_id: facultyId, department: dean.department },
      include: [
        {
          model: db.FacultyExtensionActivities,
          as: "extension_activities",
          required: false,
        },
      ],
    });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const facultyList = [
      {
        faculty_name:
          `${faculty.last_name}, ${faculty.first_name} ${faculty.middle_name || ""}`.trim(),
        activities: (faculty.extension_activities || []).map((activity) => ({
          title: activity.extension_title,
          date: activity.date_of_implementation,
          beneficiary: activity.beneficiary,
          location: activity.location,
        })),
      },
    ];

    res.json({
      title:
        "List of Faculty Involvement in Extension Services (Permanent and Temporary)",
      department: dean.department,
      facultyList,
    });
  } catch (error) {
    console.error("Get extension activities details error:", error);
    res
      .status(500)
      .json({ message: "Error fetching extension activities details" });
  }
};

// Get detailed faculty research activities for single faculty PDF generation
exports.getResearchActivitiesDetailsByFaculty = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const facultyId = req.query.faculty_id;
    if (!facultyId)
      return res.status(400).json({ message: "Faculty ID is required" });

    const faculty = await db.Faculty.findOne({
      where: { faculty_id: facultyId, department: dean.department },
      include: [
        {
          model: db.FacultyResearchActivities,
          as: "research_activities",
          required: false,
        },
      ],
    });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const facultyList = [
      {
        faculty_name:
          `${faculty.last_name}, ${faculty.first_name} ${faculty.middle_name || ""}`.trim(),
        activities: (faculty.research_activities || []).map((activity) => ({
          title: activity.research_title,
          category: activity.category,
          date: activity.date,
          sponsoring_agency: activity.sponsoring_agency,
        })),
      },
    ];

    res.json({
      title:
        "List of Faculty Involvement in Research-related Seminars/Workshops/Trainings/Conferences (Permanent and Temporary)",
      department: dean.department,
      facultyList,
    });
  } catch (error) {
    console.error("Get research activities details error:", error);
    res
      .status(500)
      .json({ message: "Error fetching research activities details" });
  }
};

// Get detailed faculty seminars/trainings for single faculty PDF generation
exports.getSeminarsTrainingsDetailsByFaculty = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const facultyId = req.query.faculty_id;
    if (!facultyId)
      return res.status(400).json({ message: "Faculty ID is required" });

    const faculty = await db.Faculty.findOne({
      where: { faculty_id: facultyId, department: dean.department },
      include: [
        {
          model: db.FacultySeminarsTrainings,
          as: "seminars_trainings",
          required: false,
        },
      ],
    });

    if (!faculty) return res.status(404).json({ message: "Faculty not found" });

    const facultyList = [
      {
        faculty_name:
          `${faculty.last_name}, ${faculty.first_name} ${faculty.middle_name || ""}`.trim(),
        activities: (faculty.seminars_trainings || []).map((activity) => ({
          title: activity.title,
          category: activity.category,
          date: activity.date,
          sponsoring_agency: activity.sponsoring_agency,
        })),
      },
    ];

    res.json({
      title:
        "List of Faculty Involvement in Seminars/Workshops/Trainings/Conferences",
      department: dean.department,
      facultyList,
    });
  } catch (error) {
    console.error("Get seminars trainings details error:", error);
    res
      .status(500)
      .json({ message: "Error fetching seminars trainings details" });
  }
};
