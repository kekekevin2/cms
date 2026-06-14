const db = require("../models");
const { Op } = require("sequelize");

// Get all requirement submissions for dean's department faculty
exports.getAllRequirements = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const offset = (page - 1) * limit;
		const faculty_id = req.query.faculty_id;
		const academic_year_id = req.query.academic_year_id;
		const semester = req.query.semester;
		const status = req.query.status;
		const search = req.query.search || "";

		// Get all faculty in dean's department
		const facultyList = await db.Faculty.findAll({
			where: { department_id: dean.department_id },
			attributes: ["faculty_id"],
		});

		const facultyIds = facultyList.map((f) => f.faculty_id);

		if (facultyIds.length === 0) {
			return res.json({
				requirements: [],
				currentPage: page,
				totalPages: 0,
				totalItems: 0,
			});
		}

		// Build assignment where clause
		const assignmentWhere = {
			faculty_id: { [Op.in]: facultyIds },
		};

		if (faculty_id) {
			assignmentWhere.faculty_id = faculty_id;
		}

		if (academic_year_id) {
			assignmentWhere.academic_year_id = academic_year_id;
		}

		if (semester) {
			assignmentWhere.semester = semester;
		}

		// Build submission where clause
		const submissionWhere = {};
		if (status) {
			submissionWhere.status = status;
		}

		const { count, rows } = await db.RequirementSubmission.findAndCountAll({
			where: submissionWhere,
			limit,
			offset,
			order: [["submission_date", "DESC"]],
			include: [
				{
					model: db.CourseAssignment,
					where: assignmentWhere,
					include: [
						{
							model: db.Faculty,
							attributes: [
								"faculty_id",
								"employee_id",
								"first_name",
								"middle_name",
								"last_name",
							],
							where: search
								? {
										[Op.or]: [
											{ first_name: { [Op.like]: `%${search}%` } },
											{ last_name: { [Op.like]: `%${search}%` } },
											{ employee_id: { [Op.like]: `%${search}%` } },
										],
									}
								: undefined,
						},
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
		console.error("Get all requirements error:", error);
		res.status(500).json({ message: "Error fetching requirements" });
	}
};

// Get faculty accomplishment summary
exports.getFacultyAccomplishment = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { faculty_id } = req.params;

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Verify faculty belongs to dean's department
		const faculty = await db.Faculty.findOne({
			where: {
				faculty_id,
				department_id: dean.department_id,
			},
			attributes: [
				"faculty_id",
				"employee_id",
				"first_name",
				"middle_name",
				"last_name",
				"email",
				"clearance_status",
				"clearance_remarks",
				"clearance_date",
			],
		});

		if (!faculty) {
			return res.status(404).json({ message: "Faculty not found" });
		}

		const academic_year_id = req.query.academic_year_id;
		const semester = req.query.semester;

		const assignmentWhere = {
			faculty_id,
			status: "active",
		};

		if (academic_year_id) {
			assignmentWhere.academic_year_id = academic_year_id;
		}

		if (semester) {
			assignmentWhere.semester = semester;
		}

		// Get all assignments for this faculty
		const assignments = await db.CourseAssignment.findAll({
			where: assignmentWhere,
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
			order: [["assigned_date", "DESC"]],
		});

		// Calculate statistics
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

		const totalRequirements = assignments.length * requirementTypes.length;
		let submittedCount = 0;
		let validatedCount = 0;
		let pendingCount = 0;
		let returnedCount = 0;

		assignments.forEach((assignment) => {
			assignment.requirement_submissions.forEach((submission) => {
				submittedCount++;
				if (submission.status === "validated") validatedCount++;
				else if (submission.status === "pending") pendingCount++;
				else if (submission.status === "returned") returnedCount++;
			});
		});

		res.json({
			faculty,
			assignments,
			statistics: {
				total_courses: assignments.length,
				total_requirements: totalRequirements,
				submitted: submittedCount,
				validated: validatedCount,
				pending: pendingCount,
				returned: returnedCount,
				not_submitted: totalRequirements - submittedCount,
				completion_rate:
					totalRequirements > 0
						? ((validatedCount / totalRequirements) * 100).toFixed(2)
						: 0,
			},
		});
	} catch (error) {
		console.error("Get faculty accomplishment error:", error);
		res.status(500).json({ message: "Error fetching faculty accomplishment" });
	}
};

// Get requirements for a specific assignment
exports.getAssignmentRequirements = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { assignment_id } = req.params;

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Get assignment and verify it belongs to dean's department
		const assignment = await db.CourseAssignment.findOne({
			where: { assignment_id },
			include: [
				{
					model: db.Faculty,
					where: { department_id: dean.department_id },
					attributes: [
						"faculty_id",
						"employee_id",
						"first_name",
						"middle_name",
						"last_name",
					],
				},
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
		console.error("Get assignment requirements error:", error);
		res.status(500).json({ message: "Error fetching assignment requirements" });
	}
};

// Clear a requirement (approve)
exports.clearRequirement = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { submission_id } = req.params;
		const { remarks } = req.body;

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Find submission and verify it belongs to dean's department
		const submission = await db.RequirementSubmission.findOne({
			where: { submission_id },
			include: [
				{
					model: db.CourseAssignment,
					include: [
						{
							model: db.Faculty,
							where: { department_id: dean.department_id },
						},
					],
				},
			],
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Update submission status
		submission.status = "validated";
		submission.dean_remarks = remarks || "Approved";
		submission.validated_by = deanUserId;
		submission.validated_date = new Date();
		await submission.save();

		// Auto-update faculty clearance status after dean validation
		const faculty_id = submission.course_assignment.faculty_id;
		const calculatedStatus = await calculateFacultyClearanceStatus(faculty_id);
		
		await db.Faculty.update(
			{
				clearance_status: calculatedStatus,
				clearance_date: new Date(),
			},
			{ where: { faculty_id } },
		);

		res.json({
			message: "Requirement validated successfully",
			submission,
		});
	} catch (error) {
		console.error("Validate requirement error:", error);
		res.status(500).json({ message: "Error validating requirement" });
	}
};

// Return a requirement (needs revision)
exports.returnRequirement = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { submission_id } = req.params;
		const { remarks } = req.body;

		if (!remarks || !remarks.trim()) {
			return res.status(400).json({
				message: "Remarks are required when returning a requirement",
			});
		}

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Find submission and verify it belongs to dean's department
		const submission = await db.RequirementSubmission.findOne({
			where: { submission_id },
			include: [
				{
					model: db.CourseAssignment,
					include: [
						{
							model: db.Faculty,
							where: { department_id: dean.department_id },
						},
					],
				},
			],
		});

		if (!submission) {
			return res.status(404).json({ message: "Submission not found" });
		}

		// Update submission status
		submission.status = "returned";
		submission.dean_remarks = remarks;
		submission.validated_by = deanUserId;
		submission.validated_date = new Date();
		await submission.save();

		// Auto-update faculty clearance status after dean validation
		const faculty_id = submission.course_assignment.faculty_id;
		const calculatedStatus = await calculateFacultyClearanceStatus(faculty_id);
		
		await db.Faculty.update(
			{
				clearance_status: calculatedStatus,
				clearance_date: new Date(),
			},
			{ where: { faculty_id } },
		);

		res.json({
			message: "Requirement returned successfully",
			submission,
		});
	} catch (error) {
		console.error("Return requirement error:", error);
		res.status(500).json({ message: "Error returning requirement" });
	}
};

