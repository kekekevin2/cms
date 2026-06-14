const express = require("express");
const router = express.Router();
const requirementController = require("../controllers/faculty-requirement.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const upload = require("../utils/upload");

router.use(verifyToken);
router.use(checkRole("faculty"));

// Get faculty's requirement submissions (per academic year/semester)
router.get("/", requirementController.getMyRequirements);

// Get statistics for faculty's requirements
router.get("/statistics", requirementController.getMyStatistics);

// Get faculty's clearance status for a specific academic year + semester
router.get("/period-clearance", requirementController.getMyPeriodClearance);

// Submit a requirement (with multiple file uploads - max 10 files)
router.post(
	"/submit",
	upload.array("files", 10),
	requirementController.submitRequirement,
);

// Add more files to existing requirement submission
router.post(
	"/:submission_id/add-files",
	upload.array("files", 10),
	requirementController.addFiles,
);

// Download a specific file from a requirement submission
router.get(
	"/:submission_id/files/:file_id/download",
	requirementController.downloadFile,
);

// Delete a specific file from a requirement submission
router.delete(
	"/:submission_id/files/:file_id",
	requirementController.deleteFile,
);

// Delete a requirement submission
router.delete("/:submission_id", requirementController.deleteRequirement);

// Download a requirement file
router.get(
	"/:submission_id/download",
	requirementController.downloadRequirement,
);

module.exports = router;
