const express = require("express");
const router = express.Router();
const controller = require("../controllers/college-department.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("superadmin"));

router.get("/", controller.getCollegeDepartments);
router.get("/:id", controller.getCollegeDepartmentById);
router.post("/", controller.createCollegeDepartment);
router.put("/:id", controller.updateCollegeDepartment);
router.delete("/:id", controller.deleteCollegeDepartment);

module.exports = router;
