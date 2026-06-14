export interface LoginCredentials {
  email: string;
  password: string;
  recaptchaToken?: string; // Optional for backward compatibility
}

export enum UserRole {
  SUPERADMIN = 'superadmin',
  DEAN = 'dean',
  FACULTY = 'faculty',
  ADMIN = 'admin',
  ORGANIZATION = 'organization',
  COLLEGE_DEPARTMENT = 'college_department',
}

export interface UserProfile {
  admin_id?: number;
  dean_id?: number;
  faculty_id?: number;
  organization_id?: number;
  employee_id?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  organization_name?: string;
  email?: string;
  contact_number?: string;
  department?: string;
  description?: string;
  name?: string;
  /**
   * Faculty clearance status (auto-calculated after dean validates requirements):
   * - 'pending': Default status, requirements incomplete or awaiting validation
   * - 'cleared': All requirements validated/cleared by dean (auto-set when all complete)
   * - 'withholding': Has returned requirements needing revision (auto-set when requirements returned)
   */
  clearance_status?: 'pending' | 'cleared' | 'withholding';
  clearance_remarks?: string;
  clearance_date?: string;
}

export interface User {
  user_id: number;
  email: string;
  role: UserRole;
  profile: UserProfile;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  redirectPath: string;
}
