const db = require("./models");

async function testUserQuery() {
  try {
    console.log("🔍 Testing user query...");
    
    // Test 1: Find all users
    const allUsers = await db.User.findAll({
      attributes: ['user_id', 'email', 'role', 'is_active'],
      limit: 5
    });
    console.log("\n📋 All users (first 5):");
    console.log(JSON.stringify(allUsers, null, 2));
    
    // Test 2: Find specific user
    const testEmail = '23-33908@g.batstate-u.edu.ph';
    console.log(`\n🔍 Looking for user: ${testEmail}`);
    const user = await db.User.findOne({ 
      where: { email: testEmail },
      raw: true
    });
    
    if (user) {
      console.log("✅ User found:");
      console.log(JSON.stringify(user, null, 2));
      
      // Check if it's a faculty
      if (user.role === 'faculty') {
        const faculty = await db.Faculty.findOne({
          where: { user_id: user.user_id },
          raw: true
        });
        console.log("\n👤 Faculty profile:");
        console.log(JSON.stringify(faculty, null, 2));
      }
    } else {
      console.log("❌ User not found!");
      console.log("\n💡 Checking for similar emails:");
      const similar = await db.User.findAll({
        where: {
          email: {
            [db.Sequelize.Op.like]: '%23-33908%'
          }
        },
        raw: true
      });
      console.log(JSON.stringify(similar, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Connect to database and run test
db.sequelize.authenticate()
  .then(() => {
    console.log("✅ Database connected!");
    return testUserQuery();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });
