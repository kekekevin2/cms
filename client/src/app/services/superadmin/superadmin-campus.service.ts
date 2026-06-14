import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Campus {
  campus_id: number;
  campus_name: string;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CampusesResponse {
  campuses: Campus[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateCampusData {
  campus_name: string;
  is_active?: boolean;
}

export interface UpdateCampusData {
  campus_name?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminCampusService {
  private apiUrl = `${environment.apiUrl}/superadmin/campuses`;

  constructor(private http: HttpClient) {}

  getCampuses(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Observable<CampusesResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<CampusesResponse>(this.apiUrl, { params });
  }

  getAllCampuses(): Observable<CampusesResponse> {
    const params = new HttpParams().set('page', '1').set('limit', '1000');
    return this.http.get<CampusesResponse>(this.apiUrl, { params });
  }

  createCampus(data: CreateCampusData): Observable<{ message: string; campus: Campus }> {
    return this.http.post<{ message: string; campus: Campus }>(this.apiUrl, data);
  }

  updateCampus(
    id: number,
    data: UpdateCampusData,
  ): Observable<{ message: string; campus: Campus }> {
    return this.http.put<{ message: string; campus: Campus }>(`${this.apiUrl}/${id}`, data);
  }

  deleteCampus(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
