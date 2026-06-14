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

const XLSX = require("xlsx");

// Export Dean's own activities to Excel
exports.exportDeanActivitiesToExcel = async (req, res) => {
  try {
    const deanUserId = req.user.user_id;

    // Get dean profile
    const deanInfo = await getDepartmentForUser(deanUserId);
    if (!deanInfo) {
      return res.status(404).json({ message: 'Department profile not found' });
    }
    const dean = { department: deanInfo.department };

    // Fetch all activities
    const seminars = await db.DeanSeminarsTrainings.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date", "DESC"]],
    });

    const research = await db.DeanResearchActivities.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date", "DESC"]],
    });

    const extensions = await db.DeanExtensionActivities.findAll({
      where: { dean_id: dean.dean_id },
      order: [["date_of_implementation", "DESC"]],
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Seminars/Trainings sheet
    const seminarsData = [
      ["Title", "Category", "Date", "Sponsoring Agency"],
      ...seminars.map((s) => [
        s.title,
        s.category,
        s.date,
        s.sponsoring_agency,
      ]),
    ];
    const seminarsSheet = XLSX.utils.aoa_to_sheet(seminarsData);
    XLSX.utils.book_append_sheet(
      workbook,
      seminarsSheet,
      "Seminars & Trainings",
    );

    // Research Activities sheet
    const researchData = [
      ["Research Title", "Category", "Date", "Sponsoring Agency"],
      ...research.map((r) => [
        r.research_title,
        r.category,
        r.date,
        r.sponsoring_agency,
      ]),
    ];
    const researchSheet = XLSX.utils.aoa_to_sheet(researchData);
    XLSX.utils.book_append_sheet(
      workbook,
      researchSheet,
      "Research Activities",
    );

    // Extension Activities sheet
    const extensionsData = [
      ["Extension Title", "Date of Implementation", "Beneficiary", "Location"],
      ...extensions.map((e) => [
        e.extension_title,
        e.date_of_implementation,
        e.beneficiary,
        e.location,
      ]),
    ];
    const extensionsSheet = XLSX.utils.aoa_to_sheet(extensionsData);
    XLSX.utils.book_append_sheet(
      workbook,
      extensionsSheet,
      "Extension Activities",
    );

    // Generate filename
    const deanName = `${dean.first_name}_${dean.last_name}`.replace(
      /\s+/g,
      "_",
    );
    const filename = `${deanName}_Activities_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send buffer
    res.send(buffer);
  } catch (error) {
    console.error("Export dean activities error:", error);
    res.status(500).json({ message: "Error exporting activities" });
  }
};
