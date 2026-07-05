// Migration to add officer profile fields to organization_members table
// Run: node backend/migrations/add-officer-profile-fields.js

const db = require('../models');
const { sequelize } = db;

async function addOfficerProfileFields() {
  try {
    console.log('Starting migration: Adding officer profile fields...');

    // Check if columns already exist before adding
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'organization_members' 
      AND TABLE_SCHEMA = DATABASE()
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    // Add course field
    if (!existingColumns.includes('course')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN course VARCHAR(255) NULL 
        COMMENT 'Student course/program (e.g., BACHELOR OF COMPUTER ENGINEERING TECHNOLOGY)'
      `);
      console.log('✓ Added course column');
    } else {
      console.log('⊘ course column already exists');
    }

    // Add gwa field
    if (!existingColumns.includes('gwa')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN gwa VARCHAR(10) NULL 
        COMMENT 'Grade Weighted Average (e.g., 1.8152)'
      `);
      console.log('✓ Added gwa column');
    } else {
      console.log('⊘ gwa column already exists');
    }

    // Add campus field
    if (!existingColumns.includes('campus')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN campus VARCHAR(100) NULL 
        COMMENT 'Campus location (e.g., LIPA CAMPUS)'
      `);
      console.log('✓ Added campus column');
    } else {
      console.log('⊘ campus column already exists');
    }

    // Add telephone_number field
    if (!existingColumns.includes('telephone_number')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN telephone_number VARCHAR(20) NULL 
        COMMENT 'Landline telephone number'
      `);
      console.log('✓ Added telephone_number column');
    } else {
      console.log('⊘ telephone_number column already exists');
    }

    // Add birth_date field
    if (!existingColumns.includes('birth_date')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN birth_date DATE NULL 
        COMMENT 'Date of birth'
      `);
      console.log('✓ Added birth_date column');
    } else {
      console.log('⊘ birth_date column already exists');
    }

    // Add age field
    if (!existingColumns.includes('age')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN age VARCHAR(50) NULL 
        COMMENT 'Age in text format (e.g., 18 YEARS OLD)'
      `);
      console.log('✓ Added age column');
    } else {
      console.log('⊘ age column already exists');
    }

    // Add civil_status field
    if (!existingColumns.includes('civil_status')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN civil_status ENUM('SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED') NULL 
        COMMENT 'Civil/marital status'
      `);
      console.log('✓ Added civil_status column');
    } else {
      console.log('⊘ civil_status column already exists');
    }

    // Add home_address field
    if (!existingColumns.includes('home_address')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN home_address TEXT NULL 
        COMMENT 'Complete home address'
      `);
      console.log('✓ Added home_address column');
    } else {
      console.log('⊘ home_address column already exists');
    }

    // Add signature_url field
    if (!existingColumns.includes('signature_url')) {
      await sequelize.query(`
        ALTER TABLE organization_members 
        ADD COLUMN signature_url VARCHAR(500) NULL 
        COMMENT 'Path to uploaded e-signature image'
      `);
      console.log('✓ Added signature_url column');
    } else {
      console.log('⊘ signature_url column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addOfficerProfileFields();
