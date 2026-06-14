const express = require("express");
const router = express.Router();
const deanFacultyController = require("../controllers/dean-faculty.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

router.get("/", deanFacultyController.getFaculty);
router.get("/disabled", deanFacultyController.getDisabledFaculty);
router.post("/", deanFacultyController.createFaculty);
router.put("/:id", deanFacultyController.updateFaculty);
router.put("/:id/disable", deanFacultyController.disableFaculty);
router.put("/:id/restore", deanFacultyController.restoreFaculty);
router.delete("/:id", deanFacultyController.permanentlyDeleteFaculty);
router.post("/:id/reset-password", deanFacultyController.resetFacultyPassword);
router.get("/:facultyId/profile", deanFacultyController.getFacultyFullProfile);

module.exports = router;
