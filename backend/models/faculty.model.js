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
    academic_rank: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "Academic rank (e.g., ASSOC. PROF. III, PROFESSOR I, etc.)",
    },
    employment_status: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "Employment status (e.g., PERMANENT FACULTY, TEMPORARY, etc.)",
    },
    educational_attainment: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: "Educational attainment course (e.g., PhD IN DEVELOPMENT ADMINISTRATION)",
    },
    campus: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "Campus location (e.g., LIPA CAMPUS)",
    },
    telephone_number: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: "Landline telephone number",
    },
    birth_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: "Date of birth",
    },
    age: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Age in years",
    },
    civil_status: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: "Civil/marital status",
    },
    home_address: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Complete home address",
    },
    photo_url: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: "Path to faculty photo",
    },
    signature_url: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: "Path to uploaded e-signature image",
    },
  });

  return Faculty;
};
