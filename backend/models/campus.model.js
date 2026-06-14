module.exports = (sequelize, Sequelize) => {
	const Campus = sequelize.define("campuses", {
		campus_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		campus_name: {
			type: Sequelize.STRING(150),
			allowNull: false,
		},
		is_active: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
	});

	return Campus;
};
