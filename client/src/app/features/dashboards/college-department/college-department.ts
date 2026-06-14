import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../services/auth/auth';
import { ThemeService } from '../../../services/theme/theme.service';
import { ChangePasswordModal } from '../../../shared/components/change-password-modal/change-password-modal';
import { DeanMyProfile } from '../../dean/my-profile/my-profile';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CollegeDepartmentProfile {
  college_department_id: number;
  name: string;
  email: string;
  contact_number: string | null;
  dean_name: string | null;
  is_active: boolean;
  campus?: { campus_name: string };
  department?: { department_name: string; acronym?: string };
}

export interface DeptStats {
  total_faculty: number;
  cleared_faculties: number;
  pending_faculties: number;
  withholding_faculties: number;
  total_requirements: number;
  validated: number;
  pending: number;
  returned: number;
  completion_rate: string;
  faculty_clearance_rate: string;
}

@Component({
  selector: 'app-college-department-dashboard',
  imports: [CommonModule, ChangePasswordModal, DeanMyProfile],
  templateUrl: './college-department.html',
  styles: [],
})
export class CollegeDepartmentDashboard implements OnInit {
  isSidebarOpen = signal(true);
  activeTab = signal<string>('overview');
  isUserMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);

  profile = signal<CollegeDepartmentProfile | null>(null);
  stats = signal<DeptStats | null>(null);
  loading = signal(false);

  constructor(
    public authService: Auth,
    public themeService: ThemeService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadStats();
  }

  loadProfile() {
    this.loading.set(true);
    this.http
      .get<{ record: CollegeDepartmentProfile }>(`${environment.apiUrl}/college-department/profile`)
      .subscribe({
        next: (res) => {
          this.profile.set(res.record);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading profile:', err);
          this.loading.set(false);
        },
      });
  }

  loadStats() {
    this.http.get<DeptStats>(`${environment.apiUrl}/dean/requirements/statistics`).subscribe({
      next: (res) => this.stats.set(res),
      error: (err) => console.error('Error loading stats:', err),
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
    this.isUserMenuOpen.set(false);
  }

  logout() {
    this.authService.logout();
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      overview: 'Dashboard',
      'dept-profile': 'Department Profile',
    };
    return titles[this.activeTab()] || 'College Department Portal';
  }
}
