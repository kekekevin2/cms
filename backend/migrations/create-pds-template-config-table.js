/**
 * Migration: Create pds_template_config table
 * Purpose: Store PDS template field position and layout configurations
 * Date: 2024
 */

const db = require("../models");

async function up() {
  try {
    console.log("Starting migration: create pds_template_config table");
    
    // Sync the PDSTemplateConfig model to create the table
    await db.PDSTemplateConfig.sync({ force: false });
    
    console.log("✅ Migration completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

async function down() {
  try {
    console.log("Rolling back migration: drop pds_template_config table");
    
    // Drop the table
    await db.PDSTemplateConfig.drop();
    
    console.log("✅ Rollback completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Rollback failed:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  (async () => {
    try {
      if (command === "down") {
        await down();
      } else {
        await up();
      }
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
