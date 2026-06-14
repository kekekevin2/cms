module.exports = (sequelize, Sequelize) => {
	const FacultyCredential = sequelize.define(
		"faculty_credentials",
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			faculty_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: "faculties",
					key: "faculty_id",
				},
			},
			education: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			education_obtained_where: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			education_obtained_when: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			professional_license: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			specialization: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			subjects_to_teach: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			appointment_nature: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			status: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			tor_file_path: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			pds_file_path: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			diploma_file_path: {
				type: Sequelize.STRING,
				allowNull: true,
			},
		},
		{
			timestamps: true,
			underscored: true,
		},
	);

	return FacultyCredential;
};
