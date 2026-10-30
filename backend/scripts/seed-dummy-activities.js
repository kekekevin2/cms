// Seeds dummy seminars/trainings, research and extension activities for one faculty so the dean's
// "All Activities" PDF can be checked with several pages per section (40 rows each). Dev data only.
//
//   node scripts/seed-dummy-activities.js [faculty_id]            add the rows (default faculty 1)
//   node scripts/seed-dummy-activities.js [faculty_id] --remove   delete exactly these dummy rows
//
// Rerunning without --remove first deletes the previous dummy rows, so it never duplicates.

const db = require("../models");
const { Op } = require("sequelize");

const SEMINARS = [
  ["Outcomes-Based Education (OBE) Curriculum Writing Workshop", "Local", "2022-01-20", "Batangas State University"],
  ["Seminar on Flexible Learning Delivery in the New Normal", "Local", "2022-02-14", "Batangas State University"],
  ["Training on Learning Management System (Canvas) for Faculty", "Local", "2022-03-08", "Batangas State University"],
  ["National Conference on Engineering Education 2022", "National", "2022-05-19", "Philippine Association of Engineering Schools"],
  ["Webinar on Industry 4.0 and the Future of Technology Programs", "National", "2022-07-12", "Commission on Higher Education"],
  ["Workshop on Assessment of Student Learning Outcomes", "Local", "2022-08-25", "Batangas State University"],
  ["International Conference on Electrical and Electronics Engineering", "International", "2022-10-06", "IEEE Philippine Section"],
  ["Gender and Development (GAD) Sensitivity Training", "Local", "2022-11-17", "Batangas State University"],
  ["Training on Programmable Logic Controllers (PLC) for Instructors", "National", "2023-01-26", "Technical Education and Skills Development Authority"],
  ["Seminar on Occupational Safety and Health Standards", "National", "2023-03-02", "Department of Labor and Employment"],
  ["Faculty Development Program on Instructional Materials Development", "Local", "2023-04-13", "Batangas State University"],
  ["ASEAN Regional Forum on Technical and Vocational Education", "International", "2023-06-22", "SEAMEO VOCTECH"],
  ["Training on Renewable Energy Systems: Solar PV Design and Installation", "National", "2023-08-10", "Department of Energy"],
  ["Workshop on Accreditation Preparation (AACCUP Level III)", "Local", "2023-09-21", "Batangas State University"],
  ["International Webinar on Artificial Intelligence in Higher Education", "International", "2023-11-09", "Walailak University"],
  ["Seminar on Data Privacy Act Compliance for Educators", "National", "2024-01-18", "National Privacy Commission"],
  ["Training on Internet of Things (IoT) Applications in Engineering Technology", "National", "2024-03-14", "Department of Information and Communications Technology"],
  ["Mental Health and Wellness Seminar for Faculty and Staff", "Local", "2024-05-23", "Batangas State University"],
  ["International Conference on Sustainable Engineering and Technology 2024", "International", "2024-08-29", "Universiti Teknologi Malaysia"],
  ["Workshop on Outcomes Assessment and Continuous Quality Improvement", "Local", "2025-02-06", "Batangas State University"],
];

const RESEARCH = [
  ["Research Writing Workshop 2022", "Local", "2022-03-17", "Batangas State University"],
  ["CRADLE Journey- Witnessing innovative breakthroughs through collaborative R&D", "National", "2022-04-05", "Department of Science and Technology"],
  ["Reorientation on Process involving Collaborative, Externally Funded and Institutionally Funded Research Projects", "Local", "2022-04-22", "Batangas State University"],
  ["Formulating Research Questions and Establishing Methodological Framework", "International", "2022-11-16", "Walailak University"],
  ["Grounded Theory as a Qualitative Research Methodological Framework", "International", "2023-02-08", "Walailak University"],
  ["Faculty Research Colloquium 2023", "Local", "2023-03-16", "Batangas State University"],
  ["Kapehan Session I: A Comprehensive Guide to Research Advising and Mentoring", "Local", "2023-03-31", "Batangas State University"],
  ["Kapehan Session III: Innovate Protect (IP): Navigating the Path to Successful Patent and Utility Model Applications", "Local", "2023-06-09", "Batangas State University"],
  ['Student Research Colloquium 2023 "Towards a Sustainable Future: Examining Interdisciplinary Approaches of Social Science, Engineering and Technology, and Business"', "Local", "2023-06-23", "Batangas State University"],
  ["RIA-lizing Research Management Services: An Integration Caravan", "Local", "2023-06-30", "Batangas State University"],
  ["3rd International Multidisciplinary Conference on Engineering and Technology, Education, Management, and Development Studies (3rd IMCETEMDS)", "International", "2023-11-28", "Camarines Sur Polytechnic Colleges"],
  ["Capacity Enhancement Program for BatStateU Procurement Managers", "Local", "2024-01-10", "Batangas State University"],
  ["Writing a Research Manuscript for Scopus-Indexed Journals", "National", "2024-04-18", "Commission on Higher Education"],
  ["Research Ethics and Responsible Conduct of Research Seminar", "National", "2024-09-12", "Philippine Health Research Ethics Board"],
  ["Faculty Research Colloquium 2025", "Local", "2025-03-20", "Batangas State University"],
];

