# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A faculty/organization credential and requirements management system (CMS) for a college. Two independent apps in one repo, plus one standalone dev tool:

- `backend/` — Node/Express 5 + Sequelize (MySQL via `mysql2`) REST API, JWT auth
- `client/` — Angular 20 standalone-component SPA (Tailwind v4, Chart.js, PrimeIcons)
- `pds/` — standalone dev-only field-coordinate locator tool with its own tiny Express 4 + SQLite server

There is no root-level package.json or workspace tooling — run commands from inside `backend/`, `client/`, or `pds/server/` separately.

## Commands

### Backend (`backend/`)
```
npm run dev                    # nodemon, auto-restart
npm start                      # node index.js
npm run create-superadmin      # scripts/create-superadmin.js — bootstrap the first superadmin account
```
**Most of the other npm scripts in `backend/package.json` are dead** — `setup-db`, `init-db`, `reset-db`, `clear-data`, `create-superadmin-quick`, `test-db`, `insert-academic-years`, `add-passport-photo`, and `create-dean-profile-tables` all point at files that no longer exist in `backend/`. Only `dev`, `start`, and `create-superadmin` actually run. Don't suggest the dead ones; the surviving one-off scripts live in `backend/scripts/` (`create-superadmin.js`, `fix-college-department-role.js`, `migrate-campuses.js`) and are run directly with `node`.

There is no automated test suite (`npm test` is a stub) and no lint script. The `test-*.js` files in `backend/` root (`test-academic-years.js`, `test-adviser-data.js`, `test-api-response.js`, `test-officer-update.js`, `test-route.js`, `test-storage.js`) plus `check-org-data.js`, `reset-password.js`, `fill-pds-sample-data.js` are ad hoc manual scripts run directly with `node`, not a test runner suite. `node test-storage.js` is the closest thing to a real test — it exercises the storage adapter end to end against whichever driver `STORAGE_DRIVER` selects, and exits non-zero on failure.

