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

### Client (`client/`)
```
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
- **Three separate copies** of `getDashboardPathByRole()` exist on the client — in `guards/role.guard.ts`, `guards/login.guard.ts`, and `interceptors/auth.interceptor.ts`. They can and do drift; update all three when adding a role or changing a dashboard path.
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

**Schema management is inconsistent and needs care.** `index.js` runs `db.sequelize.sync({ alter: true })` on startup even though the comment directly above it claims `alter: false` — so Sequelize *does* mutate the live schema to match the models on every boot. The hand-written scripts in `backend/migrations/` (mix of `.js` Sequelize scripts and raw `.sql`, run manually with `node`/a MySQL client) exist for changes `sync` can't express. When adding a column, know that a model edit alone will alter the dev database on next restart; note `fix-duplicate-indexes.js` exists because `alter` has caused index bloat before.

`backend/public/templates/` holds export templates.

### File storage — a half-finished migration, read before touching uploads

File handling is **mid-migration from local disk to S3 and the two systems coexist**. Three utility modules define the target design:

- `utils/storage.js` — the adapter. Picks a `disk` or `s3` backend once at require time from `STORAGE_DRIVER` and exports `{ put, getUrl, remove, buildKey, driver }`. `put` returns a **driver-neutral key** (`requirements/report-173…-482.pdf`) — no leading slash, no `uploads/` prefix, no drive letter, no backslashes; `buildKey` and `assertSafeKey` reject anything else, including a traversing `folder`. `getUrl` yields `/uploads/<key>` on disk and a presigned S3 URL otherwise.
- `utils/upload.js` — exports `{ makeUpload, MB, DOCUMENT_TYPES, IMAGE_TYPES, SPREADSHEET_TYPES }`, **not** a multer instance. `makeUpload({ folder, allowedTypes, maxSize })` returns a `memoryStorage` multer capped at 25 MB regardless of what you ask for, because buffered files sit in RAM and several routes accept 10 at once. Controllers hand `file.buffer` to `storage.put`.
- `utils/presign.js` — `presignFields(rowsOrRow, ['photo_url', …])` swaps stored keys for viewable URLs on the way out so `<img src>` works. It **nulls and logs** a field whose value isn't a usable key rather than throwing, so one unmigrated legacy row can't 500 a whole list.

What has actually been converted so far: `faculty-requirement.routes.js` (uses `makeUpload`) and the requirement controllers `faculty-requirement.controller.js` / `dean-requirement.controller.js` (use `storage`). **Nothing calls `presignFields` yet.**

Everything else still carries its own inline `multer.diskStorage` config and stores raw filesystem or web paths: `college-department-portal.routes.js`, `dean-profile.routes.js`, `faculty-credentials.routes.js`, `faculty-profile.routes.js`, `organization-event.routes.js`, `organization.routes.js`, `dean-pds.controller.js`, `pds.controller.js`. Expect to find **three incompatible stored formats** in the database — absolute paths, CWD-relative paths (`uploads/…`), and web paths (`/uploads/…`) — plus keys in already-migrated columns.

`index.js` still mounts `/uploads` as unauthenticated `express.static`, so uploaded files remain publicly readable by anyone who guesses a filename. Closing that mount is the last step of the migration and has not happened.

The full design and remaining steps are in `docs/superpowers/specs/2026-07-28-s3-uploads-presigned-urls-design.md` and `docs/superpowers/plans/2026-07-28-s3-uploads-presigned-urls.md` — read those before extending upload code, and follow the plan rather than inventing a fourth pattern.

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

## Planning docs

`docs/superpowers/specs/` and `docs/superpowers/plans/` hold dated design specs and step-by-step implementation plans (`2026-07-23-pds-locator-manual-coords-postgres`, `2026-07-28-s3-uploads-presigned-urls`). `.kiro/specs/` holds older per-feature spec folders. Check these before starting work described as "the plan" — an in-flight plan may already dictate the approach, and two are currently unfinished.

Work on those plans may live in a git worktree under `.claude/worktrees/`; treat that directory as a separate checkout, not as source to edit in place. `.superpowers/` (gitignored) holds execution scratch for in-progress plans — per-plan ledgers, task briefs, and review diffs. If a plan is mid-execution, `.superpowers/sdd/<plan-name>/progress.md` records which tasks are done and which findings were deferred or overruled; it is the recovery map when a plan is resumed in a later session.
