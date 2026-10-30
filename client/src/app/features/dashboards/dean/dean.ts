import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import type { Subscription } from 'rxjs';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../../services/auth/auth';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../services/theme/theme.service';
import { DeanFacultyManagement } from '../../dean/faculty-management/faculty-management';
import { DeanOrganizationManagement } from '../../dean/organization-management/organization-management';
import { DeanRequirementsMonitoring } from '../../dean/requirements-monitoring/requirements-monitoring';
import { DeanOrganizationDocumentsComponent } from '../../dean/organization-documents/dean-organization-documents';
import { DeanOrganizationDashboard } from '../../dean/organization-dashboard/organization-dashboard';
import { DeanMyProfile } from '../../dean/my-profile/my-profile';
import {
  DeanRequirementService,
  DepartmentStatistics,
} from '../../../services/dean/dean-requirement.service';
import { CollegeDepartmentProfileService } from '../../../services/dean/college-department-profile.service';
import { DropdownService, DropdownAcademicYear } from '../../../services/core/dropdown.service';
import {
  DeanAnalyticsService,
  FacultyDemographics,
  EducationAnalytics,
  FacultyInvolvementResponse,
  FacultyEmploymentType,
} from '../../../services/dean/dean-analytics.service';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';
import { DeanService, Dean } from '../../../services/dean/dean.service';
import { DeanMemberDemographicsComponent } from '../../dean/member-demographics/dean-member-demographics';
import { FacultyNotificationsComponent } from '../../dean/faculty-notifications/faculty-notifications';
import { Pie3dChartComponent, Pie3dItem } from '../../../shared/components/pie-3d-chart/pie-3d-chart';

import type { InvolvementChartType } from '../../../services/core/involvement-chart-pdf.service';

