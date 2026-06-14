module.exports = (sequelize, Sequelize) => {
  const AcademicYear = sequelize.define("academic_years", {
    academic_year_id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    year_start: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    year_end: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
  });

  return AcademicYear;
};
