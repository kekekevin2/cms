import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
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
import {
  applyDocxPreviewZoom,
  renderDocxPreview,
} from '../../../shared/utils/docx-preview.util';

@Component({
  selector: 'app-dean-requirements-monitoring',
  imports: [CommonModule, FormsModule],
  templateUrl: './requirements-monitoring.html',
  styleUrl: './requirements-monitoring.css',
})
export class DeanRequirementsMonitoring implements OnInit {
  @ViewChild('requirementPdfPreviewContainer')
  private requirementPdfPreviewContainer?: ElementRef<HTMLElement>;
  @ViewChild('requirementDocxPreviewContainer')
  private requirementDocxPreviewContainer?: ElementRef<HTMLElement>;

  loading = signal(false);

  // Filters
  academicYearsList = signal<DropdownAcademicYear[]>([]);
  facultyList = signal<Faculty[]>([]);
  selectedAcademicYear: number = 0;
  selectedSemester: string = '';
  selectedFacultyId: number = 0;
  searchQuery = signal<string>('');
  searchResultsOpen = signal(false);

  selectSearchFaculty(faculty: Faculty) {
    this.selectedFacultyId = faculty.faculty_id;
    this.searchResultsOpen.set(false);
    this.loadFacultyRequirements();
  }

  onSearchFocusOut(event: FocusEvent) {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      this.searchResultsOpen.set(false);
    }
  }
  filteredFacultyList = computed(() => {
    const terms = this.searchQuery().trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return this.facultyList().filter((faculty) => {
      const text = this.getFacultyName(faculty).toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
  });

  selectedFacultyOutsideSearch() {
    return this.facultyList().find((faculty) =>
      Number(faculty.faculty_id) === Number(this.selectedFacultyId) &&
      !this.filteredFacultyList().some((match) => match.faculty_id === faculty.faculty_id));
  }

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
  previewLoading = signal(false);
  previewError = signal('');
  previewKind = signal<'pdf' | 'docx' | 'image' | 'text' | 'unsupported' | null>(null);
  previewImageUrl = signal<string | null>(null);
  previewText = signal('');
  previewPageCount = signal(0);
  previewZoom = signal(125);
  readonly minPreviewZoom = 50;
  readonly maxPreviewZoom = 250;
  readonly previewZoomStep = 25;
  private previewRequestId = 0;
  private previewPdfDocument?: { destroy(): Promise<void> };

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
        // Set latest (first) academic year as default
        if (years.length > 0) {
          this.selectedAcademicYear = years[0].academic_year_id;
        }
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
    const requestId = ++this.previewRequestId;
    this.selectedSubmission.set(submission);
    this.showViewModal.set(true);
    this.previewLoading.set(true);
    this.previewError.set('');
    this.previewKind.set(null);
    this.previewImageUrl.set(null);
    this.previewText.set('');
    this.previewPageCount.set(0);
    this.previewZoom.set(125);

    this.requirementService.previewRequirement(submission.submission_id).subscribe({
      next: (preview) => {
        if (requestId !== this.previewRequestId) return;
        this.previewKind.set(preview.kind);
        if (preview.kind === 'pdf' && preview.url) {
          void this.renderRequirementPdf(preview.url, requestId);
          return;
        }
        if (preview.kind === 'docx' && preview.url) {
          this.previewZoom.set(100);
          void this.renderRequirementDocx(preview.url, requestId);
          return;
        }
        if (preview.kind === 'image' && preview.url) {
          this.previewImageUrl.set(preview.url);
        } else if (preview.kind === 'text') {
          this.previewText.set(preview.text || 'This document has no readable text.');
        }
        this.previewLoading.set(false);
      },
      error: (error) => {
        if (requestId !== this.previewRequestId) return;
        this.previewError.set(error.error?.message || 'Unable to preview this requirement.');
        this.previewLoading.set(false);
      },
    });
  }

  closeViewModal() {
    this.previewRequestId++;
    this.showViewModal.set(false);
    this.selectedSubmission.set(null);
    this.previewImageUrl.set(null);
    this.previewText.set('');
    this.previewPageCount.set(0);
    this.previewZoom.set(125);
    this.previewError.set('');
    this.requirementPdfPreviewContainer?.nativeElement.replaceChildren();
    this.requirementDocxPreviewContainer?.nativeElement.replaceChildren();
    void this.previewPdfDocument?.destroy();
    this.previewPdfDocument = undefined;
  }

  private async renderRequirementPdf(url: string, requestId: number): Promise<void> {
    try {
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      }
      const pdf = await pdfjs.getDocument(url).promise;
      if (requestId !== this.previewRequestId) {
        await pdf.destroy();
        return;
      }

      this.previewPdfDocument = pdf;
      this.previewPageCount.set(pdf.numPages);
      this.previewLoading.set(false);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const container = this.requirementPdfPreviewContainer?.nativeElement;
      if (!container || requestId !== this.previewRequestId) return;
      container.replaceChildren();

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        if (requestId !== this.previewRequestId) return;
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        // Leave room for the page gap so two pages fit side by side at 50%.
        const availableWidth = Math.max(320, container.clientWidth - 64);
        const scale = Math.min(1.6, availableWidth / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const pixelRatio = window.devicePixelRatio || 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.dataset['baseWidth'] = `${viewport.width}`;
        canvas.dataset['baseHeight'] = `${viewport.height}`;
        const zoomMultiplier = this.previewZoom() / 100;
        canvas.style.width = `${viewport.width * zoomMultiplier}px`;
        canvas.style.height = `${viewport.height * zoomMultiplier}px`;
        canvas.style.maxWidth = 'none';
        canvas.style.display = 'block';
        canvas.style.margin = '0';
        canvas.style.background = 'white';
        canvas.style.borderRadius = '2px';
        canvas.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.18)';
        container.appendChild(canvas);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to create the PDF canvas.');
        await page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        }).promise;
      }
    } catch (error) {
      if (requestId !== this.previewRequestId) return;
      console.error('Requirement PDF preview rendering failed:', error);
      this.previewError.set('Unable to render the PDF preview.');
      this.previewLoading.set(false);
    }
  }

  private async renderRequirementDocx(url: string, requestId: number): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`DOCX request failed with status ${response.status}`);
      const data = await response.arrayBuffer();
      if (requestId !== this.previewRequestId) return;

      this.previewLoading.set(false);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const container = this.requirementDocxPreviewContainer?.nativeElement;
      if (!container || requestId !== this.previewRequestId) return;
      const pageCount = await renderDocxPreview(data, container, this.previewZoom());
      if (requestId !== this.previewRequestId) return;
      this.previewPageCount.set(pageCount);
    } catch (error) {
      if (requestId !== this.previewRequestId) return;
      console.error('Requirement DOCX preview rendering failed:', error);
      this.previewError.set('Unable to render the Word document preview.');
      this.previewLoading.set(false);
    }
  }

  zoomPdfIn() {
    this.setPdfZoom(this.previewZoom() + this.previewZoomStep);
  }

  zoomPdfOut() {
    this.setPdfZoom(this.previewZoom() - this.previewZoomStep);
  }

  resetPdfZoom() {
    this.setPdfZoom(100);
  }

  private setPdfZoom(zoom: number) {
    const clampedZoom = Math.min(this.maxPreviewZoom, Math.max(this.minPreviewZoom, zoom));
    this.previewZoom.set(clampedZoom);
    const zoomMultiplier = clampedZoom / 100;

    this.requirementPdfPreviewContainer?.nativeElement
      .querySelectorAll<HTMLCanvasElement>('canvas[data-base-width][data-base-height]')
      .forEach((canvas) => {
        const baseWidth = Number(canvas.dataset['baseWidth']);
        const baseHeight = Number(canvas.dataset['baseHeight']);
        if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return;
        canvas.style.width = `${baseWidth * zoomMultiplier}px`;
        canvas.style.height = `${baseHeight * zoomMultiplier}px`;
      });
    const docxContainer = this.requirementDocxPreviewContainer?.nativeElement;
    if (docxContainer) applyDocxPreviewZoom(docxContainer, clampedZoom);
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
