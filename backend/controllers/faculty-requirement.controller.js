const db = require("../models");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs").promises;

// Get faculty's requirement submissions (per academic year/semester)
exports.getMyRequirements = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const academic_year_id = req.query.academic_year_id;
		const semester = req.query.semester;
		const status = req.query.status;

		const whereClause = {
			faculty_id: faculty.faculty_id,
		};

		if (academic_year_id) {
			whereClause.academic_year_id = academic_year_id;
		}

		if (semester) {
			whereClause.semester = semester;
		}

		if (status) {
			whereClause.status = status;
		}

		const { count, rows } = await db.RequirementSubmission.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["submission_date", "DESC"]],
			include: [
				{
					model: db.AcademicYear,
					attributes: ["academic_year_id", "year_start", "year_end"],
				},
				{
					model: db.RequirementFile,
					as: "files",
					attributes: [
						"file_id",
						"file_path",
						"file_name",
						"file_size",
						"upload_date",
					],
					order: [["upload_date", "ASC"]],
				},
			],
		});

		res.json({
			requirements: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get my requirements error:", error);
		res.status(500).json({ message: "Error fetching requirements" });
	}
};

// Get statistics for faculty's requirements
exports.getMyStatistics = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		const academic_year_id = req.query.academic_year_id;
		const semester = req.query.semester;

		const whereClause = {
			faculty_id: faculty.faculty_id,
		};

		if (academic_year_id) {
			whereClause.academic_year_id = academic_year_id;
		}

		if (semester) {
			whereClause.semester = semester;
		}

		const requirements = await db.RequirementSubmission.findAll({
			where: whereClause,
		});

		const total = requirements.length;
		const validated = requirements.filter(
			(r) => r.status === "validated",
		).length;
		const pending = requirements.filter((r) => r.status === "pending").length;
		const returned = requirements.filter((r) => r.status === "returned").length;

		res.json({
			total_requirements: total,
			validated,
			pending,
			returned,
			completion_rate: total > 0 ? ((validated / total) * 100).toFixed(2) : 0,
		});
	} catch (error) {
		console.error("Get my statistics error:", error);
		res.status(500).json({ message: "Error fetching statistics" });
	}
};

// Submit a requirement (with multiple file uploads)
exports.submitRequirement = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { academic_year_id, semester, requirement_name } = req.body;

		// Validate required fields
		if (!academic_year_id || !semester || !requirement_name) {
			return res.status(400).json({
				message: "Academic year, semester, and requirement name are required",
			});
		}

		// Validate file upload (at least one file required)
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ message: "At least one file is required" });
		}

		// Check file sizes
		const maxSize = 200 * 1024 * 1024; // 200MB
		const oversizedFiles = req.files.filter(f => f.size > maxSize);
		if (oversizedFiles.length > 0) {
			return res.status(400).json({ 
				message: `File size exceeds 200MB limit: ${oversizedFiles.map(f => f.originalname).join(', ')}` 
			});
		}

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Create new submission (keep first file in main record for backward compatibility)
		const firstFile = req.files[0];
		const newSubmission = await db.RequirementSubmission.create({
			faculty_id: faculty.faculty_id,
			academic_year_id,
			semester,
			requirement_name,
			file_path: firstFile.path,
			file_name: firstFile.originalname,
			file_size: firstFile.size,
		});

		// Create file records for all uploaded files
		const fileRecords = req.files.map((file) => ({
			submission_id: newSubmission.submission_id,
			file_path: file.path,
			file_name: file.originalname,
			file_size: file.size,
		}));

		await db.RequirementFile.bulkCreate(fileRecords);

		// Fetch the created submission with associations
		const submission = await db.RequirementSubmission.findOne({
			where: { submission_id: newSubmission.submission_id },
			include: [
				{
					model: db.AcademicYear,
					attributes: ["academic_year_id", "year_start", "year_end"],
				},
				{
					model: db.RequirementFile,
					as: "files",
					attributes: [
						"file_id",
						"file_path",
						"file_name",
						"file_size",
						"upload_date",
					],
				},
			],
		});

		res.status(201).json({
			message: "Requirement submitted successfully",
			submission,
		});
	} catch (error) {
		console.error("Submit requirement error:", error);
		
		// Handle multer file size error
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ 
				message: "File size exceeds the 200MB limit. Please upload smaller files." 
			});
		}
		
		res.status(500).json({ message: "Error submitting requirement" });
	}
};

// Add more files to existing requirement submission
exports.addFiles = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { submission_id } = req.params;

		// Validate file upload
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ message: "At least one file is required" });
		}

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Find submission and verify ownership
		const submission = await db.RequirementSubmission.findOne({
			where: {
				submission_id,
				faculty_id: faculty.faculty_id,
			},
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Can't add files if already validated
		if (submission.status === "validated") {
			return res.status(400).json({
				message: "Cannot add files to a validated requirement",
			});
		}

		// Create file records for all uploaded files
		const fileRecords = req.files.map((file) => ({
			submission_id: submission.submission_id,
			file_path: file.path,
			file_name: file.originalname,
			file_size: file.size,
		}));

		const newFiles = await db.RequirementFile.bulkCreate(fileRecords);

		// Reset status to pending
		submission.status = "pending";
		submission.dean_remarks = null;
		submission.validated_by = null;
		submission.validated_date = null;
		submission.submission_date = new Date();
		await submission.save();

		res.json({
			message: "Files added successfully",
			files: newFiles,
		});
	} catch (error) {
		console.error("Add files error:", error);
		res.status(500).json({ message: "Error adding files" });
	}
};

