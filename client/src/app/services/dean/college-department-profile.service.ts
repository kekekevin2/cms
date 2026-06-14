import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PEO {
  title: string;
  description: string;
}
export interface Program {
  name: string;
  description: string;
  icon_color: string;
}
export interface CareerOpportunity {
  program: string;
  careers: string;
}

export interface CollegeDepartmentProfile {
  college_department_id?: number;
  name?: string;
  email?: string;
  contact_number?: string;
  dean_name?: string;
  about?: string;
  goal?: string;
  why_batstateu?: string;
  peos?: PEO[] | string;
  programs?: Program[] | string;
  career_opportunities?: CareerOpportunity[] | string;
  program_outcomes?: string[] | string;
  profile_picture?: string;
  campus?: { campus_name: string };
  department?: { department_name: string; acronym: string };
}

@Injectable({ providedIn: 'root' })
export class CollegeDepartmentProfileService {
  private apiUrl = `${environment.apiUrl}/college-department`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<{ record: CollegeDepartmentProfile }> {
    return this.http.get<{ record: CollegeDepartmentProfile }>(`${this.apiUrl}/profile`);
  }

  updateProfile(
    data: Partial<CollegeDepartmentProfile>,
  ): Observable<{ message: string; record: CollegeDepartmentProfile }> {
    return this.http.put<{ message: string; record: CollegeDepartmentProfile }>(
      `${this.apiUrl}/profile`,
      data,
    );
  }

  uploadProfilePicture(file: File): Observable<{ message: string; profile_picture: string }> {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return this.http.post<{ message: string; profile_picture: string }>(
      `${this.apiUrl}/profile/picture`,
      formData,
    );
  }
}
