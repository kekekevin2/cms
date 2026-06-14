module.exports = (sequelize, Sequelize) => {
  const DeanSeminarsTrainings = sequelize.define(
    "dean_seminars_trainings",
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
      training_provider: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      certificate_file: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_seminars_trainings",
    },
  );

  return DeanSeminarsTrainings;
};
