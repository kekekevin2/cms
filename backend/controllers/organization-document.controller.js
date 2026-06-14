const db = require("../models");

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

const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs").promises;

// Get all documents for organization
exports.getDocuments = async (req, res) => {
	try {
		const userId = req.user.user_id;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res
				.status(404)
				.json({ message: "Organization profile not found" });
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const academicYearId = req.query.academic_year_id;
		const semester = req.query.semester;
		const documentTypeId = req.query.document_type_id;
		const status = req.query.status;

		const whereClause = {
			organization_id: organization.organization_id,
		};

		if (academicYearId) {
			whereClause.academic_year_id = academicYearId;
		}

		if (semester) {
			whereClause.semester = semester;
		}

		if (documentTypeId) {
			whereClause.document_type_id = documentTypeId;
		}

		if (status) {
			whereClause.status = status;
		}

		const { count, rows } = await db.OrganizationDocument.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["submitted_date", "DESC"]],
			include: [
				{
					model: db.DocumentType,
					attributes: ["document_type_id", "type_name", "description"],
					required: false,
				},
				{
					model: db.AcademicYear,
					attributes: ["academic_year_id", "year_start", "year_end"],
					required: false,
				},
				{
					model: db.User,
					as: "reviewer",
					attributes: ["user_id", "email"],
					required: false,
				},
			],
		});

		res.json({
			documents: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get documents error:", error);
		res.status(500).json({ message: "Error fetching documents" });
	}
};

// Submit a new document
exports.submitDocument = async (req, res) => {
	try {
		const userId = req.user.user_id;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res
				.status(404)
				.json({ message: "Organization profile not found" });
		}

		if (!req.file) {
			return res.status(400).json({ message: "No file uploaded" });
		}

		const { document_type_id, academic_year_id, semester, document_title, activity_date, venue, participants, sdgs } =
			req.body;

		if (
			!academic_year_id ||
			!semester
		) {
			return res.status(400).json({
				message:
					"Academic year and semester are required",
			});
		}

		// Parse SDGs if it's a string
		let parsedSDGs = null;
		if (sdgs) {
			try {
				parsedSDGs = typeof sdgs === 'string' ? JSON.parse(sdgs) : sdgs;
			} catch (e) {
				console.error('Error parsing SDGs:', e);
			}
		}

		// Auto-generate document title if not provided
		let finalDocumentTitle = document_title;
		if (!finalDocumentTitle || finalDocumentTitle.trim() === '') {
			// Generate title from activity details
			const activityDateStr = activity_date ? new Date(activity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
			const venueStr = venue ? ` at ${venue}` : '';
			finalDocumentTitle = `Activity Report - ${activityDateStr}${venueStr}`.substring(0, 255);
		}

		// Create document record
		const document = await db.OrganizationDocument.create({
			organization_id: organization.organization_id,
			document_type_id: document_type_id || null,
			academic_year_id,
			semester,
			document_title: finalDocumentTitle,
			activity_date: activity_date || null,
			venue: venue || null,
			participants: participants || null,
			sdgs: parsedSDGs,
			document_path: req.file.path,
			original_filename: req.file.originalname,
			file_size: req.file.size,
			mime_type: req.file.mimetype,
			submitted_date: new Date(),
			status: "pending",
		});

		res.status(201).json({
			message: "Document submitted successfully",
			document,
		});
	} catch (error) {
		console.error("Submit report error:", error);
		// Delete uploaded file if database operation fails
		if (req.file) {
			try {
				await fs.unlink(req.file.path);
			} catch (unlinkError) {
				console.error("Error deleting file:", unlinkError);
			}
		}
		res.status(500).json({ message: "Error submitting document" });
	}
};

