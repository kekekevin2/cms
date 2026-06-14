import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PersonalDataSheet {
  pds_id?: number;
  faculty_id?: number;

  // I. Personal Information
  surname: string;
  first_name: string;
  middle_name?: string;
  name_extension?: string;
  date_of_birth: string;
  place_of_birth: string;
  sex: 'Male' | 'Female';
  civil_status: 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Others';
  height?: number;
  weight?: number;
  blood_type?: string;
  gsis_id_no?: string;
  pag_ibig_id_no?: string;
  philhealth_no?: string;
  sss_no?: string;
  tin_no?: string;
  agency_employee_no?: string;
  citizenship_type: 'Filipino' | 'Dual Citizenship' | 'By Naturalization';
  dual_citizenship_country?: string;

  // Residential Address
  residential_house_no?: string;
  residential_street?: string;
  residential_subdivision?: string;
  residential_barangay?: string;
  residential_city: string;
  residential_province: string;
  residential_zip_code?: string;

  // Permanent Address
  permanent_house_no?: string;
  permanent_street?: string;
  permanent_subdivision?: string;
  permanent_barangay?: string;
  permanent_city: string;
  permanent_province: string;
  permanent_zip_code?: string;

  // Contact
  telephone_no?: string;
  mobile_no: string;
  email_address: string;

  // II. Family Background
  spouse_surname?: string;
  spouse_first_name?: string;
  spouse_middle_name?: string;
  spouse_name_ext?: string;
  spouse_occupation?: string;
  spouse_employer?: string;
  spouse_business_address?: string;
  spouse_telephone?: string;
  father_surname?: string;
  father_first_name?: string;
  father_middle_name?: string;
  father_name_ext?: string;
  mother_surname?: string;
  mother_first_name?: string;
  mother_middle_name?: string;

  // Questionnaire
  q34_a_answer?: boolean;
  q34_a_details?: string;
  q34_b_answer?: boolean;
  q34_b_details?: string;
  q35_a_answer?: boolean;
  q35_a_details?: string;
  q35_b_answer?: boolean;
  q35_b_details?: string;
  q36_answer?: boolean;
  q36_details?: string;
  q36_date_filed?: string;
  q36_case_status?: string;
  q37_answer?: boolean;
  q37_details?: string;
  q38_answer?: boolean;
  q38_details?: string;
  q39_answer?: boolean;
  q39_details?: string;
  q40_answer?: boolean;
  q40_details?: string;
  q41_answer?: boolean;
  q41_country?: string;
  q42_answer?: boolean;
  q42_group?: string;
  q43_answer?: boolean;
  q43_id_no?: string;
  q44_answer?: boolean;
  q44_id_no?: string;

  // Files
  photo_path?: string;
  signature_path?: string;
  government_issued_id?: string;
  government_id_number?: string;
  government_id_date_issued?: string;

  // Status
  status?: 'draft' | 'submitted' | 'approved' | 'returned';
  submitted_at?: string;
  approved_by?: number;
  approved_at?: string;
  remarks?: string;

  // Related data
  children?: PDSChild[];
  education?: PDSEducation[];
  eligibilities?: PDSEligibility[];
  work_experiences?: PDSWorkExperience[];
  voluntary_works?: PDSVoluntaryWork[];
  trainings?: PDSTraining[];
  other_info?: PDSOtherInfo[];
  references?: PDSReference[];
}

export interface PDSChild {
  child_id?: number;
  pds_id?: number;
  child_name: string;
  date_of_birth: string;
}

export interface PDSEducation {
  education_id?: number;
  pds_id?: number;
  level: 'ELEMENTARY' | 'SECONDARY' | 'VOCATIONAL' | 'COLLEGE' | 'GRADUATE STUDIES';
  school_name: string;
  degree_course?: string;
  period_from?: number;
  period_to?: number;
  highest_level_earned?: string;
  year_graduated?: number;
  scholarship_honors?: string;
}

export interface PDSEligibility {
  eligibility_id?: number;
  pds_id?: number;
  career_service: string;
  rating?: string;
  date_of_examination?: string;
  place_of_examination?: string;
  license_number?: string;
  license_validity?: string;
}

export interface PDSWorkExperience {
  work_experience_id?: number;
  pds_id?: number;
  date_from: string;
  date_to?: string;
  position_title: string;
  department_agency: string;
  monthly_salary?: number;
  salary_grade?: string;
  status_of_appointment?: string;
  is_government_service?: boolean;
}

export interface PDSVoluntaryWork {
  voluntary_work_id?: number;
  pds_id?: number;
  organization_name: string;
  organization_address?: string;
  date_from: string;
  date_to: string;
  number_of_hours?: number;
  position_nature_of_work: string;
}

export interface PDSTraining {
  training_id?: number;
  pds_id?: number;
  title: string;
  date_from: string;
  date_to: string;
  number_of_hours?: number;
  type_of_ld?: string;
  conducted_by: string;
}

export interface PDSOtherInfo {
  other_info_id?: number;
  pds_id?: number;
  info_type: 'SKILL' | 'RECOGNITION' | 'MEMBERSHIP';
  details: string;
}

export interface PDSReference {
  reference_id?: number;
  pds_id?: number;
  name: string;
  address: string;
  telephone_number?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PDSService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pds`;  // Fixed: Changed from /faculty/pds to /pds

  // Get faculty's PDS
  getPDS(): Observable<PersonalDataSheet> {
    return this.http.get<PersonalDataSheet>(this.apiUrl);
  }

  // Save or update PDS
  savePDS(pds: PersonalDataSheet): Observable<any> {
    return this.http.post(this.apiUrl, pds);
  }

  // Upload photo
  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post(`${this.apiUrl}/upload-photo`, formData);
  }

  // Upload signature
  uploadSignature(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('signature', file);
    return this.http.post(`${this.apiUrl}/upload-signature`, formData);
  }

  // Submit PDS for approval
  submitPDS(): Observable<any> {
    return this.http.post(`${this.apiUrl}/submit`, {});
  }

  // Import data from My Profile
  importFromProfile(): Observable<PersonalDataSheet> {
    return this.http.post<PersonalDataSheet>(`${this.apiUrl}/import-from-profile`, {});
  }
}
