import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Personal Profile Interface
export interface PersonalProfile {
  id?: number;
  faculty_id?: number;
  title?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  extension?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  civil_status?: string;
  sex?: string;
  citizenship?: string;
  mobile_primary?: string;
  mobile_secondary?: string;
  email_primary?: string;
  email_secondary?: string;
  home_country?: string;
  home_region?: string;
  home_province?: string;
  home_barangay?: string;
  home_street_subdivision?: string;
  home_zip_code?: string;
  profile_picture?: string;
  passport_photo?: string;
}

// Academic Profile Interface
export interface AcademicProfile {
  id?: number;
  faculty_id?: number;
  level?: string;
  school_name?: string;
  degree_course?: string;
  year_graduated?: number;
  units_earned?: number;
  year_from?: number;
  year_to?: number;
  honors_received?: string;
}

// Employment Profile Interface
export interface EmploymentProfile {
  id?: number;
  faculty_id?: number;
  position_title?: string;
  company_name?: string;
  employment_status?: string;
  salary_grade?: string;
  monthly_salary?: number;
  date_from?: string;
  date_to?: string;
  is_current?: boolean;
  is_government_service?: boolean;
}

// Professional Membership Interface
export interface ProfessionalMembership {
  id?: number;
  faculty_id?: number;
  organization_name?: string;
  position?: string;
  membership_type?: string;
  date_joined?: string;
  date_ended?: string;
  is_lifetime?: boolean;
}

// Award Interface
export interface Award {
  id?: number;
  faculty_id?: number;
  award_title?: string;
  awarding_body?: string;
  date_received?: string;
  level?: string;
  description?: string;
  certificate_file?: string;
}

// Seminar/Training Interface
export interface SeminarTraining {
  id?: number;
  faculty_id?: number;
  title?: string;
  category?: string;
  date?: string;
  sponsoring_agency?: string;
  training_provider?: string;
  certificate_file?: string;
}

// Research Activity Interface
export interface ResearchActivity {
  id?: number;
  faculty_id?: number;
  research_title?: string;
  category?: string;
  date?: string;
  sponsoring_agency?: string;
  certificate_file?: string;
}

