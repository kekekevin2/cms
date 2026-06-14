const express = require("express");
const router = express.Router();
const campusController = require("../controllers/campus.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("superadmin"));

router.get("/", campusController.getCampuses);
router.get("/:id", campusController.getCampus);
router.post("/", campusController.createCampus);
router.put("/:id", campusController.updateCampus);
router.delete("/:id", campusController.deleteCampus);

module.exports = router;
