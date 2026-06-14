import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeanOrganizationManagementService } from '../../../services/organization/organization.service';
import { DeanService } from '../../../services/dean/dean.service';

@Component({
  selector: 'app-dean-organization-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-organization-documents.html',
})
export class DeanOrganizationDocumentsComponent implements OnInit {
  private deanOrgService = inject(DeanOrganizationManagementService);
  private deanService = inject(DeanService);

  organizations = signal<any[]>([]);
  documents = signal<any[]>([]);
  filteredDocuments = signal<any[]>([]);

  selectedOrganizationId = signal<number | null>(null);
  filterStatus = signal<string>('all');
  filterSemester = signal<string>('all');

  showReviewModal = signal(false);
  selectedDocument = signal<any>(null);
  reviewAction = signal<'approve' | 'reject' | 'revision'>('approve');
  reviewComments = signal('');

  successMessage = signal('');
  errorMessage = signal('');

  // Pagination
  currentPage = signal(1);
  itemsPerPage = 10;
  totalPages = signal(1);

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.deanService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations.set(response.organizations || []);
      },
      error: (error) => {
        console.error('Failed to load organizations:', error);
        this.showError('Failed to load organizations');
      },
    });
  }

  loadDocuments(organizationId: number) {
    this.selectedOrganizationId.set(organizationId);
    const page = this.currentPage();
    const limit = 100; // Load all for client-side filtering

    this.deanOrgService.getOrganizationDocuments(page, limit, organizationId).subscribe({
      next: (response: any) => {
        this.documents.set(response.documents);
        this.applyFilters();
      },
      error: (error: any) => {
        console.error('Failed to load documents:', error);
        this.showError('Failed to load documents');
      },
    });
  }

  applyFilters() {
    let filtered = [...this.documents()];

    // Filter by status
    if (this.filterStatus() !== 'all') {
      filtered = filtered.filter((doc) => doc.status === this.filterStatus());
    }

    // Filter by semester
    if (this.filterSemester() !== 'all') {
      filtered = filtered.filter((doc) => doc.semester === this.filterSemester());
    }

    this.filteredDocuments.set(filtered);
    this.totalPages.set(Math.ceil(filtered.length / this.itemsPerPage));
  }

  getPaginatedDocuments(): any[] {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredDocuments().slice(start, end);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openReviewModal(document: any) {
    this.selectedDocument.set(document);
    this.reviewAction.set('approve');
    this.reviewComments.set('');
    this.showReviewModal.set(true);
  }

  closeReviewModal() {
    this.showReviewModal.set(false);
    this.selectedDocument.set(null);
    this.reviewComments.set('');
  }

  submitReview() {
    const doc = this.selectedDocument();
    if (!doc) return;

    const action = this.reviewAction();
    let status: 'approved' | 'rejected' | 'revision_needed';

    if (action === 'approve') {
      status = 'approved';
    } else if (action === 'reject') {
      status = 'rejected';
    } else {
      status = 'revision_needed';
    }

    this.deanOrgService
      .reviewDocument(doc.document_id, status, this.reviewComments() || undefined)
      .subscribe({
        next: () => {
          this.showSuccess(`Document ${status} successfully`);
          this.closeReviewModal();
          if (this.selectedOrganizationId()) {
            this.loadDocuments(this.selectedOrganizationId()!);
          }
        },
        error: (error: any) => {
          console.error('Failed to review document:', error);
          this.showError('Failed to review document');
        },
      });
  }

  downloadDocument(documentId: number, filename: string) {
    this.deanOrgService.downloadDocument(documentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Failed to download document:', error);
        this.showError('Failed to download document');
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      revision_needed: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return classes[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      pending: 'fa-clock',
      approved: 'fa-check-circle',
      rejected: 'fa-times-circle',
      revision_needed: 'fa-exclamation-circle',
    };
    return icons[status] || 'fa-file';
  }

  getPendingCount(): number {
    return this.documents().filter((doc) => doc.status === 'pending').length;
  }

  getOrganizationName(orgId: number): string {
    const org = this.organizations().find((o) => o.organization_id === orgId);
    return org?.organization_name || 'Unknown';
  }

  showSuccess(message: string) {
    this.successMessage.set(message);
    this.errorMessage.set('');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  showError(message: string) {
    this.errorMessage.set(message);
    this.successMessage.set('');
    setTimeout(() => this.errorMessage.set(''), 3000);
  }
}
