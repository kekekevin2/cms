import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Faculty {
  faculty_id: number;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  department: string;
  position_level?: string;
  user_id: number;
}

export interface CreateFacultyData {
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  position_level?: string;
}

export interface UpdateFacultyData {
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  position_level?: string;
}

export interface FacultyResponse {
  faculty: Faculty[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeanFacultyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dean/faculty`;

  getFaculty(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Observable<FacultyResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<FacultyResponse>(this.apiUrl, { params });
  }

  createFaculty(data: CreateFacultyData): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateFaculty(id: number, data: UpdateFacultyData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteFaculty(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  resetPassword(facultyId: number): Observable<{ message: string; newPassword: string }> {
    return this.http.post<{ message: string; newPassword: string }>(
      `${this.apiUrl}/${facultyId}/reset-password`,
      {},
    );
  }

  // Get disabled faculty
  getDisabledFaculty(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Observable<FacultyResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<FacultyResponse>(`${this.apiUrl}/disabled`, { params });
  }

  // Disable faculty account (soft delete)
  disableFaculty(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/disable`, {});
  }

  // Restore disabled faculty account
  restoreFaculty(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/restore`, {});
  }

  // Permanently delete faculty (only for disabled accounts)
  permanentlyDeleteFaculty(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
