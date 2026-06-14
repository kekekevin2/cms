import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AcademicYear {
  academic_year_id: number;
  year_start: number;
  year_end: number;
  is_active: boolean;
}

export interface AcademicYearsResponse {
  academicYears: AcademicYear[];
}

@Injectable({
  providedIn: 'root',
})
export class AcademicYearService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/academic-years`;

  getAcademicYears(): Observable<AcademicYearsResponse> {
    return this.http.get<AcademicYearsResponse>(this.apiUrl);
  }

  getCurrentAcademicYear(): Observable<{ academicYear: AcademicYear }> {
    return this.http.get<{ academicYear: AcademicYear }>(`${this.apiUrl}/current`);
  }
}
