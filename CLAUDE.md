# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A faculty/organization credential and requirements management system (CMS) for a college. Two independent apps in one repo:

- `backend/` — Node/Express 5 + Sequelize (MySQL) REST API, JWT auth
- `client/` — Angular 20 standalone-component SPA (Tailwind v4, Chart.js, PrimeIcons)

There is no root-level package.json or workspace tooling — run commands from inside `backend/` or `client/` separately.

## Commands

### Backend (`backend/`)
```
npm run dev                    # nodemon, auto-restart
npm start                      # node index.js
npm run create-superadmin      # scripts/create-superadmin.js — bootstrap the first superadmin account
npm run setup-db / init-db     # setup-database.js / init-database.js — one-time DB bootstrap
npm run reset-db / clear-data  # reset-database.js / clear-data.js — destructive, wipes data
```
There is no automated test suite (`npm test` is a stub) and no lint script. The many `test-*.js` files in `backend/` root are ad hoc manual scripts run directly with `node test-whatever.js`, not a test runner suite.

Requires `backend/.env` (see `config/db.config.js`) with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DIALECT`, `DB_POOL_*`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `SMTP_*` (nodemailer), `AWS_*`, `FRONTEND_URL`.

### Client (`client/`)
```
ng serve --port 6152   # npm start — dev server on port 6152
ng build                # production build
ng test                 # Karma/Jasmine
```

## Architecture

### Role model
Five roles drive both backend authorization and frontend routing: `superadmin`, `dean`, `faculty`, `admin`, `organization`, `college_department` (see `backend/models/user.model.js` ENUM). **`dean` and `college_department` are the same conceptual portal** — `college_department` is the currently-used role for what the UI calls the "Dean"/department portal; `dean` is a legacy/alias role kept for backward compatibility. This split shows up in a few places you need to keep in sync when touching auth or routing:
- `role.middleware.js` `checkRole(...roles)` gates backend routes — dean-portal routes typically accept both `dean` and `college_department`.
- `client/src/app/app.routes.ts` — routes under `/dean/*` and `/department/dashboard` are guarded with `roleGuard(['college_department'])`; `/dean/dashboard` just redirects to `/department/dashboard`.
- `client/src/app/guards/role.guard.ts` and `login.guard.ts` each have their own `getDashboardPathByRole()` role→path mapping — these two copies can drift, check both when adding a role or changing a dashboard path.
- `backend/controllers/auth.controller.js` has its own `rolePathMap` used to tell the frontend where to redirect after login.

JWT payload carries `{ user_id, email, role }` plus role-specific profile IDs attached at login (see `generateToken` usage in `auth.controller.js`). `auth.middleware.js` verifies the token and sets `req.user`; `role.middleware.js` then checks `req.user.role` against an allow-list per route.

### Backend structure
Express routes are organized by portal/role, not by resource: `routes/dean-*.routes.js`, `routes/faculty-*.routes.js`, `routes/superadmin-*.routes.js`, `routes/organization-*.routes.js`, plus `college-department-portal.routes.js` and shared routes (`academic-year-shared.routes.js`, `announcement.routes.js`) mounted separately in `index.js`. Each route file pairs 1:1 with a same-named controller in `controllers/`. When adding a new endpoint, place it under the route file matching the portal it belongs to rather than creating a generic catch-all.

All models are defined as `sequelize.define` factory functions and registered/associated centrally in `backend/models/index.js` (~500 lines) — this is the single place that wires up `belongsTo`/`hasMany` associations across the ~50 models, so consult it before assuming how two models relate. Model domains:
- Core identity: `user`, `dean`, `faculty`, `organization`, `admin`
- Org structure: `campus`, `department`, `college-department`, `academic-year`
- Dean/faculty profile sub-tables (each split into many one-to-one/one-to-many tables): `*-personal-profile`, `*-academic-profile`, `*-employment-profile`, `*-awards`, `*-research-activities`, `*-seminars-trainings`, `*-extension-activities`, `*-professional-membership`
- Personal Data Sheet (PDS) — a CSC government form, modeled as one parent (`personal-data-sheet.model.js`) with many child tables (`pds-child`, `pds-education`, `pds-eligibility`, `pds-work-experience`, `pds-voluntary-work`, `pds-training`, `pds-other-info`, `pds-reference`). `client/docs/` has the source CS Form No. 212 xlsx this mirrors, and `pds-excel-export.controller.js` exports data back into that spreadsheet format.
- Organization membership: `organization`, `organization-member`, `organization-adviser`, `organization-event*`, `organization-document`, `organization-bulk-upload`, `organization-position-template`
- Requirements/compliance: `requirement-submission`, `requirement-file`, `document-type`, `faculty-credential`, `credential-certificate`, `faculty-clearance`, `cvl-attachment`
- `announcement` / `announcement-read` — read-receipt pattern (separate join table tracking per-user read state)

`db.sequelize.sync({ alter: false })` runs on startup (see `index.js`) — schema changes must go through the hand-written scripts in `backend/migrations/` (mix of `.js` Sequelize scripts and raw `.sql`) run manually, not through `sync`.

Stray `*.backup`, `*.old`, `*.old2` files exist alongside some controllers (e.g. `dean-requirement.controller.js.backup/.old/.old2`) — these are dead snapshots, not part of the require graph; don't edit them and don't treat them as current behavior.

### Client structure
Angular 20 standalone components (no NgModules) with lazy-loaded routes (`loadComponent` in `app.routes.ts`) so each portal's bundle only loads on navigation. Structure under `client/src/app/`:
- `features/` — organized by portal: `auth/`, `dashboards/` (one dashboard per role), `dean/`, `faculty/`, `organization/`, `superadmin/`, `admin/`
- `guards/` — `auth.guard.ts` (must be logged in), `roleGuard(roles[])` (must have one of these roles), `loginGuard` (bounce already-logged-in users away from `/login`)
- `interceptors/auth.interceptor.ts` — attaches JWT to outgoing requests
- `services/` — mirrors the portal split (`auth/`, `dean/`, `faculty/`, `organization/`, `superadmin/`, `core/`, `theme/`)
- `shared/` — cross-portal components/interfaces/utils

`client/dev/` contains standalone debug HTML pages (dark-mode/localStorage clearing, connection testing, chart examples) — dev aids only, not built into the app.

### PDS (Personal Data Sheet) tooling
`pds/` at the repo root is a standalone, unbuilt HTML/JS/CSS tool (plain `index.html`/`index.css`/`index.js`) for visually locating field coordinates on the CS Form No. 212 template PDF — a dev aid for building the PDS Excel/PDF export mapping, not part of either app's build. The actual runtime PDS export code lives in `backend/controllers/pds-excel-export.controller.js` and `client/src/app/services/core/pds-pdf.service.ts`.
