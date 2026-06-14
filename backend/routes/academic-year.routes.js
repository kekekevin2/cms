const express = require("express");
const router = express.Router();
const academicYearController = require("../controllers/academic-year.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("superadmin"));

router.get("/", academicYearController.getAcademicYears);
router.get("/:id", academicYearController.getAcademicYear);
router.post("/", academicYearController.createAcademicYear);
router.put("/:id", academicYearController.updateAcademicYear);
router.delete("/:id", academicYearController.deleteAcademicYear);

module.exports = router;
