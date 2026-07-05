const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const facultyProfileController = require("../controllers/faculty-profile.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Middleware
router.use(verifyToken);
router.use(checkRole("faculty"));

// Configure multer for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/";

    if (req.path.includes("/personal")) {
      uploadPath += "profile-pictures/";
    } else if (req.path.includes("/awards")) {
      uploadPath += "awards/";
    } else if (req.path.includes("/seminars")) {
      uploadPath += "seminars/";
    } else if (req.path.includes("/research")) {
      uploadPath += "research/";
    } else if (req.path.includes("/extension")) {
      uploadPath += "extension/";
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log("📁 Created directory:", uploadPath);
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images and PDF files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ==================== PERSONAL PROFILE ====================
router.get("/personal", facultyProfileController.getPersonalProfile);
router.post(
  "/personal",
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
  ]),
  facultyProfileController.upsertPersonalProfile,
);
router.put(
  "/personal",
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
  ]),
  facultyProfileController.upsertPersonalProfile,
);

// ==================== ACADEMIC PROFILE ====================
router.get("/academic", facultyProfileController.getAcademicProfiles);
router.post("/academic", facultyProfileController.createAcademicProfile);
router.put("/academic/:id", facultyProfileController.updateAcademicProfile);
router.delete("/academic/:id", facultyProfileController.deleteAcademicProfile);

// ==================== EMPLOYMENT PROFILE ====================
router.get("/employment", facultyProfileController.getEmploymentProfiles);
router.post("/employment", facultyProfileController.createEmploymentProfile);
router.put("/employment/:id", facultyProfileController.updateEmploymentProfile);
router.delete(
  "/employment/:id",
  facultyProfileController.deleteEmploymentProfile,
);

// ==================== PROFESSIONAL MEMBERSHIP ====================
router.get("/membership", facultyProfileController.getProfessionalMemberships);
router.post(
  "/membership",
  facultyProfileController.createProfessionalMembership,
);
router.put(
  "/membership/:id",
  facultyProfileController.updateProfessionalMembership,
);
router.delete(
  "/membership/:id",
  facultyProfileController.deleteProfessionalMembership,
);

// ==================== AWARDS ====================
router.get("/awards", facultyProfileController.getAwards);
router.post(
  "/awards",
  upload.single("certificate_file"),
  facultyProfileController.createAward,
);
router.put(
  "/awards/:id",
  upload.single("certificate_file"),
  facultyProfileController.updateAward,
);
router.delete("/awards/:id", facultyProfileController.deleteAward);

// ==================== SEMINARS/TRAININGS ====================
router.get("/seminars", facultyProfileController.getSeminarsTrainings);
router.post(
  "/seminars",
  upload.single("certificate_file"),
  facultyProfileController.createSeminarTraining,
);
router.put(
  "/seminars/:id",
  upload.single("certificate_file"),
  facultyProfileController.updateSeminarTraining,
);
router.delete("/seminars/:id", facultyProfileController.deleteSeminarTraining);

// ==================== RESEARCH ACTIVITIES ====================
router.get("/research", facultyProfileController.getResearchActivities);
router.post(
  "/research",
  upload.single("certificate_file"),
  facultyProfileController.createResearchActivity,
);
router.put(
  "/research/:id",
  upload.single("certificate_file"),
  facultyProfileController.updateResearchActivity,
);
router.delete("/research/:id", facultyProfileController.deleteResearchActivity);

// ==================== EXTENSION ACTIVITIES ====================
router.get("/extension", facultyProfileController.getExtensionActivities);
router.post(
  "/extension",
  upload.single("documentation_file"),
  facultyProfileController.createExtensionActivity,
);
router.put(
  "/extension/:id",
  upload.single("documentation_file"),
  facultyProfileController.updateExtensionActivity,
);
router.delete(
  "/extension/:id",
  facultyProfileController.deleteExtensionActivity,
);

// ==================== COMPLETE PROFILE ====================
router.get("/complete", facultyProfileController.getCompleteProfile);

module.exports = router;
