import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SuperadminCollegeDepartmentService,
  CollegeDepartment,
  CreateCollegeDepartmentData,
} from '../../../services/superadmin/superadmin-college-department.service';
import {
  SuperadminCampusService,
  Campus,
} from '../../../services/superadmin/superadmin-campus.service';
import {
  SuperadminDepartmentService,
  Department,
} from '../../../services/superadmin/superadmin-department.service';
import { SuperadminDeanService, Dean } from '../../../services/superadmin/superadmin-dean.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-college-department-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './college-department-management.html',
  styleUrl: './college-department-management.css',
})
export class SuperadminCollegeDepartmentManagement implements OnInit {
  list = signal<CollegeDepartment[]>([]);
  campusList = signal<Campus[]>([]);
  allDepartments = signal<Department[]>([]);
  allDeans = signal<Dean[]>([]);

  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;
  searchQuery = '';
  Math = Math;

  showCreateModal = signal(false);
  showEditModal = signal(false);

  createFormCampusId = signal<number>(0);
  editFormCampusId = signal<number>(0);

  createForm: CreateCollegeDepartmentData & { contact_number: string } = {
    name: '',
    email: '',
    contact_number: '',
    campus_id: null,
    department_id: null,
    dean_name: '',
    is_active: true,
  };

  editForm = {
    college_department_id: 0,
    name: '',
    email: '',
    contact_number: '',
    campus_id: null as number | null,
    department_id: null as number | null,
    dean_name: '',
    is_active: true,
  };

  constructor(
    private service: SuperadminCollegeDepartmentService,
    private campusService: SuperadminCampusService,
    private departmentService: SuperadminDepartmentService,
    private deanService: SuperadminDeanService,
  ) {}

  ngOnInit() {
    this.loadCampuses();
    this.loadAllDepartments();
    this.loadAllDeans();
    this.loadList();
  }

  loadCampuses() {
    this.campusService.getAllCampuses().subscribe({
      next: (res) => this.campusList.set(res.campuses.filter((c) => c.is_active)),
      error: (err) => console.error(err),
    });
  }

  loadAllDepartments() {
    this.departmentService.getDepartments(null, 1, 1000).subscribe({
      next: (res) => this.allDepartments.set(res.departments.filter((d) => d.is_active)),
      error: (err) => console.error(err),
    });
  }

  loadAllDeans() {
    this.deanService.getDeans(1, 1000).subscribe({
      next: (res) => this.allDeans.set(res.deans),
      error: (err) => console.error(err),
    });
  }

  getDeptsForCampus(campusId: number): Department[] {
    if (!campusId) return [];
    return this.allDepartments().filter((d) => d.campus_id === campusId);
  }

  /** Deans whose `department` text matches any department name under the given campus */
  getDeansForCampus(campusId: number): Dean[] {
    if (!campusId) return this.allDeans();
    const deptNames = this.getDeptsForCampus(campusId).map((d) => d.department_name.toLowerCase());
    return this.allDeans().filter((d) => deptNames.includes(d.department.toLowerCase()));
  }

  onCreateCampusChange(campusId: number) {
    this.createFormCampusId.set(campusId);
    this.createForm.department_id = null;
    this.createForm.name = '';
    this.createForm.dean_name = '';
  }

  onCreateDepartmentChange(deptId: number | null) {
    this.createForm.department_id = deptId;
    if (deptId) {
      const dept = this.allDepartments().find((d) => d.department_id === +deptId);
      this.createForm.name = dept ? dept.department_name : '';
    } else {
      this.createForm.name = '';
    }
    this.createForm.dean_name = '';
  }

  onEditCampusChange(campusId: number) {
    this.editFormCampusId.set(campusId);
    this.editForm.department_id = null;
    this.editForm.name = '';
    this.editForm.dean_name = '';
  }

  onEditDepartmentChange(deptId: number | null) {
    this.editForm.department_id = deptId;
    if (deptId) {
      const dept = this.allDepartments().find((d) => d.department_id === +deptId);
      this.editForm.name = dept ? dept.department_name : '';
    } else {
      this.editForm.name = '';
    }
    this.editForm.dean_name = '';
  }

