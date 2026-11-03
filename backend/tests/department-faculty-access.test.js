const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

function loadController(db) {
  const filename = path.join(__dirname, "..", "controllers", "dean-faculty.controller.js");
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  const dependencies = {
    "../models": db,
    bcrypt: { hash: async () => "hash" },
    sequelize: { Op: { or: Symbol("or"), like: Symbol("like") } },
    "../utils/email": { sendAccountCredentials: async () => ({ success: true }) },
    "../utils/presign": { presignFields: async (value) => value },
    "../utils/storage": { driver: "disk", getUrl: async () => null },
  };

  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module,
    exports: module.exports,
    require: (name) => dependencies[name] ?? nativeRequire(name),
    __dirname: path.dirname(filename),
    console: { log() {}, error() {} },
    process,
  }, { filename });

  return module.exports;
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("college-department faculty list falls back to the account name for legacy records", async () => {
  let facultyWhere;
  const db = {
    Dean: { findOne: async () => null },
    CollegeDepartment: {
      findOne: async () => ({
        name: "College of Engineering Technology",
        department: null,
      }),
    },
    Department: {},
    Faculty: {
      findAndCountAll: async ({ where }) => {
        facultyWhere = where;
        return { count: 0, rows: [] };
      },
    },
  };
  const controller = loadController(db);
  const res = responseRecorder();

  await controller.getFaculty(
    { user: { user_id: 2, role: "college_department" }, query: {} },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(facultyWhere.department, "College of Engineering Technology");
  assert.equal(res.body.totalItems, 0);
});
