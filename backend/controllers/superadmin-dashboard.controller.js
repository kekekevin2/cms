const db = require("../models");
const { Sequelize } = require("sequelize");
const fs = require("fs").promises;
const path = require("path");

const Faculty = db.Faculty;
const Dean = db.Dean;
const Organization = db.Organization;
const RequirementSubmission = db.RequirementSubmission;
const CredentialCertificate = db.CredentialCertificate;
const FacultyCredential = db.FacultyCredential;
const Campus = db.Campus;
const Department = db.Department;
const CollegeDepartment = db.CollegeDepartment;
const AcademicYear = db.AcademicYear;

// Helper function to safely get file size
async function getFileSize(filePath) {
  try {
    if (filePath) {
      const stats = await fs.stat(filePath);
      return stats.size;
    }
  } catch (error) {
    return 0;
  }
  return 0;
}

// Get dashboard statistics for superadmin
exports.getDashboardStatistics = async (req, res) => {
  try {
    // Core counts
    const [
      totalFaculty,
      totalDeans,
      totalOrganizations,
      totalCampuses,
      activeCampuses,
      totalDepartments,
      activeDepartments,
      totalCollegeDepartments,
      activeAcademicYear,
    ] = await Promise.all([
      Faculty.count(),
      Dean.count(),
      Organization.count(),
      Campus.count(),
      Campus.count({ where: { is_active: true } }),
      Department.count(),
      Department.count({ where: { is_active: true } }),
      CollegeDepartment ? CollegeDepartment.count() : Promise.resolve(0),
      AcademicYear
        ? AcademicYear.findOne({
            where: { is_active: true },
            attributes: ["year_start", "year_end"],
          })
        : Promise.resolve(null),
    ]);

    // Requirement submission stats
    const requirementStats = await RequirementSubmission.findAll({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("submission_id")), "total_files"],
        [Sequelize.fn("SUM", Sequelize.col("file_size")), "total_storage"],
        [Sequelize.col("status"), "status"],
      ],
      group: ["status"],
    });

    const certificateStats = await CredentialCertificate.findAll({
      attributes: [[Sequelize.fn("COUNT", Sequelize.col("id")), "total_files"]],
    });

    let totalFiles = 0;
    let totalStorage = 0;
    let filesByStatus = { pending: 0, returned: 0 };

    requirementStats.forEach((stat) => {
      const count = parseInt(stat.dataValues.total_files) || 0;
      const storage = parseInt(stat.dataValues.total_storage) || 0;
      const status = stat.dataValues.status;
      totalFiles += count;
      totalStorage += storage;
      if (filesByStatus.hasOwnProperty(status)) {
        filesByStatus[status] = count;
      }
    });

    if (certificateStats.length > 0) {
      totalFiles += parseInt(certificateStats[0].dataValues.total_files) || 0;
    }

    const certificates = await CredentialCertificate.findAll({
      attributes: ["file_path"],
    });
    for (const cert of certificates) {
      totalStorage += await getFileSize(cert.file_path);
    }

    const facultyWithCredentials = await FacultyCredential.findAll({
      attributes: ["tor_file_path", "pds_file_path", "diploma_file_path"],
      where: {
        [Sequelize.Op.or]: [
          { tor_file_path: { [Sequelize.Op.ne]: null } },
          { pds_file_path: { [Sequelize.Op.ne]: null } },
          { diploma_file_path: { [Sequelize.Op.ne]: null } },
        ],
      },
    });

    for (const credential of facultyWithCredentials) {
      for (const field of [
        "tor_file_path",
        "pds_file_path",
        "diploma_file_path",
      ]) {
        if (credential[field]) {
          totalStorage += await getFileSize(credential[field]);
          totalFiles += 1;
        }
      }
    }

    const storageMB = (totalStorage / (1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      statistics: {
        total_faculty: totalFaculty,
        total_deans: totalDeans,
        total_organizations: totalOrganizations,
        total_campuses: totalCampuses,
        active_campuses: activeCampuses,
        total_departments: totalDepartments,
        active_departments: activeDepartments,
        total_college_departments: totalCollegeDepartments,
        active_academic_year: activeAcademicYear
          ? `${activeAcademicYear.year_start}–${activeAcademicYear.year_end}`
          : null,
        total_files: totalFiles,
        storage_mb: parseFloat(storageMB),
        files_by_status: filesByStatus,
      },
    });
  } catch (error) {
    console.error("Get superadmin dashboard statistics error:", error);
    res.status(500).json({ message: "Error fetching dashboard statistics" });
  }
};

