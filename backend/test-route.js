require("dotenv").config();
const express = require("express");
const db = require("./models");
const verifyToken = require("./middleware/auth.middleware");

const app = express();

// Middleware
app.use(express.json());

// Test the academic years route EXACTLY as it's implemented
app.get("/api/academic-years", verifyToken, async (req, res) => {
  try {
    console.log("Academic Years Route Hit!");
    console.log("User:", req.user);
    
    const academicYears = await db.AcademicYear.findAll({
      order: [["year_start", "DESC"]],
    });
    
    console.log(`Found ${academicYears.length} academic years`);
    academicYears.forEach(year => {
      console.log(`  - ${year.year_start}-${year.year_end}`);
    });
    
    res.json({ academicYears });
  } catch (error) {
    console.error("Get academic years error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log("Try: GET http://localhost:3001/api/academic-years");
  console.log("(Requires valid JWT token in Authorization header)");
});
