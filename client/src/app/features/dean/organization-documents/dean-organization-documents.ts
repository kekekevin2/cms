import { Component, ElementRef, OnInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeanOrganizationManagementService } from '../../../services/organization/organization.service';
import { DeanService } from '../../../services/dean/dean.service';
import { downloadFromUrl } from '../../../shared/utils/download.util';
import {
  applyDocxPreviewZoom,
  renderDocxPreview,
} from '../../../shared/utils/docx-preview.util';

@Component({
  selector: 'app-dean-organization-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dean-organization-documents.html',
  styleUrl: './dean-organization-documents.css',
})
export class DeanOrganizationDocumentsComponent implements OnInit {
  private deanOrgService = inject(DeanOrganizationManagementService);
  private deanService = inject(DeanService);

  @ViewChild('pdfPreviewContainer') private pdfPreviewContainer?: ElementRef<HTMLElement>;
  @ViewChild('docxPreviewContainer') private docxPreviewContainer?: ElementRef<HTMLElement>;

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

  showPreviewModal = signal(false);
  previewDocument = signal<any>(null);
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
    this.currentPage.set(1);
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

  openDocumentPreview(document: any) {
    const requestId = ++this.previewRequestId;
    this.previewDocument.set(document);
    this.showPreviewModal.set(true);
    this.previewLoading.set(true);
    this.previewError.set('');
    this.previewKind.set(null);
    this.previewImageUrl.set(null);
    this.previewText.set('');
    this.previewPageCount.set(0);
    this.previewZoom.set(125);

    this.deanOrgService.previewDocument(document.document_id).subscribe({
      next: (preview) => {
        if (requestId !== this.previewRequestId) return;
        this.previewKind.set(preview.kind);
        if (preview.kind === 'pdf' && preview.url) {
          void this.renderPdf(preview.url, requestId);
          return;
        } else if (preview.kind === 'docx' && preview.url) {
          this.previewZoom.set(100);
          void this.renderDocx(preview.url, requestId);
          return;
        } else if (preview.kind === 'image' && preview.url) {
          this.previewImageUrl.set(preview.url);
        } else if (preview.kind === 'text') {
          this.previewText.set(preview.text || 'This document has no readable text.');
        }
        this.previewLoading.set(false);
      },
      error: (error) => {
        if (requestId !== this.previewRequestId) return;
        this.previewError.set(error.error?.message || 'Unable to preview this document.');
        this.previewLoading.set(false);
      },
    });
  }

  closeDocumentPreview() {
    this.previewRequestId++;
    this.showPreviewModal.set(false);
    this.previewDocument.set(null);
    this.previewImageUrl.set(null);
    this.previewText.set('');
    this.previewPageCount.set(0);
    this.previewZoom.set(125);
    this.previewError.set('');
    this.pdfPreviewContainer?.nativeElement.replaceChildren();
    this.docxPreviewContainer?.nativeElement.replaceChildren();
    void this.previewPdfDocument?.destroy();
    this.previewPdfDocument = undefined;
  }

  private async renderPdf(url: string, requestId: number): Promise<void> {
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
      const container = this.pdfPreviewContainer?.nativeElement;
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
      console.error('PDF preview rendering failed:', error);
      this.previewError.set('Unable to render the PDF preview.');
      this.previewLoading.set(false);
    }
  }

  private async renderDocx(url: string, requestId: number): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`DOCX request failed with status ${response.status}`);
      const data = await response.arrayBuffer();
      if (requestId !== this.previewRequestId) return;

      this.previewLoading.set(false);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const container = this.docxPreviewContainer?.nativeElement;
      if (!container || requestId !== this.previewRequestId) return;
      const pageCount = await renderDocxPreview(data, container, this.previewZoom());
      if (requestId !== this.previewRequestId) return;
      this.previewPageCount.set(pageCount);
    } catch (error) {
      if (requestId !== this.previewRequestId) return;
      console.error('DOCX preview rendering failed:', error);
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

    this.pdfPreviewContainer?.nativeElement
      .querySelectorAll<HTMLCanvasElement>('canvas[data-base-width][data-base-height]')
      .forEach((canvas) => {
        const baseWidth = Number(canvas.dataset['baseWidth']);
        const baseHeight = Number(canvas.dataset['baseHeight']);
        if (!Number.isFinite(baseWidth) || !Number.isFinite(baseHeight)) return;
        canvas.style.width = `${baseWidth * zoomMultiplier}px`;
        canvas.style.height = `${baseHeight * zoomMultiplier}px`;
      });
    const docxContainer = this.docxPreviewContainer?.nativeElement;
    if (docxContainer) applyDocxPreviewZoom(docxContainer, clampedZoom);
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
      next: ({ url }) => downloadFromUrl(url, filename),
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
