import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { downloadFromUrl } from '../../shared/utils/download.util';
import Swal from 'sweetalert2';

export interface OrganizationEvent {
  id?: number;
  organization_id?: number;
  title: string;
  date_implemented: string;
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled';
  start_time?: string;
  end_time?: string;
  description?: string;
  sdgs?: number[];
  guests?: EventGuest[];
  file_path?: string;
  original_filename?: string;
  file_size?: number;
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventGuest {
  id?: number;
  event_id?: number;
  guest_name: string;
  guest_title?: string;
  guest_affiliation?: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrganizationEventService {
  private apiUrl = `${environment.apiUrl}/organization/events`;

  constructor(private http: HttpClient) {}

  getEvents(): Observable<OrganizationEvent[]> {
    return this.http.get<OrganizationEvent[]>(this.apiUrl);
  }

  getEvent(id: number): Observable<OrganizationEvent> {
    return this.http.get<OrganizationEvent>(`${this.apiUrl}/${id}`);
  }

  createEvent(eventData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, eventData);
  }

  updateEvent(id: number, eventData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, eventData);
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
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
