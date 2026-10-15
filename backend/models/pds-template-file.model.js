// Template PDFs uploaded in the superadmin PDS Template Editor. The active
// pds_template_config points at one of these through config_data.template_key.
module.exports = (sequelize, Sequelize) => {
  const PDSTemplateFile = sequelize.define(
    "pds_template_file",
    {
      file_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: "Original filename shown in the editor",
      },
      file_key: {
        type: Sequelize.STRING(512),
        allowNull: false,
        comment: "Storage key (utils/storage.js) of the PDF",
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "user_id of the uploader",
      },
    },
    {
      tableName: "pds_template_files",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PDSTemplateFile;
};
