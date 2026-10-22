/**
 * Dashboard route for each role — the single copy used by loginGuard, roleGuard and the auth
 * interceptor (they each had their own and drifted: two were missing college_department, which
 * sent logged-in department users from /login back to /login forever).
 *
 * Returns null for a role with no dashboard; callers must log the user out instead of sending
 * them to /login while still logged in, or loginGuard would bounce them straight back.
 */
export function getDashboardPathByRole(role: string | undefined | null): string | null {
  switch (role) {
    case 'superadmin':
      return '/superadmin/dashboard';
    case 'admin':
      return '/admin/dashboard';
    case 'dean':
    case 'college_department':
      return '/department/dashboard';
    case 'faculty':
      return '/faculty/dashboard';
    case 'organization':
      return '/organization/dashboard';
    default:
      return null;
  }
}
