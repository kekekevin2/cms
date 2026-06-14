import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SuperadminOrganizationService,
  SuperadminOrganization,
} from '../../../services/superadmin/superadmin-organization.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-organization-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-view.html',
})
export class SuperadminOrganizationView implements OnInit {
  organizationList = signal<SuperadminOrganization[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  searchQuery = signal('');
  pageSize = 10;
  Math = Math;

  constructor(private orgService: SuperadminOrganizationService) {}

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.loading.set(true);
    this.orgService
      .getOrganizations(this.currentPage(), this.pageSize, this.searchQuery())
      .subscribe({
        next: (response) => {
          this.organizationList.set(response.organizations);
          this.currentPage.set(response.currentPage);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading organizations:', error);
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load organizations',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  searchOrganizations() {
    this.currentPage.set(1);
    this.loadOrganizations();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadOrganizations();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  }

  getAdviserName(org: SuperadminOrganization): string {
    if (!org.organization_advisers || org.organization_advisers.length === 0) {
      return 'N/A';
    }

    const adviserNames = org.organization_advisers
      .filter((assignment) => assignment.Faculty || assignment.adviser)
      .map((assignment) => {
        const f = assignment.Faculty ?? assignment.adviser!;
        return f.middle_name
          ? `${f.first_name} ${f.middle_name} ${f.last_name}`
          : `${f.first_name} ${f.last_name}`;
      });

    return adviserNames.length > 0 ? adviserNames.join(', ') : 'N/A';
  }
}
