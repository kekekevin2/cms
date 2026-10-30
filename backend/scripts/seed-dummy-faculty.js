// Seeds dummy faculty accounts (User + Faculty) with extension, research and seminar activities, so
// the dean's Faculty Involvement pies have several slices. Dev data only.
//
//   node scripts/seed-dummy-faculty.js            add them to the same department/campus as faculty 1
//   node scripts/seed-dummy-faculty.js --remove   delete exactly these dummy accounts and their rows
//
// Accounts use @dummy.cms.test emails (so they are easy to spot and remove) and the password below.
// Rerunning without --remove replaces the previous dummy accounts, so it never duplicates.

const bcrypt = require("bcrypt");
const db = require("../models");
const { Op } = require("sequelize");

const PASSWORD = "Faculty123!";
const EMAIL_DOMAIN = "@dummy.cms.test";

// [first, middle, last, employee_id, extension, research, seminars] — counts vary so slices differ
const FACULTY = [
  ["Leoven", "A", "Austria", "90001", 6, 9, 7],
  ["Ramon", "B", "Cabael", "90002", 7, 5, 9],
  ["Liza", "C", "Geneta", "90003", 11, 12, 6],
  ["Mark", "D", "Foliente", "90004", 7, 6, 10],
  ["Ana", "E", "Hernandez", "90005", 8, 7, 5],
  ["Jose", "F", "Lacbay", "90006", 4, 3, 8],
];

const EXTENSION_TOPICS = [
  "Computer Literacy Program for Out-of-School Youth",
  "Basic Electrical Wiring and Safety Training",
  "Solar-Powered Lighting Installation for a Day Care Center",
  "Electronics Repair Skills Training for Persons with Disability",
  "Energy Conservation Awareness Campaign in Public Schools",
  "Free Appliance Check-up and Repair Clinic",
  "Digital Skills Training for Barangay Officials",
  "Rehabilitation of a Barangay Health Center Electrical System",
  "Basic Arduino Programming Workshop for Senior High School Students",
  "Disaster Preparedness: Electrical Safety During Typhoons",
  "Livelihood Training on Cellphone Repair",
  "Installation of a Solar Water Pump for a Farmers' Cooperative",
];
const RESEARCH_TOPICS = [
  "Research Writing Workshop",
  "Faculty Research Colloquium",
  "Kapehan Session: Research Advising and Mentoring",
  "Formulating Research Questions and Methodological Framework",
  "Grounded Theory as a Qualitative Research Framework",
  "Writing a Research Manuscript for Scopus-Indexed Journals",
  "Research Ethics and Responsible Conduct of Research",
  "Innovate Protect (IP): Patents and Utility Models",
  "RIA-lizing Research Management Services",
  "International Multidisciplinary Conference on Engineering and Technology",
  "Data Analysis Using SPSS and R",
  "Action Research for Technology Educators",
];
const SEMINAR_TOPICS = [
  "Outcomes-Based Education Curriculum Workshop",
  "Flexible Learning Delivery Seminar",
  "Training on Learning Management Systems",
  "National Conference on Engineering Education",
  "Industry 4.0 and the Future of Technology Programs",
  "Gender and Development Sensitivity Training",
  "Programmable Logic Controllers for Instructors",
  "Occupational Safety and Health Standards",
  "Instructional Materials Development",
  "Renewable Energy Systems: Solar PV Design",
  "AACCUP Accreditation Preparation Workshop",
  "Artificial Intelligence in Higher Education",
];
const SPONSORS = [
  ["Local", "Batangas State University"],
  ["National", "Commission on Higher Education"],
  ["International", "Walailak University"],
  ["National", "Department of Science and Technology"],
];
const PLACES = [
  ["Residents of Barangay Marawoy", "Lipa City, Batangas"],
  ["Senior high school students of Rosario", "Rosario, Batangas"],
  ["Members of the San Jose Farmers' Association", "San Jose, Batangas"],
  ["Out-of-school youth of Padre Garcia", "Padre Garcia, Batangas"],
];
/** Dates spread over 2022-01 … 2025-06 */
const dateFor = (i) => {
  const month = (i * 5) % 42;
  return `${2022 + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}-${String(4 + ((i * 7) % 24)).padStart(2, "0")}`;
};

