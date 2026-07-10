/**
 * Migration to fix department names in faculty table
 * This updates department names to match the standard department list
 */

require('dotenv').config();
const db = require('../models');

async function fixDepartmentNames() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected successfully.\n');

    // Standard department names
    const departmentMappings = [
      { pattern: /college of engineering/i, standardName: 'College of Engineering' },
      { pattern: /college of education/i, standardName: 'College of Education' },
      { pattern: /college of arts and sciences/i, standardName: 'College of Arts and Sciences' },
      { pattern: /college of business administration/i, standardName: 'College of Business Administration' },
      { pattern: /college of information technology/i, standardName: 'College of Information Technology' },
      { pattern: /college of nursing/i, standardName: 'College of Nursing' },
    ];

    console.log('Checking faculty department names...\n');

    // Get all faculty records
    const faculties = await db.Faculty.findAll();
    let updatedCount = 0;

    for (const faculty of faculties) {
      if (!faculty.department || faculty.department.trim() === '') {
        console.log(`⚠️  Faculty ${faculty.employee_id} (${faculty.first_name} ${faculty.last_name}) has no department`);
        continue;
      }

      // Check if department name needs fixing
      const mapping = departmentMappings.find(m => m.pattern.test(faculty.department));
      
      if (mapping && faculty.department !== mapping.standardName) {
        console.log(`🔄 Updating: ${faculty.employee_id} (${faculty.first_name} ${faculty.last_name})`);
        console.log(`   From: "${faculty.department}"`);
        console.log(`   To:   "${mapping.standardName}"`);

        await faculty.update({ department: mapping.standardName });
        updatedCount++;
      } else if (mapping) {
        console.log(`✓  OK: ${faculty.employee_id} - ${faculty.department}`);
      } else {
        console.log(`⚠️  Unknown department: ${faculty.employee_id} - "${faculty.department}"`);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Summary:`);
    console.log(`  Total faculty: ${faculties.length}`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`${'='.repeat(80)}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDepartmentNames();
