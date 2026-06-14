module.exports = (sequelize, Sequelize) => {
  const FacultyEmploymentProfile = sequelize.define(
    "faculty_employment_profiles",
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
      position_title: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      company_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      employment_status: {
        type: Sequelize.ENUM(
          "Permanent",
          "Temporary",
          "Contractual",
          "Part-time",
        ),
        allowNull: false,
      },
      salary_grade: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      monthly_salary: {
        type: Sequelize.DECIMAL(12, 2),
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
      appointment_status: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      government_service: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "faculty_employment_profiles",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultyEmploymentProfile;
};
