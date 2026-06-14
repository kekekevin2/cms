const express = require("express");
const router = express.Router();
const superadminDeanController = require("../controllers/superadmin-dean.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

// All routes require authentication and admin role
router.use(verifyToken);
router.use(checkRole("admin", "superadmin"));

// Get all deans with pagination
router.get("/", superadminDeanController.getDeans);

// Create dean
router.post("/", superadminDeanController.createDean);

// Update dean
router.put("/:id", superadminDeanController.updateDean);

// Delete dean
router.delete("/:id", superadminDeanController.deleteDean);

module.exports = router;
