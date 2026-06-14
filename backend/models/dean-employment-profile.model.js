module.exports = (sequelize, Sequelize) => {
  const DeanEmploymentProfile = sequelize.define(
    "dean_employment_profiles",
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
      position_title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      company_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      employment_status: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      date_from: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      date_to: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_current: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_employment_profiles",
    },
  );

  return DeanEmploymentProfile;
};
