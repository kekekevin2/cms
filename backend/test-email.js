require("dotenv").config();
const { sendAccountCredentials } = require("./utils/email");

async function testEmail() {
  console.log("🧪 Testing Email Configuration...\n");
  console.log("SMTP Settings:");
  console.log("  Host:", process.env.SMTP_HOST);
  console.log("  Port:", process.env.SMTP_PORT);
  console.log("  User:", process.env.SMTP_USER);
  console.log("  Pass:", process.env.SMTP_PASS ? "***" + process.env.SMTP_PASS.slice(-4) : "NOT SET");
  console.log("\n📧 Sending test email...\n");

  const result = await sendAccountCredentials(
    "diazjnet@gmail.com", // Test recipient
    "Test User",
    "TestPassword123!",
    "college_department"
  );

  if (result.success) {
    console.log("✅ Email sent successfully!");
    console.log("Message ID:", result.messageId);
  } else {
    console.log("❌ Email failed!");
    console.log("Error:", result.error);
  }

  process.exit(result.success ? 0 : 1);
}

testEmail();
