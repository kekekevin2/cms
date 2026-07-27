// One-off dev script: fills in blank/empty fields on a faculty's Personal Data Sheet
// with realistic sample data, and fills any child section that has none yet up to the
// same max row counts used by the pds/index.js locator dev tool (children: 12,
// eligibility: 7, education: 5, work experience: 28, voluntary work: 7, training: 21,
// other info: 7 skills + 7 recognition + 7 membership, references: 3).
// Existing non-empty values/sections are left untouched.
// Run: node backend/fill-pds-sample-data.js [facultyId]
// Defaults to faculty_id 1 if none is given.

const db = require("./models");

const TARGET_FACULTY_ID = parseInt(process.argv[2], 10) || 1;

function isBlank(value) {
  return value === null || value === undefined || value === "";
}

async function fillPdsSampleData() {
  try {
    const faculty = await db.Faculty.findOne({ where: { faculty_id: TARGET_FACULTY_ID } });
    if (!faculty) {
      throw new Error(`No faculty record found for faculty_id ${TARGET_FACULTY_ID}`);
    }

    const pds = await db.PersonalDataSheet.findOne({ where: { faculty_id: faculty.faculty_id } });
    if (!pds) {
      throw new Error(
        `No PDS found for faculty_id ${faculty.faculty_id}. Create one first (Save Draft) before running this script.`,
      );
    }

    console.log(`Filling PDS #${pds.pds_id} for faculty_id ${TARGET_FACULTY_ID}...`);

    // ---- Main record: fill only fields that are currently blank ----
    const defaults = {
      name_extension: "Jr.",
      height: 1.7,
      weight: 65,
      blood_type: "O+",
      gsis_id_no: "1234567890",
      pag_ibig_id_no: "1234567890123",
      philhealth_no: "12-345678901-2",
      sss_no: "12-3456789-0",
      tin_no: "123-456-789-000",
      agency_employee_no: "2024-001",
      citizenship_type: "Filipino",
      dual_citizenship_country: null,
      residential_house_no: "123",
      residential_subdivision: "Green Meadows",
      telephone_no: "(043) 123-4567",
      spouse_surname: null,
      spouse_first_name: null,
      spouse_middle_name: null,
      spouse_name_ext: null,
      spouse_occupation: null,
      spouse_employer: null,
      spouse_business_address: null,
      spouse_telephone: null,
      father_surname: "Gutierrez",
      father_first_name: "Roberto",
      father_middle_name: "Santos",
      father_name_ext: null,
      mother_surname: "Dimasacat",
      mother_first_name: "Maria",
      mother_middle_name: "Reyes",
      q34_a_answer: false,
      q34_b_answer: false,
      q35_a_answer: false,
      q35_b_answer: false,
      q36_answer: false,
      q37_answer: false,
      q39_answer: false,
      q40_answer: false,
      q41_answer: false,
      q41_country: null,
      q42_answer: false,
      q42_group: null,
      q43_answer: false,
      q43_id_no: null,
      q44_answer: false,
      q44_id_no: null,
      government_issued_id: "Passport",
      government_id_number: "P1234567A",
      government_id_date_issued: new Date("2022-01-15"),
      permanent_subdivision: "Green Meadows",
      permanent_house_no: "123",
    };

    const updates = {};
    for (const [field, value] of Object.entries(defaults)) {
      if (isBlank(pds[field])) {
        updates[field] = value;
      }
    }
    // Spouse block: only fill if civil_status is Married and it's currently blank (skip if Single)
    if (pds.civil_status !== "Married") {
      delete updates.spouse_surname;
      delete updates.spouse_first_name;
      delete updates.spouse_middle_name;
      delete updates.spouse_occupation;
      delete updates.spouse_employer;
      delete updates.spouse_business_address;
      delete updates.spouse_telephone;
    }

    if (Object.keys(updates).length > 0) {
      await pds.update(updates);
      console.log(`✓ Filled main record fields: ${Object.keys(updates).join(", ")}`);
    } else {
      console.log("⊘ Main record already fully filled");
    }

    // ---- Child sections: only fill if the section is currently empty, up to the same
    // max row counts the pds/index.js locator dev tool renders ----

    const CHILD_ROWS = 12;
    const childCount = await db.PDSChild.count({ where: { pds_id: pds.pds_id } });
    const childToAdd = CHILD_ROWS - childCount;
    if (childToAdd > 0 && pds.civil_status === "Married") {
      const CHILD_NAMES = [
        "DELA CRUZ, MARIA ISABEL SANTOS",
        "DELA CRUZ, JOSE PEDRO SANTOS",
        "DELA CRUZ, ANA LOURDES SANTOS",
        "DELA CRUZ, MIGUEL ANTONIO SANTOS",
        "DELA CRUZ, CARLA MARIE SANTOS",
        "DELA CRUZ, RAFAEL LUIS SANTOS",
        "DELA CRUZ, SOFIA BEATRIZ SANTOS",
        "DELA CRUZ, GABRIEL DIEGO SANTOS",
        "DELA CRUZ, ISABELLA ROSE SANTOS",
        "DELA CRUZ, MATEO ANDRES SANTOS",
        "DELA CRUZ, VALENTINA CRUZ SANTOS",
        "DELA CRUZ, SANTIAGO PAOLO SANTOS",
      ];
      await db.PDSChild.bulkCreate(
        Array.from({ length: childToAdd }, (_, j) => {
          const i = childCount + j;
          return {
            pds_id: pds.pds_id,
            child_name: CHILD_NAMES[i % CHILD_NAMES.length],
            date_of_birth: new Date(2005 + i, 4, 10),
          };
        }),
      );
      console.log(`✓ Added ${childToAdd} sample children (had ${childCount}, now ${CHILD_ROWS})`);
    } else {
      console.log(
        `⊘ Children section skipped (${childCount}/${CHILD_ROWS} rows, or not applicable for Single status)`,
      );
    }

    const ELIGIBILITY_ROWS = 7;
    const eligibilityCount = await db.PDSEligibility.count({ where: { pds_id: pds.pds_id } });
    const eligibilityToAdd = ELIGIBILITY_ROWS - eligibilityCount;
    if (eligibilityToAdd > 0) {
      const CAREER_SERVICES = [
        "Career Service (Professional)",
        "Career Service (Sub-Professional)",
        "CSC Honor Graduate",
        "RA 1080 (Board/Bar)",
        "Barangay Official Eligibility",
        "Skills Test (Driver)",
        "Career Service (Sub-Professional)",
      ];
      await db.PDSEligibility.bulkCreate(
        Array.from({ length: eligibilityToAdd }, (_, j) => {
          const i = eligibilityCount + j;
          return {
            pds_id: pds.pds_id,
            career_service: CAREER_SERVICES[i % CAREER_SERVICES.length],
            rating: (80 + i).toFixed(2),
            date_of_examination: new Date(2012 + i, 7, 9),
            place_of_examination: i % 2 === 0 ? "Batangas City" : "Manila",
            license_number: `CSC-${2012 + i}-00${1000 + i}`,
            license_validity: null,
          };
        }),
      );
      console.log(`✓ Added ${eligibilityToAdd} sample eligibilities (had ${eligibilityCount}, now ${ELIGIBILITY_ROWS})`);
    } else {
      console.log(`⊘ Eligibilities section already at/above target (${eligibilityCount}/${ELIGIBILITY_ROWS})`);
    }

    const EDUCATION_DEFAULTS = {
      ELEMENTARY: {
        school_name: "Balete Elementary School",
        period_from: 2005,
        period_to: 2011,
        year_graduated: 2011,
      },
      SECONDARY: {
        school_name: "Balete National High School",
        period_from: 2011,
        period_to: 2015,
        year_graduated: 2015,
      },
      VOCATIONAL: {
        school_name: "Batangas State University - TESDA Center",
        degree_course: "Computer Systems Servicing NC II",
        period_from: 2015,
        period_to: 2016,
        year_graduated: 2016,
      },
      COLLEGE: {
        school_name: "Batangas State University",
        degree_course: "Bachelor of Science in Information Technology",
        period_from: 2016,
        period_to: 2020,
        year_graduated: 2020,
        scholarship_honors: "Cum Laude",
      },
      "GRADUATE STUDIES": {
        school_name: "Batangas State University",
        degree_course: "Master in Information Technology",
        period_from: 2021,
        period_to: 2023,
        year_graduated: 2023,
      },
    };
    const existingEducationLevels = (
      await db.PDSEducation.findAll({ where: { pds_id: pds.pds_id }, attributes: ["level"], raw: true })
    ).map((e) => e.level);
    const missingLevels = Object.keys(EDUCATION_DEFAULTS).filter(
      (level) => !existingEducationLevels.includes(level),
    );
    if (missingLevels.length > 0) {
      await db.PDSEducation.bulkCreate(
        missingLevels.map((level) => ({ pds_id: pds.pds_id, level, ...EDUCATION_DEFAULTS[level] })),
      );
      console.log(`✓ Added sample education for missing level(s): ${missingLevels.join(", ")}`);
    } else {
      console.log("⊘ Education section already has all 5 levels");
    }

    const WORK_ROWS = 28;
    const workCount = await db.PDSWorkExperience.count({ where: { pds_id: pds.pds_id } });
    const workToAdd = WORK_ROWS - workCount;
    if (workToAdd > 0) {
      const WORK_POSITIONS = [
        "Instructor I",
        "Instructor II",
        "Assistant Professor I",
        "Assistant Professor II",
        "Associate Professor I",
        "IT Officer",
        "Systems Analyst",
        "Project Coordinator",
        "Database Administrator",
        "Network Administrator",
        "QA Tester",
        "Business Analyst",
        "Technical Writer",
        "IT Consultant",
        "Software Architect",
        "DevOps Engineer",
        "Support Specialist",
        "Web Developer",
        "Mobile Developer",
        "Data Analyst",
        "IT Manager",
        "Solutions Engineer",
        "Application Developer",
        "Infrastructure Engineer",
        "Security Analyst",
        "Cloud Engineer",
        "Automation Engineer",
        "Senior IT Manager",
      ];
      const WORK_STATUSES = ["Permanent", "Temporary", "Casual", "Contractual"];
      await db.PDSWorkExperience.bulkCreate(
        Array.from({ length: workToAdd }, (_, j) => {
          const i = workCount + j;
          const yearFrom = 1995 + i;
          const isLast = i === WORK_ROWS - 1;
          return {
            pds_id: pds.pds_id,
            date_from: new Date(yearFrom, 0, 1),
            date_to: isLast ? null : new Date(yearFrom + 1, 11, 31),
            position_title: WORK_POSITIONS[i % WORK_POSITIONS.length],
            department_agency: "Batangas State University",
            monthly_salary: 20000 + i * 1000,
            salary_grade: String(10 + (i % 15)),
            status_of_appointment: WORK_STATUSES[i % WORK_STATUSES.length],
            is_government_service: i % 3 !== 0,
          };
        }),
      );
      console.log(`✓ Added ${workToAdd} sample work experiences (had ${workCount}, now ${WORK_ROWS})`);
    } else {
      console.log(`⊘ Work experience section already at/above target (${workCount}/${WORK_ROWS})`);
    }

    const VOLUNTARY_ROWS = 7;
    const voluntaryCount = await db.PDSVoluntaryWork.count({ where: { pds_id: pds.pds_id } });
    const voluntaryToAdd = VOLUNTARY_ROWS - voluntaryCount;
    if (voluntaryToAdd > 0) {
      const VOLUNTARY_ORGS = [
        "Philippine Red Cross",
        "Habitat for Humanity",
        "Gawad Kalinga",
        "World Wildlife Fund Philippines",
        "Batangas State University Alumni Foundation",
        "Rotary Club of Batangas",
        "Philippine National Red Cross Youth Council",
      ];
      const VOLUNTARY_POSITIONS = [
        "Volunteer",
        "Site Volunteer",
        "Team Leader",
        "Community Organizer",
        "Program Volunteer",
        "Project Coordinator",
        "Relief Operations Volunteer",
      ];
      await db.PDSVoluntaryWork.bulkCreate(
        Array.from({ length: voluntaryToAdd }, (_, j) => {
          const i = voluntaryCount + j;
          const yearFrom = 2018 + i;
          return {
            pds_id: pds.pds_id,
            organization_name: VOLUNTARY_ORGS[i % VOLUNTARY_ORGS.length],
            organization_address: "Batangas City",
            date_from: new Date(yearFrom, 0, 1),
            date_to: new Date(yearFrom, 11, 15),
            number_of_hours: 40 + i * 15,
            position_nature_of_work: VOLUNTARY_POSITIONS[i % VOLUNTARY_POSITIONS.length],
          };
        }),
      );
      console.log(`✓ Added ${voluntaryToAdd} sample voluntary works (had ${voluntaryCount}, now ${VOLUNTARY_ROWS})`);
    } else {
      console.log(`⊘ Voluntary work section already at/above target (${voluntaryCount}/${VOLUNTARY_ROWS})`);
    }

    const TRAINING_ROWS = 21;
    const trainingCount = await db.PDSTraining.count({ where: { pds_id: pds.pds_id } });
    const trainingToAdd = TRAINING_ROWS - trainingCount;
    if (trainingToAdd > 0) {
      const TRAINING_TITLES = [
        "Outcomes-Based Teaching and Learning",
        "Advanced Programming Workshop",
        "Project Management Fundamentals",
        "Cybersecurity Awareness Training",
        "Data Privacy Act Orientation",
        "Effective Business Communication",
        "Leadership and Management Development",
        "Customer Service Excellence",
        "Records Management Seminar",
        "Financial Management for Non-Financial Managers",
        "Public Speaking and Presentation Skills",
        "Strategic Planning Workshop",
        "Basic Occupational Safety and Health Training",
        "Gender and Development Orientation",
        "Values Formation and Ethics Seminar",
        "Disaster Risk Reduction and Management Training",
        "ICT Skills Enhancement Training",
        "Report Writing and Documentation Workshop",
        "Supervisory Development Course",
        "Anti-Red Tape Act Orientation",
        "Knowledge Management Seminar",
      ];
      const TRAINING_TYPES = ["Technical", "Managerial", "Supervisory", "Foundation"];
      await db.PDSTraining.bulkCreate(
        Array.from({ length: trainingToAdd }, (_, j) => {
          const i = trainingCount + j;
          const yearFrom = 2015 + i;
          return {
            pds_id: pds.pds_id,
            title: TRAINING_TITLES[i % TRAINING_TITLES.length],
            date_from: new Date(yearFrom, 0, 15),
            date_to: new Date(yearFrom, 0, 20),
            number_of_hours: 16 + i * 4,
            type_of_ld: TRAINING_TYPES[i % TRAINING_TYPES.length],
            conducted_by: "Batangas State University",
          };
        }),
      );
      console.log(`✓ Added ${trainingToAdd} sample trainings (had ${trainingCount}, now ${TRAINING_ROWS})`);
    } else {
      console.log(`⊘ Training section already at/above target (${trainingCount}/${TRAINING_ROWS})`);
    }

    // Other Info is a mixed-type table, so top up per info_type independently.
    const OTHER_INFO_ROWS_PER_TYPE = 7;
    const OTHER_INFO_SAMPLES = {
      SKILL: [
        "Programming",
        "Database Management",
        "Web Development",
        "Network Administration",
        "Technical Writing",
        "Public Speaking",
        "Graphic Design",
      ],
      RECOGNITION: [
        "Employee of the Month - March 2020",
        "Best in Service Award - 2020",
        "Outstanding Employee - 2021",
        "Loyalty Award (5 Years) - 2022",
        "Innovation Award - 2022",
        "Perfect Attendance Award - 2023",
        "Excellence in Public Service - 2024",
      ],
      MEMBERSHIP: [
        "Philippine Computer Society",
        "Philippine Society of IT Educators",
        "Computing Society of the Philippines",
        "Philippine Statistical Association",
        "Batangas State University Alumni Association",
        "Data Privacy Officers Network",
        "Junior Chamber International Philippines",
      ],
    };
    const otherInfoRows = [];
    for (const [infoType, samples] of Object.entries(OTHER_INFO_SAMPLES)) {
      const existingCount = await db.PDSOtherInfo.count({
        where: { pds_id: pds.pds_id, info_type: infoType },
      });
      const toAdd = OTHER_INFO_ROWS_PER_TYPE - existingCount;
      if (toAdd > 0) {
        for (let j = 0; j < toAdd; j++) {
          const i = existingCount + j;
          otherInfoRows.push({ pds_id: pds.pds_id, info_type: infoType, details: samples[i % samples.length] });
        }
        console.log(`✓ Queued ${toAdd} sample ${infoType} rows (had ${existingCount}, now ${OTHER_INFO_ROWS_PER_TYPE})`);
      } else {
        console.log(`⊘ ${infoType} already at/above target (${existingCount}/${OTHER_INFO_ROWS_PER_TYPE})`);
      }
    }
    if (otherInfoRows.length > 0) {
      await db.PDSOtherInfo.bulkCreate(otherInfoRows);
    }

    const REFERENCE_ROWS = 3;
    const referenceCount = await db.PDSReference.count({ where: { pds_id: pds.pds_id } });
    const referenceToAdd = REFERENCE_ROWS - referenceCount;
    if (referenceToAdd > 0) {
      const REFERENCES = [
        { name: "Dr. Ana Reyes", address: "Batangas City, Batangas", telephone_number: "(043) 987-6543" },
        { name: "Engr. Mark Santos", address: "Lipa City, Batangas", telephone_number: "(043) 555-1234" },
        { name: "Prof. Liza Gomez", address: "Malvar, Batangas", telephone_number: "(043) 444-7890" },
      ];
      await db.PDSReference.bulkCreate(
        REFERENCES.slice(referenceCount, referenceCount + referenceToAdd).map((r) => ({
          pds_id: pds.pds_id,
          ...r,
        })),
      );
      console.log(`✓ Added ${referenceToAdd} sample references (had ${referenceCount}, now ${REFERENCE_ROWS})`);
    } else {
      console.log(`⊘ References section already at/above target (${referenceCount}/${REFERENCE_ROWS})`);
    }

    console.log("\n✅ Done filling PDS sample data!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    process.exit(1);
  }
}

fillPdsSampleData();
