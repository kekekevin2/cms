const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const express = require("express");
const jwt = require("jsonwebtoken");

const testSecret = "public-profile-test-secret";

function loadModule(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports,
    require: (name) => dependencies[name] ?? nativeRequire(name),
    process: { env: { JWT_SECRET: testSecret } },
    console: { error() {}, log() {} },
  }, { filename });
  return module.exports;
}

async function fixture(t, options = {}) {
  const row = {
    college_department_id: 7, name: "Test Department", email: "department@example.test",
    user_id: 42, is_active: true, createdAt: "private metadata",
    about: "Original description", goal: "Department goal", why_batstateu: "Reason",
    peos: '[{"title":"Objective","description":"Description"}]',
    programs: [], career_opportunities: [], program_outcomes: [],
    profile_picture: "profile-pictures/department.png",
    campus: { campus_id: 3, campus_name: "Test Campus", is_active: true },
    department: { department_id: 5, department_name: "Department", acronym: "TEST" },
  };
  const queries = [];
  function project(options) {
    if (!options.attributes) return row;
    const result = Object.fromEntries(options.attributes.map((key) => [key, row[key]]));
    for (const include of options.include) {
      result[include.as] = Object.fromEntries(include.attributes.map((key) => [key, row[include.as][key]]));
    }
    return result;
  }
  row.update = async (values) => {
    if (options.failProfileUpdate) throw new Error("Profile write failed");
    return Object.assign(row, values);
  };
  const accounts = [
    { user_id: 42, email: row.email, role: "college_department", password: "existing-hash" },
    { user_id: 99, email: "taken@example.test", role: options.duplicateRole || "college_department" },
  ];
  const db = {
    Campus: {}, Department: {},
    sequelize: {
      transaction: () => assert.fail("Contact edits must not start a login transaction"),
    },
    User: {
      findOne: () => assert.fail("Contact edits must not query login accounts"),
      update: () => assert.fail("Contact edits must not change login accounts"),
    },
    CollegeDepartment: {
      findAll: async (options) => {
        queries.push(options);
        assert.equal(options.where.is_active, true);
        return row.is_active ? [project(options)] : [];
      },
      findOne: async (options) => {
        queries.push(options);
        if (options.where.user_id !== undefined) {
          return options.where.user_id === row.user_id ? row : null;
        }
        assert.equal(options.where.is_active, true);
        return row.is_active && options.where.college_department_id === row.college_department_id
          ? project(options) : null;
      },
    },
  };
  const presign = {
    presignFields: async (record) => ({ ...record, profile_picture: "https://images.example.test/department.png" }),
  };
  const controller = loadModule("controllers/public-department.controller.js", {
    "../models": db, "../utils/presign": presign,
  });
  const publicRouter = loadModule("routes/public-department.routes.js", {
    "../controllers/public-department.controller": controller,
  });
  const portalRouter = loadModule("routes/college-department-portal.routes.js", {
    "../models": db,
    "../middleware/auth.middleware": loadModule("middleware/auth.middleware.js"),
    "../middleware/role.middleware": loadModule("middleware/role.middleware.js"),
    "../utils/presign": presign,
    "../utils/storage": {},
    "../utils/upload": {
      MB: 1024 * 1024,
      makeUpload: () => ({ single: () => () => assert.fail("Unauthorized upload reached multer") }),
    },
  });
  const app = express();
  app.use(express.json());
  app.use("/api/public/departments", publicRouter);
  app.use("/api/college-department", portalRouter);
  const authController = loadModule("controllers/auth.controller.js", {
    "../models": {
      ...db,
      User: { findOne: async ({ where }) => accounts.find((account) => account.email === where.email) },
    },
    bcrypt: { compare: async (password, hash) => password === "existing-password" && hash === "existing-hash" },
    "../utils/email": {},
  });
  app.post("/test-login", authController.login);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options) => fetch(base + url, options);
  const token = (role) => jwt.sign({ user_id: 42, role }, testSecret, { expiresIn: "1h" });
  return { row, queries, request, token, accounts };
}

test("anonymous visitors can list and read public fields without account data", async (t) => {
  const { request, queries } = await fixture(t);
  const list = await request("/api/public/departments");
  assert.equal(list.status, 200);
  assert.equal(list.headers.get("cache-control"), "no-store");
  const { records } = await list.json();
  assert.equal(records[0].college_department_id, 7);
  assert.equal(records[0].email, undefined);
  const detail = await request("/api/public/departments/7");
  assert.equal(detail.status, 200);
  const { record } = await detail.json();
  assert.equal(record.about, "Original description");
  assert.equal(record.profile_picture, "https://images.example.test/department.png");
  assert.equal(record.user_id, undefined);
  assert.equal(record.is_active, undefined);
  assert.equal(record.createdAt, undefined);
  assert.equal(record.campus.campus_id, undefined);
  for (const query of queries) {
    assert.ok(!query.attributes.includes("user_id"));
    assert.ok(!query.attributes.includes("is_active"));
    assert.ok(!query.include.some((include) => include.as === "user"));
  }
});

