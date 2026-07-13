/**
 * Fix duplicate indexes caused by repeated Sequelize sync({ alter: true }).
 * Keeps the first occurrence of every index name, drops _2, _3, ... duplicates.
 * Never touches PRIMARY.
 */
const db = require("../models");

async function dropDuplicateIndexes(tableName) {
  const [rows] = await db.sequelize.query(`SHOW INDEX FROM \`${tableName}\``);

  // Collect distinct index names (SHOW INDEX has one row per indexed column)
  const distinctNames = [...new Set(rows.map((r) => r.Key_name))];

  // A name is a duplicate if it matches /<baseName>_\d+$/
  // e.g. email_2, email_3, user_id_2 etc.
  const duplicates = distinctNames.filter((name) => /_\d+$/.test(name));

  if (duplicates.length === 0) {
    console.log(`  (no duplicates on ${tableName})`);
    return;
  }

  for (const indexName of duplicates) {
    try {
      await db.sequelize.query(
        `ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``
      );
      console.log(`  ✓ Dropped ${indexName}`);
    } catch (e) {
      console.warn(`  ✗ Could not drop ${indexName}: ${e.message}`);
    }
  }
}

async function migrate() {
  try {
    console.log("=== Fixing duplicate indexes ===\n");

    const tables = [
      "deans",
      "faculties",
      "admins",
      "document_types",
      "organization_position_templates",
    ];

    for (const table of tables) {
      console.log(`${table}:`);
      await dropDuplicateIndexes(table);
    }

    // Verify
    console.log("\n=== Index counts after cleanup ===");
    const [counts] = await db.sequelize.query(
      `SELECT TABLE_NAME, COUNT(*) as idx_count
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = 'db_cs'
         AND TABLE_NAME IN ('deans','faculties','admins','document_types','organization_position_templates')
       GROUP BY TABLE_NAME
       ORDER BY idx_count DESC`
    );
    counts.forEach((r) =>
      console.log(`  ${r.TABLE_NAME}: ${r.idx_count} index rows`)
    );

    console.log("\n=== Done! ===");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
