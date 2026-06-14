const db = require("../models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../utils/email");

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await db.User.findOne({ where: { email } });

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes from now

    // Store token in database
    await db.sequelize.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      {
        replacements: [user.user_id, resetToken, expiresAt],
        type: db.sequelize.QueryTypes.INSERT,
      },
    );

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:7282"}/reset-password?token=${resetToken}`;

    try {
      const emailResult = await sendPasswordResetEmail(email, resetUrl);
      console.log("Password reset email sent:", emailResult);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Continue anyway - don't reveal email sending failure to user for security
    }

    res.json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ message: "Error processing password reset request" });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    // Find token in database
    const [results] = await db.sequelize.query(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
      {
        replacements: [token],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!results) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    res.json({ valid: true, message: "Token is valid" });
  } catch (error) {
    console.error("Verify reset token error:", error);
    res.status(500).json({ message: "Error verifying reset token" });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Find valid token
    const [tokenData] = await db.sequelize.query(
      `SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
      {
        replacements: [token],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );

    if (!tokenData) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.User.update(
      { password: hashedPassword },
      { where: { user_id: tokenData.user_id } },
    );

    // Mark token as used
    await db.sequelize.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE token = ?`,
      {
        replacements: [token],
        type: db.sequelize.QueryTypes.UPDATE,
      },
    );

    res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
};
