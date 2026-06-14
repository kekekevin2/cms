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

const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

/**
 * Helper function to format dates as MM/DD/YYYY
 */
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Helper function to convert boolean to YES/NO
 */
const boolToYesNo = (value) => {
  if (value === null || value === undefined) return "";
  return value ? "YES" : "NO";
};

/**
 * Helper function to create checkbox symbol
 * @param {boolean} checked - Whether the checkbox should be checked
 * @returns {string} - Checkbox symbol (☑ or ☐)
 */
const checkbox = (checked) => {
  return checked ? "☑" : "☐";
};

/**
 * Helper function to get checkbox for a specific value
 * @param {string} currentValue - The current value
 * @param {string} targetValue - The value to check against
 * @returns {string} - Checkbox symbol
 */
const checkboxFor = (currentValue, targetValue) => {
  return checkbox(currentValue === targetValue);
};

/**
 * Export PDS to Excel for Faculty
 */
exports.exportFacultyPDSToExcel = async (req, res) => {
  try {
    const facultyUserId = req.user.user_id;

    // Get faculty from user_id
    const faculty = await db.Faculty.findOne({
      where: { user_id: facultyUserId },
    });

    if (!faculty) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    // Get PDS basic data first (without includes to save memory)
    const pds = await db.PersonalDataSheet.findOne({
      where: { faculty_id: faculty.faculty_id },
    });

    if (!pds) {
      return res.status(404).json({ message: "Personal Data Sheet not found" });
    }

    // Load related data separately with limits to prevent memory issues
    const [
      children,
      education,
      eligibilities,
      work_experiences,
      voluntary_works,
      trainings,
      other_info,
      references,
    ] = await Promise.all([
      db.PDSChild.findAll({ where: { pds_id: pds.pds_id }, limit: 12 }),
      db.PDSEducation.findAll({ where: { pds_id: pds.pds_id }, limit: 5 }),
      db.PDSEligibility.findAll({ where: { pds_id: pds.pds_id }, limit: 7 }),
      db.PDSWorkExperience.findAll({
        where: { pds_id: pds.pds_id },
        limit: 28,
      }),
      db.PDSVoluntaryWork.findAll({ where: { pds_id: pds.pds_id }, limit: 7 }),
      db.PDSTraining.findAll({ where: { pds_id: pds.pds_id }, limit: 21 }),
      db.PDSOtherInfo.findAll({ where: { pds_id: pds.pds_id }, limit: 21 }),
      db.PDSReference.findAll({ where: { pds_id: pds.pds_id }, limit: 3 }),
    ]);

    // Attach related data to pds object
    pds.children = children;
    pds.education = education;
    pds.eligibilities = eligibilities;
    pds.work_experiences = work_experiences;
    pds.voluntary_works = voluntary_works;
    pds.trainings = trainings;
    pds.other_info = other_info;
    pds.references = references;

    // Generate Excel file
    const buffer = await generatePDSExcel(pds);

    // Generate filename
    const surname = pds.surname || "Unknown";
    const firstName = pds.first_name || "Unknown";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const filename = `PDS_${surname}_${firstName}_${dateStr}.xlsx`;

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error("Export PDS to Excel error:", error);
    res.status(500).json({ message: "Failed to generate Excel file" });
  }
};

/**
 * Export PDS to Excel for Dean
 */
