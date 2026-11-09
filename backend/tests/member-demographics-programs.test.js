const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Op } = require("sequelize");

function fixture(options = {}) {
  const members = [
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: "CPE", gender: "Male", is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: " CPE ", gender: "Male", is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: "CPE", gender: "Female", is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: "CPE", gender: null, is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: "ELEC", gender: "Male", is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: "ELEC", gender: "Female", is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: "ELEC", gender: "Female", is_active: true },
    { organization_id: 7, academic_year_id: "1", semester: "1st Semester", program: null, gender: "Male", is_active: true },
    { organization_id: 7, academic_year_id: "2", semester: "2nd Semester", program: "New Program", gender: "Female", is_active: true },
    { organization_id: 8, academic_year_id: "1", semester: "1st Semester", program: "Other Organization", gender: "Female", is_active: true },
    { organization_id: 99, academic_year_id: "1", semester: "1st Semester", program: "Other Department", gender: "Female", is_active: true },
  ];
  let memberQuery;
  const db = {
    Dean: { findOne: async () => ({ department: "Computing" }) },
    Organization: {
      findOne: async ({ where }) => {
        assert.equal(where.department, "Computing");
        return ["7", "8"].includes(where.organization_id) ? { organization_id: Number(where.organization_id) } : null;
      },
      findAll: async ({ where }) => {
        assert.equal(where.department, "Computing");
        return options.empty ? [] : [{ organization_id: 7 }, { organization_id: 8 }];
      },
    },
    OrganizationMember: {
      findAll: async (query) => {
        memberQuery = query;
        return members.filter((member) => {
          const ids = typeof query.where.organization_id === "object" ? query.where.organization_id[Op.in] : [Number(query.where.organization_id)];
          return ids.includes(member.organization_id)
            && (!query.where.academic_year_id || member.academic_year_id === query.where.academic_year_id)
            && (!query.where.semester || member.semester === query.where.semester)
            && (query.where.is_active === undefined || member.is_active === query.where.is_active);
        });
      },
    },
  };
  const filename = path.join(__dirname, "../controllers/dean-organization-dashboard.controller.js");
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports, console,
    require: (name) => name === "../models" ? db : name === "sequelize" ? { Op } : {},
  }, { filename });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  return { controller: module.exports.getMemberDemographics, res, query: () => memberQuery };
}

test("program gender totals and percentages are computed from the same scoped members", async () => {
  const { controller, res, query } = fixture();
  await controller({ user: { user_id: 42 }, query: { organizationId: "7", academicYearId: "1", semester: "1st Semester", activeOnly: "true" } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.stats.totalMembers, 8);
  assert.equal(res.body.demographics.maleCount, 4);
  assert.equal(res.body.demographics.femaleCount, 3);
  const programs = JSON.parse(JSON.stringify(res.body.demographics.genderByProgram));
  assert.deepEqual(programs, [
    { program: "CPE", totalMembers: 4, maleCount: 2, femaleCount: 1, malePercentage: 50, femalePercentage: 25 },
    { program: "ELEC", totalMembers: 3, maleCount: 1, femaleCount: 2, malePercentage: 33.3, femalePercentage: 66.7 },
  ]);
  assert.equal(query().where.is_active, true);
  assert.ok(!JSON.stringify(res.body).includes("member_id"));
  assert.ok(!JSON.stringify(res.body).includes("Other Department"));
});

test("all-organizations aggregation excludes other departments and keeps term filters", async () => {
  const { controller, res, query } = fixture();
  await controller({ user: { user_id: 42 }, query: { academicYearId: "1", semester: "1st Semester" } }, res);
  assert.equal(res.body.stats.totalMembers, 9);
  assert.deepEqual(Array.from(query().where.organization_id[Op.in]), [7, 8]);
  assert.ok(res.body.demographics.genderByProgram.some((program) => program.program === "Other Organization"));
  assert.ok(!res.body.demographics.genderByProgram.some((program) => program.program === "New Program" || program.program === "Other Department"));
});

test("empty departments return an empty program filter without missing fields", async () => {
  const { controller, res, query } = fixture({ empty: true });
  await controller({ user: { user_id: 42 }, query: {} }, res);
  assert.equal(res.body.stats.totalMembers, 0);
  assert.equal(res.body.demographics.genderByProgram.length, 0);
  assert.equal(query(), undefined);
});

test("an organization from another department cannot reveal program aggregates", async () => {
  const { controller, res, query } = fixture();
  await controller({ user: { user_id: 42 }, query: { organizationId: "99" } }, res);
  assert.equal(res.code, 404);
  assert.equal(query(), undefined);
});
