import { Component, signal, OnInit, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
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
  ResearchAnalytics,
  FacultyInvolvementResponse,
} from '../../../services/dean/dean-analytics.service';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';
import { DeanService, Dean } from '../../../services/dean/dean.service';
import { DeanMemberDemographicsComponent } from '../../dean/member-demographics/dean-member-demographics';
import { FacultyNotificationsComponent } from '../../dean/faculty-notifications/faculty-notifications';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

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
  ],
  templateUrl: './dean.html',
  styles: [],
})
export class DeanDashboard implements OnInit, AfterViewInit {
  @ViewChild('researchChart') researchChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('extensionChart') extensionChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('seminarsChart') seminarsChartRef!: ElementRef<HTMLCanvasElement>;

  private route = inject(ActivatedRoute);

  isSidebarOpen = signal(true);
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

  // Analytics data
  facultyDemographics = signal<FacultyDemographics | null>(null);
  educationAnalytics = signal<EducationAnalytics | null>(null);
  researchAnalytics = signal<ResearchAnalytics | null>(null);

  // Chart data
  private charts: { [key: string]: Chart } = {};
  chartLoading = {
    research: false,
    extension: false,
    seminars: false,
  };

  private readonly COLORS: string[] = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#FF6384',
    '#C9CBCF',
    '#4BC0C0',
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
  ];

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

  ngAfterViewInit() {
    // Charts will be created when Faculty Analytics tab is selected
  }

  ngOnDestroy() {
    // Clean up charts
    Object.values(this.charts).forEach((chart) => chart.destroy());
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
      // Load pie charts after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.loadFacultyInvolvementCharts();
      }, 100);
    } else if (subTab === 'organization-analytics') {
      // Organization dashboard loads its own data via ngOnInit
    }
  }

  loadAnalytics() {
    this.loading.set(true);

    // Load all analytics data
    this.analyticsService.getFacultyDemographics().subscribe({
      next: (data) => {
        this.facultyDemographics.set(data);
      },
      error: (error) => {
        console.error('Error loading faculty demographics:', error);
      },
    });

    this.analyticsService.getEducationAnalytics().subscribe({
      next: (data) => {
        this.educationAnalytics.set(data);
      },
      error: (error) => {
        console.error('Error loading education analytics:', error);
      },
    });

    this.analyticsService.getResearchAnalytics().subscribe({
      next: (data) => {
        this.researchAnalytics.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading research analytics:', error);
        this.loading.set(false);
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

  // Faculty Involvement Charts
  loadFacultyInvolvementCharts() {
    this.loadChart('research', 'researchChart');
    this.loadChart('extension', 'extensionChart');
    this.loadChart('seminars', 'seminarsChart');
  }

  private loadChart(chartType: 'research' | 'extension' | 'seminars', chartRefName: string) {
    this.chartLoading[chartType] = true;

    let observable;
    switch (chartType) {
      case 'research':
        observable = this.analyticsService.getResearchInvolvement();
        break;
      case 'extension':
        observable = this.analyticsService.getExtensionInvolvement();
        break;
      case 'seminars':
        observable = this.analyticsService.getSeminarsInvolvement();
        break;
    }

    observable.subscribe({
      next: (response: FacultyInvolvementResponse) => {
        this.chartLoading[chartType] = false;
        setTimeout(() => {
          this.createPieChart(chartType, chartRefName, response);
        }, 50);
      },
      error: (error: any) => {
        this.chartLoading[chartType] = false;
        console.error(`Error loading ${chartType} chart:`, error);
      },
    });
  }

  private createPieChart(chartKey: string, chartRefName: string, data: FacultyInvolvementResponse) {
    const chartRef = (this as any)[chartRefName + 'Ref'];
    if (!chartRef?.nativeElement) {
      console.error(`Chart canvas ${chartRefName} not found`);
      return;
    }

    const ctx = chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (this.charts[chartKey]) {
      this.charts[chartKey].destroy();
    }

    const labels = data.data.map((item) => item.faculty_name);
    const percentages = data.data.map((item) => parseInt(item.percentage));
    const colors = labels.map((_, index) => this.COLORS[index % this.COLORS.length]);

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data: percentages,
            backgroundColor: colors,
            borderColor: '#ffffff',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 14,
                family: "'Georgia', 'Times New Roman', serif",
              },
              padding: 15,
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels && data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    return {
                      text: `${label} ${value}%`,
                      fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                      hidden: false,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}%`;
              },
            },
          },
        },
      },
    };

    this.charts[chartKey] = new Chart(ctx, config);
  }
}
