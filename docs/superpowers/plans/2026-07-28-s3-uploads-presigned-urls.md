# S3 Uploads + Presigned-URL Viewing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all production file uploads to S3 and make every view/download go through a short-lived presigned URL, while local development keeps writing to disk.

**Architecture:** One storage adapter module (`backend/utils/storage.js`) picks a disk or S3 backend from `STORAGE_DRIVER`. Every DB column that holds a file location stops storing a filesystem or web path and stores a driver-neutral **key** (`requirements/report-173…-482.pdf`). Uploads keep going through the backend — multer switches from `diskStorage` to `memoryStorage` and controllers hand the buffer to the adapter. Reads split three ways: download endpoints return `{ url }` instead of `res.download()`, image fields are presigned inline in list/detail responses so `<img src>` keeps working, and the public `/uploads` static mount is disabled under the S3 driver.

**Tech Stack:** Node 20+/Express 5, Sequelize 6 (MySQL), multer 2, `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (new), Angular 20 client.

**Spec:** `docs/superpowers/specs/2026-07-28-s3-uploads-presigned-urls-design.md`

## Global Constraints

- Storage keys are **driver-neutral**: no leading `/`, no `uploads/` prefix, no drive letter, no backslashes. Format is `<folder>/<name>-<timestamp>-<random><ext>`.
- `STORAGE_DRIVER` is `disk` (default) or `s3`. Never default to `s3`.
- Presigned URL TTL comes from `S3_PRESIGN_TTL`, default `900` seconds.
- New env vars: `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_PRESIGN_TTL`.
- **All multer size limits above 25 MB drop to 25 MB** (`memoryStorage` buffers whole files in RAM).
- **Create order is: upload to storage first, then write the DB row.** **Replace order is: upload new → update row → delete old.** Never write a row before the object exists.
- Every `fs.unlink` on a stored file location becomes `storage.remove(key)`.
- This repo has no test runner (`npm test` is a stub). "Tests" in this plan means runnable `node` scripts in `backend/`, matching the existing `test-*.js` convention. Do not add jest/mocha/vitest.
- Backend uses tabs in most controllers and 2-space indent in route files; match the file you are editing.
- Run all `npm` commands from inside `backend/` or `client/` — there is no root package.json.

---

## File Structure

**Created:**
- `backend/utils/storage.js` — the adapter. Driver selection, `put`, `getUrl`, `remove`. Single responsibility: turn buffers into keys and keys into URLs.
- `backend/utils/presign.js` — `presignFields(rows, fieldNames)` helper for inline image presigning. Kept separate from `storage.js` because it's a Sequelize-row concern, not a storage concern.
- `backend/test-storage.js` — manual verification script for the adapter.
- `backend/scripts/migrate-uploads-to-s3.js` — one-time idempotent backfill.

**Modified (backend):**
- `backend/utils/upload.js` — replaced by a `makeUpload({ folder, allowedTypes, maxSize })` factory.
- `backend/index.js` — make the `/uploads` static mount conditional.
- 9 route files carrying inline multer configs.
- 10 controllers for upload/delete/download rewrites.
- `backend/models/organization-event.model.js` — declare the four undeclared file columns.

**Modified (client):**
- ~10 service/component files that currently do `responseType: 'blob'`.
- `client/src/app/features/organization/members/organization-members.ts` — drop `serverUrl` concatenation.

---

## Task 1: Storage adapter

**Files:**
- Create: `backend/utils/storage.js`
- Create: `backend/test-storage.js`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `module.exports = { put, getUrl, remove, buildKey, driver }` from `backend/utils/storage.js`:
  - `put(buffer: Buffer, opts: { folder: string, originalname: string, mimetype?: string }) → Promise<string>` — returns the key.
  - `getUrl(key: string, opts?: { download?: boolean, filename?: string }) → Promise<string>`
  - `remove(key: string) → Promise<void>` — resolves even if the object is already gone.
  - `buildKey(folder: string, originalname: string) → string`
  - `driver: 'disk' | 's3'`

- [ ] **Step 1: Install the AWS SDK**

```bash
cd backend
npm install @aws-sdk/client-s3@^3 @aws-sdk/s3-request-presigner@^3
```

- [ ] **Step 2: Write the adapter**

Create `backend/utils/storage.js`:

```js
const path = require("node:path");
const fs = require("node:fs/promises");
require("dotenv").config();

const DRIVER = process.env.STORAGE_DRIVER === "s3" ? "s3" : "disk";
const PRESIGN_TTL = parseInt(process.env.S3_PRESIGN_TTL, 10) || 900;
const DISK_ROOT = path.join(__dirname, "..", "uploads");

/**
 * Builds a driver-neutral storage key: "<folder>/<base>-<ts>-<rand><ext>".
 * No leading slash, no "uploads/" prefix, forward slashes only.
 */
function buildKey(folder, originalname) {
	const ext = path.extname(originalname || "");
	const base = path
		.basename(originalname || "file", ext)
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.slice(0, 60);
	const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
	return `${folder}/${base}-${unique}${ext}`;
}

/** Rejects keys that would escape the storage root. */
function assertSafeKey(key) {
	if (typeof key !== "string" || key.length === 0) {
		throw new Error("Storage key must be a non-empty string");
	}
	if (key.startsWith("/") || key.includes("..") || key.includes("\\") || /^[a-zA-Z]:/.test(key)) {
		throw new Error(`Unsafe storage key: ${key}`);
	}
}

// ---------------------------------------------------------------- disk driver

const diskDriver = {
	async put(buffer, { folder, originalname }) {
		const key = buildKey(folder, originalname);
		const dest = path.join(DISK_ROOT, key);
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.writeFile(dest, buffer);
		return key;
	},

	async getUrl(key) {
		assertSafeKey(key);
		return `/uploads/${key}`;
	},

	async remove(key) {
		assertSafeKey(key);
		await fs.unlink(path.join(DISK_ROOT, key)).catch(() => {});
	},
};

// ------------------------------------------------------------------ s3 driver

function makeS3Driver() {
	const {
		S3Client,
		PutObjectCommand,
		GetObjectCommand,
		DeleteObjectCommand,
	} = require("@aws-sdk/client-s3");
	const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

	const Bucket = process.env.S3_BUCKET;
	if (!Bucket) {
		throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET to be set");
	}
	const client = new S3Client({ region: process.env.S3_REGION });

	return {
		async put(buffer, { folder, originalname, mimetype }) {
			const key = buildKey(folder, originalname);
			await client.send(
				new PutObjectCommand({
					Bucket,
					Key: key,
					Body: buffer,
					ContentType: mimetype || "application/octet-stream",
				}),
			);
			return key;
		},

		async getUrl(key, { download = false, filename } = {}) {
			assertSafeKey(key);
			const command = new GetObjectCommand({
				Bucket,
				Key: key,
				...(download && {
					ResponseContentDisposition: `attachment; filename="${(filename || path.basename(key)).replace(/"/g, "")}"`,
				}),
			});
			return getSignedUrl(client, command, { expiresIn: PRESIGN_TTL });
		},

		async remove(key) {
			assertSafeKey(key);
			await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
		},
	};
}

const active = DRIVER === "s3" ? makeS3Driver() : diskDriver;

module.exports = {
	driver: DRIVER,
	buildKey,
	put: active.put,
	getUrl: active.getUrl,
	remove: active.remove,
};
```

- [ ] **Step 3: Write the verification script**

Create `backend/test-storage.js`:

```js
const storage = require("./utils/storage");

async function main() {
	console.log(`driver = ${storage.driver}`);

	const key = await storage.put(Buffer.from("hello storage"), {
		folder: "test-scratch",
		originalname: "my report.txt",
		mimetype: "text/plain",
	});
	console.log("put →", key);

	if (key.startsWith("/") || key.includes("\\") || key.includes("uploads/")) {
		throw new Error(`BAD KEY FORMAT: ${key}`);
	}
	if (!key.startsWith("test-scratch/")) {
		throw new Error(`key missing folder prefix: ${key}`);
	}

	console.log("getUrl (view)     →", await storage.getUrl(key));
	console.log("getUrl (download) →", await storage.getUrl(key, { download: true, filename: "my report.txt" }));

	await storage.remove(key);
	console.log("remove → ok");

	await storage.remove(key);
	console.log("remove again (must not throw) → ok");

	try {
		await storage.getUrl("../../etc/passwd");
		throw new Error("FAIL: traversal key was accepted");
	} catch (err) {
		if (!err.message.startsWith("Unsafe storage key")) throw err;
		console.log("traversal rejected → ok");
	}

	console.log("\nALL CHECKS PASSED");
}

