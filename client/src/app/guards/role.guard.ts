import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';
import { getDashboardPathByRole } from './dashboard-path';

/**
 * Role Guard - Ensures user has the required role to access a route
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns CanActivateFn
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(Auth);
    const router = inject(Router);
    const user = authService.currentUser();

    // Check if user is authenticated
    if (!authService.isAuthenticated() || !user) {
      console.warn('Role Guard: User not authenticated');
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    // Validate user role exists
    if (!user.role) {
      console.error('Role Guard: User has no role assigned');
      authService.logout();
      return false;
    }

    // Check if user has required role
    if (allowedRoles.includes(user.role)) {
      return true;
    }

    // User doesn't have required role, redirect to their own dashboard
    console.warn(
      `Role Guard: User role '${user.role}' not in allowed roles [${allowedRoles.join(', ')}]`,
    );
    const dashboardPath = getDashboardPathByRole(user.role);
    if (dashboardPath) {
      router.navigate([dashboardPath]);
    } else {
      console.error(`Role Guard: unknown role '${user.role}'`);
      authService.logout();
    }
    return false;
  };
};
