const express = require("express");
const router = express.Router();
const deanFacultyCredentialsController = require("../controllers/dean-faculty-credentials.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

// Get all faculty credentials in dean's department
router.get("/", deanFacultyCredentialsController.getAllFacultyCredentials);

// Get single faculty credential details
router.get(
	"/:facultyId",
	deanFacultyCredentialsController.getFacultyCredential,
);

// Download faculty's credential file (tor, pds, diploma)
router.get(
	"/:facultyId/download/:fileType",
	deanFacultyCredentialsController.downloadFacultyCredentialFile,
);

// Download faculty's certificate
router.get(
	"/:facultyId/certificate/:certificateId/download",
	deanFacultyCredentialsController.downloadFacultyCertificate,
);

module.exports = router;
