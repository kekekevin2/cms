const express = require("express");
const router = express.Router();
const eventController = require("../controllers/organization-event.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const { makeUpload, MB } = require("../utils/upload");

const upload = makeUpload({
  folder: "event-files",
  allowedTypes: ["application/pdf"],
  maxSize: 10 * MB,
});

// All routes require authentication and organization role
router.use(verifyToken, checkRole("organization"));

// Event CRUD
router.get("/", eventController.getEvents);
router.get("/:id", eventController.getEvent);
router.post("/", upload.single("file"), eventController.createEvent);
router.put("/:id", upload.single("file"), eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

// File download
router.get("/:id/download", eventController.downloadEventFile);

module.exports = router;
