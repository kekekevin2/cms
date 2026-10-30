const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(
  require.resolve('../controllers/dean-organization-dashboard.controller'),
  'utf8',
);

function setup() {
  let query;
  const documents = [{ document_id: 11 }];
  const db = {
    Dean: { findOne: async () => ({ department: 'Computing' }) },
    Organization: {},
    OrganizationDocument: {
      findAll: async (options) => {
        query = options;
        return documents;
      },
    },
    DocumentType: {},
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    console,
    process,
    require: (id) => {
      if (id === '../models') return db;
      if (id === 'sequelize') return { Op: {} };
      return {};
    },
  });
  const res = {
    code: 200,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return { getRecentDocuments: exports.getRecentOrganizationDocuments, res, getQuery: () => query };
}

test('returns all department submissions when no organization is selected', async () => {
  const { getRecentDocuments, res, getQuery } = setup();
  await getRecentDocuments({ user: { user_id: 1 }, query: {} }, res);

  assert.equal(res.code, 200);
  assert.equal(res.body.recentDocuments[0].document_id, 11);
  assert.equal(getQuery().include[0].where.department, 'Computing');
  assert.equal('organization_id' in getQuery().include[0].where, false);
});

test('filters submissions by an organization in the dean department', async () => {
  const { getRecentDocuments, res, getQuery } = setup();
  await getRecentDocuments(
    { user: { user_id: 1 }, query: { organizationId: '7' } },
    res,
  );

  assert.equal(res.code, 200);
  assert.equal(getQuery().include[0].where.department, 'Computing');
  assert.equal(getQuery().include[0].where.organization_id, 7);
  assert.equal(getQuery().limit, 20);
  assert.equal(getQuery().order[0][0], 'submitted_date');
  assert.equal(getQuery().order[0][1], 'DESC');
});
