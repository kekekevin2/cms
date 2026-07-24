// Migration to split home_street_subdivision into separate home_street and home_subdivision columns
// on faculty_personal_profiles, so each maps 1:1 to the PDS's separate street/subdivision fields.
// Run: node backend/migrations/add-street-subdivision-to-faculty-personal-profiles.js

const db = require('../models');
const { sequelize } = db;

async function addStreetSubdivisionColumns() {
  try {
    console.log('Starting migration: Splitting home_street_subdivision...');

    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'faculty_personal_profiles'
      AND TABLE_SCHEMA = DATABASE()
    `);

    const existingColumns = columns.map((col) => col.COLUMN_NAME);

    if (!existingColumns.includes('home_street')) {
      await sequelize.query(`
        ALTER TABLE faculty_personal_profiles
        ADD COLUMN home_street VARCHAR(150) NULL
        COMMENT 'Street/house address, separate from subdivision'
      `);
      console.log('✓ Added home_street column');
    } else {
      console.log('⊘ home_street column already exists');
    }

    if (!existingColumns.includes('home_subdivision')) {
      await sequelize.query(`
        ALTER TABLE faculty_personal_profiles
        ADD COLUMN home_subdivision VARCHAR(150) NULL
        COMMENT 'Subdivision/village, separate from street'
      `);
      console.log('✓ Added home_subdivision column');
    } else {
      console.log('⊘ home_subdivision column already exists');
    }

    // Best-effort backfill: existing combined values move to home_street so nothing is lost;
    // users can split out the subdivision manually via My Profile afterwards.
    const [result] = await sequelize.query(`
      UPDATE faculty_personal_profiles
      SET home_street = home_street_subdivision
      WHERE home_street_subdivision IS NOT NULL
        AND (home_street IS NULL OR home_street = '')
    `);
    console.log(`✓ Backfilled home_street for existing rows (affected: ${result.affectedRows ?? 'n/a'})`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addStreetSubdivisionColumns();
