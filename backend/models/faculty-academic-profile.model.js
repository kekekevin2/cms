module.exports = (sequelize, Sequelize) => {
  const FacultyAcademicProfile = sequelize.define(
    "faculty_academic_profiles",
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
      level: {
        type: Sequelize.ENUM(
          "Elementary",
          "Secondary",
          "Vocational",
          "College",
          "Graduate Studies",
        ),
        allowNull: false,
      },
      school_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      degree_course: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      year_graduated: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      units_earned: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      year_attended_from: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      year_attended_to: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      honors_received: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
    },
    {
      tableName: "faculty_academic_profiles",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultyAcademicProfile;
};
