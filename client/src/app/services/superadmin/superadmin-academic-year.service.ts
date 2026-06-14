import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AcademicYear {
  academic_year_id: number;
  year_start: number;
  year_end: number;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicYearsResponse {
  academicYears: AcademicYear[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface CreateAcademicYearData {
  year_start: number;
  year_end: number;
  is_active?: boolean;
}

export interface UpdateAcademicYearData {
  year_start?: number;
  year_end?: number;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminAcademicYearService {
  private apiUrl = `${environment.apiUrl}/superadmin/academic-years`;

  constructor(private http: HttpClient) {}

  getAcademicYears(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    archived: boolean = false,
  ): Observable<AcademicYearsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (search) {
      params = params.set('search', search);
    }
    if (archived) {
      params = params.set('archived', 'true');
    }
    return this.http.get<AcademicYearsResponse>(this.apiUrl, { params });
  }

  createAcademicYear(
    data: CreateAcademicYearData,
  ): Observable<{ message: string; academicYear: AcademicYear }> {
    return this.http.post<{ message: string; academicYear: AcademicYear }>(this.apiUrl, data);
  }

  updateAcademicYear(
    id: number,
    data: UpdateAcademicYearData,
  ): Observable<{ message: string; academicYear: AcademicYear }> {
    return this.http.put<{ message: string; academicYear: AcademicYear }>(
      `${this.apiUrl}/${id}`,
      data,
    );
  }

  deleteAcademicYear(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
