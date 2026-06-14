module.exports = (sequelize, Sequelize) => {
  const CollegeDepartment = sequelize.define("college_departments", {
    college_department_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    campus_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    department_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    dean_name: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    contact_number: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      unique: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    about: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    goal: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    why_batstateu: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    peos: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "JSON array of PEO objects {title, description}",
    },
    programs: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "JSON array of program objects {name, description, icon_color}",
    },
    career_opportunities: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "JSON array of {program, careers}",
    },
    program_outcomes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "JSON array of outcome strings",
    },
    profile_picture: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
  });

  return CollegeDepartment;
};
