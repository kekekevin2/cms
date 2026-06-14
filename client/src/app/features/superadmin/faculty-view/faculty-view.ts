import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminFacultyService, Faculty } from '../../../services/superadmin/superadmin-faculty.service';
import { DropdownService, DropdownDepartment } from '../../../services/core/dropdown.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-superadmin-faculty-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './faculty-view.html',
  styleUrl: './faculty-view.css',
})
export class SuperadminFacultyView implements OnInit {
  facultyList = signal<Faculty[]>([]);
  departmentsList = signal<DropdownDepartment[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  searchQuery = signal('');
  selectedDepartmentId = signal<number | undefined>(undefined);
  pageSize = 10;
  Math = Math;

  constructor(
    private facultyService: SuperadminFacultyService,
    private dropdownService: DropdownService,
  ) {}

  ngOnInit() {
    this.loadDepartments();
    this.loadFaculty();
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

  loadFaculty() {
    this.loading.set(true);
    this.facultyService
      .getFaculty(
        this.currentPage(),
        this.pageSize,
        this.searchQuery(),
        this.selectedDepartmentId(),
      )
      .subscribe({
        next: (response) => {
          this.facultyList.set(response.faculty);
          this.currentPage.set(response.currentPage);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading faculty:', error);
          this.loading.set(false);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load faculty',
            confirmButtonColor: '#dc2626',
          });
        },
      });
  }

  searchFaculty() {
    this.currentPage.set(1);
    this.loadFaculty();
  }

  filterByDepartment(departmentId: string) {
    this.selectedDepartmentId.set(departmentId ? Number(departmentId) : undefined);
    this.currentPage.set(1);
    this.loadFaculty();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadFaculty();
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

  getFullName(faculty: Faculty): string {
    return faculty.middle_name
      ? `${faculty.first_name} ${faculty.middle_name} ${faculty.last_name}`
      : `${faculty.first_name} ${faculty.last_name}`;
  }
}
