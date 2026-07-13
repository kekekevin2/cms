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

const path = require("path");
const fs = require("fs").promises;

// ==================== PERSONAL PROFILE ====================

// Get personal profile
exports.getPersonalProfile = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const profile = await db.FacultyPersonalProfile.findOne({
      where: { faculty_id: facultyId },
    });

    res.json({ profile });
  } catch (error) {
    console.error("Get personal profile error:", error);
    res.status(500).json({ message: "Error fetching personal profile" });
  }
};

// Create or update personal profile
exports.upsertPersonalProfile = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const profileData = req.body;

    // Handle file uploads
    if (req.files) {
      if (req.files.profile_picture && req.files.profile_picture[0]) {
        profileData.profile_picture = `/uploads/profile-pictures/${req.files.profile_picture[0].filename}`;
      }
      if (req.files.passport_photo && req.files.passport_photo[0]) {
        profileData.passport_photo = `/uploads/profile-pictures/${req.files.passport_photo[0].filename}`;
      }
    }

    const [profile, created] = await db.FacultyPersonalProfile.upsert({
      ...profileData,
      faculty_id: facultyId,
    });

    res.json({
      message: created
        ? "Personal profile created successfully"
        : "Personal profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Upsert personal profile error:", error);
    res.status(500).json({ message: "Error saving personal profile" });
  }
};

// ==================== ACADEMIC PROFILE ====================

// Get all academic profiles
exports.getAcademicProfiles = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const profiles = await db.FacultyAcademicProfile.findAll({
      where: { faculty_id: facultyId },
      order: [["year_graduated", "DESC"]],
    });

    res.json({ profiles });
  } catch (error) {
    console.error("Get academic profiles error:", error);
    res.status(500).json({ message: "Error fetching academic profiles" });
  }
};

// Create academic profile
exports.createAcademicProfile = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const profileData = req.body;

    const profile = await db.FacultyAcademicProfile.create({
      ...profileData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Academic profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create academic profile error:", error);
    res.status(500).json({ message: "Error creating academic profile" });
  }
};

// Update academic profile
exports.updateAcademicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const profileData = req.body;

    const profile = await db.FacultyAcademicProfile.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!profile) {
      return res.status(404).json({ message: "Academic profile not found" });
    }

    await profile.update(profileData);

    res.json({
      message: "Academic profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update academic profile error:", error);
    res.status(500).json({ message: "Error updating academic profile" });
  }
};

// Delete academic profile
exports.deleteAcademicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const profile = await db.FacultyAcademicProfile.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!profile) {
      return res.status(404).json({ message: "Academic profile not found" });
    }

    await profile.destroy();

    res.json({ message: "Academic profile deleted successfully" });
  } catch (error) {
    console.error("Delete academic profile error:", error);
    res.status(500).json({ message: "Error deleting academic profile" });
  }
};

// ==================== EMPLOYMENT PROFILE ====================

// Get all employment profiles
exports.getEmploymentProfiles = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const profiles = await db.FacultyEmploymentProfile.findAll({
      where: { faculty_id: facultyId },
      order: [["date_from", "DESC"]],
    });

    res.json({ profiles });
  } catch (error) {
    console.error("Get employment profiles error:", error);
    res.status(500).json({ message: "Error fetching employment profiles" });
  }
};

// Create employment profile
exports.createEmploymentProfile = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const profileData = req.body;

    const profile = await db.FacultyEmploymentProfile.create({
      ...profileData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Employment profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create employment profile error:", error);
    res.status(500).json({ message: "Error creating employment profile" });
  }
};

// Update employment profile
exports.updateEmploymentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const profileData = req.body;

    const profile = await db.FacultyEmploymentProfile.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!profile) {
      return res.status(404).json({ message: "Employment profile not found" });
    }

    await profile.update(profileData);

    res.json({
      message: "Employment profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update employment profile error:", error);
    res.status(500).json({ message: "Error updating employment profile" });
  }
};

// Delete employment profile
exports.deleteEmploymentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const profile = await db.FacultyEmploymentProfile.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!profile) {
      return res.status(404).json({ message: "Employment profile not found" });
    }

    await profile.destroy();

    res.json({ message: "Employment profile deleted successfully" });
  } catch (error) {
    console.error("Delete employment profile error:", error);
    res.status(500).json({ message: "Error deleting employment profile" });
  }
};

