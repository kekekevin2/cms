const db = require("../models");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs").promises;

// Get faculty's course assignments with requirement submission status
exports.getMyAssignments = async (req, res) => {
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

		const whereClause = {
			faculty_id: faculty.faculty_id,
			status: "active",
		};

		if (academic_year_id) {
			whereClause.academic_year_id = academic_year_id;
		}

		if (semester) {
			whereClause.semester = semester;
		}

		const { count, rows } = await db.CourseAssignment.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["assigned_date", "DESC"]],
			include: [
				{
					model: db.Course,
					attributes: ["course_id", "course_code", "course_name"],
				},
				{
					model: db.Section,
					attributes: ["section_id", "section_name", "year_level"],
				},
				{
					model: db.AcademicYear,
					attributes: ["academic_year_id", "year_start", "year_end"],
				},
				{
					model: db.RequirementSubmission,
					required: false,
				},
			],
		});

		res.json({
			assignments: rows,
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
		});
	} catch (error) {
		console.error("Get my assignments error:", error);
		res.status(500).json({ message: "Error fetching assignments" });
	}
};

// Get requirement submissions for a specific assignment
exports.getRequirementsByAssignment = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { assignment_id } = req.params;

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Verify assignment belongs to faculty
		const assignment = await db.CourseAssignment.findOne({
			where: {
				assignment_id,
				faculty_id: faculty.faculty_id,
			},
			include: [
				{
					model: db.Course,
					attributes: ["course_id", "course_code", "course_name"],
				},
				{
					model: db.Section,
					attributes: ["section_id", "section_name", "year_level"],
				},
				{
					model: db.AcademicYear,
					attributes: ["academic_year_id", "year_start", "year_end"],
				},
			],
		});

		if (!assignment) {
			return res.status(404).json({ message: "Assignment not found" });
		}

		// Get all submissions for this assignment
		const submissions = await db.RequirementSubmission.findAll({
			where: { assignment_id },
			order: [["submission_date", "DESC"]],
		});

		// Define all requirement types
		const requirementTypes = [
			"Instructional Materials",
			"Student Class Attendance Sheet",
			"Acknowledgement Receipt of Syllabus",
			"Acknowledgement Receipt of Exam",
			"Midterm, Final Exam, and TQS",
			"Student Exam (Highest-Middle-Lowest)",
			"Key to Correction of Midterm and Final Exam",
			"Report of Grades",
			"Class Record",
		];

		// Map submissions to requirement types
		const requirementsStatus = requirementTypes.map((type, index) => {
			const submission = submissions.find((s) => s.requirement_type === type);
			return {
				requirement_number: index + 1,
				requirement_type: type,
				submission: submission || null,
			};
		});

		res.json({
			assignment,
			requirements: requirementsStatus,
		});
	} catch (error) {
		console.error("Get requirements by assignment error:", error);
		res.status(500).json({ message: "Error fetching requirements" });
	}
};

// Submit a requirement (with file upload)
exports.submitRequirement = async (req, res) => {
	try {
		const facultyUserId = req.user.user_id;
		const { assignment_id, requirement_type } = req.body;

		// Validate file upload
		if (!req.file) {
			return res.status(400).json({ message: "File is required" });
		}

		// Get faculty profile
		const faculty = await db.Faculty.findOne({
			where: { user_id: facultyUserId },
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty profile not found" });
		}

		// Verify assignment belongs to faculty
		const assignment = await db.CourseAssignment.findOne({
			where: {
				assignment_id,
				faculty_id: faculty.faculty_id,
			},
		});

		if (!assignment) {
			return res.status(404).json({ message: "Assignment not found" });
		}

		// Check if requirement already submitted
		const existingSubmission = await db.RequirementSubmission.findOne({
			where: {
				assignment_id,
				requirement_type,
			},
		});

		if (existingSubmission) {
			// Delete old file
			try {
				await fs.unlink(existingSubmission.file_path);
			} catch (err) {
				console.error("Error deleting old file:", err);
			}

			// Update existing submission
			existingSubmission.file_path = req.file.path;
			existingSubmission.file_name = req.file.originalname;
			existingSubmission.file_size = req.file.size;
			existingSubmission.submission_date = new Date();
			existingSubmission.status = "pending";
			existingSubmission.dean_remarks = null;
			existingSubmission.validated_by = null;
			existingSubmission.validated_date = null;
			await existingSubmission.save();

			return res.json({
				message: "Requirement updated successfully",
				submission: existingSubmission,
			});
		}

		// Create new submission
		const newSubmission = await db.RequirementSubmission.create({
			assignment_id,
			requirement_type,
			file_path: req.file.path,
			file_name: req.file.originalname,
			file_size: req.file.size,
		});

		res.status(201).json({
			message: "Requirement submitted successfully",
			submission: newSubmission,
		});
	} catch (error) {
		console.error("Submit requirement error:", error);
		res.status(500).json({ message: "Error submitting requirement" });
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
			where: { submission_id },
			include: [
				{
					model: db.CourseAssignment,
					where: { faculty_id: faculty.faculty_id },
				},
			],
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Can't delete if already cleared
		if (submission.status === "cleared") {
			return res.status(400).json({
				message: "Cannot delete a cleared requirement",
			});
		}

		// Delete file
		try {
			await fs.unlink(submission.file_path);
		} catch (err) {
			console.error("Error deleting file:", err);
		}

		// Delete submission
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
			where: { submission_id },
			include: [
				{
					model: db.CourseAssignment,
					where: { faculty_id: faculty.faculty_id },
				},
			],
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Send file
		res.download(submission.file_path, submission.file_name);
	} catch (error) {
		console.error("Download requirement error:", error);
		res.status(500).json({ message: "Error downloading file" });
	}
};
