const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Exercise the export response without opening the database, storage, or email connections.
async function exportProfile(personal, { employmentStatus, historyStatus, designation } = {}) {
  const empty = { findAll: async () => [] };
  const db = {
    Dean: { findOne: async () => ({ department: "Test Department" }) },
    Faculty: { findOne: async () => ({
      faculty_id: 1, first_name: "Sample", last_name: "Faculty", department: "Test Department",
      employment_status: employmentStatus,
      designation,
    }) },
    FacultyPersonalProfile: { findOne: async () => personal },
    FacultyAcademicProfile: empty,
    FacultyEmploymentProfile: { findAll: async () => historyStatus
      ? [{ is_current: true, employment_status: historyStatus }] : [] },
    FacultyProfessionalMembership: empty,
    FacultyAwards: empty,
    FacultyCourseHandled: empty,
    PersonalDataSheet: { findOne: async () => ({ name_extension: "III" }) },
  };
  const dependencies = {
    "../models": db,
    bcrypt: {},
    sequelize: { Op: {} },
    "../utils/email": {},
    "../utils/presign": { presignFields: async (record) => record },
    "../utils/storage": {},
    fs,
    path,
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
  let result;
  await module.exports.getFacultyFullProfile(
    { user: { user_id: 10 }, params: { facultyId: 1 } },
    {
      json(value) { result = value; },
      status(code) { throw new Error(`Unexpected response status ${code}`); },
    },
  );
  return result;
}

test("Faculty Profile export keeps an empty My Profile extension empty despite an old PDS suffix", async () => {
  for (const personal of [null, {}, { extension_name: null }, { extension_name: "" }, { extension_name: "   " }]) {
    const result = await exportProfile(personal);
    assert.equal(result.faculty.extension_name, null);
  }
});

test("Faculty Profile export prints the suffix supplied in My Profile", async () => {
  for (const extension of ["Jr.", "Sr.", "II", "III", "IV", "V"]) {
    const result = await exportProfile({ extension_name: ` ${extension} ` });
    assert.equal(result.faculty.extension_name, extension);
  }
});

test("Faculty Profile export reads employment status from the faculty database record", async () => {
  for (const status of ["Permanent", "Temporary", "Guest Lecturer"]) {
    const result = await exportProfile(null, { employmentStatus: status, historyStatus: "Contractual" });
    assert.equal(result.faculty.employment_status, status);
    assert.equal(result.employment[0].employment_status, "Contractual");
  }
});

test("Faculty Profile export preserves an empty department status instead of using employment history", async () => {
  for (const status of [undefined, null, ""]) {
    const result = await exportProfile(null, { employmentStatus: status, historyStatus: "Contractual" });
    assert.equal(result.faculty.employment_status, status);
  }
});

test("faculty details return the department's saved designation", async () => {
  const result = await exportProfile(null, { designation: "Program Chair" });
  assert.equal(result.faculty.designation, "Program Chair");
});
