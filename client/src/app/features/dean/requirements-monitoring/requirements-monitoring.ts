import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DeanRequirementService,
  DepartmentStatistics,
  FacultyRequirementsResponse,
} from '../../../services/dean/dean-requirement.service';
import { DeanFacultyService, Faculty } from '../../../services/dean/dean-faculty.service';
import { DropdownService, DropdownAcademicYear } from '../../../services/core/dropdown.service';
import { RequirementSubmission } from '../../../services/faculty/faculty-requirement.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dean-requirements-monitoring',
  imports: [CommonModule, FormsModule],
  templateUrl: './requirements-monitoring.html',
  styleUrl: './requirements-monitoring.css',
})
export class DeanRequirementsMonitoring implements OnInit {
  loading = signal(false);

  // Filters
  academicYearsList = signal<DropdownAcademicYear[]>([]);
  facultyList = signal<Faculty[]>([]);
  selectedAcademicYear: number = 0;
  selectedSemester: string = '';
  selectedFacultyId: number = 0;
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  pageSize = 10;

  // Faculty requirements
  selectedFacultyRequirements = signal<FacultyRequirementsResponse | null>(null);

  // View modal
  showViewModal = signal(false);
  selectedSubmission = signal<any>(null);

  Math = Math;

  constructor(
    private requirementService: DeanRequirementService,
    private facultyService: DeanFacultyService,
    private dropdownService: DropdownService,
  ) {}

  ngOnInit() {
    this.loadAcademicYears();
    this.loadFacultyList();
  }

  loadAcademicYears() {
    this.dropdownService.getAcademicYears().subscribe({
      next: (years) => {
        this.academicYearsList.set(years);
        // Set latest (first) academic year and semester as default
        if (years.length > 0) {
          this.selectedAcademicYear = years[0].academic_year_id;
        }
        this.selectedSemester = '1st Semester';
      },
      error: (error) => {
        console.error('Error loading academic years:', error);
      },
    });
  }

  loadFacultyList() {
    this.facultyService.getFaculty(1, 1000, '').subscribe({
      next: (response) => {
        this.facultyList.set(response.faculty);
      },
      error: (error) => {
        console.error('Error loading faculty:', error);
      },
    });
  }

  // loadSubmissions method removed - no longer needed without submissions tab

  filterData() {
    this.currentPage.set(1);
    if (this.selectedFacultyId) {
      this.loadFacultyRequirements();
    }
  }

