const db = require("../models");

/**
 * Check if an email can be used to create a new account
 * Rule: Each email can be used for maximum 3 accounts:
 * - 1 Organization account
 * - 1 Faculty account
 * - 1 Dean account
 * 
 * @param {string} email - Email to check
 * @param {string} role - Role to create ('organization', 'faculty', 'dean')
 * @returns {Promise<{allowed: boolean, message: string, usage: object}>}
 */
async function checkEmailUsageLimit(email, role) {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get all users with this email
    const users = await db.User.findAll({
      where: { email: normalizedEmail },
      attributes: ['user_id', 'email', 'role'],
    });

    // Count usage by role
    const usage = {
      organization: 0,
      faculty: 0,
      dean: 0,
      total: users.length,
    };

    users.forEach(user => {
      if (usage[user.role] !== undefined) {
        usage[user.role]++;
      }
    });

    // Check if this role already has an account
    if (usage[role] > 0) {
      return {
        allowed: false,
        message: `This email is already used for a ${role} account. Each email can only be used once per role.`,
        usage,
      };
    }

    // Check if total limit is reached (3 accounts max)
    if (usage.total >= 3) {
      return {
        allowed: false,
        message: `This email has reached the maximum limit of 3 accounts (1 organization, 1 faculty, 1 dean).`,
        usage,
      };
    }

    // Email can be used
    return {
      allowed: true,
      message: `Email can be used for ${role} account. Current usage: ${usage.total}/3 accounts.`,
      usage,
    };

  } catch (error) {
    console.error('Email validation error:', error);
    throw new Error('Failed to validate email usage');
  }
}

/**
 * Get email usage statistics
 * @param {string} email - Email to check
 * @returns {Promise<object>}
 */
async function getEmailUsageStats(email) {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    const users = await db.User.findAll({
      where: { email: normalizedEmail },
      attributes: ['user_id', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });

    const usage = {
      organization: 0,
      faculty: 0,
      dean: 0,
      total: users.length,
      accounts: users.map(u => ({
        role: u.role,
        createdAt: u.createdAt,
      })),
    };

    users.forEach(user => {
      if (usage[user.role] !== undefined) {
        usage[user.role]++;
      }
    });

    return usage;

  } catch (error) {
    console.error('Email stats error:', error);
    throw new Error('Failed to get email usage statistics');
  }
}

module.exports = {
  checkEmailUsageLimit,
  getEmailUsageStats,
};
