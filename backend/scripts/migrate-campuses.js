require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const { dbConfig } = require("../config/db.config");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
	host: dbConfig.HOST,
	dialect: dbConfig.dialect,
	pool: dbConfig.pool,
	logging: false,
});

async function migrateCampuses() {
	try {
		await sequelize.authenticate();
		console.log("Database connected.");

		const queryInterface = sequelize.getQueryInterface();

		// 1. Create campuses table if it doesn't exist
		await queryInterface.createTable(
			"campuses",
			{
				campus_id: {
					type: Sequelize.INTEGER,
					autoIncrement: true,
					primaryKey: true,
					allowNull: false,
				},
				campus_name: {
					type: Sequelize.STRING(150),
					allowNull: false,
				},
				is_active: {
					type: Sequelize.BOOLEAN,
					defaultValue: true,
				},
				createdAt: {
					type: Sequelize.DATE,
					allowNull: false,
					defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
				},
				updatedAt: {
					type: Sequelize.DATE,
					allowNull: false,
					defaultValue: Sequelize.literal(
						"CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
					),
				},
			},
			{ ifNotExists: true },
		);
		console.log("✓ campuses table created (or already exists).");

		// 2. Drop address column if it exists
		const tableDesc = await queryInterface.describeTable("campuses");
		if (tableDesc.address) {
			await queryInterface.removeColumn("campuses", "address");
			console.log("✓ Removed address column from campuses.");
		} else {
			console.log("✓ No address column found — nothing to remove.");
		}

		// 3. Drop campus_code column if it exists
		if (tableDesc.campus_code) {
			await queryInterface.removeColumn("campuses", "campus_code");
			console.log("✓ Removed campus_code column from campuses.");
		} else {
			console.log("✓ No campus_code column found — nothing to remove.");
		}

		console.log("\nMigration complete.");
	} catch (error) {
		console.error("Migration failed:", error.message);
		process.exit(1);
	} finally {
		await sequelize.close();
	}
}

migrateCampuses();
