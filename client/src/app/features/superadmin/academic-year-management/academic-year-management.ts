import { Component, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SuperadminAcademicYearService,
  AcademicYear,
  CreateAcademicYearData,
} from '../../../services/superadmin/superadmin-academic-year.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-academic-year-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './academic-year-management.html',
  styleUrl: './academic-year-management.css',
})
export class SuperadminAcademicYearManagement implements OnInit {
  showArchived = input(false);

  academicYearsList = signal<AcademicYear[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;
  searchQuery = '';
  Math = Math;

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createForm: CreateAcademicYearData = {
    year_start: new Date().getFullYear(),
    year_end: new Date().getFullYear() + 1,
    is_active: false,
  };

  editForm = {
    academic_year_id: 0,
    year_start: new Date().getFullYear(),
    year_end: new Date().getFullYear() + 1,
    is_active: false,
  };

  constructor(private academicYearService: SuperadminAcademicYearService) {}

  ngOnInit() {
    this.loadAcademicYears();
  }

  loadAcademicYears() {
    this.loading.set(true);
    this.academicYearService
      .getAcademicYears(this.currentPage(), this.pageSize, this.searchQuery, this.showArchived())
      .subscribe({
        next: (response) => {
          this.academicYearsList.set(response.academicYears);
          this.currentPage.set(response.currentPage);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load academic years',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadAcademicYears();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadAcademicYears();
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

  openCreateModal() {
    this.createForm = {
      year_start: new Date().getFullYear(),
      year_end: new Date().getFullYear() + 1,
      is_active: false,
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreate() {
    if (!this.createForm.year_start || !this.createForm.year_end) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Year start and year end are required.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }
    if (this.createForm.year_start >= this.createForm.year_end) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Year end must be greater than year start.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.academicYearService.createAcademicYear(this.createForm).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.loadAcademicYears();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Academic year created successfully',
          confirmButtonColor: '#16a34a',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to create academic year';
        Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
      },
    });
  }

  openEditModal(ay: AcademicYear) {
    this.editForm = {
      academic_year_id: ay.academic_year_id,
      year_start: ay.year_start,
      year_end: ay.year_end,
      is_active: ay.is_active,
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEdit() {
    if (this.editForm.year_start >= this.editForm.year_end) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Year end must be greater than year start.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.academicYearService
      .updateAcademicYear(this.editForm.academic_year_id, {
        year_start: this.editForm.year_start,
        year_end: this.editForm.year_end,
        is_active: this.editForm.is_active,
      })
      .subscribe({
        next: () => {
          this.showEditModal.set(false);
          this.loadAcademicYears();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Academic year updated successfully',
            confirmButtonColor: '#16a34a',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to update academic year';
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
        },
      });
  }

  deleteAcademicYear(ay: AcademicYear) {
    Swal.fire({
      title: 'Delete Academic Year',
      text: `Are you sure you want to delete "${ay.year_start}-${ay.year_end}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.academicYearService.deleteAcademicYear(ay.academic_year_id).subscribe({
          next: () => {
            this.loadAcademicYears();
            Swal.fire({
              icon: 'success',
              title: 'Deleted',
              text: 'Academic year deleted successfully',
              confirmButtonColor: '#16a34a',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (err) => {
            const msg = err?.error?.message || 'Failed to delete academic year';
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
          },
        });
      }
    });
  }
}