Requires `backend/.env` (loaded via `dotenv` in `index.js`, `config/db.config.js`, and `utils/storage.js`): `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DIALECT`, `DB_POOL_MAX/MIN/ACQUIRE/IDLE`, `PORT` (no default — server won't bind without it), `JWT_SECRET`, `SMTP_HOST/PORT/USER/PASS` (nodemailer), `FRONTEND_URL` (password-reset links), `RECAPTCHA_ENABLED` + `RECAPTCHA_SECRET_KEY`, `NODE_ENV`, plus file-storage vars: `STORAGE_DRIVER` (`disk` | `s3`, defaults to `disk`), `S3_BUCKET`, `S3_REGION`, `S3_PRESIGN_TTL` (seconds, default `900`), and the standard `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` read by the AWS SDK itself.

`index.js` calls `bootstrapSuperadmin()` (`utils/bootstrap-superadmin.js`) on every boot, before the server starts listening. It exists because Render's filesystem is ephemeral with no shell step in a deploy, so the interactive `npm run create-superadmin` can't be used there — it's a no-op unless both `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` are set, and even then only fires if zero superadmin accounts currently exist, so redeploys never overwrite or duplicate. Optional `SUPERADMIN_FIRST_NAME`/`SUPERADMIN_LAST_NAME`/`SUPERADMIN_CONTACT` fill in the paired `Admin` row. Bootstrap failures are caught and logged, never thrown — a missing seed account shouldn't block the server from starting.

### Client (`client/`)
```
npm install  # run after pulling — new deps (e.g. jspdf/pdfjs-dist) are often added to package.json
npm start    # ng serve --port 7283
npm run build
npm test     # Karma/Jasmine — no meaningful specs beyond the generated app.spec.ts
```
API base URL is hardcoded per environment in `client/src/app/environments/environment.ts` (`http://localhost:3000/api`) and `environment.prod.ts` (Render-hosted URL) — if you change the backend `PORT`, change `environment.ts` too. Prettier config lives in `client/package.json` (100 cols, single quotes, `angular` parser for HTML).

### PDS locator (`pds/server/`)
```
npm start    # node index.js — serves GET/POST /api/positions, POST /api/positions/bulk, DELETE /api/positions
```
Requires Node >= 22.5.0 (uses the built-in `node:sqlite` module). Stores coordinates in `pds/server/positions.sqlite3`, entirely separate from the main app database.

## Architecture

### Role model
Six roles drive both backend authorization and frontend routing: `superadmin`, `dean`, `faculty`, `admin`, `organization`, `college_department` (see the ENUM in `backend/models/user.model.js`). **`dean` and `college_department` are the same conceptual portal** — `college_department` is the currently-used role for what the UI calls the "Dean"/department portal; `dean` is a legacy/alias role kept for backward compatibility. This split shows up in several places you must keep in sync when touching auth or routing:
- `role.middleware.js` `checkRole(...roles)` gates backend routes — dean-portal routes typically accept both `dean` and `college_department`.
- `client/src/app/app.routes.ts` — routes under `/dean/*` and `/department/dashboard` are guarded with `roleGuard(['college_department'])`; `/dean/dashboard` just redirects to `/department/dashboard`.
- `client/src/app/guards/dashboard-path.ts` `getDashboardPathByRole()` is the one role→dashboard map shared by `loginGuard`, `roleGuard` and the auth interceptor (they used to keep separate copies that drifted — two lacked `college_department`, which trapped logged-in department users in an endless `/login` → `/login` redirect, a blank page). It returns `null` for unknown roles; callers must log the user out rather than send them to `/login` while still logged in. `Auth.hasToken()` also treats an expired JWT as logged out.
- `backend/controllers/auth.controller.js` has a fourth mapping, `rolePathMap`, used to tell the frontend where to redirect after login (falls back to `/${role}/dashboard`).

JWT payload carries `{ user_id, email, role }` plus role-specific profile IDs attached at login (see `generateToken` usage in `auth.controller.js`). `auth.middleware.js` verifies the token and sets `req.user`; `role.middleware.js` then checks `req.user.role` against an allow-list per route. `recaptcha.middleware.js` optionally guards public POST endpoints and no-ops entirely unless `RECAPTCHA_ENABLED === 'true'`.

### Backend structure
Express routes are organized by portal/role, not by resource: `routes/dean-*.routes.js`, `routes/faculty-*.routes.js`, `routes/superadmin-*.routes.js`, `routes/organization-*.routes.js`, plus `college-department-portal.routes.js` and shared routes (`academic-year-shared.routes.js`, `announcement.routes.js`). Each route file pairs 1:1 with a same-named controller in `controllers/`. When adding an endpoint, place it under the route file matching the portal it belongs to rather than creating a generic catch-all.

Mount paths in `index.js` mirror the portal split (`/api/dean/*`, `/api/faculty/*`, `/api/superadmin/*`, `/api/organization/*`, `/api/college-department`), but a few routers are **mounted twice** under different prefixes for backward compatibility — `pds.routes.js` at both `/api/faculty/pds` and `/api/pds`, `dean-pds.routes.js` at both `/api/dean/pds` and `/api/dean-pds`. Changing one path silently changes both.

All models are `sequelize.define` factory functions registered and associated centrally in `backend/models/index.js` (~700 lines) — the single place wiring `belongsTo`/`hasMany` across ~50 models, so consult it before assuming how two models relate. Model domains:
- Core identity: `user`, `dean`, `faculty`, `organization`, `admin`
- Org structure: `campus`, `department`, `college-department`, `academic-year`
- Dean/faculty profile sub-tables (each split into many one-to-one/one-to-many tables): `*-personal-profile`, `*-academic-profile`, `*-employment-profile`, `*-awards`, `*-research-activities`, `*-seminars-trainings`, `*-extension-activities`, `*-professional-membership`
- Personal Data Sheet (PDS) — a CSC government form, modeled as one parent (`personal-data-sheet.model.js`) with many child tables (`pds-child`, `pds-education`, `pds-eligibility`, `pds-work-experience`, `pds-voluntary-work`, `pds-training`, `pds-other-info`, `pds-reference`). `client/docs/` holds the source CS Form No. 212 xlsx this mirrors, and `pds-excel-export.controller.js` exports data back into that spreadsheet format.
- Organization membership: `organization`, `organization-member`, `organization-adviser`, `organization-event*`, `organization-document`, `organization-bulk-upload`, `organization-position-template`
- Requirements/compliance: `requirement-submission`, `requirement-file`, `document-type`, `faculty-credential`, `credential-certificate`, `faculty-clearance`, `cvl-attachment`
- `announcement` / `announcement-read` — read-receipt pattern (separate join table tracking per-user read state)

**Schema management needs care.** `index.js` runs `db.sequelize.sync({ alter: false })` on startup — it creates missing tables but never alters existing ones, so adding/changing a column on an existing model requires a hand-written script in `backend/migrations/` (mix of `.js` Sequelize scripts and raw `.sql`, run manually with `node`/a MySQL client). Don't flip it back to `alter: true`: on MariaDB every boot re-adds each `unique: true` column's index (`email_2`, `email_3`, …) until the table hits the 64-key limit and startup fails with "Too many keys specified" (this has happened more than once — see `migrations/fix-duplicate-indexes.js`). The local dev DB is MariaDB 10.4 (XAMPP), which also returns `JSON` columns as strings — parse them in a model getter (see `pds-template-config.model.js`).

`backend/public/templates/` holds export templates.

### File storage — migrated from local disk to S3, read before touching uploads

All upload/read/delete paths across the backend go through a common storage adapter. Every path-bearing DB column stores a **driver-neutral key** (`requirements/report-173…-482.pdf`) — never a filesystem path or a `/uploads/…` web path. Three utility modules define the design:

- `utils/storage.js` — the adapter. Picks a `disk` or `s3` backend once at require time from `STORAGE_DRIVER` (default `disk`) and exports `{ put, getUrl, remove, getBuffer, buildKey, driver }`. `put` returns the driver-neutral key described above; `buildKey` and `assertSafeKey` reject anything else, including a traversing `folder`. `getUrl` yields `/uploads/<key>` on disk and a presigned S3 URL otherwise (TTL from `S3_PRESIGN_TTL`, default 900s).
- `utils/upload.js` — exports `{ makeUpload, MB, DOCUMENT_TYPES, IMAGE_TYPES, SPREADSHEET_TYPES, handleUploadError, MAX_UPLOAD_MB }`, **not** a multer instance. `makeUpload({ folder, allowedTypes, maxSize })` returns a `memoryStorage` multer capped at 25 MB regardless of what you ask for, because buffered files sit in RAM and several routes accept 10 at once. Controllers hand `file.buffer` to `storage.put`. `handleUploadError` is mounted globally as the last middleware in `index.js` and turns `MulterError`/"Invalid file type" into `400 { message }` instead of letting them fall through to Express's default HTML error handler.
- `utils/presign.js` — `presignFields(rowsOrRow, ['photo_url', …])` swaps stored keys for viewable URLs on the way out so `<img src>` works, and is called from every list/detail endpoint that returns an image field. It **nulls and logs** a field whose value isn't a usable key rather than throwing, so one unmigrated legacy row can't 500 a whole list.

Download endpoints return `res.json({ url })` holding a presigned (or `/uploads/…`) URL — nothing streams bytes via `res.download`. The CVL multi-file download returns `{ files: [{ id, filename, size, url }] }`. On the client, `client/src/app/shared/utils/download.util.ts` exports a shared `downloadFromUrl` helper used wherever a component needs to trigger a browser download from one of these URLs.

`index.js` mounts `/uploads` as `express.static` **only when `storage.driver === "disk"`**; under `STORAGE_DRIVER=s3` that mount is skipped entirely and every file is reached exclusively through a short-lived presigned URL, so there is no more unauthenticated public read path.

`backend/scripts/migrate-uploads-to-s3.js` is the idempotent one-time backfill for rows still holding legacy filesystem/web paths from before this migration; run with `--dry-run` first. It buckets each row into migrated / already-keys / missing / unrecognized / failed and logs a summary — rerunning it is safe, already-migrated rows are skipped.

The full design is in `docs/superpowers/specs/2026-07-28-s3-uploads-presigned-urls-design.md` and `docs/superpowers/plans/2026-07-28-s3-uploads-presigned-urls.md`.

**Two things left outstanding by this migration:**
1. `backend/models/organization-event.model.js` now declares `file_path`, `original_filename`, `file_size`, `uploaded_at`, columns that previously existed in the `organization_events` table but not on the model. These declarations were never verified against the live table, and `index.js` runs `db.sequelize.sync({ alter: true })` on every boot — a type mismatch here will `ALTER` the live table. Anyone deploying this must first run `DESCRIBE organization_events` and reconcile the model against it before restarting the server against production data.
2. `backend/controllers/dean-organization-events.controller.js` has a pre-existing bug, unrelated to this migration and deliberately left unfixed: both `getOrganizationEvents` (~lines 20-23) and `downloadEventFile` (~lines 81-84) declare `const userId = req.user.user_id` but then call `getDepartmentForUser(deanUserId)` — `deanUserId` is never declared, so both handlers throw a `ReferenceError` on every request.

Stray `*.backup`, `*.old`, `*.old2` files sit alongside some controllers (e.g. `dean-requirement.controller.js.backup/.old/.old2`, `faculty-requirement.controller.js.backup`) — dead snapshots, not in the require graph. Don't edit them and don't treat them as current behavior.

### Client structure
Angular 20 standalone components (no NgModules) with lazy-loaded routes (`loadComponent` in `app.routes.ts`) so each portal's bundle only loads on navigation. Under `client/src/app/`:
- `features/` — organized by portal: `auth/`, `dashboards/` (one dashboard per role), `dean/`, `faculty/`, `organization/`, `superadmin/`, `admin/`
- `guards/` — `auth.guard.ts` (must be logged in), `roleGuard(roles[])` (must have one of these roles), `loginGuard` (bounce already-logged-in users away from `/login`)
- `interceptors/auth.interceptor.ts` — attaches JWT to outgoing requests and handles auth-failure redirects
- `services/` — mirrors the portal split (`auth/`, `dean/`, `faculty/`, `organization/`, `superadmin/`, `theme/`) plus `core/` for cross-portal concerns (`academic-year`, `announcement`, `dropdown`, `pds`, `pds-pdf`, `recaptcha`)
- `shared/` — cross-portal `components/` (`layout.component.ts`, `change-password-modal`, `sdg-events-chart`), `interfaces/`, `services/sweetalert.service.ts`, `utils/storage.util.ts` (the single place localStorage keys are read/written)

`client/dev/` contains standalone debug HTML pages (dark-mode/localStorage clearing, connection testing, chart examples) — dev aids only, not built into the app.

### PDS (Personal Data Sheet) tooling
`pds/` at the repo root is a standalone, unbuilt vanilla HTML/JS/CSS tool (`index.html`/`index.css`/`index.js`) for visually locating field coordinates on `PDS-template.pdf` (CS Form No. 212) — a dev aid for building the PDS export mapping, not part of either app's build. Its `pds/server/` is a small Express 4 app persisting those coordinates to its own SQLite file. `pds/deploy-ec2.sh` deploys the tool standalone. The actual runtime PDS export code lives in `backend/controllers/pds-excel-export.controller.js` and `client/src/app/services/core/pds-pdf.service.ts`.

**PDS PDF export + superadmin PDS Template Editor** (the in-app replacement for the `pds/` tool) form one pipeline:
- `buildOverlays()` in `pds-pdf.service.ts` is the **single source of truth** for every field drawn on the PDF — each overlay has a unique `key` (`surname`, `work_3_salary_grade`, `q38_b_yes`, `photo`, `c5_training_1_title`, …) and default x/y in PDF points (y from the page bottom; image boxes use x/y as top-left). `buildTemplateFieldPositions()` runs it on a sample PDS (every row filled, every checkbox shown) to give the editor its field list, so adding a field there is all it takes to make it editable.
- The editor (`features/superadmin/pds-template-editor/`) saves a versioned `pds_template_config` row (`config_data.positions`, keyed by those keys) via `POST /api/pds-template-config`; only the newest `is_active` row is used, and older versions can be restored. Exports call `GET …/active` on every download and replace each default overlay's x/y by key (`applyConfig`).
- Template PDFs are uploaded in the editor to `pds_template_files` (storage adapter folder `pds-templates/`); `config_data.template_key` is the one the positions were placed on (the PDF open when Save Positions was clicked). The template is the full **11-page CS Form 212 Revised 2026** (A4, 595×842 pt): pages 1–4 plus continuation sheets C5–C11. `CONTINUATION_SHEETS` maps each sheet (`c5` L&D, `c6` work, `c7` children, `c8` extra education, `c9` eligibility, `c10` voluntary, `c11` other info) to its "(Continuation)" heading, rows per sheet and editor page. Exports find those pages by heading (`findContinuationPages`), skip them in the normal page loop, and print each only when its table overflows the main form — once per sheet's worth of rows, after page 4. Their fields are keyed `<id>_…` (e.g. `c6_work_3_position_title`) and carry a `sheet` index for repeated copies. The bundled `client/public/pds-template.pdf` is the same 11-page file and is used when no template is saved.
- Main-form row counts (`CHILD_ROWS` 13, `ELIGIBILITY_ROWS` 7, `WORK_EXPERIENCE_ROWS` 24, `TRAINING_ROWS` 17, `VOLUNTARY_WORK_ROWS` 9, `OTHER_INFO_ROWS` 7) and every default coordinate come from that file — re-derive them (text baselines + table rules via pdf.js, applying the CTM) if the template layout changes. Question data fields keep older names (e.g. 2026 Q39 immigrant → `q40_*`, Q40a indigenous → `q41_*`; the 2026 UMID/PCN rows print `gsis_id_no`/`sss_no`); the mapping is commented above the page-4 `questions` array.
- The editor and export share `pdfjs-dist` 4.x — importing it overwrites `window.pdfjsLib`, so the worker URL must match `pdfjsLib.version` exactly.

## Planning docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold dated design specs and step-by-step implementation plans (`2026-07-23-pds-locator-manual-coords-postgres`, `2026-07-28-s3-uploads-presigned-urls`). `.kiro/specs/` holds older per-feature spec folders. Check these before starting work described as "the plan" — an in-flight plan may already dictate the approach, and two are currently unfinished.

Work on those plans may live in a git worktree under `.claude/worktrees/`; treat that directory as a separate checkout, not as source to edit in place. `.superpowers/` (gitignored) holds execution scratch for in-progress plans — per-plan ledgers, task briefs, and review diffs. If a plan is mid-execution, `.superpowers/sdd/<plan-name>/progress.md` records which tasks are done and which findings were deferred or overruled; it is the recovery map when a plan is resumed in a later session.
