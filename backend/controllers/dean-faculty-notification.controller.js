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

const { sendEmail } = require("../utils/email");
const Faculty = db.Faculty;
const User = db.User;

/**
 * Get all faculty members for the dean's department
 */
exports.getFacultyList = async (req, res) => {
	try {
		const deanId = req.user.dean_id;

		if (!deanId) {
			return res.status(403).json({ message: "Access denied. Dean ID not found." });
		}

		// Get dean's department
		const dean = await db.Dean.findByPk(deanId);
		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Get all faculty in the dean's department
		const facultyList = await Faculty.findAll({
			where: { department: dean.department },
			include: [
				{
					model: User,
					attributes: ["email"],
				},
			],
			attributes: [
				"faculty_id",
				"employee_id",
				"first_name",
				"middle_name",
				"last_name",
				"email",
				"department",
			],
			order: [["last_name", "ASC"], ["first_name", "ASC"]],
		});

		// Format the response
		const formattedFaculty = facultyList.map((faculty) => ({
			faculty_id: faculty.faculty_id,
			employee_id: faculty.employee_id,
			full_name: `${faculty.last_name}, ${faculty.first_name}${faculty.middle_name ? ` ${faculty.middle_name.charAt(0)}.` : ""}`,
			first_name: faculty.first_name,
			last_name: faculty.last_name,
			email: faculty.email || faculty.User?.email,
			department: faculty.department,
		}));

		res.json({
			success: true,
			faculty: formattedFaculty,
			total: formattedFaculty.length,
		});
	} catch (error) {
		console.error("Error fetching faculty list:", error);
		res.status(500).json({
			message: "Error fetching faculty list",
			error: error.message,
		});
	}
};

/**
 * Send notification email to selected faculty members
 */
exports.sendNotification = async (req, res) => {
	try {
		const deanId = req.user.dean_id;
		const { faculty_ids, subject, message } = req.body;

		// Validation
		if (!faculty_ids || !Array.isArray(faculty_ids) || faculty_ids.length === 0) {
			return res.status(400).json({ message: "Please select at least one faculty member" });
		}

		if (!subject || subject.trim() === "") {
			return res.status(400).json({ message: "Subject is required" });
		}

		if (!message || message.trim() === "") {
			return res.status(400).json({ message: "Message is required" });
		}

		// Get dean info
		const dean = await db.Dean.findByPk(deanId);
		if (!dean) {
			return res.status(404).json({ message: "Dean profile not found" });
		}

		// Get selected faculty members
		const facultyList = await Faculty.findAll({
			where: {
				faculty_id: faculty_ids,
				department: dean.department, // Ensure faculty are from dean's department
			},
			include: [
				{
					model: User,
					attributes: ["email"],
				},
			],
		});

		if (facultyList.length === 0) {
			return res.status(404).json({ message: "No valid faculty members found" });
		}

		// Prepare email details
		const deanName = `${dean.first_name} ${dean.last_name}`;
		const deanTitle = dean.title || "Dean";
		const department = dean.department;

		// Send emails to each faculty member
		const emailResults = [];
		for (const faculty of facultyList) {
			const facultyEmail = faculty.email || faculty.User?.email;
			const facultyName = `${faculty.first_name} ${faculty.last_name}`;

			if (!facultyEmail) {
				emailResults.push({
					faculty_id: faculty.faculty_id,
					name: facultyName,
					success: false,
					error: "No email address found",
				});
				continue;
			}

			// Create HTML email
			const htmlContent = createNotificationEmail(
				facultyName,
				subject,
				message,
				deanName,
				deanTitle,
				department
			);

			// Send email
			const result = await sendEmail(
				facultyEmail,
				`📢 ${subject}`,
				message, // Plain text fallback
				htmlContent
			);

			emailResults.push({
				faculty_id: faculty.faculty_id,
				name: facultyName,
				email: facultyEmail,
				success: result.success,
				error: result.error || null,
			});
		}

		// Count successes and failures
		const successCount = emailResults.filter((r) => r.success).length;
		const failureCount = emailResults.filter((r) => !r.success).length;

		res.json({
			success: true,
			message: `Notification sent successfully to ${successCount} faculty member(s)`,
			results: {
				total: emailResults.length,
				successful: successCount,
				failed: failureCount,
			},
			details: emailResults,
		});
	} catch (error) {
		console.error("Error sending notification:", error);
		res.status(500).json({
			message: "Error sending notification",
			error: error.message,
		});
	}
};

/**
 * Create HTML email template for faculty notification
 */
function createNotificationEmail(
	facultyName,
	subject,
	message,
	deanName,
	deanTitle,
	department
) {
	return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }
        .email-wrapper {
          max-width: 650px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }
        .header-content {
          position: relative;
          z-index: 1;
        }
        .logo {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .header p {
          font-size: 16px;
          margin-top: 8px;
          opacity: 0.95;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .subject-box {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-left: 5px solid #2563eb;
          border-radius: 12px;
          padding: 20px 25px;
          margin: 25px 0;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
        }
        .subject-label {
          font-size: 12px;
          font-weight: 600;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .subject-text {
          font-size: 20px;
          font-weight: 700;
          color: #1e40af;
          line-height: 1.4;
        }
        .message-box {
          background: #f9fafb;
          border-radius: 12px;
          padding: 25px;
          margin: 25px 0;
          border: 1px solid #e5e7eb;
        }
        .message-text {
          font-size: 16px;
          color: #374151;
          line-height: 1.8;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .from-box {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 12px;
          padding: 20px 25px;
          margin: 30px 0;
          border-left: 5px solid #16a34a;
        }
        .from-label {
          font-size: 12px;
          font-weight: 600;
          color: #16a34a;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        .from-name {
          font-size: 18px;
          font-weight: 700;
          color: #15803d;
          margin-bottom: 4px;
        }
        .from-title {
          font-size: 14px;
          color: #16a34a;
          font-weight: 500;
        }
        .from-department {
          font-size: 14px;
          color: #16a34a;
          margin-top: 4px;
        }
        .footer {
          background: #f9fafb;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e5e7eb, transparent);
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="header-content">
            <div class="logo">📢</div>
            <h1>Faculty Notification</h1>
            <p>BatStateU College Management Portal</p>
          </div>
        </div>
        
        <div class="content">
          <div class="greeting">Hello ${facultyName}!</div>
          
          <div class="subject-box">
            <div class="subject-label">Subject</div>
            <div class="subject-text">${subject}</div>
          </div>

          <div class="message-box">
            <div class="message-text">${message}</div>
          </div>

          <div class="from-box">
            <div class="from-label">From</div>
            <div class="from-name">${deanName}</div>
            <div class="from-title">${deanTitle}</div>
            <div class="from-department">${department}</div>
          </div>

          <div class="divider"></div>

          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            This notification was sent through the BatStateU College Management Portal
          </p>
        </div>

        <div class="footer">
          <p class="footer-text">
            This is an automated message from the BatStateU College Management Portal.
          </p>
          <p class="footer-text" style="font-size: 12px; color: #9ca3af;">
            © 2026 BatStateU. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = exports;
