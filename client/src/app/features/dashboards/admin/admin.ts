import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from '../../../shared/components/layout.component';
import { DeanManagementComponent } from '../../admin/dean-management/dean-management';
import { FacultyManagement } from '../../admin/faculty-management/faculty-management';
import { OrganizationManagement } from '../../admin/organization-management/organization-management';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    LayoutComponent,
    DeanManagementComponent,
    FacultyManagement,
    OrganizationManagement,
  ],
  templateUrl: './admin.html',
})
export class AdminDashboard {
  activeTab = signal<string>('dean');

  onTabChange(tab: string) {
    this.activeTab.set(tab);
  }
}
