module.exports = (sequelize, Sequelize) => {
  const RequirementSubmission = sequelize.define("requirement_submissions", {
    submission_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    faculty_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: "Reference to faculty who submitted",
    },
    academic_year_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: "Reference to academic_years table",
    },
    semester: {
      type: Sequelize.ENUM(
        "1st Semester",
        "2nd Semester",
        "Midterm 1",
        "Midterm 2",
      ),
      allowNull: false,
      comment: "Static semester options",
    },
    requirement_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment:
        "Faculty types the requirement name (follows original 15 requirements)",
    },
    file_path: {
      type: Sequelize.STRING(500),
      allowNull: false,
      comment: "Path to uploaded file",
    },
    file_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "Original file name",
    },
    file_size: {
      type: Sequelize.INTEGER,
      comment: "File size in bytes",
    },
    submission_date: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    status: {
      type: Sequelize.ENUM("pending", "validated", "returned"),
      defaultValue: "pending",
      comment:
        "pending=awaiting review, validated=approved by dean, returned=needs revision",
    },
    dean_remarks: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "Dean comments when validating or returning",
    },
    validated_by: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Dean user_id who validated",
    },
    validated_date: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  return RequirementSubmission;
};
