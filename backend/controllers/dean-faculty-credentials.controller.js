const db = require("../models");
const storage = require("../utils/storage");

// Helper: resolve department for Dean or CollegeDepartment user
async function getDepartmentForUser(userId) {
  const dean = await db.Dean.findOne({ where: { user_id: userId } });
  if (dean) return { department: dean.department, dean };
  const cd = await db.CollegeDepartment.findOne({
    where: { user_id: userId },
    include: [{ model: db.Department, as: 'department', attributes: ['department_name'] }],
  });
  if (cd && cd.department) return { department: cd.department.department_name, dean: null };
  return null;
}

const Faculty = db.Faculty;
const FacultyCredential = db.FacultyCredential;
const CredentialCertificate = db.CredentialCertificate;
const Dean = db.Dean;
const { Op } = require("sequelize");

// Get all faculty credentials for dean's department
exports.getAllFacultyCredentials = async (req, res) => {
  try {
    const deanId = req.user.user_id;

    // Get dean's department
    const dean = await Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search conditions for faculty
    const facultyWhereClause = {
      department: dean.department, // Use department string field
    };

    if (search) {
      facultyWhereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    // Get all faculty in department with their credentials
    const { count, rows } = await Faculty.findAndCountAll({
      where: facultyWhereClause,
      limit,
      offset,
      order: [["last_name", "ASC"]],
      include: [
        {
          model: FacultyCredential,
          as: "faculty_credential",
          required: false, // Include faculty even if they don't have credentials yet
          include: [
            {
              model: CredentialCertificate,
              as: "credential_certificates",
              required: false,
            },
          ],
        },
      ],
    });

    res.json({
      credentials: rows,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalItems: count,
    });
  } catch (error) {
    console.error("Get faculty credentials error:", error);
    res.status(500).json({
      message: "Error fetching faculty credentials",
      error: error.message,
    });
  }
};

// Get single faculty credential details
exports.getFacultyCredential = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const deanId = req.user.user_id;

    // Get dean's department
    const dean = await Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Get faculty with credentials
    const faculty = await Faculty.findOne({
      where: {
        faculty_id: facultyId,
        department: dean.department, // Ensure faculty belongs to dean's department
      },
      include: [
        {
          model: FacultyCredential,
          as: "faculty_credential",
          include: [
            {
              model: CredentialCertificate,
              as: "credential_certificates",
              required: false,
            },
          ],
        },
      ],
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Faculty not found or not in your department" });
    }

    res.json(faculty);
  } catch (error) {
    console.error("Get faculty credential error:", error);
    res.status(500).json({
      message: "Error fetching faculty credential",
      error: error.message,
    });
  }
};

// Download faculty's credential file
exports.downloadFacultyCredentialFile = async (req, res) => {
  try {
    const { facultyId, fileType } = req.params;
    const deanId = req.user.user_id;

    // Get dean's department
    const dean = await Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Get faculty and verify they're in dean's department
    const faculty = await Faculty.findOne({
      where: {
        faculty_id: facultyId,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Faculty not found or not in your department" });
    }

    // Get credentials
    const credential = await FacultyCredential.findOne({
      where: { faculty_id: facultyId },
    });

    if (!credential) {
      return res
        .status(404)
        .json({ message: "No credentials found for this faculty" });
    }

    let filePath;
    switch (fileType) {
      case "tor":
        filePath = credential.tor_file_path;
        break;
      case "pds":
        filePath = credential.pds_file_path;
        break;
      case "diploma":
        filePath = credential.diploma_file_path;
        break;
      default:
        return res.status(400).json({ message: "Invalid file type" });
    }

    if (!filePath) {
      return res.status(404).json({ message: "File not found" });
    }

    const url = await storage.getUrl(filePath, { download: true });
    res.json({ url });
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      message: "Failed to download file",
      error: error.message,
    });
  }
};

// Download faculty's certificate
exports.downloadFacultyCertificate = async (req, res) => {
  try {
    const { facultyId, certificateId } = req.params;
    const deanId = req.user.user_id;

    // Get dean's department
    const dean = await Dean.findOne({
      where: { user_id: deanId },
    });

    if (!dean) {
      return res.status(404).json({ message: "Dean profile not found" });
    }

    // Get faculty and verify they're in dean's department
    const faculty = await Faculty.findOne({
      where: {
        faculty_id: facultyId,
        department: dean.department,
      },
    });

    if (!faculty) {
      return res
        .status(404)
        .json({ message: "Faculty not found or not in your department" });
    }

    // Get certificate
    const certificate = await CredentialCertificate.findOne({
      where: { id: certificateId },
      include: [
        {
          model: FacultyCredential,
          where: { faculty_id: facultyId },
        },
      ],
    });

    if (!certificate) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    if (!certificate.file_path) {
      return res.status(404).json({ message: "Certificate file not found" });
    }

    const url = await storage.getUrl(certificate.file_path, { download: true });
    res.json({ url });
  } catch (error) {
    console.error("Error downloading certificate:", error);
    res.status(500).json({
      message: "Failed to download certificate",
      error: error.message,
    });
  }
};
