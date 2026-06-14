const db = require("../models");
const AcademicYear = db.AcademicYear;
const { Op } = require("sequelize");

// Get all academic years with pagination and search
exports.getAcademicYears = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const showArchived = req.query.archived === "true";

    const whereClause = {
      ...(showArchived ? { is_active: false } : {}),
      ...(search
        ? {
            [Op.or]: [
              { year_start: { [Op.like]: `%${search}%` } },
              { year_end: { [Op.like]: `%${search}%` } },
            ],
          }
        : {}),
    };

    const { count, rows } = await AcademicYear.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["year_start", "DESC"]],
    });

    res.json({
      academicYears: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get academic years error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single academic year
exports.getAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const academicYear = await AcademicYear.findByPk(id);

    if (!academicYear) {
      return res.status(404).json({ message: "Academic year not found" });
    }

    res.json(academicYear);
  } catch (error) {
    console.error("Get academic year error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create academic year
exports.createAcademicYear = async (req, res) => {
  try {
    const { year_start, year_end, is_active } = req.body;

    if (!year_start || !year_end) {
      return res
        .status(400)
        .json({ message: "Year start and year end are required" });
    }

    if (year_start >= year_end) {
      return res
        .status(400)
        .json({ message: "Year end must be greater than year start" });
    }

    const existing = await AcademicYear.findOne({
      where: { year_start, year_end },
    });
    if (existing) {
      return res.status(409).json({
        message: `Academic year ${year_start}-${year_end} already exists`,
      });
    }

    const academicYear = await AcademicYear.create({
      year_start,
      year_end,
      is_active: is_active !== undefined ? is_active : false,
    });

    res
      .status(201)
      .json({ message: "Academic year created successfully", academicYear });
  } catch (error) {
    console.error("Create academic year error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update academic year
exports.updateAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { year_start, year_end, is_active } = req.body;

    const academicYear = await AcademicYear.findByPk(id);
    if (!academicYear) {
      return res.status(404).json({ message: "Academic year not found" });
    }

    const newStart = year_start || academicYear.year_start;
    const newEnd = year_end || academicYear.year_end;

    if (newStart >= newEnd) {
      return res
        .status(400)
        .json({ message: "Year end must be greater than year start" });
    }

    // Check duplicate excluding self
    const existing = await AcademicYear.findOne({
      where: {
        year_start: newStart,
        year_end: newEnd,
        academic_year_id: { [Op.ne]: id },
      },
    });
    if (existing) {
      return res.status(409).json({
        message: `Academic year ${newStart}-${newEnd} already exists`,
      });
    }

    await academicYear.update({
      year_start: newStart,
      year_end: newEnd,
      is_active: is_active !== undefined ? is_active : academicYear.is_active,
    });

    res.json({ message: "Academic year updated successfully", academicYear });
  } catch (error) {
    console.error("Update academic year error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete academic year (hard delete)
exports.deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const academicYear = await AcademicYear.findByPk(id);

    if (!academicYear) {
      return res.status(404).json({ message: "Academic year not found" });
    }

    await academicYear.destroy();
    res.json({ message: "Academic year deleted successfully" });
  } catch (error) {
    console.error("Delete academic year error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
