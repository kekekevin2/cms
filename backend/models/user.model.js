module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define(
    "users",
    {
      user_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        // Removed unique: true to allow same email for different roles
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM(
          "superadmin",
          "dean",
          "faculty",
          "admin",
          "organization",
          "college_department",
        ),
        allowNull: false,
        defaultValue: "faculty",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment:
          "Account status: true=active (can login), false=disabled (cannot login)",
      },
    },
    {
      // Add composite unique constraint: one email per role
      indexes: [
        {
          unique: true,
          fields: ["email", "role"],
          name: "unique_email_role",
        },
      ],
    },
  );

  return User;
};
