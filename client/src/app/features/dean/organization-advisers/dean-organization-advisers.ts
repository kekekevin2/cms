import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeanOrganizationManagementService } from '../../../services/organization/organization.service';
import { DeanService } from '../../../services/dean/dean.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-organization-advisers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-organization-advisers.html',
})
export class DeanOrganizationAdvisersComponent implements OnInit {
  private deanOrgService = inject(DeanOrganizationManagementService);
  private deanService = inject(DeanService);

  organizations = signal<any[]>([]);
  facultyList = signal<any[]>([]);
  selectedOrganization = signal<any>(null);
  advisers = signal<any[]>([]);

  showAssignModal = signal(false);
  selectedFacultyId = signal<number | null>(null);

  successMessage = signal('');
  errorMessage = signal('');

  ngOnInit() {
    this.loadOrganizations();
    this.loadFaculty();
  }

  loadOrganizations() {
    this.deanService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations.set(response.organizations || []);
      },
      error: (error) => {
        console.error('Failed to load organizations:', error);
        this.showError('Failed to load organizations');
      },
    });
  }

  loadFaculty() {
    this.deanService.getFaculty().subscribe({
      next: (response) => {
        this.facultyList.set(response.faculty || []);
      },
      error: (error) => {
        console.error('Failed to load faculty:', error);
      },
    });
  }

  selectOrganization(org: any) {
    this.selectedOrganization.set(org);
    this.loadAdvisers(org.organization_id);
  }

  loadAdvisers(organizationId: number) {
    this.deanOrgService.getOrganizationAdvisers(organizationId).subscribe({
      next: (response) => {
        this.advisers.set(response.advisers);
      },
      error: (error) => {
        console.error('Failed to load advisers:', error);
        this.showError('Failed to load advisers');
      },
    });
  }

  openAssignModal() {
    this.showAssignModal.set(true);
    this.selectedFacultyId.set(null);
  }

  closeAssignModal() {
    this.showAssignModal.set(false);
    this.selectedFacultyId.set(null);
  }

  assignAdviser() {
    const org = this.selectedOrganization();
    const facultyId = this.selectedFacultyId();

    if (!org || !facultyId) {
      this.showError('Please select a faculty member');
      return;
    }

    this.deanOrgService.assignAdviser(org.organization_id, facultyId).subscribe({
      next: (response) => {
        this.showSuccess('Adviser assigned successfully');
        this.closeAssignModal();
        this.loadAdvisers(org.organization_id);
      },
      error: (error) => {
        console.error('Failed to assign adviser:', error);
        this.showError(error.error?.message || 'Failed to assign adviser');
      },
    });
  }

  removeAdviser(adviserId: number) {
    const org = this.selectedOrganization();
    if (!org) return;

    Swal.fire({
      title: 'Remove Adviser?',
      text: 'Are you sure you want to remove this adviser?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.deanOrgService.removeAdviser(adviserId).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Removed!',
              text: 'Adviser removed successfully',
              confirmButtonColor: '#16a34a',
              timer: 2000,
              showConfirmButton: false,
            });
            this.loadAdvisers(org.organization_id);
          },
          error: (error) => {
            console.error('Failed to remove adviser:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to remove adviser',
              confirmButtonColor: '#dc2626',
            });
          },
        });
      }
    });
  }

  getActiveAdvisers(): any[] {
    return this.advisers().filter((a) => a.is_active);
  }

  canAssignMoreAdvisers(): boolean {
    return this.getActiveAdvisers().length < 2;
  }

  getAvailableFaculty(): any[] {
    const currentAdviserIds = this.advisers()
      .filter((a) => a.is_active)
      .map((a) => a.faculty_id);
    return this.facultyList().filter((f) => !currentAdviserIds.includes(f.faculty_id));
  }

  getFacultyFullName(faculty: any): string {
    const middle = faculty.middle_name ? ` ${faculty.middle_name} ` : ' ';
    return `${faculty.first_name}${middle}${faculty.last_name}`;
  }

  showSuccess(message: string) {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  showError(message: string) {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 3000);
  }
}
