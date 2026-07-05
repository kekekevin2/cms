const db = require("../models");

async function migrate() {
  try {
    console.log("Adding file_path to organization_bulk_uploads...");
    await db.sequelize.query(`
      ALTER TABLE organization_bulk_uploads 
      ADD COLUMN IF NOT EXISTS file_path VARCHAR(500) NULL COMMENT 'Stored path of the uploaded Excel/CSV file';
    `);
    console.log("✓ Added file_path column");

    console.log("Adding upload_id to organization_members...");
    await db.sequelize.query(`
      ALTER TABLE organization_members 
      ADD COLUMN IF NOT EXISTS upload_id INT NULL COMMENT 'Links member to the bulk upload record it came from (for analytics)';
    `);
    console.log("✓ Added upload_id column");

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