// Update document (resubmit)
exports.updateDocument = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { id } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res
				.status(404)
				.json({ message: "Organization profile not found" });
		}

		const document = await db.OrganizationDocument.findOne({
			where: {
				document_id: id,
				organization_id: organization.organization_id,
			},
		});

		if (!document) {
			return res.status(404).json({ message: "Document not found" });
		}

		const updateData = {};

		// If new file is uploaded, replace the old one
		if (req.file) {
			// Delete old file
			try {
				await fs.unlink(document.document_path);
			} catch (error) {
				console.error("Error deleting old file:", error);
			}

			updateData.document_path = req.file.path;
			updateData.original_filename = req.file.originalname;
			updateData.file_size = req.file.size;
			updateData.mime_type = req.file.mimetype;
			updateData.submitted_date = new Date();
			updateData.status = "pending";
			updateData.reviewed_by = null;
			updateData.review_date = null;
			updateData.review_comments = null;
		}

		// Update title if provided
		if (req.body.document_title) {
			updateData.document_title = req.body.document_title;
		}

		await document.update(updateData);

		res.json({
			message: "Document updated successfully",
			document,
		});
	} catch (error) {
		console.error("Update document error:", error);
		res.status(500).json({ message: "Error updating document" });
	}
};

// Delete document
exports.deleteDocument = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { id } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res
				.status(404)
				.json({ message: "Organization profile not found" });
		}

		const document = await db.OrganizationDocument.findOne({
			where: {
				document_id: id,
				organization_id: organization.organization_id,
			},
		});

		if (!document) {
			return res.status(404).json({ message: "Document not found" });
		}

		// Delete file from filesystem
		try {
			await fs.unlink(document.document_path);
		} catch (error) {
			console.error("Error deleting file:", error);
		}

		await document.destroy();

		res.json({ message: "Document deleted successfully" });
	} catch (error) {
		console.error("Delete document error:", error);
		res.status(500).json({ message: "Error deleting document" });
	}
};

// Download document
exports.downloadDocument = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { id } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res
				.status(404)
				.json({ message: "Organization profile not found" });
		}

		const document = await db.OrganizationDocument.findOne({
			where: {
				document_id: id,
				organization_id: organization.organization_id,
			},
		});

		if (!document) {
			return res.status(404).json({ message: "Document not found" });
		}

		res.download(document.document_path, document.original_filename);
	} catch (error) {
		console.error("Download document error:", error);
		res.status(500).json({ message: "Error downloading document" });
	}
};

// Get document types
exports.getDocumentTypes = async (req, res) => {
	try {
		const documentTypes = await db.DocumentType.findAll({
			where: { is_active: true },
			order: [["type_name", "ASC"]],
		});

		res.json({ documentTypes });
	} catch (error) {
		console.error("Get document types error:", error);
		res.status(500).json({ message: "Error fetching document types" });
	}
};

// Get submission checklist (required documents for current semester)
exports.getSubmissionChecklist = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { academic_year_id, semester } = req.query;

		if (!academic_year_id || !semester) {
			return res.status(400).json({
				message: "Academic year and semester are required",
			});
		}

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res
				.status(404)
				.json({ message: "Organization profile not found" });
		}

		// Get all required document types
		const requiredTypes = await db.DocumentType.findAll({
			where: {
				required_per_semester: true,
				is_active: true,
			},
		});

		// Get submitted documents for this semester
		const submittedDocs = await db.OrganizationDocument.findAll({
			where: {
				organization_id: organization.organization_id,
				academic_year_id,
				semester,
			},
			include: [
				{
					model: db.DocumentType,
					attributes: ["document_type_id", "type_name"],
				},
			],
		});

		// Create checklist
		const checklist = requiredTypes.map((type) => {
			const submission = submittedDocs.find(
				(doc) => doc.document_type_id === type.document_type_id,
			);

			return {
				document_type_id: type.document_type_id,
				type_name: type.type_name,
				description: type.description,
				required: true,
				submitted: !!submission,
				status: submission ? submission.status : "not_submitted",
				document_id: submission ? submission.document_id : null,
				submitted_date: submission ? submission.submitted_date : null,
			};
		});

		res.json({ checklist });
	} catch (error) {
		console.error("Get submission checklist error:", error);
		res.status(500).json({ message: "Error fetching submission checklist" });
	}
};

