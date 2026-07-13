import { Injectable } from '@angular/core';
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
  department_id: number;
  user_id: number;
  department?: {
    department_id: number | null;
    department_name: string;
    department_acronym: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
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
export class SuperadminFacultyService {
  private apiUrl = `${environment.apiUrl}/superadmin/faculty`;

  constructor(private http: HttpClient) {}

  // READ ONLY - Superadmin can only view faculty
  getFaculty(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    department_id?: number,
  ): Observable<FacultyResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search);

    if (department_id) {
      params = params.set('department_id', department_id.toString());
    }

    return this.http.get<FacultyResponse>(this.apiUrl, { params });
  }
}