exports.exportDeanPDSToExcel = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    // Get dean from user_id
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get PDS basic data first (without includes to save memory)
    const pds = await db.PersonalDataSheet.findOne({
      where: { dean_id: dean.dean_id },
    });

    if (!pds) {
      return res.status(404).json({ message: "Personal Data Sheet not found" });
    }

    // Load related data separately with limits to prevent memory issues
    const [
      children,
      education,
      eligibilities,
      work_experiences,
      voluntary_works,
      trainings,
      other_info,
      references,
    ] = await Promise.all([
      db.PDSChild.findAll({ where: { pds_id: pds.pds_id }, limit: 12 }),
      db.PDSEducation.findAll({ where: { pds_id: pds.pds_id }, limit: 5 }),
      db.PDSEligibility.findAll({ where: { pds_id: pds.pds_id }, limit: 7 }),
      db.PDSWorkExperience.findAll({
        where: { pds_id: pds.pds_id },
        limit: 28,
      }),
      db.PDSVoluntaryWork.findAll({ where: { pds_id: pds.pds_id }, limit: 7 }),
      db.PDSTraining.findAll({ where: { pds_id: pds.pds_id }, limit: 21 }),
      db.PDSOtherInfo.findAll({ where: { pds_id: pds.pds_id }, limit: 21 }),
      db.PDSReference.findAll({ where: { pds_id: pds.pds_id }, limit: 3 }),
    ]);

    // Attach related data to pds object
    pds.children = children;
    pds.education = education;
    pds.eligibilities = eligibilities;
    pds.work_experiences = work_experiences;
    pds.voluntary_works = voluntary_works;
    pds.trainings = trainings;
    pds.other_info = other_info;
    pds.references = references;

    // Generate Excel file
    const buffer = await generatePDSExcel(pds);

    // Generate filename
    const surname = pds.surname || "Unknown";
    const firstName = pds.first_name || "Unknown";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const filename = `PDS_${surname}_${firstName}_${dateStr}.xlsx`;

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error("Export Dean PDS to Excel error:", error);
    res.status(500).json({ message: "Failed to generate Excel file" });
  }
};

/**
 * Export Faculty PDS to Excel (for Dean to download)
 */
exports.exportFacultyPDSByDean = async (req, res) => {
  try {
    const { faculty_id } = req.params;

    if (!faculty_id) {
      return res.status(400).json({ message: "Faculty ID is required" });
    }

    // Get PDS basic data first (without includes to save memory)
    const pds = await db.PersonalDataSheet.findOne({
      where: { faculty_id: faculty_id },
    });

    if (!pds) {
      return res
        .status(404)
        .json({ message: "Personal Data Sheet not found for this faculty" });
    }

    // Load related data separately with limits to prevent memory issues
    const [
      children,
      education,
      eligibilities,
      work_experiences,
      voluntary_works,
      trainings,
      other_info,
      references,
    ] = await Promise.all([
      db.PDSChild.findAll({ where: { pds_id: pds.pds_id }, limit: 12 }),
      db.PDSEducation.findAll({ where: { pds_id: pds.pds_id }, limit: 5 }),
      db.PDSEligibility.findAll({ where: { pds_id: pds.pds_id }, limit: 7 }),
      db.PDSWorkExperience.findAll({
        where: { pds_id: pds.pds_id },
        limit: 28,
      }),
      db.PDSVoluntaryWork.findAll({ where: { pds_id: pds.pds_id }, limit: 7 }),
      db.PDSTraining.findAll({ where: { pds_id: pds.pds_id }, limit: 21 }),
      db.PDSOtherInfo.findAll({ where: { pds_id: pds.pds_id }, limit: 21 }),
      db.PDSReference.findAll({ where: { pds_id: pds.pds_id }, limit: 3 }),
    ]);

    // Attach related data to pds object
    pds.children = children;
    pds.education = education;
    pds.eligibilities = eligibilities;
    pds.work_experiences = work_experiences;
    pds.voluntary_works = voluntary_works;
    pds.trainings = trainings;
    pds.other_info = other_info;
    pds.references = references;

    // Generate Excel file
    const buffer = await generatePDSExcel(pds);

    // Generate filename
    const surname = pds.surname || "Unknown";
    const firstName = pds.first_name || "Unknown";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const filename = `PDS_${surname}_${firstName}_${dateStr}.xlsx`;

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error("Export Faculty PDS by Dean error:", error);
    res.status(500).json({ message: "Failed to generate Excel file" });
  }
};

/**
 * Generate PDS Excel workbook from PDS data using ExcelJS
 */
