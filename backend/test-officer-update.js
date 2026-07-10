/**
 * Diagnostic script to test Officer update functionality
 * Run: node test-officer-update.js
 */
const db = require("./models");

async function diagnose() {
  try {
    console.log("=== OFFICER UPDATE DIAGNOSTIC ===\n");
    
    // Step 1: Check database connection
    console.log("1️⃣ Testing database connection...");
    await db.sequelize.authenticate();
    console.log("   ✅ Database connected\n");
    
    // Step 2: Check table columns
    console.log("2️⃣ Checking organization_members table columns...");
    const [columns] = await db.sequelize.query(
      "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organization_members' ORDER BY ORDINAL_POSITION"
    );
    
    const columnNames = columns.map(c => c.COLUMN_NAME);
    console.log("   Total columns:", columnNames.length);
    
    const requiredColumns = ['course', 'gwa', 'campus', 'telephone_number', 'birth_date', 'age', 'civil_status', 'home_address', 'signature_url'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log("   ❌ MISSING COLUMNS:", missingColumns.join(', '));
      console.log("   ⚠️  You need to run the migration: node migrations/add-officer-profile-fields-to-members.js");
      process.exit(1);
    } else {
      console.log("   ✅ All required columns exist");
    }
    
    // Show column types for the newer fields
    console.log("   Column details:");
    requiredColumns.forEach(colName => {
      const col = columns.find(c => c.COLUMN_NAME === colName);
      if (col) {
        console.log(`     ${colName}: ${col.COLUMN_TYPE}`);
      }
    });
    
    // Also check year_level column type
    const yearLevelCol = columns.find(c => c.COLUMN_NAME === 'year_level');
    if (yearLevelCol) {
      console.log(`     year_level: ${yearLevelCol.COLUMN_TYPE}`);
    }
    console.log();
    
    // Step 3: Find a test member
    console.log("3️⃣ Finding a test officer...");
    const member = await db.OrganizationMember.findOne({
      where: { 
        is_active: true,
        position: { [db.Sequelize.Op.ne]: 'Member' }
      },
      order: [['member_id', 'DESC']]
    });
    
    if (!member) {
      console.log("   ❌ No active officers found in the database");
      process.exit(1);
    }
    
    console.log("   ✅ Found officer:", {
      member_id: member.member_id,
      name: `${member.first_name} ${member.last_name}`,
      position: member.position,
      campus: member.campus,
      course: member.course,
      gwa: member.gwa,
    });
    console.log();
    
    // Step 4: Test basic field update
    console.log("4️⃣ Testing basic field update (first_name)...");
    const originalName = member.first_name;
    const testName = originalName + "_TEST";
    
    try {
      await member.update({ first_name: testName });
      console.log("   ✅ update() call succeeded");
      
      // Verify by re-reading from DB
      const reloaded = await db.OrganizationMember.findByPk(member.member_id);
      if (reloaded.first_name === testName) {
        console.log("   ✅ Change persisted in DB! first_name =", reloaded.first_name);
      } else {
        console.log("   ❌ Change NOT persisted! first_name still =", reloaded.first_name);
        console.log("   ⚠️  This indicates a fundamental Sequelize/DB issue");
      }
      
      // Restore original
      await member.update({ first_name: originalName });
      console.log("   ✅ Restored original name");
    } catch (err) {
      console.log("   ❌ update() THREW AN ERROR:", err.message);
      if (err.original) {
        console.log("   SQL Error:", err.original.message);
        console.log("   SQL:", err.sql);
      }
    }
    console.log();
    
    // Step 5: Test newer column update (campus)
    console.log("5️⃣ Testing newer field update (campus)...");
    const originalCampus = member.campus;
    const testCampus = "DIAGNOSTIC_TEST_" + Date.now();
    
    try {
      await member.update({ campus: testCampus });
      console.log("   ✅ update() call succeeded");
      
      // Verify by re-reading from DB
      const reloaded = await db.OrganizationMember.findByPk(member.member_id);
      if (reloaded.campus === testCampus) {
        console.log("   ✅ Change persisted in DB! campus =", reloaded.campus);
      } else {
        console.log("   ❌ Change NOT persisted! campus =", reloaded.campus);
        console.log("   ⚠️  The campus column may not exist in the DB, or Sequelize is ignoring it");
      }
      
      // Restore original
      await member.update({ campus: originalCampus || null });
      console.log("   ✅ Restored original campus value");
    } catch (err) {
      console.log("   ❌ update() THREW AN ERROR:", err.message);
      if (err.original) {
        console.log("   SQL Error:", err.original.message);
        console.log("   SQL:", err.sql);
      }
    }
    console.log();
    
    // Step 6: Test a full update similar to what the controller does
    console.log("6️⃣ Testing full update (simulating controller behavior)...");
    const testData = {
      first_name: member.first_name,
      middle_name: member.middle_name || null,
      last_name: member.last_name,
      email: member.email || null,
      contact_number: member.contact_number || null,
      year_level: null,  // Simulating empty year_level
      position: member.position || null,
      parent_member_id: null,
      term_end_date: null,
      is_active: true,
      photo_url: member.photo_url,
      signature_url: member.signature_url,
      course: "DIAGNOSTIC_COURSE_TEST",
      gwa: "1.5",
      campus: "DIAGNOSTIC_CAMPUS_TEST",
      telephone_number: "09171234567",
      birth_date: null,
      age: "20",
      civil_status: "SINGLE",
      home_address: "123 Test Street",
    };
    
    try {
      console.log("   Sending update data:", JSON.stringify(testData, null, 2));
      await member.update(testData);
      console.log("   ✅ Full update() call succeeded");
      
      // Verify
      const reloaded = await db.OrganizationMember.findByPk(member.member_id);
      console.log("   Verification - fields after update:");
      console.log("     course:", reloaded.course);
      console.log("     gwa:", reloaded.gwa);
      console.log("     campus:", reloaded.campus);
      console.log("     telephone_number:", reloaded.telephone_number);
      console.log("     age:", reloaded.age);
      console.log("     civil_status:", reloaded.civil_status);
      console.log("     home_address:", reloaded.home_address);
      
      if (reloaded.campus === "DIAGNOSTIC_CAMPUS_TEST") {
        console.log("\n   ✅✅✅ FULL UPDATE WORKS! The issue is NOT in the database or Sequelize.");
        console.log("   The problem is likely in the frontend form data binding or API request.");
      } else {
        console.log("\n   ❌ FULL UPDATE FAILED to persist. DB or Sequelize issue detected.");
      }
      
      // Restore original values
      await member.update({
        course: originalCampus ? member.course : null,
        gwa: member.gwa || null,
        campus: originalCampus || null,
        telephone_number: member.telephone_number || null,
        age: member.age || null,
        civil_status: member.civil_status || null,
        home_address: member.home_address || null,
      });
      console.log("   ✅ Restored original values");
      
    } catch (err) {
      console.log("   ❌ Full update THREW AN ERROR:", err.message);
      if (err.original) {
        console.log("   SQL Error:", err.original.message);
        console.log("   SQL:", err.sql);
      }
      if (err.errors) {
        err.errors.forEach(e => {
          console.log("   Validation Error:", e.message, "on field:", e.path);
        });
      }
    }
    console.log();
    
    // Step 7: Test raw SQL update to bypass Sequelize
    console.log("7️⃣ Testing raw SQL update (bypassing Sequelize)...");
    try {
      const [results] = await db.sequelize.query(
        `UPDATE organization_members SET campus = 'RAW_SQL_TEST' WHERE member_id = ?`,
        { replacements: [member.member_id] }
      );
      console.log("   ✅ Raw SQL update succeeded. Affected rows:", results.affectedRows);
      
      // Verify
      const [rows] = await db.sequelize.query(
        `SELECT campus FROM organization_members WHERE member_id = ?`,
        { replacements: [member.member_id] }
      );
      console.log("   DB value after raw SQL:", rows[0]?.campus);
      
      if (rows[0]?.campus === 'RAW_SQL_TEST') {
        console.log("   ✅ Raw SQL works - the column exists and is writable");
      }
      
      // Restore
      await db.sequelize.query(
        `UPDATE organization_members SET campus = ? WHERE member_id = ?`,
        { replacements: [originalCampus || null, member.member_id] }
      );
      console.log("   ✅ Restored original value");
    } catch (err) {
      console.log("   ❌ Raw SQL FAILED:", err.message);
      console.log("   ⚠️  This means the column does NOT exist in the database!");
      console.log("   ⚠️  Run: node migrations/add-officer-profile-fields-to-members.js");
    }
    
    console.log("\n=== DIAGNOSTIC COMPLETE ===");
    
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

diagnose();
