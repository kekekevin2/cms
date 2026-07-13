import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Dean {
  dean_id: number;
  user_id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  contact_number: string;
  department?: string;
  created_at: string;
  updated_at: string;
  user: {
    user_id: number;
    email: string;
    role: string;
  };
}

export interface DeansResponse {
  deans: Dean[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateDeanData {
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  contact_number: string;
  department?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DeanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/deans`;
  private deanApiUrl = `${environment.apiUrl}/dean`;

  getDeans(page: number = 1, limit: number = 10): Observable<DeansResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http.get<DeansResponse>(this.apiUrl, { params });
  }

  createDean(data: CreateDeanData): Observable<{ message: string; dean: Dean }> {
    return this.http.post<{ message: string; dean: Dean }>(this.apiUrl, data);
  }

  updateDean(id: number, data: CreateDeanData): Observable<{ message: string; dean: Dean }> {
    return this.http.put<{ message: string; dean: Dean }>(`${this.apiUrl}/${id}`, data);
  }

  deleteDean(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  // Dean-specific methods
  getProfile(): Observable<Dean> {
    return this.http.get<Dean>(`${this.deanApiUrl}/dashboard/profile`);
  }

  getOrganizations(): Observable<{ organizations: any[] }> {
    return this.http.get<{ organizations: any[] }>(`${this.deanApiUrl}/organizations`);
  }

  getFaculty(): Observable<{ faculty: any[] }> {
    return this.http.get<{ faculty: any[] }>(`${this.deanApiUrl}/faculty`);
  }

  getOrganizationDashboard(organizationId?: number): Observable<any> {
    let params = new HttpParams();
    if (organizationId != null) {
      params = params.set('organizationId', organizationId.toString());
    }
    return this.http.get<any>(`${this.deanApiUrl}/dashboard/organizations/dashboard`, {
      params,
    });
  }
}
