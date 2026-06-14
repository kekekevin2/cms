import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Dean {
  dean_id: number;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  department: string;
  position_level?: string;
  user_id: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeansResponse {
  deans: Dean[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateDeanData {
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  department: string;
  position_level?: string;
}

export interface UpdateDeanData {
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  department: string;
  position_level?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminDeanService {
  private apiUrl = `${environment.apiUrl}/superadmin/deans`;

  constructor(private http: HttpClient) {}

  getDeans(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    department?: string,
  ): Observable<DeansResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    if (department) {
      params = params.set('department', department);
    }

    return this.http.get<DeansResponse>(this.apiUrl, { params });
  }

  createDean(
    data: CreateDeanData,
  ): Observable<{ message: string; dean: Dean; emailSent: boolean; generatedPassword?: string }> {
    return this.http.post<{
      message: string;
      dean: Dean;
      emailSent: boolean;
      generatedPassword?: string;
    }>(this.apiUrl, data);
  }

  updateDean(id: number, data: UpdateDeanData): Observable<{ message: string; dean: Dean }> {
    return this.http.put<{ message: string; dean: Dean }>(`${this.apiUrl}/${id}`, data);
  }

  deleteDean(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
