import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SuperadminDepartmentService,
  Department,
  CreateDepartmentData,
} from '../../../services/superadmin/superadmin-department.service';
import {
  SuperadminCampusService,
  Campus,
} from '../../../services/superadmin/superadmin-campus.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-department-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './department-management.html',
  styleUrl: './department-management.css',
})
export class SuperadminDepartmentManagement implements OnInit {
  campusList = signal<Campus[]>([]);
  selectedCampusId = signal<number | null>(null);

  departmentList = signal<Department[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;
  searchQuery = '';
  Math = Math;

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createForm: CreateDepartmentData = {
    campus_id: 0,
    department_name: '',
    acronym: '',
    is_active: true,
  };

  editForm = {
    department_id: 0,
    department_name: '',
    acronym: '',
    is_active: true,
  };

  constructor(
    private departmentService: SuperadminDepartmentService,
    private campusService: SuperadminCampusService,
  ) {}

  ngOnInit() {
    this.loadCampuses();
  }

  loadCampuses() {
    this.campusService.getAllCampuses().subscribe({
      next: (res) => {
        const active = res.campuses.filter((c) => c.is_active);
        this.campusList.set(active);
        this.selectedCampusId.set(null);
        this.loadDepartments();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load campuses',
          confirmButtonColor: '#dc2626',
        });
      },
    });
  }

  onCampusChange(event: Event) {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.selectedCampusId.set(val === 0 ? null : val);
    this.currentPage.set(1);
    this.searchQuery = '';
    this.loadDepartments();
  }

  loadDepartments() {
    this.loading.set(true);
    this.departmentService
      .getDepartments(this.selectedCampusId(), this.currentPage(), this.pageSize, this.searchQuery)
      .subscribe({
        next: (res) => {
          this.departmentList.set(res.departments);
          this.currentPage.set(res.currentPage);
          this.totalPages.set(res.totalPages);
          this.totalItems.set(res.totalItems);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load departments',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadDepartments();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadDepartments();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
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

  selectedCampusName(): string {
    const id = this.selectedCampusId();
    return this.campusList().find((c) => c.campus_id === id)?.campus_name ?? '';
  }

  openCreateModal() {
    this.createForm = {
      campus_id: this.selectedCampusId() ?? 0,
      department_name: '',
      acronym: '',
      is_active: true,
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreate() {
    if (!this.createForm.campus_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select a campus.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (!this.createForm.department_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Department name is required.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.departmentService.createDepartment(this.createForm).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.loadDepartments();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Department created successfully',
          confirmButtonColor: '#16a34a',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to create department';
        Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
      },
    });
  }

  openEditModal(dept: Department) {
    this.editForm = {
      department_id: dept.department_id,
      department_name: dept.department_name,
      acronym: dept.acronym ?? '',
      is_active: dept.is_active,
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEdit() {
    if (!this.editForm.department_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Department name is required.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.departmentService
      .updateDepartment(this.editForm.department_id, {
        department_name: this.editForm.department_name,
        acronym: this.editForm.acronym,
        is_active: this.editForm.is_active,
      })
      .subscribe({
        next: () => {
          this.showEditModal.set(false);
          this.loadDepartments();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Department updated successfully',
            confirmButtonColor: '#16a34a',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to update department';
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
        },
      });
  }

  deleteDepartment(dept: Department) {
    Swal.fire({
      title: 'Delete Department',
      text: `Are you sure you want to delete "${dept.department_name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.departmentService.deleteDepartment(dept.department_id).subscribe({
          next: () => {
            this.loadDepartments();
            Swal.fire({
              icon: 'success',
              title: 'Deleted',
              text: 'Department deleted successfully',
              confirmButtonColor: '#16a34a',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (err) => {
            const msg = err?.error?.message || 'Failed to delete department';
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
          },
        });
      }
    });
  }
}
