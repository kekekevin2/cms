import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../services/auth/auth';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../services/theme/theme.service';
import { SuperadminAcademicYearManagement } from '../../superadmin/academic-year-management/academic-year-management';
import { SuperadminCampusManagement } from '../../superadmin/campus-management/campus-management';
import { SuperadminDepartmentManagement } from '../../superadmin/department-management/department-management';
import { SuperadminCollegeDepartmentManagement } from '../../superadmin/college-department-management/college-department-management';
import { SuperadminFacultyView } from '../../superadmin/faculty-view/faculty-view';
import { SuperadminOrganizationView } from '../../superadmin/organization-view/organization-view';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';
import {
  SuperadminDashboardService,
  SuperadminStatistics,
} from '../../../services/superadmin/superadmin-dashboard.service';

@Component({
  selector: 'app-superadmin-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    SuperadminAcademicYearManagement,
    SuperadminCampusManagement,
    SuperadminDepartmentManagement,
    SuperadminCollegeDepartmentManagement,
    SuperadminFacultyView,
    SuperadminOrganizationView,
    ChangePasswordModal,
  ],
  templateUrl: './superadmin.html',
  styles: [],
})
export class SuperadminDashboard implements OnInit {
  isSidebarOpen = signal(true);
  activeTab = signal<string>('dashboard');
  isUserMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);
  statistics = signal<SuperadminStatistics>({
    total_faculty: 0,
    total_deans: 0,
    total_organizations: 0,
    total_campuses: 0,
    active_campuses: 0,
    total_departments: 0,
    active_departments: 0,
    total_college_departments: 0,
    active_academic_year: null,
    total_files: 0,
    storage_mb: 0,
    files_by_status: {
      pending: 0,
      returned: 0,
    },
  });
  loading = signal(false);

  constructor(
    public authService: Auth,
    private dashboardService: SuperadminDashboardService,
    public themeService: ThemeService,
  ) {}

  ngOnInit() {
    this.loadDashboardStatistics();
  }

  loadDashboardStatistics() {
    this.loading.set(true);
    this.dashboardService.getDashboardStatistics().subscribe({
      next: (response) => {
        this.statistics.set(response.statistics);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading dashboard statistics:', error);
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
  }

  logout() {
    this.authService.logout();
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      dashboard: 'Dashboard',
      'college-department': 'College Dean',
      faculty: 'Faculty Management',
      organization: 'Organization Management',
      'academic-year': 'Academic Year Settings',
      campus: 'Campus Management',
      department: 'Department Management',
    };
    return titles[this.activeTab()] || 'Dashboard';
  }
}
