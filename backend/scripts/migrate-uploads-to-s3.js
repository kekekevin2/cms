/**
 * One-time, idempotent backfill: moves files referenced by legacy path columns
 * into the configured storage backend and rewrites each column to a key.
 *
 * Handles all three legacy formats:
 *   absolute      C:\...\backend\uploads\requirements\a.pdf
 *   CWD-relative  uploads/organization-documents/a.pdf
 *   web path      /uploads/member-photos/a.jpg
 *
 * Usage:
 *   node scripts/migrate-uploads-to-s3.js --dry-run
 *   node scripts/migrate-uploads-to-s3.js
 */
const path = require('node:path');
const fs = require('node:fs/promises');
const db = require('../models');
const storage = require('../utils/storage');

const DRY_RUN = process.argv.includes('--dry-run');
const BACKEND_ROOT = path.join(__dirname, '..');
const UPLOADS_ROOT = path.join(BACKEND_ROOT, 'uploads');

// model name in db, column, key prefix
const TARGETS = [
  ['RequirementSubmission', 'file_path', 'requirements'],
  ['RequirementFile', 'file_path', 'requirements'],
  ['FacultyCredential', 'tor_file_path', 'credentials'],
  ['FacultyCredential', 'pds_file_path', 'credentials'],
  ['FacultyCredential', 'diploma_file_path', 'credentials'],
  ['CredentialCertificate', 'file_path', 'credentials'],
  ['FacultyPersonalProfile', 'profile_picture', 'profile-pictures'],
  ['FacultyPersonalProfile', 'passport_photo', 'profile-pictures'],
  ['DeanPersonalProfile', 'profile_picture', 'profile-pictures'],
  ['DeanPersonalProfile', 'passport_photo', 'profile-pictures'],
  ['CollegeDepartment', 'profile_picture', 'profile-pictures'],
  ['FacultyAwards', 'certificate_file', 'awards'],
  ['DeanAwards', 'certificate_file', 'awards'],
  ['FacultySeminarsTrainings', 'certificate_file', 'seminars'],
  ['DeanSeminarsTrainings', 'certificate_file', 'seminars'],
  ['FacultyResearchActivities', 'certificate_file', 'research'],
  ['DeanResearchActivities', 'certificate_file', 'research'],
  ['FacultyExtensionActivities', 'documentation_file', 'extension'],
  ['DeanExtensionActivities', 'documentation_file', 'extension'],
  ['PersonalDataSheet', 'photo_path', 'pds'],
  ['PersonalDataSheet', 'signature_path', 'pds'],
  ['OrganizationDocument', 'document_path', 'organization-documents'],
  ['CVLAttachment', 'document_path', 'organization-documents'],
  ['OrganizationBulkUpload', 'file_path', 'organization-population'],
  ['OrganizationMember', 'photo_url', 'member-photos'],
  ['OrganizationMember', 'signature_url', 'member-signatures'],
  ['Faculty', 'photo_url', 'member-photos'],
  ['Faculty', 'signature_url', 'member-signatures'],
  ['OrganizationEvent', 'file_path', 'event-files'],
];

/** True if the value has already been converted to a driver-neutral key. */
function isAlreadyKey(value) {
  return (
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !/^[a-zA-Z]:/.test(value) &&
    !value.startsWith('uploads/')
  );
}

/** Maps any of the three legacy formats onto an absolute path on this machine. */
function resolveLegacyPath(value) {
  const normalized = value.replace(/\\/g, '/');

  if (normalized.startsWith('/uploads/')) {
    return path.join(UPLOADS_ROOT, normalized.slice('/uploads/'.length));
  }
  if (normalized.startsWith('uploads/')) {
    return path.join(BACKEND_ROOT, normalized);
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.join(BACKEND_ROOT, normalized);
}

async function migrateTarget(modelName, column, folder, report) {
  const model = db[modelName];
  if (!model) {
    report.skippedModels.push(modelName);
    return;
  }

  const pk = model.primaryKeyAttribute;
  const rows = await model.findAll({ attributes: [pk, column] });

  for (const row of rows) {
    const value = row[column];
    if (!value || typeof value !== 'string') continue;

    if (isAlreadyKey(value)) {
      report.alreadyKey++;
      continue;
    }

    const abs = resolveLegacyPath(value);
    let buffer;
    try {
      buffer = await fs.readFile(abs);
    } catch {
      report.missing.push(`${modelName}#${row[pk]} ${column} → ${abs}`);
      continue;
    }

    if (DRY_RUN) {
      report.wouldMigrate++;
      console.log(`  would migrate ${modelName}#${row[pk]} ${column}: ${value}`);
      continue;
    }

    const key = await storage.put(buffer, {
      folder,
      originalname: path.basename(abs),
    });
    await model.update({ [column]: key }, { where: { [pk]: row[pk] } });
    report.migrated++;
    console.log(`  ${modelName}#${row[pk]} ${column} → ${key}`);
  }
}

async function main() {
  console.log(`driver=${storage.driver} dryRun=${DRY_RUN}\n`);

  const report = {
    migrated: 0,
    wouldMigrate: 0,
    alreadyKey: 0,
    missing: [],
    skippedModels: [],
  };

  for (const [modelName, column, folder] of TARGETS) {
    console.log(`${modelName}.${column} → ${folder}/`);
    await migrateTarget(modelName, column, folder, report);
  }

  console.log('\n---- summary ----');
  console.log(`migrated:      ${report.migrated}`);
  console.log(`would migrate: ${report.wouldMigrate}`);
  console.log(`already keys:  ${report.alreadyKey}`);
  console.log(`missing files: ${report.missing.length}`);
  report.missing.forEach((m) => console.log(`  MISSING ${m}`));
  if (report.skippedModels.length) {
    console.log(`unknown models: ${[...new Set(report.skippedModels)].join(', ')}`);
  }

  await db.sequelize.close();
}

main().catch(async (err) => {
  console.error('FAILED:', err);
  await db.sequelize.close().catch(() => {});
  process.exit(1);
});
