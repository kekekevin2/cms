# Public Department Profile

Visitors can open `/public/departments` without signing in, select an active
department, or open `/public/departments/:id` directly. The ID is the existing
`college_department_id`, not the underlying `department_id`.

Local URLs:

- Directory: http://localhost:7283/public/departments
- Existing CET profile: http://localhost:7283/public/departments/1

The separate public component has a visitor-focused university header, the
existing university seal and campus cover image, section navigation, responsive
content cards, and a light/dark toggle using the saved application preference.
All design styles are scoped to this component. It contains no portal sidebar,
editor, picture upload, or administrative controls. Portal editing and uploads
remain protected by their existing JWT and role guards.

## Data and access

- `GET /api/public/departments` lists active profiles with their names, IDs,
  campus names, and department names/acronyms.
- `GET /api/public/departments/:id` returns the public profile fields, including
  contact information, about/goal, reasons to choose BatStateU, educational
  objectives, programs, career opportunities, outcomes, and profile picture.
- Both endpoints query the existing `CollegeDepartment` model. There is no
  duplicate table, migration, or hardcoded department content. Authorized edits
  appear on the public page after a refresh. Responses use `Cache-Control:
  no-store`, and picture URLs use the existing storage URL helper.
- Only active profiles are public. Missing/inactive profiles return 404;
  invalid IDs return 400. Account IDs, account status, timestamps, credentials,
  and user associations are excluded using explicit query projections.
- The public router exposes GET routes only. The existing portal's JWT and
  role middleware continues to protect edits and uploads. Superadmin routes
  retain their existing authorization.

## Files

Added:

- `backend/controllers/public-department.controller.js`
- `backend/routes/public-department.routes.js`
- `backend/tests/public-department-profile.test.js`
- `client/src/app/features/public/department-profile/public-department-profile.ts`
- `client/src/app/features/public/department-profile/public-department-profile.html`
- `client/src/app/features/public/department-profile/public-department-profile.css`
- `client/src/app/features/public/department-profile/public-department-content.css`
- `client/src/app/features/public/department-profile/public-department-responsive.css`
- This document.

Updated: the backend route mount, Angular routes, and existing profile service
(with public GET methods).

## Validation

The authenticated Department Profile supports changing its contact email under
Edit Profile → Contact Information. Only `college_departments.email` is updated;
the login email and password in `users` remain unchanged. Blank, invalid, and
oversized emails are rejected. A contact email may be shared with another
account because it is not a login credential. The public page reflects the
saved contact email on refresh and provides no editing controls.

From `backend`:

```powershell
node --test --test-isolation=none tests/public-department-profile.test.js tests/department-faculty-access.test.js
```

The profile tests cover public field selection, inactive/missing records,
invalid IDs, rejected writes, JWT/role checks on the existing portal, and an
authorized update followed by a fresh public read of the same record. Test
database records are mocked; these tests do not modify the real database.

From `client`:

```powershell
npm.cmd run build -- --configuration development
npm.cmd test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/dean/my-profile/my-profile.spec.ts --ts-config=tsconfig.department-profile.spec.json
```

The focused test configuration avoids an unrelated existing broken import in
`features/dashboards/faculty/faculty.spec.ts` while checking the real email form,
normalization, unchanged login credentials, and server error display.
