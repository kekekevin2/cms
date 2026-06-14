module.exports = (sequelize, Sequelize) => {
  const DeanPersonalProfile = sequelize.define(
    "dean_personal_profiles",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      dean_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
      },
      profile_picture: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      passport_photo: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      middle_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      extension: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      place_of_birth: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      civil_status: {
        type: Sequelize.ENUM(
          "Single",
          "Married",
          "Widowed",
          "Separated",
          "Divorced",
        ),
        allowNull: true,
      },
      sex: {
        type: Sequelize.ENUM("Male", "Female"),
        allowNull: true,
      },
      citizenship: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      mobile_primary: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      mobile_secondary: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      email_primary: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email_secondary: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      region: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      province: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      barangay: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      street_subdivision: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      zip_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      tableName: "dean_personal_profiles",
    },
  );

  return DeanPersonalProfile;
};