main().catch((err) => {
	console.error("FAILED:", err);
	process.exit(1);
});
```

- [ ] **Step 4: Run it against the disk driver and confirm it passes**

```bash
cd backend
node test-storage.js
```

Expected: `driver = disk`, a key like `test-scratch/my_report-1738…-482910473.txt`, a `/uploads/…` URL, and `ALL CHECKS PASSED`.

- [ ] **Step 5: Run it against S3 and confirm it passes**

Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` in `backend/.env` pointing at a scratch bucket, then:

```bash
cd backend
node test-storage.js
```

Expected: `driver = s3`, an `https://<bucket>.s3.<region>.amazonaws.com/...?X-Amz-Signature=...` URL, and `ALL CHECKS PASSED`. Paste the view URL into a browser and confirm it returns `hello storage`. Reset `STORAGE_DRIVER=disk` afterwards.

- [ ] **Step 6: Commit**

```bash
git add backend/utils/storage.js backend/test-storage.js backend/package.json backend/package-lock.json
git commit -m "feat(storage): add disk/S3 storage adapter with presigned URLs"
```

---

## Task 2: Upload factory

**Files:**
- Modify: `backend/utils/upload.js` (full rewrite)

**Interfaces:**
- Consumes: nothing from Task 1 (multer only holds bytes in memory; the adapter is called by controllers).
- Produces: `module.exports = { makeUpload, MB }` from `backend/utils/upload.js`:
  - `makeUpload({ folder: string, allowedTypes: string[], maxSize: number }) → multer.Instance`
  - `MB = 1024 * 1024`
  - The returned instance uses `memoryStorage`, so handlers read `req.file.buffer` / `req.files[].buffer`.
  - `folder` is stored on the instance as `instance.folder` so controllers can read it back.

- [ ] **Step 1: Rewrite the module**

Replace the entire contents of `backend/utils/upload.js`:

```js
const multer = require("multer");

const MB = 1024 * 1024;
const MAX_ALLOWED = 25 * MB;

/**
 * Builds a multer instance that keeps files in memory. Controllers hand the
 * resulting buffer to utils/storage.js, which owns naming and placement.
 *
 * maxSize is capped at 25MB: memoryStorage buffers whole files in RAM, and
 * several routes accept up to 10 files per request.
 */
function makeUpload({ folder, allowedTypes, maxSize }) {
	if (!folder) throw new Error("makeUpload requires a folder");
	if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
		throw new Error("makeUpload requires a non-empty allowedTypes array");
	}

	const instance = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: Math.min(maxSize || MAX_ALLOWED, MAX_ALLOWED) },
		fileFilter: (req, file, cb) => {
			if (allowedTypes.includes(file.mimetype)) return cb(null, true);
			cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(", ")}`), false);
		},
	});

	instance.folder = folder;
	return instance;
}

