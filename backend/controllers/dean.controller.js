const db = require("../models");
const Dean = db.Dean;

// Helper: get department name for either Dean or CollegeDepartment user
async function getDepartmentForUser(userId) {
  const dean = await Dean.findOne({ where: { user_id: userId } });
  if (dean) return { dean, department: dean.department };

  const cd = await db.CollegeDepartment.findOne({
    where: { user_id: userId },
    include: [
      {
        model: db.Department,
        as: "department",
        attributes: ["department_name"],
      },
    ],
  });
  if (cd && cd.department) {
    return {
      dean: null,
      department: cd.department.department_name,
      collegeDepartment: cd,
    };
  }
  return null;
}

// Get current dean's profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const dean = await Dean.findOne({
      where: { user_id: userId },
      attributes: [
        "dean_id",
        "employee_id",
        "first_name",
        "middle_name",
        "last_name",
        "email",
        "contact_number",
        "department",
      ],
    });

    if (!dean) {
      // Fallback for college_department users
      const cd = await db.CollegeDepartment.findOne({
        where: { user_id: userId },
        include: [
          {
            model: db.Department,
            as: "department",
            attributes: ["department_name"],
          },
          { model: db.Campus, as: "campus", attributes: ["campus_name"] },
        ],
      });
      if (!cd) {
        return res.status(404).json({ message: "Profile not found" });
      }
      return res.json({
        first_name: cd.dean_name?.split(" ")[0] || cd.name,
        last_name: cd.dean_name?.split(" ").slice(1).join(" ") || "",
        department: cd.department?.department_name || "",
        email: cd.email,
        contact_number: cd.contact_number,
      });
    }

    res.json(dean);
  } catch (error) {
    console.error("Get dean profile error:", error);
    res.status(500).json({ message: "Error fetching dean profile" });
  }
};
