require("dotenv").config();
const db = require("./models");

async function testAcademicYears() {
  try {
    console.log("Testing Academic Years...");
    
    const academicYears = await db.AcademicYear.findAll({
      order: [["year_start", "DESC"]],
    });
    
    console.log(`Found ${academicYears.length} academic years:`);
    academicYears.forEach(year => {
      console.log(`  - ${year.year_start}-${year.year_end} (Active: ${year.is_active})`);
    });
    
    if (academicYears.length === 0) {
      console.log("\n❌ NO ACADEMIC YEARS FOUND IN DATABASE!");
      console.log("You need to create academic years in the Superadmin panel first.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testAcademicYears();
