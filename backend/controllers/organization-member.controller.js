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
      term_start_date,
      term_end_date,
    } = req.body;

    // All fields are now optional - no validation required
    // Convert empty strings to null for foreign key fields
    const cleanedAcademicYearId = academic_year_id && academic_year_id !== '' ? academic_year_id : null;
    const cleanedParentMemberId = parent_member_id && parent_member_id !== '' ? parent_member_id : null;
    const cleanedTermStartDate = term_start_date && term_start_date !== '' ? term_start_date : null;
    const cleanedTermEndDate = term_end_date && term_end_date !== '' && term_end_date !== 'Invalid date' ? term_end_date : null;

    // Check if member already exists for this exact term and position (only if we have required data)
    if (sr_code && cleanedAcademicYearId && position) {
      const existingMember = await db.OrganizationMember.findOne({
        where: {
          organization_id: organization.organization_id,
          sr_code,
          academic_year_id: cleanedAcademicYearId,
          position,
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
    if (req.file) {
      photo_url = `/uploads/member-photos/${req.file.filename}`;
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
      position: position || null,
      parent_member_id: cleanedParentMemberId,
      academic_year_id: cleanedAcademicYearId,
      term_start_date: cleanedTermStartDate,
      term_end_date: cleanedTermEndDate,
      photo_url,
      is_active: true,
    });

    res.status(201).json({
      message: "Member added successfully",
      member,
    });
  } catch (error) {
    console.error("Create member error:", error);
    res.status(500).json({ message: "Error creating member" });
  }
};

// Update member
exports.updateMember = async (req, res) => {
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
      return res.status(404).json({ message: "Member not found" });
    }

    const {
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
    } = req.body;

    // Handle photo upload
    let photo_url = member.photo_url; // Keep existing photo by default
    if (req.file) {
      photo_url = `/uploads/member-photos/${req.file.filename}`;
      
      // Delete old photo if it exists
      if (member.photo_url) {
        const fs = require("fs");
        const path = require("path");
        const oldPhotoPath = path.join(__dirname, "..", member.photo_url);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
    }

    await member.update({
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
      photo_url,
    });

    res.json({
      message: "Member updated successfully",
      member,
    });
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ message: "Error updating member" });
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
      return res.status(404).json({ message: "Member not found" });
    }

    await member.destroy();

    res.json({ message: "Member deleted successfully" });
  } catch (error) {
    console.error("Delete member error:", error);
    res.status(500).json({ message: "Error deleting member" });
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
exports.bulkUploadMembers = async (req, res) => {
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

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { academic_year_id, section } = req.body;

    if (!academic_year_id || !section) {
      return res.status(400).json({
        message: "Academic year and section are required",
      });
    }

    // Get academic year to use its start date
    const academicYear = await db.AcademicYear.findByPk(academic_year_id);
    if (!academicYear) {
      return res.status(404).json({ message: "Academic year not found" });
    }

    // Use academic year start as term_start_date
    const term_start_date = `${academicYear.year_start}-08-01`; // August 1st of start year

    // Parse CSV file
    const fs = require("fs");
    const csv = require("csv-parser");
    const results = [];

    const stream = fs
      .createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          const uploadResults = {
            total: results.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: [],
          };

          for (const row of results) {
            try {
              // Validate required fields
              if (!row.sr_code || !row.student_name) {
                uploadResults.errors.push({
                  row: row,
                  error: "Missing SR Code or student name",
                });
                uploadResults.skipped++;
                continue;
              }

              // Parse student name (assuming format: "First Middle Last" or "First Last")
              const nameParts = row.student_name.trim().split(" ");
              let first_name, middle_name, last_name;

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

              // Check if member exists with same position
              // Allow same student to have multiple records per academic year
              const position = row.position ? row.position.trim() : "Member";

              const existingMember = await db.OrganizationMember.findOne({
                where: {
                  organization_id: organization.organization_id,
                  sr_code: row.sr_code.trim(),
                  academic_year_id: academic_year_id,
                  position: position,
                },
              });

              const memberData = {
                organization_id: organization.organization_id,
                sr_code: row.sr_code.trim(),
                first_name: first_name,
                middle_name: middle_name || null,
                last_name: last_name,
                email: row.email ? row.email.trim() : null,
                contact_number: null, // Not in template
                gender: row.gender ? row.gender.trim() : null,
                program: row.program ? row.program.trim() : null,
                section: section, // Use section from form
                department: row.department ? row.department.trim() : null,
                year_level: row.year_level ? row.year_level.trim() : "1st Year",
                position: position,
                parent_member_id: null,
                academic_year_id: academic_year_id,
                term_start_date: term_start_date,
                is_active: true,
              };

              if (existingMember) {
                // Update existing member with same position
                await existingMember.update(memberData);
                uploadResults.updated++;
              } else {
                // Insert new member record
                await db.OrganizationMember.create(memberData);
                uploadResults.inserted++;
              }
            } catch (rowError) {
              console.error("Row processing error:", rowError);
              uploadResults.errors.push({
                row: row,
                error: rowError.message,
              });
              uploadResults.skipped++;
            }
          }

          // Determine upload status
          let uploadStatus = "completed";
          if (uploadResults.errors.length > 0) {
            if (uploadResults.inserted === 0 && uploadResults.updated === 0) {
              uploadStatus = "failed";
            } else {
              uploadStatus = "partial";
            }
          }

          // Save bulk upload record (only file name, not individual names)
          await db.OrganizationBulkUpload.create({
            organization_id: organization.organization_id,
            file_name: req.file.originalname,
            department: section, // Store section in department field for now
            academic_year_id: academic_year_id,
            term_start_date: term_start_date,
            total_records: uploadResults.total,
            inserted_count: uploadResults.inserted,
            updated_count: uploadResults.updated,
            skipped_count: uploadResults.skipped,
            uploaded_by: userId,
            upload_status: uploadStatus,
          });

          // Delete uploaded file
          fs.unlinkSync(req.file.path);

          res.json({
            message: "Bulk upload completed",
            results: uploadResults,
          });
        } catch (processingError) {
          console.error("Processing error:", processingError);
          // Clean up file
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          res.status(500).json({ message: "Error processing file" });
        }
      })
      .on("error", (error) => {
        console.error("CSV parsing error:", error);
        // Clean up file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: "Error parsing CSV file" });
      });
  } catch (error) {
    console.error("Bulk upload error:", error);
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

    // Get all active members
    const members = await db.OrganizationMember.findAll({
      where: {
        organization_id: organization.organization_id,
        is_active: true,
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
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.OrganizationBulkUpload.findAndCountAll({
      where: {
        organization_id: organization.organization_id,
      },
      limit,
      offset,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: db.AcademicYear,
          attributes: ["academic_year_id", "year_start", "year_end"],
        },
        {
          model: db.User,
          as: "uploader",
          attributes: ["user_id", "username"],
        },
      ],
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
