module.exports = (sequelize, Sequelize) => {
	const OrganizationDocument = sequelize.define("organization_documents", {
		document_id: {
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
		document_type_id: {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: {
				model: "document_types",
				key: "document_type_id",
			},
			onDelete: "CASCADE",
		},
		academic_year_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
			references: {
				model: "academic_years",
				key: "academic_year_id",
			},
			onDelete: "CASCADE",
		},
		semester: {
			type: Sequelize.ENUM("1st Semester", "2nd Semester", "Summer"),
			allowNull: false,
		},
		document_title: {
			type: Sequelize.STRING(255),
			allowNull: false,
		},
		activity_date: {
			type: Sequelize.DATEONLY,
			allowNull: true,
			comment: "Date of the activity",
		},
		venue: {
			type: Sequelize.STRING(255),
			allowNull: true,
			comment: "Venue of the activity",
		},
		participants: {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: "Number of participants",
		},
		sdgs: {
			type: Sequelize.JSON,
			allowNull: true,
			comment: "Array of SDG IDs that this activity addresses",
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
		submitted_date: {
			type: Sequelize.DATEONLY,
			allowNull: false,
			defaultValue: Sequelize.NOW,
		},
		status: {
			type: Sequelize.ENUM(
				"pending",
				"approved",
				"rejected",
				"revision_needed",
			),
			defaultValue: "pending",
		},
		reviewed_by: {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: "Dean user_id who reviewed",
			references: {
				model: "users",
				key: "user_id",
			},
			onDelete: "SET NULL",
		},
		review_date: {
			type: Sequelize.DATEONLY,
			allowNull: true,
		},
		review_comments: {
			type: Sequelize.TEXT,
			allowNull: true,
		},
	});

	return OrganizationDocument;
};
