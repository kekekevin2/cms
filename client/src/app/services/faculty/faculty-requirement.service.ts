import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { downloadFromUrl } from '../../shared/utils/download.util';

export interface RequirementFile {
  file_id: number;
  submission_id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  upload_date: string;
}

export interface RequirementSubmission {
  submission_id: number;
  faculty_id: number;
  academic_year_id: number;
  semester: string;
  requirement_name: string;
  file_path: string; // Legacy - kept for backward compatibility
  file_name: string; // Legacy - kept for backward compatibility
  file_size: number; // Legacy - kept for backward compatibility
  submission_date: string;
  /**
   * Individual requirement submission status:
   * - 'pending': Submitted and awaiting dean review
   * - 'validated': Approved by dean
   * - 'returned': Rejected by dean, needs revision
   */
  status: 'pending' | 'validated' | 'returned';
  dean_remarks?: string;
  validated_by?: number;
  validated_date?: string;
  academic_year?: {
    academic_year_id: number;
    year_start: number;
    year_end: number;
  };
  files?: RequirementFile[]; // Multiple files per requirement
}

export interface RequirementsResponse {
  requirements: RequirementSubmission[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface Statistics {
  total_requirements: number;
  validated: number;
  pending: number;
  returned: number;
  completion_rate: number;
}

// Standard requirement types (dropdown options)
export const STANDARD_REQUIREMENTS = [
  'Certificate',
  'Instructional Materials',
  'Student Class Attendance Sheet',
  'Acknowledgement Receipt of Syllabus',
  'Acknowledgement Receipt of Exam',
  'Midterm Exam',
  'Final Exam',
  'TQS (Teaching Quality Survey)',
  'Student Exam (Highest)',
  'Student Exam (Middle)',
  'Student Exam (Lowest)',
  'Key to Correction of Midterm Exam',
  'Key to Correction of Final Exam',
  'Report of Grades',
  'Class Record',
  'Other Documents',
];

@Injectable({
  providedIn: 'root',
})
export class FacultyRequirementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/faculty/requirements`;

  // Get faculty's requirement submissions (per academic year/semester)
  getMyRequirements(
    page: number = 1,
    limit: number = 10,
    academic_year_id?: number,
    semester?: string,
    status?: string,
  ): Observable<RequirementsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (academic_year_id) {
      params = params.set('academic_year_id', academic_year_id.toString());
    }

    if (semester) {
      params = params.set('semester', semester);
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<RequirementsResponse>(this.apiUrl, { params });
  }

  // Get statistics for faculty's requirements
  getMyStatistics(academic_year_id?: number, semester?: string): Observable<Statistics> {
    let params = new HttpParams();

    if (academic_year_id) {
      params = params.set('academic_year_id', academic_year_id.toString());
    }

    if (semester) {
      params = params.set('semester', semester);
    }

    return this.http.get<Statistics>(`${this.apiUrl}/statistics`, { params });
  }

  // Submit a requirement with multiple files
  submitRequirement(
    academic_year_id: number,
    semester: string,
    requirement_name: string,
    files: File[],
  ): Observable<any> {
    const formData = new FormData();
    formData.append('academic_year_id', academic_year_id.toString());
    formData.append('semester', semester);
    formData.append('requirement_name', requirement_name);

    // Append all files
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.http.post(`${this.apiUrl}/submit`, formData);
  }

  // Add more files to existing requirement
  addFiles(submission_id: number, files: File[]): Observable<any> {
    const formData = new FormData();

    // Append all files
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.http.post(`${this.apiUrl}/${submission_id}/add-files`, formData);
  }

  // Download a specific file by file_id
  downloadSingleFile(submission_id: number, file_id: number, fileName: string): void {
    this.http
      .get<{ url: string }>(`${this.apiUrl}/${submission_id}/files/${file_id}/download`)
      .subscribe({
        next: ({ url }) => downloadFromUrl(url, fileName),
        error: (err) => console.error('Download failed', err),
      });
  }

  // Delete a specific file from a requirement
  deleteFile(submission_id: number, file_id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${submission_id}/files/${file_id}`);
  }

  // Delete a requirement submission
  deleteRequirement(submission_id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${submission_id}`);
  }

  // Download a requirement file (authenticated)
  downloadRequirement(submission_id: number, fileName?: string): void {
    this.http.get<{ url: string }>(`${this.apiUrl}/${submission_id}/download`).subscribe({
      next: ({ url }) => downloadFromUrl(url, fileName),
      error: (err) => console.error('Download failed', err),
    });
  }

  // Get the faculty's clearance status for a specific period
  getPeriodClearance(
    academic_year_id: number,
    semester: string,
  ): Observable<{ clearance: { clearance_status: string; clearance_remarks?: string; clearance_date?: string } | null }> {
    const params = new HttpParams()
      .set('academic_year_id', academic_year_id.toString())
      .set('semester', semester);
    return this.http.get<any>(`${this.apiUrl}/period-clearance`, { params });
  }
}
