const bcrypt = require('bcrypt');
const db = require('./models');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetPassword() {
  try {
    const email = 'historybytes56@gmail.com';
    
    // Prompt for new password
    const newPassword = await new Promise((resolve) => {
      rl.question('Enter new password (or press Enter for default "NewPassword123"): ', (answer) => {
        resolve(answer.trim() || 'NewPassword123');
      });
    });
    
    rl.close();
    
    console.log('🔍 Finding user...');
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      console.log(' User not found');
      process.exit(1);
    }
    
    console.log('✓ User found:', user.email);
    console.log('🔐 Hashing new password...');
    console.log('   Password to hash:', newPassword);
    console.log('   Password length:', newPassword.length);
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('   Generated hash:', hashedPassword.substring(0, 20) + '...');
    
    console.log('💾 Updating password in database...');
    await user.update({ password: hashedPassword });
    
    // Verify the hash works
    console.log('🧪 Testing the new hash...');
    const testResult = await bcrypt.compare(newPassword, hashedPassword);
    console.log('   Hash verification test:', testResult ? '✓ PASSED' : '✗ FAILED');
    
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('=================================');
    console.log('NEW LOGIN CREDENTIALS:');
    console.log('Email:', email);
    console.log('Password:', newPassword);
    console.log('=================================');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after logging in!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