const DOCUMENT_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"image/jpeg",
	"image/jpg",
	"image/png",
];

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const SPREADSHEET_TYPES = [
	"text/csv",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

module.exports = { makeUpload, MB, DOCUMENT_TYPES, IMAGE_TYPES, SPREADSHEET_TYPES };
```

- [ ] **Step 2: Verify the factory's contract with a throwaway check**

```bash
cd backend
node -e "
const { makeUpload, MB, IMAGE_TYPES } = require('./utils/upload');
const u = makeUpload({ folder: 'member-photos', allowedTypes: IMAGE_TYPES, maxSize: 200 * MB });
console.log('folder:', u.folder);
console.log('capped limit (bytes):', u.limits ? u.limits.fileSize : 'n/a');
try { makeUpload({ allowedTypes: IMAGE_TYPES, maxSize: MB }); console.log('FAIL: missing folder accepted'); }
catch (e) { console.log('missing folder rejected → ok'); }
"
```

Expected: `folder: member-photos`, the limit capped at `26214400` (25 MB) despite 200 MB being requested, and `missing folder rejected → ok`.

Note: `multer` does not expose `limits` on the returned instance in all versions. If `capped limit` prints `n/a`, that is fine — the cap is verified end-to-end in Task 4 instead. The `folder` and rejection checks must still pass.

- [ ] **Step 3: Commit**

```bash
git add backend/utils/upload.js
git commit -m "refactor(upload): replace disk multer config with memory-storage factory"
```

---

## Task 3: Inline presign helper

**Files:**
- Create: `backend/utils/presign.js`

**Interfaces:**
- Consumes: `getUrl` from `backend/utils/storage.js` (Task 1).
- Produces: `module.exports = { presignFields }` from `backend/utils/presign.js`:
  - `presignFields(input, fieldNames: string[]) → Promise<input>` — accepts a Sequelize instance, a plain object, an array of either, or `null`. Returns plain JSON objects with each named field replaced by a presigned URL. Fields that are null/empty are left as-is. The input is not mutated.

- [ ] **Step 1: Write the helper**

Create `backend/utils/presign.js`:

```js
const storage = require("./storage");

/**
 * Replaces stored storage keys with viewable URLs on the way out of a
 * controller, so <img src> in the client works without an extra round trip.
 *
 * Accepts a Sequelize instance, plain object, array of either, or null.
 * Returns plain objects; the input is never mutated.
 */
async function presignFields(input, fieldNames) {
	if (input == null) return input;

	if (Array.isArray(input)) {
		return Promise.all(input.map((row) => presignFields(row, fieldNames)));
	}

	const plain = typeof input.toJSON === "function" ? input.toJSON() : { ...input };

	await Promise.all(
		fieldNames.map(async (field) => {
			const key = plain[field];
			if (!key || typeof key !== "string") return;
			plain[field] = await storage.getUrl(key);
		}),
	);

	return plain;
}

module.exports = { presignFields };
```

- [ ] **Step 2: Verify it against all four input shapes**

```bash
cd backend
node -e "
const { presignFields } = require('./utils/presign');
(async () => {
  const one = await presignFields({ id: 1, photo_url: 'member-photos/a.jpg', name: 'x' }, ['photo_url']);
  console.log('object   :', one);
  const many = await presignFields([{ photo_url: 'member-photos/a.jpg' }, { photo_url: null }], ['photo_url']);
  console.log('array    :', many);
  console.log('null     :', await presignFields(null, ['photo_url']));
  const src = { photo_url: 'member-photos/a.jpg' };
  await presignFields(src, ['photo_url']);
  console.log('unmutated:', src.photo_url === 'member-photos/a.jpg' ? 'ok' : 'FAIL');
})();
"
```

Expected: the object and array entries show `/uploads/member-photos/a.jpg` (disk driver), the `null` field stays `null`, non-listed fields (`id`, `name`) survive, and `unmutated: ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/utils/presign.js
git commit -m "feat(storage): add presignFields helper for inline image URLs"
```

---

## Task 4: Requirements — upload, delete, download

**Files:**
- Modify: `backend/routes/faculty-requirement.routes.js`
- Modify: `backend/controllers/faculty-requirement.controller.js`
- Modify: `backend/controllers/dean-requirement.controller.js:498-540`

**Interfaces:**
- Consumes: `makeUpload`, `MB`, `DOCUMENT_TYPES` (Task 2); `put`, `getUrl`, `remove` (Task 1).
- Produces: the download-endpoint response contract used by every later backend task and by Task 11 on the client:
  ```json
  { "url": "https://…presigned…" }
  ```

- [ ] **Step 1: Swap the route's multer import**

In `backend/routes/faculty-requirement.routes.js`, replace:

```js
const upload = require("../utils/upload");
```

with:

```js
const { makeUpload, MB, DOCUMENT_TYPES } = require("../utils/upload");

const upload = makeUpload({
	folder: "requirements",
	allowedTypes: DOCUMENT_TYPES,
	maxSize: 25 * MB,
});
```

The two `upload.array("files", 10)` calls stay exactly as they are.

- [ ] **Step 2: Store keys instead of paths on submit**

In `backend/controllers/faculty-requirement.controller.js`, add at the top with the other requires:

```js
const storage = require("../utils/storage");
```

In `submitRequirement`, replace the 200 MB guard and the two record-creation blocks (currently lines ~151-190). Delete this block:

```js
		// Check file sizes
		const maxSize = 200 * 1024 * 1024; // 200MB
		const oversizedFiles = req.files.filter(f => f.size > maxSize);
		if (oversizedFiles.length > 0) {
			return res.status(400).json({ 
				message: `File size exceeds 200MB limit: ${oversizedFiles.map(f => f.originalname).join(', ')}` 
			});
		}
```

(multer's own `limits.fileSize` now enforces 25 MB and rejects before the handler runs.)

Then replace `file_path: firstFile.path` and the `fileRecords` map with an upload-first sequence:

```js
		// Upload every file to storage BEFORE writing any DB row, so a storage
		// failure can never leave a row pointing at a nonexistent object.
		const uploaded = [];
		try {
			for (const file of req.files) {
				const key = await storage.put(file.buffer, {
					folder: "requirements",
					originalname: file.originalname,
					mimetype: file.mimetype,
				});
				uploaded.push({ key, name: file.originalname, size: file.size });
			}
		} catch (uploadError) {
			await Promise.all(uploaded.map((u) => storage.remove(u.key).catch(() => {})));
			console.error("Requirement upload error:", uploadError);
			return res.status(500).json({ message: "Error uploading files" });
		}

		const first = uploaded[0];
		const newSubmission = await db.RequirementSubmission.create({
			faculty_id: faculty.faculty_id,
			academic_year_id,
			semester,
			requirement_name,
			file_path: first.key,
			file_name: first.name,
			file_size: first.size,
		});

		const fileRecords = uploaded.map((u) => ({
			submission_id: newSubmission.submission_id,
			file_path: u.key,
			file_name: u.name,
			file_size: u.size,
		}));
```

- [ ] **Step 3: Apply the same upload-first change to `addFiles`**

In `addFiles` (around line ~271), replace the `fileRecords` map that reads `file.path`:

```js
		const uploaded = [];
		try {
			for (const file of req.files) {
				const key = await storage.put(file.buffer, {
					folder: "requirements",
					originalname: file.originalname,
					mimetype: file.mimetype,
				});
				uploaded.push({ key, name: file.originalname, size: file.size });
			}
		} catch (uploadError) {
			await Promise.all(uploaded.map((u) => storage.remove(u.key).catch(() => {})));
			console.error("Requirement add-files upload error:", uploadError);
			return res.status(500).json({ message: "Error uploading files" });
		}

		const fileRecords = uploaded.map((u) => ({
			submission_id: submission.submission_id,
			file_path: u.key,
			file_name: u.name,
			file_size: u.size,
		}));
```

- [ ] **Step 4: Route deletes through the adapter**

In the same controller there are three `fs.unlink` calls on stored locations (around lines 360, 419, 429). Replace each:

```js
			await fs.unlink(file.file_path);
```

becomes:

```js
			await storage.remove(file.file_path);
```

and:

```js
			if (submission.file_path) {
				await fs.unlink(submission.file_path);
```

becomes:

```js
			if (submission.file_path) {
				await storage.remove(submission.file_path);
```

- [ ] **Step 5: Convert the two download handlers**

In `downloadRequirement`, replace the existence check and send (lines ~472-480):

```js
		// Check if file exists
		try {
			await fs.access(submission.file_path);
		} catch (err) {
			return res.status(404).json({ message: "File not found" });
		}

		// Send file
		res.download(submission.file_path, submission.file_name);
```

with:

```js
		const url = await storage.getUrl(submission.file_path, {
			download: true,
			filename: submission.file_name,
		});
		res.json({ url });
```

In `downloadFile`, replace the equivalent block (lines ~521-527):

```js
		// Check file exists on disk
		try {
			await fs.access(file.file_path);
		} catch (err) {
			return res.status(404).json({ message: "File not found on disk" });
		}

		res.download(file.file_path, file.file_name);
```

with:

```js
		const url = await storage.getUrl(file.file_path, {
			download: true,
			filename: file.file_name,
		});
		res.json({ url });
```

- [ ] **Step 6: Convert the dean-side download**

In `backend/controllers/dean-requirement.controller.js`, add `const storage = require("../utils/storage");` to the requires, then in `downloadRequirement` (line ~537) replace:

```js
    res.download(submission.file_path, submission.file_name);
```

with:

```js
    const url = await storage.getUrl(submission.file_path, {
      download: true,
      filename: submission.file_name,
    });
    res.json({ url });
```

- [ ] **Step 7: Verify end to end against the disk driver**

Start the backend (`cd backend && npm run dev`) with `STORAGE_DRIVER=disk`, then from the faculty portal submit a requirement with two files. Confirm:

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const rows = await db.RequirementFile.findAll({ limit: 5, order: [['file_id','DESC']] });
  rows.forEach(r => console.log(r.file_id, r.file_path));
  await db.sequelize.close();
})();
"
```

Expected: `file_path` values look like `requirements/report-1738…-482910473.pdf` — no leading slash, no `uploads/`, no absolute path. Then confirm the files exist under `backend/uploads/requirements/`, and that clicking download in the UI now returns JSON (the client is not converted until Task 11, so the browser download will be broken at this point — that is expected).

- [ ] **Step 8: Verify the 25 MB cap actually rejects**

Attempt to submit a file larger than 25 MB from the faculty portal. Expected: multer rejects with a `LIMIT_FILE_SIZE` error surfaced by the existing handler at `faculty-requirement.controller.js:220`, and no row is created.

- [ ] **Step 9: Commit**

```bash
git add backend/routes/faculty-requirement.routes.js backend/controllers/faculty-requirement.controller.js backend/controllers/dean-requirement.controller.js
git commit -m "feat(requirements): store storage keys and return presigned download URLs"
```

---

## Task 5: Faculty credentials

**Files:**
- Modify: `backend/routes/faculty-credentials.routes.js:8-32`
- Modify: `backend/controllers/faculty-credentials.controller.js`
- Modify: `backend/controllers/dean-faculty-credentials.controller.js:143-263`

**Interfaces:**
- Consumes: `makeUpload`, `MB`, `DOCUMENT_TYPES` (Task 2); `put`, `getUrl`, `remove` (Task 1).
- Produces: nothing new — uses the `{ url }` contract from Task 4.

- [ ] **Step 1: Replace the inline multer config**

In `backend/routes/faculty-credentials.routes.js`, replace lines 8-16:

```js
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: {
		fileSize: 200 * 1024 * 1024, // 200MB limit
	},
});
```

with:

```js
const { makeUpload, MB, DOCUMENT_TYPES } = require("../utils/upload");

const upload = makeUpload({
	folder: "credentials",
	allowedTypes: DOCUMENT_TYPES,
	maxSize: 25 * MB,
});
```

Delete the now-unused `const multer = require("multer");` at line 3. The `uploadFields` block below stays unchanged.

- [ ] **Step 2: Replace manual disk writes with adapter calls**

`backend/controllers/faculty-credentials.controller.js` currently builds its own `uploads/credentials` directory and writes buffers by hand (lines ~47-97). Add `const storage = require("../utils/storage");` to the requires, then delete these two lines:

```js
		const uploadDir = path.join(__dirname, "../uploads/credentials");
		await fs.mkdir(uploadDir, { recursive: true });
```

and replace each of the three `fs.writeFile` blocks. The TOR block becomes:

```js
		if (torFile) {
			torPath = await storage.put(torFile.buffer, {
				folder: "credentials",
				originalname: torFile.originalname,
				mimetype: torFile.mimetype,
			});
		}
```

Apply the identical shape for `pdsFile` → `pdsPath` and `diplomaFile` → `diplomaPath`.

- [ ] **Step 3: Route the old-file cleanup through the adapter**

Replace the three `fs.unlink` calls at lines ~119-125:

```js
			if (torFile && credential.tor_file_path) {
				await fs.unlink(credential.tor_file_path).catch(() => {});
			}
```

becomes:

```js
			if (torFile && credential.tor_file_path) {
				await storage.remove(credential.tor_file_path).catch(() => {});
			}
```

Apply the same for `pds_file_path` and `diploma_file_path`. Do the same for the certificate cleanup at line ~160 (`existingCert.file_path`) and replace the certificate `fs.writeFile` at line ~168 with a `storage.put(certFile.buffer, { folder: "credentials", originalname: certFile.originalname, mimetype: certFile.mimetype })` assigned to `certPath`.

- [ ] **Step 4: Convert the two faculty download handlers**

In `downloadFile` (line ~304), replace `res.download(filePath);` with:

```js
		const url = await storage.getUrl(filePath, {
			download: true,
			filename: `${fileType}${require("node:path").extname(filePath)}`,
		});
		res.json({ url });
```

In `downloadCertificate`, replace its `res.download(...)` with the same shape, using the certificate's stored key and its original filename column.

- [ ] **Step 5: Convert the two dean-side download handlers**

In `backend/controllers/dean-faculty-credentials.controller.js`, add `const storage = require("../utils/storage");`, then replace line ~201:

```js
    res.download(filePath);
```

with:

```js
    const url = await storage.getUrl(filePath, { download: true });
    res.json({ url });
```

and line ~259:

```js
    res.download(certificate.file_path);
```

with:

```js
    const url = await storage.getUrl(certificate.file_path, { download: true });
    res.json({ url });
```

- [ ] **Step 6: Verify**

From the faculty portal, upload a TOR, a PDS, a diploma, and one certificate. Then:

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const c = await db.FacultyCredential.findOne({ order: [['createdAt','DESC']] });
  console.log({ tor: c.tor_file_path, pds: c.pds_file_path, diploma: c.diploma_file_path });
  await db.sequelize.close();
})();
"
```

Expected: all three are `credentials/…` keys. Re-upload a replacement TOR and confirm the old file is gone from `backend/uploads/credentials/` while the new one exists.

- [ ] **Step 7: Commit**

```bash
git add backend/routes/faculty-credentials.routes.js backend/controllers/faculty-credentials.controller.js backend/controllers/dean-faculty-credentials.controller.js
git commit -m "feat(credentials): move faculty credential files to storage adapter"
```

---

## Task 6: Faculty and dean profiles

**Files:**
- Modify: `backend/routes/faculty-profile.routes.js:14-64`
- Modify: `backend/routes/dean-profile.routes.js:14-63`
- Modify: `backend/controllers/faculty-profile.controller.js`
- Modify: `backend/controllers/dean-profile.controller.js`

**Interfaces:**
- Consumes: `makeUpload`, `MB` (Task 2); `put`, `remove` (Task 1); `presignFields` (Task 3).
- Produces: nothing new.

These two route files are near-identical; apply every change to both.

- [ ] **Step 1: Replace the path-sniffing multer config**

Both files pick a destination by inspecting `req.path`. That logic disappears — the folder now comes from the route. Replace lines 14-64 of `faculty-profile.routes.js` (and 14-63 of `dean-profile.routes.js`) with:

```js
const { makeUpload, MB } = require("../utils/upload");

const PROFILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const uploadFor = (folder) =>
  makeUpload({ folder, allowedTypes: PROFILE_TYPES, maxSize: 5 * MB });

const uploadPersonal = uploadFor("profile-pictures");
const uploadAwards = uploadFor("awards");
const uploadSeminars = uploadFor("seminars");
const uploadResearch = uploadFor("research");
const uploadExtension = uploadFor("extension");
```

Delete the now-unused `multer`, `path`, and `fs` requires if nothing else in the file uses them.

- [ ] **Step 2: Point each route at its own instance**

Replace `upload.fields([...])` on the two `/personal` routes with `uploadPersonal.fields([...])` (the field list is unchanged). Replace `upload.single("certificate_file")` with `uploadAwards.single("certificate_file")` on the two `/awards` routes, `uploadSeminars.single("certificate_file")` on the two `/seminars` routes, `uploadResearch.single("certificate_file")` on the two `/research` routes, and `upload.single("documentation_file")` with `uploadExtension.single("documentation_file")` on the two `/extension` routes.

- [ ] **Step 3: Store keys in the controllers**

In both controllers, add `const storage = require("../utils/storage");` and `const { presignFields } = require("../utils/presign");`.

In `upsertPersonalProfile`, wherever a path is currently derived from `req.files.profile_picture[0]` or `req.files.passport_photo[0]`, replace it with:

```js
		if (req.files?.profile_picture?.[0]) {
			const f = req.files.profile_picture[0];
			if (existing?.profile_picture) await storage.remove(existing.profile_picture).catch(() => {});
			data.profile_picture = await storage.put(f.buffer, {
				folder: "profile-pictures",
				originalname: f.originalname,
				mimetype: f.mimetype,
			});
		}
		if (req.files?.passport_photo?.[0]) {
			const f = req.files.passport_photo[0];
			if (existing?.passport_photo) await storage.remove(existing.passport_photo).catch(() => {});
			data.passport_photo = await storage.put(f.buffer, {
				folder: "profile-pictures",
				originalname: f.originalname,
				mimetype: f.mimetype,
			});
		}
```

Adapt the variable names (`data`, `existing`) to whatever the surrounding function already uses.

For the awards / seminars / research create+update handlers, replace the `req.file.path` assignment with:

```js
		if (req.file) {
			data.certificate_file = await storage.put(req.file.buffer, {
				folder: "awards", // "seminars" / "research" in the respective handlers
				originalname: req.file.originalname,
				mimetype: req.file.mimetype,
			});
		}
```

and for extension handlers the same with `documentation_file` and folder `"extension"`. In each **update** handler, call `storage.remove(<old key>)` before assigning the new one.

- [ ] **Step 4: Presign on the way out**

In `getPersonalProfile` (both controllers), wrap the response:

```js
		const profile = await presignFields(record, ["profile_picture", "passport_photo"]);
		res.json({ profile });
```

matching the existing response key name. In `getAwards` / `getSeminarsTrainings` / `getResearchActivities`, wrap the array with `presignFields(rows, ["certificate_file"])`; in `getExtensionActivities` use `["documentation_file"]`. In `getCompleteProfile`, apply all of these to their respective sub-arrays.

- [ ] **Step 5: Verify**

From the faculty portal, upload a profile picture and one award certificate. Confirm the DB holds `profile-pictures/…` and `awards/…` keys, and that the profile page still renders the image (the API now returns `/uploads/profile-pictures/…` under the disk driver, which the existing `<img>` binding consumes directly). Repeat from the dean portal.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/faculty-profile.routes.js backend/routes/dean-profile.routes.js backend/controllers/faculty-profile.controller.js backend/controllers/dean-profile.controller.js
git commit -m "feat(profiles): move faculty/dean profile uploads to storage adapter"
```

---

## Task 7: PDS photo and signature

**Files:**
- Modify: `backend/controllers/pds.controller.js:1-40, 477, 530`
- Modify: `backend/controllers/dean-pds.controller.js:15-40, 475, 519`

**Interfaces:**
- Consumes: `makeUpload`, `MB`, `IMAGE_TYPES` (Task 2); `put`, `remove` (Task 1); `presignFields` (Task 3).
- Produces: nothing new.

Both controllers hold their multer config inline and export the middleware alongside the handler. Apply every change to both.

- [ ] **Step 1: Replace the inline multer config**

In `backend/controllers/pds.controller.js`, delete lines 6-39 (the `storage` and `upload` definitions) and replace with:

```js
const { makeUpload, MB, IMAGE_TYPES } = require("../utils/upload");
const storage = require("../utils/storage");
const { presignFields } = require("../utils/presign");

const upload = makeUpload({
  folder: "pds",
  allowedTypes: IMAGE_TYPES,
  maxSize: 5 * MB,
});
```

Note the local variable `storage` previously held the multer disk-storage engine; it now holds the adapter. Confirm no other reference to the old meaning survives in the file. Apply the same edit to `dean-pds.controller.js` (lines 19-38).

- [ ] **Step 2: Store keys in the photo and signature handlers**

`uploadPhoto` is exported as an array — `[upload.single("photo"), handler]`. Inside the handler, replace the assignment that derives a path from `req.file` with:

```js
    if (existing?.photo_path) await storage.remove(existing.photo_path).catch(() => {});
    const key = await storage.put(req.file.buffer, {
      folder: "pds",
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    await pds.update({ photo_path: key });
    res.json({ message: "Photo uploaded", photo_path: await storage.getUrl(key) });
```

Apply the same shape in `uploadSignature` against `signature_path`. Adapt `existing` / `pds` to the variable names already in the handler.

- [ ] **Step 3: Presign on read**

In `getPDS` (both controllers) and `getFacultyPDS` (dean only), wrap the record:

```js
    const pds = await presignFields(record, ["photo_path", "signature_path"]);
```

before sending it, keeping the existing response key.

- [ ] **Step 4: Verify**

Open the PDS form in the faculty portal, upload a photo and a signature, reload the page, and confirm both still render. Check the DB:

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const p = await db.PersonalDataSheet.findOne({ order: [['updatedAt','DESC']] });
  console.log({ photo: p.photo_path, signature: p.signature_path });
  await db.sequelize.close();
})();
"
```

Expected: both are `pds/…` keys. Repeat from the dean portal.

- [ ] **Step 5: Commit**

```bash
git add backend/controllers/pds.controller.js backend/controllers/dean-pds.controller.js
git commit -m "feat(pds): move PDS photo and signature to storage adapter"
```

---

## Task 8: Organization documents, CVL attachments, bulk upload

**Files:**
- Modify: `backend/routes/organization.routes.js:12-120`
- Modify: `backend/controllers/organization-document.controller.js`
- Modify: `backend/controllers/cvl-attachment.controller.js`
- Modify: `backend/controllers/organization-member.controller.js` (bulk upload only)

**Interfaces:**
- Consumes: `makeUpload`, `MB`, `DOCUMENT_TYPES`, `SPREADSHEET_TYPES` (Task 2); `put`, `getUrl`, `remove` (Task 1).
- Produces: the CVL multi-file response contract consumed by Task 11:
  ```json
  { "files": [{ "id": 1, "filename": "a.pdf", "size": 1234, "url": "https://…" }] }
  ```
  The previous `path` field is removed — it leaked server filesystem paths to the browser.

- [ ] **Step 1: Replace the three inline multer configs**

In `backend/routes/organization.routes.js`, delete lines 12-120 (the `storage`/`upload`, `csvUpload`, and `photoStorage`/`photoUpload` blocks) and replace with:

```js
const { makeUpload, MB, DOCUMENT_TYPES, IMAGE_TYPES, SPREADSHEET_TYPES } = require("../utils/upload");

