module.exports = (sequelize, Sequelize) => {
	const OrganizationPositionTemplate = sequelize.define(
		"organization_position_templates",
		{
			position_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			position_name: {
				type: Sequelize.STRING(100),
				allowNull: false,
				unique: true,
			},
			hierarchy_level: {
				type: Sequelize.INTEGER,
				allowNull: false,
				comment: "1=President, 2=VP, 3=Officers, 4=Sub-officers, 5=Members",
			},
			max_allowed: {
				type: Sequelize.INTEGER,
				defaultValue: 1,
				comment: "Maximum number of this position per organization",
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
		},
	);

	return OrganizationPositionTemplate;
};
