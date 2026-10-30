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
  /** PDS education rows, used when the academic profile has no entries */
  pdsEducation?: { level: string; degree_course?: string; school_name?: string; year_graduated?: number; scholarship_honors?: string; highest_level_earned?: string }[];
  coursesHandled: string[];
  /** Viewable URL of the best available photo (profile picture, passport photo, PDS photo…) */
  photoUrl?: string | null;
  /** Fresh faculty record, including the fields the profile cover prints */
  faculty?: {
    employee_id?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    extension_name?: string | null;
    academic_rank?: string;
    employment_status?: string | null;
    designation?: string | null;
    birth_date?: string;
    civil_status?: string;
    position_level?: string;
    contact_number?: string;
    email?: string;
    department?: string;
  };
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
