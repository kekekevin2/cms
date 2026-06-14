const express = require("express");
const router = express.Router();
const departmentController = require("../controllers/department.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("superadmin"));

router.get("/", departmentController.getDepartments);
router.get("/:id", departmentController.getDepartment);
router.post("/", departmentController.createDepartment);
router.put("/:id", departmentController.updateDepartment);
router.delete("/:id", departmentController.deleteDepartment);

module.exports = router;
