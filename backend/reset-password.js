const db = require("./models");
const bcrypt = require("bcrypt");

async function resetPassword() {
  try {
    const email = '23-33908@g.batstate-u.edu.ph';
    const newPassword = 'ot!jT4H9hP3!'; // Set your password here
    
    console.log(`🔄 Resetting password for: ${email}`);
    
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      console.log("❌ User not found!");
      process.exit(1);
    }
    
    console.log("✅ User found, hashing new password...");
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log("💾 Updating password in database...");
    await user.update({ password: hashedPassword });
    
    console.log("✅ Password updated successfully!");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${newPassword}`);
    console.log(`🔐 Hash: ${hashedPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

db.sequelize.authenticate()
  .then(() => {
    console.log("✅ Database connected!");
    return resetPassword();
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });
