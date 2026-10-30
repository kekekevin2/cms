// Migration to add government_id_place_issued to personal_data_sheets, for the "Date/Place of
// Issuance" row of the Government Issued ID box on page 4 of CS Form 212 (the date already had a column).
// Run: node backend/migrations/add-government-id-place-issued-to-pds.js

const db = require('../models');
const { sequelize } = db;

async function addGovernmentIdPlaceIssued() {
  try {
    console.log('Starting migration: Adding government_id_place_issued...');

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'personal_data_sheets'
      AND TABLE_SCHEMA = DATABASE()
    `);

    const existingColumns = columns.map((col) => col.COLUMN_NAME);

    if (!existingColumns.includes('government_id_place_issued')) {
      await sequelize.query(`
        ALTER TABLE personal_data_sheets
        ADD COLUMN government_id_place_issued VARCHAR(255) NULL
        COMMENT 'Place of issuance of the government issued ID'
        AFTER government_id_date_issued
      `);
      console.log('✓ Added government_id_place_issued column');
    } else {
      console.log('⊘ government_id_place_issued column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addGovernmentIdPlaceIssued();
