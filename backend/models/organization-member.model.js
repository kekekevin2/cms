module.exports = (sequelize, Sequelize) => {
  const OrganizationMember = sequelize.define("organization_members", {
    member_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    organization_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: "organizations",
        key: "organization_id",
      },
      onDelete: "CASCADE",
    },
    sr_code: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: "Student Reference Code",
    },
    first_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    middle_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    last_name: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    contact_number: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    gender: {
      type: Sequelize.ENUM("Male", "Female"),
      allowNull: true,
    },
    program: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "Degree program (e.g., BSIT, BSCS)",
    },
    section: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    department: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    year_level: {
      type: Sequelize.ENUM(
        "1st Year",
        "2nd Year",
        "3rd Year",
        "4th Year",
        "5th Year",
      ),
      allowNull: true,
    },
    position: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "President, Vice President, Secretary, etc.",
    },
    parent_member_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "ID of supervising member (for hierarchy)",
      references: {
        model: "organization_members",
        key: "member_id",
      },
      onDelete: "SET NULL",
    },
    academic_year_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Links to academic year/term",
      references: {
        model: "academic_years",
        key: "academic_year_id",
      },
      onDelete: "CASCADE",
    },
    semester: {
      type: Sequelize.ENUM("1st Semester", "2nd Semester", "Summer"),
      allowNull: true,
      comment: "Semester within the academic year",
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    term_start_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    term_end_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    photo_url: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: "Path to member photo",
    },
  });

  return OrganizationMember;
};