  loadList() {
    this.loading.set(true);
    this.service
      .getCollegeDepartments(this.currentPage(), this.pageSize, this.searchQuery)
      .subscribe({
        next: (res) => {
          this.list.set(res.collegeDepartments);
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
            text: 'Failed to load college departments',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  onSearch() {
    this.currentPage.set(1);
    this.loadList();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadList();
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

  // ── Create ─────────────────────────────────────────────────────────────────

  openCreateModal() {
    this.createFormCampusId.set(0);
    this.createForm = {
      name: '',
      email: '',
      contact_number: '',
      campus_id: null,
      department_id: null,
      dean_name: '',
      is_active: true,
    };
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  submitCreate() {
    if (!this.createForm.name.trim()) {
      return Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please select a department.',
        confirmButtonColor: '#dc2626',
      });
    }
    if (!this.createForm.email.trim()) {
      return Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Email is required.',
        confirmButtonColor: '#dc2626',
      });
    }

    const payload: CreateCollegeDepartmentData = {
      name: this.createForm.name.trim(),
      email: this.createForm.email.trim(),
      contact_number: this.createForm.contact_number?.trim() || null,
      campus_id: this.createFormCampusId() || null,
      department_id: this.createForm.department_id,
      dean_name: this.createForm.dean_name?.trim() || null,
      is_active: this.createForm.is_active,
    };

    this.service.createCollegeDepartment(payload).subscribe({
      next: (res: any) => {
        this.showCreateModal.set(false);
        this.loadList();
        if (res.generatedPassword) {
          Swal.fire({
            icon: 'warning',
            title: 'Created (Email Failed)',
            html: `College department created but credentials email could not be sent.<br><br>
                   <strong>Email:</strong> ${payload.email}<br>
                   <strong>Password:</strong> <code>${res.generatedPassword}</code><br><br>
                   Please share these credentials manually.`,
            confirmButtonColor: '#dc2626',
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Created',
            text: 'College department created and credentials sent via email.',
            confirmButtonColor: '#16a34a',
            timer: 2000,
            showConfirmButton: false,
          });
        }
      },
      error: (err) =>
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || 'Failed to create.',
          confirmButtonColor: '#dc2626',
        }),
    });
    return;
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  openEditModal(item: CollegeDepartment) {
    const campusId = item.campus_id ?? 0;
    this.editFormCampusId.set(campusId);
    this.editForm = {
      college_department_id: item.college_department_id,
      name: item.name,
      email: item.email,
      contact_number: item.contact_number ?? '',
      campus_id: item.campus_id ?? null,
      department_id: item.department_id ?? null,
      dean_name: item.dean_name ?? '',
      is_active: item.is_active,
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
  }

  submitEdit() {
    if (!this.editForm.name.trim()) {
      return Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Please select a department.',
        confirmButtonColor: '#dc2626',
      });
    }
    if (!this.editForm.email.trim()) {
      return Swal.fire({
        icon: 'warning',
        title: 'Validation',
        text: 'Email is required.',
        confirmButtonColor: '#dc2626',
      });
    }

    const payload = {
      name: this.editForm.name.trim(),
      email: this.editForm.email.trim(),
      contact_number: this.editForm.contact_number?.trim() || null,
      campus_id: this.editFormCampusId() || null,
      department_id: this.editForm.department_id,
      dean_name: this.editForm.dean_name?.trim() || null,
      is_active: this.editForm.is_active,
    };

    this.service.updateCollegeDepartment(this.editForm.college_department_id, payload).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.loadList();
        Swal.fire({
          icon: 'success',
          title: 'Updated',
          text: 'College department updated.',
          confirmButtonColor: '#16a34a',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) =>
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || 'Failed to update.',
          confirmButtonColor: '#dc2626',
        }),
    });
    return;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  deleteItem(item: CollegeDepartment) {
    Swal.fire({
      title: 'Delete College Department?',
      text: `"${item.name}" will be permanently removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Delete',
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteCollegeDepartment(item.college_department_id).subscribe({
          next: () => {
            this.loadList();
            Swal.fire({ icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false });
          },
          error: () =>
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Failed to delete.',
              confirmButtonColor: '#dc2626',
            }),
        });
      }
    });
  }
}
