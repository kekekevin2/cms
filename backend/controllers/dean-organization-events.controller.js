const db = require("../models");
const storage = require("../utils/storage");

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


// Get all organization events for dean's department
exports.getOrganizationEvents = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get dean profile
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get all organizations in dean's department
    const organizations = await db.sequelize.query(
      `SELECT organization_id FROM organizations WHERE department = ?`,
      {
        replacements: [dean.department],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    const orgIds = organizations.map((org) => org.organization_id);

    if (orgIds.length === 0) {
      return res.json([]);
    }

    // Get all events from these organizations
    const events = await db.sequelize.query(
      `SELECT 
        e.*,
        o.organization_name,
        GROUP_CONCAT(DISTINCT s.sdg_number ORDER BY s.sdg_number) as sdg_numbers
      FROM organization_events e
      INNER JOIN organizations o ON e.organization_id = o.organization_id
      LEFT JOIN organization_event_sdgs s ON e.id = s.event_id
      WHERE e.organization_id IN (?)
      GROUP BY e.id
      ORDER BY e.date_implemented DESC`,
      {
        replacements: [orgIds],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    // Parse SDG numbers into arrays
    const eventsWithSDGs = events.map((event) => ({
      ...event,
      sdgs: event.sdg_numbers
        ? event.sdg_numbers.split(",").map((n) => parseInt(n))
        : [],
    }));

    res.json(eventsWithSDGs);
  } catch (error) {
    console.error("Get organization events error:", error);
    res.status(500).json({ message: "Error fetching organization events" });
  }
};

// Download event file
exports.downloadEventFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Get dean profile
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Get event with organization check
    const [event] = await db.sequelize.query(
      `SELECT e.*, o.department
      FROM organization_events e
      INNER JOIN organizations o ON e.organization_id = o.organization_id
      WHERE e.id = ? AND o.department = ?`,
      {
        replacements: [id, dean.department],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.file_path) {
      return res
        .status(404)
        .json({ message: "No file uploaded for this event" });
    }

    const url = await storage.getUrl(event.file_path, {
      download: true,
      filename: event.original_filename,
    });
    res.json({ url });
  } catch (error) {
    console.error("Download event file error:", error);
    res.status(500).json({ message: "Error downloading file" });
  }
};

module.exports = exports;
