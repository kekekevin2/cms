import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth/auth';
import { ThemeService } from '../../../services/theme/theme.service';
import { OrganizationService } from '../../../services/organization/organization.service';
import { OrganizationEventService } from '../../../services/organization/organization-event.service';
import { EventAnalyticsService, SDGEventData } from '../../../services/organization/event-analytics.service';
import { OrganizationMembersComponent } from '../../organization/members/organization-members';
import { OrganizationDocumentsComponent } from '../../organization/documents/organization-documents';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';
import { SDGEventsChartComponent } from '../../../shared/components/sdg-events-chart/sdg-events-chart';

interface OrganizationStats {
  approvedEvents: number;
  pendingEvents: number;
  totalMembers: number;
  activeMembers?: number;
  documentsSubmitted: number;
  documentsPending: number;
  documentsApproved: number;
  documentsRejected: number;
  membersByPosition: { position: string; count: number }[];
  membersByYearLevel: { year: string; count: number }[];
}

@Component({
  selector: 'app-organization-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OrganizationMembersComponent,
    OrganizationDocumentsComponent,
    ChangePasswordModal,
    SDGEventsChartComponent,
  ],
  templateUrl: './organization.html',
})
export class OrganizationDashboard implements OnInit {
  authService = inject(Auth);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private organizationService = inject(OrganizationService);
  private eventService = inject(OrganizationEventService);
  private eventAnalyticsService = inject(EventAnalyticsService);

  activeTab = signal<'dashboard' | 'members' | 'documents' | 'advisers' | 'events'>('dashboard');
  dashboardTab = signal<'analytics' | 'demographics'>('analytics');
  isSidebarOpen = signal(true);
  isUserMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);

  organizationName = signal('');
  advisers = signal<any[]>([]);
  sdgEventData = signal<SDGEventData[]>([]);
  stats = signal<OrganizationStats>({
    approvedEvents: 0,
    pendingEvents: 0,
    totalMembers: 0,
    documentsSubmitted: 0,
    documentsPending: 0,
    documentsApproved: 0,
    documentsRejected: 0,
    membersByPosition: [],
    membersByYearLevel: [],
  });
  demographics = signal<any>({
    maleCount: 0,
    femaleCount: 0,
    malePercentage: 0,
    femalePercentage: 0,
    byProgram: [],
  });
  demographicsAcademicYear = signal<number | undefined>(undefined);
  demographicsSemester = signal<string | undefined>(undefined);
  demographicsActiveOnly = signal(true);
  loading = signal(false);

  ngOnInit() {
    const userInfo = this.authService.currentUser();
    if (userInfo && userInfo.profile && userInfo.profile.organization_name) {
      this.organizationName.set(userInfo.profile.organization_name);
    }
    this.loadAdvisers();
    this.loadStatistics();
    this.loadSDGEventData();
  }

  loadSDGEventData() {
    // Changed from getEventsBySDGPerYear to getReportsBySDGPerYear
    // Now gets SDG data from report submissions instead of events
    this.eventAnalyticsService.getReportsBySDGPerYear().subscribe({
      next: (data) => {
        this.sdgEventData.set(data);
      },
      error: (error) => {
        console.error('Failed to load SDG report data:', error);
      },
    });
  }

  selectTab(tab: 'dashboard' | 'members' | 'documents' | 'advisers' | 'events') {
    this.activeTab.set(tab);
    if (tab === 'advisers') {
      this.loadAdvisers();
    } else if (tab === 'dashboard') {
      this.loadStatistics();
      if (this.dashboardTab() === 'demographics') {
        this.loadDemographics();
      }
    }
  }

  selectDashboardTab(tab: 'analytics' | 'demographics') {
    this.dashboardTab.set(tab);
    if (tab === 'demographics') {
      this.loadDemographics();
    }
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleUserMenu() {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  getPageTitle(): string {
    switch (this.activeTab()) {
      case 'dashboard':
        return 'Dashboard';
      case 'members':
        return 'Members Management';
      case 'documents':
        return 'Document Submission';
      case 'events':
        return 'Events Management';
      case 'advisers':
        return 'Organization Advisers';
      default:
        return 'Organization Portal';
    }
  }

  loadAdvisers() {
    this.organizationService.getAdvisers().subscribe({
      next: (response) => {
        this.advisers.set(response.advisers);
      },
      error: (error) => {
        console.error('Failed to load advisers:', error);
      },
    });
  }

  loadStatistics() {
    this.loading.set(true);

    // Load events statistics
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.stats.update((s) => ({
          ...s,
          approvedEvents: events.length,
          pendingEvents: 0,
        }));
      },
      error: (error) => {
        console.error('Failed to load events:', error);
      },
    });

    // Load members and documents to calculate statistics
    this.organizationService.getMembers(1, 999).subscribe({
      next: (response) => {
        const members = response.members;
        const activeMembers = members.filter((m: any) => m.is_active).length;

        // Count by position
        const positionCounts: { [key: string]: number } = {};
        members.forEach((m: any) => {
          positionCounts[m.position] = (positionCounts[m.position] || 0) + 1;
        });

        // Count by year level
        const yearCounts: { [key: string]: number } = {};
        members.forEach((m: any) => {
          yearCounts[m.year_level] = (yearCounts[m.year_level] || 0) + 1;
        });

        this.stats.update((s) => ({
          ...s,
          totalMembers: members.length,
          activeMembers,
          membersByPosition: Object.entries(positionCounts).map(([position, count]) => ({
            position,
            count,
          })),
          membersByYearLevel: Object.entries(yearCounts).map(([year, count]) => ({
            year,
            count,
          })),
        }));
      },
      error: (error) => {
        console.error('Failed to load members:', error);
      },
    });

    this.organizationService.getDocuments(1, 999).subscribe({
      next: (response) => {
        const documents = response.documents;
        this.stats.update((s) => ({
          ...s,
          documentsSubmitted: documents.length,
          documentsPending: documents.filter((d: any) => d.status === 'pending').length,
          documentsApproved: documents.filter((d: any) => d.status === 'approved').length,
          documentsRejected: documents.filter((d: any) => d.status === 'rejected').length,
        }));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load documents:', error);
        this.loading.set(false);
      },
    });
  }

  loadDemographics() {
    this.organizationService.getDemographics().subscribe({
      next: (data) => {
        this.demographics.set(data);
      },
      error: (error) => {
        console.error('Failed to load demographics:', error);
      },
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getAdviserFullName(adviser: any): string {
    const faculty = adviser.Faculty;
    if (!faculty) return 'N/A';
    const middle = faculty.middle_name ? ` ${faculty.middle_name} ` : ' ';
    return `${faculty.first_name}${middle}${faculty.last_name}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getProgramColor(index: number): string {
    const colors = [
      '#8b5cf6', // purple
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1', // indigo
    ];
    return colors[index % colors.length];
  }

  getAccumulatedOffset(index: number): number {
    if (!this.demographics().byProgram || index === 0) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      const program = this.demographics().byProgram[i];
      const percentage = (program.count / this.stats().totalMembers) * 100;
      offset += (percentage / 100) * 502.65;
    }
    return offset;
  }
}
