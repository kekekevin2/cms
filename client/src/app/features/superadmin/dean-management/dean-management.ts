import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SuperadminDeanService,
  Dean,
  CreateDeanData,
  UpdateDeanData,
} from '../../../services/superadmin/superadmin-dean.service';
import {
  DropdownService,
  DropdownPositionLevel,
} from '../../../services/core/dropdown.service';
import {
  SuperadminDepartmentService,
  Department,
} from '../../../services/superadmin/superadmin-department.service';
import {
  SuperadminCampusService,
  Campus,
} from '../../../services/superadmin/superadmin-campus.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-dean-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-management.html',
  styleUrl: './dean-management.css',
})
export class SuperadminDeanManagement implements OnInit {
  deansList = signal<Dean[]>([]);
  campusList = signal<Campus[]>([]);
  allDepartments = signal<Department[]>([]);
  positionLevels = signal<DropdownPositionLevel[]>([]);
  loading = signal(false);
  createLoading = signal(false);
  updateLoading = signal(false);
  deleteLoading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  searchQuery = '';
  selectedDepartment = signal<string | undefined>(undefined);
  createFormCampusId = signal<number>(0);
  editFormCampusId = signal<number>(0);
  pageSize = 10;
  Math = Math;

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createForm: CreateDeanData = {
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    department: '',
    position_level: '',
  };
  editForm = {
    dean_id: 0,
    employee_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    department: '',
    position_level: '',
  };

  constructor(
    private deanService: SuperadminDeanService,
    private dropdownService: DropdownService,
    private departmentService: SuperadminDepartmentService,
    private campusService: SuperadminCampusService,
  ) {}

  ngOnInit() {
    this.loadCampuses();
    this.loadAllDepartments();
    this.loadPositionLevels();
    this.loadDeans();
  }

  loadCampuses() {
    this.campusService.getAllCampuses().subscribe({
      next: (res) => this.campusList.set(res.campuses.filter((c) => c.is_active)),
      error: (err) => console.error('Error loading campuses:', err),
    });
  }

  loadAllDepartments() {
    this.departmentService.getDepartments(null, 1, 1000).subscribe({
      next: (res) => this.allDepartments.set(res.departments.filter((d) => d.is_active)),
      error: (err) => console.error('Error loading departments:', err),
    });
  }

  getDeptsForCampus(campusId: number): Department[] {
    if (!campusId) return [];
    return this.allDepartments().filter((d) => d.campus_id === campusId);
  }

  loadPositionLevels() {
    this.dropdownService.getDeanPositionLevels().subscribe({
      next: (levels) => this.positionLevels.set(levels),
      error: (error) => console.error('Error loading position levels:', error),
    });
  }

  loadDeans() {
    this.loading.set(true);
    this.deanService
      .getDeans(this.currentPage(), this.pageSize, this.searchQuery, this.selectedDepartment())
      .subscribe({
        next: (response) => {
          this.deansList.set(response.deans);
          this.currentPage.set(response.currentPage);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading deans:', error);
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load deans',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  searchDeans() {
    this.currentPage.set(1);
    this.loadDeans();
  }

  filterByDepartment(department: string) {
    this.selectedDepartment.set(department || undefined);
    this.currentPage.set(1);
    this.loadDeans();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadDeans();
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
    this.createFormCampusId.set(0);
    this.createForm = {
      employee_id: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      contact_number: '',
      department: '',
      position_level: '',
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreateForm() {
    if (!this.createForm.employee_id.trim() || this.createForm.employee_id.length !== 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a valid 5-digit employee ID',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.createForm.first_name.trim() || !this.createForm.last_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter first name and last name',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.createForm.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter email',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.createForm.department || !this.createForm.department.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a department',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.createLoading.set(true);
    this.deanService.createDean(this.createForm).subscribe({
      next: (response) => {
        this.createLoading.set(false);
        this.closeCreateModal();

        if (response.emailSent) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            html: `Dean created successfully!<br><small>Credentials sent via email to ${this.createForm.email}</small>`,
            confirmButtonColor: '#dc2626',
          });
        } else {
          // Email failed, show password in modal
          Swal.fire({
            icon: 'warning',
            title: 'Dean Created - Email Failed',
            html: `
              <p>Dean account created successfully, but email could not be sent.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; text-align: left;">
                <p><strong>Email:</strong> ${this.createForm.email}</p>
                <p><strong>Password:</strong> <code style="background: #fee; padding: 2px 6px; border-radius: 3px;">${response.generatedPassword}</code></p>
              </div>
              <p style="color: #dc2626; font-size: 14px;"><strong>⚠️ Important:</strong> Please save these credentials and share them with the dean manually.</p>
            `,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'I have saved the credentials',
            allowOutsideClick: false,
          });
        }

        this.loadDeans();
      },
      error: (error) => {
        this.createLoading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'Failed to create dean',
          confirmButtonColor: '#dc2626',
        });
      },
    });
  }

  openEditModal(dean: Dean) {
    const matchedDept = this.allDepartments().find(
      (d) => d.department_name === dean.department,
    );
    this.editFormCampusId.set(matchedDept?.campus_id ?? 0);
    this.editForm = {
      dean_id: dean.dean_id,
      employee_id: dean.employee_id,
      first_name: dean.first_name,
      middle_name: dean.middle_name || '',
      last_name: dean.last_name,
      email: dean.email,
      contact_number: dean.contact_number || '',
      department: dean.department || '',
      position_level: dean.position_level || '',
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEditForm() {
    if (!this.editForm.employee_id.trim() || this.editForm.employee_id.length !== 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a valid 5-digit employee ID',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.editForm.first_name.trim() || !this.editForm.last_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter first name and last name',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.editForm.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter email',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.editForm.department || !this.editForm.department.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a department',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.updateLoading.set(true);
    this.deanService
      .updateDean(this.editForm.dean_id, {
        employee_id: this.editForm.employee_id,
        first_name: this.editForm.first_name,
        middle_name: this.editForm.middle_name,
        last_name: this.editForm.last_name,
        email: this.editForm.email,
        contact_number: this.editForm.contact_number,
        department: this.editForm.department,
        position_level: this.editForm.position_level,
      })
      .subscribe({
        next: () => {
          this.updateLoading.set(false);
          this.closeEditModal();
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Dean updated successfully',
            confirmButtonColor: '#dc2626',
          });
          this.loadDeans();
        },
        error: (error) => {
          this.updateLoading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.message || 'Failed to update dean',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  openDeleteModal(dean: Dean) {
    Swal.fire({
      title: 'Delete Dean',
      text: `Are you sure you want to delete "${dean.first_name} ${dean.last_name}"? This will also delete their user account. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteLoading.set(true);
        this.deanService.deleteDean(dean.dean_id).subscribe({
          next: () => {
            this.deleteLoading.set(false);
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: 'Dean deleted successfully',
              confirmButtonColor: '#dc2626',
            });
            this.loadDeans();
          },
          error: (error) => {
            this.deleteLoading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'Failed to delete dean',
              confirmButtonColor: '#dc2626',
            });
          },
        });
      }
    });
  }

  getFullName(dean: Dean): string {
    return dean.middle_name
      ? `${dean.first_name} ${dean.middle_name} ${dean.last_name}`
      : `${dean.first_name} ${dean.last_name}`;
  }
}
