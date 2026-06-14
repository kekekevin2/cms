import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GenderStats {
  male: number;
  female: number;
  not_specified: number;
}

export interface AgeRanges {
  '20-29': number;
  '30-39': number;
  '40-49': number;
  '50-59': number;
  '60+': number;
  not_specified: number;
}

export interface CivilStatusStats {
  single: number;
  married: number;
  widowed: number;
  separated: number;
  others: number;
  not_specified: number;
}

export interface CitizenshipStats {
  filipino: number;
  dual_citizenship: number;
  by_naturalization: number;
  not_specified: number;
}

export interface EducationStats {
  bachelors: number;
  masters: number;
  doctorate: number;
  not_specified: number;
}

export interface CredentialStatusStats {
  validated: number;
  pending: number;
  returned: number;
  not_submitted: number;
}

export interface CertificationStats {
  with_professional_license: number;
  with_civil_service: number;
  with_board_exam: number;
  total_certifications: number;
}

export interface AppointmentNatureStats {
  permanent: number;
  temporary: number;
  contractual: number;
  part_time: number;
  others: number;
}

export interface TrainingStats {
  total_trainings: number;
  total_hours: number;
  faculty_with_trainings: number;
  by_type: {
    managerial: number;
    supervisory: number;
    technical: number;
    others: number;
  };
}

export interface FacultyDemographics {
  total_faculty: number;
  gender: GenderStats;
  age_ranges: AgeRanges;
  civil_status: CivilStatusStats;
  citizenship: CitizenshipStats;
  education: EducationStats;
  credential_status: CredentialStatusStats;
  certifications: CertificationStats;
  professional_licenses: { [key: string]: number };
  appointment_nature: AppointmentNatureStats;
  training: TrainingStats;
}

export interface EducationLevels {
  elementary: number;
  secondary: number;
  vocational: number;
  college: number;
  graduate_studies: number;
}

export interface CurrentlyEnrolled {
  masters: number;
  doctorate: number;
}

export interface CompletedDegrees {
  bachelors: number;
  masters: number;
  doctorate: number;
}

export interface EducationAnalytics {
  total_faculty: number;
  education_levels: EducationLevels;
  currently_enrolled: CurrentlyEnrolled;
  completed_degrees: CompletedDegrees;
}

export interface ResearchAnalytics {
  total_faculty: number;
  faculty_with_publications: number;
  total_publications: number;
  percentage_with_publications: string;
}

export interface FacultyData {
  faculty_id: number;
  faculty_name: string;
  count: number;
  percentage: string;
}

export interface FacultyInvolvementResponse {
  title: string;
  subtitle: string;
  data: FacultyData[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeanAnalyticsService {
  private apiUrl = `${environment.apiUrl}/dean/analytics`;
  private facultyAnalyticsUrl = `${environment.apiUrl}/dean/faculty-analytics`;

  constructor(private http: HttpClient) {}

  getFacultyDemographics(): Observable<FacultyDemographics> {
    return this.http.get<FacultyDemographics>(`${this.apiUrl}/demographics`);
  }

  getEducationAnalytics(): Observable<EducationAnalytics> {
    return this.http.get<EducationAnalytics>(`${this.apiUrl}/education`);
  }

  getResearchAnalytics(): Observable<ResearchAnalytics> {
    return this.http.get<ResearchAnalytics>(`${this.apiUrl}/research`);
  }

  // Faculty Profile Analytics - Pie Charts
  getResearchInvolvement(academicYearId?: number): Observable<FacultyInvolvementResponse> {
    const options = academicYearId
      ? { params: { academic_year_id: academicYearId.toString() } }
      : {};
    return this.http.get<FacultyInvolvementResponse>(
      `${this.facultyAnalyticsUrl}/research-involvement`,
      options,
    );
  }

  getExtensionInvolvement(academicYearId?: number): Observable<FacultyInvolvementResponse> {
    const options = academicYearId
      ? { params: { academic_year_id: academicYearId.toString() } }
      : {};
    return this.http.get<FacultyInvolvementResponse>(
      `${this.facultyAnalyticsUrl}/extension-involvement`,
      options,
    );
  }

  getSeminarsInvolvement(academicYearId?: number): Observable<FacultyInvolvementResponse> {
    const options = academicYearId
      ? { params: { academic_year_id: academicYearId.toString() } }
      : {};
    return this.http.get<FacultyInvolvementResponse>(
      `${this.facultyAnalyticsUrl}/seminars-involvement`,
      options,
    );
  }

  // PDF Generation - Detailed Data
  getExtensionActivitiesDetails(academicYearId?: number): Observable<any> {
    const options = academicYearId
      ? { params: { academic_year_id: academicYearId.toString() } }
      : {};
    return this.http.get<any>(`${this.facultyAnalyticsUrl}/extension-activities-details`, options);
  }

  getResearchActivitiesDetails(academicYearId?: number): Observable<any> {
    const options = academicYearId
      ? { params: { academic_year_id: academicYearId.toString() } }
      : {};
    return this.http.get<any>(`${this.facultyAnalyticsUrl}/research-activities-details`, options);
  }

  getSeminarsTrainingsDetails(academicYearId?: number): Observable<any> {
    const options = academicYearId
      ? { params: { academic_year_id: academicYearId.toString() } }
      : {};
    return this.http.get<any>(`${this.facultyAnalyticsUrl}/seminars-trainings-details`, options);
  }

  // PDF Generation - Single Faculty
  getExtensionActivitiesByFaculty(facultyId: number): Observable<any> {
    return this.http.get<any>(`${this.facultyAnalyticsUrl}/extension-activities-by-faculty`, {
      params: { faculty_id: facultyId.toString() },
    });
  }

  getResearchActivitiesByFaculty(facultyId: number): Observable<any> {
    return this.http.get<any>(`${this.facultyAnalyticsUrl}/research-activities-by-faculty`, {
      params: { faculty_id: facultyId.toString() },
    });
  }

  getSeminarsTrainingsByFaculty(facultyId: number): Observable<any> {
    return this.http.get<any>(`${this.facultyAnalyticsUrl}/seminars-trainings-by-faculty`, {
      params: { faculty_id: facultyId.toString() },
    });
  }
}