test("inactive and missing profiles are unavailable; malformed IDs never reach the DB", async (t) => {
  const { request, row, queries } = await fixture(t);
  for (const id of ["0", "-1", "1.5", "abc", "1%20OR%201=1", "2147483648"]) {
    assert.equal((await request(`/api/public/departments/${id}`)).status, 400);
  }
  assert.equal(queries.length, 0);
  assert.equal((await request("/api/public/departments/999")).status, 404);
  row.is_active = false;
  assert.equal((await request("/api/public/departments/7")).status, 404);
  assert.deepEqual((await (await request("/api/public/departments")).json()).records, []);
});

test("public routes offer no writes; portal writes still require JWT and the correct role", async (t) => {
  const { request, token, row } = await fixture(t);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal((await request("/api/public/departments/7", { method })).status, 404);
  }
  for (const [url, method] of [
    ["/api/college-department/profile", "GET"],
    ["/api/college-department/profile", "PUT"],
    ["/api/college-department/profile/picture", "POST"],
  ]) {
    assert.equal((await request(url, { method })).status, 403);
    assert.equal((await request(url, { method, headers: { Authorization: "Bearer invalid" } })).status, 401);
    assert.equal((await request(url, { method, headers: { Authorization: `Bearer ${token("faculty")}` } })).status, 403);
  }
  assert.equal(row.about, "Original description");
});

test("an authorized edit is immediately returned by the public GET using the same record", async (t) => {
  const { request, token } = await fixture(t);
  const update = await request("/api/college-department/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token("college_department")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ about: "Updated through existing editor", program_outcomes: ["New outcome"] }),
  });
  assert.equal(update.status, 200);
  const { record } = await (await request("/api/public/departments/7")).json();
  assert.equal(record.about, "Updated through existing editor");
  assert.deepEqual(JSON.parse(record.program_outcomes), ["New outcome"]);
});

function saveEmail(request, token, body) {
  return request("/api/college-department/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token("college_department")}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("department contact email updates the public profile while the original credentials still sign in", async (t) => {
  const { request, token, row, accounts } = await fixture(t);
  const result = await saveEmail(request, token, { email: " New.Address@Example.test ", user_id: 99, role: "superadmin" });
  assert.equal(result.status, 200);
  assert.equal(row.email, "new.address@example.test");
  assert.equal(accounts[0].email, "department@example.test");
  assert.equal(accounts[0].password, "existing-hash");
  assert.equal(accounts[0].role, "college_department");
  assert.equal(accounts[1].email, "taken@example.test");
  const { record } = await (await request("/api/public/departments/7")).json();
  assert.equal(record.email, row.email);
  assert.equal((await request("/api/college-department/profile", { headers: { Authorization: `Bearer ${token("college_department")}` } })).status, 200);
  const login = (email, password) => request("/test-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const signedIn = await login("department@example.test", "existing-password");
  assert.equal(signedIn.status, 200);
  const session = await signedIn.json();
  assert.equal(session.user.email, "department@example.test");
  assert.equal(session.user.profile.email, "new.address@example.test");
  assert.equal(jwt.verify(session.token, testSecret).email, "department@example.test");
  assert.equal((await login("new.address@example.test", "existing-password")).status, 401);
  assert.equal((await login("department@example.test", "wrong-password")).status, 401);
});

test("empty, invalid, oversized, and non-string department emails are rejected without writes", async (t) => {
  const { request, token, row, accounts } = await fixture(t);
  for (const email of ["", "   ", "invalid", "two@@example.test", null, [], {}, "a".repeat(151) + "@example.test"]) {
    assert.equal((await saveEmail(request, token, { email, about: "must not save" })).status, 400);
  }
  assert.equal(row.email, "department@example.test");
  assert.equal(accounts[0].email, row.email);
  assert.equal(row.about, "Original description");
});

test("contact emails may match another account without changing either login", async (t) => {
  for (const duplicateRole of ["college_department", "faculty"]) {
    const { request, token, row, accounts } = await fixture(t, { duplicateRole });
    assert.equal((await saveEmail(request, token, { email: "TAKEN@example.test" })).status, 200);
    assert.equal(row.email, "taken@example.test");
    assert.equal(accounts[0].email, "department@example.test");
    assert.equal(accounts[1].email, "taken@example.test");
  }
});

test("a failed contact profile save leaves both existing emails intact", async (t) => {
  const { request, token, row, accounts } = await fixture(t, { failProfileUpdate: true });
  assert.equal((await saveEmail(request, token, { email: "new@example.test" })).status, 500);
  assert.equal(row.email, "department@example.test");
  assert.equal(accounts[0].email, "department@example.test");
});

test("saving an unchanged email still permits other profile edits without changing the login", async (t) => {
  const { request, token, row, accounts } = await fixture(t);
  const result = await saveEmail(request, token, { email: "department@example.test", goal: "Updated goal" });
  assert.equal(result.status, 200);
  assert.equal(row.goal, "Updated goal");
  assert.equal(accounts[0].email, row.email);
});
