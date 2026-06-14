module.exports = (sequelize, Sequelize) => {
  const OrganizationEventGuest = sequelize.define(
    "organization_event_guest",
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
      guest_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      guest_title: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      guest_affiliation: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return OrganizationEventGuest;
};
