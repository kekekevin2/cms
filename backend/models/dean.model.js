module.exports = (sequelize, Sequelize) => {
  const Dean = sequelize.define("deans", {
    dean_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    employee_id: {
      type: Sequelize.STRING(5),
      allowNull: false,
    },
    first_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    middle_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    last_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    contact_number: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    department: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: "Department name as text input (no longer a foreign key)",
    },
    position_level: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment:
        "Academic position level (e.g., Lecturer 1, Professor 1, Associate Professor, etc.)",
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true,
    },
  });

  return Dean;
};
