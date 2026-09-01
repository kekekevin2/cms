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
        field: 'email', // Explicitly set field name
        // Removed unique: true to allow same email for different roles
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'password', // Explicitly set field name
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
        field: 'role', // Explicitly set field name
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        field: 'is_active', // Explicitly set field name
        comment:
          "Account status: true=active (can login), false=disabled (cannot login)",
      },
    },
    {
      tableName: 'users', // Explicitly set table name
      timestamps: true, // Keep timestamps
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
