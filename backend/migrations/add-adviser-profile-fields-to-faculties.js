const { dbConfig } = require("../config/db.config.js");
const mysql = require("mysql2/promise");

async function runMigration() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB,
    });

    console.log("Connected to database");

    // Check if columns already exist
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'faculties'
    `, [dbConfig.DB]);

    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log("Existing columns in faculties table:", existingColumns.length);

    // Add academic_rank column if it doesn't exist
    if (!existingColumns.includes('academic_rank')) {
      console.log("Adding 'academic_rank' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN academic_rank VARCHAR(100) NULL 
        COMMENT 'Academic rank (e.g., ASSOC. PROF. III, PROFESSOR I, etc.)'
      `);
      console.log("✓ Added 'academic_rank' column");
    } else {
      console.log("✓ 'academic_rank' column already exists");
    }

    // Add employment_status column if it doesn't exist
    if (!existingColumns.includes('employment_status')) {
      console.log("Adding 'employment_status' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN employment_status VARCHAR(100) NULL 
        COMMENT 'Employment status (e.g., PERMANENT FACULTY, TEMPORARY, etc.)'
      `);
      console.log("✓ Added 'employment_status' column");
    } else {
      console.log("✓ 'employment_status' column already exists");
    }

    // Add educational_attainment column if it doesn't exist
    if (!existingColumns.includes('educational_attainment')) {
      console.log("Adding 'educational_attainment' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN educational_attainment VARCHAR(255) NULL 
        COMMENT 'Educational attainment course (e.g., PhD IN DEVELOPMENT ADMINISTRATION)'
      `);
      console.log("✓ Added 'educational_attainment' column");
    } else {
      console.log("✓ 'educational_attainment' column already exists");
    }

    // Add campus column if it doesn't exist
    if (!existingColumns.includes('campus')) {
      console.log("Adding 'campus' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN campus VARCHAR(100) NULL 
        COMMENT 'Campus location (e.g., LIPA CAMPUS)'
      `);
      console.log("✓ Added 'campus' column");
    } else {
      console.log("✓ 'campus' column already exists");
    }

    // Add telephone_number column if it doesn't exist
    if (!existingColumns.includes('telephone_number')) {
      console.log("Adding 'telephone_number' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN telephone_number VARCHAR(20) NULL 
        COMMENT 'Landline telephone number'
      `);
      console.log("✓ Added 'telephone_number' column");
    } else {
      console.log("✓ 'telephone_number' column already exists");
    }

    // Add birth_date column if it doesn't exist
    if (!existingColumns.includes('birth_date')) {
      console.log("Adding 'birth_date' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN birth_date DATE NULL 
        COMMENT 'Date of birth'
      `);
      console.log("✓ Added 'birth_date' column");
    } else {
      console.log("✓ 'birth_date' column already exists");
    }

    // Add age column if it doesn't exist
    if (!existingColumns.includes('age')) {
      console.log("Adding 'age' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN age INT NULL 
        COMMENT 'Age in years'
      `);
      console.log("✓ Added 'age' column");
    } else {
      console.log("✓ 'age' column already exists");
    }

    // Add civil_status column if it doesn't exist
    if (!existingColumns.includes('civil_status')) {
      console.log("Adding 'civil_status' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN civil_status ENUM('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED', 'Single', 'Married', 'Widowed', 'Separated') NULL 
        COMMENT 'Civil/marital status'
      `);
      console.log("✓ Added 'civil_status' column");
    } else {
      console.log("✓ 'civil_status' column already exists");
    }

    // Add home_address column if it doesn't exist
    if (!existingColumns.includes('home_address')) {
      console.log("Adding 'home_address' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN home_address TEXT NULL 
        COMMENT 'Complete home address'
      `);
      console.log("✓ Added 'home_address' column");
    } else {
      console.log("✓ 'home_address' column already exists");
    }

    // Add photo_url column if it doesn't exist
    if (!existingColumns.includes('photo_url')) {
      console.log("Adding 'photo_url' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN photo_url VARCHAR(500) NULL 
        COMMENT 'Path to faculty photo'
      `);
      console.log("✓ Added 'photo_url' column");
    } else {
      console.log("✓ 'photo_url' column already exists");
    }

    // Add signature_url column if it doesn't exist
    if (!existingColumns.includes('signature_url')) {
      console.log("Adding 'signature_url' column...");
      await connection.query(`
        ALTER TABLE faculties 
        ADD COLUMN signature_url VARCHAR(500) NULL 
        COMMENT 'Path to uploaded e-signature image'
      `);
      console.log("✓ Added 'signature_url' column");
    } else {
      console.log("✓ 'signature_url' column already exists");
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("All adviser profile fields have been added to faculties table.");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log("Database connection closed");
    }
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
