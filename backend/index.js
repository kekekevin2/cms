const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

const db = require("./models");

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const authRoutes = require("./routes/auth.routes");
const passwordResetRoutes = require("./routes/password-reset.routes");
const superadminRoutes = require("./routes/superadmin.routes");
const deanRoutes = require("./routes/dean.routes");
const facultyRoutes = require("./routes/faculty.routes");
const organizationRoutes = require("./routes/organization.routes");
const adminRoutes = require("./routes/admin.routes");
const deanManagementRoutes = require("./routes/dean-management.routes");
const dropdownRoutes = require("./routes/dropdown.routes");

// Superadmin specific routes
const academicYearRoutes = require("./routes/academic-year.routes");
const campusRoutes = require("./routes/campus.routes");
const departmentRoutes = require("./routes/department.routes");
const collegeDepartmentRoutes = require("./routes/college-department.routes");
const superadminDeanRoutes = require("./routes/superadmin-dean.routes");
const superadminFacultyRoutes = require("./routes/superadmin-faculty.routes");
const superadminOrganizationRoutes = require("./routes/superadmin-organization.routes");

// Dean specific routes
const deanFacultyRoutes = require("./routes/dean-faculty.routes");
const deanOrganizationRoutes = require("./routes/dean-organization.routes");
const deanOrganizationManagementRoutes = require("./routes/dean-organization-management.routes");
const deanRequirementRoutes = require("./routes/dean-requirement.routes");
const deanFacultyCredentialsRoutes = require("./routes/dean-faculty-credentials.routes");
const deanAnalyticsRoutes = require("./routes/dean-analytics.routes");
const deanFacultyAnalyticsRoutes = require("./routes/dean-faculty-analytics.routes");
const deanFacultyProfileRoutes = require("./routes/dean-faculty-profile.routes");
const deanProfileRoutes = require("./routes/dean-profile.routes");
const deanPDSRoutes = require("./routes/dean-pds.routes");
const deanOrganizationEventsRoutes = require("./routes/dean-organization-events.routes");
const deanFacultyNotificationRoutes = require("./routes/dean-faculty-notification.routes");

// Faculty specific routes
const facultyRequirementRoutes = require("./routes/faculty-requirement.routes");
const facultyCredentialsRoutes = require("./routes/faculty-credentials.routes");
const facultyProfileRoutes = require("./routes/faculty-profile.routes");
const pdsRoutes = require("./routes/pds.routes");
const announcementRoutes = require("./routes/announcement.routes");

// Organization specific routes
const organizationEventRoutes = require("./routes/organization-event.routes");

app.use("/api/auth", authRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/superadmin/dashboard", superadminRoutes);
app.use("/api/dean/dashboard", deanRoutes);
app.use("/api/faculty/dashboard", facultyRoutes);
app.use("/api/organization/dashboard", organizationRoutes);
app.use("/api/admin/dashboard", adminRoutes);
app.use("/api/admin/deans", deanManagementRoutes);
app.use("/api/dropdown", dropdownRoutes);

// Superadmin module routes
app.use("/api/superadmin/academic-years", academicYearRoutes);
app.use("/api/superadmin/campuses", campusRoutes);
app.use("/api/superadmin/departments", departmentRoutes);
app.use("/api/superadmin/college-departments", collegeDepartmentRoutes);
app.use("/api/superadmin/deans", superadminDeanRoutes);
app.use("/api/superadmin/faculty", superadminFacultyRoutes);
app.use("/api/superadmin/organizations", superadminOrganizationRoutes);

// Dean module routes
app.use("/api/dean/faculty", deanFacultyRoutes);
app.use("/api/dean/organizations", deanOrganizationRoutes);
app.use("/api/dean/organization-management", deanOrganizationManagementRoutes);
app.use("/api/dean/requirements", deanRequirementRoutes);
app.use("/api/dean/faculty-credentials", deanFacultyCredentialsRoutes);
app.use("/api/dean/analytics", deanAnalyticsRoutes);
const deanEventAnalyticsRoutes = require("./routes/dean-event-analytics.routes");
app.use("/api/dean/event-analytics", deanEventAnalyticsRoutes);
app.use("/api/dean/faculty-analytics", deanFacultyAnalyticsRoutes);
app.use("/api/dean/faculty-profiles", deanFacultyProfileRoutes);
app.use("/api/dean/profile", deanProfileRoutes);
app.use("/api/dean/pds", deanPDSRoutes);
app.use("/api/dean/organization-events", deanOrganizationEventsRoutes);
app.use("/api/dean/faculty-notifications", deanFacultyNotificationRoutes);

// Faculty module routes
app.use("/api/faculty/requirements", facultyRequirementRoutes);
app.use("/api/faculty/credentials", facultyCredentialsRoutes);
app.use("/api/faculty/profile", facultyProfileRoutes);
app.use("/api/faculty/pds", pdsRoutes);
app.use("/api/pds", pdsRoutes); // Added: Direct PDS route for faculty

// Organization module routes
const organizationEventAnalyticsRoutes = require("./routes/organization-event-analytics.routes");
const organizationAnalyticsRoutes = require("./routes/organization-analytics.routes");
app.use("/api/organization/events/analytics", organizationEventAnalyticsRoutes);
app.use("/api/organization/analytics", organizationAnalyticsRoutes);
app.use("/api/organization/events", organizationEventRoutes);

// Shared routes (accessible to all authenticated users)
app.use("/api/academic-years", require("./routes/academic-year-shared.routes"));
app.use("/api/dean-pds", deanPDSRoutes); // Added: Direct Dean PDS route

// Announcement routes (shared between dean and faculty)
app.use("/api/announcements", announcementRoutes);

// College Department portal routes
const collegeDepartmentPortalRoutes = require("./routes/college-department-portal.routes");
app.use("/api/college-department", collegeDepartmentPortalRoutes);

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from the backend!" });
});

const PORT = process.env.PORT;

// Test database connection and sync models
db.sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection successful!");
    // Sync models with database (creates tables if they don't exist)
    // Using force: false to avoid altering existing tables
    return db.sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log("Database tables synced!");
  })
  .catch((err) => {
    console.error("Database error:", err.message);
  });

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access from other devices using your IP address`);
});
