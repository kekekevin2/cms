const db = require("../models");
const { presignFields } = require("../utils/presign");

// Public projections are explicit: never return account IDs, account status,
// credentials, timestamps, or other administrative associations.
const summaryAttributes = ["college_department_id", "name"];
const profileAttributes = [
  ...summaryAttributes,
  "email",
  "contact_number",
  "dean_name",
  "about",
  "goal",
  "why_batstateu",
  "peos",
  "programs",
  "career_opportunities",
  "program_outcomes",
  "profile_picture",
];

function publicAssociations() {
  return [
    { model: db.Campus, as: "campus", attributes: ["campus_name"] },
    {
      model: db.Department,
      as: "department",
      attributes: ["department_name", "acronym"],
    },
  ];
}

exports.listDepartments = async (req, res) => {
  try {
    const records = await db.CollegeDepartment.findAll({
      where: { is_active: true },
      attributes: summaryAttributes,
      include: publicAssociations(),
      order: [["name", "ASC"], ["college_department_id", "ASC"]],
    });
    res.json({ records });
  } catch (err) {
    console.error("Failed to list public departments:", err);
    res.status(500).json({ message: "Failed to load departments" });
  }
};

exports.getDepartmentProfile = async (req, res) => {
  const id = req.params.id;
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) {
    return res.status(400).json({ message: "Invalid department ID" });
  }

  try {
    const record = await db.CollegeDepartment.findOne({
      where: { college_department_id: Number(id), is_active: true },
      attributes: profileAttributes,
      include: publicAssociations(),
    });
    if (!record) {
      return res.status(404).json({ message: "Department profile not found" });
    }
    res.json({ record: await presignFields(record, ["profile_picture"]) });
  } catch (err) {
    console.error("Failed to load public department profile:", err);
    res.status(500).json({ message: "Failed to load department profile" });
  }
};
