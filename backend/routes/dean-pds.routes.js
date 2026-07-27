const router = require("express").Router();
const controller = require("../controllers/dean-pds.controller");
const verifyToken = require("../middleware/auth.middleware");

// All routes require authentication
router.use(verifyToken);

// GET: Retrieve dean's PDS
router.get("/", controller.getPDS);

// POST: Create or update PDS
router.post("/", controller.savePDS);

// POST: Upload photo
router.post("/upload-photo", controller.uploadPhoto);

// POST: Upload signature
router.post("/upload-signature", controller.uploadSignature);

// POST: Submit PDS for approval
router.post("/submit", controller.submitPDS);

// POST: Import data from My Profile
router.post("/import-from-profile", controller.importFromProfile);

// GET: Retrieve a faculty member's PDS as JSON (for client-side PDF generation)
router.get("/faculty/:faculty_id", controller.getFacultyPDS);

module.exports = router;
