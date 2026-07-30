const db = require("../models");
const storage = require("../utils/storage");
const { presignFields } = require("../utils/presign");

// ==================== PERSONAL PROFILE ====================

// Get personal profile
exports.getPersonalProfile = async (req, res) => {
  try {
    const facultyId = req.user.dean_id || req.params.facultyId;

    const record = await db.DeanPersonalProfile.findOne({
      where: { dean_id: facultyId },
    });

    const profile = await presignFields(record, ["profile_picture", "passport_photo"]);

    res.json({ profile });
  } catch (error) {
    console.error("Get personal profile error:", error);
    res.status(500).json({ message: "Error fetching personal profile" });
  }
};

// Create or update personal profile
exports.upsertPersonalProfile = async (req, res) => {
  try {
    const facultyId = req.user.dean_id;

    // Add validation
    if (!facultyId) {
      console.error("Dean ID not found in token:", req.user);
      return res.status(400).json({ message: "Dean ID not found in authentication token" });
    }

    const profileData = req.body;

    const existing = await db.DeanPersonalProfile.findOne({
      where: { dean_id: facultyId },
    });

    // Upload new files to storage BEFORE writing any DB row/column, so a
    // storage failure can never leave a row pointing at a nonexistent object.
    const newlyUploaded = [];
    const oldKeys = {};

    try {
      if (req.files?.profile_picture?.[0]) {
        const f = req.files.profile_picture[0];
        profileData.profile_picture = await storage.put(f.buffer, {
          folder: "profile-pictures",
          originalname: f.originalname,
          mimetype: f.mimetype,
        });
        newlyUploaded.push(profileData.profile_picture);
        oldKeys.profile_picture = existing?.profile_picture;
      }
      if (req.files?.passport_photo?.[0]) {
        const f = req.files.passport_photo[0];
        profileData.passport_photo = await storage.put(f.buffer, {
          folder: "profile-pictures",
          originalname: f.originalname,
          mimetype: f.mimetype,
        });
        newlyUploaded.push(profileData.passport_photo);
        oldKeys.passport_photo = existing?.passport_photo;
      }
    } catch (uploadError) {
      await Promise.all(newlyUploaded.map((key) => storage.remove(key).catch(() => {})));
      console.error("Error uploading personal profile files:", uploadError);
      return res.status(500).json({ message: "Error saving personal profile" });
    }

    let profile, created;
    try {
      [profile, created] = await db.DeanPersonalProfile.upsert({
        ...profileData,
        dean_id: facultyId,
      });
    } catch (dbError) {
      await Promise.all(newlyUploaded.map((key) => storage.remove(key).catch(() => {})));
      throw dbError;
    }

    // Row committed with the new keys; now it's safe to delete the old files.
    if (oldKeys.profile_picture) {
      await storage.remove(oldKeys.profile_picture).catch(() => {});
    }
    if (oldKeys.passport_photo) {
      await storage.remove(oldKeys.passport_photo).catch(() => {});
    }

    res.json({
      message: created
        ? "Personal profile created successfully"
        : "Personal profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Upsert personal profile error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ message: "Error saving personal profile" });
  }
};

// ==================== ACADEMIC PROFILE ====================

// Get all academic profiles
exports.getAcademicProfiles = async (req, res) => {
  try {
    const facultyId = req.user.dean_id || req.params.facultyId;

    const profiles = await db.DeanAcademicProfile.findAll({
      where: { dean_id: facultyId },
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
    const facultyId = req.user.dean_id;
    const profileData = req.body;

    const profile = await db.DeanAcademicProfile.create({
      ...profileData,
      dean_id: facultyId,
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
    const facultyId = req.user.dean_id;
    const profileData = req.body;

    const profile = await db.DeanAcademicProfile.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id;

    const profile = await db.DeanAcademicProfile.findOne({
      where: { id, dean_id: facultyId },
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
    const dean = await db.Dean.findOne({
      where: { user_id: req.user.user_id },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const profiles = await db.DeanEmploymentProfile.findAll({
      where: { dean_id: dean.dean_id },
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
    const dean = await db.Dean.findOne({
      where: { user_id: req.user.user_id },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const profileData = req.body;

    const profile = await db.DeanEmploymentProfile.create({
      ...profileData,
      dean_id: dean.dean_id,
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
    const dean = await db.Dean.findOne({
      where: { user_id: req.user.user_id },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const profileData = req.body;

    const profile = await db.DeanEmploymentProfile.findOne({
      where: { id, dean_id: dean.dean_id },
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
    const dean = await db.Dean.findOne({
      where: { user_id: req.user.user_id },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const profile = await db.DeanEmploymentProfile.findOne({
      where: { id, dean_id: dean.dean_id },
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
    const facultyId = req.user.dean_id || req.params.facultyId;

    const memberships = await db.DeanProfessionalMembership.findAll({
      where: { dean_id: facultyId },
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
    const facultyId = req.user.dean_id;
    const membershipData = req.body;

    const membership = await db.DeanProfessionalMembership.create({
      ...membershipData,
      dean_id: facultyId,
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
    const facultyId = req.user.dean_id;
    const membershipData = req.body;

    const membership = await db.DeanProfessionalMembership.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id;

    const membership = await db.DeanProfessionalMembership.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id || req.params.facultyId;
    
    console.log("=== GET AWARDS ===");
    console.log("Dean ID:", facultyId);

    const rows = await db.DeanAwards.findAll({
      where: { dean_id: facultyId },
      order: [["date_received", "DESC"]],
    });

    console.log("Found awards:", rows.length);
    console.log("Awards:", rows.map(a => ({ id: a.id, title: a.award_title })));
    console.log("==================\n");

    const awards = await presignFields(rows, ["certificate_file"]);

    res.json({ awards });
  } catch (error) {
    console.error("Get awards error:", error);
    res.status(500).json({ message: "Error fetching awards" });
  }
};

// Create award
exports.createAward = async (req, res) => {
  try {
    const facultyId = req.user.dean_id;
    
    console.log("=== CREATE AWARD DEBUG ===");
    console.log("1. User object:", JSON.stringify(req.user, null, 2));
    console.log("2. Dean ID from token:", facultyId);
    console.log("3. Request body:", JSON.stringify(req.body, null, 2));
    console.log("4. Request file:", req.file);
    
    // Add validation
    if (!facultyId) {
      console.error("❌ Dean ID not found in token");
      return res.status(400).json({ message: "Dean ID not found in authentication token" });
    }
    
    const awardData = { ...req.body };
    
    console.log("5. Award data before file:", JSON.stringify(awardData, null, 2));

    // Handle certificate file upload
    let newKey;
    if (req.file) {
      newKey = await storage.put(req.file.buffer, {
        folder: "awards",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      awardData.certificate_file = newKey;
      console.log("6. File path set:", awardData.certificate_file);
    }

    // Add dean_id
    awardData.dean_id = facultyId;

    console.log("7. Final award data:", JSON.stringify(awardData, null, 2));
    console.log("8. Attempting to create award in database...");

    let award;
    try {
      award = await db.DeanAwards.create(awardData);
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

    console.log("9. ✓ Award created successfully:", award.id);
    console.log("========================\n");

    res.status(201).json({
      message: "Award created successfully",
      award,
    });
  } catch (error) {
    console.error("❌ CREATE AWARD ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.errors) {
      console.error("Validation errors:");
      error.errors.forEach(e => {
        console.error(`  - Field: ${e.path}, Message: ${e.message}, Value: ${e.value}, Type: ${e.type}`);
      });
    }
    if (error.original) {
      console.error("Original error:", error.original.message);
      console.error("SQL:", error.original.sql);
    }
    console.error("========================\n");
    res.status(500).json({ 
      message: "Error creating award", 
      error: error.message,
      details: error.errors ? error.errors.map(e => `${e.path}: ${e.message}`) : []
    });
  }
};

// Update award
exports.updateAward = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.dean_id;
    const awardData = req.body;

    const award = await db.DeanAwards.findOne({
      where: { id, dean_id: facultyId },
    });

    if (!award) {
      return res.status(404).json({ message: "Award not found" });
    }

    // Handle certificate file upload: upload new -> update row -> delete old
    let oldCertificateFile;
    let newKey;
    if (req.file) {
      oldCertificateFile = award.certificate_file;
      newKey = await storage.put(req.file.buffer, {
        folder: "awards",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      awardData.certificate_file = newKey;
    }

    try {
      await award.update(awardData);
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

    if (req.file && oldCertificateFile) {
      await storage.remove(oldCertificateFile).catch(() => {});
    }

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
    const facultyId = req.user.dean_id;

    const award = await db.DeanAwards.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id || req.params.facultyId;

    const rows = await db.DeanSeminarsTrainings.findAll({
      where: { dean_id: facultyId },
      order: [["date", "DESC"]],
    });

    const seminars = await presignFields(rows, ["certificate_file"]);

    res.json({ seminars });
  } catch (error) {
    console.error("Get seminars/trainings error:", error);
    res.status(500).json({ message: "Error fetching seminars/trainings" });
  }
};

// Create seminar/training
exports.createSeminarTraining = async (req, res) => {
  try {
    const facultyId = req.user.dean_id;
    const seminarData = req.body;

    // Handle certificate file upload
    let newKey;
    if (req.file) {
      newKey = await storage.put(req.file.buffer, {
        folder: "seminars",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      seminarData.certificate_file = newKey;
    }

    let seminar;
    try {
      seminar = await db.DeanSeminarsTrainings.create({
        ...seminarData,
        dean_id: facultyId,
      });
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

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
    const facultyId = req.user.dean_id;
    const seminarData = req.body;

    const seminar = await db.DeanSeminarsTrainings.findOne({
      where: { id, dean_id: facultyId },
    });

    if (!seminar) {
      return res.status(404).json({ message: "Seminar/training not found" });
    }

    // Handle certificate file upload: upload new -> update row -> delete old
    let oldCertificateFile;
    let newKey;
    if (req.file) {
      oldCertificateFile = seminar.certificate_file;
      newKey = await storage.put(req.file.buffer, {
        folder: "seminars",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      seminarData.certificate_file = newKey;
    }

    try {
      await seminar.update(seminarData);
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

    if (req.file && oldCertificateFile) {
      await storage.remove(oldCertificateFile).catch(() => {});
    }

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
    const facultyId = req.user.dean_id;

    const seminar = await db.DeanSeminarsTrainings.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id || req.params.facultyId;

    const rows = await db.DeanResearchActivities.findAll({
      where: { dean_id: facultyId },
      order: [["date", "DESC"]],
    });

    const activities = await presignFields(rows, ["certificate_file"]);

    res.json({ activities });
  } catch (error) {
    console.error("Get research activities error:", error);
    res.status(500).json({ message: "Error fetching research activities" });
  }
};

// Create research activity
exports.createResearchActivity = async (req, res) => {
  try {
    const facultyId = req.user.dean_id;
    
    console.log("=== CREATE RESEARCH ACTIVITY DEBUG ===");
    console.log("1. User object:", JSON.stringify(req.user, null, 2));
    console.log("2. Dean ID from token:", facultyId);
    console.log("3. Request body:", JSON.stringify(req.body, null, 2));
    console.log("4. Request file:", req.file);
    
    // Add validation
    if (!facultyId) {
      console.error("❌ Dean ID not found in token");
      return res.status(400).json({ message: "Dean ID not found in authentication token" });
    }
    
    const activityData = { ...req.body };
    
    console.log("5. Activity data before file:", JSON.stringify(activityData, null, 2));

    // Handle certificate file upload
    let newKey;
    if (req.file) {
      newKey = await storage.put(req.file.buffer, {
        folder: "research",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      activityData.certificate_file = newKey;
      console.log("6. File path set:", activityData.certificate_file);
    }

    // Add dean_id
    activityData.dean_id = facultyId;

    console.log("7. Final activity data:", JSON.stringify(activityData, null, 2));
    console.log("8. Attempting to create research activity in database...");

    let activity;
    try {
      activity = await db.DeanResearchActivities.create(activityData);
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

    console.log("9. ✓ Research activity created successfully:", activity.id);
    console.log("========================\n");

    res.status(201).json({
      message: "Research activity created successfully",
      activity,
    });
  } catch (error) {
    console.error("❌ CREATE RESEARCH ACTIVITY ERROR:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.errors) {
      console.error("Validation errors:");
      error.errors.forEach(e => {
        console.error(`  - Field: ${e.path}, Message: ${e.message}, Value: ${e.value}, Type: ${e.type}`);
      });
    }
    if (error.original) {
      console.error("Original error:", error.original.message);
      console.error("SQL:", error.original.sql);
    }
    console.error("========================\n");
    res.status(500).json({ 
      message: "Error creating research activity", 
      error: error.message,
      details: error.errors ? error.errors.map(e => `${e.path}: ${e.message}`) : []
    });
  }
};

// Update research activity
exports.updateResearchActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.dean_id;
    const activityData = req.body;

    const activity = await db.DeanResearchActivities.findOne({
      where: { id, dean_id: facultyId },
    });

    if (!activity) {
      return res.status(404).json({ message: "Research activity not found" });
    }

    // Handle certificate file upload: upload new -> update row -> delete old
    let oldCertificateFile;
    let newKey;
    if (req.file) {
      oldCertificateFile = activity.certificate_file;
      newKey = await storage.put(req.file.buffer, {
        folder: "research",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      activityData.certificate_file = newKey;
    }

    try {
      await activity.update(activityData);
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

    if (req.file && oldCertificateFile) {
      await storage.remove(oldCertificateFile).catch(() => {});
    }

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
    const facultyId = req.user.dean_id;

    const activity = await db.DeanResearchActivities.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id || req.params.facultyId;

    const rows = await db.DeanExtensionActivities.findAll({
      where: { dean_id: facultyId },
      order: [["date_of_implementation", "DESC"]],
    });

    const activities = await presignFields(rows, ["documentation_file"]);

    res.json({ activities });
  } catch (error) {
    console.error("Get extension activities error:", error);
    res.status(500).json({ message: "Error fetching extension activities" });
  }
};

// Create extension activity
exports.createExtensionActivity = async (req, res) => {
  try {
    const facultyId = req.user.dean_id;
    const activityData = req.body;

    // Handle documentation file upload
    let newKey;
    if (req.file) {
      newKey = await storage.put(req.file.buffer, {
        folder: "extension",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      activityData.documentation_file = newKey;
    }

    let activity;
    try {
      activity = await db.DeanExtensionActivities.create({
        ...activityData,
        dean_id: facultyId,
      });
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

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
    const facultyId = req.user.dean_id;
    const activityData = req.body;

    const activity = await db.DeanExtensionActivities.findOne({
      where: { id, dean_id: facultyId },
    });

    if (!activity) {
      return res.status(404).json({ message: "Extension activity not found" });
    }

    // Handle documentation file upload: upload new -> update row -> delete old
    let oldDocumentationFile;
    let newKey;
    if (req.file) {
      oldDocumentationFile = activity.documentation_file;
      newKey = await storage.put(req.file.buffer, {
        folder: "extension",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      activityData.documentation_file = newKey;
    }

    try {
      await activity.update(activityData);
    } catch (dbError) {
      if (newKey) await storage.remove(newKey).catch(() => {});
      throw dbError;
    }

    if (req.file && oldDocumentationFile) {
      await storage.remove(oldDocumentationFile).catch(() => {});
    }

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
    const facultyId = req.user.dean_id;

    const activity = await db.DeanExtensionActivities.findOne({
      where: { id, dean_id: facultyId },
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
    const facultyId = req.user.dean_id || req.params.facultyId;

    const faculty = await db.Dean.findByPk(facultyId, {
      include: [
        {
          model: db.DeanPersonalProfile,
          as: "personal_profile",
        },
        {
          model: db.DeanAcademicProfile,
          as: "academic_profiles",
        },
        {
          model: db.DeanEmploymentProfile,
          as: "employment_profiles",
        },
        {
          model: db.DeanProfessionalMembership,
          as: "professional_memberships",
        },
        {
          model: db.DeanAwards,
          as: "awards",
        },
        {
          model: db.DeanSeminarsTrainings,
          as: "seminars_trainings",
        },
        {
          model: db.DeanResearchActivities,
          as: "research_activities",
        },
        {
          model: db.DeanExtensionActivities,
          as: "extension_activities",
        },
      ],
    });

    if (!faculty) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const profile = faculty.toJSON();
    profile.personal_profile = await presignFields(profile.personal_profile, [
      "profile_picture",
      "passport_photo",
    ]);
    profile.awards = await presignFields(profile.awards, ["certificate_file"]);
    profile.seminars_trainings = await presignFields(profile.seminars_trainings, [
      "certificate_file",
    ]);
    profile.research_activities = await presignFields(profile.research_activities, [
      "certificate_file",
    ]);
    profile.extension_activities = await presignFields(profile.extension_activities, [
      "documentation_file",
    ]);

    res.json({ profile });
  } catch (error) {
    console.error("Get complete profile error:", error);
    res.status(500).json({ message: "Error fetching complete profile" });
  }
};

// ==================== DEAN ACCESS ====================

// Get complete profile for a specific faculty (Dean access)
exports.getDeanCompleteProfileByDean = async (req, res) => {
  try {
    const deanId = req.user.user_id;
    const facultyId = req.params.facultyId;

    // Get dean's department
    const dean = await db.Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Get faculty and verify they're in dean's department
    const faculty = await db.Dean.findOne({
      where: {
        dean_id: facultyId,
        department: dean.department,
      },
      include: [
        {
          model: db.DeanPersonalProfile,
          as: "personal_profile",
        },
        {
          model: db.DeanAcademicProfile,
          as: "academic_profiles",
        },
        {
          model: db.DeanEmploymentProfile,
          as: "employment_profiles",
        },
        {
          model: db.DeanProfessionalMembership,
          as: "professional_memberships",
        },
        {
          model: db.DeanAwards,
          as: "awards",
        },
        {
          model: db.DeanSeminarsTrainings,
          as: "seminars_trainings",
        },
        {
          model: db.DeanResearchActivities,
          as: "research_activities",
        },
        {
          model: db.DeanExtensionActivities,
          as: "extension_activities",
        },
      ],
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Dean not found or not in your department" });
    }

    const profile = faculty.toJSON();
    profile.personal_profile = await presignFields(profile.personal_profile, [
      "profile_picture",
      "passport_photo",
    ]);
    profile.awards = await presignFields(profile.awards, ["certificate_file"]);
    profile.seminars_trainings = await presignFields(profile.seminars_trainings, [
      "certificate_file",
    ]);
    profile.research_activities = await presignFields(profile.research_activities, [
      "certificate_file",
    ]);
    profile.extension_activities = await presignFields(profile.extension_activities, [
      "documentation_file",
    ]);

    res.json({ profile });
  } catch (error) {
    console.error("Get faculty complete profile by dean error:", error);
    res
      .status(500)
      .json({ message: "Error fetching faculty complete profile" });
  }
};

// Get all faculty profiles in dean's department (summary view)
exports.getAllDeanProfilesByDean = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const dean = await db.Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Get all faculty in dean's department with profile summaries
    const faculty = await db.Dean.findAll({
      where: { department: dean.department },
      include: [
        {
          model: db.DeanPersonalProfile,
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
        "dean_id",
        "first_name",
        "last_name",
        "email",
        "department",
        "position_level",
      ],
    });

    const facultyList = await Promise.all(
      faculty.map(async (f) => {
        const plain = f.toJSON();
        plain.personal_profile = await presignFields(plain.personal_profile, [
          "profile_picture",
        ]);
        return plain;
      }),
    );

    res.json({ faculty: facultyList });
  } catch (error) {
    console.error("Get all faculty profiles by dean error:", error);
    res.status(500).json({ message: "Error fetching faculty profiles" });
  }
};
