import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces
export interface CVLAttachment {
  id: number;
  attachment: string;
  title: string;
  date_created?: string;
  semester?: string;
  academic_year_id?: number;
  filename: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface CVLDocument {
  id: number;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface CVLAttachmentsResponse {
  cvlAttachments: CVLAttachment[];
}

export interface CVLAttachmentCreateResponse {
  message: string;
  attachments: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CVLAttachmentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/organization/dashboard`;

  // Get all CVL attachments
  getCVLAttachments(): Observable<CVLAttachmentsResponse> {
    return this.http.get<CVLAttachmentsResponse>(`${this.apiUrl}/cvl-attachments`);
  }

  // Create new CVL attachment (upload)
  createCVLAttachment(formData: FormData): Observable<CVLAttachmentCreateResponse> {
    return this.http.post<CVLAttachmentCreateResponse>(`${this.apiUrl}/cvl-attachments`, formData);
  }

  // Update CVL attachment
  updateCVLAttachment(attachmentType: string, formData: FormData): Observable<CVLAttachmentCreateResponse> {
    const encodedType = encodeURIComponent(attachmentType);
    return this.http.put<CVLAttachmentCreateResponse>(`${this.apiUrl}/cvl-attachments/${encodedType}`, formData);
  }

  // Delete CVL attachment
  deleteCVLAttachment(attachmentType: string): Observable<{ message: string }> {
    const encodedType = encodeURIComponent(attachmentType);
    return this.http.delete<{ message: string }>(`${this.apiUrl}/cvl-attachments/${encodedType}`);
  }

  // Delete CVL attachment by ID
  deleteCVLAttachmentById(fileId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/cvl-attachments/file/${fileId}`);
  }

  // Download CVL attachment files
  downloadCVLAttachment(attachmentType: string): Observable<Blob> {
    const encodedType = encodeURIComponent(attachmentType);
    return this.http.get(`${this.apiUrl}/cvl-attachments/${encodedType}/download`, {
      responseType: 'blob'
    });
  }

  // Download single file by ID
  downloadCVLFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/cvl-attachments/file/${fileId}/download`, {
      responseType: 'blob'
    });
  }
}
