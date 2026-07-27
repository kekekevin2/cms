const router = require("express").Router();
const controller = require("../controllers/pds.controller");
const verifyToken = require("../middleware/auth.middleware");

// All routes require authentication
router.use(verifyToken);

// GET: Retrieve faculty's PDS
router.get("/", controller.getPDS);

// GET: Return My Profile data mapped to PDS shape (read-only)
router.get("/from-profile", controller.getProfileAsPDS);

// POST: Create or update PDS
router.post("/", controller.savePDS);

// POST: Upload photo
router.post("/upload-photo", controller.uploadPhoto);

// POST: Upload signature
router.post("/upload-signature", controller.uploadSignature);

// POST: Submit PDS for approval
router.post("/submit", controller.submitPDS);

// POST: Overwrite PDS with My Profile data (saves to DB)
router.post("/import-from-profile", controller.importFromProfile);

module.exports = router;
