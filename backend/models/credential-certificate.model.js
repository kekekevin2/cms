module.exports = (sequelize, Sequelize) => {
	const CredentialCertificate = sequelize.define(
		"credential_certificates",
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
				allowNull: false,
			},
			credential_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: "faculty_credentials",
					key: "id",
				},
			},
			certificate_name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			file_path: {
				type: Sequelize.STRING,
				allowNull: false,
			},
		},
		{
			timestamps: true,
			underscored: true,
		},
	);

	return CredentialCertificate;
};