// Delete a specific file from a requirement submission
exports.deleteFile = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { submission_id, file_id } = req.params;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Find submission and verify ownership
		const submission = await db.RequirementSubmission.findOne({
			where: {
				submission_id,
				faculty_id: faculty.faculty_id,
			},
			include: [
				{
					model: db.RequirementFile,
					as: "files",
				},
			],
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Can't delete if already validated
		if (submission.status === "validated") {
			return res.status(400).json({
				message: "Cannot delete files from a validated requirement",
			});
		}

		// Find the file
		const file = await db.RequirementFile.findOne({
			where: {
				file_id,
				submission_id,
			},
		});

		if (!file) {
			return res.status(404).json({ message: "File not found" });
		}

		// Don't allow deleting the last file
		if (submission.files.length <= 1) {
			return res.status(400).json({
				message:
					"Cannot delete the last file. Delete the entire submission instead.",
			});
		}

		// Delete physical file
		try {
			await fs.unlink(file.file_path);
		} catch (err) {
			console.error("Error deleting file:", err);
		}

		// Delete file record
		await file.destroy();

		res.json({ message: "File deleted successfully" });
	} catch (error) {
		console.error("Delete file error:", error);
		res.status(500).json({ message: "Error deleting file" });
	}
};

// Delete a requirement submission
exports.deleteRequirement = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { submission_id } = req.params;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Find submission and verify ownership
		const submission = await db.RequirementSubmission.findOne({
			where: {
				submission_id,
				faculty_id: faculty.faculty_id,
			},
			include: [
				{
					model: db.RequirementFile,
					as: "files",
				},
			],
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Can't delete if already validated
		if (submission.status === "validated") {
			return res.status(400).json({
				message: "Cannot delete a validated requirement",
			});
		}

		// Delete all associated files
		if (submission.files && submission.files.length > 0) {
			for (const file of submission.files) {
				try {
					await fs.unlink(file.file_path);
				} catch (err) {
					console.error("Error deleting file:", err);
				}
			}
		}

		// Delete legacy file if exists
		if (submission.file_path) {
			try {
				await fs.unlink(submission.file_path);
			} catch (err) {
				console.error("Error deleting file:", err);
			}
		}

		// Delete submission (cascade will delete file records)
		await submission.destroy();

		res.json({ message: "Requirement deleted successfully" });
	} catch (error) {
		console.error("Delete requirement error:", error);
		res.status(500).json({ message: "Error deleting requirement" });
	}
};

// Download a requirement file
exports.downloadRequirement = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { submission_id } = req.params;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Find submission and verify ownership
		const submission = await db.RequirementSubmission.findOne({
			where: {
				submission_id,
				faculty_id: faculty.faculty_id,
			},
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Check if file exists
		try {
			await fs.access(submission.file_path);
		} catch (err) {
			return res.status(404).json({ message: "File not found" });
		}

		// Send file
		res.download(submission.file_path, submission.file_name);
	} catch (error) {
		console.error("Download requirement error:", error);
		res.status(500).json({ message: "Error downloading requirement" });
	}
};

// Download a specific file by file_id
exports.downloadFile = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { submission_id, file_id } = req.params;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Verify the submission belongs to this faculty
		const submission = await db.RequirementSubmission.findOne({
			where: { submission_id, faculty_id: faculty.faculty_id },
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Find the specific file
		const file = await db.RequirementFile.findOne({
			where: { file_id, submission_id },
		});

		if (!file) {
			return res.status(404).json({ message: "File not found" });
		}

		// Check file exists on disk
		try {
			await fs.access(file.file_path);
		} catch (err) {
			return res.status(404).json({ message: "File not found on disk" });
		}

		res.download(file.file_path, file.file_name);
	} catch (error) {
		console.error("Download file error:", error);
		res.status(500).json({ message: "Error downloading file" });
	}
};

// Get faculty's clearance for a specific academic year + semester
exports.getMyPeriodClearance = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { academic_year_id, semester } = req.query;

		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty not found" });
		}

		if (!academic_year_id || !semester) {
			return res.json({ clearance: null });
		}

		const clearance = await db.FacultyClearance.findOne({
			where: {
				faculty_id: faculty.faculty_id,
				academic_year_id,
				semester,
			},
		});

		res.json({
			clearance: clearance
				? {
						clearance_status: clearance.clearance_status,
						clearance_remarks: clearance.clearance_remarks,
						clearance_date: clearance.clearance_date,
					}
				: null,
		});
	} catch (error) {
		console.error("Get period clearance error:", error);
		res.status(500).json({ message: "Error fetching clearance" });
	}
};
