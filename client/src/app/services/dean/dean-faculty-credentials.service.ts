import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { downloadFromUrl } from '../../shared/utils/download.util';

export interface FacultyWithCredentials {
  faculty_id: number;
  employee_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  department: string;
  user_id: number;
  faculty_credential?: {
    id: number;
    faculty_id: number;
    education: string;
    education_obtained_where: string;
    education_obtained_when: string;
    professional_license?: string;
    specialization: string;
    subjects_to_teach: string;
    appointment_nature: string;
    status: string;
    tor_file_path?: string;
    pds_file_path?: string;
    diploma_file_path?: string;
    created_at?: string;
    updated_at?: string;
    credential_certificates?: CredentialCertificate[];
  };
}

export interface CredentialCertificate {
  id: number;
  credential_id: number;
  certificate_name: string;
  file_path: string;
  created_at?: string;
}

export interface FacultyCredentialsResponse {
  credentials: FacultyWithCredentials[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({
  providedIn: 'root',
})
export class DeanFacultyCredentialsService {
  private apiUrl = `${environment.apiUrl}/dean/faculty-credentials`;

  constructor(private http: HttpClient) {}

  async getAllFacultyCredentials(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<FacultyCredentialsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    return firstValueFrom(this.http.get<FacultyCredentialsResponse>(this.apiUrl, { params }));
  }

  async getFacultyCredential(facultyId: number): Promise<FacultyWithCredentials> {
    return firstValueFrom(this.http.get<FacultyWithCredentials>(`${this.apiUrl}/${facultyId}`));
  }

  async downloadFile(
    facultyId: number,
    fileType: 'tor' | 'pds' | 'diploma',
    fileName: string,
  ): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.get<{ url: string }>(`${this.apiUrl}/${facultyId}/download/${fileType}`),
    );
    downloadFromUrl(url, fileName);
  }

  async downloadCertificate(
    facultyId: number,
    certificateId: number,
    fileName: string,
  ): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.get<{ url: string }>(
        `${this.apiUrl}/${facultyId}/certificate/${certificateId}/download`,
      ),
    );
    downloadFromUrl(url, fileName);
  }
}
