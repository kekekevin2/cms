module.exports = (sequelize, Sequelize) => {
  const Faculty = sequelize.define("faculties", {
    faculty_id: {
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
    clearance_status: {
      type: Sequelize.ENUM("pending", "cleared", "withholding"),
      defaultValue: "pending",
      comment:
        "Faculty clearance status: 'pending'=incomplete/awaiting validation, 'cleared'=auto-set when all requirements validated by dean, 'withholding'=auto-set when requirements returned/rejected",
    },
    clearance_remarks: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Dean's remarks on faculty clearance status",
    },
    clearance_date: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Date when faculty was cleared or status changed",
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: "Account status: true=active (can login), false=disabled (cannot login)",
    },
  });

  return Faculty;
};