const upload = makeUpload({
  folder: "organization-documents",
  allowedTypes: DOCUMENT_TYPES,
  maxSize: 25 * MB,
});

const csvUpload = makeUpload({
  folder: "organization-population",
  allowedTypes: SPREADSHEET_TYPES,
  maxSize: 5 * MB,
});

const photoUpload = makeUpload({
  folder: "member-photos",
  allowedTypes: IMAGE_TYPES,
  maxSize: 5 * MB,
});
```

Delete the now-unused `multer`, `path`, and `fs` requires. Every `upload.single(...)`, `upload.array(...)`, `csvUpload.single(...)`, and `photoUpload.fields(...)` call site stays unchanged.

Note: the old `photoStorage` chose `member-signatures/` when `file.fieldname === 'signature'`. Task 9 restores that split at the controller level, where the fieldname is actually available.

- [ ] **Step 2: Convert organization documents**

In `backend/controllers/organization-document.controller.js`, add `const storage = require("../utils/storage");`.

In `submitDocument`, upload before the `create` call and replace `document_path: req.file.path`:

```js
		let documentKey;
		try {
			documentKey = await storage.put(req.file.buffer, {
				folder: "organization-documents",
				originalname: req.file.originalname,
				mimetype: req.file.mimetype,
			});
		} catch (uploadError) {
			console.error("Document upload error:", uploadError);
			return res.status(500).json({ message: "Error uploading document" });
		}
