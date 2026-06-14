// References Model
module.exports = (sequelize, Sequelize) => {
	const PDSReference = sequelize.define("pds_references", {
		reference_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		name: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		address: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		telephone_number: {
			type: Sequelize.STRING,
			allowNull: true,
		},
	});

	return PDSReference;
};
