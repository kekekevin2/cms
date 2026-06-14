module.exports = (sequelize, Sequelize) => {
  const DeanAwards = sequelize.define(
    "dean_awards",
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
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_awards",
    },
  );

  return DeanAwards;
};