// ==================== PROFESSIONAL MEMBERSHIP ====================

// Get all professional memberships
exports.getProfessionalMemberships = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const memberships = await db.FacultyProfessionalMembership.findAll({
      where: { faculty_id: facultyId },
      order: [["date_joined", "DESC"]],
    });

    res.json({ memberships });
  } catch (error) {
    console.error("Get professional memberships error:", error);
    res
      .status(500)
      .json({ message: "Error fetching professional memberships" });
  }
};

// Create professional membership
exports.createProfessionalMembership = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const membershipData = req.body;

    const membership = await db.FacultyProfessionalMembership.create({
      ...membershipData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Professional membership created successfully",
      membership,
    });
  } catch (error) {
    console.error("Create professional membership error:", error);
    res.status(500).json({ message: "Error creating professional membership" });
  }
};

// Update professional membership
exports.updateProfessionalMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const membershipData = req.body;

    const membership = await db.FacultyProfessionalMembership.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ message: "Professional membership not found" });
    }

    await membership.update(membershipData);

    res.json({
      message: "Professional membership updated successfully",
      membership,
    });
  } catch (error) {
    console.error("Update professional membership error:", error);
    res.status(500).json({ message: "Error updating professional membership" });
  }
};

// Delete professional membership
exports.deleteProfessionalMembership = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const membership = await db.FacultyProfessionalMembership.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!membership) {
      return res
        .status(404)
        .json({ message: "Professional membership not found" });
    }

    await membership.destroy();

    res.json({ message: "Professional membership deleted successfully" });
  } catch (error) {
    console.error("Delete professional membership error:", error);
    res.status(500).json({ message: "Error deleting professional membership" });
  }
};

// ==================== AWARDS ====================

// Get all awards
exports.getAwards = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const awards = await db.FacultyAwards.findAll({
      where: { faculty_id: facultyId },
      order: [["date_received", "DESC"]],
    });

    res.json({ awards });
  } catch (error) {
    console.error("Get awards error:", error);
    res.status(500).json({ message: "Error fetching awards" });
  }
};

// Create award
exports.createAward = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const awardData = req.body;

    // Handle certificate file upload
    if (req.file) {
      awardData.certificate_file = `/uploads/awards/${req.file.filename}`;
    }

    const award = await db.FacultyAwards.create({
      ...awardData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Award created successfully",
      award,
    });
  } catch (error) {
    console.error("Create award error:", error);
    res.status(500).json({ message: "Error creating award" });
  }
};

// Update award
exports.updateAward = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const awardData = req.body;

    const award = await db.FacultyAwards.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!award) {
      return res.status(404).json({ message: "Award not found" });
    }

    // Handle certificate file upload
    if (req.file) {
      awardData.certificate_file = `/uploads/awards/${req.file.filename}`;
    }

    await award.update(awardData);

    res.json({
      message: "Award updated successfully",
      award,
    });
  } catch (error) {
    console.error("Update award error:", error);
    res.status(500).json({ message: "Error updating award" });
  }
};

// Delete award
exports.deleteAward = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const award = await db.FacultyAwards.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!award) {
      return res.status(404).json({ message: "Award not found" });
    }

    await award.destroy();

    res.json({ message: "Award deleted successfully" });
  } catch (error) {
    console.error("Delete award error:", error);
    res.status(500).json({ message: "Error deleting award" });
  }
};

// ==================== SEMINARS/TRAININGS ====================

// Get all seminars/trainings
exports.getSeminarsTrainings = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const seminars = await db.FacultySeminarsTrainings.findAll({
      where: { faculty_id: facultyId },
      order: [["date", "DESC"]],
    });

    res.json({ seminars });
  } catch (error) {
    console.error("Get seminars/trainings error:", error);
    res.status(500).json({ message: "Error fetching seminars/trainings" });
  }
};

// Create seminar/training
exports.createSeminarTraining = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const seminarData = req.body;

    // Handle certificate file upload
    if (req.file) {
      seminarData.certificate_file = `/uploads/seminars/${req.file.filename}`;
    }

    const seminar = await db.FacultySeminarsTrainings.create({
      ...seminarData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Seminar/training created successfully",
      seminar,
    });
  } catch (error) {
    console.error("Create seminar/training error:", error);
    res.status(500).json({ message: "Error creating seminar/training" });
  }
};

