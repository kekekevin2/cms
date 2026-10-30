import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DeanService } from '../../../services/dean/dean.service';
import { DeanOrganizationManagementService } from '../../../services/organization/organization.service';
import { DeanOrganizationDocumentsComponent } from './dean-organization-documents';

describe('Dean organization document preview', () => {
  let component: DeanOrganizationDocumentsComponent;
  let organizationService: jasmine.SpyObj<DeanOrganizationManagementService>;

  const document = {
    document_id: 17,
    original_filename: 'organization-report.docx',
  };

  beforeEach(() => {
    organizationService = jasmine.createSpyObj<DeanOrganizationManagementService>(
      'DeanOrganizationManagementService',
      ['previewDocument', 'downloadDocument'],
    );
    TestBed.configureTestingModule({
      imports: [DeanOrganizationDocumentsComponent],
      providers: [
        { provide: DeanOrganizationManagementService, useValue: organizationService },
        { provide: DeanService, useValue: {} },
      ],
    });
    component = TestBed.createComponent(DeanOrganizationDocumentsComponent).componentInstance;
  });

  it('renders the department-authorized DOCX URL with Word formatting', () => {
    const renderDocx = spyOn<any>(component, 'renderDocx').and.callFake(async () => {
      component.previewLoading.set(false);
    });
    organizationService.previewDocument.and.returnValue(of({
      kind: 'docx',
      filename: document.original_filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      url: 'https://files.example/organization-report.docx',
    }));

    component.openDocumentPreview(document);

    expect(organizationService.previewDocument).toHaveBeenCalledOnceWith(17);
    expect(component.showPreviewModal()).toBeTrue();
    expect(component.previewKind()).toBe('docx');
    expect(renderDocx).toHaveBeenCalledWith(
      'https://files.example/organization-report.docx',
      jasmine.any(Number),
    );
    expect(component.previewLoading()).toBeFalse();
  });

  it('renders the department-authorized PDF URL as actual pages', () => {
    const renderPdf = spyOn<any>(component, 'renderPdf').and.callFake(async () => {
      component.previewLoading.set(false);
    });
    organizationService.previewDocument.and.returnValue(of({
      kind: 'pdf',
      filename: 'organization-report.pdf',
      mimeType: 'application/pdf',
      url: 'https://files.example/organization-report.pdf',
    }));

    component.openDocumentPreview({ ...document, original_filename: 'organization-report.pdf' });

    expect(component.previewKind()).toBe('pdf');
    expect(renderPdf).toHaveBeenCalledWith(
      'https://files.example/organization-report.pdf',
      jasmine.any(Number),
    );
    expect(component.previewLoading()).toBeFalse();
  });

  it('shows an API error and resets preview state when closed', () => {
    organizationService.previewDocument.and.returnValue(throwError(() => ({
      error: { message: 'Document not found or not in your department' },
    })));

    component.openDocumentPreview(document);

    expect(component.previewLoading()).toBeFalse();
    expect(component.previewError()).toContain('not found');

    component.closeDocumentPreview();
    expect(component.showPreviewModal()).toBeFalse();
    expect(component.previewDocument()).toBeNull();
    expect(component.previewError()).toBe('');
  });

  it('zooms rendered PDF pages in and out without reloading the document', () => {
    const container = window.document.createElement('div');
    const canvas = window.document.createElement('canvas');
    canvas.dataset['baseWidth'] = '800';
    canvas.dataset['baseHeight'] = '1000';
    container.appendChild(canvas);
    const docxContainer = window.document.createElement('div');
    const frame = window.document.createElement('iframe');
    docxContainer.appendChild(frame);
    window.document.body.appendChild(docxContainer);
    const wordPage = frame.contentDocument!.createElement('section');
    wordPage.className = 'word-preview-page';
    frame.contentDocument!.body.appendChild(wordPage);
    (component as any).pdfPreviewContainer = new ElementRef(container);
    (component as any).docxPreviewContainer = new ElementRef(docxContainer);

    component.previewZoom.set(100);
    component.zoomPdfIn();

    expect(component.previewZoom()).toBe(125);
    expect(canvas.style.width).toBe('1000px');
    expect(canvas.style.height).toBe('1250px');
    expect(wordPage.style.getPropertyValue('zoom')).toBe('1.25');

    component.zoomPdfOut();
    expect(component.previewZoom()).toBe(100);
    expect(canvas.style.width).toBe('800px');

    component.zoomPdfIn();
    component.resetPdfZoom();
    expect(component.previewZoom()).toBe(100);
    docxContainer.remove();
  });
});
