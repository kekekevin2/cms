module.exports = (sequelize, Sequelize) => {
	const OrganizationAdviser = sequelize.define("organization_advisers", {
		adviser_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		organization_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
			references: {
				model: "organizations",
				key: "organization_id",
			},
			onDelete: "CASCADE",
		},
		faculty_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
			references: {
				model: "faculties",
				key: "faculty_id",
			},
			onDelete: "CASCADE",
		},
		assigned_date: {
			type: Sequelize.DATEONLY,
			allowNull: false,
			defaultValue: Sequelize.NOW,
		},
		is_active: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
	});

	return OrganizationAdviser;
};