// Update seminar/training
exports.updateSeminarTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const seminarData = req.body;

    const seminar = await db.FacultySeminarsTrainings.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!seminar) {
      return res.status(404).json({ message: "Seminar/training not found" });
    }

    // Handle certificate file upload
    if (req.file) {
      seminarData.certificate_file = `/uploads/seminars/${req.file.filename}`;
    }

    await seminar.update(seminarData);

    res.json({
      message: "Seminar/training updated successfully",
      seminar,
    });
  } catch (error) {
    console.error("Update seminar/training error:", error);
    res.status(500).json({ message: "Error updating seminar/training" });
  }
};

// Delete seminar/training
exports.deleteSeminarTraining = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const seminar = await db.FacultySeminarsTrainings.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!seminar) {
      return res.status(404).json({ message: "Seminar/training not found" });
    }

    await seminar.destroy();

    res.json({ message: "Seminar/training deleted successfully" });
  } catch (error) {
    console.error("Delete seminar/training error:", error);
    res.status(500).json({ message: "Error deleting seminar/training" });
  }
};

// ==================== RESEARCH ACTIVITIES ====================

// Get all research activities
exports.getResearchActivities = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const activities = await db.FacultyResearchActivities.findAll({
      where: { faculty_id: facultyId },
      order: [["date", "DESC"]],
    });

    res.json({ activities });
  } catch (error) {
    console.error("Get research activities error:", error);
    res.status(500).json({ message: "Error fetching research activities" });
  }
};

// Create research activity
exports.createResearchActivity = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const activityData = req.body;

    // Handle certificate file upload
    if (req.file) {
      activityData.certificate_file = `/uploads/research/${req.file.filename}`;
    }

    const activity = await db.FacultyResearchActivities.create({
      ...activityData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Research activity created successfully",
      activity,
    });
  } catch (error) {
    console.error("Create research activity error:", error);
    res.status(500).json({ message: "Error creating research activity" });
  }
};

// Update research activity
exports.updateResearchActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const activityData = req.body;

    const activity = await db.FacultyResearchActivities.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!activity) {
      return res.status(404).json({ message: "Research activity not found" });
    }

    // Handle certificate file upload
    if (req.file) {
      activityData.certificate_file = `/uploads/research/${req.file.filename}`;
    }

    await activity.update(activityData);

    res.json({
      message: "Research activity updated successfully",
      activity,
    });
  } catch (error) {
    console.error("Update research activity error:", error);
    res.status(500).json({ message: "Error updating research activity" });
  }
};

// Delete research activity
exports.deleteResearchActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const activity = await db.FacultyResearchActivities.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!activity) {
      return res.status(404).json({ message: "Research activity not found" });
    }

    await activity.destroy();

    res.json({ message: "Research activity deleted successfully" });
  } catch (error) {
    console.error("Delete research activity error:", error);
    res.status(500).json({ message: "Error deleting research activity" });
  }
};

// ==================== EXTENSION ACTIVITIES ====================

// Get all extension activities
exports.getExtensionActivities = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const activities = await db.FacultyExtensionActivities.findAll({
      where: { faculty_id: facultyId },
      order: [["date_of_implementation", "DESC"]],
    });

    res.json({ activities });
  } catch (error) {
    console.error("Get extension activities error:", error);
    res.status(500).json({ message: "Error fetching extension activities" });
  }
};

// Create extension activity
exports.createExtensionActivity = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id;
    const activityData = req.body;

    // Handle documentation file upload
    if (req.file) {
      activityData.documentation_file = `/uploads/extension/${req.file.filename}`;
    }

    const activity = await db.FacultyExtensionActivities.create({
      ...activityData,
      faculty_id: facultyId,
    });

    res.status(201).json({
      message: "Extension activity created successfully",
      activity,
    });
  } catch (error) {
    console.error("Create extension activity error:", error);
    res.status(500).json({ message: "Error creating extension activity" });
  }
};

