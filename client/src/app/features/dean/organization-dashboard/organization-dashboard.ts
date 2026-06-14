import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeanService } from '../../../services/dean/dean.service';
import { EventAnalyticsService, SDGEventData } from '../../../services/organization/event-analytics.service';
import { SDGEventsChartComponent } from '../../../shared/components/sdg-events-chart/sdg-events-chart';

@Component({
  selector: 'app-dean-organization-dashboard',
  imports: [CommonModule, SDGEventsChartComponent],
  templateUrl: './organization-dashboard.html',
  styleUrl: './organization-dashboard.css',
})
export class DeanOrganizationDashboard implements OnInit {
  private deanService = inject(DeanService);
  private eventAnalyticsService = inject(EventAnalyticsService);

  loading = signal(false);
  sdgEventData = signal<SDGEventData[]>([]);
  statistics = signal<any>({
    totalOrganizations: 0,
    totalMembers: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    totalAdvisers: 0,
    totalEvents: 0,
  });
  recentDocuments = signal<any[]>([]);
  organizationStats = signal<any[]>([]);

  ngOnInit() {
    this.loadDashboard();
    this.loadSDGEventData();
  }

  loadSDGEventData() {
    // Changed to use reports-based analytics instead of events
    this.eventAnalyticsService.deanGetReportsBySDGPerYear().subscribe({
      next: (data: SDGEventData[]) => {
        this.sdgEventData.set(data);
      },
      error: (error: any) => {
        console.error('Failed to load SDG report data:', error);
      },
    });
  }

  loadDashboard() {
    this.loading.set(true);
    this.deanService.getOrganizationDashboard().subscribe({
      next: (response) => {
        this.statistics.set(response.statistics);
        this.recentDocuments.set(response.recentDocuments);
        this.organizationStats.set(response.organizationStats);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.loading.set(false);
      },
    });
  }

  getApprovalRate(): number {
    const stats = this.statistics();
    if (stats.totalDocuments === 0) return 0;
    return Math.round((stats.approvedDocuments / stats.totalDocuments) * 100);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      case 'revision_needed':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      case 'revision_needed':
        return 'Revision Needed';
      default:
        return status;
    }
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const submittedDate = new Date(date);
    const diffMs = now.getTime() - submittedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  getOrgInitials(name: string): string {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getMemberCount(org: any): number {
    return org.organization_members?.length || 0;
  }

  getDocumentCount(org: any): number {
    return org.organization_documents?.length || 0;
  }

  getPendingCount(org: any): number {
    return org.organization_documents?.filter((doc: any) => doc.status === 'pending').length || 0;
  }

  getFacultyName(org: any): string {
    if (!org.faculty) return 'No Faculty';
    const { first_name, middle_name, last_name } = org.faculty;
    return middle_name ? `${first_name} ${middle_name} ${last_name}` : `${first_name} ${last_name}`;
  }
}
