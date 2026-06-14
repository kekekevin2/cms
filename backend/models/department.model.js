module.exports = (sequelize, Sequelize) => {
	const Department = sequelize.define(
		"departments",
		{
			department_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			campus_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			department_name: {
				type: Sequelize.STRING(150),
				allowNull: false,
			},
			acronym: {
				type: Sequelize.STRING(20),
				allowNull: true,
			},
			is_active: {
				type: Sequelize.BOOLEAN,
				defaultValue: true,
			},
		},
		{
			indexes: [
				{
					unique: true,
					fields: ["campus_id", "department_name"],
				},
			],
		},
	);

	return Department;
};
