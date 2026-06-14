// Learning and Development (Training Programs) Model
module.exports = (sequelize, Sequelize) => {
	const PDSTraining = sequelize.define("pds_trainings", {
		training_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		title: {
			type: Sequelize.STRING,
			allowNull: false,
			comment: "Title of Learning and Development Intervention/Training Programs",
		},
		date_from: {
			type: Sequelize.DATE,
			allowNull: false,
		},
		date_to: {
			type: Sequelize.DATE,
			allowNull: false,
		},
		number_of_hours: {
			type: Sequelize.DECIMAL(6, 2),
			allowNull: true,
		},
		type_of_ld: {
			type: Sequelize.STRING,
			allowNull: true,
			comment: "Type of LD (Managerial/Supervisory/Technical/etc.)",
		},
		conducted_by: {
			type: Sequelize.STRING,
			allowNull: false,
			comment: "Conducted/Sponsored By",
		},
	});

	return PDSTraining;
};
