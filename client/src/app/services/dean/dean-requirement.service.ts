import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RequirementSubmission } from '../faculty/faculty-requirement.service';
import { downloadFromUrl } from '../../shared/utils/download.util';

export interface RequirementsResponse {
  requirements: RequirementSubmission[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface FacultyRequirementsResponse {
  faculty: {
    faculty_id: number;
    employee_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    clearance_status?: 'pending' | 'cleared' | 'withholding';
    clearance_remarks?: string;
    clearance_date?: string;
  };
  requirements: RequirementSubmission[];
  period_clearance: {
    clearance_status: 'pending' | 'cleared' | 'withholding';
    clearance_remarks?: string;
    clearance_date?: string;
  } | null;
  statistics: {
    total_requirements: number;
    validated: number;
    pending: number;
    returned: number;
    completion_rate: string;
  };
}

export interface DepartmentStatistics {
  total_faculty: number;
  cleared_faculties: number;
  withholding_faculties: number;
  pending_faculties: number;
  total_requirements: number;
  validated: number;
  pending: number;
  returned: number;
  completion_rate: string;
  faculty_clearance_rate: string;
}

@Injectable({
  providedIn: 'root',
})
export class DeanRequirementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dean/requirements`;

  // Get all requirement submissions for dean's department
  getAllRequirements(
    page: number = 1,
    limit: number = 10,
    faculty_id?: number,
    academic_year_id?: number,
    semester?: string,
    status?: string,
    search?: string,
  ): Observable<RequirementsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (faculty_id) {
      params = params.set('faculty_id', faculty_id.toString());
    }

    if (academic_year_id) {
      params = params.set('academic_year_id', academic_year_id.toString());
    }

    if (semester) {
      params = params.set('semester', semester);
    }

    if (status) {
      params = params.set('status', status);
    }

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<RequirementsResponse>(this.apiUrl, { params });
  }

  // Get department-wide statistics
  getDepartmentStatistics(
    academic_year_id?: number,
    semester?: string,
  ): Observable<DepartmentStatistics> {
    let params = new HttpParams();

    if (academic_year_id) {
      params = params.set('academic_year_id', academic_year_id.toString());
    }

    if (semester) {
      params = params.set('semester', semester);
    }

    return this.http.get<DepartmentStatistics>(`${this.apiUrl}/statistics`, { params });
  }

  // Get faculty requirements summary
  getFacultyRequirements(
    faculty_id: number,
    academic_year_id?: number,
    semester?: string,
  ): Observable<FacultyRequirementsResponse> {
    let params = new HttpParams();

    if (academic_year_id) {
      params = params.set('academic_year_id', academic_year_id.toString());
    }

    if (semester) {
      params = params.set('semester', semester);
    }

    return this.http.get<FacultyRequirementsResponse>(
      `${this.apiUrl}/faculty/${faculty_id}`,
      { params },
    );
  }

  // Validate a requirement (approve)
  validateRequirement(submission_id: number, remarks?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${submission_id}/validate`, { remarks });
  }

  // Return a requirement (needs revision)
  returnRequirement(submission_id: number, remarks: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${submission_id}/return`, { remarks });
  }

  // Download a requirement file (authenticated)
  downloadRequirement(submission_id: number, fileName?: string): void {
    this.http.get<{ url: string }>(`${this.apiUrl}/${submission_id}/download`).subscribe({
      next: ({ url }) => downloadFromUrl(url, fileName),
      error: (err) => console.error('Download failed', err),
    });
  }

  // Set faculty clearance status (manual override)
  setFacultyClearanceStatus(
    faculty_id: number,
    status: 'pending' | 'cleared' | 'withholding',
    remarks?: string,
    academic_year_id?: number,
    semester?: string,
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/faculty/${faculty_id}/clearance-status`, {
      status,
      remarks,
      academic_year_id,
      semester,
    });
  }
}
