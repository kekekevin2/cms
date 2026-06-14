/**
 * One-time script to fix users with empty role that should be college_department.
 * Run with: node backend/scripts/fix-college-department-role.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../models");

async function fix() {
  try {
    await db.sequelize.authenticate();
    console.log("Connected to database.");

    // Sync to ensure the ENUM column has college_department added
    await db.sequelize.sync({ alter: true });
    console.log("Schema synced.");

    // Find all CollegeDepartments that have a user_id
    const records = await db.CollegeDepartment.findAll({
      where: db.Sequelize.where(db.Sequelize.col("user_id"), "!=", null),
    });

    console.log(
      `Found ${records.length} college department records with user_id.`,
    );

    for (const record of records) {
      const [updated] = await db.sequelize.query(
        `UPDATE users SET role = 'college_department' WHERE user_id = ? AND (role = '' OR role IS NULL)`,
        { replacements: [record.user_id] },
      );
      console.log(
        `user_id ${record.user_id} — updated: ${updated.affectedRows ?? updated}`,
      );
    }

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fix();
