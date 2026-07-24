module.exports = (sequelize, Sequelize) => {
  const FacultyPersonalProfile = sequelize.define(
    "faculty_personal_profiles",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      faculty_id: {
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
      extension_name: {
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
      mobile_number_primary: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      mobile_number_secondary: {
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
      // Home Address
      home_country: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      home_region: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      home_province: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      home_barangay: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      home_street_subdivision: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      home_street: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      home_subdivision: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      home_zip_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
    },
    {
      tableName: "faculty_personal_profiles",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultyPersonalProfile;
};
