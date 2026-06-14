import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FacultyMember {
  faculty_id: number;
  employee_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
}

export interface NotificationRequest {
  faculty_ids: number[];
  subject: string;
  message: string;
}

export interface NotificationResult {
  faculty_id: number;
  name: string;
  email: string;
  success: boolean;
  error: string | null;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  results: {
    total: number;
    successful: number;
    failed: number;
  };
  details: NotificationResult[];
}

@Injectable({
  providedIn: 'root',
})
export class DeanFacultyNotificationService {
  private apiUrl = `${environment.apiUrl}/dean/faculty-notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Get list of faculty members in dean's department
   */
  getFacultyList(): Observable<{ success: boolean; faculty: FacultyMember[]; total: number }> {
    return this.http.get<{ success: boolean; faculty: FacultyMember[]; total: number }>(
      `${this.apiUrl}/faculty-list`
    );
  }

  /**
   * Send notification to selected faculty members
   */
  sendNotification(notification: NotificationRequest): Observable<NotificationResponse> {
    return this.http.post<NotificationResponse>(`${this.apiUrl}/send`, notification);
  }
}
