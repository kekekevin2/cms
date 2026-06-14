// Civil Service Eligibility Model
module.exports = (sequelize, Sequelize) => {
	const PDSEligibility = sequelize.define("pds_eligibilities", {
		eligibility_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		career_service: {
			type: Sequelize.STRING,
			allowNull: false,
			comment:
				"Career Service/RA 1080 (BOARD/BAR) Under Special Laws/CES/CSEE/Barangay Eligibility/Driver's License",
		},
		rating: {
			type: Sequelize.STRING,
			allowNull: true,
			comment: "Rating (if applicable)",
		},
		date_of_examination: {
			type: Sequelize.DATE,
			allowNull: true,
		},
		place_of_examination: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		license_number: {
			type: Sequelize.STRING,
			allowNull: true,
		},
		license_validity: {
			type: Sequelize.DATE,
			allowNull: true,
		},
	});

	return PDSEligibility;
};
