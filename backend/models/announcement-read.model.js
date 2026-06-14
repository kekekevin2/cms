const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
	const AnnouncementRead = sequelize.define(
		"AnnouncementRead",
		{
			read_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			announcement_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "announcements",
					key: "announcement_id",
				},
			},
			faculty_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: {
					model: "faculties",
					key: "faculty_id",
				},
			},
			read_at: {
				type: DataTypes.DATE,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			tableName: "announcement_reads",
			timestamps: false,
			indexes: [
				{
					unique: true,
					fields: ["announcement_id", "faculty_id"],
				},
			],
		},
	);

	return AnnouncementRead;
};
