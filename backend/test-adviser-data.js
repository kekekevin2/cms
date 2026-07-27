const { dbConfig } = require("./config/db.config.js");
const mysql = require("mysql2/promise");

async function testAdviserData() {
	let connection;

	try {
		connection = await mysql.createConnection({
			host: dbConfig.HOST,
			user: dbConfig.USER,
			password: dbConfig.PASSWORD,
			database: dbConfig.DB,
		});

		console.log("✓ Connected to database\n");

		// Check faculties table structure
		console.log("=== FACULTIES TABLE STRUCTURE ===");
		const [columns] = await connection.query(
			`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'faculties'
      ORDER BY ORDINAL_POSITION
    `,
			[dbConfig.DB],
		);

		console.log("Columns in faculties table:");
		columns.forEach((col) => {
			console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
		});

		// Check if our new columns exist
		const newColumns = [
			"academic_rank",
			"employment_status",
			"educational_attainment",
			"campus",
			"telephone_number",
			"birth_date",
			"age",
			"civil_status",
			"home_address",
			"photo_url",
			"signature_url",
		];

		console.log("\n=== CHECKING NEW COLUMNS ===");
		newColumns.forEach((colName) => {
			const exists = columns.some((col) => col.COLUMN_NAME === colName);
			console.log(`  ${exists ? "✓" : "✗"} ${colName}`);
		});

		// Get sample faculty data with the new columns
		console.log("\n=== SAMPLE FACULTY DATA ===");
		const [faculties] = await connection.query(`
      SELECT faculty_id, first_name, last_name, academic_rank, employment_status, 
             educational_attainment, campus, telephone_number, birth_date, age, 
             civil_status, home_address, photo_url, signature_url
      FROM faculties 
      LIMIT 1
    `);

		if (faculties.length > 0) {
			console.log("Sample faculty record:");
			console.log(JSON.stringify(faculties[0], null, 2));
		} else {
			console.log("No faculty records found");
		}

		// Check organization_advisers table
		console.log("\n=== ORGANIZATION ADVISERS ===");
		const [advisers] = await connection.query(`
      SELECT oa.adviser_id, oa.organization_id, oa.faculty_id, oa.is_active, oa.length_of_service,
             f.first_name, f.last_name, f.academic_rank, f.employment_status, f.campus,
             f.telephone_number, f.birth_date, f.age, f.civil_status, f.home_address
      FROM organization_advisers oa
      JOIN faculties f ON oa.faculty_id = f.faculty_id
      WHERE oa.is_active = 1
      LIMIT 1
    `);

		if (advisers.length > 0) {
			console.log("Sample active adviser:");
			console.log(JSON.stringify(advisers[0], null, 2));
		} else {
			console.log("No active advisers found");
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
		console.error(error);
	} finally {
		if (connection) {
			await connection.end();
		}
	}
}

testAdviserData();
