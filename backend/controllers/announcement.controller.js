const db = require("../models");
const { Op } = require("sequelize");

// Dean creates announcement
exports.createAnnouncement = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { title, content } = req.body;

		// Get dean's profile
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Create announcement
		const announcement = await db.Announcement.create({
			dean_id: dean.dean_id,
			title,
			content,
			target_department: dean.department,
		});

		res.json({
			message: "Announcement created successfully",
			announcement,
		});
	} catch (error) {
		console.error("Create announcement error:", error);
		res.status(500).json({ message: "Error creating announcement" });
	}
};

// Dean gets all announcements they created
exports.getDeanAnnouncements = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;

		// Get dean's profile
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		const { count, rows } = await db.Announcement.findAndCountAll({
			where: { dean_id: dean.dean_id },
			limit,
			offset,
			order: [["created_at", "DESC"]],
			include: [
				{
					model: db.AnnouncementRead,
					as: "reads",
					attributes: ["read_id", "faculty_id", "read_at"],
					required: false,
				},
			],
		});

		res.json({
			announcements: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get dean announcements error:", error);
		res.status(500).json({ message: "Error fetching announcements" });
	}
};

// Dean updates announcement
exports.updateAnnouncement = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { announcement_id } = req.params;
		const { title, content } = req.body;

		// Get dean's profile
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Find and verify ownership
		const announcement = await db.Announcement.findOne({
			where: {
				announcement_id,
				dean_id: dean.dean_id,
			},
		});

		if (!announcement) {
			return res.status(404).json({ message: "Announcement not found" });
		}

		// Update
		await announcement.update({
			title: title || announcement.title,
			content: content || announcement.content,
		});

		res.json({
			message: "Announcement updated successfully",
			announcement,
		});
	} catch (error) {
		console.error("Update announcement error:", error);
		res.status(500).json({ message: "Error updating announcement" });
	}
};

// Dean deletes announcement
exports.deleteAnnouncement = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { announcement_id } = req.params;

		// Get dean's profile
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Find and verify ownership
		const announcement = await db.Announcement.findOne({
			where: {
				announcement_id,
				dean_id: dean.dean_id,
			},
		});

		if (!announcement) {
			return res.status(404).json({ message: "Announcement not found" });
		}

		// Delete
		await announcement.destroy();

		res.json({ message: "Announcement deleted successfully" });
	} catch (error) {
		console.error("Delete announcement error:", error);
		res.status(500).json({ message: "Error deleting announcement" });
	}
};

// Faculty gets announcements for their department
exports.getFacultyAnnouncements = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		const { count, rows } = await db.Announcement.findAndCountAll({
			where: {
				target_department: faculty.department,
			},
			limit,
			offset,
			order: [["created_at", "DESC"]],
			include: [
				{
					model: db.Dean,
					attributes: ["dean_id", "first_name", "last_name", "department"],
				},
				{
					model: db.AnnouncementRead,
					as: "reads",
					where: { faculty_id: faculty.faculty_id },
					required: false,
					attributes: ["read_id", "read_at"],
				},
			],
		});

		// Mark unread count
		const announcements = rows.map((announcement) => {
			const announcementData = announcement.toJSON();
			announcementData.is_read =
				announcementData.reads && announcementData.reads.length > 0;
			return announcementData;
		});

		res.json({
			announcements,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get faculty announcements error:", error);
		res.status(500).json({ message: "Error fetching announcements" });
	}
};

// Faculty marks announcement as read
exports.markAnnouncementRead = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { announcement_id } = req.params;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Verify announcement exists and is for their department
		const announcement = await db.Announcement.findOne({
			where: {
				announcement_id,
				target_department: faculty.department,
			},
		});

		if (!announcement) {
			return res.status(404).json({ message: "Announcement not found" });
		}

		// Create or update read record
		const [announcementRead, created] = await db.AnnouncementRead.findOrCreate({
			where: {
				announcement_id,
				faculty_id: faculty.faculty_id,
			},
			defaults: {
				announcement_id,
				faculty_id: faculty.faculty_id,
			},
		});

		res.json({
			message: created
				? "Announcement marked as read"
				: "Already marked as read",
			announcementRead,
		});
	} catch (error) {
		console.error("Mark announcement read error:", error);
		res.status(500).json({ message: "Error marking announcement as read" });
	}
};

// Faculty gets unread announcement count
exports.getUnreadCount = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Get all announcements for department
		const totalAnnouncements = await db.Announcement.count({
			where: {
				target_department: faculty.department,
			},
		});

		// Get read announcements count
		const readAnnouncements = await db.AnnouncementRead.count({
			where: {
				faculty_id: faculty.faculty_id,
			},
		});

		const unreadCount = totalAnnouncements - readAnnouncements;

		res.json({
			unreadCount,
			totalAnnouncements,
			readAnnouncements,
		});
	} catch (error) {
		console.error("Get unread count error:", error);
		res.status(500).json({ message: "Error fetching unread count" });
	}
};
