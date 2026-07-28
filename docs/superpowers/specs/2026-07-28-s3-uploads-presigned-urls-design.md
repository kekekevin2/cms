# S3 Uploads + Presigned-URL Viewing — Design

**Date:** 2026-07-28
**Status:** Approved, ready for implementation planning

## Problem

All file uploads in `backend/` are written to the local filesystem under `backend/uploads/` and served two different ways: through authenticated `res.download()` endpoints, and through an unauthenticated `express.static` mount at `/uploads`.

Production runs on Render, whose disk is ephemeral. **Every uploaded file is destroyed on each deploy**, leaving DB rows pointing at paths that no longer resolve. This affects all ten upload features (requirements, faculty credentials, faculty/dean profiles, PDS photos and signatures, organization documents, CVL attachments, member bulk uploads, member and adviser photos, organization events, college-department profile pictures).

Two secondary problems compound it:

1. **Stored values are in three incompatible formats.** `file_path`/`document_path` hold a raw `req.file.path` — absolute when the multer config used `path.join(__dirname, …)` (requirements, credentials, PDS) but CWD-relative when it used a bare string (`"uploads/organization-documents/"`, `"uploads/event-files/"`). Meanwhile `photo_url`/`signature_url`/`profile_picture` hold a web path (`/uploads/member-photos/…`). A third variant is produced by string surgery at `controllers/organization-adviser.controller.js:398` — `.path.replace(/\\/g,'/').replace('uploads/','/uploads/')`. Nothing can presign a value without first knowing which format it is.

2. **Nine independent multer configurations** duplicate storage setup, filename generation, and filters, with inconsistent limits (5 MB / 10 MB / 200 MB) and inconsistent type filters.

## Goals

- Production uploads go to an S3 bucket.
- Production viewing happens **only** through presigned URLs; no public static file route remains.
- Local development keeps working without AWS credentials.
- Files already on disk can be moved into S3 without data loss.

## Non-goals

Bucket provisioning, IAM policy, and lifecycle rules; CDN in front of S3; direct browser→S3 upload; virus scanning; introducing a test framework.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Dev storage | Local disk; S3 in production only | No AWS credentials needed for local work; offline-friendly |
| Legacy files | One-time backfill script | Clean single-format end state, no permanent dual-read branch |
| URL delivery to client | Presign inline in list/detail responses | `<img src>` cannot send the JWT the auth interceptor attaches |
| Upload path | Through the backend | Zero client changes for upload; existing validation and DB writes stay intact |

## Architecture

### Storage adapter

One new module, `backend/utils/storage.js`. Its backend is chosen once at require time from `STORAGE_DRIVER` (`disk` | `s3`, default `disk`).

```
put(buffer, { folder, originalname, mimetype }) → Promise<string>   // returns a storage key
getUrl(key, { download?, filename? })           → Promise<string>   // presigned URL, or /uploads/<key> on disk
remove(key)                                     → Promise<void>
```

No `getStream`: a codebase scan found no server-side reads of uploaded file bytes — no `createReadStream`, no `fs.readFile`, no `readFileSync` in any controller. (`pds-excel-export.controller.js:319` reads the *template* from `public/templates/`, not an uploaded file.) Adding a streaming method now would be speculative.

`put` owns filename generation — the `Date.now() + '-' + Math.round(Math.random()*1e9)` convention currently copy-pasted into all nine multer configs lives here alone.

### Key format

Every path-bearing column stops holding a filesystem path or a web path and holds a **driver-neutral key**:

```
requirements/report-1738000000000-482910473.pdf
member-photos/member-1738000000000-118472913.jpg
```

No leading slash, no `uploads/` prefix, no drive letter, no backslashes. The first segment is the folder, which preserves today's directory layout inside the bucket.

- **disk driver:** `getUrl` returns `/uploads/<key>`; the existing static mount serves it. Dev behavior is unchanged.
- **s3 driver:** `getUrl` returns a presigned GET URL for `<key>` in `S3_BUCKET`.

A single stored value therefore works under both drivers, and the three-way format inconsistency is eliminated rather than carried into S3.

### Dependencies and configuration