// Download a requirement file
exports.downloadRequirement = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { submission_id } = req.params;

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Find submission and verify it belongs to dean's department
		const submission = await db.RequirementSubmission.findOne({
			where: { submission_id },
			include: [
				{
					model: db.CourseAssignment,
					include: [
						{
							model: db.Faculty,
							where: { department_id: dean.department_id },
						},
					],
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

// Get department-wide statistics
exports.getDepartmentStatistics = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		const academic_year_id = req.query.academic_year_id;
		const semester = req.query.semester;

		// Get all faculty in dean's department
		const facultyList = await db.Faculty.findAll({
			where: { department_id: dean.department_id },
		});

		// Count faculties by clearance status
		const clearedFacultiesCount = facultyList.filter(
			(f) => f.clearance_status === "cleared",
		).length;
		const withholdingFacultiesCount = facultyList.filter(
			(f) => f.clearance_status === "withholding",
		).length;
		const pendingFacultiesCount = facultyList.filter(
			(f) => f.clearance_status === "pending",
		).length;

		const facultyIds = facultyList.map((f) => f.faculty_id);

		const assignmentWhere = {
			faculty_id: { [Op.in]: facultyIds },
			status: "active",
		};

		if (academic_year_id) {
			assignmentWhere.academic_year_id = academic_year_id;
		}

		if (semester) {
			assignmentWhere.semester = semester;
		}

		// Get all assignments
		const assignments = await db.CourseAssignment.findAll({
			where: assignmentWhere,
			include: [
				{
					model: db.RequirementSubmission,
					required: false,
				},
			],
		});

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

		const totalRequirements = assignments.length * requirementTypes.length;
		let submittedCount = 0;
		let validatedCount = 0;
		let pendingCount = 0;
		let returnedCount = 0;

		assignments.forEach((assignment) => {
			assignment.requirement_submissions.forEach((submission) => {
				submittedCount++;
				if (submission.status === "validated") validatedCount++;
				else if (submission.status === "pending") pendingCount++;
				else if (submission.status === "returned") returnedCount++;
			});
		});

		res.json({
			total_faculty: facultyList.length,
			cleared_faculties: clearedFacultiesCount,
			withholding_faculties: withholdingFacultiesCount,
			pending_faculties: pendingFacultiesCount,
			total_courses: assignments.length,
			total_requirements: totalRequirements,
			submitted: submittedCount,
			validated: validatedCount,
			pending: pendingCount,
			returned: returnedCount,
			not_submitted: totalRequirements - submittedCount,
			completion_rate:
				totalRequirements > 0
					? ((validatedCount / totalRequirements) * 100).toFixed(2)
					: 0,
			faculty_clearance_rate:
				facultyList.length > 0
					? ((clearedFacultiesCount / facultyList.length) * 100).toFixed(2)
					: 0,
		});
	} catch (error) {
		console.error("Get department statistics error:", error);
		res.status(500).json({ message: "Error fetching statistics" });
	}
};

// Helper function to auto-calculate faculty clearance status based on dean's validation
// This runs after dean validates/returns requirements to automatically update faculty status
async function calculateFacultyClearanceStatus(
	faculty_id,
	academic_year_id = null,
	semester = null,
) {
	try {
		const assignmentWhere = {
			faculty_id,
			status: "active",
		};

		if (academic_year_id) {
			assignmentWhere.academic_year_id = academic_year_id;
		}

		if (semester) {
			assignmentWhere.semester = semester;
		}

		// Get all assignments for this faculty
		const assignments = await db.CourseAssignment.findAll({
			where: assignmentWhere,
			include: [
				{
					model: db.RequirementSubmission,
					required: false,
				},
			],
		});

		// Define required requirement types (9 types per assignment)
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

		const totalRequirements = assignments.length * requirementTypes.length;
		
		if (totalRequirements === 0) {
			return "pending"; // No assignments yet
		}

		let validatedCount = 0;
		let returnedCount = 0;

		// Check status of each requirement
		assignments.forEach((assignment) => {
			assignment.requirement_submissions.forEach((submission) => {
				if (submission.status === "validated") {
					validatedCount++;
				} else if (submission.status === "returned") {
					returnedCount++;
				}
			});
		});

		// Determine clearance status based on dean's validation:
		// 1. If ANY requirements are returned → "withholding"
		if (returnedCount > 0) {
			return "withholding";
		}

		// 2. If ALL requirements are validated by dean → "cleared"
		if (validatedCount === totalRequirements) {
			return "cleared";
		}

		// 3. Otherwise (requirements not submitted or pending validation) → "pending"
		return "pending";
	} catch (error) {
		console.error("Calculate faculty clearance status error:", error);
		return "pending";
	}
}

/**
 * MANUAL Faculty Clearance Status Setting (Override)
 * 
 * This endpoint allows admin/dean to MANUALLY override a faculty's clearance status.
 * 
 * Note: Faculty clearance status is normally AUTO-CALCULATED after dean validates requirements:
 * - "pending": Default status, requirements incomplete or awaiting validation
 * - "cleared": All requirements validated/cleared by dean (auto-set when complete)
 * - "withholding": Has returned/rejected requirements (auto-set when requirements returned)
 * 
 * Use this endpoint to manually override the automatic status if needed
 * (e.g., special circumstances, exceptions, or corrections).
 */
exports.setFacultyClearanceStatus = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { faculty_id } = req.params;
		const { status, remarks, academic_year_id, semester } = req.body;

		// Validate that specific academic year and semester are provided
		if (!academic_year_id || !semester) {
			return res.status(400).json({
				message:
					"Academic year and semester are required. Please select a specific period to set clearance status.",
			});
		}

		// Validate status
		if (!["pending", "cleared", "withholding"].includes(status)) {
			return res.status(400).json({
				message:
					"Invalid status. Must be 'pending', 'cleared', or 'withholding'",
			});
		}

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Verify faculty belongs to dean's department
		const faculty = await db.Faculty.findOne({
			where: {
				faculty_id,
				department_id: dean.department_id,
			},
		});

		if (!faculty) {
			return res.status(404).json({
				message: "Faculty not found or does not belong to your department",
			});
		}

		// Update faculty clearance status
		faculty.clearance_status = status;
		faculty.clearance_remarks = remarks || null;
		faculty.clearance_date = new Date();
		await faculty.save();

		res.json({
			message: `Faculty clearance status updated successfully for ${semester} AY ${academic_year_id}`,
			faculty: {
				faculty_id: faculty.faculty_id,
				clearance_status: faculty.clearance_status,
				clearance_remarks: faculty.clearance_remarks,
				clearance_date: faculty.clearance_date,
			},
		});
	} catch (error) {
		console.error("Set faculty clearance status error:", error);
		res
			.status(500)
			.json({ message: "Error updating faculty clearance status" });
	}
};

