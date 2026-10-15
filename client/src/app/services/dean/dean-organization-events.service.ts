import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { downloadFromUrl } from '../../shared/utils/download.util';
import Swal from 'sweetalert2';

export interface DeanOrganizationEvent {
  id: number;
  organization_id: number;
  organization_name: string;
  title: string;
  date_implemented: string;
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled';
  start_time?: string;
  end_time?: string;
  description?: string;
  sdgs?: number[];
  file_path?: string;
  original_filename?: string;
  file_size?: number;
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class DeanOrganizationEventsService {
  private apiUrl = `${environment.apiUrl}/dean/organization-events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<DeanOrganizationEvent[]> {
    return this.http.get<DeanOrganizationEvent[]>(this.apiUrl);
  }

  downloadEventFile(eventId: number): void {
    this.http.get<{ url: string }>(`${this.apiUrl}/${eventId}/download`).subscribe({
      next: ({ url }) => downloadFromUrl(url),
      error: (error) => {
        console.error('Download error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Download Failed',
          text: 'Failed to download file',
          confirmButtonColor: '#dc2626',
        });
      },
    });
  }
}
