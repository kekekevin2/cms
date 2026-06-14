import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SDGEventData {
  year: number;
  sdg_number: number;
  event_count: number;
  organization_count?: number;
}

export interface EventStatistics {
  totalEvents: number;
  eventsByStatus: { status: string; count: number }[];
  totalAttendees: number;
  topSDGs: { sdg_number: number; event_count: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class EventAnalyticsService {
  private orgApiUrl = `${environment.apiUrl}/organization/events/analytics`;
  private deanApiUrl = `${environment.apiUrl}/dean/event-analytics`;

  constructor(private http: HttpClient) {}

  // Organization analytics
  getEventsBySDGPerYear(): Observable<SDGEventData[]> {
    return this.http.get<SDGEventData[]>(`${this.orgApiUrl}/sdg-per-year`);
  }

  // NEW: Get SDG data from report submissions instead of events
  getReportsBySDGPerYear(): Observable<SDGEventData[]> {
    return this.http.get<SDGEventData[]>(`${environment.apiUrl}/organization/analytics/sdg-per-year`);
  }

  getEventStatistics(): Observable<EventStatistics> {
    return this.http.get<EventStatistics>(`${this.orgApiUrl}/statistics`);
  }

  // Dean analytics - Get reports by SDG per year from organization documents
  deanGetReportsBySDGPerYear(): Observable<SDGEventData[]> {
    return this.http.get<SDGEventData[]>(`${environment.apiUrl}/organization/analytics/dean/sdg-per-year`);
  }

  // Deprecated: Old event-based method (kept for backward compatibility)
  deanGetEventsBySDGPerYear(): Observable<SDGEventData[]> {
    return this.http.get<SDGEventData[]>(`${this.deanApiUrl}/sdg-per-year`);
  }
}
