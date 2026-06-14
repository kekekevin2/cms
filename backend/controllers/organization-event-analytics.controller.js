const db = require("../models");

// Get events per SDG per year for organization
exports.getEventsBySDGPerYear = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const stats = await db.sequelize.query(
      `SELECT 
        YEAR(e.date_implemented) as year,
        s.sdg_number,
        COUNT(DISTINCT e.id) as event_count
      FROM organization_events e
      INNER JOIN organization_event_sdgs s ON e.id = s.event_id
      WHERE e.organization_id = ?
      GROUP BY YEAR(e.date_implemented), s.sdg_number
      ORDER BY year DESC, s.sdg_number ASC`,
      {
        replacements: [organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    res.json(stats);
  } catch (error) {
    console.error("Get events by SDG per year error:", error);
    res.status(500).json({ message: "Error fetching analytics" });
  }
};

// Get events per SDG per year for dean (all organizations)
exports.deanGetEventsBySDGPerYear = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Verify dean
    const dean = await db.Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean not found" });
    }

    const stats = await db.sequelize.query(
      `SELECT 
        YEAR(e.date_implemented) as year,
        s.sdg_number,
        COUNT(DISTINCT e.id) as event_count,
        COUNT(DISTINCT e.organization_id) as organization_count
      FROM organization_events e
      INNER JOIN organization_event_sdgs s ON e.id = s.event_id
      INNER JOIN organizations o ON e.organization_id = o.organization_id
      WHERE o.department = ?
      GROUP BY YEAR(e.date_implemented), s.sdg_number
      ORDER BY year DESC, s.sdg_number ASC`,
      {
        replacements: [dean.department],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    res.json(stats);
  } catch (error) {
    console.error("Dean get events by SDG per year error:", error);
    res.status(500).json({ message: "Error fetching analytics" });
  }
};

// Get overall event statistics for organization
exports.getEventStatistics = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Total events
    const [totalEvents] = await db.sequelize.query(
      `SELECT COUNT(*) as count FROM organization_events WHERE organization_id = ?`,
      {
        replacements: [organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    // Events by status
    const eventsByStatus = await db.sequelize.query(
      `SELECT status, COUNT(*) as count 
       FROM organization_events 
       WHERE organization_id = ? 
       GROUP BY status`,
      {
        replacements: [organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    // Total attendees
    const [totalAttendees] = await db.sequelize.query(
      `SELECT COUNT(DISTINCT a.id) as count 
       FROM organization_event_attendees a
       INNER JOIN organization_events e ON a.event_id = e.id
       WHERE e.organization_id = ?`,
      {
        replacements: [organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    // Most used SDGs
    const topSDGs = await db.sequelize.query(
      `SELECT s.sdg_number, COUNT(DISTINCT e.id) as event_count
       FROM organization_event_sdgs s
       INNER JOIN organization_events e ON s.event_id = e.id
       WHERE e.organization_id = ?
       GROUP BY s.sdg_number
       ORDER BY event_count DESC
       LIMIT 5`,
      {
        replacements: [organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    res.json({
      totalEvents: totalEvents.count,
      eventsByStatus,
      totalAttendees: totalAttendees.count,
      topSDGs,
    });
  } catch (error) {
    console.error("Get event statistics error:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
};

module.exports = exports;
