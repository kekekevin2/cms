// Courses a faculty member handles, entered in "My Profile" and printed in the
// "COURSES HANDLED" section of the Faculty Profile PDF.
module.exports = (sequelize, Sequelize) => {
  const FacultyCourseHandled = sequelize.define(
    "faculty_courses_handled",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      faculty_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      course_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
    },
    {
      tableName: "faculty_courses_handled",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return FacultyCourseHandled;
};
