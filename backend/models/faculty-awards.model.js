module.exports = (sequelize, Sequelize) => {
  const FacultyAwards = sequelize.define(
    "faculty_awards",
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
      award_title: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      awarding_body: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      date_received: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      level: {
        type: Sequelize.ENUM(
          "International",
          "National",
          "Regional",
          "Local",
          "Institutional",
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      certificate_file: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: "faculty_awards",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultyAwards;
};