async function removeDummies(t) {
  const users = await db.User.findAll({
    where: { email: { [Op.like]: `%${EMAIL_DOMAIN}` } },
    transaction: t,
    logging: false,
  });
  const userIds = users.map((u) => u.user_id);
  if (userIds.length === 0) return 0;
  const faculty = await db.Faculty.findAll({ where: { user_id: userIds }, transaction: t, logging: false });
  const facultyIds = faculty.map((f) => f.faculty_id);
  if (facultyIds.length) {
    for (const model of ["FacultyExtensionActivities", "FacultyResearchActivities", "FacultySeminarsTrainings"]) {
      await db[model].destroy({ where: { faculty_id: facultyIds }, transaction: t, logging: false });
    }
    await db.Faculty.destroy({ where: { faculty_id: facultyIds }, transaction: t, logging: false });
  }
  await db.User.destroy({ where: { user_id: userIds }, transaction: t, logging: false });
  return userIds.length;
}

async function main() {
  const removeOnly = process.argv.includes("--remove");
  // Same department/campus as faculty 1, so they show up under that dean
  const template = await db.Faculty.findByPk(1, { logging: false });
  if (!template) throw new Error("Faculty 1 not found (used for the department/campus)");

  const t = await db.sequelize.transaction();
  try {
    const removed = await removeDummies(t);
    if (!removeOnly) {
      const hash = await bcrypt.hash(PASSWORD, 10);
      for (const [i, [first, middle, last, employeeId, ext, res, sem]] of FACULTY.entries()) {
        const email = `${first}.${last}`.toLowerCase() + EMAIL_DOMAIN;
        const user = await db.User.create({ email, password: hash, role: "faculty", is_active: true }, { transaction: t, logging: false });
        const faculty = await db.Faculty.create(
          {
            employee_id: employeeId,
            first_name: first,
            middle_name: middle,
            last_name: last,
            email,
            department: template.department,
            campus: template.campus,
            position_level: "Instructor I",
            academic_rank: "INSTRUCTOR I",
            employment_status: i % 2 ? "TEMPORARY" : "PERMANENT",
            user_id: user.user_id,
            is_active: true,
          },
          { transaction: t, logging: false },
        );
        const fid = faculty.faculty_id;
        await db.FacultyExtensionActivities.bulkCreate(
          Array.from({ length: ext }, (_, k) => {
            const [beneficiary, location] = PLACES[(k + i) % PLACES.length];
            return {
              faculty_id: fid,
              extension_title: EXTENSION_TOPICS[(k + i) % EXTENSION_TOPICS.length],
              date_of_implementation: dateFor(k * 3 + i),
              beneficiary,
              location,
            };
          }),
          { transaction: t, logging: false },
        );
        await db.FacultyResearchActivities.bulkCreate(
          Array.from({ length: res }, (_, k) => {
            const [category, sponsoring_agency] = SPONSORS[(k + i) % SPONSORS.length];
            return {
              faculty_id: fid,
              research_title: RESEARCH_TOPICS[(k + i * 2) % RESEARCH_TOPICS.length],
              category,
              date: dateFor(k * 2 + i + 3),
              sponsoring_agency,
            };
          }),
          { transaction: t, logging: false },
        );
        await db.FacultySeminarsTrainings.bulkCreate(
          Array.from({ length: sem }, (_, k) => {
            const [category, sponsoring_agency] = SPONSORS[(k + i + 1) % SPONSORS.length];
            return {
              faculty_id: fid,
              title: SEMINAR_TOPICS[(k + i * 3) % SEMINAR_TOPICS.length],
              category,
              date: dateFor(k * 4 + i + 1),
              sponsoring_agency,
            };
          }),
          { transaction: t, logging: false },
        );
        console.log(`  ${last}, ${first} (${email}): ${ext} extension, ${res} research, ${sem} seminars`);
      }
    }
    await t.commit();
    console.log(`Removed ${removed} previous dummy account(s).`);
    if (!removeOnly) {
      console.log(`Added ${FACULTY.length} faculty in "${template.department}" (${template.campus}). Password: ${PASSWORD}`);
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
