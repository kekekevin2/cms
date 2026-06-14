const express = require("express");
const router = express.Router();
const db = require("../models");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const Campus = db.Campus;
const Department = db.Department;

// Profile picture storage
const profilePicDir = path.join(__dirname, "../uploads/profile-pictures");
if (!fs.existsSync(profilePicDir))
  fs.mkdirSync(profilePicDir, { recursive: true });

const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilePicDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `dept-${req.user.user_id}-${Date.now()}${ext}`);
  },
});
const uploadProfilePic = multer({
  storage: profilePicStorage,
  fileFilter: (req, file, cb) => {
    if (
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.mimetype,
      )
    )
      cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(verifyToken);
router.use(checkRole("college_department"));

// GET /api/college-department/profile
router.get("/profile", async (req, res) => {
  try {
    const record = await db.CollegeDepartment.findOne({
      where: { user_id: req.user.user_id },
      include: [
        {
          model: Campus,
          as: "campus",
          attributes: ["campus_id", "campus_name"],
        },
        {
          model: Department,
          as: "department",
          attributes: ["department_id", "department_name", "acronym"],
        },
      ],
    });

    if (!record) {
      return res
        .status(404)
        .json({ message: "College department profile not found" });
    }

    res.json({ record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load profile" });
  }
});

// PUT /api/college-department/profile
router.put("/profile", async (req, res) => {
  try {
    const record = await db.CollegeDepartment.findOne({
      where: { user_id: req.user.user_id },
    });

    if (!record) {
      return res
        .status(404)
        .json({ message: "College department profile not found" });
    }

    const {
      dean_name,
      contact_number,
      about,
      goal,
      why_batstateu,
      peos,
      programs,
      career_opportunities,
      program_outcomes,
    } = req.body;

    await record.update({
      dean_name: dean_name !== undefined ? dean_name : record.dean_name,
      contact_number:
        contact_number !== undefined ? contact_number : record.contact_number,
      about: about !== undefined ? about : record.about,
      goal: goal !== undefined ? goal : record.goal,
      why_batstateu:
        why_batstateu !== undefined ? why_batstateu : record.why_batstateu,
      peos: peos !== undefined ? JSON.stringify(peos) : record.peos,
      programs:
        programs !== undefined ? JSON.stringify(programs) : record.programs,
      career_opportunities:
        career_opportunities !== undefined
          ? JSON.stringify(career_opportunities)
          : record.career_opportunities,
      program_outcomes:
        program_outcomes !== undefined
          ? JSON.stringify(program_outcomes)
          : record.program_outcomes,
    });

    res.json({ message: "Profile updated successfully", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// POST /api/college-department/profile/picture
router.post(
  "/profile/picture",
  uploadProfilePic.single("profile_picture"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const record = await db.CollegeDepartment.findOne({
        where: { user_id: req.user.user_id },
      });
      if (!record)
        return res.status(404).json({ message: "Profile not found" });

      // Delete old picture if exists
      if (record.profile_picture) {
        const oldPath = path.join(__dirname, "..", record.profile_picture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const relativePath = `/uploads/profile-pictures/${req.file.filename}`;
      await record.update({ profile_picture: relativePath });

      res.json({
        message: "Profile picture updated",
        profile_picture: relativePath,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to upload picture" });
    }
  },
);

module.exports = router;
