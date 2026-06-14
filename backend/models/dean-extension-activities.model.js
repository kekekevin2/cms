module.exports = (sequelize, Sequelize) => {
  const DeanExtensionActivities = sequelize.define(
    "dean_extension_activities",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dean_id: {
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
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_extension_activities",
    },
  );

  return DeanExtensionActivities;
};
