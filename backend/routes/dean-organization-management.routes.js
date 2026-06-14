const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const adviserController = require("../controllers/organization-adviser.controller");
const documentController = require("../controllers/organization-document.controller");

// Organization adviser management
router.get(
	"/:organizationId/advisers",
	verifyToken,
	checkRole("dean", "college_department"),
	adviserController.deanGetOrganizationAdvisers,
);
router.post(
	"/:organizationId/advisers",
	verifyToken,
	checkRole("dean", "college_department"),
	adviserController.deanAssignAdviser,
);
router.delete(
	"/advisers/:id",
	verifyToken,
	checkRole("dean", "college_department"),
	adviserController.deanRemoveAdviser,
);

// Organization document review
router.get(
	"/documents",
	verifyToken,
	checkRole("dean", "college_department"),
	documentController.deanGetOrganizationDocuments,
);
router.put(
	"/documents/:id/review",
	verifyToken,
	checkRole("dean", "college_department"),
	documentController.deanReviewDocument,
);
router.get(
	"/documents/:id/download",
	verifyToken,
	checkRole("dean", "college_department"),
	documentController.deanDownloadDocument,
);

module.exports = router;
