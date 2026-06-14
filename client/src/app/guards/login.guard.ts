import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';

/**
 * Login Guard - Prevents authenticated users from accessing login page
 * Redirects them to their role-specific dashboard
 */
export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const user = authService.currentUser();

  // If user is already logged in, redirect to their dashboard
  if (authService.isAuthenticated() && user) {
    const dashboardPath = getDashboardPathByRole(user.role);
    router.navigate([dashboardPath]);
    return false;
  }

  // Allow access to login page
  return true;
};

/**
 * Get the appropriate dashboard path based on user role
 */
function getDashboardPathByRole(role: string): string {
  switch (role) {
    case 'superadmin':
      return '/superadmin/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'dean':
      return '/dean/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'organization':
      return '/organization/dashboard';
    default:
      return '/login';
  }
}
