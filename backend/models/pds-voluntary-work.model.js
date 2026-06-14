// Voluntary Work Model
module.exports = (sequelize, Sequelize) => {
	const PDSVoluntaryWork = sequelize.define("pds_voluntary_works", {
		voluntary_work_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		organization_name: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		organization_address: {
			type: Sequelize.STRING,
			allowNull: true,
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
		position_nature_of_work: {
			type: Sequelize.STRING,
			allowNull: false,
		},
	});

	return PDSVoluntaryWork;
};
