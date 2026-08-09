const db = require("./models");

async function checkDeanUser() {
  try {
    console.log('🔍 Checking logged-in user and dean records...\n');
    
    // Get the email from the error context (you're logged in)
    // Check all users with dean/college_department role
    const users = await db.User.findAll({
      where: {
        role: ['dean', 'college_department']
      },
      attributes: ['user_id', 'email', 'role', 'is_active'],
      raw: true
    });
    
    console.log('📋 Users with dean/college_department role:');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\n📋 All Dean records in database:');
    const deans = await db.Dean.findAll({
      attributes: ['dean_id', 'user_id', 'first_name', 'last_name', 'email', 'department'],
      raw: true
    });
    console.log(JSON.stringify(deans, null, 2));
    
    console.log('\n📋 All CollegeDepartment records:');
    const collegeDepts = await db.CollegeDepartment.findAll({
      attributes: ['college_department_id', 'user_id', 'name', 'email'],
      raw: true
    });
    console.log(JSON.stringify(collegeDepts, null, 2));
    
    // Check for missing links
    console.log('\n⚠️  Users WITHOUT dean/college profiles:');
    for (const user of users) {
      const hasDean = deans.some(d => d.user_id === user.user_id);
      const hasCollege = collegeDepts.some(c => c.user_id === user.user_id);
      
      if (!hasDean && !hasCollege) {
        console.log(`❌ user_id: ${user.user_id}, email: ${user.email}, role: ${user.role}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

db.sequelize.authenticate()
  .then(() => {
    console.log("✅ Database connected!");
    return checkDeanUser();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });
