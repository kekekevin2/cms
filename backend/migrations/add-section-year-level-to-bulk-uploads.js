const db = require("../models");

async function migrate() {
  try {
    console.log("Adding section and year_level columns to organization_bulk_uploads table...");

    // Add section column
    await db.sequelize.query(`
      ALTER TABLE organization_bulk_uploads 
      ADD COLUMN IF NOT EXISTS section VARCHAR(50) NULL COMMENT 'Section for the uploaded members';
    `);
    console.log("✓ Added section column");

    // Add year_level column
    await db.sequelize.query(`
      ALTER TABLE organization_bulk_uploads 
      ADD COLUMN IF NOT EXISTS year_level VARCHAR(20) NULL COMMENT 'Year level for the uploaded members';
    `);
    console.log("✓ Added year_level column");

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
