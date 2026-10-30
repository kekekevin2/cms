const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  require.resolve("../controllers/dean-requirement.controller"),
  "utf8",
);

function setup(submission, storage) {
  const db = {
    Dean: { findOne: async () => ({ department: "Computing" }) },
    CollegeDepartment: { findOne: async () => null },
    Faculty: {},
    RequirementSubmission: { findOne: async () => submission },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    console,
    Buffer,
    require: (id) => {
      if (id === "../models") return db;
      if (id === "../utils/storage") return storage;
      if (id === "sequelize") return { Op: {} };
      if (id === "path") return path;
      return {};
    },
  });
  const res = {
    code: 200,
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return { preview: exports.previewRequirement, res };
}

test("returns an inline URL for a department requirement PDF", async () => {
  const submission = {
    file_name: "faculty-report.pdf",
    file_path: "requirements/faculty-report.pdf",
  };
  const { preview, res } = setup(submission, {
    getUrl: async () => "https://files.example/faculty-report.pdf",
  });

  await preview(
    { user: { user_id: 1 }, params: { submission_id: "5" } },
    res,
  );

  assert.equal(res.code, 200);
  assert.equal(res.body.kind, "pdf");
  assert.equal(res.body.url, "https://files.example/faculty-report.pdf");
});

test("returns an inline URL for formatted requirement DOCX rendering", async () => {
  const submission = {
    file_name: "faculty-report.docx",
    file_path: "requirements/faculty-report.docx",
  };
  const { preview, res } = setup(submission, {
    getUrl: async () => "https://files.example/faculty-report.docx",
  });

  await preview(
    { user: { user_id: 1 }, params: { submission_id: "6" } },
    res,
  );

  assert.equal(res.code, 200);
  assert.equal(res.body.kind, "docx");
  assert.equal(res.body.url, "https://files.example/faculty-report.docx");
});

test("does not expose a requirement outside the dean department", async () => {
  const { preview, res } = setup(null, {});

  await preview(
    { user: { user_id: 1 }, params: { submission_id: "99" } },
    res,
  );

  assert.equal(res.code, 404);
  assert.match(res.body.message, /not found/i);
});
