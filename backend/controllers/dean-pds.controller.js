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

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for photo and signature uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads/pds");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (jpeg, jpg, png) are allowed!"));
    }
  },
});

// GET: Retrieve dean's Personal Data Sheet
exports.getPDS = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    // Get dean from user_id
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get PDS with all related data
    const pds = await db.PersonalDataSheet.findOne({
      where: { dean_id: dean.dean_id },
      include: [
        { model: db.PDSChild, as: "children" },
        { model: db.PDSEducation, as: "education" },
        { model: db.PDSEligibility, as: "eligibilities" },
        { model: db.PDSWorkExperience, as: "work_experiences" },
        { model: db.PDSVoluntaryWork, as: "voluntary_works" },
        { model: db.PDSTraining, as: "trainings" },
        { model: db.PDSOtherInfo, as: "other_info" },
        { model: db.PDSReference, as: "references" },
      ],
    });

    if (!pds) {
      return res.status(404).json({ message: "Personal Data Sheet not found" });
    }

    res.json(pds);
  } catch (error) {
    console.error("Get PDS error:", error);
    res.status(500).json({ message: "Error retrieving Personal Data Sheet" });
  }
};

// POST: Create or Update Personal Data Sheet
exports.savePDS = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    console.log("=".repeat(60));
    console.log("DEAN PDS SAVE REQUEST");
    console.log("User ID from token:", deanUserId);

    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    console.log(
      "Dean lookup result:",
      dean ? `Found - Dean ID: ${dean.dean_id}` : "NOT FOUND",
    );

    if (!dean) {
      console.log("ERROR: No dean record found for user_id:", deanUserId);
      return res.status(404).json({
        message:
          "Dean profile not found. Please ensure you have a dean account linked to your user account.",
        user_id: deanUserId,
        hint: "Contact your administrator to create a dean profile for your account.",
      });
    }

    console.log("Dean ID:", dean.dean_id);

    const {
      // Personal Information
      surname,
      first_name,
      middle_name,
      name_extension,
      date_of_birth,
      place_of_birth,
      sex,
      civil_status,
      height,
      weight,
      blood_type,
      gsis_id_no,
      pag_ibig_id_no,
      philhealth_no,
      sss_no,
      tin_no,
      agency_employee_no,
      citizenship_type,
      dual_citizenship_country,
      // Addresses
      residential_house_no,
      residential_street,
      residential_subdivision,
      residential_barangay,
      residential_city,
      residential_province,
      residential_zip_code,
      permanent_house_no,
      permanent_street,
      permanent_subdivision,
      permanent_barangay,
      permanent_city,
      permanent_province,
      permanent_zip_code,
      telephone_no,
      mobile_no,
      email_address,
      // Family Background
      spouse_surname,
      spouse_first_name,
      spouse_middle_name,
      spouse_name_ext,
      spouse_occupation,
      spouse_employer,
      spouse_business_address,
      spouse_telephone,
      father_surname,
      father_first_name,
      father_middle_name,
      father_name_ext,
      mother_surname,
      mother_first_name,
      mother_middle_name,
      // Questionnaire Answers
      q34_a_answer,
      q34_a_details,
      q34_b_answer,
      q34_b_details,
      q35_a_answer,
      q35_a_details,
      q35_b_answer,
      q35_b_details,
      q36_answer,
      q36_details,
      q36_date_filed,
      q36_case_status,
      q37_answer,
      q37_details,
      q38_answer,
      q38_details,
      q39_answer,
      q39_details,
      q40_answer,
      q40_details,
      q41_answer,
      q41_country,
      q42_answer,
      q42_group,
      q43_answer,
      q43_id_no,
      q44_answer,
      q44_id_no,
      government_issued_id,
      government_id_number,
      government_id_date_issued,
      // Related data
      children,
      education,
      eligibilities,
      work_experiences,
      voluntary_works,
      trainings,
      other_info,
      references,
    } = req.body;

    // Validate required fields
    const requiredFields = {
      surname,
      first_name,
      date_of_birth,
      place_of_birth,
      sex,
      civil_status,
      citizenship_type,
      residential_city,
      residential_province,
      permanent_city,
      permanent_province,
      mobile_no,
      email_address,
    };

    const missingFields = [];
    const invalidFields = [];

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || value === "" || value === null) {
        missingFields.push(field);
      }

      // Special validation for date_of_birth
      if (field === "date_of_birth" && value) {
        if (value === "Invalid date" || isNaN(new Date(value).getTime())) {
          invalidFields.push({
            field: "date_of_birth",
            value: value,
            message: "Date of birth must be a valid date in YYYY-MM-DD format",
          });
        }
      }
    }

    if (missingFields.length > 0 || invalidFields.length > 0) {
      console.log("Validation failed:");
      console.log("Missing fields:", missingFields);
      console.log("Invalid fields:", invalidFields);

      return res.status(400).json({
        message: "Validation failed",
        missingFields: missingFields.length > 0 ? missingFields : undefined,
        invalidFields: invalidFields.length > 0 ? invalidFields : undefined,
      });
    }

    console.log("=".repeat(60));

    // Check if PDS already exists for this dean
    let pds = await db.PersonalDataSheet.findOne({
      where: { dean_id: dean.dean_id },
    });

    const pdsData = {
      dean_id: dean.dean_id,
      surname: surname || "",
      first_name: first_name || "",
      middle_name: middle_name || null,
      name_extension: name_extension || null,
      date_of_birth: date_of_birth || null,
      place_of_birth: place_of_birth || "",
      sex: sex || "Male",
      civil_status: civil_status || "Single",
      height: height || null,
      weight: weight || null,
      blood_type: blood_type || null,
      gsis_id_no: gsis_id_no || null,
      pag_ibig_id_no: pag_ibig_id_no || null,
      philhealth_no: philhealth_no || null,
      sss_no: sss_no || null,
      tin_no: tin_no || null,
      agency_employee_no: agency_employee_no || null,
      citizenship_type: citizenship_type || "Filipino",
      dual_citizenship_country: dual_citizenship_country || null,
      residential_house_no: residential_house_no || null,
      residential_street: residential_street || null,
      residential_subdivision: residential_subdivision || null,
      residential_barangay: residential_barangay || null,
      residential_city: residential_city || "",
      residential_province: residential_province || "",
      residential_zip_code: residential_zip_code || null,
      permanent_house_no: permanent_house_no || null,
      permanent_street: permanent_street || null,
      permanent_subdivision: permanent_subdivision || null,
      permanent_barangay: permanent_barangay || null,
      permanent_city: permanent_city || "",
      permanent_province: permanent_province || "",
      permanent_zip_code: permanent_zip_code || null,
      telephone_no: telephone_no || null,
      mobile_no: mobile_no || "",
      email_address: email_address || "",
      spouse_surname: spouse_surname || null,
      spouse_first_name: spouse_first_name || null,
      spouse_middle_name: spouse_middle_name || null,
      spouse_name_ext: spouse_name_ext || null,
      spouse_occupation: spouse_occupation || null,
      spouse_employer: spouse_employer || null,
      spouse_business_address: spouse_business_address || null,
      spouse_telephone: spouse_telephone || null,
      father_surname: father_surname || null,
      father_first_name: father_first_name || null,
      father_middle_name: father_middle_name || null,
      father_name_ext: father_name_ext || null,
      mother_surname: mother_surname || null,
      mother_first_name: mother_first_name || null,
      mother_middle_name: mother_middle_name || null,
      q34_a_answer: q34_a_answer || null,
      q34_a_details: q34_a_details || null,
      q34_b_answer: q34_b_answer || null,
      q34_b_details: q34_b_details || null,
      q35_a_answer: q35_a_answer || null,
      q35_a_details: q35_a_details || null,
      q35_b_answer: q35_b_answer || null,
      q35_b_details: q35_b_details || null,
      q36_answer: q36_answer || null,
      q36_details: q36_details || null,
      q36_date_filed: q36_date_filed || null,
      q36_case_status: q36_case_status || null,
      q37_answer: q37_answer || null,
      q37_details: q37_details || null,
      q38_answer: q38_answer || null,
      q38_details: q38_details || null,
      q39_answer: q39_answer || null,
      q39_details: q39_details || null,
      q40_answer: q40_answer || null,
      q40_details: q40_details || null,
      q41_answer: q41_answer || null,
      q41_country: q41_country || null,
      q42_answer: q42_answer || null,
      q42_group: q42_group || null,
      q43_answer: q43_answer || null,
      q43_id_no: q43_id_no || null,
      q44_answer: q44_answer || null,
      q44_id_no: q44_id_no || null,
      government_issued_id: government_issued_id || null,
      government_id_number: government_id_number || null,
      government_id_date_issued: government_id_date_issued || null,
      status: "draft",
    };

    if (pds) {
      // Update existing PDS
      await pds.update(pdsData);
    } else {
      // Create new PDS
      pds = await db.PersonalDataSheet.create(pdsData);
    }

    // Save related data
    if (children && Array.isArray(children)) {
      await db.PDSChild.destroy({ where: { pds_id: pds.pds_id } });
      for (const child of children) {
        await db.PDSChild.create({
          pds_id: pds.pds_id,
          ...child,
        });
      }
    }

    if (education && Array.isArray(education)) {
      await db.PDSEducation.destroy({ where: { pds_id: pds.pds_id } });
      for (const edu of education) {
        await db.PDSEducation.create({
          pds_id: pds.pds_id,
          ...edu,
        });
      }
    }

    if (eligibilities && Array.isArray(eligibilities)) {
      await db.PDSEligibility.destroy({ where: { pds_id: pds.pds_id } });
      for (const eligibility of eligibilities) {
        await db.PDSEligibility.create({
          pds_id: pds.pds_id,
          ...eligibility,
        });
      }
    }

    if (work_experiences && Array.isArray(work_experiences)) {
      await db.PDSWorkExperience.destroy({ where: { pds_id: pds.pds_id } });
      for (const work of work_experiences) {
        await db.PDSWorkExperience.create({
          pds_id: pds.pds_id,
          ...work,
        });
      }
    }

    if (voluntary_works && Array.isArray(voluntary_works)) {
      await db.PDSVoluntaryWork.destroy({ where: { pds_id: pds.pds_id } });
      for (const voluntary of voluntary_works) {
        await db.PDSVoluntaryWork.create({
          pds_id: pds.pds_id,
          ...voluntary,
        });
      }
    }

    if (trainings && Array.isArray(trainings)) {
      await db.PDSTraining.destroy({ where: { pds_id: pds.pds_id } });
      for (const training of trainings) {
        await db.PDSTraining.create({
          pds_id: pds.pds_id,
          ...training,
        });
      }
    }

    if (other_info && Array.isArray(other_info)) {
      await db.PDSOtherInfo.destroy({ where: { pds_id: pds.pds_id } });
      for (const info of other_info) {
        await db.PDSOtherInfo.create({
          pds_id: pds.pds_id,
          ...info,
        });
      }
    }

    if (references && Array.isArray(references)) {
      await db.PDSReference.destroy({ where: { pds_id: pds.pds_id } });
      for (const reference of references) {
        await db.PDSReference.create({
          pds_id: pds.pds_id,
          ...reference,
        });
      }
    }

    res.json({
      message: "Personal Data Sheet saved successfully",
      pds_id: pds.pds_id,
    });
  } catch (error) {
    console.error("Save PDS error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);

    // Send more detailed error message
    res.status(500).json({
      message: "Error saving Personal Data Sheet",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// POST: Upload photo
exports.uploadPhoto = [
  upload.single("photo"),
  async (req, res) => {
    try {
      const deanUserId = req.user.user_id;

      const deanInfo = await getDepartmentForUser(deanUserId);
      if (!deanInfo) {
        return res.status(404).json({ message: 'Department profile not found' });
      }
      const dean = { department: deanInfo.department };

      const pds = await db.PersonalDataSheet.findOne({
        where: { dean_id: dean.dean_id },
      });

      if (!pds) {
        return res
          .status(404)
          .json({ message: "Personal Data Sheet not found" });
      }

      if (pds.photo_path) {
        const oldPhotoPath = path.join(__dirname, "../", pds.photo_path);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }

      const photoPath = `uploads/pds/${req.file.filename}`;
      await pds.update({ photo_path: photoPath });

      res.json({
        message: "Photo uploaded successfully",
        photo_path: photoPath,
      });
    } catch (error) {
      console.error("Upload photo error:", error);
      res.status(500).json({ message: "Error uploading photo" });
    }
  },
];

// POST: Upload signature
exports.uploadSignature = [
  upload.single("signature"),
  async (req, res) => {
    try {
      const deanUserId = req.user.user_id;

      const deanInfo = await getDepartmentForUser(deanUserId);
      if (!deanInfo) {
        return res.status(404).json({ message: 'Department profile not found' });
      }
      const dean = { department: deanInfo.department };

      const pds = await db.PersonalDataSheet.findOne({
        where: { dean_id: dean.dean_id },
      });

      if (!pds) {
        return res
          .status(404)
          .json({ message: "Personal Data Sheet not found" });
      }

      if (pds.signature_path) {
        const oldSignaturePath = path.join(
          __dirname,
          "../",
          pds.signature_path,
        );
        if (fs.existsSync(oldSignaturePath)) {
          fs.unlinkSync(oldSignaturePath);
        }
      }

      const signaturePath = `uploads/pds/${req.file.filename}`;
      await pds.update({ signature_path: signaturePath });

      res.json({
        message: "Signature uploaded successfully",
        signature_path: signaturePath,
      });
    } catch (error) {
      console.error("Upload signature error:", error);
      res.status(500).json({ message: "Error uploading signature" });
    }
  },
];

// POST: Submit PDS for approval
exports.submitPDS = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    const pds = await db.PersonalDataSheet.findOne({
      where: { dean_id: dean.dean_id },
    });

    if (!pds) {
      return res.status(404).json({ message: "Personal Data Sheet not found" });
    }

    if (pds.status === "submitted" || pds.status === "approved") {
      return res.status(400).json({
        message: "Personal Data Sheet has already been submitted",
      });
    }

    if (!pds.photo_path) {
      return res
        .status(400)
        .json({ message: "Please upload a photo before submitting" });
    }

    await pds.update({
      status: "submitted",
      submitted_at: new Date(),
    });

    res.json({
      message: "Personal Data Sheet submitted successfully",
    });
  } catch (error) {
    console.error("Submit PDS error:", error);
    res.status(500).json({ message: "Error submitting Personal Data Sheet" });
  }
};

// POST: Import data from My Profile to PDS
exports.importFromProfile = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get ALL profile data
    const personalProfile = await db.DeanPersonalProfile.findOne({
      where: { dean_id: dean.dean_id },
    });

    const academicProfiles = await db.DeanAcademicProfile.findAll({
      where: { dean_id: dean.dean_id },
      order: [["year_graduated", "ASC"]],
    });

    const employmentProfiles = await db.DeanEmploymentProfile.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date_from", "DESC"]],
    });

    const seminars = await db.DeanSeminarsTrainings.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date", "DESC"]],
    });

    const memberships = await db.DeanProfessionalMembership.findAll({
      where: { dean_id: dean.dean_id },
    });

    const awards = await db.DeanAwards.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date_received", "DESC"]],
    });

    const researchActivities = await db.DeanResearchActivities.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date", "DESC"]],
    });

    const extensionActivities = await db.DeanExtensionActivities.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date_of_implementation", "DESC"]],
    });

    // Get or create PDS
    let pds = await db.PersonalDataSheet.findOne({
      where: { dean_id: dean.dean_id },
    });

    const pdsData = {
      dean_id: dean.dean_id,
      // Set default values for all required NOT NULL fields
      surname: "",
      first_name: "",
      date_of_birth: new Date("1900-01-01"), // Default date if not provided
      place_of_birth: "",
      sex: "Male",
      civil_status: "Single",
      citizenship_type: "Filipino",
      residential_city: "",
      residential_province: "",
      permanent_city: "",
      permanent_province: "",
      mobile_no: "",
      email_address: "",
    };

    // Map personal profile data
    if (personalProfile) {
      pdsData.surname = personalProfile.last_name || "N/A";
      pdsData.first_name = personalProfile.first_name || "N/A";
      pdsData.middle_name = personalProfile.middle_name || "";
      pdsData.name_extension = personalProfile.extension || null;
      pdsData.date_of_birth =
        personalProfile.date_of_birth || new Date("1900-01-01");
      pdsData.place_of_birth = personalProfile.place_of_birth || "N/A";
      pdsData.sex = personalProfile.sex || "Male";
      pdsData.civil_status = personalProfile.civil_status || "Single";
      pdsData.mobile_no = personalProfile.mobile_primary || "N/A";
      pdsData.email_address = personalProfile.email_primary || "N/A";
      pdsData.citizenship_type = personalProfile.citizenship || "Filipino";
      pdsData.residential_barangay = personalProfile.barangay || "";
      // Dean profile doesn't have a separate city field, use barangay or province
      pdsData.residential_city =
        personalProfile.barangay || personalProfile.province || "N/A";
      pdsData.residential_province = personalProfile.province || "N/A";
      pdsData.residential_zip_code = personalProfile.zip_code || null;
      pdsData.residential_street = personalProfile.street_subdivision || null;
      pdsData.permanent_barangay = personalProfile.barangay || "";
      // Dean profile doesn't have a separate city field, use barangay or province
      pdsData.permanent_city =
        personalProfile.barangay || personalProfile.province || "N/A";
      pdsData.permanent_province = personalProfile.province || "N/A";
      pdsData.permanent_zip_code = personalProfile.zip_code || null;
      pdsData.permanent_street = personalProfile.street_subdivision || null;
      pdsData.telephone_no = personalProfile.mobile_secondary || null;
    }

    // Import whatever data is available from profile
    // Users can fill in missing fields directly in the PDS form
    if (pds) {
      // Update existing PDS - always sync with latest My Profile data
      await pds.update(pdsData);
    } else {
      pds = await db.PersonalDataSheet.create(pdsData);
    }

    // Import academic profiles as education records
    for (const academic of academicProfiles) {
      // Skip if essential fields are missing
      if (!academic.school_name || !academic.degree_course) {
        continue;
      }

      const existingEducation = await db.PDSEducation.findOne({
        where: {
          pds_id: pds.pds_id,
          school_name: academic.school_name,
          degree_course: academic.degree_course,
        },
      });

      if (!existingEducation) {
        await db.PDSEducation.create({
          pds_id: pds.pds_id,
          level: academic.level || "COLLEGE",
          school_name: academic.school_name,
          degree_course: academic.degree_course,
          year_graduated: academic.year_graduated || null,
          scholarship_honors: academic.honors_received || "",
          year_attended_from: academic.year_from || null,
          year_attended_to: academic.year_to || null,
          units_earned: academic.units_earned || null,
        });
      }
    }

    // Import employment profiles as work experience
    for (const employment of employmentProfiles) {
      // Skip if essential fields are missing
      if (
        !employment.position_title ||
        !employment.company_name ||
        !employment.date_from
      ) {
        continue;
      }

      const existingWork = await db.PDSWorkExperience.findOne({
        where: {
          pds_id: pds.pds_id,
          position_title: employment.position_title,
          department_agency: employment.company_name,
          date_from: employment.date_from,
        },
      });

      if (!existingWork) {
        await db.PDSWorkExperience.create({
          pds_id: pds.pds_id,
          date_from: employment.date_from,
          date_to: employment.date_to || null,
          position_title: employment.position_title || "",
          department_agency: employment.company_name || "",
          monthly_salary: employment.monthly_salary || null,
          salary_grade: employment.salary_grade || null,
          status_of_appointment: employment.employment_status || "",
          is_government_service:
            employment.is_government_service !== undefined
              ? employment.is_government_service
              : null,
        });
      }
    }

    // Import seminars/trainings
    for (const seminar of seminars) {
      const existingTraining = await db.PDSTraining.findOne({
        where: {
          pds_id: pds.pds_id,
          title: seminar.title,
          date_from: seminar.date,
        },
      });

      if (!existingTraining) {
        await db.PDSTraining.create({
          pds_id: pds.pds_id,
          title: seminar.title || "",
          date_from: seminar.date || "",
          date_to: seminar.date || "",
          number_of_hours: null,
          type_of_ld: seminar.category || "",
          conducted_by:
            seminar.training_provider || seminar.sponsoring_agency || "",
        });
      }
    }

    // Import professional memberships as other info (MEMBERSHIP)
    for (const membership of memberships) {
      const existingMembership = await db.PDSOtherInfo.findOne({
        where: {
          pds_id: pds.pds_id,
          info_type: "MEMBERSHIP",
          details: membership.organization_name,
        },
      });

      if (!existingMembership) {
        await db.PDSOtherInfo.create({
          pds_id: pds.pds_id,
          info_type: "MEMBERSHIP",
          details: `${membership.organization_name} - ${membership.position || "Member"}`,
        });
      }
    }

    // Import awards as other info (RECOGNITION)
    for (const award of awards) {
      const existingAward = await db.PDSOtherInfo.findOne({
        where: {
          pds_id: pds.pds_id,
          info_type: "RECOGNITION",
          details: award.award_title,
        },
      });

      if (!existingAward) {
        await db.PDSOtherInfo.create({
          pds_id: pds.pds_id,
          info_type: "RECOGNITION",
          details: `${award.award_title} - ${award.awarding_body} (${award.date_received || "N/A"})`,
        });
      }
    }

    // Import research activities as voluntary work
    for (const research of researchActivities) {
      const existingResearch = await db.PDSVoluntaryWork.findOne({
        where: {
          pds_id: pds.pds_id,
          organization_name: research.sponsoring_agency,
          position_nature_of_work: research.research_title,
        },
      });

      if (!existingResearch) {
        await db.PDSVoluntaryWork.create({
          pds_id: pds.pds_id,
          organization_name: research.sponsoring_agency || "",
          date_from: research.date || "",
          date_to: research.date || "",
          number_of_hours: null,
          position_nature_of_work: `Research: ${research.research_title}`,
        });
      }
    }

    // Import extension activities as voluntary work
    for (const extension of extensionActivities) {
      const existingExtension = await db.PDSVoluntaryWork.findOne({
        where: {
          pds_id: pds.pds_id,
          organization_name: extension.beneficiary,
          position_nature_of_work: extension.extension_title,
        },
      });

      if (!existingExtension) {
        await db.PDSVoluntaryWork.create({
          pds_id: pds.pds_id,
          organization_name: extension.beneficiary || "",
          date_from: extension.date_of_implementation || "",
          date_to: extension.date_of_implementation || "",
          number_of_hours: null,
          position_nature_of_work: `Extension: ${extension.extension_title} (${extension.location})`,
        });
      }
    }

    // Fetch complete PDS with all relations
    const completePDS = await db.PersonalDataSheet.findOne({
      where: { pds_id: pds.pds_id },
      include: [
        { model: db.PDSChild, as: "children" },
        { model: db.PDSEducation, as: "education" },
        { model: db.PDSEligibility, as: "eligibilities" },
        { model: db.PDSWorkExperience, as: "work_experiences" },
        { model: db.PDSVoluntaryWork, as: "voluntary_works" },
        { model: db.PDSTraining, as: "trainings" },
        { model: db.PDSOtherInfo, as: "other_info" },
        { model: db.PDSReference, as: "references" },
      ],
    });

    res.json(completePDS);
  } catch (error) {
    console.error("Import from profile error:", error);
    res.status(500).json({ message: "Error importing profile data" });
  }
};