async function generatePDSExcel(pds) {
  // Check if template exists
  const templatePath = path.join(
    __dirname,
    "../public/templates/pds-template.xlsx",
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error("PDS template file not found");
  }

  // Load template with ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet(1); // Get first worksheet

  // PERSONAL INFORMATION SECTION
  // Surname: D10 to N10 (merged cell)
  worksheet.getCell("D10").value = pds.surname || "";

  // First name: D11 to K11 (merged cell)
  worksheet.getCell("D11").value = pds.first_name || "";

  // Name Extension: N11
  worksheet.getCell("N11").value = pds.name_extension || "";

  // Middle name: D12 to N12 (merged cell)
  worksheet.getCell("D12").value = pds.middle_name || "";

  // Date of Birth: D13
  worksheet.getCell("D13").value = formatDate(pds.date_of_birth);

  // Place of birth: D15
  worksheet.getCell("D15").value = pds.place_of_birth || "";

  // Sex at Birth: D16:F16 (merged cell)
  worksheet.getCell("D16").value = `${checkboxFor(pds.sex, "Male")} Male    ${checkboxFor(pds.sex, "Female")} Female`;

  // Civil Status: D17:F18 (merged cell spanning 2 rows)
  // Format with line breaks for 2-column layout
  const civilStatusLines = [
    `${checkboxFor(pds.civil_status, "Single")} Single                    ${checkboxFor(pds.civil_status, "Married")} Married`,
    `${checkboxFor(pds.civil_status, "Widowed")} Widowed                ${checkboxFor(pds.civil_status, "Separated")} Separated`,
    `${checkboxFor(pds.civil_status, "Others")} Other/s: ${pds.civil_status === "Others" && pds.civil_status_others ? pds.civil_status_others : "___________"}`
  ];
  worksheet.getCell("D17").value = civilStatusLines.join("\n");

  // Height: D22
  worksheet.getCell("D22").value = pds.height ? `${pds.height} m` : "";

  // Weight: D24
  worksheet.getCell("D24").value = pds.weight ? `${pds.weight} kg` : "";

  // Blood type: D25
  worksheet.getCell("D25").value = pds.blood_type || "";

  // GSIS ID No: D27
  worksheet.getCell("D27").value = pds.gsis_id_no || "";

  // Pag-IBIG ID No: D29
  worksheet.getCell("D29").value = pds.pag_ibig_id_no || "";

  // PhilHealth No: D31
  worksheet.getCell("D31").value = pds.philhealth_no || "";

  // SSS/PhilSys Number: D32
  worksheet.getCell("D32").value = pds.sss_no || "";

  // TIN No: D33
  worksheet.getCell("D33").value = pds.tin_no || "";

  // Agency Employee No: D34
  worksheet.getCell("D34").value = pds.agency_employee_no || "";

  // CITIZENSHIP SECTION - Use checkboxes
  const citizenshipText = [
    `${checkboxFor(pds.citizenship_type, "Filipino")} Filipino`,
    `${checkboxFor(pds.citizenship_type, "Dual Citizenship")} Dual Citizenship`,
  ].join("    ");
  worksheet.getCell("J13").value = citizenshipText;

  // If dual citizenship, show country
  if (pds.citizenship_type === "Dual Citizenship" && pds.dual_citizenship_country) {
    worksheet.getCell("L13").value = `Country: ${pds.dual_citizenship_country}`;
  }

  // RESIDENTIAL ADDRESS
  // House/Block/Lot No: I19 (merged I19:K19, write to top-left cell only)
  worksheet.getCell("I17").value = pds.residential_house_no || "";
  // Street: L19 (merged L19:N19, write to top-left cell only)
  worksheet.getCell("L17").value = pds.residential_street || "";
  // Subdivision/Village: I22 (merged I22:K22, write to top-left cell only)
  worksheet.getCell("I22").value = pds.residential_subdivision || "";
  // Barangay: L22 (merged L22:N22, write to top-left cell only)
  worksheet.getCell("L20").value = pds.residential_barangay || "";
  // City/Municipality: I25 (merged I25:K25, write to top-left cell only)
  worksheet.getCell("I22").value = pds.residential_city || "";
  // Province: L25 (merged L25:N25, write to top-left cell only)
  worksheet.getCell("L22").value = pds.residential_province || "";
  // ZIP Code: I22
  // ZIP Code: I26
  worksheet.getCell("I24").value = pds.residential_zip_code || "";

  // PERMANENT ADDRESS
  // House/Block/Lot No: I29 (merged I29:K29, write to top-left cell only)
  worksheet.getCell("I25").value = pds.permanent_house_no || "";
  // Street: L29 (merged L29:N29, write to top-left cell only)
  worksheet.getCell("L25").value = pds.permanent_street || "";
  // Subdivision/Village: I32 (merged I32:K32, write to top-left cell only)
  worksheet.getCell("I25").value = pds.permanent_subdivision || "";
  // Barangay: L32 (merged L32:N32, write to top-left cell only)
  worksheet.getCell("L28").value = pds.permanent_barangay || "";
  // City/Municipality: I35 (merged I35:K35, write to top-left cell only)
  worksheet.getCell("J29").value = pds.permanent_city || "";
  // Province: L35 (merged L35:N35, write to top-left cell only)
  worksheet.getCell("L29").value = pds.permanent_province || "";
  // ZIP Code: I36
  worksheet.getCell("I31").value = pds.permanent_zip_code || "";
  

  // CONTACT INFORMATION
  worksheet.getCell("I32").value = pds.telephone_no || "";
  worksheet.getCell("I33").value = pds.mobile_no || "";
  worksheet.getCell("I34").value = pds.email_address || "";

  // FAMILY BACKGROUND
  worksheet.getCell("D36").value = pds.spouse_surname || "";
  worksheet.getCell("D37").value = pds.spouse_first_name || "";
  worksheet.getCell("G37").value = pds.spouse_name_ext || "";
  worksheet.getCell("D38").value = pds.spouse_middle_name || "";
  worksheet.getCell("D39").value = pds.spouse_occupation || "";
  worksheet.getCell("D40").value = pds.spouse_employer || "";
  worksheet.getCell("D41").value = pds.spouse_business_address || "";
  worksheet.getCell("D42").value = pds.spouse_telephone || "";

  worksheet.getCell("D43").value = pds.father_surname || "";
  worksheet.getCell("D44").value = pds.father_first_name || "";
  worksheet.getCell("G44").value = pds.father_name_ext || "";
  worksheet.getCell("D45").value = pds.father_middle_name || "";

  worksheet.getCell("D47").value = pds.mother_surname || "";
  worksheet.getCell("D48").value = pds.mother_first_name || "";
  worksheet.getCell("D49").value = pds.mother_middle_name || "";

  // CHILDREN (starting at row 37)
  if (pds.children && pds.children.length > 0) {
    const maxChildren = Math.min(pds.children.length, 12);
    for (let i = 0; i < maxChildren; i++) {
      const child = pds.children[i];
      const row = 37 + i;
      worksheet.getCell(`I${row}`).value = child.name || "";
      worksheet.getCell(`M${row}`).value = formatDate(child.date_of_birth);
    }
  }

  // EDUCATIONAL BACKGROUND (Row 54-58)
  if (pds.education && pds.education.length > 0) {
    const educationByLevel = {
      ELEMENTARY: 54,
      SECONDARY: 55,
      VOCATIONAL: 56,
      COLLEGE: 57,
      "GRADUATE STUDIES": 58,
    };

    pds.education.forEach((edu) => {
      const row = educationByLevel[edu.level];
      if (row) {
        worksheet.getCell(`D${row}`).value = edu.school_name || "";
        worksheet.getCell(`G${row}`).value = edu.degree_course || "";
        worksheet.getCell(`J${row}`).value = edu.period_from || "";
        worksheet.getCell(`K${row}`).value = edu.period_to || "";
        worksheet.getCell(`L${row}`).value = edu.highest_level_earned || "";
        worksheet.getCell(`M${row}`).value = edu.year_graduated || "";
        worksheet.getCell(`N${row}`).value = edu.scholarship_honors || "";
      }
    });
  }

  // Signature date: J60
  worksheet.getCell("J60").value = formatDate(new Date());

  // CIVIL SERVICE ELIGIBILITY (starting at row 61)
  if (pds.eligibilities && pds.eligibilities.length > 0) {
    const maxEligibilities = Math.min(pds.eligibilities.length, 7);
    for (let i = 0; i < maxEligibilities; i++) {
      const eligibility = pds.eligibilities[i];
      const row = 61 + i;
      worksheet.getCell(`D${row}`).value = eligibility.career_service || "";
      worksheet.getCell(`F${row}`).value = eligibility.rating || "";
      worksheet.getCell(`G${row}`).value = formatDate(
        eligibility.date_of_examination,
      );
      worksheet.getCell(`I${row}`).value =
        eligibility.place_of_examination || "";
      worksheet.getCell(`K${row}`).value = eligibility.license_number || "";
      worksheet.getCell(`M${row}`).value = formatDate(
        eligibility.license_validity,
      );
    }
  }

  // WORK EXPERIENCE (starting at row 69)
  if (pds.work_experiences && pds.work_experiences.length > 0) {
    const maxWorkExperiences = Math.min(pds.work_experiences.length, 28);
    for (let i = 0; i < maxWorkExperiences; i++) {
      const work = pds.work_experiences[i];
      const row = 69 + i;
      worksheet.getCell(`D${row}`).value = formatDate(work.date_from);
      worksheet.getCell(`E${row}`).value = formatDate(work.date_to);
      worksheet.getCell(`F${row}`).value = work.position_title || "";
      worksheet.getCell(`G${row}`).value = work.department_agency || "";
      worksheet.getCell(`H${row}`).value = work.monthly_salary
        ? parseFloat(work.monthly_salary).toFixed(2)
        : "";
      worksheet.getCell(`J${row}`).value = work.salary_grade || "";
      worksheet.getCell(`K${row}`).value = work.status_of_appointment || "";
      worksheet.getCell(`L${row}`).value = work.is_government_service
        ? "Y"
        : "N";
    }
  }

  // LEARNING AND DEVELOPMENT (starting at row 98)
  if (pds.trainings && pds.trainings.length > 0) {
    const maxTrainings = Math.min(pds.trainings.length, 21);
    for (let i = 0; i < maxTrainings; i++) {
      const training = pds.trainings[i];
      const row = 98 + i;
      worksheet.getCell(`D${row}`).value = training.title || "";
      worksheet.getCell(`F${row}`).value = formatDate(training.date_from);
      worksheet.getCell(`G${row}`).value = formatDate(training.date_to);
      worksheet.getCell(`H${row}`).value = training.number_of_hours || "";
      worksheet.getCell(`I${row}`).value = training.type_of_ld || "";
      worksheet.getCell(`J${row}`).value = training.conducted_by || "";
    }
  }

  // VOLUNTARY WORK (starting at row 120)
  if (pds.voluntary_works && pds.voluntary_works.length > 0) {
    const maxVoluntaryWorks = Math.min(pds.voluntary_works.length, 7);
    for (let i = 0; i < maxVoluntaryWorks; i++) {
      const voluntary = pds.voluntary_works[i];
      const row = 120 + i;
      const orgInfo = `${voluntary.organization_name || ""}${voluntary.organization_address ? " - " + voluntary.organization_address : ""}`;
      worksheet.getCell(`D${row}`).value = orgInfo;
      worksheet.getCell(`F${row}`).value = formatDate(voluntary.date_from);
      worksheet.getCell(`G${row}`).value = formatDate(voluntary.date_to);
      worksheet.getCell(`H${row}`).value = voluntary.number_of_hours || "";
      worksheet.getCell(`I${row}`).value =
        voluntary.position_nature_of_work || "";
    }
  }

  // OTHER INFORMATION (starting at row 128)
  if (pds.other_info && pds.other_info.length > 0) {
    const skills = pds.other_info.filter((info) => info.info_type === "SKILL");
    const recognitions = pds.other_info.filter(
      (info) => info.info_type === "RECOGNITION",
    );
    const memberships = pds.other_info.filter(
      (info) => info.info_type === "MEMBERSHIP",
    );

    // Skills (Column D)
    const maxSkills = Math.min(skills.length, 7);
    for (let i = 0; i < maxSkills; i++) {
      const row = 128 + i;
      worksheet.getCell(`D${row}`).value = skills[i].details || "";
    }

    // Recognitions (Column F)
    const maxRecognitions = Math.min(recognitions.length, 7);
    for (let i = 0; i < maxRecognitions; i++) {
      const row = 128 + i;
      worksheet.getCell(`F${row}`).value = recognitions[i].details || "";
    }

    // Memberships (Column H)
    const maxMemberships = Math.min(memberships.length, 7);
    for (let i = 0; i < maxMemberships; i++) {
      const row = 128 + i;
      worksheet.getCell(`H${row}`).value = memberships[i].details || "";
    }
  }

  // REFERENCES (starting at row 136)
  if (pds.references && pds.references.length > 0) {
    const maxReferences = Math.min(pds.references.length, 3);
    for (let i = 0; i < maxReferences; i++) {
      const reference = pds.references[i];
      const row = 136 + i;
      worksheet.getCell(`D${row}`).value = reference.name || "";
      worksheet.getCell(`F${row}`).value = reference.address || "";
      worksheet.getCell(`H${row}`).value = reference.telephone_number || "";
    }
  }

  // QUESTIONNAIRE RESPONSES - Use checkboxes for YES/NO
  worksheet.getCell("D140").value = `${checkbox(pds.q34_a_answer)} YES    ${checkbox(!pds.q34_a_answer)} NO`;
  if (pds.q34_a_details) worksheet.getCell("E140").value = pds.q34_a_details;

  worksheet.getCell("D141").value = `${checkbox(pds.q34_b_answer)} YES    ${checkbox(!pds.q34_b_answer)} NO`;
  if (pds.q34_b_details) worksheet.getCell("E141").value = pds.q34_b_details;

  worksheet.getCell("D142").value = `${checkbox(pds.q35_a_answer)} YES    ${checkbox(!pds.q35_a_answer)} NO`;
  if (pds.q35_a_details) worksheet.getCell("E142").value = pds.q35_a_details;

  worksheet.getCell("D143").value = `${checkbox(pds.q35_b_answer)} YES    ${checkbox(!pds.q35_b_answer)} NO`;
  if (pds.q35_b_details) worksheet.getCell("E143").value = pds.q35_b_details;

  worksheet.getCell("D144").value = `${checkbox(pds.q36_answer)} YES    ${checkbox(!pds.q36_answer)} NO`;
  if (pds.q36_details) worksheet.getCell("E144").value = pds.q36_details;
  if (pds.q36_date_filed)
    worksheet.getCell("F144").value = formatDate(pds.q36_date_filed);
  if (pds.q36_case_status)
    worksheet.getCell("G144").value = pds.q36_case_status;

  worksheet.getCell("D145").value = `${checkbox(pds.q37_answer)} YES    ${checkbox(!pds.q37_answer)} NO`;
  if (pds.q37_details) worksheet.getCell("E145").value = pds.q37_details;

  worksheet.getCell("D146").value = `${checkbox(pds.q38_answer)} YES    ${checkbox(!pds.q38_answer)} NO`;
  if (pds.q38_details) worksheet.getCell("E146").value = pds.q38_details;

  worksheet.getCell("D147").value = `${checkbox(pds.q39_answer)} YES    ${checkbox(!pds.q39_answer)} NO`;
  if (pds.q39_details) worksheet.getCell("E147").value = pds.q39_details;

  worksheet.getCell("D148").value = `${checkbox(pds.q40_answer)} YES    ${checkbox(!pds.q40_answer)} NO`;
  if (pds.q40_details) worksheet.getCell("E148").value = pds.q40_details;

  worksheet.getCell("D149").value = `${checkbox(pds.q41_answer)} YES    ${checkbox(!pds.q41_answer)} NO`;
  if (pds.q41_country) worksheet.getCell("E149").value = pds.q41_country;

  worksheet.getCell("D150").value = `${checkbox(pds.q42_answer)} YES    ${checkbox(!pds.q42_answer)} NO`;
  if (pds.q42_group) worksheet.getCell("E150").value = pds.q42_group;

  worksheet.getCell("D151").value = `${checkbox(pds.q43_answer)} YES    ${checkbox(!pds.q43_answer)} NO`;
  if (pds.q43_id_no) worksheet.getCell("E151").value = pds.q43_id_no;

  worksheet.getCell("D152").value = `${checkbox(pds.q44_answer)} YES    ${checkbox(!pds.q44_answer)} NO`;
  if (pds.q44_id_no) worksheet.getCell("E152").value = pds.q44_id_no;

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  exportFacultyPDSToExcel: exports.exportFacultyPDSToExcel,
  exportDeanPDSToExcel: exports.exportDeanPDSToExcel,
  exportFacultyPDSByDean: exports.exportFacultyPDSByDean,
};
