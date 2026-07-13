import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Organization {
  organization_id: number;
  organization_name: string;
  description?: string;
  email?: string;
  department: string;
  faculty_id: number;
  user_id: number;
  faculty?: {
    faculty_id: number;
    employee_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  };
  organization_advisers?: OrganizationAdviser[];
}

export interface OrganizationAdviser {
  adviser_id: number;
  organization_id: number;
  faculty_id: number;
  assigned_date: string;
  is_active: boolean;
  adviser?: {
    faculty_id: number;
    employee_id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
  };
}

export interface CreateOrganizationData {
  organization_name: string;
  description?: string;
  email: string;
  adviser_id_1: number;
}

export interface CreateOrganizationResponse {
  message: string;
  organization: Organization;
  credentials: {
    email: string;
    password: string;
  };
}

export interface UpdateOrganizationData {
  organization_name: string;
  description?: string;
}

export interface OrganizationResponse {
  organizations: Organization[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeanOrganizationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dean/organizations`;

  getOrganizations(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Observable<OrganizationResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<OrganizationResponse>(this.apiUrl, { params });
  }

  createOrganization(data: CreateOrganizationData): Observable<CreateOrganizationResponse> {
    return this.http.post<CreateOrganizationResponse>(this.apiUrl, data);
  }

  updateOrganization(id: number, data: UpdateOrganizationData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteOrganization(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  assignAdviser(organizationId: number, facultyId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${organizationId}/assign-adviser`, {
      faculty_id: facultyId,
    });
  }

  removeAdviser(organizationId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${organizationId}/remove-adviser`);
  }

  resetPassword(organizationId: number): Observable<{ message: string; newPassword: string }> {
    return this.http.post<{ message: string; newPassword: string }>(
      `${this.apiUrl}/${organizationId}/reset-password`,
      {},
    );
  }
}
