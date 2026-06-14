module.exports = (sequelize, Sequelize) => {
	const RequirementFile = sequelize.define("requirement_files", {
		file_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		submission_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
			comment: "Reference to requirement_submissions table",
		},
		file_path: {
			type: Sequelize.STRING(500),
			allowNull: false,
			comment: "Path to uploaded file",
		},
		file_name: {
			type: Sequelize.STRING(255),
			allowNull: false,
			comment: "Original file name",
		},
		file_size: {
			type: Sequelize.INTEGER,
			comment: "File size in bytes",
		},
		upload_date: {
			type: Sequelize.DATE,
			defaultValue: Sequelize.NOW,
		},
	});

	return RequirementFile;
};
