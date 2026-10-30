// Run from backend: node migrations/add-designation-to-faculties.js
async function addDesignation(queryInterface, Sequelize) {
  const columns = await queryInterface.describeTable("faculties");
  if (!columns.designation) {
    await queryInterface.addColumn("faculties", "designation", {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Designation assigned by the college department",
    });
    return true;
  }
  return false;
}

module.exports = { addDesignation };

if (require.main === module) {
  const db = require("../models");
  db.sequelize.options.logging = false;
  addDesignation(db.sequelize.getQueryInterface(), db.Sequelize)
    .then((added) => console.log(added ? "Added faculty designation column." : "Faculty designation column already exists."))
    .catch((error) => {
      console.error("Designation migration failed:", error.message);
      process.exitCode = 1;
    })
    .finally(() => db.sequelize.close());
}
