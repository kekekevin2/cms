const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const eventController = require("../controllers/organization-event.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Configure multer for PDF upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/event-files/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "event-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
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