/**
 * AUTO-CALCULATE Faculty Clearance Status
 * 
 * This endpoint automatically calculates faculty clearance status based on dean's validation:
 * - "withholding": Faculty has returned/rejected requirements
 * - "cleared": All requirements have been validated/cleared by dean
 * - "pending": Requirements not submitted or still awaiting validation
 * 
 * Status is automatically updated after each dean validation action.
 */
exports.updateFacultyClearanceStatus = async (req, res) => {
	try {
		const deanUserId = req.user.user_id;
		const { faculty_id } = req.params;
		const { academic_year_id, semester } = req.query;

		// Validate that specific academic year and semester are provided
		if (!academic_year_id || !semester) {
			return res.status(400).json({
				message:
					"Academic year and semester are required. Please select a specific period to calculate clearance status.",
			});
		}

		// Get dean's department
		const dean = await db.Dean.findOne({
			where: { user_id: deanUserId },
		});

		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Verify faculty belongs to dean's department
		const faculty = await db.Faculty.findOne({
			where: {
				faculty_id,
				department_id: dean.department_id,
			},
		});

		if (!faculty) {
			return res.status(404).json({
				message: "Faculty not found or does not belong to your department",
			});
		}

		// Calculate clearance status based on dean's validation
		const calculatedStatus = await calculateFacultyClearanceStatus(
			faculty_id,
			academic_year_id,
			semester,
		);

		// Update faculty clearance status
		faculty.clearance_status = calculatedStatus;
		faculty.clearance_date = new Date();
		await faculty.save();
		
		res.json({
			message: `Faculty clearance status calculated and updated to '${calculatedStatus}' for ${semester} AY ${academic_year_id}`,
			faculty: {
				faculty_id: faculty.faculty_id,
				clearance_status: faculty.clearance_status,
				clearance_date: faculty.clearance_date,
			},
		});
	} catch (error) {
		console.error("Update faculty clearance status error:", error);
		res
			.status(500)
			.json({ message: "Error updating faculty clearance status" });
	}
};
