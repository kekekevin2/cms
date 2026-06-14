import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SuperadminStatistics {
  total_faculty: number;
  total_deans: number;
  total_organizations: number;
  total_campuses: number;
  active_campuses: number;
  total_departments: number;
  active_departments: number;
  total_college_departments: number;
  active_academic_year: string | null;
  total_files: number;
  storage_mb: number;
  files_by_status: {
    pending: number;
    returned: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminDashboardService {
  private apiUrl = `${environment.apiUrl}/superadmin/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboardStatistics(): Observable<{ success: boolean; statistics: SuperadminStatistics }> {
    return this.http.get<{ success: boolean; statistics: SuperadminStatistics }>(
      `${this.apiUrl}/statistics`,
    );
  }
}
