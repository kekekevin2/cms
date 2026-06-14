const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	const Announcement = sequelize.define(
		"Announcement",
		{
			announcement_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			dean_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "deans",
					key: "dean_id",
				},
			},
			title: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			content: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			target_department: {
				type: DataTypes.STRING(100),
				allowNull: true,
				comment:
					"If null, announcement is for all faculty in dean's department",
			},
			created_at: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
			updated_at: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			tableName: "announcements",
			timestamps: true,
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
	);

	return Announcement;
};
