const router = require("express").Router();
const controller = require("../controllers/pds.controller");
const excelController = require("../controllers/pds-excel-export.controller");
const verifyToken = require("../middleware/auth.middleware");

// All routes require authentication
router.use(verifyToken);

// GET: Retrieve faculty's PDS
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

// GET: Export PDS to Excel
router.get("/export/excel", excelController.exportFacultyPDSToExcel);

module.exports = router;
