import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { ForgotPassword } from './features/auth/forgot-password/forgot-password';
import { ResetPassword } from './features/auth/reset-password/reset-password';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { loginGuard } from './guards/login.guard';
import { SuperadminDashboard } from './features/dashboards/superadmin/superadmin';
import { DeanDashboard } from './features/dashboards/dean/dean';
import { FacultyDashboard } from './features/dashboards/faculty/faculty';
import { OrganizationDashboard } from './features/dashboards/organization/organization';
import { CollegeDepartmentDashboard } from './features/dashboards/college-department/college-department';
import { AdminDashboard } from './features/dashboards/admin/admin';
import { FacultyRequirements } from './features/faculty/requirements/requirements';
import { PersonalDataSheetComponent } from './features/faculty/personal-data-sheet/personal-data-sheet.component';
import { DeanPersonalDataSheetComponent } from './features/dean/personal-data-sheet/personal-data-sheet.component';
import { DeanRequirementsMonitoring } from './features/dean/requirements-monitoring/requirements-monitoring';
import { DeanAnnouncementsComponent } from './features/dean/announcements/announcements';
import { FacultyAnnouncementsComponent } from './features/faculty/announcements/announcements';
import { DeanOrganizationAdvisersComponent } from './features/dean/organization-advisers/dean-organization-advisers';
import { DeanOrganizationDocumentsComponent } from './features/dean/organization-documents/dean-organization-documents';
import { DeanOrganizationDashboard } from './features/dean/organization-dashboard/organization-dashboard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
    canActivate: [loginGuard], // Prevents logged-in users from accessing login page
  },
  {
    path: 'forgot-password',
    component: ForgotPassword,
  },
  {
    path: 'reset-password',
    component: ResetPassword,
  },
  {
    path: 'superadmin/dashboard',
    component: SuperadminDashboard,
    canActivate: [authGuard, roleGuard(['superadmin'])],
  },
  {
    path: 'department/dashboard',
    component: DeanDashboard,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/dashboard',
    redirectTo: 'department/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dean/requirements-monitoring',
    component: DeanRequirementsMonitoring,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/announcements',
    component: DeanAnnouncementsComponent,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/organization-advisers',
    component: DeanOrganizationAdvisersComponent,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/organization-documents',
    component: DeanOrganizationDocumentsComponent,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/organization-dashboard',
    component: DeanOrganizationDashboard,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'dean/personal-data-sheet',
    component: DeanPersonalDataSheetComponent,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'faculty/dashboard',
    component: FacultyDashboard,
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'faculty/requirements',
    component: FacultyRequirements,
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'faculty/personal-data-sheet',
    component: PersonalDataSheetComponent,
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'faculty/announcements',
    component: FacultyAnnouncementsComponent,
    canActivate: [authGuard, roleGuard(['faculty'])],
  },
  {
    path: 'organization/dashboard',
    component: OrganizationDashboard,
    canActivate: [authGuard, roleGuard(['organization'])],
  },
  {
    path: 'college-department/dashboard',
    component: CollegeDepartmentDashboard,
    canActivate: [authGuard, roleGuard(['college_department'])],
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard(['admin'])],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
