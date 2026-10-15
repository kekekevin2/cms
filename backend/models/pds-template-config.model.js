module.exports = (sequelize, Sequelize) => {
  const PDSTemplateConfig = sequelize.define(
    "pds_template_config",
    {
      config_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      config_data: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: "JSON configuration for PDS field positions and layout settings",
        // MariaDB stores JSON as LONGTEXT, so reads come back as a string — parse it here
        get() {
          const raw = this.getDataValue("config_data");
          if (typeof raw !== "string") return raw;
          try {
            return JSON.parse(raw);
          } catch {
            return raw;
          }
        },
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "Version number for tracking configuration changes",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Only one config can be active at a time",
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Admin user_id who created this config",
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Admin user_id who last updated this config",
      },
    },
    {
      tableName: "pds_template_config",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PDSTemplateConfig;
};