// Dean controllers for reviewing documents
exports.deanGetOrganizationDocuments = async (req, res) => {
	try {
		const deanId = req.user.user_id;

		const deanInfo = await getDepartmentForUser(deanId);
		if (!deanInfo) {
		  return res.status(404).json({ message: 'Department profile not found' });
		}
		const dean = { department: deanInfo.department };

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const organizationId = req.query.organization_id;
		const status = req.query.status;
		const semester = req.query.semester;

		const whereClause = {};

		if (organizationId) {
			whereClause.organization_id = organizationId;
		}

		if (status) {
			whereClause.status = status;
		}

		if (semester) {
			whereClause.semester = semester;
		}

		const { count, rows } = await db.OrganizationDocument.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["submitted_date", "DESC"]],
			include: [
				{
					model: db.Organization,
					where: { department: dean.department },
					attributes: ["organization_id", "organization_name", "department"],
				},
				{
					model: db.DocumentType,
					attributes: ["document_type_id", "type_name", "description"],
				},
				{
					model: db.AcademicYear,
					attributes: ["academic_year_id", "year_start", "year_end"],
				},
			],
		});

		res.json({
			documents: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Dean get organization documents error:", error);
		res.status(500).json({ message: "Error fetching documents" });
	}
};

// Dean review document
exports.deanReviewDocument = async (req, res) => {
	try {
		const deanId = req.user.user_id;
		const { id } = req.params;
		const { status, review_comments } = req.body;

		if (
			!status ||
			!["approved", "rejected", "revision_needed"].includes(status)
		) {
			return res.status(400).json({
				message:
					"Valid status is required (approved, rejected, revision_needed)",
			});
		}

		const deanInfo = await getDepartmentForUser(deanId);
		if (!deanInfo) {
		  return res.status(404).json({ message: 'Department profile not found' });
		}
		const dean = { department: deanInfo.department };

		const document = await db.OrganizationDocument.findOne({
			where: { document_id: id },
			include: [
				{
					model: db.Organization,
					where: { department: dean.department },
				},
			],
		});

		if (!document) {
			return res.status(404).json({
				message: "Document not found or not in your department",
			});
		}

		await document.update({
			status,
			reviewed_by: deanId,
			review_date: new Date(),
			review_comments,
		});

		res.json({
			message: "Document reviewed successfully",
			document,
		});
	} catch (error) {
		console.error("Dean review document error:", error);
		res.status(500).json({ message: "Error reviewing document" });
	}
};

// Dean download document
exports.deanDownloadDocument = async (req, res) => {
	try {
		const deanId = req.user.user_id;
		const { id } = req.params;

		const deanInfo = await getDepartmentForUser(deanId);
		if (!deanInfo) {
		  return res.status(404).json({ message: 'Department profile not found' });
		}
		const dean = { department: deanInfo.department };

		const document = await db.OrganizationDocument.findOne({
			where: { document_id: id },
			include: [
				{
					model: db.Organization,
					where: { department: dean.department },
				},
			],
		});

		if (!document) {
			return res.status(404).json({
				message: "Document not found or not in your department",
			});
		}

		res.download(document.document_path, document.original_filename);
	} catch (error) {
		console.error("Dean download document error:", error);
		res.status(500).json({ message: "Error downloading document" });
	}
};

