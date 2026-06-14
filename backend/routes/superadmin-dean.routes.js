const express = require("express");
const router = express.Router();
const deanController = require("../controllers/superadmin-dean.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and superadmin role
router.use(verifyToken);
router.use(checkRole("superadmin"));

router.get("/", deanController.getDeans);
router.post("/", deanController.createDean);
router.put("/:id", deanController.updateDean);
router.delete("/:id", deanController.deleteDean);

module.exports = router;
