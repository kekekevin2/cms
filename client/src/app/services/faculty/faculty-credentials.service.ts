import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { downloadFromUrl } from '../../shared/utils/download.util';

export interface FacultyCredential {
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
  certificates?: CredentialCertificate[];
  created_at?: string;
  updated_at?: string;
}

export interface CredentialCertificate {
  id: number;
  credential_id: number;
  certificate_name: string;
  file_path: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FacultyCredentialsService {
  private apiUrl = `${environment.apiUrl}/faculty/credentials`;

  constructor(private http: HttpClient) {}

  async saveCredentials(formData: FormData): Promise<any> {
    return firstValueFrom(this.http.post(this.apiUrl, formData));
  }

  async getCredentials(): Promise<FacultyCredential> {
    return firstValueFrom(this.http.get<FacultyCredential>(this.apiUrl));
  }

  async updateCredentials(formData: FormData): Promise<any> {
    return firstValueFrom(this.http.put(this.apiUrl, formData));
  }

  async downloadFile(fileType: 'tor' | 'pds' | 'diploma', fileName: string): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.get<{ url: string }>(`${this.apiUrl}/download/${fileType}`),
    );
    downloadFromUrl(url, fileName);
  }

  async downloadCertificate(certificateId: string, fileName: string): Promise<void> {
    const { url } = await firstValueFrom(
      this.http.get<{ url: string }>(`${this.apiUrl}/download/certificate/${certificateId}`),
    );
    downloadFromUrl(url, fileName);
  }
}