```

then use `document_path: documentKey` in the `create` call. In that function's `catch` block, replace the `fs.unlink(req.file.path)` cleanup with:

```js
		if (documentKey) {
			await storage.remove(documentKey).catch(() => {});
		}
```

(hoist `let documentKey;` above the `try` so the catch can see it).

In `updateDocument`, reorder to upload-new → update-row → delete-old:

```js
		if (req.file) {
			const oldKey = document.document_path;
			updateData.document_path = await storage.put(req.file.buffer, {
				folder: "organization-documents",
				originalname: req.file.originalname,
				mimetype: req.file.mimetype,
			});
			updateData.original_filename = req.file.originalname;
			updateData.file_size = req.file.size;
			updateData.mime_type = req.file.mimetype;
			updateData.submitted_date = new Date();
			updateData.status = "pending";
			updateData.reviewed_by = null;
			updateData.review_date = null;
			updateData.review_comments = null;
			document._oldStorageKey = oldKey;
		}
```

and after the `document.update(updateData)` call succeeds:

```js
		if (document._oldStorageKey) {
			await storage.remove(document._oldStorageKey).catch(() => {});
		}
```

In `deleteDocument`, replace the `fs.unlink` on `document_path` with `storage.remove(document.document_path).catch(() => {})`.

In `downloadDocument` and `deanDownloadDocument`, replace `res.download(...)` with:

```js
		const url = await storage.getUrl(document.document_path, {
			download: true,
			filename: document.original_filename,
		});
		res.json({ url });
```

- [ ] **Step 3: Convert CVL attachments**

In `backend/controllers/cvl-attachment.controller.js`, add `const storage = require("../utils/storage");`.

In `createCVLAttachment` and `updateCVLAttachment` (both use `upload.array("documents", 10)`), upload every file before creating rows, mirroring Task 4 Step 2's upload-first pattern with folder `"organization-documents"`, and store the returned key in `document_path`. In `updateCVLAttachment` and `deleteCVLAttachment` / `deleteCVLAttachmentById`, replace any `fs.unlink` with `storage.remove(key).catch(() => {})`.

In `downloadCVLAttachment` (line ~292), replace both branches:

```js
		// If single file, download directly
		if (attachments.length === 1) {
			return res.download(attachments[0].document_path, attachments[0].original_filename);
		}

		// Multiple files - return file list for frontend to handle
		const files = attachments.map(att => ({
			id: att.cvl_attachment_id,
			filename: att.original_filename,
			path: att.document_path,
			size: att.file_size,
		}));

		res.json({ files });
```

with:

```js
		const files = await Promise.all(
			attachments.map(async (att) => ({
				id: att.cvl_attachment_id,
				filename: att.original_filename,
				size: att.file_size,
				url: await storage.getUrl(att.document_path, {
					download: true,
					filename: att.original_filename,
				}),
			})),
		);

		res.json({ files });
```

Both branches now return the same shape, which removes the single-vs-multiple special case entirely.

In `downloadCVLFile` (line ~362), replace `res.download(attachment.document_path, attachment.original_filename);` with:

```js
		const url = await storage.getUrl(attachment.document_path, {
			download: true,
			filename: attachment.original_filename,
		});
		res.json({ url });
```

- [ ] **Step 4: Convert member bulk upload**

In `backend/controllers/organization-member.controller.js`, add `const storage = require("../utils/storage");`.

`bulkUploadMembers` and `updateBulkUpload` currently parse the file from disk and store `req.file.path`. Since multer now yields a buffer, parse from the buffer instead — `xlsx` accepts one directly:

```js
		const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
```

Then persist the file for later download/preview:

```js
		const fileKey = await storage.put(req.file.buffer, {
			folder: "organization-population",
			originalname: req.file.originalname,
			mimetype: req.file.mimetype,
		});
```

and store `file_path: fileKey`. In `updateBulkUpload`, remove the previous key after the row updates. In `deleteBulkUpload`, replace any `fs.unlink` with `storage.remove(...)`.

In `downloadBulkUpload`, replace `res.download(...)` with the `{ url }` shape. `previewBulkUpload` currently reads the stored file from disk to re-parse it; since `getStream` does not exist, change it to read the persisted rows already in the database rather than re-reading the file. If it has no persisted rows to read, have it return the parsed preview stored at upload time. `downloadTemplate` serves a static file from `backend/public/templates/` and is **not** an upload — leave it exactly as is.

- [ ] **Step 5: Verify**

Submit an organization document, update it with a replacement file, download it, then upload a CVL attachment with three files and download the set. Confirm:

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const d = await db.OrganizationDocument.findOne({ order: [['createdAt','DESC']] });
  console.log('document_path:', d.document_path);
  const c = await db.CVLAttachment.findAll({ limit: 3, order: [['cvl_attachment_id','DESC']] });
  c.forEach(x => console.log('cvl:', x.document_path));
  await db.sequelize.close();
})();
"
```

Expected: all values are `organization-documents/…` keys. Confirm the replaced document's old file is gone from `backend/uploads/organization-documents/`, and that the CVL multi-file response contains `url` and no longer contains `path`.

- [ ] **Step 6: Commit**

