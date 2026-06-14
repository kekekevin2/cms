const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const deanProfileController = require("../controllers/dean-profile.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Middleware
router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Configure multer for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/";

    if (req.path.includes("/personal")) {
      uploadPath += "profiles/";
    } else if (req.path.includes("/awards")) {
      uploadPath += "awards/";
    } else if (req.path.includes("/seminars")) {
      uploadPath += "seminars/";
    } else if (req.path.includes("/research")) {
      uploadPath += "research/";
    } else if (req.path.includes("/extension")) {
      uploadPath += "extension/";
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
router.get("/personal", deanProfileController.getPersonalProfile);
router.post(
  "/personal",
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
  ]),
  deanProfileController.upsertPersonalProfile,
);
router.put(
  "/personal",
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
  ]),
  deanProfileController.upsertPersonalProfile,
);

// ==================== ACADEMIC PROFILE ====================
router.get("/academic", deanProfileController.getAcademicProfiles);
router.post("/academic", deanProfileController.createAcademicProfile);
router.put("/academic/:id", deanProfileController.updateAcademicProfile);
router.delete("/academic/:id", deanProfileController.deleteAcademicProfile);

// ==================== EMPLOYMENT PROFILE ====================
router.get("/employment", deanProfileController.getEmploymentProfiles);
router.post("/employment", deanProfileController.createEmploymentProfile);
router.put("/employment/:id", deanProfileController.updateEmploymentProfile);
router.delete("/employment/:id", deanProfileController.deleteEmploymentProfile);

// ==================== PROFESSIONAL MEMBERSHIP ====================
router.get("/membership", deanProfileController.getProfessionalMemberships);
router.post("/membership", deanProfileController.createProfessionalMembership);
router.put(
  "/membership/:id",
  deanProfileController.updateProfessionalMembership,
);
router.delete(
  "/membership/:id",
  deanProfileController.deleteProfessionalMembership,
);

// ==================== AWARDS ====================
router.get("/awards", deanProfileController.getAwards);
router.post(
  "/awards",
  upload.single("certificate_file"),
  deanProfileController.createAward,
);
router.put(
  "/awards/:id",
  upload.single("certificate_file"),
  deanProfileController.updateAward,
);
router.delete("/awards/:id", deanProfileController.deleteAward);

// ==================== SEMINARS/TRAININGS ====================
router.get("/seminars", deanProfileController.getSeminarsTrainings);
router.post(
  "/seminars",
  upload.single("certificate_file"),
  deanProfileController.createSeminarTraining,
);
router.put(
  "/seminars/:id",
  upload.single("certificate_file"),
  deanProfileController.updateSeminarTraining,
);
router.delete("/seminars/:id", deanProfileController.deleteSeminarTraining);

// ==================== RESEARCH ACTIVITIES ====================
router.get("/research", deanProfileController.getResearchActivities);
router.post(
  "/research",
  upload.single("certificate_file"),
  deanProfileController.createResearchActivity,
);
router.put(
  "/research/:id",
  upload.single("certificate_file"),
  deanProfileController.updateResearchActivity,
);
router.delete("/research/:id", deanProfileController.deleteResearchActivity);

// ==================== EXTENSION ACTIVITIES ====================
router.get("/extension", deanProfileController.getExtensionActivities);
router.post(
  "/extension",
  upload.single("documentation_file"),
  deanProfileController.createExtensionActivity,
);
router.put(
  "/extension/:id",
  upload.single("documentation_file"),
  deanProfileController.updateExtensionActivity,
);
router.delete("/extension/:id", deanProfileController.deleteExtensionActivity);

// ==================== COMPLETE PROFILE ====================
router.get("/complete", deanProfileController.getCompleteProfile);

// Export activities to Excel
const exportController = require("../controllers/dean-activities-export.controller");
router.get("/activities/export", exportController.exportDeanActivitiesToExcel);

module.exports = router;
