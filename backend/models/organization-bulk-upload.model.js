module.exports = (sequelize, Sequelize) => {
  const OrganizationBulkUpload = sequelize.define("organization_bulk_uploads", {
    upload_id: {
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
    file_name: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: "Original name of the uploaded CSV/Excel file",
    },
    department: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: "Department to which the uploaded members belong",
    },
    academic_year_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: "Academic year for the bulk upload",
      references: {
        model: "academic_years",
        key: "academic_year_id",
      },
      onDelete: "CASCADE",
    },
    term_start_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: "Term start date for the uploaded members",
    },
    total_records: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Total number of records in the file",
    },
    inserted_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of records successfully inserted",
    },
    updated_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of records updated",
    },
    skipped_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of records skipped",
    },
    uploaded_by: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: "User ID who performed the upload",
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
    upload_status: {
      type: Sequelize.ENUM("completed", "partial", "failed"),
      allowNull: false,
      defaultValue: "completed",
      comment: "Status of the bulk upload",
    },
  });

  return OrganizationBulkUpload;
};
