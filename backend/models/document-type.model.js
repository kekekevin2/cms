module.exports = (sequelize, Sequelize) => {
	const DocumentType = sequelize.define("document_types", {
		document_type_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		type_name: {
			type: Sequelize.STRING(100),
			allowNull: false,
			unique: true,
		},
		description: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
		required_per_semester: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
		is_active: {
			type: Sequelize.BOOLEAN,
			defaultValue: true,
		},
	});

	return DocumentType;
};
