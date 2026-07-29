const express = require("express");
const router = express.Router();
const { makeUpload, MB } = require("../utils/upload");
const deanProfileController = require("../controllers/dean-profile.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Middleware
router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

const PROFILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const uploadFor = (folder) =>
  makeUpload({ folder, allowedTypes: PROFILE_TYPES, maxSize: 5 * MB });

const uploadPersonal = uploadFor("profile-pictures");
const uploadAwards = uploadFor("awards");
const uploadSeminars = uploadFor("seminars");
const uploadResearch = uploadFor("research");
const uploadExtension = uploadFor("extension");

// ==================== PERSONAL PROFILE ====================
router.get("/personal", deanProfileController.getPersonalProfile);
router.post(
  "/personal",
  uploadPersonal.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
  ]),
  deanProfileController.upsertPersonalProfile,
);
router.put(
  "/personal",
  uploadPersonal.fields([
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
  uploadAwards.single("certificate_file"),
  deanProfileController.createAward,
);
router.put(
  "/awards/:id",
  uploadAwards.single("certificate_file"),
  deanProfileController.updateAward,
);
router.delete("/awards/:id", deanProfileController.deleteAward);

// ==================== SEMINARS/TRAININGS ====================
router.get("/seminars", deanProfileController.getSeminarsTrainings);
router.post(
  "/seminars",
  uploadSeminars.single("certificate_file"),
  deanProfileController.createSeminarTraining,
);
router.put(
  "/seminars/:id",
  uploadSeminars.single("certificate_file"),
  deanProfileController.updateSeminarTraining,
);
router.delete("/seminars/:id", deanProfileController.deleteSeminarTraining);

// ==================== RESEARCH ACTIVITIES ====================
router.get("/research", deanProfileController.getResearchActivities);
router.post(
  "/research",
  uploadResearch.single("certificate_file"),
  deanProfileController.createResearchActivity,
);
router.put(
  "/research/:id",
  uploadResearch.single("certificate_file"),
  deanProfileController.updateResearchActivity,
);
router.delete("/research/:id", deanProfileController.deleteResearchActivity);

// ==================== EXTENSION ACTIVITIES ====================
router.get("/extension", deanProfileController.getExtensionActivities);
router.post(
  "/extension",
  uploadExtension.single("documentation_file"),
  deanProfileController.createExtensionActivity,
);
router.put(
  "/extension/:id",
  uploadExtension.single("documentation_file"),
  deanProfileController.updateExtensionActivity,
);
router.delete("/extension/:id", deanProfileController.deleteExtensionActivity);

// ==================== COMPLETE PROFILE ====================
router.get("/complete", deanProfileController.getCompleteProfile);

// Export activities to Excel
const exportController = require("../controllers/dean-activities-export.controller");
router.get("/activities/export", exportController.exportDeanActivitiesToExcel);

module.exports = router;
