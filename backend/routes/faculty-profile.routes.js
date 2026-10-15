const express = require("express");
const router = express.Router();
const { makeUpload, MB } = require("../utils/upload");
const facultyProfileController = require("../controllers/faculty-profile.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Middleware
router.use(verifyToken);
router.use(checkRole("faculty"));

const PROFILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const uploadFor = (folder) =>
  makeUpload({ folder, allowedTypes: PROFILE_TYPES, maxSize: 5 * MB });

const uploadPersonal = uploadFor("profile-pictures");
const uploadAwards = uploadFor("awards");
const uploadSeminars = uploadFor("seminars");
const uploadResearch = uploadFor("research");
const uploadExtension = uploadFor("extension");

// ==================== PERSONAL PROFILE ====================
router.get("/personal", facultyProfileController.getPersonalProfile);
router.post(
  "/personal",
  uploadPersonal.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
  ]),
  facultyProfileController.upsertPersonalProfile,
);
router.put(
  "/personal",
  uploadPersonal.fields([
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
  uploadAwards.single("certificate_file"),
  facultyProfileController.createAward,
);
router.put(
  "/awards/:id",
  uploadAwards.single("certificate_file"),
  facultyProfileController.updateAward,
);
router.delete("/awards/:id", facultyProfileController.deleteAward);

// ==================== SEMINARS/TRAININGS ====================
router.get("/seminars", facultyProfileController.getSeminarsTrainings);
router.post(
  "/seminars",
  uploadSeminars.single("certificate_file"),
  facultyProfileController.createSeminarTraining,
);
router.put(
  "/seminars/:id",
  uploadSeminars.single("certificate_file"),
  facultyProfileController.updateSeminarTraining,
);
router.delete("/seminars/:id", facultyProfileController.deleteSeminarTraining);

// ==================== RESEARCH ACTIVITIES ====================
router.get("/research", facultyProfileController.getResearchActivities);
router.post(
  "/research",
  uploadResearch.single("certificate_file"),
  facultyProfileController.createResearchActivity,
);
router.put(
  "/research/:id",
  uploadResearch.single("certificate_file"),
  facultyProfileController.updateResearchActivity,
);
router.delete("/research/:id", facultyProfileController.deleteResearchActivity);

// ==================== EXTENSION ACTIVITIES ====================
router.get("/extension", facultyProfileController.getExtensionActivities);
router.post(
  "/extension",
  uploadExtension.single("documentation_file"),
  facultyProfileController.createExtensionActivity,
);
router.put(
  "/extension/:id",
  uploadExtension.single("documentation_file"),
  facultyProfileController.updateExtensionActivity,
);
router.delete(
  "/extension/:id",
  facultyProfileController.deleteExtensionActivity,
);

// ==================== COMPLETE PROFILE ====================
router.get("/complete", facultyProfileController.getCompleteProfile);

module.exports = router;
