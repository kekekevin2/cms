const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../controllers/dean-organization.controller'), 'utf8');

function setup({ duplicate = false, adviser = true, owned = true } = {}) {
  const writes = [];
  const transaction = {};
  const record = { user_id: 8, update: async (data, options) => writes.push(['organization', data, options]) };
  const db = {
    Dean: { findOne: async () => ({ department: 'Computing' }) },
    Organization: { findOne: async () => owned ? record : null },
    User: { findOne: async () => duplicate ? {} : null, update: async (data, options) => writes.push(['user', data, options]) },
    Faculty: { findOne: async () => adviser ? {} : null },
    OrganizationAdviser: {
      findOne: async () => ({ faculty_id: 2 }),
      update: async (data, options) => writes.push(['deactivate', data, options]),
      create: async (data, options) => writes.push(['adviser', data, options]),
    },
    sequelize: { transaction: async (callback) => callback(transaction) },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, console, require: (id) => {
    if (id === '../models') return db;
    if (id === 'sequelize') return { Op: { ne: Symbol('ne') } };
    return {};
  } });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  return { update: exports.updateOrganization, res, writes, transaction };
}
const request = () => ({ user: { user_id: 1 }, params: { id: 3 }, body: { organization_name: ' ACETS ', description: 'Updated', email: ' org@example.com ', adviser_id_1: 9 } });

test('updates organization, login email, and adviser in one transaction', async () => {
  const { update, res, writes, transaction } = setup();
  await update(request(), res);
  assert.equal(res.code, 200);
  assert.deepEqual(writes.map(w => w[0]), ['organization', 'user', 'deactivate', 'adviser']);
  assert.equal(writes[0][1].organization_name, 'ACETS');
  assert.equal(writes[1][1].email, 'org@example.com');
  assert.equal(writes[3][1].faculty_id, 9);
  assert.ok(writes.every(w => w[2].transaction === transaction));
  assert.equal(Object.hasOwn(writes[1][1], 'password'), false);
});
for (const [name, options, status] of [
  ['duplicate email', { duplicate: true }, 409],
  ['adviser outside department', { adviser: false }, 400],
  ['organization outside department', { owned: false }, 404],
]) {
  test(`rejects ${name} without writing`, async () => {
    const { update, res, writes } = setup(options);
    await update(request(), res);
    assert.equal(res.code, status);
    assert.equal(writes.length, 0);
  });
}

test('organization list exposes the assigned faculty as adviser', async () => {
  const adviser = {
    faculty_id: 9,
    first_name: 'Leoven',
    middle_name: null,
    last_name: 'Garcia',
  };
  const db = {
    Dean: { findOne: async () => ({ department: 'Computing' }) },
    Organization: {
      findAndCountAll: async () => ({
        count: 1,
        rows: [{
          toJSON: () => ({
            organization_id: 3,
            organization_name: 'ACETS',
            user: { email: 'acets@example.com' },
            organization_advisers: [{ adviser_id: 4, faculty_id: 9, Faculty: adviser }],
          }),
        }],
      }),
    },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, console, require: (id) => {
    if (id === '../models') return db;
    if (id === 'sequelize') return { Op: { like: Symbol('like') } };
    return {};
  } });
  const res = { json(body) { this.body = body; return this; }, status() { return this; } };

  await exports.getOrganizations({ user: { user_id: 1 }, query: {} }, res);

  const organization = res.body.organizations[0];
  assert.equal(organization.email, 'acets@example.com');
  assert.equal(organization.organization_advisers[0].adviser.first_name, 'Leoven');
  assert.equal(organization.organization_advisers[0].adviser.last_name, 'Garcia');
  assert.equal('Faculty' in organization.organization_advisers[0], false);
});