const EXTENSION = [
  ["Computer Literacy Program for Out-of-School Youth", "2022-02-19", "Out-of-school youth of Barangay San Isidro", "Lipa City, Batangas"],
  ["Basic Electrical Wiring and Safety Training for Barangay Residents", "2022-04-30", "Residents of Barangay Marawoy", "Lipa City, Batangas"],
  ["Solar-Powered Lighting Installation for a Day Care Center", "2022-07-16", "Day care center of Barangay Tambo", "Lipa City, Batangas"],
  ["Electronics Repair Skills Training for Persons with Disability", "2022-10-22", "Persons with disability of Lipa City", "Lipa City, Batangas"],
  ["Energy Conservation Awareness Campaign in Public Schools", "2023-01-28", "Grade 10 students of Lipa City National High School", "Lipa City, Batangas"],
  ["Free Appliance Check-up and Repair Clinic", "2023-04-15", "Households of Barangay Sabang", "Lipa City, Batangas"],
  ["Digital Skills Training for Barangay Officials", "2023-07-08", "Barangay officials of Lipa City", "Lipa City, Batangas"],
  ["Rehabilitation of Electrical System of a Barangay Health Center", "2023-10-14", "Barangay Health Center of Barangay Pinagtongulan", "Lipa City, Batangas"],
  ["Basic Arduino Programming Workshop for Senior High School Students", "2024-02-17", "STEM students of Batangas Province", "Malvar, Batangas"],
  ["Disaster Preparedness: Electrical Safety During Typhoons", "2024-06-29", "Residents of coastal barangays", "San Juan, Batangas"],
  ["Livelihood Training on Cellphone Repair", "2024-09-21", "Members of the Lipa City Women's Association", "Lipa City, Batangas"],
  ["Installation of Solar Water Pump for a Farmers' Cooperative", "2025-01-25", "Farmers' cooperative of Barangay Talisay", "Lipa City, Batangas"],
];

