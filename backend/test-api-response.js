// Test what the actual API endpoint returns
const db = require("./models");

async function testAPIResponse() {
  try {
    console.log("=== Testing getAdvisers Logic ===\n");

    // Simulate finding an organization (use org_id 1 for testing)
    const organization = await db.Organization.findOne({
      where: { organization_id: 1 }
    });

    if (!organization) {
      console.log("No organization found with ID 1");
      return;
    }

    console.log("Found organization:", organization.organization_name);

    // Get advisers exactly as the controller does
    const advisers = await db.OrganizationAdviser.findAll({
      where: {
        organization_id: organization.organization_id,
        is_active: true,
      },
      include: [
        {
          model: db.Faculty,
          as: "Faculty",
          required: false,
          attributes: [
            "faculty_id",
            "employee_id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "contact_number",
            "department",
            "position_level",
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
            "signature_url"
          ],
        },
      ],
      order: [["assigned_date", "ASC"]],
    });

    console.log(`\nFound ${advisers.length} active adviser(s)`);

    if (advisers.length > 0) {
      console.log("\n=== FIRST ADVISER DATA ===");
      const adviser = advisers[0].toJSON();
      console.log(JSON.stringify(adviser, null, 2));

      console.log("\n=== CHECKING SPECIFIC FIELDS ===");
      const faculty = adviser.Faculty;
      if (faculty) {
        console.log("academic_rank:", faculty.academic_rank || "NULL");
        console.log("employment_status:", faculty.employment_status || "NULL");
        console.log("educational_attainment:", faculty.educational_attainment || "NULL");
        console.log("campus:", faculty.campus || "NULL");
        console.log("telephone_number:", faculty.telephone_number || "NULL");
        console.log("birth_date:", faculty.birth_date || "NULL");
        console.log("age:", faculty.age || "NULL");
        console.log("civil_status:", faculty.civil_status || "NULL");
        console.log("home_address:", faculty.home_address || "NULL");
        console.log("photo_url:", faculty.photo_url || "NULL");
        console.log("signature_url:", faculty.signature_url || "NULL");
      }

      console.log("\nlength_of_service:", adviser.length_of_service || "NULL");
    }

    await db.sequelize.close();
    console.log("\n✅ Test completed");

  } catch (error) {
    console.error(" Error:", error);
    console.error(error.stack);
  }
}

testAPIResponse();
