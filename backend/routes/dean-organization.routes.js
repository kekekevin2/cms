const express = require("express");
const router = express.Router();
const deanOrganizationController = require("../controllers/dean-organization.controller");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");

router.use(verifyToken);
router.use(checkRole("dean", "college_department"));

router.get("/", deanOrganizationController.getOrganizations);
router.post("/", deanOrganizationController.createOrganization);
router.put("/:id", deanOrganizationController.updateOrganization);
router.delete("/:id", deanOrganizationController.deleteOrganization);
router.post("/:id/assign-adviser", deanOrganizationController.assignAdviser);
router.delete("/:id/remove-adviser", deanOrganizationController.removeAdviser);
router.post(
  "/:id/reset-password",
  deanOrganizationController.resetOrganizationPassword,
);

module.exports = router;
