import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loginGuard } from './guards/login.guard';

// NOTE:
// All route components are lazy-loaded via `loadComponent`. This keeps the
// initial JS bundle small so the login page renders quickly and each
// dashboard only downloads when the user actually navigates to it.

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
    canActivate: [loginGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPassword,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (m) => m.ResetPassword,
      ),
  },
  {
    path: 'superadmin/dashboard',
    loadComponent: () =>
      import('./features/dashboards/superadmin/superadmin').then(
        (m) => m.SuperadminDashboard,
      ),
    canActivate: [authGuard, roleGuard(['superadmin'])],
  },
  {
    path: 'department/dashboard',
    loadComponent: () =>
      import('./features/dashboards/dean/dean').then((m) => m.DeanDashboard),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/dashboard',
    redirectTo: 'department/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dean/requirements-monitoring',
    loadComponent: () =>
      import(
        './features/dean/requirements-monitoring/requirements-monitoring'
      ).then((m) => m.DeanRequirementsMonitoring),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/announcements',
    loadComponent: () =>
      import('./features/dean/announcements/announcements').then(
        (m) => m.DeanAnnouncementsComponent,
      ),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/organization-advisers',
    loadComponent: () =>
      import(
        './features/dean/organization-advisers/dean-organization-advisers'
      ).then((m) => m.DeanOrganizationAdvisersComponent),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/organization-documents',
    loadComponent: () =>
      import(
        './features/dean/organization-documents/dean-organization-documents'
      ).then((m) => m.DeanOrganizationDocumentsComponent),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/organization-dashboard',
    loadComponent: () =>
      import(
        './features/dean/organization-dashboard/organization-dashboard'
      ).then((m) => m.DeanOrganizationDashboard),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/personal-data-sheet',
    loadComponent: () =>
      import(
        './features/dean/personal-data-sheet/personal-data-sheet.component'
      ).then((m) => m.DeanPersonalDataSheetComponent),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'faculty/dashboard',
    loadComponent: () =>
      import('./features/dashboards/faculty/faculty').then(
        (m) => m.FacultyDashboard,
      ),
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'faculty/requirements',
    loadComponent: () =>
      import('./features/faculty/requirements/requirements').then(
        (m) => m.FacultyRequirements,
      ),
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'faculty/personal-data-sheet',
    loadComponent: () =>
      import(
        './features/faculty/personal-data-sheet/personal-data-sheet.component'
      ).then((m) => m.PersonalDataSheetComponent),
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'faculty/announcements',
    loadComponent: () =>
      import('./features/faculty/announcements/announcements').then(
        (m) => m.FacultyAnnouncementsComponent,
      ),
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'organization/dashboard',
    loadComponent: () =>
      import('./features/dashboards/organization/organization').then(
        (m) => m.OrganizationDashboard,
      ),
    canActivate: [authGuard, roleGuard(['organization'])],
  },
  {
    path: 'college-department/dashboard',
    loadComponent: () =>
      import(
        './features/dashboards/college-department/college-department'
      ).then((m) => m.CollegeDepartmentDashboard),
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./features/dashboards/admin/admin').then((m) => m.AdminDashboard),
    canActivate: [authGuard, roleGuard(['admin'])],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
