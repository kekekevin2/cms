const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Sequelize, DataTypes, Op } = require("sequelize");

// Only generate SQL; no connections, credentials, or real faculty records are used.
const sql = new Sequelize("analytics_test", "unused", "unused", { dialect: "mysql", logging: false });
const FacultyModel = sql.define("faculties", { employment_status: DataTypes.STRING });
after(() => sql.close());

const examples = [
  [1, "Permanent", 2], [2, "Temporary", 3], [3, "Guest Lecturer", 4],
  [4, " PERMANENT FACULTY ", 1], [5, "temporary faculty", 2], [6, "GUEST LECTURER", 1],
  [7, "Permanent", 100, "Other Department"], [8, "Permanent", 100, "Computing", false],
  [9, null, 1], [10, "Non-Permanent", 1],
];
const endpoints = [
  ["getResearchInvolvement", "research_activities", "date"],
  ["getExtensionInvolvement", "extension_activities", "date_of_implementation"],
  ["getSeminarsInvolvement", "seminars_trainings", "date"],
];

function expressionValue(expression, row) {
  if (expression.col) return row[expression.col.split(".").at(-1)];
  const value = expressionValue(expression.args[0], row);
  if (value == null) return null;
  if (expression.fn === "TRIM") return value.trim();
  if (expression.fn === "LOWER") return value.toLowerCase();
  throw new Error(`Unexpected SQL function ${expression.fn}`);
}

function fixture() {
  let query;
  const records = examples.map(([id, status, count, department = "Computing", active = true]) => ({
    faculty_id: id, first_name: "Faculty", last_name: String(id),
    department, is_active: active, employment_status: status,
    // A different history status must not determine which faculty is included.
    employment_history: [{ employment_status: "Contractual" }],
    activities: Array.from({ length: count }, (_, i) => ({
      date: i % 2 ? "2026-09-10" : "2025-09-10",
      date_of_implementation: i % 2 ? "2026-09-10" : "2025-09-10",
    })),
  }));
  const db = {
    sequelize: sql,
    Dean: { findOne: async () => null },
    CollegeDepartment: { findOne: async () => ({ department: { department_name: "Computing" } }) },
    Department: {},
    FacultyResearchActivities: {}, FacultyExtensionActivities: {}, FacultySeminarsTrainings: {},
    Faculty: {
      name: FacultyModel.name,
      findAll: async (options) => {
        query = options;
        const { where } = options;
        const include = options.include[0];
        const dateField = include.as === "extension_activities" ? "date_of_implementation" : "date";
        return records.filter((row) => {
          if (row.department !== where.department || row.is_active !== where.is_active) return false;
          if (where[Op.and]) {
            const condition = where[Op.and];
            if (!condition.logic[Op.in].includes(expressionValue(condition.attribute, row))) return false;
          }
          // Emulate a case-sensitive database so the former uppercase partial matches fail.
          if (where.employment_status) {
            const pattern = where.employment_status[Op.like].replaceAll("%", ".*");
            if (typeof row.employment_status !== "string" || !new RegExp(`^${pattern}$`).test(row.employment_status)) return false;
          }
          return true;
        }).map((row) => ({
          ...row,
          [include.as]: row.activities.filter((activity) => {
            if (!include.where) return true;
            const bounds = include.where[dateField][Op.between];
            assert.ok(bounds.every((bound) => /academic_year_id = 42\)/.test(bound.val)));
            return activity[dateField] >= "2025-08-01" && activity[dateField] <= "2026-07-31";
          }),
        }));
      },
    },
  };
  const filename = path.join(__dirname, "..", "controllers", "dean-faculty-analytics.controller.js");
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports, console,
    require(name) {
      if (name === "../models") return db;
      if (name === "sequelize") return { Op };
      throw new Error(`Unexpected dependency ${name}`);
    },
  }, { filename });
  return {
    get query() { return query; },
    async request(handler, params = {}) {
      let result;
      await module.exports[handler](
        { user: { user_id: 61 }, query: params },
        { json(body) { result = body; }, status(code) { throw new Error(`Unexpected HTTP ${code}`); } },
      );
      return result;
    },
  };
}

for (const [handler, association, dateField] of endpoints) {
  for (const [type, ids, total, label] of [
    ["permanent", [1, 4], 3, "Permanent Faculty"],
    ["temporary", [2, 5], 5, "Temporary Faculty"],
    ["guest_lecturer", [3, 6], 5, "Guest Lecturer"],
  ]) {
    test(`${handler} reads saved ${type} statuses including legacy case and spaces`, async () => {
      const api = fixture();
      const result = await api.request(handler, { employment_type: type });
      assert.deepEqual(Array.from(result.data, (row) => row.faculty_id).sort((a, b) => a - b), ids);
      assert.equal(result.total, total);
      assert.equal(result.subtitle, `(${label})`);
      assert.equal(api.query.where.department, "Computing");
      assert.equal(api.query.where.is_active, true);
      assert.equal(api.query.include[0].as, association);
      const generated = sql.dialect.queryGenerator.selectQuery(FacultyModel.getTableName(), {
        where: api.query.where, attributes: ["faculty_id"],
      }, FacultyModel);
      assert.match(generated, /LOWER\(TRIM\(`faculties`\.`employment_status`\)\) IN/);
      assert.doesNotMatch(generated, / LIKE /);
    });
  }

  test(`${handler} includes all active department faculty when employment type is cleared`, async () => {
    const api = fixture();
    const result = await api.request(handler);
    assert.deepEqual(Array.from(result.data, (row) => row.faculty_id).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 9, 10]);
    assert.equal(result.total, 15);
    assert.equal(result.subtitle, "(All Faculty Types)");
    assert.equal(api.query.where[Op.and], undefined);
  });

  test(`${handler} combines employment status and academic year with correct percentages`, async () => {
    const api = fixture();
    const result = await api.request(handler, { employment_type: "permanent", academic_year_id: "42" });
    assert.deepEqual(Array.from(result.data, (row) => row.faculty_id).sort((a, b) => a - b), [1, 4]);
    assert.equal(result.total, 2);
    assert.ok(result.data.every((row) => row.count === 1 && row.percentage === "50"));
    assert.ok(api.query.include[0].where[dateField][Op.between]);
  });
}
