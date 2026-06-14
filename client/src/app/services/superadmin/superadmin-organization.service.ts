import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SuperadminOrganization {
  organization_id: number;
  organization_name: string;
  description?: string;
  department: string;
  faculty_id: number;
  user_id: number;
  user?: {
    email: string;
  };
  organization_advisers?: Array<{
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
    Faculty?: {
      faculty_id: number;
      employee_id: string;
      first_name: string;
      middle_name?: string;
      last_name: string;
      email: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationListResponse {
  organizations: SuperadminOrganization[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminOrganizationService {
  private apiUrl = `${environment.apiUrl}/superadmin/organizations`;

  constructor(private http: HttpClient) {}

  getOrganizations(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    department: string = '',
  ): Observable<OrganizationListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search);

    if (department) {
      params = params.set('department', department);
    }

    return this.http.get<OrganizationListResponse>(this.apiUrl, { params });
  }
}
