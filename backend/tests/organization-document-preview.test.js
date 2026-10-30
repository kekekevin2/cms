const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  require.resolve('../controllers/organization-document.controller'),
  'utf8',
);

function setup(document, storage) {
  const db = {
    Dean: { findOne: async () => ({ department: 'Computing' }) },
    Organization: {},
    OrganizationDocument: { findOne: async () => document },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    console,
    Buffer,
    require: (id) => {
      if (id === '../models') return db;
      if (id === '../utils/storage') return storage;
      if (id === 'sequelize') return { Op: {} };
      if (id === 'node:path') return path;
      return {};
    },
  });
  const res = {
    code: 200,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return { preview: exports.deanPreviewDocument, res };
}

test('returns an inline URL for formatted DOCX rendering', async () => {
  const document = {
    original_filename: 'report.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    document_path: 'reports/report.docx',
  };
  const { preview, res } = setup(document, {
    getUrl: async () => 'https://files.example/report.docx',
  });

  await preview({ user: { user_id: 1 }, params: { id: '3' } }, res);

  assert.equal(res.code, 200);
  assert.equal(res.body.kind, 'docx');
  assert.equal(res.body.url, 'https://files.example/report.docx');
});

test('returns an inline URL for PDF contents', async () => {
  const document = {
    original_filename: 'report.pdf',
    mime_type: 'application/pdf',
    document_path: 'reports/report.pdf',
  };
  const storage = { getUrl: async () => 'https://files.example/report.pdf' };
  const { preview, res } = setup(document, storage);

  await preview({ user: { user_id: 1 }, params: { id: '4' } }, res);

  assert.equal(res.code, 200);
  assert.equal(res.body.kind, 'pdf');
  assert.equal(res.body.url, 'https://files.example/report.pdf');
});

test('does not expose a document outside the dean department', async () => {
  const { preview, res } = setup(null, {});

  await preview({ user: { user_id: 1 }, params: { id: '99' } }, res);

  assert.equal(res.code, 404);
  assert.match(res.body.message, /not found/i);
});
