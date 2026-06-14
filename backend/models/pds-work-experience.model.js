// Work Experience Model
module.exports = (sequelize, Sequelize) => {
	const PDSWorkExperience = sequelize.define("pds_work_experiences", {
		work_experience_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		date_from: {
			type: Sequelize.DATE,
			allowNull: false,
		},
		date_to: {
			type: Sequelize.DATE,
			allowNull: true,
			comment: "NULL if present/current position",
		},
		position_title: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		department_agency: {
			type: Sequelize.STRING,
			allowNull: false,
			comment: "Department/Agency/Office/Company",
		},
		monthly_salary: {
			type: Sequelize.DECIMAL(10, 2),
			allowNull: true,
		},
		salary_grade: {
			type: Sequelize.STRING,
			allowNull: true,
			comment: "Grade if applicable (for gov't service)",
		},
		status_of_appointment: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		is_government_service: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
	});

	return PDSWorkExperience;
};