@Component({
  selector: 'app-dean-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DeanFacultyManagement,
    DeanOrganizationManagement,
    DeanRequirementsMonitoring,
    DeanOrganizationDocumentsComponent,
    DeanOrganizationDashboard,
    DeanMyProfile,
    ChangePasswordModal,
    DeanMemberDemographicsComponent,
    FacultyNotificationsComponent,
    Pie3dChartComponent,
  ],
  templateUrl: './dean.html',
  styles: [],
})
export class DeanDashboard implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);

  isSidebarOpen = signal(false);
  activeTab = signal<string>('dashboard');
  dashboardSubTab = signal<string>('overview');
  isUserMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);
  deanName = signal<string>('');

  // Acronym of the dean's department (e.g. "COET"), shown beneath the
  // "Department Portal" title in the sidebar. Kept as its own signal so
  // we can populate it from the college-department profile endpoint,
  // which is the same source used by the Department Profile page.
  departmentAcronym = signal<string>('');

  // Organization scope passed to organization-analytics / member-demographics
  // child components. Set by query params when navigating from the
  // Organization Management action icons.
  scopedOrganizationId = signal<number | null>(null);

  // Dashboard data
  loading = signal(false);
  departmentStats = signal<DepartmentStatistics | null>(null);
  academicYearsList = signal<DropdownAcademicYear[]>([]);
  selectedAcademicYear: number = 0;
  selectedSemester: string = '';
  involvementAcademicYear: number | null = null;
  involvementEmploymentType: FacultyEmploymentType | null = null;

  // Analytics data
  facultyDemographics = signal<FacultyDemographics | null>(null);
  educationAnalytics = signal<EducationAnalytics | null>(null);

  // Faculty involvement pies (isometric, see shared/components/pie-3d-chart)
  involvementItems: Record<'research' | 'extension' | 'seminars', Pie3dItem[]> = {
    research: [],
    extension: [],
    seminars: [],
  };
  chartLoading = {
    research: false,
    extension: false,
    seminars: false,
  };
  private involvementSubscriptions: Partial<Record<'research' | 'extension' | 'seminars', Subscription>> = {};

  constructor(
    public authService: Auth,
    private router: Router,
    private requirementService: DeanRequirementService,
    private dropdownService: DropdownService,
    private analyticsService: DeanAnalyticsService,
    private deanService: DeanService,
    public themeService: ThemeService,
    private collegeDepartmentProfileService: CollegeDepartmentProfileService,
  ) {}

  ngOnInit() {
    this.loadDeanProfile();
    this.loadDepartmentAcronym();
    this.loadAcademicYears();
    this.loadDepartmentStats();

    // Deep-link support: query params can preselect a tab / sub-tab and
    // scope the analytics/demographics views to a specific organization
    // (used by the Organization Management action icons).
    this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      const subTab = params.get('subTab');
      const orgIdRaw = params.get('organizationId');

      if (tab) {
        this.activeTab.set(tab);
      }
      if (subTab) {
        this.dashboardSubTab.set(subTab);
      }

      const orgId = orgIdRaw ? Number(orgIdRaw) : NaN;
      this.scopedOrganizationId.set(Number.isFinite(orgId) && orgId > 0 ? orgId : null);
    });
  }

  ngOnDestroy(): void {
    Object.values(this.involvementSubscriptions).forEach((subscription) => subscription?.unsubscribe());
  }

  loadDeanProfile() {
    this.deanService.getProfile().subscribe({
      next: (dean: Dean) => {
        const fullName = dean.middle_name
          ? `${dean.first_name} ${dean.middle_name} ${dean.last_name}`
          : `${dean.first_name} ${dean.last_name}`;
        this.deanName.set(fullName);
      },
      error: (error: any) => {
        console.error('Error loading dean profile:', error);
        // Fallback to email-based name
        const user = this.authService.currentUser();
        if (user) {
          const emailName = user.email.split('@')[0];
          const formattedName = emailName
            .split('.')
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          this.deanName.set(formattedName);
        }
      },
    });
  }

  /**
   * Pull the department acronym from the college-department profile
   * endpoint so the sidebar can show it beneath "Department Portal",
   * mirroring how the Organization Portal shows the organization name.
   */
  loadDepartmentAcronym() {
    this.collegeDepartmentProfileService.getProfile().subscribe({
      next: (res) => {
        const acronym = res.record?.department?.acronym?.trim();
        if (acronym) {
          this.departmentAcronym.set(acronym);
        }
      },
      error: (error) => {
        console.error('Error loading department acronym:', error);
      },
    });
  }

  loadAcademicYears() {
    this.dropdownService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYearsList.set(years);
        // Set latest (first) academic year and semester as default
        if (years.length > 0) {
          this.selectedAcademicYear = years[0].academic_year_id;
        }
        this.selectedSemester = '1st Semester';
      },
      error: (error) => {
        console.error('Error loading academic years:', error);
      },
    });
  }

  loadDepartmentStats() {
    this.loading.set(true);
    this.requirementService
      .getDepartmentStatistics(
        this.selectedAcademicYear || undefined,
        this.selectedSemester || undefined,
      )
      .subscribe({
        next: (stats) => {
          this.departmentStats.set(stats);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading statistics:', error);
          this.loading.set(false);
        },
      });
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleUserMenu() {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  selectTab(tab: string) {
    this.activeTab.set(tab);
    if (tab === 'dashboard') {
      this.dashboardSubTab.set('overview');
    }
  }

  selectDashboardSubTab(subTab: string) {
    this.dashboardSubTab.set(subTab);
    if (subTab === 'analytics') {
      this.loadAnalytics();
      this.loadFacultyInvolvementCharts();
    } else if (subTab === 'organization-analytics') {
      // Organization dashboard loads its own data via ngOnInit
    }
  }

  loadAnalytics() {
    this.loading.set(true);

    let remaining = 2;
    const settled = () => {
      if (--remaining === 0) this.loading.set(false);
    };
    // Wait for both remaining analytics requests, including errors.
    this.analyticsService.getFacultyDemographics().pipe(finalize(settled)).subscribe({
      next: (data) => {
        this.facultyDemographics.set(data);
      },
      error: (error) => {
        console.error('Error loading faculty demographics:', error);
      },
    });

    this.analyticsService.getEducationAnalytics().pipe(finalize(settled)).subscribe({
      next: (data) => {
        this.educationAnalytics.set(data);
      },
      error: (error) => {
        console.error('Error loading education analytics:', error);
      },
    });


  }

  logout() {
    this.authService.logout();
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      dashboard: 'Dashboard',
      faculty: 'Faculty Management',
      'faculty-notifications': 'Send Email',
      organization: 'Organization Management',
      accomplishments: 'Accomplishments Monitoring',
      credentials: 'Faculty Credentials',
      'org-documents': 'Organization Documents',
      'org-events': 'Organization Events',
      'my-profile': 'Department Profile',
    };
    return titles[this.activeTab()] || 'Dashboard';
  }

  /** Requirements donut: validated / pending / returned, then the not-yet-submitted rest in grey */
  requirementsDonut(): string {
    const s = this.departmentStats();
    const total = s?.total_requirements || 0;
    if (!s || total <= 0) return 'var(--chart-empty)';
    const deg = (n: number) => (n / total) * 360;
    const a = deg(s.validated);
    const b = a + deg(s.pending);
    const c = b + deg(s.returned);
    return (
      `conic-gradient(var(--chart-validated) 0deg ${a}deg, var(--chart-pending) ${a}deg ${b}deg, ` +
      `var(--chart-returned) ${b}deg ${c}deg, var(--chart-empty) ${c}deg 360deg)`
    );
  }

  notSubmittedRequirements(): number {
    const s = this.departmentStats();
    if (!s) return 0;
    return Math.max(0, s.total_requirements - s.validated - s.pending - s.returned);
  }

  involvementExport = signal<InvolvementChartType | null>(null);
  involvementExportError = signal('');

  async downloadInvolvementChart(type: InvolvementChartType): Promise<void> {
    if (this.chartLoading[type] || this.involvementExport() || !this.involvementItems[type].some(item => item.value > 0)) return;
    const items = this.involvementItems[type].map(item => ({ ...item }));
    const employment = this.involvementEmploymentType
      ? { permanent: 'Permanent', temporary: 'Temporary', guest_lecturer: 'Guest Lecturer' }[this.involvementEmploymentType]
      : 'All Faculty Types';
    const years = this.academicYearsList().filter(year => !this.involvementAcademicYear || year.academic_year_id === this.involvementAcademicYear);
    const period = years.length
      ? `FY ${Math.min(...years.map(year => year.year_start))}-${Math.max(...years.map(year => year.year_end))}`
      : 'All Academic Years';
    this.involvementExport.set(type);
    this.involvementExportError.set('');
    try {
      const { InvolvementChartPdfService } = await import('../../../services/core/involvement-chart-pdf.service');
      await new InvolvementChartPdfService().download(type, items, employment, period);
    } catch (error) {
      console.error('Chart PDF download failed:', error);
      this.involvementExportError.set('Unable to download the chart. Please try again.');
    } finally {
      this.involvementExport.set(null);
    }
  }

  // Faculty Involvement Charts
  onInvolvementAcademicYearChange() {
    this.loadFacultyInvolvementCharts();
  }

  onInvolvementEmploymentTypeChange() {
    this.loadFacultyInvolvementCharts();
  }

  involvementEmploymentTypeLabel(): string {
    const labels: Record<FacultyEmploymentType, string> = {
      permanent: 'Permanent Faculty',
      temporary: 'Temporary Faculty',
      guest_lecturer: 'Guest Lecturer',
    };
    return this.involvementEmploymentType ? labels[this.involvementEmploymentType] : 'All Faculty Types';
  }

  loadFacultyInvolvementCharts() {
    this.loadChart('research');
    this.loadChart('extension');
    this.loadChart('seminars');
  }

  private loadChart(chartType: 'research' | 'extension' | 'seminars') {
    this.involvementSubscriptions[chartType]?.unsubscribe();
    this.chartLoading[chartType] = true;
    this.involvementItems[chartType] = [];

    const observable =
      chartType === 'research'
        ? this.analyticsService.getResearchInvolvement(
            this.involvementAcademicYear || undefined,
            this.involvementEmploymentType || undefined,
          )
        : chartType === 'extension'
          ? this.analyticsService.getExtensionInvolvement(
              this.involvementAcademicYear || undefined,
              this.involvementEmploymentType || undefined,
            )
          : this.analyticsService.getSeminarsInvolvement(
              this.involvementAcademicYear || undefined,
              this.involvementEmploymentType || undefined,
            );

    this.involvementSubscriptions[chartType] = observable.subscribe({
      next: (response: FacultyInvolvementResponse) => {
        this.involvementItems[chartType] = response.data.map((item) => ({
          name: item.faculty_name,
          value: item.count,
          percentage: item.percentage,
        }));
        this.chartLoading[chartType] = false;
      },
      error: (error: any) => {
        this.chartLoading[chartType] = false;
        console.error(`Error loading ${chartType} chart:`, error);
      },
    });
  }
}
