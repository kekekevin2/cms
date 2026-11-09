const router = require("express").Router();
const controller = require("../controllers/public-department.controller");

// Always re-read the saved profile, including newly signed image URLs.
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

router.get("/", controller.listDepartments);
router.get("/:id", controller.getDepartmentProfile);

module.exports = router;
