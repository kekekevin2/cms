const db = require("../models");
const fs = require("fs").promises;

// Helper function to get attachment title
const getAttachmentTitle = (attachmentType) => {
	const titleMap = {
		"Attachment A": "Commitment Letter of the Adviser",
		"Attachment B": "Certification of Academic Qualifications",
		"Attachment C": "Profile of Student Organization",
		"Attachment D": "List of Members",
		"Attachment E": "History of Student Organization",
		"Attachment F": "Declaration of the Organization's Revolving Fund",
		"Attachment G": "Preamble",
		"Attachment H": "Student Organization's Adviser Profile",
		"Attachment J": "List of Officers"
	};
	return titleMap[attachmentType] || attachmentType;
};

// Get all CVL attachments for organization
exports.getCVLAttachments = async (req, res) => {
	try {
		const userId = req.user.user_id;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		const cvlAttachments = await db.CVLAttachment.findAll({
			where: { organization_id: organization.organization_id },
			order: [["uploaded_at", "DESC"]],
		});

		// Return each file as a separate item
		const result = cvlAttachments.map(attachment => ({
			id: attachment.cvl_attachment_id,
			attachment: attachment.attachment_type,
			title: getAttachmentTitle(attachment.attachment_type),
			date_created: attachment.date_created,
			semester: attachment.semester,
			academic_year_id: attachment.academic_year_id,
			filename: attachment.original_filename,
			file_size: attachment.file_size,
			mime_type: attachment.mime_type,
			uploaded_at: attachment.uploaded_at
		}));

		res.json({ cvlAttachments: result });
	} catch (error) {
		console.error("Get CVL attachments error:", error);
		res.status(500).json({ message: "Error fetching CVL attachments" });
	}
};

// Create new CVL attachment (upload)
exports.createCVLAttachment = async (req, res) => {
	try {
		const userId = req.user.user_id;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ message: "No files uploaded" });
		}

		const { attachment_type, date_created, semester, academic_year_id } = req.body;

		if (!attachment_type) {
			return res.status(400).json({ message: "Attachment type is required" });
		}

		if (!semester) {
			return res.status(400).json({ message: "Semester is required" });
		}

		// Create records for each uploaded file
		const attachments = [];
		for (const file of req.files) {
			const attachment = await db.CVLAttachment.create({
				organization_id: organization.organization_id,
				attachment_type,
				date_created: date_created || null,
				semester: semester,
				academic_year_id: academic_year_id || null,
				document_path: file.path,
				original_filename: file.originalname,
				file_size: file.size,
				mime_type: file.mimetype,
			});
			attachments.push(attachment);
		}

		res.status(201).json({
			message: "CVL attachment(s) uploaded successfully",
			attachments,
		});
	} catch (error) {
		console.error("Create CVL attachment error:", error);
		// Delete uploaded files if database operation fails
		if (req.files) {
			for (const file of req.files) {
				try {
					await fs.unlink(file.path);
				} catch (unlinkError) {
					console.error("Error deleting file:", unlinkError);
				}
			}
		}
		res.status(500).json({ message: "Error uploading CVL attachment" });
	}
};

// Update CVL attachment
exports.updateCVLAttachment = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { attachment_type } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		const { date_created, semester, academic_year_id } = req.body;

		// Get existing attachments of this type
		const existingAttachments = await db.CVLAttachment.findAll({
			where: {
				organization_id: organization.organization_id,
				attachment_type: decodeURIComponent(attachment_type),
			},
		});

		if (existingAttachments.length === 0) {
			return res.status(404).json({ message: "CVL attachment not found" });
		}

		// If new files are uploaded, delete old ones and create new records
		if (req.files && req.files.length > 0) {
			// Delete old files
			for (const attachment of existingAttachments) {
				try {
					await fs.unlink(attachment.document_path);
					await attachment.destroy();
				} catch (error) {
					console.error("Error deleting old file:", error);
				}
			}

			// Create new records
			const newAttachments = [];
			for (const file of req.files) {
				const attachment = await db.CVLAttachment.create({
					organization_id: organization.organization_id,
					attachment_type: decodeURIComponent(attachment_type),
					date_created: date_created || existingAttachments[0].date_created,
					semester: semester || existingAttachments[0].semester,
					academic_year_id: academic_year_id || existingAttachments[0].academic_year_id,
					document_path: file.path,
					original_filename: file.originalname,
					file_size: file.size,
					mime_type: file.mimetype,
				});
				newAttachments.push(attachment);
			}

			res.json({
				message: "CVL attachment updated successfully",
				attachments: newAttachments,
			});
		} else {
			// Just update metadata (date_created, semester, academic_year_id)
			const updateData = {};
			if (date_created !== undefined) updateData.date_created = date_created;
			if (semester !== undefined) updateData.semester = semester;
			if (academic_year_id !== undefined) updateData.academic_year_id = academic_year_id;

			if (Object.keys(updateData).length > 0) {
				for (const attachment of existingAttachments) {
					await attachment.update(updateData);
				}
			}

			res.json({
				message: "CVL attachment metadata updated successfully",
				attachments: existingAttachments,
			});
		}
	} catch (error) {
		console.error("Update CVL attachment error:", error);
		res.status(500).json({ message: "Error updating CVL attachment" });
	}
};

