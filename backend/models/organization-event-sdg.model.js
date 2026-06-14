module.exports = (sequelize, Sequelize) => {
  const OrganizationEventSDG = sequelize.define(
    "organization_event_sdg",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      event_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sdg_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return OrganizationEventSDG;
};
