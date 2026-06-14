import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Department {
  department_id: number;
  campus_id: number;
  department_name: string;
  acronym?: string;
  is_active: boolean;
  campus?: { campus_id: number; campus_name: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentsResponse {
  departments: Department[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateDepartmentData {
  campus_id: number;
  department_name: string;
  acronym?: string;
  is_active?: boolean;
}

export interface UpdateDepartmentData {
  department_name?: string;
  acronym?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminDepartmentService {
  private apiUrl = `${environment.apiUrl}/superadmin/departments`;

  constructor(private http: HttpClient) {}

  getDepartments(
    campusId: number | null = null,
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Observable<DepartmentsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    if (campusId) {
      params = params.set('campus_id', campusId.toString());
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<DepartmentsResponse>(this.apiUrl, { params });
  }

  createDepartment(
    data: CreateDepartmentData,
  ): Observable<{ message: string; department: Department }> {
    return this.http.post<{ message: string; department: Department }>(this.apiUrl, data);
  }

  updateDepartment(
    id: number,
    data: UpdateDepartmentData,
  ): Observable<{ message: string; department: Department }> {
    return this.http.put<{ message: string; department: Department }>(`${this.apiUrl}/${id}`, data);
  }

  deleteDepartment(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
