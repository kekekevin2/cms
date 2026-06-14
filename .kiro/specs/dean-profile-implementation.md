---
title: Implement Dean My Profile Feature
status: pending
---

# Implement Dean My Profile Feature

Create a complete "My Profile" feature for Deans, identical to the Faculty profile system.

## Context

- ✅ Backend models already created (8 models)
- ✅ Models registered in backend/models/index.js
- Tables will auto-create when backend restarts
- Need to create controller, routes, service, and frontend component

## Tasks

### Backend Implementation

- [ ] Create dean profile controller by copying faculty profile controller
  - Copy `backend/controllers/faculty-profile.controller.js` to `backend/controllers/dean-profile.controller.js`
  - Replace all `faculty_id` with `dean_id`
  - Replace all `Faculty` with `Dean`
  - Replace all `faculty` with `dean`
  - Replace `req.user.faculty_id` with `req.user.dean_id`

- [ ] Create dean profile routes by copying faculty profile routes
  - Copy `backend/routes/faculty-profile.routes.js` to `backend/routes/dean-profile.routes.js`
  - Replace `faculty-profile` with `dean-profile`
  - Replace `facultyProfileController` with `deanProfileController`
  - Update require path to dean-profile.controller

- [ ] Register dean profile routes in backend
  - Add to `backend/index.js`: `const deanProfileRoutes = require("./routes/dean-profile.routes");`
  - Add route: `app.use("/api/dean/profile", deanProfileRoutes);`

### Frontend Implementation

- [ ] Create dean profile service
  - Copy `client/src/app/services/faculty-profile.service.ts` to `client/src/app/services/dean-profile.service.ts`
  - Replace all `Faculty` with `Dean`
  - Replace all `faculty` with `dean`
  - Replace `/api/faculty/profile` with `/api/dean/profile`
  - Replace `FacultyProfileService` with `DeanProfileService`

- [ ] Create dean my-profile component directory
  - Create folder: `client/src/app/features/dean/my-profile/`

- [ ] Create dean my-profile TypeScript component
  - Copy `client/src/app/features/faculty/my-profile/my-profile.ts` to `client/src/app/features/dean/my-profile/my-profile.ts`
  - Replace all `Faculty` with `Dean`
  - Replace all `faculty` with `dean`
  - Replace `FacultyProfileService` with `DeanProfileService`
  - Replace `FacultyMyProfile` with `DeanMyProfile`
  - Replace `app-faculty-my-profile` with `app-dean-my-profile`
  - Update import paths

- [ ] Create dean my-profile HTML template
  - Copy `client/src/app/features/faculty/my-profile/my-profile.html` to `client/src/app/features/dean/my-profile/my-profile.html`
  - No changes needed (uses component properties)

- [ ] Add My Profile to Dean Dashboard navigation
  - Update `client/src/app/features/dashboards/dean/dean.ts`
  - Import DeanMyProfile component
  - Add to imports array
  - Add navigation button in sidebar
  - Add content display section

## Acceptance Criteria

- [ ] Dean can access "My Profile" from dashboard
- [ ] Personal profile CRUD works (with photo uploads)
- [ ] Academic profile CRUD works
- [ ] Employment profile CRUD works
- [ ] Professional membership CRUD works
- [ ] Awards CRUD works (with file upload)
- [ ] Seminars/Trainings CRUD works (with file upload)
- [ ] Research activities CRUD works (with file upload)
- [ ] Extension activities CRUD works (with file upload)
- [ ] All data persists correctly
- [ ] Navigation works properly

## Notes

- This is primarily a copy-paste task with find-replace
- Backend tables auto-create via Sequelize
- File uploads use same `/uploads/profiles/` directory
- Authentication uses dean role middleware
