const db = require("../models");
const storage = require("../utils/storage");

/** Viewable URL for the template PDF stored with a config, or null if it has none. */
async function templateUrlFor(configData) {
  const key = configData && configData.template_key;
  if (!key) return null;
  try {
    return await storage.getUrl(key);
  } catch (error) {
    console.error("PDS template URL error:", error.message);
    return null;
  }
}

async function templateFileJson(file) {
  return {
    file_id: file.file_id,
    name: file.name,
    key: file.file_key,
    url: await storage.getUrl(file.file_key).catch(() => null),
    created_at: file.created_at,
  };
}

/**
 * Upload a PDS template PDF in the editor. Stored server-side so it survives logout and is
 * the same on every browser; the client saves its key as config_data.template_key on Save.
 */
exports.uploadTemplate = async (req, res) => {
  let key;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }
    key = await storage.put(req.file.buffer, {
      folder: "pds-templates",
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    const file = await db.PDSTemplateFile.create({
      name: req.file.originalname,
      file_key: key,
      uploaded_by: req.user?.user_id,
    });
    res.status(201).json({ message: "Template uploaded", template: await templateFileJson(file) });
  } catch (error) {
    if (key) await storage.remove(key).catch(() => {});
    console.error("Upload PDS template error:", error);
    res.status(500).json({ message: "Error uploading PDS template", error: error.message });
  }
};

/** List uploaded template PDFs, oldest first. */
exports.listTemplates = async (req, res) => {
  try {
    const files = await db.PDSTemplateFile.findAll({ order: [["created_at", "ASC"]] });
    res.json({ templates: await Promise.all(files.map(templateFileJson)) });
  } catch (error) {
    console.error("List PDS templates error:", error);
    res.status(500).json({ message: "Error listing PDS templates", error: error.message });
  }
};

/** Delete an uploaded template PDF, unless the active configuration is using it. */
exports.deleteTemplate = async (req, res) => {
  try {
    const file = await db.PDSTemplateFile.findByPk(req.params.id);
    if (!file) return res.status(404).json({ message: "Template not found" });

    const active = await db.PDSTemplateConfig.findOne({ where: { is_active: true } });
    if (active?.config_data?.template_key === file.file_key) {
      return res.status(409).json({
        message:
          "This PDF is the template faculty and dean downloads currently use. Save positions on another PDF first.",
      });
    }

    await file.destroy();
    await storage.remove(file.file_key).catch((e) => console.error("Remove PDS template file:", e.message));
    res.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Delete PDS template error:", error);
    res.status(500).json({ message: "Error deleting PDS template", error: error.message });
  }
};

/**
 * Get the active PDS template configuration
 * Returns the latest active configuration or null if none exists
 */
exports.getActiveConfig = async (req, res) => {
  try {
    const config = await db.PDSTemplateConfig.findOne({
      where: { is_active: true },
      order: [["created_at", "DESC"]],
    });

    if (!config) {
      return res.json({
        message: "No active configuration found",
        config: null,
      });
    }

    res.json({
      message: "Active configuration retrieved successfully",
      config: {
        config_id: config.config_id,
        config_data: config.config_data,
        template_url: await templateUrlFor(config.config_data),
        version: config.version,
        created_at: config.created_at,
        updated_at: config.updated_at,
      },
    });
  } catch (error) {
    console.error("Get active config error:", error);
    res.status(500).json({
      message: "Error retrieving PDS template configuration",
      error: error.message,
    });
  }
};

/**
 * Save or update PDS template configuration
 * Deactivates all previous configs and creates a new active one
 * Only accessible to Super Admin users
 */
exports.saveConfig = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { config_data } = req.body;
    const userId = req.user?.user_id;

    // Validate config_data
    if (!config_data || typeof config_data !== "object") {
      await transaction.rollback();
      return res.status(400).json({
        message: "Invalid configuration data. Expected a JSON object.",
      });
    }

    // Basic validation of config structure
    if (!Array.isArray(config_data.positions)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Configuration must include a 'positions' array",
      });
    }

    // Get the current active config to determine next version
    const currentConfig = await db.PDSTemplateConfig.findOne({
      where: { is_active: true },
      order: [["created_at", "DESC"]],
      transaction,
    });

    const nextVersion = currentConfig ? currentConfig.version + 1 : 1;

    // Deactivate all existing configs
    await db.PDSTemplateConfig.update(
      { is_active: false },
      {
        where: { is_active: true },
        transaction,
      }
    );

    // Create new active config
    const newConfig = await db.PDSTemplateConfig.create(
      {
        config_data,
        version: nextVersion,
        is_active: true,
        created_by: userId,
        updated_by: userId,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      message: "PDS template configuration saved successfully",
      config: {
        config_id: newConfig.config_id,
        version: newConfig.version,
        created_at: newConfig.created_at,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Save config error:", error);
    res.status(500).json({
      message: "Error saving PDS template configuration",
      error: error.message,
    });
  }
};

/**
 * Get configuration history
 * Returns all configurations with pagination
 * Only accessible to Super Admin users
 */
exports.getConfigHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await db.PDSTemplateConfig.findAndCountAll({
      attributes: [
        "config_id",
        "version",
        "is_active",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    res.json({
      message: "Configuration history retrieved successfully",
      configs: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get config history error:", error);
    res.status(500).json({
      message: "Error retrieving configuration history",
      error: error.message,
    });
  }
};

/**
 * Get a specific configuration by ID
 * Only accessible to Super Admin users
 */
exports.getConfigById = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await db.PDSTemplateConfig.findByPk(id);

    if (!config) {
      return res.status(404).json({
        message: "Configuration not found",
      });
    }

    res.json({
      message: "Configuration retrieved successfully",
      config: {
        config_id: config.config_id,
        config_data: config.config_data,
        version: config.version,
        is_active: config.is_active,
        created_by: config.created_by,
        updated_by: config.updated_by,
        created_at: config.created_at,
        updated_at: config.updated_at,
      },
    });
  } catch (error) {
    console.error("Get config by ID error:", error);
    res.status(500).json({
      message: "Error retrieving configuration",
      error: error.message,
    });
  }
};

/**
 * Restore a previous configuration (make it active)
 * Only accessible to Super Admin users
 */
exports.restoreConfig = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user?.user_id;

    const config = await db.PDSTemplateConfig.findByPk(id, { transaction });

    if (!config) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Configuration not found",
      });
    }

    // Deactivate all existing configs
    await db.PDSTemplateConfig.update(
      { is_active: false },
      {
        where: { is_active: true },
        transaction,
      }
    );

    // Activate the selected config and update the updated_by field
    await config.update(
      {
        is_active: true,
        updated_by: userId,
      },
      { transaction }
    );

    await transaction.commit();

    res.json({
      message: "Configuration restored successfully",
      config: {
        config_id: config.config_id,
        version: config.version,
        is_active: config.is_active,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Restore config error:", error);
    res.status(500).json({
      message: "Error restoring configuration",
      error: error.message,
    });
  }
};
