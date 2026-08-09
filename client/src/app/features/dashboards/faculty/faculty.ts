import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../services/auth/auth';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../services/theme/theme.service';
import { FacultyRequirements } from '../../faculty/requirements/requirements';
import { FacultyMyProfile } from '../../faculty/my-profile/my-profile';
import { PersonalDataSheetComponent } from '../../faculty/personal-data-sheet/personal-data-sheet.component';
import {
  FacultyRequirementService,
  RequirementSubmission,
} from '../../../services/faculty/faculty-requirement.service';
import { DropdownService, DropdownAcademicYear } from '../../../services/core/dropdown.service';
import { FormsModule } from '@angular/forms';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';

// Legacy interface for course assignments (removed from system but kept for backwards compatibility)
interface Assignment {
  requirement_submissions?: RequirementSubmission[];
}

@Component({
  selector: 'app-faculty-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    FacultyRequirements,
    FacultyMyProfile,
    PersonalDataSheetComponent,
    FormsModule,
    ChangePasswordModal,
  ],
  template: `
    <!-- Sidebar -->
    <aside
      [class.translate-x-0]="isSidebarOpen()"
      [class.-translate-x-full]="!isSidebarOpen()"
      class="fixed top-0 left-0 z-50 w-64 max-w-[85vw] h-full transition-transform sm:translate-x-0 bg-white border-r border-gray-200"
    >
      <div class="h-full px-3 py-4 overflow-y-auto">
        <!-- Logo/Brand -->
        <div class="mb-6 px-2 flex flex-col items-center">
          <img src="/assets/logo.png" alt="Logo" class="h-16 sm:h-24 w-auto mb-3" />
          <h2 class="text-lg font-bold text-gray-900 text-center">Faculty Portal</h2>
          @if (authService.currentUser()?.profile?.department) {
            <p class="text-xs text-gray-500 text-center mt-0.5">
              {{ authService.currentUser()?.profile?.department }}
            </p>
          }
        </div>

        <ul class="space-y-1 font-medium">
          <li>
            <button
              (click)="selectTab('dashboard')"
              [class.bg-green-50]="activeTab() === 'dashboard'"
              [class.text-green-600]="activeTab() === 'dashboard'"
              class="flex items-center w-full px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
            >
              <i class="pi pi-chart-pie shrink-0 text-sm w-5 text-center"></i>
              <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">Dashboard</span>
            </button>
          </li>

          <li class="pt-2 mt-2 border-t border-gray-200"></li>

          <li>
            <button
              (click)="selectTab('accomplishments')"
              [class.bg-green-50]="activeTab() === 'accomplishments'"
              [class.text-green-600]="activeTab() === 'accomplishments'"
              class="flex items-center w-full px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
            >
              <i class="pi pi-file shrink-0 text-sm w-5 text-center"></i>
              <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">Accomplishments</span>
            </button>
          </li>

          <li>
            <button
              (click)="selectTab('credentials')"
              [class.bg-green-50]="activeTab() === 'credentials'"
              [class.text-green-600]="activeTab() === 'credentials'"
              class="flex items-center w-full px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
            >
              <i class="pi pi-user shrink-0 text-sm w-5 text-center"></i>
              <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm">My Profile</span>
            </button>
          </li>

          <li>
            <button
              (click)="selectTab('pds')"
              [class.bg-green-50]="activeTab() === 'pds'"
              [class.text-green-600]="activeTab() === 'pds'"
              class="flex items-center w-full px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
            >
              <i class="pi pi-id-card shrink-0 text-sm w-5 text-center"></i>
              <span class="flex-1 ms-3 whitespace-nowrap text-left text-sm"
                >Personal Data Sheet</span
              >
            </button>
          </li>
        </ul>
      </div>
    </aside>

    @if (isSidebarOpen()) {
      <div class="fixed inset-0 z-30 bg-black/50 sm:hidden" (click)="toggleSidebar()"></div>
    }

    <!-- Top Bar -->
    <div
      class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 gap-4 transition-all duration-300 sm:left-64"
    >
      <div class="flex items-center gap-4 min-w-0">
        <button
          (click)="toggleSidebar()"
          type="button"
          class="text-gray-900 bg-transparent hover:bg-gray-200 font-medium rounded-lg text-sm p-2 focus:outline-none shrink-0"
        >
          <i class="pi pi-bars text-lg"></i>
        </button>
        <h1 class="text-sm font-semibold text-gray-900 truncate">{{ getPageTitle() }}</h1>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <div class="relative">
          <button
            (click)="toggleUserMenu()"
            class="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <i class="pi pi-user text-sm"></i>
            <span class="text-xs font-medium hidden sm:inline">
              {{ authService.currentUser()?.profile?.first_name }}
              {{ authService.currentUser()?.profile?.last_name }}
            </span>
            <i
              class="pi pi-chevron-down text-xs transition-transform"
              [class.rotate-180]="isUserMenuOpen()"
            ></i>
          </button>

          @if (isUserMenuOpen()) {
            <div
              class="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg"
            >
              <button
                (click)="themeService.toggleTheme()"
                class="inline-flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg transition"
              >
                @if (themeService.isDarkMode()) {
                  <i class="pi pi-sun text-sm text-yellow-500"></i>
                  <span class="text-xs">Light Mode</span>
                } @else {
                  <i class="pi pi-moon text-sm text-indigo-600"></i>
                  <span class="text-xs">Dark Mode</span>
                }
              </button>
              <button
                (click)="isChangePasswordOpen.set(true); isUserMenuOpen.set(false)"
                class="inline-flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
              >
                <i class="pi pi-lock text-sm"></i>
                <span class="text-xs">Change Password</span>
              </button>
              <button
                (click)="logout()"
                class="inline-flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-b-lg transition"
              >
                <i class="pi pi-sign-out text-sm"></i>
                <span class="text-xs">Sign Out</span>
              </button>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="pt-20 pl-4 pr-4 pb-4 transition-all duration-300 sm:ml-64">
      @if (activeTab() === 'dashboard') {
        <div class="space-y-4">
          <!-- Filters -->
          <div class="flex items-center gap-3 flex-wrap">
            <select
              [(ngModel)]="selectedAcademicYear"
              (change)="filterData()"
              class="px-3 py-2 text-xs border border-gray-200 rounded-sm outline-none focus:ring-0 focus:border-gray-300 bg-white"
            >
              @for (year of academicYearsList(); track year.academic_year_id) {
                <option [value]="year.academic_year_id">
                  {{ year.year_start }}-{{ year.year_end }}
                </option>
              }
            </select>
            <select
              [(ngModel)]="selectedSemester"
              (change)="filterData()"
              class="px-3 py-2 text-xs border border-gray-200 rounded-sm outline-none focus:ring-0 focus:border-gray-300 bg-white"
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer 1">Summer 1</option>
              <option value="Summer 2">Summer 2</option>
            </select>
          </div>

          <!-- Stat Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              class="bg-linear-to-br from-purple-500 to-purple-600 text-white rounded-sm shadow p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-medium opacity-80">Total Requirements</p>
                <i class="pi pi-file text-white/60 text-sm"></i>
              </div>
              <p class="text-2xl font-bold">{{ dashboardStats().totalRequirements }}</p>
              <p class="text-xs opacity-70 mt-1">15 standard per period</p>
            </div>

            @if (authService.currentUser()?.profile) {
              @if (periodClearance() !== null) {
                @if (periodClearance()!.clearance_status === 'cleared') {
                  <div
                    class="bg-linear-to-br from-green-500 to-green-600 text-white rounded-sm shadow p-4"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-medium opacity-80">Clearance Status</p>
                      <i class="pi pi-check-circle text-white/60 text-sm"></i>
                    </div>
                    <p class="text-2xl font-bold">Cleared</p>
                    @if (periodClearance()!.clearance_date) {
                      <p class="text-xs opacity-70 mt-1">
                        {{ periodClearance()!.clearance_date | date: 'MMM d, y' }}
                      </p>
                    }
                  </div>
                } @else if (periodClearance()!.clearance_status === 'withholding') {
                  <div
                    class="bg-linear-to-br from-red-500 to-red-600 text-white rounded-sm shadow p-4"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-medium opacity-80">Clearance Status</p>
                      <i class="pi pi-times-circle text-white/60 text-sm"></i>
                    </div>
                    <p class="text-2xl font-bold">For Review</p>
                  </div>
                } @else {
                  <div
                    class="bg-linear-to-br from-yellow-500 to-yellow-600 text-white rounded-sm shadow p-4"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <p class="text-xs font-medium opacity-80">Clearance Status</p>
                      <i class="pi pi-clock text-white/60 text-sm"></i>
                    </div>
                    <p class="text-2xl font-bold">Pending</p>
                  </div>
                }
              } @else if (authService.currentUser()!.profile.clearance_status === 'cleared') {
                <div
                  class="bg-linear-to-br from-green-500 to-green-600 text-white rounded-sm shadow p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium opacity-80">Clearance Status</p>
                    <i class="pi pi-check-circle text-white/60 text-sm"></i>
                  </div>
                  <p class="text-2xl font-bold">Cleared</p>
                  @if (authService.currentUser()!.profile.clearance_date) {
                    <p class="text-xs opacity-70 mt-1">
                      {{ authService.currentUser()!.profile.clearance_date | date: 'MMM d, y' }}
                    </p>
                  }
                </div>
              } @else if (authService.currentUser()!.profile.clearance_status === 'withholding') {
                <div
                  class="bg-linear-to-br from-red-500 to-red-600 text-white rounded-sm shadow p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium opacity-80">Clearance Status</p>
                    <i class="pi pi-times-circle text-white/60 text-sm"></i>
                  </div>
                  <p class="text-2xl font-bold">For Review</p>
                </div>
              } @else {
                <div
                  class="bg-linear-to-br from-yellow-500 to-yellow-600 text-white rounded-sm shadow p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <p class="text-xs font-medium opacity-80">Clearance Status</p>
                    <i class="pi pi-clock text-white/60 text-sm"></i>
                  </div>
                  <p class="text-2xl font-bold">Pending</p>
                </div>
              }
            } @else {
              <div
                class="bg-linear-to-br from-green-500 to-green-600 text-white rounded-sm shadow p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs font-medium opacity-80">Cleared</p>
                  <i class="pi pi-check-circle text-white/60 text-sm"></i>
                </div>
                <p class="text-2xl font-bold">{{ dashboardStats().cleared }}</p>
              </div>
            }

            <div
              class="bg-linear-to-br from-indigo-500 to-indigo-600 text-white rounded-sm shadow p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs font-medium opacity-80">Completion Rate</p>
                <i class="pi pi-chart-line text-white/60 text-sm"></i>
              </div>
              <p class="text-2xl font-bold">{{ dashboardStats().completionRate }}%</p>
            </div>
          </div>

          <!-- Status mini-cards row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white border border-gray-100 rounded-sm p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <p class="text-xs text-gray-500">Cleared</p>
              </div>
              <p class="text-xl font-bold text-gray-700">{{ dashboardStats().cleared }}</p>
              <p class="text-xs text-gray-400">
                {{
                  ((dashboardStats().cleared / dashboardStats().totalRequirements) * 100).toFixed(
                    1
                  )
                }}%
              </p>
            </div>
            <div class="bg-white border border-gray-100 rounded-sm p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-yellow-400 shrink-0"></span>
                <p class="text-xs text-gray-500">Pending</p>
              </div>
              <p class="text-xl font-bold text-gray-700">{{ dashboardStats().pending }}</p>
              <p class="text-xs text-gray-400">awaiting review</p>
            </div>
            <div class="bg-white border border-gray-100 rounded-sm p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                <p class="text-xs text-gray-500">Returned</p>
              </div>
              <p class="text-xl font-bold text-gray-700">{{ dashboardStats().returned }}</p>
              <p class="text-xs text-gray-400">needs revision</p>
            </div>
            <div class="bg-white border border-gray-100 rounded-sm p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full bg-gray-300 shrink-0"></span>
                <p class="text-xs text-gray-500">Not Submitted</p>
              </div>
              <p class="text-xl font-bold text-gray-700">{{ dashboardStats().notSubmitted }}</p>
              <p class="text-xs text-gray-400">remaining</p>
            </div>
          </div>

          <!-- Charts + Progress -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Donut Chart -->
            <div class="bg-white rounded-sm border border-gray-100 p-4">
              <p class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Requirements Status Distribution
              </p>
              <div class="flex items-center justify-center mb-4">
                <div class="relative w-48 h-48">
                  <div
                    class="absolute inset-0 rounded-full"
                    [style.background]="
                      'conic-gradient(from 0deg, rgb(34,197,94) 0deg ' +
                      (dashboardStats().cleared / dashboardStats().totalRequirements) * 360 +
                      'deg, rgb(234,179,8) ' +
                      (dashboardStats().cleared / dashboardStats().totalRequirements) * 360 +
                      'deg ' +
                      ((dashboardStats().cleared + dashboardStats().pending) /
                        dashboardStats().totalRequirements) *
                        360 +
                      'deg, rgb(239,68,68) ' +
                      ((dashboardStats().cleared + dashboardStats().pending) /
                        dashboardStats().totalRequirements) *
                        360 +
                      'deg ' +
                      ((dashboardStats().cleared +
                        dashboardStats().pending +
                        dashboardStats().returned) /
                        dashboardStats().totalRequirements) *
                        360 +
                      'deg, rgb(156,163,175) ' +
                      ((dashboardStats().cleared +
                        dashboardStats().pending +
                        dashboardStats().returned) /
                        dashboardStats().totalRequirements) *
                        360 +
                      'deg 360deg)'
                    "
                  ></div>
                  <div
                    class="absolute inset-6 bg-white rounded-full flex items-center justify-center flex-col"
                  >
                    <p class="text-2xl font-bold text-gray-800">
                      {{ dashboardStats().totalRequirements }}
                    </p>
                    <p class="text-xs text-gray-400">Total</p>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p class="text-xs text-gray-600 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-sm bg-green-500 shrink-0"></span
                  >{{ dashboardStats().cleared }} Cleared
                </p>
                <p class="text-xs text-gray-600 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-sm bg-yellow-400 shrink-0"></span
                  >{{ dashboardStats().pending }} Pending
                </p>
                <p class="text-xs text-gray-600 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0"></span
                  >{{ dashboardStats().returned }} Returned
                </p>
                <p class="text-xs text-gray-600 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-sm bg-gray-300 shrink-0"></span
                  >{{ dashboardStats().notSubmitted }} Not Submitted
                </p>
              </div>
            </div>

            <!-- Progress Bars -->
            <div class="bg-white rounded-sm border border-gray-100 p-4">
              <p class="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">
                Progress Overview
              </p>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-xs text-gray-600">Overall Completion</span>
                    <span class="text-xs font-semibold text-green-600"
                      >{{ dashboardStats().completionRate }}%</span
                    >
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div
                      class="bg-green-500 h-2 rounded-full transition-all duration-500"
                      [style.width.%]="dashboardStats().completionRate"
                    ></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-xs text-gray-600">Submitted</span>
                    <span class="text-xs font-semibold text-green-600"
                      >{{ dashboardStats().submitted }} /
                      {{ dashboardStats().totalRequirements }}</span
                    >
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div
                      class="bg-green-500 h-2 rounded-full transition-all duration-500"
                      [style.width.%]="
                        (dashboardStats().submitted / dashboardStats().totalRequirements) * 100
                      "
                    ></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-xs text-gray-600">Pending Review</span>
                    <span class="text-xs font-semibold text-yellow-600">{{
                      dashboardStats().pending
                    }}</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div
                      class="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      [style.width.%]="
                        (dashboardStats().pending / dashboardStats().totalRequirements) * 100
                      "
                    ></div>
                  </div>
                </div>
                <div>
                  <div class="flex justify-between mb-1">
                    <span class="text-xs text-gray-600">Returned for Revision</span>
                    <span class="text-xs font-semibold text-red-600">{{
                      dashboardStats().returned
                    }}</span>
                  </div>
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div
                      class="bg-red-400 h-2 rounded-full transition-all duration-500"
                      [style.width.%]="
                        (dashboardStats().returned / dashboardStats().totalRequirements) * 100
                      "
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
            @if (activeTab() === 'accomplishments') {
        <app-faculty-requirements />
      }
      @if (activeTab() === 'credentials') {
        <app-faculty-my-profile />
      }
      @if (activeTab() === 'pds') {
        <app-personal-data-sheet />
      }
    </div>

    @if (isChangePasswordOpen()) {
      <app-change-password-modal (close)="isChangePasswordOpen.set(false)" />
    }
  `,
  styles: [],
})
export class FacultyDashboard implements OnInit {
  isSidebarOpen = signal(false);
  activeTab = signal<string>('dashboard');
  isUserMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);
  loading = signal(false);

  // Dashboard data
  assignments = signal<Assignment[]>([]);
  academicYearsList = signal<DropdownAcademicYear[]>([]);
  selectedAcademicYear = signal<number>(0);
  selectedSemester = signal<string>('');

  // Per-period clearance (null = not yet loaded or no specific period selected)
  periodClearance = signal<{
    clearance_status: string;
    clearance_remarks?: string;
    clearance_date?: string;
  } | null>(null);

  // Statistics
  dashboardStats = signal({
    totalAssignments: 0,
    totalRequirements: 0,
    submitted: 0,
    cleared: 0,
    pending: 0,
    returned: 0,
    notSubmitted: 0,
    completionRate: 0,
  });

  constructor(
    public authService: Auth,
    private requirementService: FacultyRequirementService,
    private dropdownService: DropdownService,
    public themeService: ThemeService,
  ) {}

  ngOnInit() {
    this.refreshProfile();
    this.loadAcademicYears();
    // Wait for academic years to load before loading dashboard data
    setTimeout(() => {
      this.loadDashboardData();
      this.loadPeriodClearance();
    }, 100);
  }

  refreshProfile() {
    this.authService.getProfile().subscribe({
      error: (error) => {
        console.error('Error refreshing profile:', error);
      },
    });
  }

  loadPeriodClearance() {
    const yearId = this.selectedAcademicYear();
    const semester = this.selectedSemester();
    if (!yearId || !semester) {
      this.periodClearance.set(null);
      return;
    }
    this.requirementService.getPeriodClearance(yearId, semester).subscribe({
      next: (res) => this.periodClearance.set(res.clearance),
      error: () => this.periodClearance.set(null),
    });
  }

  loadAcademicYears() {
    this.dropdownService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYearsList.set(years);
        // Set latest (first) academic year and semester as default
        if (years.length > 0) {
          this.selectedAcademicYear.set(years[0].academic_year_id);
        }
        this.selectedSemester.set('1st Semester');
      },
      error: (error) => {
        console.error('Error loading academic years:', error);
      },
    });
  }

  loadDashboardData() {
    this.loading.set(true);

    // Load actual requirement submissions for the selected period
    this.requirementService
      .getMyRequirements(
        1, // page
        1000, // large page size to get all
        this.selectedAcademicYear() || undefined,
        this.selectedSemester() || undefined,
        undefined, // no status filter
      )
      .subscribe({
        next: (response) => {
          // Convert submissions to assignment format for backwards compatibility
          const mockAssignment: Assignment = {
            requirement_submissions: response.requirements,
          };
          this.assignments.set([mockAssignment]);
          this.calculateStats();
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.assignments.set([]);
          this.calculateStats();
          this.loading.set(false);
        },
      });
  }

  calculateStats() {
    // Faculty must submit 15 standard requirements per academic year/semester
    const TOTAL_STANDARD_REQUIREMENTS = 15;
    const totalRequirements = TOTAL_STANDARD_REQUIREMENTS;

    // Note: Each requirement can have multiple files (1 to many relationship)
    // We count unique requirement submissions, not individual files
    const assignments = this.assignments();

    let submitted = 0;
    let validated = 0;
    let pending = 0;
    let returned = 0;

    assignments.forEach((assignment) => {
      const submissions = assignment.requirement_submissions || [];
      submitted += submissions.length;
      validated += submissions.filter((s) => s.status === 'validated').length;
      pending += submissions.filter((s) => s.status === 'pending').length;
      returned += submissions.filter((s) => s.status === 'returned').length;
    });

    const notSubmitted = totalRequirements - submitted;
    const completionRate =
      totalRequirements > 0 ? Math.round((validated / totalRequirements) * 100) : 0;

    this.dashboardStats.set({
      totalAssignments: 0, // Courses removed from system
      totalRequirements,
      submitted,
      cleared: validated,
      pending,
      returned,
      notSubmitted,
      completionRate,
    });
  }

  filterData() {
    this.loadDashboardData();
    this.loadPeriodClearance();
  }

  toggleSidebar() {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleUserMenu() {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  selectTab(tab: string) {
    this.activeTab.set(tab);
  }

  getPageTitle(): string {
    switch (this.activeTab()) {
      case 'dashboard':
        return 'Dashboard';
      case 'accomplishments':
        return 'Accomplishments';
      case 'credentials':
        return 'My Profile';
      case 'pds':
        return 'Personal Data Sheet';
      default:
        return 'Faculty Portal';
    }
  }

  logout() {
    this.authService.logout();
  }
}