// Update extension activity
exports.updateExtensionActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;
    const activityData = req.body;

    const activity = await db.FacultyExtensionActivities.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!activity) {
      return res.status(404).json({ message: "Extension activity not found" });
    }

    // Handle documentation file upload
    if (req.file) {
      activityData.documentation_file = `/uploads/extension/${req.file.filename}`;
    }

    await activity.update(activityData);

    res.json({
      message: "Extension activity updated successfully",
      activity,
    });
  } catch (error) {
    console.error("Update extension activity error:", error);
    res.status(500).json({ message: "Error updating extension activity" });
  }
};

// Delete extension activity
exports.deleteExtensionActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.faculty_id;

    const activity = await db.FacultyExtensionActivities.findOne({
      where: { id, faculty_id: facultyId },
    });

    if (!activity) {
      return res.status(404).json({ message: "Extension activity not found" });
    }

    await activity.destroy();

    res.json({ message: "Extension activity deleted successfully" });
  } catch (error) {
    console.error("Delete extension activity error:", error);
    res.status(500).json({ message: "Error deleting extension activity" });
  }
};

// ==================== COMPLETE PROFILE ====================

// Get complete profile (all sections)
exports.getCompleteProfile = async (req, res) => {
  try {
    const facultyId = req.user.faculty_id || req.params.facultyId;

    const faculty = await db.Faculty.findByPk(facultyId, {
      include: [
        {
          model: db.FacultyPersonalProfile,
          as: "personal_profile",
        },
        {
          model: db.FacultyAcademicProfile,
          as: "academic_profiles",
        },
        {
          model: db.FacultyEmploymentProfile,
          as: "employment_profiles",
        },
        {
          model: db.FacultyProfessionalMembership,
          as: "professional_memberships",
        },
        {
          model: db.FacultyAwards,
          as: "awards",
        },
        {
          model: db.FacultySeminarsTrainings,
          as: "seminars_trainings",
        },
        {
          model: db.FacultyResearchActivities,
          as: "research_activities",
        },
        {
          model: db.FacultyExtensionActivities,
          as: "extension_activities",
        },
      ],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json({ profile: faculty });
  } catch (error) {
    console.error("Get complete profile error:", error);
    res.status(500).json({ message: "Error fetching complete profile" });
  }
};

// ==================== DEAN ACCESS ====================

// Get complete profile for a specific faculty (Dean access)
exports.getFacultyCompleteProfileByDean = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const facultyId = req.params.facultyId;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get faculty and verify they're in dean's department
    const faculty = await db.Faculty.findOne({
      where: {
        faculty_id: facultyId,
        department: dean.department,
      },
      include: [
        {
          model: db.FacultyPersonalProfile,
          as: "personal_profile",
        },
        {
          model: db.FacultyAcademicProfile,
          as: "academic_profiles",
        },
        {
          model: db.FacultyEmploymentProfile,
          as: "employment_profiles",
        },
        {
          model: db.FacultyProfessionalMembership,
          as: "professional_memberships",
        },
        {
          model: db.FacultyAwards,
          as: "awards",
        },
        {
          model: db.FacultySeminarsTrainings,
          as: "seminars_trainings",
        },
        {
          model: db.FacultyResearchActivities,
          as: "research_activities",
        },
        {
          model: db.FacultyExtensionActivities,
          as: "extension_activities",
        },
      ],
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Faculty not found or not in your department" });
    }

    res.json({ profile: faculty });
  } catch (error) {
    console.error("Get faculty complete profile by dean error:", error);
    res
      .status(500)
      .json({ message: "Error fetching faculty complete profile" });
  }
};

// Get all faculty profiles in dean's department (summary view)
exports.getAllFacultyProfilesByDean = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const deanInfo = await getDepartmentForUser(deanId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get all faculty in dean's department with profile summaries
    const faculty = await db.Faculty.findAll({
      where: { department: dean.department },
      include: [
        {
          model: db.FacultyPersonalProfile,
          as: "personal_profile",
          attributes: [
            "profile_picture",
            "title",
            "mobile_primary",
            "email_primary",
          ],
        },
      ],
      attributes: [
        "faculty_id",
        "first_name",
        "last_name",
        "email",
        "department",
        "position_level",
      ],
    });

    res.json({ faculty });
  } catch (error) {
    console.error("Get all faculty profiles by dean error:", error);
    res.status(500).json({ message: "Error fetching faculty profiles" });
  }
};
