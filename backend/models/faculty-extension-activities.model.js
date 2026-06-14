module.exports = (sequelize, Sequelize) => {
  const FacultyExtensionActivities = sequelize.define(
    "faculty_extension_activities",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      faculty_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      extension_title: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      date_of_implementation: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      beneficiary: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      documentation_file: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: "faculty_extension_activities",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultyExtensionActivities;
};
