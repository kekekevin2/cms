import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../services/auth/auth';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { getDashboardPathByRole } from '../guards/dashboard-path';

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
        const dashboardPath = getDashboardPathByRole(authService.currentUser()?.role);
        if (dashboardPath) {
          // Redirect to user's own dashboard
          router.navigate([dashboardPath]);
        } else {
          authService.logout();
        }
      }

      return throwError(() => error);
    }),
  );
};