// Get reports per SDG per year for organization
exports.getReportsBySDGPerYear = async (req, res) => {
	try {
		const userId = req.user.user_id;

		// Get organization profile
		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization not found" });
		}

		// Get all documents with SDGs
		const documents = await db.OrganizationDocument.findAll({
			where: {
				organization_id: organization.organization_id,
				sdgs: { [Op.ne]: null },
			},
			include: [
				{
					model: db.AcademicYear,
					attributes: ["year_start", "year_end"],
					required: false,
				},
			],
		});

		// Process SDG data
		const sdgStats = {};

		documents.forEach((doc) => {
			// Get year from academic year or activity date
			let year = null;
			if (doc.AcademicYear) {
				year = doc.AcademicYear.year_start;
			} else if (doc.activity_date) {
				year = new Date(doc.activity_date).getFullYear();
			} else {
				year = new Date(doc.submitted_date).getFullYear();
			}

			// Parse SDGs (could be array or JSON string)
			let sdgs = [];
			if (doc.sdgs) {
				try {
					sdgs = typeof doc.sdgs === 'string' ? JSON.parse(doc.sdgs) : doc.sdgs;
				} catch (e) {
					console.error('Error parsing SDGs:', e);
				}
			}

			// Count each SDG
			if (Array.isArray(sdgs)) {
				sdgs.forEach((sdgId) => {
					const key = `${year}-${sdgId}`;
					if (!sdgStats[key]) {
						sdgStats[key] = {
							year,
							sdg_number: sdgId,
							event_count: 0,
						};
					}
					sdgStats[key].event_count++;
				});
			}
		});

		// Convert to array and sort
		const stats = Object.values(sdgStats).sort((a, b) => {
			if (b.year !== a.year) return b.year - a.year;
			return a.sdg_number - b.sdg_number;
		});

		res.json(stats);
	} catch (error) {
		console.error("Get reports by SDG per year error:", error);
		res.status(500).json({ message: "Error fetching analytics" });
	}
};

// Dean: Get reports per SDG per year for all organizations in department
exports.deanGetReportsBySDGPerYear = async (req, res) => {
	try {
		const userId = req.user.user_id;

		// Get dean profile
		const deanInfo = await getDepartmentForUser(deanUserId);
		if (!deanInfo) {
		  return res.status(404).json({ message: 'Department profile not found' });
		}
		const dean = { department: deanInfo.department };

		// Get all organizations in dean's department
		const organizations = await db.Organization.findAll({
			where: { department: dean.department },
			attributes: ["organization_id"],
		});

		const orgIds = organizations.map(org => org.organization_id);

		// Get all documents with SDGs from these organizations
		const documents = await db.OrganizationDocument.findAll({
			where: {
				organization_id: { [Op.in]: orgIds },
				sdgs: { [Op.ne]: null },
			},
			include: [
				{
					model: db.AcademicYear,
					attributes: ["year_start", "year_end"],
					required: false,
				},
			],
		});

		// Process SDG data
		const sdgStats = {};

		documents.forEach((doc) => {
			// Get year from academic year or activity date
			let year = null;
			if (doc.AcademicYear) {
				year = doc.AcademicYear.year_start;
			} else if (doc.activity_date) {
				year = new Date(doc.activity_date).getFullYear();
			} else {
				year = new Date(doc.submitted_date).getFullYear();
			}

			// Parse SDGs (could be array or JSON string)
			let sdgs = [];
			if (doc.sdgs) {
				try {
					sdgs = typeof doc.sdgs === 'string' ? JSON.parse(doc.sdgs) : doc.sdgs;
				} catch (e) {
					console.error('Error parsing SDGs:', e);
				}
			}

			// Count each SDG
			if (Array.isArray(sdgs)) {
				sdgs.forEach((sdgId) => {
					const key = `${year}-${sdgId}`;
					if (!sdgStats[key]) {
						sdgStats[key] = {
							year,
							sdg_number: sdgId,
							event_count: 0,
						};
					}
					sdgStats[key].event_count++;
				});
			}
		});

		// Convert to array and sort
		const stats = Object.values(sdgStats).sort((a, b) => {
			if (b.year !== a.year) return b.year - a.year;
			return a.sdg_number - b.sdg_number;
		});

		res.json(stats);
	} catch (error) {
		console.error("Dean get reports by SDG per year error:", error);
		res.status(500).json({ message: "Error fetching analytics" });
	}
};
