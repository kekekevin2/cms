module.exports = (sequelize, Sequelize) => {
	const CVLAttachment = sequelize.define("cvl_attachments", {
		cvl_attachment_id: {
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
		attachment_type: {
			type: Sequelize.ENUM(
				"Attachment A",
				"Attachment B",
				"Attachment C",
				"Attachment D",
				"Attachment E",
				"Attachment F",
				"Attachment G",
				"Attachment H",
				"Attachment J"
			),
			allowNull: false,
			comment: "Type of CVL attachment (A-H, J)",
		},
		date_created: {
			type: Sequelize.DATEONLY,
			allowNull: true,
			comment: "Date when the document was created/issued",
		},
		semester: {
			type: Sequelize.STRING(20),
			allowNull: true,
			comment: "Semester (1st Semester, 2nd Semester, Summer)",
		},
		academic_year_id: {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: {
				model: "academic_years",
				key: "academic_year_id",
			},
			onDelete: "SET NULL",
			comment: "Reference to academic year",
		},
		document_path: {
			type: Sequelize.STRING(500),
			allowNull: false,
			comment: "File path in server",
		},
		original_filename: {
			type: Sequelize.STRING(255),
			allowNull: false,
		},
		file_size: {
			type: Sequelize.INTEGER,
			allowNull: false,
			comment: "File size in bytes",
		},
		mime_type: {
			type: Sequelize.STRING(100),
			allowNull: false,
		},
		uploaded_at: {
			type: Sequelize.DATE,
			allowNull: false,
			defaultValue: Sequelize.NOW,
		},
	});

	return CVLAttachment;
};
