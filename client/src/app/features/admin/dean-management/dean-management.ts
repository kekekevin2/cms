import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeanService, Dean, CreateDeanData } from '../../../services/dean/dean.service';
import { DropdownService, DropdownDepartment } from '../../../services/core/dropdown.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-management',
  imports: [CommonModule],
  templateUrl: './dean-management.html',
  styleUrl: './dean-management.css',
})
export class DeanManagementComponent implements OnInit {
  deans = signal<Dean[]>([]);
  departmentsList = signal<DropdownDepartment[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;

  // Expose Math for template
  Math = Math;

  constructor(
    private deanService: DeanService,
    private dropdownService: DropdownService
  ) {}

  ngOnInit() {
    this.loadDeans();
    this.loadDepartments();
  }

  loadDeans() {
    this.loading.set(true);
    this.deanService.getDeans(this.currentPage(), this.pageSize).subscribe({
      next: (response) => {
        this.deans.set(response.deans);
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
          confirmButtonColor: '#16a34a',
        });
      },
    });
  }

  loadDepartments() {
    this.dropdownService.getDepartments().subscribe({
      next: (departments) => {
        this.departmentsList.set(departments);
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      },
    });
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

  async openCreateModal() {
    const { value: formValues } = await Swal.fire({
      title: '<h3 class="text-lg font-semibold text-gray-900">Create New Dean</h3>',
      html: `
        <div class="text-left" style="padding: 1.5rem 0;">
          <div class="space-y-4">
            <div>
              <label for="email" class="block mb-2.5 text-sm font-medium text-gray-900">Email</label>
              <input id="email" type="email" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full px-3 py-2.5" placeholder="dean@example.com" required>
            </div>
            <div>
              <label for="first_name" class="block mb-2.5 text-sm font-medium text-gray-900">First Name</label>
              <input id="first_name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full px-3 py-2.5" placeholder="First Name" required>
            </div>
            <div>
              <label for="middle_name" class="block mb-2.5 text-sm font-medium text-gray-900">Middle Name</label>
              <input id="middle_name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full px-3 py-2.5" placeholder="Middle Name (Optional)">
            </div>
            <div>
              <label for="last_name" class="block mb-2.5 text-sm font-medium text-gray-900">Last Name</label>
              <input id="last_name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full px-3 py-2.5" placeholder="Last Name" required>
            </div>
            <div>
              <label for="contact_number" class="block mb-2.5 text-sm font-medium text-gray-900">Contact Number</label>
              <input id="contact_number" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full px-3 py-2.5" placeholder="09123456789" required>
            </div>
            <div>
              <label for="department" class="block mb-2.5 text-sm font-medium text-gray-900">Department</label>
              <input id="department" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full px-3 py-2.5" placeholder="e.g. College of Engineering Technology" list="department-list">
              <datalist id="department-list">
                ${this.departmentsList()
                  .map(
                    (dept) =>
                      `<option value="${dept.department_name}">`,
                  )
                  .join('')}
              </datalist>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText:
        '<span style="display: inline-flex; align-items: center;"><svg class="w-4 h-4" style="margin-right: 0.375rem; margin-left: -0.125rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>Add Dean</span>',
      confirmButtonColor: '#16a34a',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const first_name = (document.getElementById('first_name') as HTMLInputElement).value;
        const middle_name = (document.getElementById('middle_name') as HTMLInputElement).value;
        const last_name = (document.getElementById('last_name') as HTMLInputElement).value;
        const contact_number = (document.getElementById('contact_number') as HTMLInputElement)
          .value;
        const department_id = (document.getElementById('department_id') as HTMLSelectElement).value;

        if (!email || !first_name || !last_name || !contact_number) {
          Swal.showValidationMessage('Please fill in all required fields');
          return false;
        }

        return {
          email,
          first_name,
          middle_name: middle_name || undefined,
          last_name,
          contact_number,
          department_id: department_id ? parseInt(department_id) : undefined,
        };
      },
    });

    if (formValues) {
      this.createDean(formValues);
    }
  }

  createDean(data: CreateDeanData) {
    Swal.fire({
      title: 'Creating Dean...',
      text: 'Please wait',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.deanService.createDean(data).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          html: '<p class="text-gray-900">Dean has been created successfully.</p><p class="text-gray-700 mt-2">Credentials have been sent to the dean\'s email.</p><p class="text-gray-700 mt-2">Thank you!</p>',
          confirmButtonColor: '#16a34a',
          confirmButtonText: 'OK',
        });
        this.loadDeans();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          html: `<p class="text-gray-900">${error.error?.message || 'Failed to create dean'}</p>`,
          confirmButtonColor: '#16a34a',
        });
      },
    });
  }

  async openEditModal(dean: Dean) {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Dean',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" type="email" class="swal2-input w-full m-0" value="${dean.user.email}" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input id="first_name" class="swal2-input w-full m-0" value="${dean.first_name}" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
            <input id="middle_name" class="swal2-input w-full m-0" value="${dean.middle_name || ''}" placeholder="Middle Name (Optional)">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input id="last_name" class="swal2-input w-full m-0" value="${dean.last_name}" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input id="contact_number" class="swal2-input w-full m-0" value="${dean.contact_number}" required>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input id="department" class="swal2-input w-full m-0" value="${dean.department || ''}" placeholder="e.g. College of Engineering Technology" list="edit-department-list">
            <datalist id="edit-department-list">
              ${this.departmentsList()
                .map(
                  (dept) =>
                    `<option value="${dept.department_name}">`,
                )
                .join('')}
            </datalist>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Dean',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      preConfirm: () => {
        const email = (document.getElementById('email') as HTMLInputElement).value;
        const first_name = (document.getElementById('first_name') as HTMLInputElement).value;
        const middle_name = (document.getElementById('middle_name') as HTMLInputElement).value;
        const last_name = (document.getElementById('last_name') as HTMLInputElement).value;
        const contact_number = (document.getElementById('contact_number') as HTMLInputElement)
          .value;
        const department_id = (document.getElementById('department_id') as HTMLSelectElement).value;

        if (!email || !first_name || !last_name || !contact_number) {
          Swal.showValidationMessage('Please fill in all required fields');
          return false;
        }

        return {
          email,
          first_name,
          middle_name: middle_name || undefined,
          last_name,
          contact_number,
          department_id: department_id ? parseInt(department_id) : undefined,
        };
      },
    });

    if (formValues) {
      this.updateDean(dean.dean_id, formValues);
    }
  }

  updateDean(id: number, data: CreateDeanData) {
    Swal.fire({
      title: 'Updating Dean...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.deanService.updateDean(id, data).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Dean Updated!',
          text: 'Dean information has been updated successfully',
          confirmButtonColor: '#16a34a',
        });
        this.loadDeans();
      },
      error: (error) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'Failed to update dean',
          confirmButtonColor: '#16a34a',
        });
      },
    });
  }

  async deleteDean(dean: Dean) {
    const result = await Swal.fire({
      title: 'Delete Dean?',
      html: `<p class="text-gray-900">Are you sure you want to delete <strong>${dean.first_name} ${dean.last_name}</strong>?</p><p class="text-gray-700 mt-2">This action cannot be undone.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Deleting Dean...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      this.deanService.deleteDean(dean.dean_id).subscribe({
        next: (response) => {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            html: '<p class="text-gray-900">Dean has been deleted successfully.</p><p class="text-gray-700 mt-2">Thank you!</p>',
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'OK',
          });
          this.loadDeans();
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            html: `<p class="text-gray-900">${error.error?.message || 'Failed to delete dean'}</p>`,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'OK',
          });
        },
      });
    }
  }
}
