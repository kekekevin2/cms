const db = require("../models");

// Get all events for an organization
exports.getEvents = async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const events = await db.sequelize.query(
      `SELECT 
        e.*,
        GROUP_CONCAT(DISTINCT s.sdg_number ORDER BY s.sdg_number) as sdg_numbers
      FROM organization_events e
      LEFT JOIN organization_event_sdgs s ON e.id = s.event_id
      WHERE e.organization_id = ?
      GROUP BY e.id
      ORDER BY e.date_implemented DESC`,
      {
        replacements: [organization.organization_id],
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
    console.error("Get events error:", error);
    res.status(500).json({ message: "Error fetching events" });
  }
};

// Get single event with details
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const [event] = await db.sequelize.query(
      `SELECT * FROM organization_events WHERE id = ? AND organization_id = ?`,
      {
        replacements: [id, organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get SDGs
    const sdgs = await db.sequelize.query(
      `SELECT sdg_number FROM organization_event_sdgs WHERE event_id = ?`,
      {
        replacements: [id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    // Get Guests
    const guests = await db.sequelize.query(
      `SELECT * FROM organization_event_guests WHERE event_id = ?`,
      {
        replacements: [id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    res.json({
      ...event,
      sdgs: sdgs.map((s) => s.sdg_number),
      guests,
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({ message: "Error fetching event" });
  }
};

// Create event
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.user_id;

    console.log("Create event - Request body:", req.body);
    console.log("Create event - File:", req.file);

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const {
      title,
      date_implemented,
      status,
      start_time,
      end_time,
      description,
    } = req.body;

    // Parse JSON fields from FormData
    let sdgs = [];
    let guests = [];
    
    try {
      if (req.body.sdgs) {
        sdgs = JSON.parse(req.body.sdgs);
      }
    } catch (e) {
      console.error("Error parsing SDGs:", e);
    }

    try {
      if (req.body.guests) {
        guests = JSON.parse(req.body.guests);
      }
    } catch (e) {
      console.error("Error parsing guests:", e);
    }

    console.log("Parsed SDGs:", sdgs);
    console.log("Parsed guests:", guests);

    // Handle file upload
    let filePath = null;
    let originalFilename = null;
    let fileSize = null;

    if (req.file) {
      filePath = req.file.path;
      originalFilename = req.file.originalname;
      fileSize = req.file.size;
    }

    // Insert event
    const [result] = await db.sequelize.query(
      `INSERT INTO organization_events 
        (organization_id, title, date_implemented, status, start_time, end_time, description, file_path, original_filename, file_size, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      {
        replacements: [
          organization.organization_id,
          title,
          date_implemented,
          status || "Planned",
          start_time || null,
          end_time || null,
          description || null,
          filePath,
          originalFilename,
          fileSize,
        ],
        type: db.sequelize.QueryTypes.INSERT,
      },
    );

    const eventId = result;
    console.log("Event created with ID:", eventId);

    // Insert SDGs
    if (sdgs && sdgs.length > 0) {
      for (const sdg of sdgs) {
        await db.sequelize.query(
          `INSERT INTO organization_event_sdgs (event_id, sdg_number) VALUES (?, ?)`,
          {
            replacements: [eventId, sdg],
            type: db.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }

    // Insert Guests
    if (guests && guests.length > 0) {
      for (const guest of guests) {
        await db.sequelize.query(
          `INSERT INTO organization_event_guests (event_id, guest_name, guest_title, guest_affiliation) 
          VALUES (?, ?, ?, ?)`,
          {
            replacements: [
              eventId,
              guest.guest_name,
              guest.guest_title || null,
              guest.guest_affiliation || null,
            ],
            type: db.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }

    res
      .status(201)
      .json({ message: "Event created successfully", id: eventId });
  } catch (error) {
    console.error("Create event error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Error creating event",
      error: error.message 
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    console.log("Update event - Request body:", req.body);
    console.log("Update event - File:", req.file);

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const {
      title,
      date_implemented,
      status,
      start_time,
      end_time,
      description,
    } = req.body;

    // Parse JSON fields from FormData
    let sdgs = [];
    let guests = [];
    
    try {
      if (req.body.sdgs) {
        sdgs = JSON.parse(req.body.sdgs);
      }
    } catch (e) {
      console.error("Error parsing SDGs:", e);
    }

    try {
      if (req.body.guests) {
        guests = JSON.parse(req.body.guests);
      }
    } catch (e) {
      console.error("Error parsing guests:", e);
    }

    console.log("Parsed SDGs:", sdgs);
    console.log("Parsed guests:", guests);

    // Check ownership
    const [event] = await db.sequelize.query(
      `SELECT * FROM organization_events WHERE id = ? AND organization_id = ?`,
      {
        replacements: [id, organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Handle file upload
    let filePath = event.file_path;
    let originalFilename = event.original_filename;
    let fileSize = event.file_size;

    if (req.file) {
      // Delete old file if exists
      if (event.file_path) {
        const fs = require("fs");
        if (fs.existsSync(event.file_path)) {
          fs.unlinkSync(event.file_path);
        }
      }
      filePath = req.file.path;
      originalFilename = req.file.originalname;
      fileSize = req.file.size;
    }

    // Update event
    await db.sequelize.query(
      `UPDATE organization_events 
      SET title = ?, date_implemented = ?, status = ?, start_time = ?, end_time = ?, description = ?,
          file_path = ?, original_filename = ?, file_size = ?, uploaded_at = IF(? IS NOT NULL, NOW(), uploaded_at)
      WHERE id = ?`,
      {
        replacements: [
          title,
          date_implemented,
          status,
          start_time || null,
          end_time || null,
          description || null,
          filePath,
          originalFilename,
          fileSize,
          req.file ? 'yes' : null,
          id,
        ],
        type: db.sequelize.QueryTypes.UPDATE,
      },
    );

    // Update SDGs - delete and re-insert
    await db.sequelize.query(
      `DELETE FROM organization_event_sdgs WHERE event_id = ?`,
      {
        replacements: [id],
        type: db.sequelize.QueryTypes.DELETE,
      },
    );

    if (sdgs && sdgs.length > 0) {
      for (const sdg of sdgs) {
        await db.sequelize.query(
          `INSERT INTO organization_event_sdgs (event_id, sdg_number) VALUES (?, ?)`,
          {
            replacements: [id, sdg],
            type: db.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }

    // Update Guests - delete and re-insert
    await db.sequelize.query(
      `DELETE FROM organization_event_guests WHERE event_id = ?`,
      {
        replacements: [id],
        type: db.sequelize.QueryTypes.DELETE,
      },
    );

    if (guests && guests.length > 0) {
      for (const guest of guests) {
        await db.sequelize.query(
          `INSERT INTO organization_event_guests (event_id, guest_name, guest_title, guest_affiliation) 
          VALUES (?, ?, ?, ?)`,
          {
            replacements: [
              id,
              guest.guest_name,
              guest.guest_title || null,
              guest.guest_affiliation || null,
            ],
            type: db.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }

    res.json({ message: "Event updated successfully" });
  } catch (error) {
    console.error("Update event error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Error updating event",
      error: error.message 
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check ownership
    const [event] = await db.sequelize.query(
      `SELECT * FROM organization_events WHERE id = ? AND organization_id = ?`,
      {
        replacements: [id, organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Delete file if exists
    if (event.file_path) {
      const fs = require("fs");
      if (fs.existsSync(event.file_path)) {
        fs.unlinkSync(event.file_path);
      }
    }

    await db.sequelize.query(`DELETE FROM organization_events WHERE id = ?`, {
      replacements: [id],
      type: db.sequelize.QueryTypes.DELETE,
    });

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Error deleting event" });
  }
};

// Download event file
exports.downloadEventFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Get organization profile
    const organization = await db.Organization.findOne({
      where: { user_id: userId },
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Check ownership
    const [event] = await db.sequelize.query(
      `SELECT * FROM organization_events WHERE id = ? AND organization_id = ?`,
      {
        replacements: [id, organization.organization_id],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (!event.file_path) {
      return res.status(404).json({ message: "No file uploaded for this event" });
    }

    const fs = require("fs");
    if (!fs.existsSync(event.file_path)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.download(event.file_path, event.original_filename);
  } catch (error) {
    console.error("Download event file error:", error);
    res.status(500).json({ message: "Error downloading file" });
  }
};

module.exports = exports;
