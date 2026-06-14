// Educational Background Model
module.exports = (sequelize, Sequelize) => {
	const PDSEducation = sequelize.define("pds_education", {
		education_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		level: {
			type: Sequelize.ENUM("ELEMENTARY", "SECONDARY", "VOCATIONAL", "COLLEGE", "GRADUATE STUDIES"),
			allowNull: false,
		},
		school_name: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		degree_course: {
			type: Sequelize.STRING,
			allowNull: true,
			comment: "Basic Education/Degree/Course (Write in full)",
		},
		period_from: {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: "Year started",
		},
		period_to: {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: "Year graduated/last attended",
		},
		highest_level_earned: {
			type: Sequelize.STRING,
			allowNull: true,
			comment: "Units if not graduated",
		},
		year_graduated: {
			type: Sequelize.INTEGER,
			allowNull: true,
		},
		scholarship_honors: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
	});

	return PDSEducation;
};
