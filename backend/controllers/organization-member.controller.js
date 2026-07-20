const db = require("../models");
const { Op } = require("sequelize");

// Get all members for the organization
exports.getMembers = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const academicYearId = req.query.academic_year_id;
    const position = req.query.position;
    const isActive =
      req.query.is_active !== undefined ? req.query.is_active === "true" : null;

    const whereClause = {
      organization_id: organization.organization_id,
    };

    if (search) {
      whereClause[Op.or] = [
        { sr_code: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
      ];
    }

    if (academicYearId) {
      whereClause.academic_year_id = academicYearId;
    }

    if (position) {
      whereClause.position = position;
    }

    if (isActive !== null) {
      whereClause.is_active = isActive;
    }

    const { count, rows } = await db.OrganizationMember.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [
        ["is_active", "DESC"],
        ["term_start_date", "DESC"],
        ["position", "ASC"],
      ],
      include: [
        {
          model: db.OrganizationMember,
          as: "supervisor",
          required: false,
          attributes: ["member_id", "first_name", "last_name", "position"],
        },
        {
          model: db.AcademicYear,
          required: false,
          attributes: ["academic_year_id", "year_start", "year_end"],
        },
      ],
    });

    res.json({
      members: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ message: "Error fetching members" });
  }
};

// Search for existing member by SR Code or name (for auto-populate)
exports.searchMemberHistory = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { sr_code, name } = req.query;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    if (!sr_code && !name) {
      return res.status(400).json({ message: "SR Code or name is required" });
    }

    const whereClause = {
      organization_id: organization.organization_id,
    };

    if (sr_code) {
      whereClause.sr_code = sr_code;
    } else if (name) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${name}%` } },
        { last_name: { [Op.like]: `%${name}%` } },
      ];
    }

    // Get the most recent record for this member
    const member = await db.OrganizationMember.findOne({
      where: whereClause,
      order: [["created_at", "DESC"]],
      attributes: [
        "sr_code",
        "first_name",
        "middle_name",
        "last_name",
        "email",
        "contact_number",
      ],
    });

    if (!member) {
      return res.status(404).json({ message: "No previous record found" });
    }

    res.json({ member });
  } catch (error) {
    console.error("Search member history error:", error);
    res.status(500).json({ message: "Error searching member history" });
  }
};

// Create a new member
exports.createMember = async (req, res) => {
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

    const {
      sr_code,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      year_level,
      position,
      parent_member_id,
      academic_year_id,
      semester,
      term_start_date,
      term_end_date,
      course,
      gwa,
      campus,
      telephone_number,
      birth_date,
      age,
      civil_status,
      home_address,
    } = req.body;
    
    console.log("Create member request body:", req.body);
    console.log("Files:", req.files);

    // Validate required fields for officers
    if (!position || position.trim() === '') {
      return res.status(400).json({ 
        message: "Position is required" 
      });
    }

    if (!first_name || first_name.trim() === '') {
      return res.status(400).json({ 
        message: "First name is required" 
      });
    }

    if (!last_name || last_name.trim() === '') {
      return res.status(400).json({ 
        message: "Last name is required" 
      });
    }

    // Normalize position to Title Case (e.g., "President", "Vice President")
    const normalizedPosition = position.trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    console.log("Original position:", position);
    console.log("Normalized position:", normalizedPosition);

    // All fields are now optional except those validated above
    // Convert empty strings to null for foreign key fields
    const cleanedAcademicYearId = academic_year_id && academic_year_id !== '' ? academic_year_id : null;
    const cleanedParentMemberId = parent_member_id && parent_member_id !== '' ? parent_member_id : null;
    const cleanedTermStartDate = term_start_date && term_start_date !== '' ? term_start_date : null;
    const cleanedTermEndDate = term_end_date && term_end_date !== '' && term_end_date !== 'Invalid date' ? term_end_date : null;
    const cleanedBirthDate = birth_date && birth_date !== '' ? birth_date : null;
    const cleanedSemester = semester && semester !== '' ? semester : null;

    // Check if member already exists for this exact term and position (only if we have required data)
    if (sr_code && cleanedAcademicYearId && normalizedPosition) {
      const existingMember = await db.OrganizationMember.findOne({
        where: {
          organization_id: organization.organization_id,
          sr_code,
          academic_year_id: cleanedAcademicYearId,
          position: normalizedPosition,
          is_active: true,
        },
      });

      if (existingMember) {
        return res.status(400).json({
          message:
            "This student already has this position for this academic year",
        });
      }
    }

    // Handle photo upload
    let photo_url = null;
    if (req.files && req.files.photo) {
      photo_url = `/uploads/member-photos/${req.files.photo[0].filename}`;
    }
    
    // Handle signature upload
    let signature_url = null;
    if (req.files && req.files.signature) {
      signature_url = `/uploads/member-signatures/${req.files.signature[0].filename}`;
    }

    // Create member
    const member = await db.OrganizationMember.create({
      organization_id: organization.organization_id,
      sr_code: sr_code || null,
      first_name: first_name || null,
      middle_name: middle_name || null,
      last_name: last_name || null,
      email: email || null,
      contact_number: contact_number || null,
      year_level: year_level || null,
      position: normalizedPosition, // Use normalized position
      parent_member_id: cleanedParentMemberId,
      academic_year_id: cleanedAcademicYearId,
      semester: cleanedSemester,
      term_start_date: cleanedTermStartDate,
      term_end_date: cleanedTermEndDate,
      photo_url,
      signature_url,
      course: course || null,
      gwa: gwa || null,
      campus: campus || null,
      telephone_number: telephone_number || null,
      birth_date: cleanedBirthDate,
      age: age || null,
      civil_status: civil_status || null,
      home_address: home_address || null,
      is_active: true,
    });

    console.log("✅ Member created successfully!");
    console.log("Member ID:", member.member_id);
    console.log("Position:", member.position);
    console.log("Academic Year ID:", member.academic_year_id);
    console.log("Is Active:", member.is_active);

    res.status(201).json({
      message: "Officer added successfully",
      member,
    });
  } catch (error) {
    console.error("Create member error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      errors: error.errors
    });
    res.status(500).json({ 
      message: "Error creating officer",
      details: error.message 
    });
  }
};

// Update member
exports.updateMember = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    console.log("=== Update officer request ===");
    console.log("Member ID:", id);
    console.log("User ID:", userId);
    console.log("📥 Received data:", req.body);

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const member = await db.OrganizationMember.findOne({
      where: {
        member_id: id,
        organization_id: organization.organization_id,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Officer not found" });
    }

    console.log("📋 Current member data:");
    console.log("  Position:", member.position);
    console.log("  Name:", member.first_name, member.last_name);

    const {
      sr_code,
      first_name,
      middle_name,
      last_name,
      email,
      contact_number,
      year_level,
      position,
      parent_member_id,
      term_end_date,
      is_active,
      course,
      gwa,
      campus,
      telephone_number,
      birth_date,
      age,
      civil_status,
      home_address,
    } = req.body;

    // Handle photo upload
    let photo_url = member.photo_url; // Keep existing photo by default
    if (req.files && req.files.photo) {
      photo_url = `/uploads/member-photos/${req.files.photo[0].filename}`;
      console.log("📷 New photo uploaded:", photo_url);
      
      // Delete old photo if it exists
      if (member.photo_url) {
        const fs = require("fs");
        const path = require("path");
        const oldPhotoPath = path.join(__dirname, "..", member.photo_url);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
          console.log("🗑️ Deleted old photo");
        }
      }
    }
    
    // Handle signature upload
    let signature_url = member.signature_url; // Keep existing signature by default
    if (req.files && req.files.signature) {
      signature_url = `/uploads/member-signatures/${req.files.signature[0].filename}`;
      console.log("✍️ New signature uploaded:", signature_url);
      
      // Delete old signature if it exists
      if (member.signature_url) {
        const fs = require("fs");
        const path = require("path");
        const oldSignaturePath = path.join(__dirname, "..", member.signature_url);
        if (fs.existsSync(oldSignaturePath)) {
          fs.unlinkSync(oldSignaturePath);
          console.log("🗑️ Deleted old signature");
        }
      }
    }
    
    const cleanedBirthDate = birth_date && birth_date !== '' ? birth_date : null;

    const updateData = {
      sr_code: sr_code && sr_code !== '' ? sr_code : null,
      first_name: first_name || null,
      middle_name: middle_name || null,
      last_name: last_name || null,
      email: email || null,
      contact_number: contact_number || null,
      year_level: year_level && year_level !== '' ? year_level : null,
      position: position || null,
      parent_member_id: parent_member_id && parent_member_id !== '' ? parent_member_id : null,
      term_end_date: term_end_date && term_end_date !== '' && term_end_date !== 'Invalid date' ? term_end_date : null,
      is_active: is_active === 'true' || is_active === true ? true : false,
      photo_url,
      signature_url,
      course: course && course !== '' ? course : null,
      gwa: gwa && gwa !== '' ? gwa : null,
      campus: campus && campus !== '' ? campus : null,
      telephone_number: telephone_number && telephone_number !== '' ? telephone_number : null,
      birth_date: cleanedBirthDate,
      age: age && age !== '' ? age : null,
      civil_status: civil_status && civil_status !== '' ? civil_status : null,
      home_address: home_address && home_address !== '' ? home_address : null,
    };

    console.log("💾 Updating member with:", updateData);
    console.log("📊 Member ID being updated:", id);
    console.log("📊 Organization ID:", organization.organization_id);

    // Log what Sequelize thinks has changed BEFORE the update
    member.set(updateData);
    const changedFields = member.changed();
    console.log("🔍 Sequelize detected changed fields:", changedFields);
    
    if (!changedFields || changedFields.length === 0) {
      console.log("⚠️ WARNING: Sequelize detected NO changes! The update will be a no-op.");
      console.log("⚠️ This means the new values are identical to the current DB values.");
      console.log("⚠️ Current DB values for key fields:");
      console.log("   campus:", member.previous('campus'));
      console.log("   course:", member.previous('course'));
      console.log("   telephone_number:", member.previous('telephone_number'));
      console.log("   first_name:", member.previous('first_name'));
    }

    // Perform the save (which generates the actual SQL)
    await member.save();
    
    console.log("✅ Officer updated successfully!");
    console.log("  New position:", member.position);
    console.log("  New name:", member.first_name, member.last_name);
    console.log("  New campus:", member.campus);
    console.log("  New course:", member.course);

    // CRITICAL: Verify by re-reading from DB
    const verification = await db.OrganizationMember.findByPk(id);
    console.log("🔍 VERIFICATION - Re-read from DB:");
    console.log("  campus in DB:", verification.campus);
    console.log("  course in DB:", verification.course);
    console.log("  telephone_number in DB:", verification.telephone_number);
    console.log("  first_name in DB:", verification.first_name);
    
    if (verification.campus !== updateData.campus) {
      console.log("❌ MISMATCH DETECTED! DB value doesn't match what we tried to save!");
      console.log("   Tried to save campus:", updateData.campus);
      console.log("   DB has campus:", verification.campus);
    }

    res.json({
      message: "Officer updated successfully",
      member: verification, // Return the fresh DB read to ensure accuracy
    });
  } catch (error) {
    console.error("❌ Update member error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ message: "Error updating officer" });
  }
};

// Delete member
exports.deleteMember = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const member = await db.OrganizationMember.findOne({
      where: {
        member_id: id,
        organization_id: organization.organization_id,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Officer not found" });
    }

    await member.destroy();

    res.json({ message: "Officer deleted successfully" });
  } catch (error) {
    console.error("Delete member error:", error);
    res.status(500).json({ message: "Error deleting officer" });
  }
};

// Get position templates
exports.getPositionTemplates = async (req, res) => {
  try {
    const positions = await db.OrganizationPositionTemplate.findAll({
      order: [
        ["hierarchy_level", "ASC"],
        ["position_name", "ASC"],
      ],
    });

    res.json({ positions });
  } catch (error) {
    console.error("Get position templates error:", error);
    res.status(500).json({ message: "Error fetching position templates" });
  }
};

// Get organization hierarchy (tree structure)
exports.getHierarchy = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const academicYearId = req.query.academic_year_id;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const whereClause = {
      organization_id: organization.organization_id,
      is_active: true,
    };

    if (academicYearId) {
      whereClause.academic_year_id = academicYearId;
    }

    // Get all active members
    const members = await db.OrganizationMember.findAll({
      where: whereClause,
      include: [
        {
          model: db.OrganizationMember,
          as: "subordinates",
          where: { is_active: true },
          required: false,
        },
      ],
      order: [
        ["position", "ASC"],
        [
          { model: db.OrganizationMember, as: "subordinates" },
          "position",
          "ASC",
        ],
      ],
    });

    // Build hierarchy tree
    const memberMap = new Map();
    const rootMembers = [];

    // First pass: create map of all members
    members.forEach((member) => {
      memberMap.set(member.member_id, {
        ...member.toJSON(),
        children: [],
      });
    });

    // Second pass: build tree structure
    members.forEach((member) => {
      const memberData = memberMap.get(member.member_id);
      if (member.parent_member_id) {
        const parent = memberMap.get(member.parent_member_id);
        if (parent) {
          parent.children.push(memberData);
        }
      } else {
        rootMembers.push(memberData);
      }
    });

    res.json({ hierarchy: rootMembers });
  } catch (error) {
    console.error("Get hierarchy error:", error);
    res.status(500).json({ message: "Error fetching hierarchy" });
  }
};

// Download template for bulk upload
exports.downloadTemplate = async (req, res) => {
  try {
    const path = require("path");
    const filePath = path.join(
      __dirname,
      "../public/templates/organization-members-template.csv",
    );
    res.download(filePath, "organization-members-template.csv");
  } catch (error) {
    console.error("Download template error:", error);
    res.status(500).json({ message: "Error downloading template" });
  }
};

// Bulk upload members from CSV/Excel
// Behavior: persist the uploaded file, create ONE upload record, and parse rows
// in the background only for analytics (members are linked to the upload record).
exports.bulkUploadMembers = async (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const XLSX = require("xlsx");

  try {
    const userId = req.user.user_id;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { academic_year_id, section, year_level, department, semester } = req.body;

    if (!academic_year_id || !section || !year_level || !department || !semester) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message:
          "Academic year, section, year level, department, and semester are required",
      });
    }

    // Get academic year to use its start date
    const academicYear = await db.AcademicYear.findByPk(academic_year_id);
    if (!academicYear) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Academic year not found" });
    }

    // Use academic year start as term_start_date
    const term_start_date = `${academicYear.year_start}-08-01`;

    // Parse the uploaded file (supports .csv, .xls, .xlsx) into rows
    let rows = [];
    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } catch (parseError) {
      console.error("File parsing error:", parseError);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ message: "Error parsing uploaded file" });
    }

    // Create the single upload record FIRST (file management module)
    const uploadRecord = await db.OrganizationBulkUpload.create({
      organization_id: organization.organization_id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      department: department,
      section: section,
      year_level: year_level,
      semester: semester,
      academic_year_id: academic_year_id,
      term_start_date: term_start_date,
      total_records: rows.length,
      inserted_count: 0,
      updated_count: 0,
      skipped_count: 0,
      uploaded_by: userId,
      upload_status: "completed",
    });

    // Parse rows in the background ONLY for analytics/demographics.
    // Each parsed member is linked to this upload via upload_id.
    const stats = { total: rows.length, inserted: 0, skipped: 0, errors: [] };

    // Helper to read a field case-insensitively
    const getField = (row, ...keys) => {
      for (const key of keys) {
        const found = Object.keys(row).find(
          (k) => k.trim().toLowerCase() === key.toLowerCase(),
        );
        if (found && row[found] !== undefined && row[found] !== "") {
          return String(row[found]).trim();
        }
      }
      return null;
    };

    for (const row of rows) {
      try {
        const srCode = getField(row, "sr_code", "sr code", "srcode");
        const studentName = getField(
          row,
          "student_name",
          "student name",
          "name",
          "full_name",
        );

        if (!srCode && !studentName) {
          stats.skipped++;
          continue;
        }

        // Parse student name (format: "First Middle Last" or "First Last")
        let first_name = null,
          middle_name = null,
          last_name = null;
        if (studentName) {
          const nameParts = studentName.split(" ").filter(Boolean);
          if (nameParts.length === 1) {
            first_name = nameParts[0];
            last_name = nameParts[0];
          } else if (nameParts.length === 2) {
            first_name = nameParts[0];
            last_name = nameParts[1];
          } else {
            first_name = nameParts[0];
            middle_name = nameParts.slice(1, -1).join(" ");
            last_name = nameParts[nameParts.length - 1];
          }
        }

        const genderRaw = getField(row, "gender", "sex");
        let gender = null;
        if (genderRaw) {
          const g = genderRaw.toLowerCase();
          if (g.startsWith("m")) gender = "Male";
          else if (g.startsWith("f")) gender = "Female";
        }

        await db.OrganizationMember.create({
          organization_id: organization.organization_id,
          sr_code: srCode,
          first_name: first_name,
          middle_name: middle_name,
          last_name: last_name,
          email: getField(row, "email"),
          contact_number: null,
          gender: gender,
          program: getField(row, "program", "course"),
          section: section,
          department: department,
          year_level: year_level,
          position: getField(row, "position") || "Member",
          parent_member_id: null,
          academic_year_id: academic_year_id,
          term_start_date: term_start_date,
          is_active: true,
          upload_id: uploadRecord.upload_id,
        });
        stats.inserted++;
      } catch (rowError) {
        console.error("Row processing error:", rowError);
        stats.errors.push({ error: rowError.message });
        stats.skipped++;
      }
    }

    // Update the upload record with parse stats
    await uploadRecord.update({
      inserted_count: stats.inserted,
      skipped_count: stats.skipped,
    });

    return res.status(201).json({
      message: "File uploaded successfully",
      upload: uploadRecord,
      results: stats,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    }
    res.status(500).json({ message: "Error uploading members" });
  }
};

// Get demographics data
exports.getDemographics = async (req, res) => {
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

    // Get all members (removed is_active filter)
    const members = await db.OrganizationMember.findAll({
      where: {
        organization_id: organization.organization_id,
      },
    });

    const totalMembers = members.length;

    // Calculate gender distribution
    const maleCount = members.filter((m) => m.gender === "Male").length;
    const femaleCount = members.filter((m) => m.gender === "Female").length;
    const malePercentage =
      totalMembers > 0 ? Math.round((maleCount / totalMembers) * 100) : 0;
    const femalePercentage =
      totalMembers > 0 ? Math.round((femaleCount / totalMembers) * 100) : 0;

    // Calculate program distribution
    const programCounts = {};
    members.forEach((m) => {
      if (m.program) {
        programCounts[m.program] = (programCounts[m.program] || 0) + 1;
      }
    });

    const byProgram = Object.entries(programCounts)
      .map(([program, count]) => ({
        program,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    res.json({
      maleCount,
      femaleCount,
      malePercentage,
      femalePercentage,
      byProgram,
      totalMembers,
    });
  } catch (error) {
    console.error("Get demographics error:", error);
    res.status(500).json({ message: "Error fetching demographics" });
  }
};

// Get bulk upload history
exports.getBulkUploadHistory = async (req, res) => {
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.OrganizationBulkUpload.findAndCountAll({
      where: {
        organization_id: organization.organization_id,
      },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      uploads: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get bulk upload history error:", error);
    res.status(500).json({ message: "Error fetching bulk upload history" });
  }
};

// Update bulk upload record metadata (and optionally replace the file).
// Only updates the record itself; existing members previously inserted from
// this upload are left untouched (same behaviour as CVL attachment update).
exports.updateBulkUpload = async (req, res) => {
  const fs = require("fs");
  try {
    const userId = req.user.user_id;
    const { upload_id } = req.params;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const upload = await db.OrganizationBulkUpload.findOne({
      where: {
        upload_id: upload_id,
        organization_id: organization.organization_id,
      },
    });

    if (!upload) {
      return res.status(404).json({ message: "File record not found" });
    }

    const {
      department,
      section,
      year_level,
      semester,
      academic_year_id,
    } = req.body;

    // Metadata updates
    if (department !== undefined) upload.department = department;
    if (section !== undefined) upload.section = section;
    if (year_level !== undefined) upload.year_level = year_level;
    if (semester !== undefined) upload.semester = semester;
    if (academic_year_id !== undefined && academic_year_id !== "") {
      upload.academic_year_id = parseInt(academic_year_id, 10);
    }

    // Optional file replacement
    if (req.file) {
      // Remove old file from disk if present
      if (upload.file_path && fs.existsSync(upload.file_path)) {
        try {
          fs.unlinkSync(upload.file_path);
        } catch (e) {
          console.error("Error deleting old upload file:", e);
        }
      }
      upload.file_name = req.file.originalname;
      upload.file_path = req.file.path;
    }

    await upload.save();

    res.json({
      message: "File record updated successfully",
      upload,
    });
  } catch (error) {
    console.error("Update bulk upload error:", error);
    res
      .status(500)
      .json({ message: "Error updating file record", error: error.message });
  }
};

// Delete bulk upload record
exports.deleteBulkUpload = async (req, res) => {
  const fs = require("fs");
  try {
    const userId = req.user.user_id;
    const { upload_id } = req.params;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const upload = await db.OrganizationBulkUpload.findOne({
      where: {
        upload_id: upload_id,
        organization_id: organization.organization_id,
      },
    });

    if (!upload) {
      return res.status(404).json({ message: "File record not found" });
    }

    // Remove analytics data generated from this upload
    await db.OrganizationMember.destroy({
      where: {
        organization_id: organization.organization_id,
        upload_id: upload.upload_id,
      },
    });

    // Delete the stored Excel/CSV file
    if (upload.file_path && fs.existsSync(upload.file_path)) {
      try {
        fs.unlinkSync(upload.file_path);
      } catch (e) {
        console.error("Error deleting file:", e);
      }
    }

    await upload.destroy();

    res.json({ message: "File record deleted successfully" });
  } catch (error) {
    console.error("Delete bulk upload error:", error);
    res.status(500).json({ message: "Error deleting file record" });
  }
};

// Download the original uploaded file
exports.downloadBulkUpload = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { upload_id } = req.params;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const upload = await db.OrganizationBulkUpload.findOne({
      where: {
        upload_id: upload_id,
        organization_id: organization.organization_id,
      },
    });

    if (!upload || !upload.file_path) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.download(upload.file_path, upload.file_name);
  } catch (error) {
    console.error("Download bulk upload error:", error);
    res.status(500).json({ message: "Error downloading file" });
  }
};

// Preview the uploaded file contents (parsed rows as JSON for in-app viewing)
exports.previewBulkUpload = async (req, res) => {
  const XLSX = require("xlsx");
  const fs = require("fs");
  try {
    const userId = req.user.user_id;
    const { upload_id } = req.params;

    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res
        .status(404)
        .json({ message: "Organization profile not found" });
    }

    const upload = await db.OrganizationBulkUpload.findOne({
      where: {
        upload_id: upload_id,
        organization_id: organization.organization_id,
      },
    });

    if (!upload || !upload.file_path || !fs.existsSync(upload.file_path)) {
      return res.status(404).json({ message: "File not found" });
    }

    const workbook = XLSX.readFile(upload.file_path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Array-of-arrays so the frontend can render a generic table
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const headers = data.length > 0 ? data[0] : [];
    const dataRows = data.length > 1 ? data.slice(1) : [];

    res.json({
      file_name: upload.file_name,
      department: upload.department,
      section: upload.section,
      year_level: upload.year_level,
      headers,
      rows: dataRows,
    });
  } catch (error) {
    console.error("Preview bulk upload error:", error);
    res.status(500).json({ message: "Error previewing file" });
  }
};
