const { dbConfig } = require("../config/db.config.js");
const mysql = require("mysql2/promise");

async function runMigration() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB,
    });

    console.log("Connected to database");

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'organization_advisers'
    `, [dbConfig.DB]);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (!existingColumns.includes('length_of_service')) {
      console.log("Adding 'length_of_service' column...");
      await connection.query(`
        ALTER TABLE organization_advisers 
        ADD COLUMN length_of_service VARCHAR(50) NULL 
        COMMENT 'Length of service as org adviser (e.g., 2025-2026)'
      `);
      console.log("✓ Added 'length_of_service' column");
    } else {
      console.log("✓ 'length_of_service' column already exists");
    }

    console.log("\n✅ Migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
