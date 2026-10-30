const { test } = require("node:test");
const assert = require("node:assert/strict");
const Sequelize = require("sequelize");
const { addDesignation } = require("../migrations/add-designation-to-faculties");

test("designation migration adds an optional column and is safe to rerun", async () => {
  const columns = { faculty_id: {} };
  let changes = 0;
  const queryInterface = {
    async describeTable(table) {
      assert.equal(table, "faculties");
      return columns;
    },
    async addColumn(table, column, options) {
      assert.equal(table, "faculties");
      assert.equal(column, "designation");
      assert.equal(options.allowNull, true);
      assert.equal(options.type.toSql(), "VARCHAR(255)");
      columns[column] = options;
      changes++;
    },
  };
  assert.equal(await addDesignation(queryInterface, Sequelize), true);
  assert.equal(await addDesignation(queryInterface, Sequelize), false);
  assert.equal(changes, 1);
});
