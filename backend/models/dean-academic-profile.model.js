module.exports = (sequelize, Sequelize) => {
  const DeanAcademicProfile = sequelize.define(
    "dean_academic_profiles",
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
      level: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      school_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      degree_course: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      year_graduated: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      units_earned: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      year_from: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      year_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      honors_received: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_academic_profiles",
    },
  );

  return DeanAcademicProfile;
};
