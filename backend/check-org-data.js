const { dbConfig } = require("./config/db.config.js");
const mysql = require("mysql2/promise");

async function checkData() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD,
      database: dbConfig.DB,
    });

    console.log("=== ORGANIZATIONS ===");
    const [orgs] = await connection.query(`
      SELECT organization_id, organization_name, department 
      FROM organizations 
      LIMIT 5
    `);
    console.log(`Found ${orgs.length} organizations:`);
    orgs.forEach(org => {
      console.log(`  ID ${org.organization_id}: ${org.organization_name} (${org.department})`);
    });

    if (orgs.length > 0) {
      const orgId = orgs[0].organization_id;
      console.log(`\n=== ADVISERS FOR ORG ${orgId} ===`);
      const [advisers] = await connection.query(`
        SELECT oa.adviser_id, oa.is_active, oa.length_of_service,
               f.faculty_id, f.first_name, f.last_name,
               f.academic_rank, f.employment_status, f.campus,
               f.telephone_number, f.birth_date, f.age, f.civil_status
        FROM organization_advisers oa
        JOIN faculties f ON oa.faculty_id = f.faculty_id
        WHERE oa.organization_id = ?
      `, [orgId]);
      
      if (advisers.length > 0) {
        console.log(`Found ${advisers.length} adviser(s):`);
        advisers.forEach((adv, i) => {
          console.log(`\nAdviser ${i+1}:`);
          console.log(`  Faculty: ${adv.first_name} ${adv.last_name}`);
          console.log(`  Active: ${adv.is_active}`);
          console.log(`  Academic Rank: ${adv.academic_rank || 'NULL'}`);
          console.log(`  Employment Status: ${adv.employment_status || 'NULL'}`);
          console.log(`  Campus: ${adv.campus || 'NULL'}`);
          console.log(`  Telephone: ${adv.telephone_number || 'NULL'}`);
          console.log(`  Birth Date: ${adv.birth_date || 'NULL'}`);
          console.log(`  Age: ${adv.age || 'NULL'}`);
          console.log(`  Civil Status: ${adv.civil_status || 'NULL'}`);
          console.log(`  Length of Service: ${adv.length_of_service || 'NULL'}`);
        });
      } else {
        console.log("No advisers found");
      }
    }

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkData();