New dependencies: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` (the backend has no AWS SDK today).

New environment variables: `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_PRESIGN_TTL` (seconds, default `900`).

## Upload path

All nine multer configurations switch from `diskStorage` to `memoryStorage`, keeping their existing `fileFilter` behavior. Controllers then call `storage.put(file.buffer, …)` and store the returned key.

The nine configs collapse into one shared factory in `backend/utils/upload.js`:

```js
makeUpload({ folder, allowedTypes, maxSize })  // → configured multer instance
```

Route files declare only what differs, e.g. `makeUpload({ folder: 'event-files', allowedTypes: ['application/pdf'], maxSize: 10 * MB })`.

### Size limits

Under `memoryStorage` an upload is a Node buffer rather than a disk stream. The current 200 MB limits on requirements, faculty credentials, organization documents, and CVL attachments — several of which accept up to 10 files per request — imply a ~2 GB worst case per request. **All limits above 25 MB drop to 25 MB.** (`routes/faculty-credentials.routes.js` already uses `memoryStorage` at 200 MB today, so this risk exists in production now.)

### Deletes

Every `fs.unlink` on a stored path becomes `storage.remove(key)` — approximately twelve call sites across `faculty-credentials`, `faculty-requirement`, `organization-document`, `organization-member`, and `college-department-portal`. Missing one orphans an S3 object permanently.

### Adviser path mangling

`controllers/organization-adviser.controller.js:398-405` stops rewriting `.path` and stores the key like every other site.

## Read path

### (a) Download endpoints

Approximately ten endpoints currently end in `res.download(path, filename)`: faculty requirements (file and submission), dean requirements, faculty credentials (file and certificate), dean faculty credentials (file and certificate), organization documents, dean organization documents, organization events, dean organization events, CVL attachments (type and file), and member bulk upload. Each becomes:

```js
res.json({ url: await storage.getUrl(key, { download: true, filename: original_filename }) })
```

The presigned URL carries `ResponseContentDisposition: attachment; filename="<original>"`, because keys hold mangled names while the DB holds the real one.

Client-side, each of the ~10 call sites replaces its `responseType: 'blob'` + `createObjectURL` + revoke sequence with `a.href = url; a.click()`.

A 302 redirect was considered and rejected: XHR following a cross-origin redirect to S3 requires bucket CORS configuration and interacts with browser Authorization-header stripping, whereas a direct anchor navigation is a plain browser GET needing no bucket CORS.

### (b) Inline-presigned image fields

For fields rendered directly in `<img [src]>` — `photo_url`, `signature_url`, `profile_picture`, `passport_photo`, `photo_path`, `signature_path`, and the profile `certificate_file` / `documentation_file` fields — the controller presigns on the way out, via one helper:

```js
await presignFields(rows, ['photo_url', 'signature_url'])   // replaces key with presigned URL
```

The client's `${environment.serverUrl}${photoUrl}` concatenation at `client/src/app/features/organization/members/organization-members.ts:1418` is removed; the field is now an absolute URL.

### (c) CVL multi-file download

`cvl-attachment.controller.js:292` behaves differently depending on file count: one file gets `res.download()`, several get a JSON list. That list currently includes `path: att.document_path` — **the raw server filesystem path, sent to the browser**. Under the new scheme both branches return presigned URLs and the `path` field is dropped:

```js
res.json({ files: [{ id, filename, size, url }] })
```

The client then triggers one download per URL. (`archiver` is in `package.json` but is not imported anywhere — no zipping happens today. This design does not add any.)

### Static mount

`app.use("/uploads", express.static(...))` in `backend/index.js:41` becomes conditional on `STORAGE_DRIVER === 'disk'`. This is what delivers "viewing only via presigned URL" — leaving it mounted would preserve an unauthenticated public read path alongside the new one.

### TTL

15 minutes (`S3_PRESIGN_TTL=900`). Long enough for a click-to-download and for images on an open page; short enough that a leaked URL expires quickly. Accepted cost: a dashboard left open past 15 minutes shows broken images until the next data fetch.

## Backfill

`backend/scripts/migrate-uploads-to-s3.js` — run manually, idempotent, supports `--dry-run`.

It carries a table of the columns below. For each row it:

1. Resolves the stored value to a file on disk, handling all three legacy formats (absolute path, CWD-relative path, web path).
2. Skips if the value already looks like a key — no leading `/`, no drive letter, no `uploads/` prefix. This is what makes reruns safe.
3. Skips and logs if the file is missing, rather than aborting, printing a summary of unresolvable rows at the end. Given Render's ephemeral disk, this list will be long for production-uploaded files; the useful run is against a local `backend/uploads/` that still holds them.
4. Uploads, then rewrites the column to the key.

Row-by-row rather than in one transaction: a partial run leaves every already-migrated row correct, and idempotency makes rerunning the remedy.

### Column inventory (29 columns, 23 models)

| Model | Column(s) | Key prefix |
|---|---|---|
| `requirement-submission` | `file_path` | `requirements` |
| `requirement-file` | `file_path` | `requirements` |
| `faculty-credential` | `tor_file_path`, `pds_file_path`, `diploma_file_path` | `credentials` |
| `credential-certificate` | `file_path` | `credentials` |
| `faculty-personal-profile` | `profile_picture`, `passport_photo` | `profile-pictures` |
| `dean-personal-profile` | `profile_picture`, `passport_photo` | `profile-pictures` |
| `college-department` | `profile_picture` | `profile-pictures` |
| `faculty-awards` | `certificate_file` | `awards` |
| `dean-awards` | `certificate_file` | `awards` |
| `faculty-seminars-trainings` | `certificate_file` | `seminars` |
| `dean-seminars-trainings` | `certificate_file` | `seminars` |
| `faculty-research-activities` | `certificate_file` | `research` |
| `dean-research-activities` | `certificate_file` | `research` |
| `faculty-extension-activities` | `documentation_file` | `extension` |
| `dean-extension-activities` | `documentation_file` | `extension` |
| `personal-data-sheet` | `photo_path`, `signature_path` | `pds` |
| `organization-document` | `document_path` | `organization-documents` |
| `cvl-attachment` | `document_path` | `organization-documents` |
| `organization-bulk-upload` | `file_path` | `organization-population` |
| `organization-member` | `photo_url`, `signature_url` | `member-photos`, `member-signatures` |
| `faculty` | `photo_url`, `signature_url` | `member-photos`, `member-signatures` |
| `organization-event` (undeclared, raw SQL — see below) | `file_path` | `event-files` |

### Organization events: a special case

`organization_events.file_path` (alongside `original_filename`, `file_size`, `uploaded_at`) exists **in the database table but is not declared in `models/organization-event.model.js`** — `controllers/organization-event.controller.js` reads and writes these columns through raw `db.sequelize.query()` calls. It survives `sync({ alter: true })` only because `alter` does not drop undeclared columns.

Consequences for this work:

- The backfill script cannot reach this column through a Sequelize model and must use raw SQL for it. Key prefix: `event-files`.
- The create and update handlers build `INSERT`/`UPDATE` statements by hand, so the `storage.put` change lands in the raw-SQL parameter list rather than in a model call.
- Declaring these four columns on the model is **in scope** as a targeted fix, since the migration has to touch this code anyway and the undeclared-column state is what makes the backfill awkward.

This brings the inventory to **29 columns across 23 models**.

## Error handling

- **Create:** upload to S3 first, then write the DB row. A failed upload aborts before any DB change, so no row ever points at a nonexistent object.
- **Replace:** upload new → update row → delete old. A mid-sequence failure leaves the old file reachable rather than orphaning the record.
- **Read:** a `getUrl` failure surfaces as a 500, not an empty `src`. Silently blank images are harder to diagnose than an error.

## Testing

The repo has no test runner (`npm test` is a stub) and this design does not introduce one. Verification follows the existing ad-hoc-script convention:

- `backend/test-storage.js` exercising `put` / `getUrl` / `remove` / `getStream` against both drivers.
- A manual pass over one upload, one view, and one download in each of the ten features with `STORAGE_DRIVER=s3` pointed at a scratch bucket.

## Security note

Presigned URLs authorize by possession: a user who obtains one can share it for its 15-minute lifetime. This is inherent to the chosen approach and is materially better than the current permanently-public static mount, but it is not equivalent to per-request authorization. Endpoints that mint URLs still enforce role and ownership checks before presigning.
