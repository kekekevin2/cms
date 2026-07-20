import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Organization,
  CreateOrganizationData,
  DeanOrganizationService,
} from '../../../services/dean/dean-organization.service';
import { DeanFacultyService, Faculty } from '../../../services/dean/dean-faculty.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-organization-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-management.html',
  styleUrl: './organization-management.css',
})
export class DeanOrganizationManagement implements OnInit {
  organizationsList = signal<Organization[]>([]);
  facultyList = signal<Faculty[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  searchQuery = signal('');
  pageSize = 10;
  Math = Math;

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createForm: CreateOrganizationData = {
    organization_name: '',
    description: '',
    email: '',
    adviser_id_1: 0,
  };
  editForm = {
    organization_id: 0,
    organization_name: '',
    description: '',
  };

  constructor(
    private organizationService: DeanOrganizationService,
    private facultyService: DeanFacultyService,
  ) {}

  private router = inject(Router);

  ngOnInit() {
    this.loadFaculty();
    this.loadOrganizations();
  }

  loadFaculty() {
    this.facultyService.getFaculty(1, 1000).subscribe({
      next: (response) => {
        this.facultyList.set(response.faculty);
      },
      error: (error) => {
        console.error('Error loading faculty:', error);
      },
    });
  }

  loadOrganizations() {
    this.loading.set(true);
    this.organizationService
      .getOrganizations(this.currentPage(), this.pageSize, this.searchQuery())
      .subscribe({
        next: (response) => {
          this.organizationsList.set(response.organizations);
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
            confirmButtonColor: '#2563eb',
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

  openCreateModal() {
    this.createForm = {
      organization_name: '',
      description: '',
      email: '',
      adviser_id_1: 0,
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreateForm() {
    if (!this.createForm.organization_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter organization name',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    if (!this.createForm.adviser_id_1 || this.createForm.adviser_id_1 === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select adviser',
        confirmButtonColor: '#2563eb',
      });
      return;
    }
    if (!this.createForm.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter email',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    this.loading.set(true);
    this.organizationService.createOrganization(this.createForm).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.closeCreateModal();

        // Reload organizations first
        this.loadOrganizations();

        // Show success notification with SweetAlert2
        if (response.emailSent) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: `Organization created successfully! Credentials sent via email to ${this.createForm.email}`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#3b82f6',
          });
        } else {
          // Email failed - show password
          Swal.fire({
            icon: 'warning',
            title: 'Created (Email Failed)',
            html: `
              <div class="text-left">
                <p class="mb-4">Organization created but credentials email could not be sent.</p>
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                  <p class="mb-2"><strong>Email:</strong> ${this.createForm.email}</p>
                  <p><strong>Password:</strong> <span class="font-mono text-blue-600">${response.generatedPassword}</span></p>
                </div>
                <p class="text-sm text-red-600">⚠️ Save this password now. It won't be shown again.</p>
              </div>
            `,
            confirmButtonText: 'I have saved the credentials',
            confirmButtonColor: '#3b82f6',
            allowOutsideClick: false,
          });
        }
      },
      error: (error) => {
        this.loading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'Failed to create organization',
          confirmButtonColor: '#dc2626',
        });
      },
    });
  }

  openEditModal(organization: Organization) {
    this.editForm = {
      organization_id: organization.organization_id,
      organization_name: organization.organization_name,
      description: organization.description || '',
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEditForm() {
    if (!this.editForm.organization_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter organization name',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    this.loading.set(true);
    this.organizationService
      .updateOrganization(this.editForm.organization_id, {
        organization_name: this.editForm.organization_name,
        description: this.editForm.description,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.closeEditModal();
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Organization updated successfully',
            confirmButtonColor: '#2563eb',
          });
          this.loadOrganizations();
        },
        error: (error) => {
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to update organization',
            confirmButtonColor: '#2563eb',
          });
        },
      });
  }

  openDeleteModal(organization: Organization) {
    Swal.fire({
      title: 'Delete Organization',
      text: `Are you sure you want to delete "${organization.organization_name}"? This will also delete the organization's user account. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#2563eb',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.organizationService.deleteOrganization(organization.organization_id).subscribe({
          next: () => {
            this.loading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Organization deleted successfully',
              confirmButtonColor: '#2563eb',
            });
            this.loadOrganizations();
          },
          error: (error) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to delete organization',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  getFacultyName(organization: Organization): string {
    if (!organization.faculty) return 'N/A';
    return organization.faculty.middle_name
      ? `${organization.faculty.first_name} ${organization.faculty.middle_name} ${organization.faculty.last_name}`
      : `${organization.faculty.first_name} ${organization.faculty.last_name}`;
  }

  getAdviserName(organization: Organization): string {
    if (
      !organization.organization_advisers ||
      organization.organization_advisers.length === 0 ||
      !organization.organization_advisers[0].adviser
    ) {
      return 'N/A';
    }
    const adviser = organization.organization_advisers[0].adviser;
    return adviser.middle_name
      ? `${adviser.first_name} ${adviser.middle_name} ${adviser.last_name}`
      : `${adviser.first_name} ${adviser.last_name}`;
  }

  resetPassword(organization: Organization) {
    Swal.fire({
      title: 'Reset Password',
      text: `Generate a new password for "${organization.organization_name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Reset Password',
      confirmButtonColor: '#16a34a',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.organizationService.resetPassword(organization.organization_id).subscribe({
          next: (response) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Password Reset!',
              html: `
                <div class="text-left">
                  <p class="mb-4">New password generated successfully:</p>
                  <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <p class="mb-2"><strong>Email:</strong> ${organization.email}</p>
                    <p><strong>New Password:</strong> <span class="font-mono text-blue-600">${response.newPassword}</span></p>
                  </div>
                  <p class="text-sm text-red-600">⚠️ Save this password now. It won't be shown again.</p>
                </div>
              `,
              confirmButtonText: 'I have saved the password',
              confirmButtonColor: '#16a34a',
              allowOutsideClick: false,
            });
          },
          error: (error) => {
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to reset password',
              confirmButtonColor: '#2563eb',
            });
          },
        });
      }
    });
  }

  viewAnalytics(organization: Organization) {
    // Open the Dean Dashboard's Organization Analytics sub-tab scoped to
    // the selected organization.
    this.router.navigate(['/department/dashboard'], {
      queryParams: {
        tab: 'dashboard',
        subTab: 'organization-analytics',
        organizationId: organization.organization_id,
      },
    });
  }

  viewDemographics(organization: Organization) {
    // Open the Dean Dashboard's Member Demographics sub-tab scoped to
    // the selected organization.
    this.router.navigate(['/department/dashboard'], {
      queryParams: {
        tab: 'dashboard',
        subTab: 'member-demographics',
        organizationId: organization.organization_id,
      },
    });
  }
}
