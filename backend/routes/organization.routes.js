const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const memberController = require("../controllers/organization-member.controller");
const documentController = require("../controllers/organization-document.controller");
const adviserController = require("../controllers/organization-adviser.controller");
const cvlAttachmentController = require("../controllers/cvl-attachment.controller");

// Configure multer for document uploads
const uploadDir = "uploads/organization-documents/";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|jpg|jpeg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only documents and images are allowed"));
    }
  },
});

// Configure multer for Excel file uploads (persisted for download/preview)
const csvUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = "uploads/organization-population/";
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, "members-" + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /csv|xls|xlsx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only CSV or Excel files (.csv, .xls, .xlsx) are allowed"));
    }
  },
});

// Configure multer for member photo uploads
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "uploads/member-photos/";
    
    // Use different path for signatures
    if (file.fieldname === 'signature') {
      uploadPath = "uploads/member-signatures/";
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === 'signature' ? 'signature-' : 'member-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = file.mimetype.startsWith("image/");

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, JPG, PNG) are allowed"));
    }
  },
});

// Organization dashboard
router.get("/", verifyToken, checkRole("organization"), (req, res) => {
  res.json({
    message: "Organization Dashboard",
    user: req.user,
  });
});

// Member routes
router.get(
  "/members",
  verifyToken,
  checkRole("organization"),
  memberController.getMembers,
);
router.get(
  "/members/search-history",
  verifyToken,
  checkRole("organization"),
  memberController.searchMemberHistory,
);
router.get(
  "/members/hierarchy",
  verifyToken,
  checkRole("organization"),
  memberController.getHierarchy,
);
router.post(
  "/members",
  verifyToken,
  checkRole("organization"),
  photoUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 }
  ]),
  memberController.createMember,
);
router.put(
  "/members/:id",
  verifyToken,
  checkRole("organization"),
  photoUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 }
  ]),
  memberController.updateMember,
);
router.delete(
  "/members/:id",
  verifyToken,
  checkRole("organization"),
  memberController.deleteMember,
);

// Position templates
router.get(
  "/positions",
  verifyToken,
  checkRole("organization"),
  memberController.getPositionTemplates,
);

// Bulk upload routes
router.get(
  "/members/template/download",
  verifyToken,
  checkRole("organization"),
  memberController.downloadTemplate,
);
router.post(
  "/members/bulk-upload",
  verifyToken,
  checkRole("organization"),
  csvUpload.single("file"),
  memberController.bulkUploadMembers,
);
router.get(
  "/members/bulk-upload/history",
  verifyToken,
  checkRole("organization"),
  memberController.getBulkUploadHistory,
);

router.put(
  "/members/bulk-upload/:upload_id",
  verifyToken,
  checkRole("organization"),
  csvUpload.single("file"),
  memberController.updateBulkUpload,
);

router.delete(
  "/members/bulk-upload/:upload_id",
  verifyToken,
  checkRole("organization"),
  memberController.deleteBulkUpload,
);

router.get(
  "/members/bulk-upload/:upload_id/download",
  verifyToken,
  checkRole("organization"),
  memberController.downloadBulkUpload,
);

router.get(
  "/members/bulk-upload/:upload_id/preview",
  verifyToken,
  checkRole("organization"),
  memberController.previewBulkUpload,
);

// Document routes
router.get(
  "/documents",
  verifyToken,
  checkRole("organization"),
  documentController.getDocuments,
);
router.get(
  "/documents/types",
  verifyToken,
  checkRole("organization"),
  documentController.getDocumentTypes,
);
router.get(
  "/documents/checklist",
  verifyToken,
  checkRole("organization"),
  documentController.getSubmissionChecklist,
);
router.post(
  "/documents",
  verifyToken,
  checkRole("organization"),
  upload.single("document"),
  documentController.submitDocument,
);
router.put(
  "/documents/:id",
  verifyToken,
  checkRole("organization"),
  upload.single("document"),
  documentController.updateDocument,
);
router.delete(
  "/documents/:id",
  verifyToken,
  checkRole("organization"),
  documentController.deleteDocument,
);
router.get(
  "/documents/:id/download",
  verifyToken,
  checkRole("organization"),
  documentController.downloadDocument,
);

// Adviser routes
router.get(
  "/advisers",
  verifyToken,
  checkRole("organization"),
  adviserController.getAdvisers,
);

router.put(
  "/advisers/:id/photo",
  verifyToken,
  checkRole("organization"),
  photoUpload.fields([
    { name: "photo", maxCount: 1 },
    { name: "signature", maxCount: 1 }
  ]),
  adviserController.updateAdviser,
);

// Demographics routes
router.get(
  "/demographics",
  verifyToken,
  checkRole("organization"),
  memberController.getDemographics,
);

// CVL Attachment routes
router.get(
  "/cvl-attachments",
  verifyToken,
  checkRole("organization"),
  cvlAttachmentController.getCVLAttachments,
);
router.post(
  "/cvl-attachments",
  verifyToken,
  checkRole("organization"),
  upload.array("documents", 10), // Allow up to 10 files
  cvlAttachmentController.createCVLAttachment,
);
router.put(
  "/cvl-attachments/:attachment_type",
  verifyToken,
  checkRole("organization"),
  upload.array("documents", 10),
  cvlAttachmentController.updateCVLAttachment,
);
router.delete(
  "/cvl-attachments/:attachment_type",
  verifyToken,
  checkRole("organization"),
  cvlAttachmentController.deleteCVLAttachment,
);
router.delete(
  "/cvl-attachments/file/:id",
  verifyToken,
  checkRole("organization"),
  cvlAttachmentController.deleteCVLAttachmentById,
);
router.get(
  "/cvl-attachments/:attachment_type/download",
  verifyToken,
  checkRole("organization"),
  cvlAttachmentController.downloadCVLAttachment,
);
router.get(
  "/cvl-attachments/file/:id/download",
  verifyToken,
  checkRole("organization"),
  cvlAttachmentController.downloadCVLFile,
);

module.exports = router;