// Helper function to safely get file size
async function getFileSize(filePath) {
  try {
    if (filePath) {
      const stats = await fs.stat(filePath);
      return stats.size;
    }
  } catch (error) {
    // File doesn't exist or can't be accessed
    return 0;
  }
  return 0;
}

// Get dashboard statistics for superadmin
exports.getDashboardStatistics = async (req, res) => {
  try {
    // Get total faculty count
    const totalFaculty = await Faculty.count();

    // Get total dean count
    const totalDeans = await Dean.count();

    // Get total organization count
    const totalOrganizations = await Organization.count();

    // Get requirement submissions statistics
    const requirementStats = await RequirementSubmission.findAll({
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("submission_id")), "total_files"],
        [Sequelize.fn("SUM", Sequelize.col("file_size")), "total_storage"],
        [Sequelize.col("status"), "status"],
      ],
      group: ["status"],
    });

    // Get certificate submissions statistics
    const certificateStats = await CredentialCertificate.findAll({
      attributes: [[Sequelize.fn("COUNT", Sequelize.col("id")), "total_files"]],
    });

    // Calculate totals
    let totalFiles = 0;
    let totalStorage = 0;
    let filesByStatus = {
      pending: 0,
      returned: 0,
    };

    // Process requirement submissions
    requirementStats.forEach((stat) => {
      const count = parseInt(stat.dataValues.total_files) || 0;
      const storage = parseInt(stat.dataValues.total_storage) || 0;
      const status = stat.dataValues.status;

      totalFiles += count;
      totalStorage += storage;
      if (filesByStatus.hasOwnProperty(status)) {
        filesByStatus[status] = count;
      }
    });

    // Add certificates to total files
    if (certificateStats.length > 0) {
      totalFiles += parseInt(certificateStats[0].dataValues.total_files) || 0;
    }

    // Calculate storage for credential certificates
    const certificates = await CredentialCertificate.findAll({
      attributes: ["file_path"],
    });

    for (const cert of certificates) {
      const size = await getFileSize(cert.file_path);
      totalStorage += size;
    }

    // Get faculty credential file counts and sizes (tor, pds, diploma)
    const facultyWithCredentials = await FacultyCredential.findAll({
      attributes: ["tor_file_path", "pds_file_path", "diploma_file_path"],
      where: {
        [Sequelize.Op.or]: [
          { tor_file_path: { [Sequelize.Op.ne]: null } },
          { pds_file_path: { [Sequelize.Op.ne]: null } },
          { diploma_file_path: { [Sequelize.Op.ne]: null } },
        ],
      },
    });

    // Calculate storage for faculty credentials
    for (const credential of facultyWithCredentials) {
      if (credential.tor_file_path) {
        const size = await getFileSize(credential.tor_file_path);
        totalStorage += size;
        totalFiles += 1;
      }
      if (credential.pds_file_path) {
        const size = await getFileSize(credential.pds_file_path);
        totalStorage += size;
        totalFiles += 1;
      }
      if (credential.diploma_file_path) {
        const size = await getFileSize(credential.diploma_file_path);
        totalStorage += size;
        totalFiles += 1;
      }
    }

    // Convert storage to MB and GB
    const storageMB = (totalStorage / (1024 * 1024)).toFixed(2);
    const storageGB = (totalStorage / (1024 * 1024 * 1024)).toFixed(2);

    res.json({
      success: true,
      statistics: {
        total_faculty: totalFaculty,
        total_deans: totalDeans,
        total_organizations: totalOrganizations,
        files_by_status: filesByStatus,
      },
    });
  } catch (error) {
    console.error("Get superadmin dashboard statistics error:", error);
    res.status(500).json({ message: "Error fetching dashboard statistics" });
  }
};
