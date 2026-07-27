import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PersonalDataSheet,
  PDSChild,
  PDSEducation,
  PDSEligibility,
  PDSWorkExperience,
  PDSVoluntaryWork,
  PDSTraining,
  PDSOtherInfo,
  PDSReference,
} from '../core/pds.service';

@Injectable({
  providedIn: 'root',
})
export class DeanPDSService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dean-pds`; // Fixed: Changed from /dean/pds to /dean-pds

  // Get dean's PDS
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

  // Get faculty PDS as JSON (for client-side PDF generation)
  getFacultyPDS(facultyId: number): Observable<PersonalDataSheet> {
    return this.http.get<PersonalDataSheet>(`${this.apiUrl}/faculty/${facultyId}`);
  }
}

export type {
  PersonalDataSheet,
  PDSChild,
  PDSEducation,
  PDSEligibility,
  PDSWorkExperience,
  PDSVoluntaryWork,
  PDSTraining,
  PDSOtherInfo,
  PDSReference,
};
