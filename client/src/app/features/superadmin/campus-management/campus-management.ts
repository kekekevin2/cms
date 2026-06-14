import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SuperadminCampusService,
  Campus,
  CreateCampusData,
} from '../../../services/superadmin/superadmin-campus.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-campus-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './campus-management.html',
  styleUrl: './campus-management.css',
})
export class SuperadminCampusManagement implements OnInit {
  campusList = signal<Campus[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;
  searchQuery = '';
  Math = Math;

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createForm: CreateCampusData = {
    campus_name: '',
    is_active: true,
  };

  editForm = {
    campus_id: 0,
    campus_name: '',
    is_active: true,
  };

  constructor(private campusService: SuperadminCampusService) {}

  ngOnInit() {
    this.loadCampuses();
  }

  loadCampuses() {
    this.loading.set(true);
    this.campusService.getCampuses(this.currentPage(), this.pageSize, this.searchQuery).subscribe({
      next: (response) => {
        this.campusList.set(response.campuses);
        this.currentPage.set(response.currentPage);
        this.totalPages.set(response.totalPages);
        this.totalItems.set(response.totalItems);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading campuses:', error);
        this.loading.set(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load campuses',
          confirmButtonColor: '#dc2626',
        });
      },
    });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadCampuses();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadCampuses();
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
      campus_name: '',
      is_active: true,
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreate() {
    if (!this.createForm.campus_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Campus name is required.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.campusService.createCampus(this.createForm).subscribe({
      next: () => {
        this.showCreateModal.set(false);
        this.loadCampuses();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Campus created successfully',
          confirmButtonColor: '#16a34a',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (error) => {
        const msg = error?.error?.message || 'Failed to create campus';
        Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
      },
    });
  }

  openEditModal(campus: Campus) {
    this.editForm = {
      campus_id: campus.campus_id,
      campus_name: campus.campus_name,
      is_active: campus.is_active,
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEdit() {
    if (!this.editForm.campus_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Campus name is required.',
        confirmButtonColor: '#dc2626',
      });
      return;
    }

    this.campusService
      .updateCampus(this.editForm.campus_id, {
        campus_name: this.editForm.campus_name,
        is_active: this.editForm.is_active,
      })
      .subscribe({
        next: () => {
          this.showEditModal.set(false);
          this.loadCampuses();
          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Campus updated successfully',
            confirmButtonColor: '#16a34a',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: (error) => {
          const msg = error?.error?.message || 'Failed to update campus';
          Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
        },
      });
  }

  deleteCampus(campus: Campus) {
    Swal.fire({
      title: 'Delete Campus',
      text: `Are you sure you want to delete "${campus.campus_name}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.campusService.deleteCampus(campus.campus_id).subscribe({
          next: () => {
            this.loadCampuses();
            Swal.fire({
              icon: 'success',
              title: 'Deleted',
              text: 'Campus deleted successfully',
              confirmButtonColor: '#16a34a',
              timer: 1500,
              showConfirmButton: false,
            });
          },
          error: (error) => {
            const msg = error?.error?.message || 'Failed to delete campus';
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' });
          },
        });
      }
    });
  }
}
