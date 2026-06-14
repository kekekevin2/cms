const express = require("express");
const router = express.Router();
const announcementController = require("../controllers/announcement.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Dean routes
router.post(
	"/dean",
	verifyToken,
	checkRole("dean"),
	announcementController.createAnnouncement,
);

router.get(
	"/dean",
	verifyToken,
	checkRole("dean"),
	announcementController.getDeanAnnouncements,
);

router.put(
	"/dean/:announcement_id",
	verifyToken,
	checkRole("dean"),
	announcementController.updateAnnouncement,
);

router.delete(
	"/dean/:announcement_id",
	verifyToken,
	checkRole("dean"),
	announcementController.deleteAnnouncement,
);

// Faculty routes
router.get(
	"/faculty",
	verifyToken,
	checkRole("faculty"),
	announcementController.getFacultyAnnouncements,
);

router.post(
	"/faculty/:announcement_id/read",
	verifyToken,
	checkRole("faculty"),
	announcementController.markAnnouncementRead,
);

router.get(
	"/faculty/unread-count",
	verifyToken,
	checkRole("faculty"),
	announcementController.getUnreadCount,
);

module.exports = router;
