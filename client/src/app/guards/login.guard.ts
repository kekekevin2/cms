import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';
import { getDashboardPathByRole } from './dashboard-path';

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
    if (dashboardPath) {
      router.navigate([dashboardPath]);
      return false;
    }
    // No dashboard for this role: show the login page logged out rather than redirecting to
    // /login again, which would re-run this guard forever (a blank, endlessly loading page)
    authService.clearSession();
  }

  // Allow access to login page
  return true;
};