```bash
git add backend/routes/organization.routes.js backend/controllers/organization-document.controller.js backend/controllers/cvl-attachment.controller.js backend/controllers/organization-member.controller.js
git commit -m "feat(organization): move documents, CVL, and bulk uploads to storage adapter"
```

---

## Task 9: Member and adviser photos and signatures

**Files:**
- Modify: `backend/controllers/organization-member.controller.js:245-260, 370-405`
- Modify: `backend/controllers/organization-adviser.controller.js:395-410`
- Modify: `backend/routes/college-department-portal.routes.js:15-38, 118-160`

**Interfaces:**
- Consumes: `makeUpload`, `MB`, `IMAGE_TYPES` (Task 2); `put`, `remove` (Task 1); `presignFields` (Task 3).
- Produces: `photo_url` and `signature_url` fields in member/adviser list and detail responses are **absolute presigned URLs**, not `/uploads/…` fragments. Task 11 relies on this.

- [ ] **Step 1: Store keys for member photos and signatures**

In `backend/controllers/organization-member.controller.js`, `createMember` currently builds web paths:

```js
      photo_url = `/uploads/member-photos/${req.files.photo[0].filename}`;
```
```js
      signature_url = `/uploads/member-signatures/${req.files.signature[0].filename}`;
```

Replace both with adapter calls that keep the two folders separate:

```js
    if (req.files?.photo?.[0]) {
      const f = req.files.photo[0];
      photo_url = await storage.put(f.buffer, {
        folder: "member-photos",
        originalname: f.originalname,
        mimetype: f.mimetype,
      });
    }
    if (req.files?.signature?.[0]) {
      const f = req.files.signature[0];
      signature_url = await storage.put(f.buffer, {
        folder: "member-signatures",
        originalname: f.originalname,
        mimetype: f.mimetype,
      });
    }
```

- [ ] **Step 2: Do the same for `updateMember`, deleting the old objects**

`updateMember` (lines ~373-400) builds the same web paths and then resolves an old path with `path.join(__dirname, "..", member.photo_url)` before unlinking. Replace the whole block:

```js
    if (req.files?.photo?.[0]) {
      const f = req.files.photo[0];
      const oldKey = member.photo_url;
      updateData.photo_url = await storage.put(f.buffer, {
        folder: "member-photos",
        originalname: f.originalname,
        mimetype: f.mimetype,
      });
      if (oldKey) await storage.remove(oldKey).catch(() => {});
    }
    if (req.files?.signature?.[0]) {
      const f = req.files.signature[0];
      const oldKey = member.signature_url;
      updateData.signature_url = await storage.put(f.buffer, {
        folder: "member-signatures",
        originalname: f.originalname,
        mimetype: f.mimetype,
      });
      if (oldKey) await storage.remove(oldKey).catch(() => {});
    }
```

- [ ] **Step 3: Presign member reads**

In `getMembers`, `getHierarchy`, and `searchMemberHistory`, wrap the rows before responding:

```js
    const members = await presignFields(rows, ["photo_url", "signature_url"]);
```

keeping the existing response key. Add `const { presignFields } = require("../utils/presign");` to the requires.

- [ ] **Step 4: Remove the adviser string surgery**

`backend/controllers/organization-adviser.controller.js:398-405` currently does:

```js
      const photoUrl = req.files.photo[0].path.replace(/\\/g, '/').replace('uploads/', '/uploads/');
      await faculty.update({ photo_url: photoUrl });
```

Replace both the photo and signature branches with adapter calls, deleting the old object first:

```js
    if (req.files?.photo?.[0]) {
      const f = req.files.photo[0];
      const oldKey = faculty.photo_url;
      const key = await storage.put(f.buffer, {
        folder: "member-photos",
        originalname: f.originalname,
        mimetype: f.mimetype,
      });
      await faculty.update({ photo_url: key });
      if (oldKey) await storage.remove(oldKey).catch(() => {});
    }
    if (req.files?.signature?.[0]) {
      const f = req.files.signature[0];
      const oldKey = faculty.signature_url;
      const key = await storage.put(f.buffer, {
        folder: "member-signatures",
        originalname: f.originalname,
        mimetype: f.mimetype,
      });
      await faculty.update({ signature_url: key });
      if (oldKey) await storage.remove(oldKey).catch(() => {});
    }
```

Add both `storage` and `presignFields` requires, and wrap `getAdvisers` and `deanGetOrganizationAdvisers` output with `presignFields(rows, ["photo_url", "signature_url"])`.

- [ ] **Step 5: Convert the college-department profile picture**

In `backend/routes/college-department-portal.routes.js`, delete the `profilePicDir`, `profilePicStorage`, and `uploadProfilePic` blocks (lines 15-38) and replace with:

```js
const { makeUpload, MB } = require("../utils/upload");
const storage = require("../utils/storage");
const { presignFields } = require("../utils/presign");

const uploadProfilePic = makeUpload({
  folder: "profile-pictures",
  allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  maxSize: 5 * MB,
});
```

In the `POST /profile/picture` handler, replace the old-file deletion and path assignment:

```js
      const oldKey = record.profile_picture;
      const key = await storage.put(req.file.buffer, {
        folder: "profile-pictures",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      await record.update({ profile_picture: key });
      if (oldKey) await storage.remove(oldKey).catch(() => {});

      res.json({
        message: "Profile picture updated",
        profile_picture: await storage.getUrl(key),
      });
```

In `GET /profile`, wrap the response: `res.json({ record: await presignFields(record, ["profile_picture"]) });`. Delete the now-unused `multer` and `fs` requires if nothing else uses them.

- [ ] **Step 6: Verify**

Create an organization member with a photo and signature, then update the photo. Confirm:

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const m = await db.OrganizationMember.findOne({ order: [['createdAt','DESC']] });
  console.log({ photo: m.photo_url, signature: m.signature_url });
  await db.sequelize.close();
})();
"
```

Expected: `member-photos/…` and `member-signatures/…` keys. Confirm the replaced photo's old file is gone from disk. The member list will render broken images until Task 11 removes the client-side `serverUrl` concatenation — that is expected at this point.

- [ ] **Step 7: Commit**

```bash
git add backend/controllers/organization-member.controller.js backend/controllers/organization-adviser.controller.js backend/routes/college-department-portal.routes.js
git commit -m "feat(members): move member/adviser/department images to storage adapter"
```

---

## Task 10: Organization events (and declaring its undeclared columns)

**Files:**
- Modify: `backend/models/organization-event.model.js`
- Modify: `backend/routes/organization-event.routes.js:3-33`
- Modify: `backend/controllers/organization-event.controller.js:155-175, 290-310`
- Modify: `backend/controllers/dean-organization-events.controller.js:77-119`

**Interfaces:**
- Consumes: `makeUpload`, `MB` (Task 2); `put`, `getUrl`, `remove` (Task 1).
- Produces: `organization_events.file_path`, `original_filename`, `file_size`, `uploaded_at` become declared Sequelize attributes, which Task 12's backfill relies on.

`organization_events` stores four file columns that exist in the database but are **not declared on the model** — the controller reads and writes them through raw `db.sequelize.query()`. They survive `sync({ alter: true })` only because `alter` does not drop undeclared columns.

- [ ] **Step 1: Declare the four columns**

In `backend/models/organization-event.model.js`, add inside the attribute block after `description`:

```js
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      original_filename: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
```

- [ ] **Step 2: Confirm the declaration matches the live table**

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const [rows] = await db.sequelize.query('DESCRIBE organization_events');
  rows.filter(r => ['file_path','original_filename','file_size','uploaded_at'].includes(r.Field))
      .forEach(r => console.log(r.Field, '|', r.Type, '|', r.Null));
  await db.sequelize.close();
})();
"
```

Expected: all four rows print, and their types are compatible with the declarations above. If a type differs materially (e.g. `file_path` is `varchar(255)`), match the declaration to the database rather than the reverse — `sync({ alter: true })` runs on boot and would otherwise rewrite the live column.

- [ ] **Step 3: Replace the inline multer config**

In `backend/routes/organization-event.routes.js`, delete lines 9-33 (`storage` and `upload`) and replace with:

```js
const { makeUpload, MB } = require("../utils/upload");

const upload = makeUpload({
  folder: "event-files",
  allowedTypes: ["application/pdf"],
  maxSize: 10 * MB,
});
```

Delete the unused `multer` and `path` requires. The `upload.single("file")` call sites stay unchanged.

- [ ] **Step 4: Store keys in create and update**

