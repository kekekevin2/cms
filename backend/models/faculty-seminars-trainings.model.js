module.exports = (sequelize, Sequelize) => {
  const FacultySeminarsTrainings = sequelize.define(
    "faculty_seminars_trainings",
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
      title: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      category: {
        type: Sequelize.ENUM("Local", "National", "International"),
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      sponsoring_agency: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      certificate_file: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: "faculty_seminars_trainings",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultySeminarsTrainings;
};
