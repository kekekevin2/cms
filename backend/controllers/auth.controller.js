const db = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendAdminCredentials } = require("../utils/email");

const User = db.User;
const Admin = db.Admin;
const Dean = db.Dean; 
const Faculty = db.Faculty;
const Organization = db.Organization;

// Generate random password
const generateRandomPassword = (length = 12) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Generate JWT Token
const generateToken = (user, profileData = {}) => {
  const tokenData = {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
  };

  // Add role-specific IDs to token
  if (profileData.faculty_id) {
    tokenData.faculty_id = profileData.faculty_id;
  } else if (profileData.dean_id) {
    tokenData.dean_id = profileData.dean_id;
  } else if (profileData.admin_id) {
    tokenData.admin_id = profileData.admin_id;
  } else if (profileData.organization_id) {
    tokenData.organization_id = profileData.organization_id;
  }

  return jwt.sign(tokenData, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "24h",
  });
};

// Login
exports.login = async (req, res) => {
  try {
    console.log("🔵 Login request received for:", req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Missing credentials");
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user by email
    console.log("🔍 Finding user by email...");
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✓ User found:", {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      has_password: !!user.password
    });

    // Verify password
    console.log("🔑 Verifying password...");
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ Password verification failed for:", email);
      console.log("   Provided password length:", password.length);
      console.log("   Hash starts with:", user.password.substring(0, 10));
      return res.status(401).json({ message: "Invalid email or password" });
    }

    console.log("✓ Password verified successfully");

    // Check if account is active
    if (user.is_active === false) {
      return res.status(403).json({
        message:
          "Your account has been disabled. Please contact your administrator.",
      });
    }

    // Get user profile based on role
    let profile = null;
    let profileData = {};

    switch (user.role) {
      case "admin":
        profile = await Admin.findOne({ where: { user_id: user.user_id } });
        if (profile) {
          profileData = {
            admin_id: profile.admin_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            contact_number: profile.contact_number,
          };
        }
        break;

      case "dean":
        console.log("🔍 Looking up dean profile for user_id:", user.user_id);
        profile = await Dean.findOne({
          where: { user_id: user.user_id },
        });
        console.log("👤 Dean profile found:", profile ? `Yes (dean_id: ${profile.dean_id})` : "NO PROFILE FOUND!");
        if (profile) {
          profileData = {
            dean_id: profile.dean_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            contact_number: profile.contact_number,
            department: profile.department,
          };
          console.log("📦 Dean profile data prepared:", profileData);
        } else {
          console.log("⚠️  WARNING: Dean user exists but no dean profile record!");
        }
        break;

      case "faculty":
        profile = await Faculty.findOne({
          where: { user_id: user.user_id },
        });
        if (profile) {
          profileData = {
            faculty_id: profile.faculty_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            contact_number: profile.contact_number,
            department: profile.department,
          };
        }
        break;

      case "organization":
        profile = await Organization.findOne({
          where: { user_id: user.user_id },
          include: [{ model: db.Faculty }],
        });
        if (profile) {
          profileData = {
            organization_id: profile.organization_id,
            organization_name: profile.organization_name,
            description: profile.description,
            department: profile.department,
            faculty_id: profile.faculty_id,
          };
        }
        break;

      case "superadmin":
        profileData = { name: "Super Admin" };
        break;

      case "college_department":
        profile = await db.CollegeDepartment.findOne({
          where: { user_id: user.user_id },
        });
        if (profile) {
          profileData = {
            college_department_id: profile.college_department_id,
            name: profile.name,
            email: profile.email,
            contact_number: profile.contact_number,
            dean_name: profile.dean_name,
          };
        }
        break;
    }

    // Generate token with profile data
    const token = generateToken(user, profileData);

    // Determine redirect path
    const rolePathMap = {
      college_department: "/dean/dashboard",
    };
    const redirectPath = rolePathMap[user.role] || `/${user.role}/dashboard`;

    console.log("✅ Login successful, sending response for:", user.email);
    console.log("   Role:", user.role);
    console.log("   Profile data:", JSON.stringify(profileData, null, 2));
    console.log("   Token generated:", token ? "YES" : "NO");
    console.log("   Redirect path:", redirectPath);
    
    const responseData = {
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        profile: profileData,
      },
      redirectPath,
    };
    
    console.log("📤 Sending response:", JSON.stringify(responseData, null, 2));
    
    return res.json(responseData);
  } catch (error) {
    console.error("❌ Login error:", error);
    console.error("   Stack:", error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Register (for initial setup)
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const role = req.user.role;

    const user = await User.findOne({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profile = null;
    let profileData = {};

    switch (role) {
      case "admin":
        profile = await Admin.findOne({ where: { user_id: userId } });
        if (profile) {
          profileData = {
            admin_id: profile.admin_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            contact_number: profile.contact_number,
          };
        }
        break;

      case "dean":
        profile = await Dean.findOne({
          where: { user_id: userId },
        });
        if (profile) {
          profileData = {
            dean_id: profile.dean_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            contact_number: profile.contact_number,
            department: profile.department,
          };
        }
        break;

      case "faculty":
        profile = await Faculty.findOne({
          where: { user_id: userId },
        });
        if (profile) {
          profileData = {
            faculty_id: profile.faculty_id,
            employee_id: profile.employee_id,
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            contact_number: profile.contact_number,
            department: profile.department,
            clearance_status: profile.clearance_status,
            clearance_remarks: profile.clearance_remarks,
            clearance_date: profile.clearance_date,
          };
        }
        break;

      case "organization":
        profile = await Organization.findOne({
          where: { user_id: userId },
          include: [{ model: db.Faculty }],
        });
        if (profile) {
          profileData = {
            organization_id: profile.organization_id,
            organization_name: profile.organization_name,
            description: profile.description,
            department: profile.department,
            faculty_id: profile.faculty_id,
          };
        }
        break;

      case "superadmin":
        profileData = { name: "Super Admin" };
        break;

      case "college_department":
        profile = await db.CollegeDepartment.findOne({
          where: { user_id: userId },
        });
        if (profile) {
          profileData = {
            college_department_id: profile.college_department_id,
            name: profile.name,
            email: profile.email,
            contact_number: profile.contact_number,
            dean_name: profile.dean_name,
          };
        }
        break;
    }

    res.json({
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        profile: profileData,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res
        .status(400)
        .json({ message: "Old password and new password are required" });
    }

    if (new_password.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findOne({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isOldPasswordValid = await bcrypt.compare(
      old_password,
      user.password,
    );

    if (!isOldPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    await user.update({ password: hashedNewPassword });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create Admin
exports.createAdmin = async (req, res) => {
  try {
    const { email, first_name, middle_name, last_name, contact_number } =
      req.body;

    // Validate required fields
    if (!email || !first_name || !last_name) {
      return res.status(400).json({
        message: "Email, first name, and last name are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Generate random password
    const generatedPassword = generateRandomPassword(12);

    // Hash password
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create user with admin role
    const user = await User.create({
      email,
      password: hashedPassword,
      role: "admin",
    });

    // Create admin profile
    const admin = await Admin.create({
      first_name,
      middle_name: middle_name || null,
      last_name,
      email,
      contact_number: contact_number || null,
      user_id: user.user_id,
    });

    // Send credentials email
    const emailResult = await sendAdminCredentials(
      email,
      first_name,
      generatedPassword,
    );

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      // Still return success but notify about email failure
      return res.status(201).json({
        message:
          "Admin created successfully, but email notification failed. Please provide credentials manually.",
        admin: {
          admin_id: admin.admin_id,
          first_name: admin.first_name,
          middle_name: admin.middle_name,
          last_name: admin.last_name,
          email: admin.email,
          contact_number: admin.contact_number,
          user_id: user.user_id,
        },
        generatedPassword: generatedPassword, // Only sent when email fails
      });
    }

    res.status(201).json({
      message:
        "Admin created successfully. Credentials have been sent via email.",
      admin: {
        admin_id: admin.admin_id,
        first_name: admin.first_name,
        middle_name: admin.middle_name,
        last_name: admin.last_name,
        email: admin.email,
        contact_number: admin.contact_number,
        user_id: user.user_id,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create Superadmin
exports.createSuperadmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with superadmin role
    const user = await User.create({
      email,
      password: hashedPassword,
      role: "superadmin",
    });

    res.status(201).json({
      message: "Superadmin created successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create superadmin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create Superadmin
exports.createSuperadmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with superadmin role
    const user = await User.create({
      email,
      password: hashedPassword,
      role: "superadmin",
    });

    res.status(201).json({
      message: "Superadmin created successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create superadmin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
