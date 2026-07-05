import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OrganizationService,
  OrganizationDocument,
  DocumentType,
  ChecklistItem,
} from '../../../services/organization/organization.service';
import {
  AcademicYearService,
  AcademicYearsResponse,
} from '../../../services/core/academic-year.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-organization-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organization-documents.html',
})
export class OrganizationDocumentsComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private academicYearService = inject(AcademicYearService);

  // Expose Math for template
  Math = Math;

  // State
  documents = signal<OrganizationDocument[]>([]);
  documentTypes = signal<DocumentType[]>([]);
  academicYears = signal<any[]>([]);
  checklist = signal<ChecklistItem[]>([]);

  // Pagination
  currentPage = signal(1);
  totalPages = signal(1);
  totalItems = signal(0);
  itemsPerPage = 10;

  // Filters (not signals - used with ngModel)
  selectedAcademicYear: number | undefined = undefined;
  selectedSemester: string | undefined = undefined;
  selectedDocumentType: number | undefined = undefined;
  selectedStatus: string | undefined = undefined;

  // View mode
  viewMode = signal<'documents' | 'checklist'>('documents');

  // Modals
  showSubmitModal = signal(false);
  showUpdateModal = signal(false);
  showViewModal = signal(false);
  selectedDocument = signal<OrganizationDocument | null>(null);

  // Form data
  documentForm = signal({
    document_type_id: undefined as number | undefined,
    document_title: '',
    academic_year_id: undefined as number | undefined,
    semester: '1st Semester' as '1st Semester' | '2nd Semester' | 'Summer',
    activity_date: '',
    venue: '',
    participants: undefined as number | undefined,
  });

  selectedFile = signal<File | null>(null);

  // SDG List (17 UN Sustainable Development Goals)
  sdgList = [
    { id: 1, name: 'No Poverty' },
    { id: 2, name: 'Zero Hunger' },
    { id: 3, name: 'Good Health and Well-being' },
    { id: 4, name: 'Quality Education' },
    { id: 5, name: 'Gender Equality' },
    { id: 6, name: 'Clean Water and Sanitation' },
    { id: 7, name: 'Affordable and Clean Energy' },
    { id: 8, name: 'Decent Work and Economic Growth' },
    { id: 9, name: 'Industry, Innovation and Infrastructure' },
    { id: 10, name: 'Reduced Inequalities' },
    { id: 11, name: 'Sustainable Cities and Communities' },
    { id: 12, name: 'Responsible Consumption and Production' },
    { id: 13, name: 'Climate Action' },
    { id: 14, name: 'Life Below Water' },
    { id: 15, name: 'Life on Land' },
    { id: 16, name: 'Peace, Justice and Strong Institutions' },
    { id: 17, name: 'Partnerships for the Goals' },
  ];

  selectedSDGs = signal<number[]>([]);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit() {
    this.loadDocuments();
    this.loadDocumentTypes();
    this.loadAcademicYears();
  }

  loadDocuments() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.organizationService
      .getDocuments(
        this.currentPage(),
        this.itemsPerPage,
        this.selectedAcademicYear,
        this.selectedSemester,
        this.selectedDocumentType,
        this.selectedStatus,
      )
      .subscribe({
        next: (response) => {
          this.documents.set(response.documents);
          this.totalPages.set(response.totalPages);
          this.totalItems.set(response.totalItems);
          this.loading.set(false);
        },
        error: (error) => {
          this.errorMessage.set(error.error?.message || 'Failed to load documents');
          this.loading.set(false);
        },
      });
  }

  loadDocumentTypes() {
    this.organizationService.getDocumentTypes().subscribe({
      next: (response) => {
        this.documentTypes.set(response.documentTypes);
      },
      error: (error) => {
        console.error('Failed to load document types:', error);
      },
    });
  }

  loadAcademicYears() {
    this.academicYearService.getAcademicYears().subscribe({
      next: (response: AcademicYearsResponse) => {
        this.academicYears.set(response.academicYears);
        // Don't auto-select filters - show all documents by default
      },
      error: (error: any) => {
        console.error('Failed to load academic years:', error);
      },
    });
  }

  loadChecklist() {
    const academicYearId = this.selectedAcademicYear;
    const semester = this.selectedSemester;

    if (!academicYearId || !semester) {
      this.errorMessage.set('Please select academic year and semester');
      return;
    }

    this.loading.set(true);

    this.organizationService.getSubmissionChecklist(academicYearId, semester).subscribe({
      next: (response) => {
        this.checklist.set(response.checklist);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to load checklist');
        this.loading.set(false);
      },
    });
  }

  switchViewMode(mode: 'documents' | 'checklist') {
    this.viewMode.set(mode);
    if (mode === 'checklist') {
      this.loadChecklist();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 200 * 1024 * 1024) {
        this.errorMessage.set('File size must be less than 200MB');
        return;
      }
      this.selectedFile.set(file);
    }
  }

  openSubmitModal() {
    this.resetForm();
    this.showSubmitModal.set(true);
  }

  openUpdateModal(document: OrganizationDocument) {
    this.selectedDocument.set(document);
    this.documentForm.set({
      document_type_id: document.document_type_id,
      document_title: document.document_title || '',
      academic_year_id: document.academic_year_id,
      semester: document.semester,
      activity_date: document.activity_date || '',
      venue: document.venue || '',
      participants: document.participants || undefined,
    });
    // Load existing SDGs
    if (document.sdgs) {
      this.selectedSDGs.set(this.parseSDGs(document.sdgs));
    } else {
      this.selectedSDGs.set([]);
    }
    this.showUpdateModal.set(true);
  }

  openDeleteModal(document: OrganizationDocument) {
    this.selectedDocument.set(document);
    this.deleteDocument();
  }

  openViewModal(document: OrganizationDocument) {
    this.selectedDocument.set(document);
    this.showViewModal.set(true);
  }

  closeModals() {
    this.showSubmitModal.set(false);
    this.showUpdateModal.set(false);
    this.showViewModal.set(false);
    this.selectedDocument.set(null);
    this.resetForm();
  }

  resetForm() {
    this.documentForm.set({
      document_type_id: undefined,
      document_title: '',
      academic_year_id: undefined,
      semester: '1st Semester',
      activity_date: '',
      venue: '',
      participants: undefined,
    });
    this.selectedFile.set(null);
    this.selectedSDGs.set([]);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  toggleSDG(sdgId: number) {
    const current = this.selectedSDGs();
    if (current.includes(sdgId)) {
      this.selectedSDGs.set(current.filter(id => id !== sdgId));
    } else {
      this.selectedSDGs.set([...current, sdgId]);
    }
  }

  submitDocument() {
    const form = this.documentForm();
    const file = this.selectedFile();

    if (!form.document_title || !form.academic_year_id || !file || !form.activity_date || !form.venue || !form.participants) {
      this.errorMessage.set('All fields are required');
      return;
    }

    if (this.selectedSDGs().length === 0) {
      this.errorMessage.set('Please select at least one SDG');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    if (form.document_type_id) {
      formData.append('document_type_id', form.document_type_id.toString());
    }
    formData.append('document_title', form.document_title);
    formData.append('academic_year_id', form.academic_year_id.toString());
    formData.append('semester', form.semester);
    formData.append('activity_date', form.activity_date);
    formData.append('venue', form.venue);
    formData.append('participants', form.participants.toString());
    formData.append('sdgs', JSON.stringify(this.selectedSDGs()));
    formData.append('document', file);

    this.organizationService.submitDocument(formData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Document submitted successfully',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'OK',
        });
        this.closeModals();
        this.loadDocuments();
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to submit document');
        this.loading.set(false);
      },
    });
  }

  updateDocument() {
    const documentId = this.selectedDocument()?.document_id;
    if (!documentId) return;

    const form = this.documentForm();
    const file = this.selectedFile();

    // Validate required fields
    if (!form.document_title || !form.academic_year_id || !form.activity_date || !form.venue || !form.participants) {
      this.errorMessage.set('All fields are required');
      return;
    }

    if (this.selectedSDGs().length === 0) {
      this.errorMessage.set('Please select at least one SDG');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const formData = new FormData();
    formData.append('document_title', form.document_title);
    formData.append('academic_year_id', form.academic_year_id.toString());
    formData.append('semester', form.semester);
    formData.append('activity_date', form.activity_date);
    formData.append('venue', form.venue);
    formData.append('participants', form.participants.toString());
    formData.append('sdgs', JSON.stringify(this.selectedSDGs()));
    
    // Only append file if a new one was selected
    if (file) {
      formData.append('document', file);
    }

    this.organizationService.updateDocument(documentId, formData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: response.message || 'Document updated successfully',
          confirmButtonColor: '#3b82f6',
          confirmButtonText: 'OK',
        });
        this.closeModals();
        this.loadDocuments();
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Failed to update document');
        this.loading.set(false);
      },
    });
  }

  deleteDocument() {
    const documentId = this.selectedDocument()?.document_id;
    if (!documentId) return;

    Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to delete this report?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.errorMessage.set('');

        this.organizationService.deleteDocument(documentId).subscribe({
          next: (response) => {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Report has been deleted successfully',
              confirmButtonColor: '#3b82f6',
              confirmButtonText: 'OK',
            });
            this.closeModals();
            this.loadDocuments();
          },
          error: (error) => {
            this.errorMessage.set(error.error?.message || 'Failed to delete report');
            this.loading.set(false);
            Swal.fire({
              icon: 'error',
              title: 'Error!',
              text: error.error?.message || 'Failed to delete report',
              confirmButtonColor: '#ef4444',
              confirmButtonText: 'OK',
            });
          },
        });
      }
    });
  }

  downloadDocument(documentId: number, filename: string) {
    this.organizationService.downloadDocument(documentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (error) => {
        this.errorMessage.set('Failed to download document');
        setTimeout(() => this.errorMessage.set(''), 3000);
      },
    });
  }

  applyFilters() {
    this.currentPage.set(1);
    this.loadDocuments();
  }

  refreshChecklist() {
    this.loadChecklist();
  }

  changePage(page: number) {
    this.currentPage.set(page);
    this.loadDocuments();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'revision_needed':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'not_submitted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'revision_needed':
        return 'Needs Revision';
      case 'pending':
        return 'Pending Review';
      case 'not_submitted':
        return 'Not Submitted';
      default:
        return status;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getSDGName(sdgId: number): string {
    const sdg = this.sdgList.find(s => s.id === sdgId);
    return sdg ? sdg.name : 'Unknown';
  }

  parseSDGs(sdgs: any): number[] {
    // If it's already an array, return it
    if (Array.isArray(sdgs)) {
      return sdgs;
    }
    // If it's a string, try to parse it
    if (typeof sdgs === 'string') {
      try {
        const parsed = JSON.parse(sdgs);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Error parsing SDGs:', e);
        return [];
      }
    }
    return [];
  }
  
  // Helper methods for checklist progress
  getApprovedCount(): number {
    return this.checklist().filter((item) => item.submitted && item.status === 'approved').length;
  }

  getRequiredCount(): number {
    return this.checklist().filter((item) => item.required).length;
  }

  isAllRequiredApproved(): boolean {
    const required = this.checklist().filter((item) => item.required);
    return required.every((item) => item.submitted && item.status === 'approved');
  }
}
