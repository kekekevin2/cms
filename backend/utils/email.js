const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send email function
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: `"BatStateU" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: error.message };
  }
};

// Generic function to send account credentials
const sendAccountCredentials = async (
  email,
  firstName,
  password,
  role = "user",
) => {
  const roleConfig = {
    admin: {
      emoji: "👨‍💼",
      title: "Admin",
      color: "#16a34a",
      gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
      bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    },
    dean: {
      emoji: "🎓",
      title: "Dean",
      color: "#dc2626",
      gradient: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
      bgGradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    },
    faculty: {
      emoji: "👨‍🏫",
      title: "Faculty",
      color: "#2563eb",
      gradient: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
      bgGradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    },
    organization: {
      emoji: "🏢",
      title: "Organization",
      color: "#7c3aed",
      gradient: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
      bgGradient: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
    },
    college_department: {
      emoji: "🏫",
      title: "College Department",
      color: "#0369a1",
      gradient: "linear-gradient(135deg, #0369a1 0%, #075985 100%)",
      bgGradient: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    },
  };

  const config = roleConfig[role] || roleConfig.admin;

  const subject = `${config.emoji} Your ${config.title} Account Credentials - BatStateU`;
  const text = `Hello ${firstName},\n\nYour ${role} account has been created successfully.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease login and change your password immediately.\n\nBest regards,\nBatStateU Team`;
  const html = `
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
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          background: ${config.gradient};
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
        .message {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .credentials-box {
          background: ${config.bgGradient};
          border-left: 5px solid ${config.color};
          border-radius: 12px;
          padding: 25px;
          margin: 30px 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .credentials-box h3 {
          color: ${config.color};
          font-size: 18px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .credential-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .credential-item:last-child {
          margin-bottom: 0;
        }
        .credential-label {
          font-weight: 600;
          color: #6b7280;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .credential-value {
          font-family: 'Courier New', monospace;
          font-size: 16px;
          color: #1f2937;
          font-weight: 600;
          background: #f9fafb;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }
        .warning-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-left: 5px solid #f59e0b;
          border-radius: 12px;
          padding: 20px;
          margin: 25px 0;
          display: flex;
          gap: 15px;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);
        }
        .warning-icon {
          font-size: 24px;
          flex-shrink: 0;
        }
        .warning-text {
          color: #92400e;
          font-size: 14px;
          line-height: 1.6;
        }
        .warning-text strong {
          display: block;
          font-size: 16px;
          margin-bottom: 5px;
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
          margin-bottom: 15px;
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
            <div class="logo">${config.emoji}</div>
            <h1>Welcome to BatStateU</h1>
            <p>Your ${config.title} account is ready!</p>
          </div>
        </div>
        
        <div class="content">
          <div class="greeting">Hello ${firstName}! 👋</div>
          
          <p class="message">
            We're excited to have you on board! Your ${role} account has been successfully created. 
            You now have access to the BatStateU College Management Portal where you can manage your activities.
          </p>

          <div class="credentials-box">
            <h3>🔐 Your Login Credentials</h3>
            <div class="credential-item">
              <span class="credential-label">Email Address</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Temporary Password</span>
              <span class="credential-value">${password}</span>
            </div>
          </div>

          <div class="warning-box">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <strong>Important Security Notice</strong>
              For your account security, please change your password immediately after your first login. 
              Never share your credentials with anyone.
            </div>
          </div>

          <div class="divider"></div>

          <p class="message">
            <strong>What's Next?</strong><br>
            Log in to your dashboard and explore the features available to you. If you have any questions 
            or need assistance, don't hesitate to reach out to our support team.
          </p>

          <p class="message" style="margin-top: 30px; color: #6b7280;">
            Best regards,<br>
            <strong style="color: #1f2937;">BatStateU Team</strong>
          </p>
        </div>

        <div class="footer">
          <p class="footer-text">
            This is an automated message. Please do not reply to this email.
          </p>
          <p class="footer-text" style="font-size: 12px; color: #9ca3af;">
            © 2026 BatStateU. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, text, html);
};

// Backward compatibility - keep old function name
const sendAdminCredentials = async (email, firstName, password) => {
  return await sendAccountCredentials(email, firstName, password, "admin");
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = "🔐 Password Reset Request - BatStateU";
  const text = `Hello,\n\nYou requested to reset your password.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nBatStateU Team`;
  const html = `
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
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
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
        }
        .content {
          padding: 40px 30px;
        }
        .message {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .reset-button {
          display: inline-block;
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
          padding: 16px 40px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          transition: transform 0.2s;
        }
        .reset-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.4);
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .warning-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-left: 5px solid #f59e0b;
          border-radius: 12px;
          padding: 20px;
          margin: 25px 0;
        }
        .warning-text {
          color: #92400e;
          font-size: 14px;
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
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">🔐</div>
          <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
          <p class="message">
            Hello,
          </p>
          
          <p class="message">
            We received a request to reset your password for your BatStateU account. 
            Click the button below to create a new password:
          </p>

          <div class="button-container">
            <a href="${resetUrl}" class="reset-button">Reset Password</a>
          </div>

          <div class="warning-box">
            <p class="warning-text">
              ⏰ This link will expire in 5 minutes for security reasons.
            </p>
          </div>

          <p class="message">
            If you didn't request a password reset, you can safely ignore this email. 
            Your password will remain unchanged.
          </p>

          <p class="message" style="margin-top: 30px; color: #6b7280;">
            Best regards,<br>
            <strong style="color: #1f2937;">BatStateU Team</strong>
          </p>
        </div>

        <div class="footer">
          <p class="footer-text">
            This is an automated message. Please do not reply to this email.
          </p>
          <p class="footer-text" style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
            © 2026 BatStateU. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, text, html);
};

module.exports = {
  sendEmail,
  sendAccountCredentials,
  sendAdminCredentials,
  sendPasswordResetEmail,
};
