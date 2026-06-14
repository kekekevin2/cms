import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';

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
    router.navigate([dashboardPath]);
    return false;
  };
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
      return '/department/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'organization':
      return '/organization/dashboard';
    case 'college_department':
      return '/department/dashboard';
    default:
      console.error(`Unknown role: ${role}`);
      return '/login';
  }
}
