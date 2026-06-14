import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CollegeDepartment {
  college_department_id: number;
  name: string;
  email: string;
  contact_number: string | null;
  campus_id: number | null;
  department_id: number | null;
  dean_name: string | null;
  is_active: boolean;
  campus?: { campus_id: number; campus_name: string };
  department?: { department_id: number; department_name: string; acronym?: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface CollegeDepartmentsResponse {
  collegeDepartments: CollegeDepartment[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateCollegeDepartmentData {
  name: string;
  email: string;
  contact_number?: string | null;
  campus_id?: number | null;
  department_id?: number | null;
  dean_name?: string | null;
  is_active?: boolean;
}

export interface UpdateCollegeDepartmentData {
  name?: string;
  email?: string;
  contact_number?: string | null;
  campus_id?: number | null;
  department_id?: number | null;
  dean_name?: string | null;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SuperadminCollegeDepartmentService {
  private apiUrl = `${environment.apiUrl}/superadmin/college-departments`;

  constructor(private http: HttpClient) {}

  getCollegeDepartments(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    campusId: number | null = null,
  ): Observable<CollegeDepartmentsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (search) params = params.set('search', search);
    if (campusId) params = params.set('campus_id', campusId.toString());
    return this.http.get<CollegeDepartmentsResponse>(this.apiUrl, { params });
  }

  createCollegeDepartment(
    data: CreateCollegeDepartmentData,
  ): Observable<{ message: string; record: CollegeDepartment }> {
    return this.http.post<{ message: string; record: CollegeDepartment }>(this.apiUrl, data);
  }

  updateCollegeDepartment(
    id: number,
    data: UpdateCollegeDepartmentData,
  ): Observable<{ message: string; record: CollegeDepartment }> {
    return this.http.put<{ message: string; record: CollegeDepartment }>(
      `${this.apiUrl}/${id}`,
      data,
    );
  }

  deleteCollegeDepartment(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
