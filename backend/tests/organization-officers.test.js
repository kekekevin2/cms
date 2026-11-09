const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const express = require("express");
const jwt = require("jsonwebtoken");

const secret = "organization-officers-test-secret";
function load(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const module = { exports: {} };
  const nativeRequire = createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports,
    require: (name) => dependencies[name] ?? nativeRequire(name),
    process: { env: { JWT_SECRET: secret } },
    console: { log() {}, error() {} },
  }, { filename });
  return module.exports;
}

async function fixture(t, options = {}) {
  const queries = [];
  const members = [
    { member_id: 1, organization_id: 7, first_name: "Officer", last_name: "Secretary", position: "SECRETARY", is_active: true, sr_code: "private", gwa: "private", home_address: "private", signature_url: "private" },
    { member_id: 2, organization_id: 7, first_name: "Officer", last_name: "President", position: "PRESIDENT", is_active: true, photo_url: "members/president.png" },
    { member_id: 3, organization_id: 7, position: " member ", is_active: true },
    { member_id: 4, organization_id: 7, position: " Adviser ", is_active: true },
    { member_id: 5, organization_id: 7, position: "Advisor", is_active: true },
    { member_id: 6, organization_id: 7, position: "", is_active: true },
    { member_id: 7, organization_id: 7, position: null, is_active: true },
    { member_id: 8, organization_id: 7, position: "TREASURER", is_active: false },
    { member_id: 9, organization_id: 88, position: "PRESIDENT", is_active: true },
    { member_id: 10, organization_id: 7, first_name: "Custom", last_name: "Officer", position: "Custom Committee Head", is_active: true },
  ];
  const db = {
    Dean: { findOne: async () => options.collegeDepartment ? null : { department: "Computing" } },
    CollegeDepartment: { findOne: async () => options.noDepartment ? null : { department: { department_name: "Computing" } } },
    Department: {}, AcademicYear: {},
    Organization: {
      findOne: async ({ where, attributes }) => {
        queries.push({ type: "organization", where, attributes });
        return !options.foreignOrganization && where.organization_id === 7 && where.department === "Computing"
          ? { organization_id: 7, organization_name: "ACETS" } : null;
      },
    },
    OrganizationMember: {
      findAll: async (query) => {
        queries.push({ type: "members", ...query });
        if (options.failure) throw new Error("Database failure");
        const rows = options.empty ? [] : members.filter((member) => member.organization_id === query.where.organization_id && member.is_active === query.where.is_active);
        return rows.map((row) => Object.fromEntries(query.attributes.map((attribute) => [attribute, row[attribute]])));
      },
    },
    OrganizationPositionTemplate: {
      findAll: async () => [
        { position_name: "PRESIDENT", hierarchy_level: 1 },
        { position_name: "SECRETARY", hierarchy_level: 3 },
      ],
    },
  };
  const controller = load("controllers/dean-organization-dashboard.controller.js", {
    "../models": db,
    "../utils/presign": { presignFields: async (rows) => rows.map((row) => ({ ...row, photo_url: row.photo_url ? "https://images.example.test/president.png" : null })) },
  });
  const router = load("routes/dean.routes.js", {
    "../controllers/dean-organization-dashboard.controller": controller,
    "../controllers/dean.controller": { getProfile() {} },
    "../middleware/auth.middleware": load("middleware/auth.middleware.js"),
  });
  const app = express();
  app.use("/api/dean/dashboard", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const request = (id = "7", role = "college_department", method = "GET") => fetch(
    `http://127.0.0.1:${server.address().port}/api/dean/dashboard/organizations/${id}/officers`,
    { method, headers: role ? { Authorization: `Bearer ${role === "invalid" ? "bad-token" : jwt.sign({ user_id: 42, role }, secret)}` } : {} },
  );
  return { request, queries };
}

test("department and dean users can view the selected organization's active officers in hierarchy order", async (t) => {
  for (const role of ["dean", "college_department"]) {
    const { request, queries } = await fixture(t, { collegeDepartment: role === "college_department" });
    const response = await request("7", role);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.organization.organization_name, "ACETS");
    assert.deepEqual(body.officers.map((officer) => officer.member_id), [2, 1, 10]);
    assert.equal(body.officers[0].photo_url, "https://images.example.test/president.png");
    assert.equal(queries[0].where.department, "Computing");
    const query = queries.find((query) => query.type === "members");
    assert.equal(query.where.organization_id, 7);
    assert.equal(query.where.is_active, true);
    for (const field of ["sr_code", "gwa", "home_address", "signature_url", "birth_date", "user_id"]) {
      assert.ok(!query.attributes.includes(field));
      assert.ok(body.officers.every((officer) => !(field in officer)));
    }
  }
});

test("anonymous visitors, invalid JWTs and other roles cannot read officer profiles", async (t) => {
  const { request, queries } = await fixture(t);
  for (const [role, status] of [[null, 403], ["invalid", 401], ["faculty", 403], ["organization", 403]]) {
    assert.equal((await request("7", role)).status, status);
  }
  assert.equal(queries.length, 0);
});

test("invalid IDs and organizations outside the user's department never query members", async (t) => {
  const { request, queries } = await fixture(t, { foreignOrganization: true });
  for (const id of ["abc", "0", "-1", "1.5", "2147483648"]) {
    assert.equal((await request(id)).status, 400);
  }
  assert.equal(queries.length, 0);
  assert.equal((await request()).status, 404);
  assert.equal(queries.some((query) => query.type === "members"), false);
});

test("missing departments and empty officer lists have clear responses; database errors are sanitized", async (t) => {
  for (const [options, status] of [[{ collegeDepartment: true, noDepartment: true }, 404], [{ empty: true }, 200], [{ failure: true }, 500]]) {
    const { request } = await fixture(t, options);
    const response = await request();
    assert.equal(response.status, status);
    const body = await response.json();
    if (status === 200) assert.deepEqual(body.officers, []);
    assert.ok(!JSON.stringify(body).includes("Database failure"));
  }
});

test("officer viewing adds no write endpoints", async (t) => {
  const { request, queries } = await fixture(t);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal((await request("7", "college_department", method)).status, 404);
  }
  assert.equal(queries.length, 0);
});