// Extension Activity Interface
export interface ExtensionActivity {
  id?: number;
  faculty_id?: number;
  extension_title?: string;
  date_of_implementation?: string;
  beneficiary?: string;
  location?: string;
  documentation_file?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FacultyProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/faculty/profile`;

  // ==================== PERSONAL PROFILE ====================
  getPersonalProfile(): Observable<{ profile: PersonalProfile }> {
    return this.http.get<{ profile: PersonalProfile }>(`${this.apiUrl}/personal`);
  }

  upsertPersonalProfile(data: FormData): Observable<{ message: string; profile: PersonalProfile }> {
    return this.http.post<{ message: string; profile: PersonalProfile }>(
      `${this.apiUrl}/personal`,
      data,
    );
  }

  // ==================== ACADEMIC PROFILE ====================
  getAcademicProfiles(): Observable<{ profiles: AcademicProfile[] }> {
    return this.http.get<{ profiles: AcademicProfile[] }>(`${this.apiUrl}/academic`);
  }

  createAcademicProfile(
    data: AcademicProfile,
  ): Observable<{ message: string; profile: AcademicProfile }> {
    return this.http.post<{ message: string; profile: AcademicProfile }>(
      `${this.apiUrl}/academic`,
      data,
    );
  }

  updateAcademicProfile(
    id: number,
    data: AcademicProfile,
  ): Observable<{ message: string; profile: AcademicProfile }> {
    return this.http.put<{ message: string; profile: AcademicProfile }>(
      `${this.apiUrl}/academic/${id}`,
      data,
    );
  }

  deleteAcademicProfile(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/academic/${id}`);
  }

  // ==================== EMPLOYMENT PROFILE ====================
  getEmploymentProfiles(): Observable<{ profiles: EmploymentProfile[] }> {
    return this.http.get<{ profiles: EmploymentProfile[] }>(`${this.apiUrl}/employment`);
  }

  createEmploymentProfile(
    data: EmploymentProfile,
  ): Observable<{ message: string; profile: EmploymentProfile }> {
    return this.http.post<{ message: string; profile: EmploymentProfile }>(
      `${this.apiUrl}/employment`,
      data,
    );
  }

  updateEmploymentProfile(
    id: number,
    data: EmploymentProfile,
  ): Observable<{ message: string; profile: EmploymentProfile }> {
    return this.http.put<{ message: string; profile: EmploymentProfile }>(
      `${this.apiUrl}/employment/${id}`,
      data,
    );
  }

  deleteEmploymentProfile(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/employment/${id}`);
  }

  // ==================== PROFESSIONAL MEMBERSHIP ====================
  getProfessionalMemberships(): Observable<{ memberships: ProfessionalMembership[] }> {
    return this.http.get<{ memberships: ProfessionalMembership[] }>(`${this.apiUrl}/membership`);
  }

  createProfessionalMembership(
    data: ProfessionalMembership,
  ): Observable<{ message: string; membership: ProfessionalMembership }> {
    return this.http.post<{ message: string; membership: ProfessionalMembership }>(
      `${this.apiUrl}/membership`,
      data,
    );
  }

  updateProfessionalMembership(
    id: number,
    data: ProfessionalMembership,
  ): Observable<{ message: string; membership: ProfessionalMembership }> {
    return this.http.put<{ message: string; membership: ProfessionalMembership }>(
      `${this.apiUrl}/membership/${id}`,
      data,
    );
  }

  deleteProfessionalMembership(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/membership/${id}`);
  }

  // ==================== AWARDS ====================
  getAwards(): Observable<{ awards: Award[] }> {
    return this.http.get<{ awards: Award[] }>(`${this.apiUrl}/awards`);
  }

  createAward(data: FormData): Observable<{ message: string; award: Award }> {
    return this.http.post<{ message: string; award: Award }>(`${this.apiUrl}/awards`, data);
  }

  updateAward(id: number, data: FormData): Observable<{ message: string; award: Award }> {
    return this.http.put<{ message: string; award: Award }>(`${this.apiUrl}/awards/${id}`, data);
  }

  deleteAward(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/awards/${id}`);
  }

  // ==================== SEMINARS/TRAININGS ====================
  getSeminarsTrainings(): Observable<{ seminars: SeminarTraining[] }> {
    return this.http.get<{ seminars: SeminarTraining[] }>(`${this.apiUrl}/seminars`);
  }

  createSeminarTraining(data: FormData): Observable<{ message: string; seminar: SeminarTraining }> {
    return this.http.post<{ message: string; seminar: SeminarTraining }>(
      `${this.apiUrl}/seminars`,
      data,
    );
  }

  updateSeminarTraining(
    id: number,
    data: FormData,
  ): Observable<{ message: string; seminar: SeminarTraining }> {
    return this.http.put<{ message: string; seminar: SeminarTraining }>(
      `${this.apiUrl}/seminars/${id}`,
      data,
    );
  }

  deleteSeminarTraining(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/seminars/${id}`);
  }

  // ==================== RESEARCH ACTIVITIES ====================
  getResearchActivities(): Observable<{ activities: ResearchActivity[] }> {
    return this.http.get<{ activities: ResearchActivity[] }>(`${this.apiUrl}/research`);
  }

  createResearchActivity(
    data: FormData,
  ): Observable<{ message: string; activity: ResearchActivity }> {
    return this.http.post<{ message: string; activity: ResearchActivity }>(
      `${this.apiUrl}/research`,
      data,
    );
  }

  updateResearchActivity(
    id: number,
    data: FormData,
  ): Observable<{ message: string; activity: ResearchActivity }> {
    return this.http.put<{ message: string; activity: ResearchActivity }>(
      `${this.apiUrl}/research/${id}`,
      data,
    );
  }

  deleteResearchActivity(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/research/${id}`);
  }

  // ==================== EXTENSION ACTIVITIES ====================
  getExtensionActivities(): Observable<{ activities: ExtensionActivity[] }> {
    return this.http.get<{ activities: ExtensionActivity[] }>(`${this.apiUrl}/extension`);
  }

  createExtensionActivity(
    data: FormData,
  ): Observable<{ message: string; activity: ExtensionActivity }> {
    return this.http.post<{ message: string; activity: ExtensionActivity }>(
      `${this.apiUrl}/extension`,
      data,
    );
  }

  updateExtensionActivity(
    id: number,
    data: FormData,
  ): Observable<{ message: string; activity: ExtensionActivity }> {
    return this.http.put<{ message: string; activity: ExtensionActivity }>(
      `${this.apiUrl}/extension/${id}`,
      data,
    );
  }

  deleteExtensionActivity(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/extension/${id}`);
  }
}