In `backend/controllers/organization-event.controller.js`, add `const storage = require("../utils/storage");`.

In `createEvent`, replace lines ~157-160:

```js
      filePath = req.file.path;
      originalFilename = req.file.originalname;
      fileSize = req.file.size;
```

with:

```js
      filePath = await storage.put(req.file.buffer, {
        folder: "event-files",
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      originalFilename = req.file.originalname;
      fileSize = req.file.size;
```

The raw `INSERT` statement below it needs no change — it already binds `filePath` into the `file_path` column.

In `updateEvent` (lines ~297-310), apply the same replacement, and after the raw `UPDATE` succeeds, remove the previous object:

```js
    if (req.file && oldFilePath) {
      await storage.remove(oldFilePath).catch(() => {});
    }
```

capturing `const oldFilePath = event.file_path;` before the update. In `deleteEvent`, remove the stored object with `storage.remove(event.file_path).catch(() => {})` when one exists.

- [ ] **Step 5: Convert both download handlers**

In `organization-event.controller.js`'s `downloadEventFile` and in `backend/controllers/dean-organization-events.controller.js:116`, replace:

```js
    res.download(event.file_path, event.original_filename);
```

with:

```js
    const url = await storage.getUrl(event.file_path, {
      download: true,
      filename: event.original_filename,
    });
    res.json({ url });
```

Add the `storage` require to the dean controller.

- [ ] **Step 6: Verify**

Create an event with a PDF, update it with a different PDF, and confirm:

```bash
cd backend
node -e "
const db = require('./models');
(async () => {
  const [rows] = await db.sequelize.query('SELECT id, file_path, original_filename FROM organization_events ORDER BY id DESC LIMIT 3');
  console.table(rows);
  await db.sequelize.close();
})();
"
```

Expected: `file_path` values are `event-files/…` keys, and the replaced event's old file is gone from `backend/uploads/event-files/`. Also confirm the server booted without `sync({ alter: true })` altering the four newly-declared columns (watch the startup log for unexpected `ALTER TABLE organization_events`).

- [ ] **Step 7: Commit**

```bash
git add backend/models/organization-event.model.js backend/routes/organization-event.routes.js backend/controllers/organization-event.controller.js backend/controllers/dean-organization-events.controller.js
git commit -m "feat(events): move event files to storage adapter and declare file columns"
```

---

## Task 11: Client — consume `{ url }` and drop path concatenation

**Files:**
- Modify: `client/src/app/services/faculty/faculty-requirement.service.ts:158-206`
- Modify: `client/src/app/services/faculty/faculty-credentials.service.ts:54-70`
- Modify: `client/src/app/services/dean/dean-faculty-credentials.service.ts:82-115`
- Modify: `client/src/app/services/dean/dean-requirement.service.ts:149-165`
- Modify: `client/src/app/services/dean/dean-organization-events.service.ts:41-70`
- Modify: `client/src/app/features/organization/documents/organization-documents.ts:413`
- Modify: `client/src/app/features/dean/organization-documents/dean-organization-documents.ts:147`
- Modify: `client/src/app/features/organization/members/organization-members.ts:1152, 1418, 1466`
- Modify: `client/src/app/features/dashboards/organization/organization.ts:514, 538`

**Interfaces:**
- Consumes: `{ url }` from Tasks 4-10, and `{ files: [{ id, filename, size, url }] }` from Task 8.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add a shared download helper**

Create the helper inside `client/src/app/shared/utils/download.util.ts`:

```ts
/**
 * Triggers a browser download from a presigned URL.
 *
 * The URL is self-authenticating and points at S3 (or /uploads in dev), so this
 * is a plain navigation — no HttpClient, no Authorization header, no blob.
 */
export function downloadFromUrl(url: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
```

- [ ] **Step 2: Convert `faculty-requirement.service.ts`**

Replace `downloadSingleFile` (lines 158-172) and `downloadRequirement` (lines 185-206) with:

```ts
  downloadSingleFile(submission_id: number, file_id: number, fileName: string): void {
    this.http
      .get<{ url: string }>(`${this.apiUrl}/${submission_id}/files/${file_id}/download`)
      .subscribe({
        next: ({ url }) => downloadFromUrl(url, fileName),
        error: (err) => console.error('Download failed', err),
      });
  }

  downloadRequirement(submission_id: number, fileName?: string): void {
    this.http.get<{ url: string }>(`${this.apiUrl}/${submission_id}/download`).subscribe({
      next: ({ url }) => downloadFromUrl(url, fileName),
      error: (err) => console.error('Download failed', err),
    });
  }
```

Add `import { downloadFromUrl } from '../../shared/utils/download.util';` (adjust the relative depth per file). The `Content-Disposition` header parsing disappears — the presigned URL carries the filename itself.

- [ ] **Step 3: Convert the remaining eight download sites**

Each currently follows the same `responseType: 'blob'` → `createObjectURL` → anchor → `revokeObjectURL` shape. Apply the identical transformation at each location listed in **Files** above: change the request to `this.http.get<{ url: string }>(...)` with no `responseType`, and replace the whole `next` body with `downloadFromUrl(url, <existing filename variable>)`.

For `organization-members.ts:1466` (CVL multi-file), the response is now `{ files: [{ id, filename, size, url }] }` in **both** the single- and multi-file cases, so the branch that distinguished them can go:

```ts
      next: ({ files }) => files.forEach((f) => downloadFromUrl(f.url, f.filename)),
```

- [ ] **Step 4: Drop the `serverUrl` concatenation**

In `client/src/app/features/organization/members/organization-members.ts:1418`, the photo helper currently returns:

```ts
    return `${environment.serverUrl}${photoUrl}`;
```

The field is now an absolute presigned URL, so return it unchanged:

```ts
    return photoUrl;
```

Remove the `environment` import if nothing else in the file uses it.

- [ ] **Step 5: Build and confirm no type errors**

```bash
cd client
npm run build
```

Expected: build succeeds. A failure naming `responseType` or `Blob` means a download site was missed — fix and rebuild.

- [ ] **Step 6: Verify in the browser**

With the backend on `STORAGE_DRIVER=disk`, exercise one download in each portal (faculty requirement, faculty credential, dean requirement, organization document, organization event, CVL set) and confirm each downloads with its correct original filename. Confirm member photos render again.

- [ ] **Step 7: Commit**

```bash
git add client/src/app/shared/utils/download.util.ts client/src/app/services client/src/app/features
git commit -m "feat(client): consume presigned download URLs instead of blobs"
```

---

## Task 12: Backfill script

**Files:**
- Create: `backend/scripts/migrate-uploads-to-s3.js`

**Interfaces:**
- Consumes: `put` (Task 1); the declared event columns (Task 10).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the script**

Create `backend/scripts/migrate-uploads-to-s3.js`:

