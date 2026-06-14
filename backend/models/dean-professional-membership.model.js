module.exports = (sequelize, Sequelize) => {
  const DeanProfessionalMembership = sequelize.define(
    "dean_professional_memberships",
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
      organization_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      membership_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      date_joined: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_ended: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_professional_memberships",
    },
  );

  return DeanProfessionalMembership;
};
