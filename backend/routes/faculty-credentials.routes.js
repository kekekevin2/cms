const express = require("express");
const router = express.Router();
const multer = require("multer");
const facultyCredentialsController = require("../controllers/faculty-credentials.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: 200 * 1024 * 1024, // 200MB limit
	},
});

// Define file fields for upload
const uploadFields = upload.fields([
	{ name: "tor", maxCount: 1 },
	{ name: "pds", maxCount: 1 },
	{ name: "diploma", maxCount: 1 },
	{ name: "certificate_0_file", maxCount: 1 },
	{ name: "certificate_1_file", maxCount: 1 },
	{ name: "certificate_2_file", maxCount: 1 },
	{ name: "certificate_3_file", maxCount: 1 },
	{ name: "certificate_4_file", maxCount: 1 },
	{ name: "certificate_5_file", maxCount: 1 },
	{ name: "certificate_6_file", maxCount: 1 },
	{ name: "certificate_7_file", maxCount: 1 },
	{ name: "certificate_8_file", maxCount: 1 },
	{ name: "certificate_9_file", maxCount: 1 },
]);

// Routes
router.post(
	"/",
	verifyToken,
	checkRole("faculty"),
	uploadFields,
	facultyCredentialsController.createOrUpdateCredentials,
);

router.get(
	"/",
	verifyToken,
	checkRole("faculty"),
	facultyCredentialsController.getCredentials,
);

router.get(
	"/download/certificate/:certificateId",
	verifyToken,
	checkRole("faculty"),
	facultyCredentialsController.downloadCertificate,
);

router.get(
	"/download/:fileType",
	verifyToken,
	checkRole("faculty"),
	facultyCredentialsController.downloadFile,
);

module.exports = router;
