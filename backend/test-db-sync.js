require("dotenv").config();
const db = require("./models");

console.log("Testing database connection and table creation...");

db.sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database connection successful!");
    console.log("Creating tables with { force: true }...");
    return db.sequelize.sync({ force: true });
  })
  .then(() => {
    console.log("✅ All tables created successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Database error:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  });
