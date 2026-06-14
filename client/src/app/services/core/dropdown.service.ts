import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DropdownDepartment {
  department_id: number;
  department_name: string;
}

export interface DropdownProgram {
  program_id: number;
  program_name: string;
  department_id: number;
  department?: {
    department_name: string;
  };
}

export interface DropdownSection {
  section_id: number;
  section_name: string;
  year_level: number;
  semester: string;
  program_id: number;
  program?: {
    program_name: string;
    program_acronym?: string;
  };
}

export interface DropdownOrganization {
  organization_id: number;
  organization_name: string;
}

export interface DropdownAcademicYear {
  academic_year_id: number;
  year_start: number;
  year_end: number;
  is_active: number;
}

export interface DropdownPositionLevel {
  value: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  private apiUrl = `${environment.apiUrl}/dropdown`;

  constructor(private http: HttpClient) {}

  getDepartments(): Observable<DropdownDepartment[]> {
    return this.http.get<DropdownDepartment[]>(`${this.apiUrl}/departments`);
  }

  getPrograms(department_id?: number): Observable<DropdownProgram[]> {
    let params = new HttpParams();
    if (department_id) {
      params = params.set('department_id', department_id.toString());
    }
    return this.http.get<DropdownProgram[]>(`${this.apiUrl}/programs`, { params });
  }

  getSections(program_id?: number): Observable<DropdownSection[]> {
    let params = new HttpParams();
    if (program_id) {
      params = params.set('program_id', program_id.toString());
    }
    return this.http.get<DropdownSection[]>(`${this.apiUrl}/sections`, { params });
  }

  getOrganizations(): Observable<DropdownOrganization[]> {
    return this.http.get<DropdownOrganization[]>(`${this.apiUrl}/organizations`);
  }

  getAcademicYears(): Observable<DropdownAcademicYear[]> {
    return this.http.get<DropdownAcademicYear[]>(`${this.apiUrl}/academic-years`);
  }

  getPositionLevels(): Observable<DropdownPositionLevel[]> {
    return this.http.get<DropdownPositionLevel[]>(`${this.apiUrl}/position-levels`);
  }

  getDeanPositionLevels(): Observable<DropdownPositionLevel[]> {
    return this.http.get<DropdownPositionLevel[]>(`${this.apiUrl}/dean-position-levels`);
  }
}
