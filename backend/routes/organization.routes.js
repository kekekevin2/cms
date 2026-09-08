const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const memberController = require("../controllers/organization-member.controller");
const documentController = require("../controllers/organization-document.controller");
const adviserController = require("../controllers/organization-adviser.controller");
const cvlAttachmentController = require("../controllers/cvl-attachment.controller");
const { makeUpload, MB, DOCUMENT_TYPES, IMAGE_TYPES, SPREADSHEET_TYPES } = require("../utils/upload");

const upload = makeUpload({
  folder: "organization-documents",
  allowedTypes: DOCUMENT_TYPES,
  maxSize: 25 * MB,
});

const csvUpload = makeUpload({
  folder: "organization-population",
  allowedTypes: SPREADSHEET_TYPES,
  maxSize: 5 * MB,
});

const photoUpload = makeUpload({
  folder: "member-photos",
  allowedTypes: IMAGE_TYPES,
  maxSize: 5 * MB,
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