  loadFacultyRequirements() {
    if (!this.selectedFacultyId) {
      this.selectedFacultyRequirements.set(null);
      return;
    }

    this.loading.set(true);
    this.requirementService
      .getFacultyRequirements(
        this.selectedFacultyId,
        this.selectedAcademicYear || undefined,
        this.selectedSemester || undefined,
      )
      .subscribe({
        next: (requirements) => {
          this.selectedFacultyRequirements.set(requirements);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading faculty requirements:', error);
          this.loading.set(false);
        },
      });
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      if (this.selectedFacultyId) {
        this.loadFacultyRequirements();
      }
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

  openViewModal(submission: any) {
    this.selectedSubmission.set(submission);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.selectedSubmission.set(null);
  }

  validateRequirement() {
    if (!this.selectedSubmission()) return;

    Swal.fire({
      title: 'Validate Requirement?',
      text: 'Mark this requirement as validated/approved?',
      input: 'textarea',
      inputLabel: 'Remarks (optional)',
      inputPlaceholder: 'Enter any remarks...',
      showCancelButton: true,
      confirmButtonText: 'Validate',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.requirementService
          .validateRequirement(this.selectedSubmission()!.submission_id, result.value || undefined)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Validated',
                text: 'Requirement validated successfully',
                confirmButtonColor: '#2563eb',
              });
              this.closeViewModal();
              this.loadFacultyRequirements();
            },
            error: (error: any) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.error?.message || 'Failed to validate requirement',
                confirmButtonColor: '#2563eb',
              });
            },
          });
      }
    });
  }

  returnRequirement() {
    if (!this.selectedSubmission()) return;

    Swal.fire({
      title: 'Return Requirement?',
      text: 'Return this requirement for revision',
      input: 'textarea',
      inputLabel: 'Remarks (required)',
      inputPlaceholder: 'Enter reason for returning...',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter remarks!';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Return',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.requirementService
          .returnRequirement(this.selectedSubmission()!.submission_id, result.value)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Returned',
                text: 'Requirement returned successfully',
                confirmButtonColor: '#2563eb',
              });
              this.closeViewModal();
              this.loadFacultyRequirements();
            },
            error: (error: any) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.error?.message || 'Failed to return requirement',
                confirmButtonColor: '#2563eb',
              });
            },
          });
      }
    });
  }

  downloadFile(submission_id: number) {
    this.requirementService.downloadRequirement(submission_id);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'validated':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'returned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getFacultyName(faculty: any): string {
    if (!faculty) return '';
    return faculty.middle_name
      ? `${faculty.first_name} ${faculty.middle_name} ${faculty.last_name}`
      : `${faculty.first_name} ${faculty.last_name}`;
  }

  getYearLevelDisplay(yearLevel: number): string {
    const yearNames = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
    return yearNames[yearLevel - 1] || `Year ${yearLevel}`;
  }

  getCompletionStats(submissions: RequirementSubmission[]) {
    const total = submissions.length;
    const validated = submissions.filter(
      (s: RequirementSubmission) => s.status === 'validated',
    ).length;
    const pending = submissions.filter((s: RequirementSubmission) => s.status === 'pending').length;
    const returned = submissions.filter(
      (s: RequirementSubmission) => s.status === 'returned',
    ).length;

    return {
      total,
      validated,
      pending,
      returned,
      percentage: total > 0 ? Math.round((validated / total) * 100) : 0,
    };
  }

  // Check if specific academic year and semester are selected
  isSpecificPeriodSelected(): boolean {
    return this.selectedAcademicYear !== 0 && this.selectedSemester !== '';
  }

  getClearanceStatusClass(status?: string): string {
    switch (status) {
      case 'cleared':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'withholding':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  }

  getClearanceStatusText(status?: string): string {
    switch (status) {
      case 'cleared':
        return 'CLEARED';
      case 'withholding':
        return 'FOR REVIEW';
      case 'pending':
      default:
        return 'PENDING';
    }
  }

  setFacultyClearanceStatus(status: 'pending' | 'cleared' | 'withholding') {
    if (!this.selectedFacultyRequirements()) return;

    // Validate that specific period is selected
    if (!this.isSpecificPeriodSelected()) {
      Swal.fire({
        icon: 'warning',
        title: 'Period Required',
        text: 'Please select a specific academic year and semester to set clearance status',
        confirmButtonColor: '#2563eb',
      });
      return;
    }

    const statusText =
      status === 'cleared' ? 'Cleared' : status === 'withholding' ? 'For Review' : 'Pending';

    Swal.fire({
      title: `Set Faculty Status to ${statusText}?`,
      text: `This will manually set the faculty's clearance status to ${statusText.toLowerCase()}`,
      input: 'textarea',
      inputLabel: 'Remarks (optional)',
      inputPlaceholder: 'Enter any remarks...',
      showCancelButton: true,
      confirmButtonText: `Set to ${statusText}`,
      confirmButtonColor:
        status === 'cleared' ? '#10b981' : status === 'withholding' ? '#dc2626' : '#f59e0b',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.requirementService
          .setFacultyClearanceStatus(
            this.selectedFacultyRequirements()!.faculty.faculty_id,
            status,
            result.value || undefined,
            this.selectedAcademicYear || undefined,
            this.selectedSemester || undefined,
          )
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Updated',
                text: `Faculty clearance status set to ${statusText.toLowerCase()}`,
                confirmButtonColor: '#2563eb',
              });
              this.loadFacultyRequirements();
            },
            error: (error: any) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.error?.message || 'Failed to update clearance status',
                confirmButtonColor: '#2563eb',
              });
            },
          });
      }
    });
  }

  // Removed calculateFacultyClearanceStatus - clearance is now auto-calculated by backend
  // when validating or returning requirements

  getSemesterLabel(semester: string): string {
    const map: Record<string, string> = {
      '1st Sem': '1st Semester',
      '2nd Sem': '2nd Semester',
      'Midterm 1': '1st Semester',
      'Midterm 2': '2nd Semester',
      Summer: 'Summer 1',
    };
    return map[semester] ?? semester;
  }
}
