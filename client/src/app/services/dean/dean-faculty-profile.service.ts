import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PersonalProfile,
  AcademicProfile,
  EmploymentProfile,
  ProfessionalMembership,
  Award,
} from '../faculty/faculty-profile.service';

export interface FacultyFullProfile {
  personal: PersonalProfile | null;
  academic: AcademicProfile[];
  employment: EmploymentProfile[];
  memberships: ProfessionalMembership[];
  awards: Award[];
  eligibilities: any[];
  coursesHandled: string[];
}

@Injectable({
  providedIn: 'root',
})
export class DeanFacultyProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dean/faculty`;

  getFacultyFullProfile(facultyId: number): Observable<FacultyFullProfile> {
    return this.http.get<FacultyFullProfile>(`${this.apiUrl}/${facultyId}/profile`);
  }
}