// Delete CVL attachment
exports.deleteCVLAttachment = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { attachment_type } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		// Get all attachments of this type
		const attachments = await db.CVLAttachment.findAll({
			where: {
				organization_id: organization.organization_id,
				attachment_type: decodeURIComponent(attachment_type),
			},
		});

		if (attachments.length === 0) {
			return res.status(404).json({ message: "CVL attachment not found" });
		}

		// Delete all files and records
		for (const attachment of attachments) {
			try {
				await fs.unlink(attachment.document_path);
			} catch (error) {
				console.error("Error deleting file:", error);
			}
			await attachment.destroy();
		}

		res.json({ message: "CVL attachment deleted successfully" });
	} catch (error) {
		console.error("Delete CVL attachment error:", error);
		res.status(500).json({ message: "Error deleting CVL attachment" });
	}
};

// Delete CVL attachment by ID
exports.deleteCVLAttachmentById = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { id } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		const attachment = await db.CVLAttachment.findOne({
			where: {
				cvl_attachment_id: id,
				organization_id: organization.organization_id,
			},
		});

		if (!attachment) {
			return res.status(404).json({ message: "CVL attachment not found" });
		}

		// Delete file and record
		try {
			await fs.unlink(attachment.document_path);
		} catch (error) {
			console.error("Error deleting file:", error);
		}
		await attachment.destroy();

		res.json({ message: "CVL attachment deleted successfully" });
	} catch (error) {
		console.error("Delete CVL attachment error:", error);
		res.status(500).json({ message: "Error deleting CVL attachment" });
	}
};

// Download CVL attachment files
exports.downloadCVLAttachment = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { attachment_type } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		// Get all files for this attachment type
		const attachments = await db.CVLAttachment.findAll({
			where: {
				organization_id: organization.organization_id,
				attachment_type: decodeURIComponent(attachment_type),
			},
		});

		if (attachments.length === 0) {
			return res.status(404).json({ message: "CVL attachment not found" });
		}

		// If single file, download directly
		if (attachments.length === 1) {
			return res.download(attachments[0].document_path, attachments[0].original_filename);
		}

		// Multiple files - return file list for frontend to handle
		const files = attachments.map(att => ({
			id: att.cvl_attachment_id,
			filename: att.original_filename,
			path: att.document_path,
			size: att.file_size,
		}));

		res.json({ files });
	} catch (error) {
		console.error("Download CVL attachment error:", error);
		res.status(500).json({ message: "Error downloading CVL attachment" });
	}
};

// Download single file by ID
exports.downloadCVLFile = async (req, res) => {
	try {
		const userId = req.user.user_id;
		const { id } = req.params;

		const organization = await db.Organization.findOne({
			where: { user_id: userId },
		});

		if (!organization) {
			return res.status(404).json({ message: "Organization profile not found" });
		}

		const attachment = await db.CVLAttachment.findOne({
			where: {
				cvl_attachment_id: id,
				organization_id: organization.organization_id,
			},
		});

		if (!attachment) {
			return res.status(404).json({ message: "File not found" });
		}

		res.download(attachment.document_path, attachment.original_filename);
	} catch (error) {
		console.error("Download CVL file error:", error);
		res.status(500).json({ message: "Error downloading file" });
	}
};
