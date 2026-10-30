const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const fields = {
  employee_id: "12345", first_name: "Sample", last_name: "Faculty",
  email: "sample@example.edu", position_level: "Instructor I",
};

function controller(existingStatus = "Temporary") {
  const effects = { created: [], updated: [], users: 0, emails: 0, commits: 0, rollbacks: 0 };
  const transaction = {
    commit: async () => { effects.commits++; },
    rollback: async () => { effects.rollbacks++; },
  };
  const faculty = {
    ...fields, faculty_id: 1, user_id: 101, employment_status: existingStatus,
    async update(data) { effects.updated.push(data); Object.assign(this, data); },
  };
  const db = {
    sequelize: { transaction: async () => transaction },
    Dean: { findOne: async () => ({ department: "Test Department" }) },
    Faculty: {
      findOne: async ({ where }) => where.faculty_id ? faculty : null,
      create: async (data, options) => {
        assert.equal(options.transaction, transaction);
        effects.created.push(data);
        return { ...data, faculty_id: 1 };
      },
    },
    User: {
      create: async () => { effects.users++; return { user_id: 101 }; },
      findOne: async () => null,
      update: async () => {},
    },
  };
  const dependencies = {
    "../models": db,
    bcrypt: { hash: async () => "test-hash" },
    sequelize: { Op: { ne: Symbol("ne") } },
    "../utils/email": { sendAccountCredentials: async () => {
      effects.emails++; return { success: true };
    } },
    "../utils/email-validator": { checkEmailUsageLimit: async () => ({ allowed: true }) },
    "../utils/presign": {}, "../utils/storage": {}, fs, path,
  };
  const filename = path.join(__dirname, "..", "controllers", "dean-faculty.controller.js");
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports, console, __dirname: path.dirname(filename),
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return {
    effects, faculty,
    async invoke(method, extra = {}) {
      const response = {
        code: 200, body: null,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
      };
      await module.exports[method](
        { user: { user_id: 10 }, params: { id: 1 }, body: { ...fields, ...extra } },
        response,
      );
      return response;
    },
  };
}

for (const status of ["Permanent", "Temporary", "Guest Lecturer"]) {
  test(`faculty creation stores ${status}`, async () => {
    const api = controller();
    const res = await api.invoke("createFaculty", { employment_status: status });
    assert.equal(res.code, 201);
    assert.equal(api.effects.created[0].employment_status, status);
    assert.equal(api.effects.created[0].department, "Test Department");
    assert.equal(api.effects.commits, 1);
  });

  test(`faculty editing stores ${status}`, async () => {
    const api = controller();
    const res = await api.invoke("updateFaculty", { employment_status: status });
    assert.equal(res.code, 200);
    assert.equal(api.faculty.employment_status, status);
  });
}

test("invalid employment status rejects creation before any user, faculty, or email side effects", async () => {
  const api = controller();
  const res = await api.invoke("createFaculty", { employment_status: "Unsupported" });
  assert.equal(res.code, 400);
  assert.equal(api.effects.users, 0);
  assert.equal(api.effects.created.length, 0);
  assert.equal(api.effects.emails, 0);
  assert.equal(api.effects.rollbacks, 1);
});

test("invalid employment status rejects updates without changing the record", async () => {
  const api = controller();
  const res = await api.invoke("updateFaculty", { employment_status: "Unsupported" });
  assert.equal(res.code, 400);
  assert.equal(api.effects.updated.length, 0);
  assert.equal(api.faculty.employment_status, "Temporary");
});

test("an omitted status preserves existing records and remains optional on creation", async () => {
  const api = controller();
  assert.equal((await api.invoke("updateFaculty")).code, 200);
  assert.equal(Object.hasOwn(api.effects.updated[0], "employment_status"), false);
  assert.equal(api.faculty.employment_status, "Temporary");
  assert.equal((await api.invoke("createFaculty")).code, 201);
  assert.equal(api.effects.created[0].employment_status, null);
});

test("an empty selection clears the status while an unchanged legacy status is retained", async () => {
  const api = controller("Contractual");
  assert.equal((await api.invoke("updateFaculty", { employment_status: "Contractual" })).code, 200);
  assert.equal(api.faculty.employment_status, "Contractual");
  assert.equal((await api.invoke("updateFaculty", { employment_status: "" })).code, 200);
  assert.equal(api.faculty.employment_status, null);
});

test("designation is trimmed, saved on creation, and editable", async () => {
  const api = controller();
  assert.equal((await api.invoke("createFaculty", { designation: "  Program Chair  " })).code, 201);
  assert.equal(api.effects.created[0].designation, "Program Chair");
  assert.equal((await api.invoke("updateFaculty", { designation: "  Research Coordinator  " })).code, 200);
  assert.equal(api.faculty.designation, "Research Coordinator");
});

test("designation is optional and omitted updates preserve an existing designation", async () => {
  const api = controller();
  api.faculty.designation = "Program Chair";
  assert.equal((await api.invoke("updateFaculty")).code, 200);
  assert.equal(Object.hasOwn(api.effects.updated[0], "designation"), false);
  assert.equal(api.faculty.designation, "Program Chair");
  assert.equal((await api.invoke("createFaculty")).code, 201);
  assert.equal(api.effects.created[0].designation, null);
});

test("blank or null designations clear the saved value", async () => {
  for (const designation of ["", "   ", null]) {
    const api = controller();
    api.faculty.designation = "Program Chair";
    assert.equal((await api.invoke("updateFaculty", { designation })).code, 200);
    assert.equal(api.faculty.designation, null);
  }
});

test("invalid designation values fail before creating or updating records", async () => {
  for (const designation of [123, {}, [], "x".repeat(256)]) {
    const api = controller();
    assert.equal((await api.invoke("createFaculty", { designation })).code, 400);
    assert.equal(api.effects.users, 0);
    assert.equal(api.effects.created.length, 0);
    assert.equal(api.effects.emails, 0);
    assert.equal(api.effects.rollbacks, 1);
    assert.equal((await api.invoke("updateFaculty", { designation })).code, 400);
    assert.equal(api.effects.updated.length, 0);
  }
});

test("designation accepts the full 255-character limit", async () => {
  const api = controller();
  const designation = "x".repeat(255);
  assert.equal((await api.invoke("createFaculty", { designation })).code, 201);
  assert.equal(api.effects.created[0].designation, designation);
});

test("multiple designations retain their line breaks when saved and edited", async () => {
  const api = controller();
  const designation = "Research Coordinator\nProgram Chair";
  assert.equal((await api.invoke("createFaculty", { designation })).code, 201);
  assert.equal(api.effects.created[0].designation, designation);
  assert.equal((await api.invoke("updateFaculty", { designation })).code, 200);
  assert.equal(api.faculty.designation, designation);
});
