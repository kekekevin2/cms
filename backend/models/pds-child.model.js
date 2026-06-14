// Children Information Model
module.exports = (sequelize, Sequelize) => {
	const PDSChild = sequelize.define("pds_children", {
		child_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		child_name: {
			type: Sequelize.STRING,
			allowNull: false,
			comment: "Full name of child",
		},
		date_of_birth: {
			type: Sequelize.DATE,
			allowNull: false,
		},
	});

	return PDSChild;
};