```js
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
const path = require("node:path");
const fs = require("node:fs/promises");
const db = require("../models");
const storage = require("../utils/storage");

const DRY_RUN = process.argv.includes("--dry-run");
const BACKEND_ROOT = path.join(__dirname, "..");
const UPLOADS_ROOT = path.join(BACKEND_ROOT, "uploads");

// model name in db, column, key prefix
const TARGETS = [
	["RequirementSubmission", "file_path", "requirements"],
	["RequirementFile", "file_path", "requirements"],
	["FacultyCredential", "tor_file_path", "credentials"],
	["FacultyCredential", "pds_file_path", "credentials"],
	["FacultyCredential", "diploma_file_path", "credentials"],
	["CredentialCertificate", "file_path", "credentials"],
	["FacultyPersonalProfile", "profile_picture", "profile-pictures"],
	["FacultyPersonalProfile", "passport_photo", "profile-pictures"],
	["DeanPersonalProfile", "profile_picture", "profile-pictures"],
	["DeanPersonalProfile", "passport_photo", "profile-pictures"],
	["CollegeDepartment", "profile_picture", "profile-pictures"],
	["FacultyAwards", "certificate_file", "awards"],
	["DeanAwards", "certificate_file", "awards"],
	["FacultySeminarsTrainings", "certificate_file", "seminars"],
	["DeanSeminarsTrainings", "certificate_file", "seminars"],
	["FacultyResearchActivities", "certificate_file", "research"],
	["DeanResearchActivities", "certificate_file", "research"],
	["FacultyExtensionActivities", "documentation_file", "extension"],
	["DeanExtensionActivities", "documentation_file", "extension"],
	["PersonalDataSheet", "photo_path", "pds"],
	["PersonalDataSheet", "signature_path", "pds"],
	["OrganizationDocument", "document_path", "organization-documents"],
	["CVLAttachment", "document_path", "organization-documents"],
	["OrganizationBulkUpload", "file_path", "organization-population"],
	["OrganizationMember", "photo_url", "member-photos"],
	["OrganizationMember", "signature_url", "member-signatures"],
	["Faculty", "photo_url", "member-photos"],
	["Faculty", "signature_url", "member-signatures"],
	["OrganizationEvent", "file_path", "event-files"],
];

/** True if the value has already been converted to a driver-neutral key. */
function isAlreadyKey(value) {
	return (
		!value.startsWith("/") &&
		!value.includes("\\") &&
		!/^[a-zA-Z]:/.test(value) &&
		!value.startsWith("uploads/")
	);
}

/** Maps any of the three legacy formats onto an absolute path on this machine. */
function resolveLegacyPath(value) {
	const normalized = value.replace(/\\/g, "/");

	if (normalized.startsWith("/uploads/")) {
		return path.join(UPLOADS_ROOT, normalized.slice("/uploads/".length));
	}
	if (normalized.startsWith("uploads/")) {
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
		if (!value || typeof value !== "string") continue;

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

	console.log("\n---- summary ----");
	console.log(`migrated:      ${report.migrated}`);
	console.log(`would migrate: ${report.wouldMigrate}`);
	console.log(`already keys:  ${report.alreadyKey}`);
	console.log(`missing files: ${report.missing.length}`);
	report.missing.forEach((m) => console.log(`  MISSING ${m}`));
	if (report.skippedModels.length) {
		console.log(`unknown models: ${[...new Set(report.skippedModels)].join(", ")}`);
	}

	await db.sequelize.close();
}

main().catch(async (err) => {
	console.error("FAILED:", err);
	await db.sequelize.close().catch(() => {});
	process.exit(1);
});
```

- [ ] **Step 2: Confirm every model name in `TARGETS` actually exists**

All 22 names below were verified against `backend/models/index.js` when this plan was written, so this is a regression check — it should pass unmodified.

```bash
cd backend
node -e "
const db = require('./models');
const names = ['RequirementSubmission','RequirementFile','FacultyCredential','CredentialCertificate','FacultyPersonalProfile','DeanPersonalProfile','CollegeDepartment','FacultyAwards','DeanAwards','FacultySeminarsTrainings','DeanSeminarsTrainings','FacultyResearchActivities','DeanResearchActivities','FacultyExtensionActivities','DeanExtensionActivities','PersonalDataSheet','OrganizationDocument','CVLAttachment','OrganizationBulkUpload','OrganizationMember','Faculty','OrganizationEvent'];
names.forEach(n => console.log(db[n] ? 'ok   ' + n : 'MISSING ' + n));
db.sequelize.close();
"
```

Expected: every line reads `ok`. Any `MISSING` means the registered name in `backend/models/index.js` differs — correct the `TARGETS` entry to the real name before continuing. Do not proceed with a `MISSING` line.

- [ ] **Step 3: Dry-run against the disk driver**

```bash
cd backend
node scripts/migrate-uploads-to-s3.js --dry-run
```

Expected: a per-model listing, `migrated: 0`, a nonzero `would migrate` if legacy rows exist, and no crash. Note the `missing files` count.

- [ ] **Step 4: Verify idempotency**

Run the dry run a second time after a real run on a scratch database, or inspect a row already converted by Tasks 4-10. Those rows must be counted under `already keys`, never re-uploaded.

- [ ] **Step 5: Run for real against S3**

Set `STORAGE_DRIVER=s3` plus the bucket variables in `backend/.env`, then:

```bash
cd backend
node scripts/migrate-uploads-to-s3.js
```

Expected: `migrated` matches the earlier `would migrate` count, and rerunning immediately reports `migrated: 0` with everything under `already keys`.

- [ ] **Step 6: Commit**

```bash
git add backend/scripts/migrate-uploads-to-s3.js
git commit -m "feat(storage): add idempotent backfill script for legacy upload paths"
```

---

## Task 13: Close the public read path and document the switch

**Files:**
- Modify: `backend/index.js:40-41`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `driver` from `backend/utils/storage.js` (Task 1).
- Produces: nothing.

This is the task that actually delivers "viewing only via presigned URL". Until it lands, the unauthenticated static mount still serves every uploaded file.

- [ ] **Step 1: Make the static mount conditional**

In `backend/index.js`, replace lines 40-41:

```js
// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```

with:

```js
// Serve uploads from local disk only under the disk driver. Under STORAGE_DRIVER=s3
// every file is reached through a short-lived presigned URL instead, so mounting
// this would reopen an unauthenticated public read path alongside it.
const storage = require("./utils/storage");
if (storage.driver === "disk") {
	app.use("/uploads", express.static(path.join(__dirname, "uploads")));
	console.log("Serving /uploads from local disk (STORAGE_DRIVER=disk)");
} else {
	console.log(`Storage driver: ${storage.driver} — /uploads static route disabled`);
}
```

- [ ] **Step 2: Confirm the mount is gone under S3 and present under disk**

```bash
cd backend
STORAGE_DRIVER=s3 node -e "require('dotenv').config(); console.log(require('./utils/storage').driver);"
```

Then start the server with `STORAGE_DRIVER=s3` and request a known-good path:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/uploads/member-photos/anything.jpg
```

Expected: `404`. Restart with `STORAGE_DRIVER=disk` and confirm a real file under `backend/uploads/` returns `200`.

- [ ] **Step 3: Update the project documentation**

In `CLAUDE.md`, update the backend `.env` list to include `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_PRESIGN_TTL`, and add to the Backend structure section:

```markdown
File storage goes through `backend/utils/storage.js`, which selects a disk or S3
backend from `STORAGE_DRIVER`. Every path-bearing DB column stores a
driver-neutral **key** (`requirements/report-173…-482.pdf`) — never a filesystem
path or a `/uploads/…` web path. Uploads use `makeUpload()` from
`backend/utils/upload.js` (memory storage, 25 MB cap); controllers hand the
buffer to `storage.put()`. Downloads return `{ url }` holding a presigned URL
rather than streaming bytes, and image fields are presigned inline on read via
`presignFields()` in `backend/utils/presign.js`. The `/uploads` static mount is
active only under the disk driver.
```

- [ ] **Step 4: Full manual regression pass**

With `STORAGE_DRIVER=s3` against a scratch bucket, exercise upload, view, and download once in each of the ten features: faculty requirements, faculty credentials, faculty profile, dean profile, PDS, organization documents, CVL attachments, member bulk upload, member/adviser photos, organization events, and the college-department profile picture. Confirm for each that the object appears in the bucket under the expected prefix and that no request is served from `/uploads`.

- [ ] **Step 5: Commit**

```bash
git add backend/index.js CLAUDE.md
git commit -m "feat(storage): disable public /uploads mount under the S3 driver"
```

---

## Self-Review Notes

**Spec coverage.** Adapter → Task 1. Key format → Task 1 (`buildKey`, `assertSafeKey`). Dependencies and env vars → Tasks 1, 13. Upload factory and the 25 MB cap → Task 2, enforced end-to-end in Task 4 Step 8. Deletes through the adapter → Tasks 4-10. Adviser string surgery → Task 9 Step 4. Download endpoints → Tasks 4, 5, 8, 10. Inline presigning → Tasks 3, 6, 7, 9. CVL multi-file `path` leak → Task 8 Step 3. Static mount → Task 13. Backfill → Task 12. Organization-event undeclared columns → Task 10. Error ordering (upload-first, replace-order) → Tasks 4, 6, 8, 9, 10.

**Known risk carried by this plan.** Between Task 4 and Task 11 the client is broken for downloads, and between Task 9 and Task 11 member photos do not render. This is called out in the verification steps of both tasks. If that intermediate state is unacceptable, Task 11 can be split per-feature and merged into Tasks 4-10, at the cost of more client churn per commit.

**`previewBulkUpload` (Task 8 Step 4)** is the one place the plan changes behavior rather than transposing it: it currently re-reads the uploaded spreadsheet from disk, which the adapter has no equivalent for. The plan directs it to read persisted rows instead. If the implementer finds no persisted preview rows exist, `getStream` must be added to the adapter — raise this rather than guessing.