// Each section is topped up to COUNT rows with generated (still unique, realistic-looking) entries
const COUNT = 40;
const MORE_TOPICS = [
  "Outcome-Based Teaching and Learning",
  "Electrical Code of the Philippines Updates",
  "Microcontroller-Based Systems Design",
  "Technopreneurship and Innovation",
  "Blended Learning Course Design",
  "Industrial Automation and Robotics",
  "Power Quality and Energy Auditing",
  "Inclusive Education Practices",
  "Cybersecurity Awareness",
  "Smart Grid Technologies",
  "Quality Management Systems (ISO 9001:2015)",
  "Embedded Systems and Edge Computing",
  "Statistics for Educational Research",
  "Intellectual Property Rights in Academe",
  "Electric Vehicle Technology",
  "Instructional Video Production",
  "Network Infrastructure and Cabling Standards",
  "Climate Change Adaptation in Engineering",
  "Student Mentoring and Advising",
  "Digital Transformation in Higher Education",
];
const SPONSORS = [
  ["Local", "Batangas State University"],
  ["National", "Commission on Higher Education"],
  ["International", "Walailak University"],
  ["National", "Department of Science and Technology"],
  ["Local", "Batangas State University"],
  ["International", "Universiti Teknologi Malaysia"],
];
const PLACES = [
  ["Residents of Barangay Antipolo del Norte", "Lipa City, Batangas"],
  ["Senior high school students of Rosario", "Rosario, Batangas"],
  ["Members of the San Jose Farmers' Association", "San Jose, Batangas"],
  ["Barangay health workers of Lipa City", "Lipa City, Batangas"],
  ["Out-of-school youth of Padre Garcia", "Padre Garcia, Batangas"],
];
/** Spreads generated dates over 2022-01 … 2025-06 */
const dateFor = (i) => {
  const month = (i * 7) % 42; // 42 months from Jan 2022
  return `${2022 + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}-${String(5 + ((i * 3) % 23)).padStart(2, "0")}`;
};
const fill = (rows, make) => {
  for (let i = 0; rows.length < COUNT; i++) rows.push(make(i));
  return rows.sort((a, b) => String(a.find((v) => /^\d{4}-\d\d-\d\d$/.test(v))).localeCompare(String(b.find((v) => /^\d{4}-\d\d-\d\d$/.test(v)))));
};
fill(SEMINARS, (i) => {
  const kind = ["Seminar on", "Training on", "Workshop on", "Webinar on"][i % 4];
  const [category, sponsor] = SPONSORS[i % SPONSORS.length];
  return [`${kind} ${MORE_TOPICS[i % MORE_TOPICS.length]}`, category, dateFor(i), sponsor];
});
fill(RESEARCH, (i) => {
  const kind = ["Research Forum on", "Research Capability Building on", "Kapehan Session: Research Trends in", "Research Colloquium on"][i % 4];
  const [category, sponsor] = SPONSORS[(i + 2) % SPONSORS.length];
  return [`${kind} ${MORE_TOPICS[(i + 5) % MORE_TOPICS.length]}`, category, dateFor(i + 11), sponsor];
});
fill(EXTENSION, (i) => {
  const kind = ["Community Training on", "Skills Development Program on", "Awareness Campaign on", "Livelihood Seminar on"][i % 4];
  const [beneficiary, location] = PLACES[i % PLACES.length];
  return [`${kind} ${MORE_TOPICS[(i + 9) % MORE_TOPICS.length]}`, dateFor(i + 5), beneficiary, location];
});

async function main() {
  const facultyId = Number(process.argv.find((a) => /^\d+$/.test(a)) || 1);
  const removeOnly = process.argv.includes("--remove");

  const faculty = await db.Faculty.findByPk(facultyId, { logging: false });
  if (!faculty) throw new Error(`Faculty ${facultyId} not found`);

  const t = await db.sequelize.transaction();
  try {
    // Remove any previous copy of these exact dummy rows (matched by title) first
    const removed = await Promise.all([
      db.FacultySeminarsTrainings.destroy({ where: { faculty_id: facultyId, title: { [Op.in]: SEMINARS.map((r) => r[0]) } }, transaction: t, logging: false }),
      db.FacultyResearchActivities.destroy({ where: { faculty_id: facultyId, research_title: { [Op.in]: RESEARCH.map((r) => r[0]) } }, transaction: t, logging: false }),
      db.FacultyExtensionActivities.destroy({ where: { faculty_id: facultyId, extension_title: { [Op.in]: EXTENSION.map((r) => r[0]) } }, transaction: t, logging: false }),
    ]);

    if (!removeOnly) {
      await db.FacultySeminarsTrainings.bulkCreate(
        SEMINARS.map(([title, category, date, sponsoring_agency]) => ({ faculty_id: facultyId, title, category, date, sponsoring_agency })),
        { transaction: t, logging: false },
      );
      await db.FacultyResearchActivities.bulkCreate(
        RESEARCH.map(([research_title, category, date, sponsoring_agency]) => ({ faculty_id: facultyId, research_title, category, date, sponsoring_agency })),
        { transaction: t, logging: false },
      );
      await db.FacultyExtensionActivities.bulkCreate(
        EXTENSION.map(([extension_title, date_of_implementation, beneficiary, location]) => ({ faculty_id: facultyId, extension_title, date_of_implementation, beneficiary, location })),
        { transaction: t, logging: false },
      );
    }
    await t.commit();

    const name = `${faculty.first_name} ${faculty.last_name}`;
    console.log(`Removed previous dummy rows (seminars/research/extension): ${removed.join(" / ")}`);
    if (!removeOnly) {
      console.log(`Added for faculty ${facultyId} (${name}): ${SEMINARS.length} seminars, ${RESEARCH.length} research, ${EXTENSION.length} extension`);
    }
    process.exit(0);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
