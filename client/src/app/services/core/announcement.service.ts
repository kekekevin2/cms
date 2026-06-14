import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Announcement {
  announcement_id: number;
  dean_id: number;
  title: string;
  content: string;
  target_department: string;
  created_at: string;
  updated_at: string;
  Dean?: {
    dean_id: number;
    first_name: string;
    last_name: string;
    department: string;
  };
  reads?: AnnouncementRead[];
  is_read?: boolean;
}

export interface AnnouncementRead {
  read_id: number;
  announcement_id: number;
  faculty_id: number;
  read_at: string;
}

export interface AnnouncementsResponse {
  announcements: Announcement[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
  totalAnnouncements: number;
  readAnnouncements: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnnouncementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/announcements`;

  // Dean methods
  createAnnouncement(
    title: string,
    content: string,
  ): Observable<{ message: string; announcement: Announcement }> {
    return this.http.post<{ message: string; announcement: Announcement }>(`${this.apiUrl}/dean`, {
      title,
      content,
    });
  }

  getDeanAnnouncements(page: number = 1, limit: number = 10): Observable<AnnouncementsResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http.get<AnnouncementsResponse>(`${this.apiUrl}/dean`, { params });
  }

  updateAnnouncement(
    announcementId: number,
    title: string,
    content: string,
  ): Observable<{ message: string; announcement: Announcement }> {
    return this.http.put<{ message: string; announcement: Announcement }>(
      `${this.apiUrl}/dean/${announcementId}`,
      { title, content },
    );
  }

  deleteAnnouncement(announcementId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/dean/${announcementId}`);
  }

  // Faculty methods
  getFacultyAnnouncements(page: number = 1, limit: number = 10): Observable<AnnouncementsResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());

    return this.http.get<AnnouncementsResponse>(`${this.apiUrl}/faculty`, { params });
  }

  markAnnouncementRead(
    announcementId: number,
  ): Observable<{ message: string; announcementRead: AnnouncementRead }> {
    return this.http.post<{ message: string; announcementRead: AnnouncementRead }>(
      `${this.apiUrl}/faculty/${announcementId}/read`,
      {},
    );
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/faculty/unread-count`);
  }
}
