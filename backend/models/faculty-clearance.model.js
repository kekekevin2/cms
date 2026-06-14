module.exports = (sequelize, Sequelize) => {
	const FacultyClearance = sequelize.define(
		"faculty_clearances",
		{
			clearance_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			faculty_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			academic_year_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			semester: {
				type: Sequelize.STRING(50),
				allowNull: false,
			},
			clearance_status: {
				type: Sequelize.ENUM("pending", "cleared", "withholding"),
				allowNull: false,
				defaultValue: "pending",
			},
			clearance_remarks: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			clearance_date: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			set_by_dean_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
		},
		{
			indexes: [
				{
					unique: true,
					fields: ["faculty_id", "academic_year_id", "semester"],
				},
			],
		},
	);

	return FacultyClearance;
};
