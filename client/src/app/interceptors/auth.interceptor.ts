import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../services/auth/auth';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Auth Interceptor - Adds authentication token to all HTTP requests
 * and handles 401 unauthorized errors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const router = inject(Router);
  const token = authService.getToken();

  // Clone request and add authorization header if token exists
  let clonedReq = req;
  if (token) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Handle the request and catch errors
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.status === 401) {
        console.warn('Auth Interceptor: 401 Unauthorized - logging out user');
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { sessionExpired: 'true' },
        });
      }

      // Handle 403 Forbidden - user doesn't have permission
      if (error.status === 403) {
        console.warn('Auth Interceptor: 403 Forbidden - insufficient permissions');
        const user = authService.currentUser();
        if (user) {
          // Redirect to user's own dashboard
          const dashboardPath = getDashboardPathByRole(user.role);
          router.navigate([dashboardPath]);
        } else {
          authService.logout();
        }
      }

      return throwError(() => error);
    }),
  );
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
