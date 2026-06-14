import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';

/**
 * Auth Guard - Ensures user is authenticated
 * Redirects to login if not authenticated
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const user = authService.currentUser();

  // Check if user is authenticated and has valid user data
  if (authService.isAuthenticated() && user && user.role) {
    return true;
  }

  // User is not authenticated, store the attempted URL for redirecting after login
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
