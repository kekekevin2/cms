import { Component, OnInit, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FieldPosition,
  PDSTemplateConfigService,
  PDSTemplateFile,
} from '../../../services/core/pds-template-config.service';
import {
  buildTemplateFieldPositions,
} from '../../../services/core/pds-pdf.service';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';

import * as pdfjsLib from 'pdfjs-dist';
declare const jsPDF: any;

/** A template PDF uploaded to the server (pds_template_files); its bytes are fetched on first open. */
interface UploadedPDF {
  id: string;
  fileId: number;
  name: string;
  uploadedAt: Date;
  /** Storage key — saved as config_data.template_key */
  serverKey: string;
  url: string | null;
  data?: Uint8Array;
}

const SELECTED_PDF_KEY = 'pds-template-editor:selectedPdfId';

function toUploadedPDF(t: PDSTemplateFile): UploadedPDF {
  return {
    id: String(t.file_id),
    fileId: t.file_id,
    name: t.name,
    uploadedAt: new Date(t.created_at),
    serverKey: t.key,
    url: t.url,
  };
}

interface FieldOverlay {
  key: string;
  page?: number;
  x: number;
  y: number;
  text: string;
  size: number;
  center: boolean;
  type?: string;
  w?: number;
  h?: number;
  image?: string;
  maxWidth: number | null;
  overflow: string | null;
}

interface ConfigData {
  positions: FieldOverlay[];
  rowHeights?: Record<string, number>;
}

@Component({
  selector: 'app-pds-template-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './pds-template-editor.html',
  styleUrl: './pds-template-editor.css',
})
export class PDSTemplateEditor implements OnInit, AfterViewInit {
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas') overlayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('locatorCanvas') locatorCanvas!: ElementRef<HTMLCanvasElement>;

  loading = signal(false);
  saving = signal(false);
  currentPage = signal(1);
  totalPages = signal(1);
  locatorOn = signal(false);
  selectedField = signal<FieldOverlay | null>(null);
  hoveringField = signal(false);
  private dragState: { field: FieldOverlay; offsetX: number; offsetY: number; moved: boolean } | null =
    null;
  pdfUploaded = signal(false);
  
  // Multiple PDF support
  uploadedPDFs = signal<UploadedPDF[]>([]);
  selectedPdfId = signal<string | null>(null);
  /** Main template the active config uses (kept when saving while the L&D CONT PDF is open). */
  private activeTemplateKey: string | undefined;

  
  // Field editor form
  fieldEditorVisible = signal(false);
  fieldEditorKey = signal('');
  fieldEditorX = signal(0);
  fieldEditorY = signal(0);
  fieldEditorCenter = signal(false);
  fieldEditorW = signal(0);
  fieldEditorH = signal(0);
  fieldEditorText = signal('');
  fieldEditorMaxWidth = signal<number | null>(null);
  fieldEditorOverflow = signal<string>('shrink');
  
  // Coordinate display
  coordX = signal(0);
  coordY = signal(0);
  coordLiveText = signal('');

  // PDF and overlays data
  private pdfDoc: any = null;
  private uploadedPdfData: Uint8Array | null = null;
  private currentViewport: any = null;
  private overlays: FieldOverlay[] = [];
  private defaultPositions: Map<string, any> = new Map();

  // Search and filtering
  fieldSearchQuery = signal('');
  filteredFields = signal<FieldOverlay[]>([]);
  groupedFields = signal<Map<string, FieldOverlay[]>>(new Map());

  // Expose Array to template
  Array = Array;

  constructor(private configService: PDSTemplateConfigService) {}

  async ngOnInit() {
    const [activeKey] = await Promise.all([this.loadConfig(), this.loadServerTemplates()]);
    const pdfs = this.uploadedPDFs();
    if (pdfs.length === 0) return;

    // Open the PDF picked last time in this browser, else the one downloads use, else the newest
    let lastSelected: string | null = null;
    try {
      lastSelected = localStorage.getItem(SELECTED_PDF_KEY);
    } catch {}
    const toSelect =
      pdfs.find((p) => p.id === lastSelected) ??
      pdfs.find((p) => p.serverKey === activeKey) ??
      pdfs[pdfs.length - 1];

    // Canvas elements only exist once pdfUploaded is true
    this.pdfUploaded.set(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await this.selectPDF(toSelect.id);
  }

  /** Template PDFs are stored on the server, so they survive logout and show on every browser. */
  private async loadServerTemplates() {
    try {
      const { templates } = await firstValueFrom(this.configService.listTemplates());
      this.uploadedPDFs.set(templates.map(toUploadedPDF));
    } catch (error) {
      console.error('Could not load uploaded PDS templates:', error);
    }
  }

  private rememberSelectedPdf(pdfId: string | null) {
    try {
      if (pdfId) localStorage.setItem(SELECTED_PDF_KEY, pdfId);
      else localStorage.removeItem(SELECTED_PDF_KEY);
    } catch {}
  }

  ngAfterViewInit() {
    // Same pdfjs-dist build and worker as pds-pdf.service. The worker's version must match the
    // library's exactly, and importing pdfjs-dist replaces the old CDN window.pdfjsLib (3.x).
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  async onPdfFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    // Reset file input so the same file can be chosen again
    input.value = '';
    if (file.type !== 'application/pdf') {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please select a PDF file',
      });
      return;
    }

    this.loading.set(true);
    let newPDF: UploadedPDF;
    try {
      const { template } = await firstValueFrom(this.configService.uploadTemplate(file, file.name));
      newPDF = { ...toUploadedPDF(template), data: new Uint8Array(await file.arrayBuffer()) };
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      this.loading.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: error?.error?.message || 'Failed to upload the PDF. Please try again.',
      });
      return;
    }

    this.uploadedPDFs.set([...this.uploadedPDFs(), newPDF]);

    // Set pdfUploaded FIRST so canvas elements appear in DOM, then wait for Angular to render them
    this.pdfUploaded.set(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await this.selectPDF(newPDF.id);

    if (this.selectedPdfId() === newPDF.id && this.pdfDoc) {
      Swal.fire({
        icon: 'success',
        title: 'PDF Uploaded',
        text: `${file.name} has been uploaded and loaded`,
        timer: 2000,
        showConfirmButton: false,
      });
    }
  }

  async selectPDF(pdfId: string) {
    const pdf = this.uploadedPDFs().find((p) => p.id === pdfId);
    if (!pdf) return;

    this.loading.set(true);
    this.selectedPdfId.set(pdfId);
    this.rememberSelectedPdf(pdfId);

    try {
      if (!pdf.data) {
        if (!pdf.url) throw new Error('This PDF has no download URL');
        const res = await fetch(pdf.url);
        if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);
        pdf.data = new Uint8Array(await res.arrayBuffer());
      }
      this.uploadedPdfData = pdf.data;
      await this.loadUploadedPDF();
      this.loading.set(false);
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      this.loading.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to load "${pdf.name}": ${error?.message || error}`,
      });
    }
  }

  deletePDF(pdfId: string) {
    const pdf = this.uploadedPDFs().find((p) => p.id === pdfId);
    if (!pdf) return;

    Swal.fire({
      icon: 'warning',
      title: 'Delete PDF?',
      text: `Permanently delete "${pdf.name}" from the server?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        await firstValueFrom(this.configService.deleteTemplate(pdf.fileId));
      } catch (error: any) {
        Swal.fire({
          icon: 'error',
          title: 'Cannot Delete',
          text: error?.error?.message || 'Failed to delete the PDF',
        });
        return;
      }

      const updatedPDFs = this.uploadedPDFs().filter((p) => p.id !== pdfId);
      this.uploadedPDFs.set(updatedPDFs);

      // If deleted PDF was selected, select another or clear
      if (this.selectedPdfId() === pdfId) {
        if (updatedPDFs.length > 0) {
          this.selectPDF(updatedPDFs[0].id);
        } else {
          this.selectedPdfId.set(null);
          this.rememberSelectedPdf(null);
          this.pdfUploaded.set(false);
          this.uploadedPdfData = null;
          this.pdfDoc = null;
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'PDF has been removed',
        timer: 1500,
        showConfirmButton: false,
      });
    });
  }

  async loadUploadedPDF() {
    if (!this.uploadedPdfData) return;

    // Wait for pdfjsLib to be available
    let attempts = 0;
    while (typeof pdfjsLib === 'undefined' && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF.js library failed to load');
    }

    console.log('Loading PDF with PDF.js...');
    console.log('PDF data size:', this.uploadedPdfData.byteLength, 'bytes');

    try {
      // Pass a copy: PDF.js can detach the buffer it receives, which would break
      // switching back to this PDF later and the saved copy
      const loadingTask = pdfjsLib.getDocument({ data: this.uploadedPdfData.slice() });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages.set(this.pdfDoc.numPages);
      
      console.log('PDF loaded successfully!', this.pdfDoc.numPages, 'pages');
      
      await this.renderPage(1);
      
      console.log('First page rendered successfully');
    } catch (error) {
      console.error('Error loading uploaded PDF:', error);
      throw error;
    }
  }

  /** Loads the saved positions; resolves to the storage key of the template they belong to. */
  async loadConfig(): Promise<string | undefined> {
    this.loading.set(true);
    let saved: FieldPosition[] = [];
    let templateKey: string | undefined;
    try {
      const response = await firstValueFrom(this.configService.getActiveConfig());
      saved = response.config?.config_data?.positions || [];
      templateKey = response.config?.config_data?.template_key;
      this.activeTemplateKey = templateKey;
    } catch (error) {
      // Use built-in defaults on error
      console.error('Error loading config:', error);
    }
    this.overlays = this.mergeWithDefaults(saved);
    this.saveDefaultPositions();
    this.updateFieldList();
    this.loading.set(false);
    // Redraw in case a PDF rendered before the positions arrived
    if (this.currentViewport) this.drawOverlays(this.currentPage(), this.currentViewport);
    return templateKey;
  }

  /**
   * Every field the PDF export draws (from pds-pdf.service), moved to its saved
   * position where one exists. Saved keys the export no longer knows are dropped.
   */
  private mergeWithDefaults(saved: FieldPosition[]): FieldOverlay[] {
    const savedByKey = new Map(saved.map((p) => [p.key, p]));
    return buildTemplateFieldPositions().map((d) => {
      const p = savedByKey.get(d.key);
      return {
        ...d,
        page: p?.page || d.page,
        x: p?.x ?? d.x,
        y: p?.y ?? d.y,
        center: p?.center ?? d.center,
        size: p?.size || d.size,
        w: d.type === 'image' ? p?.w || d.w : undefined,
        h: d.type === 'image' ? p?.h || d.h : undefined,
        maxWidth: p?.maxWidth ?? null,
        overflow: p?.overflow ?? null,
      };
    });
  }

  private saveDefaultPositions() {
    this.overlays.forEach((o) => {
      this.defaultPositions.set(o.key, {
        x: o.x,
        y: o.y,
        center: o.center,
        w: o.w,
        h: o.h,
        text: o.text,
        maxWidth: o.maxWidth,
        overflow: o.overflow,
      });
    });
  }

  async loadPDF() {
    try {
      // Load the PDS template PDF from public folder
      const loadingTask = pdfjsLib.getDocument('/pds-template.pdf');
      this.pdfDoc = await loadingTask.promise;
      this.totalPages.set(this.pdfDoc.numPages);
      await this.renderPage(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load PDS template PDF. Please ensure the file exists at /pds-template.pdf',
      });
    }
  }

  async renderPage(pageNum: number) {
    if (!this.pdfDoc) {
      console.error('No PDF document loaded');
      return;
    }
    
    // Check if canvas elements are available
    if (!this.pdfCanvas || !this.overlayCanvas || !this.locatorCanvas) {
      console.error('Canvas elements not ready');
      return;
    }

    console.log('Rendering page', pageNum, 'of', this.pdfDoc.numPages);

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      this.currentViewport = viewport;

      console.log('Viewport size:', viewport.width, 'x', viewport.height);

      const canvas = this.pdfCanvas.nativeElement;
      const overlayCanvasEl = this.overlayCanvas.nativeElement;
      const locatorCanvasEl = this.locatorCanvas.nativeElement;

      canvas.width = overlayCanvasEl.width = locatorCanvasEl.width = viewport.width;
      canvas.height = overlayCanvasEl.height = locatorCanvasEl.height = viewport.height;

      console.log('Canvas size set to:', canvas.width, 'x', canvas.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        console.log('Rendering PDF page to canvas...');
        
        // TEST: Draw a red rectangle to verify canvas is working
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 100, 100);
        console.log('Test rectangle drawn');
        
        await page.render({ canvasContext: ctx, viewport }).promise;
        console.log('PDF page rendered successfully');
        
        this.drawOverlays(pageNum, viewport);
        console.log('Overlays drawn');
      }

      this.currentPage.set(pageNum);
    } catch (error) {
      console.error('Error rendering page:', error);
      throw error; // Re-throw to be caught by caller
    }
  }

  drawOverlays(pageNum: number, viewport: any) {
    const overlayCanvasEl = this.overlayCanvas.nativeElement;
    const ctx = overlayCanvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, overlayCanvasEl.width, overlayCanvasEl.height);

    // Draw overlays - if no page specified, show on page 1
    this.overlays
      .filter((f) => (f.page || 1) === pageNum)
      .forEach((f) => {
        const s = viewport.scale;
        const cx = f.x * s;
        const cy = viewport.height - f.y * s;

        // Photo/signature: a labelled box (x/y is its top-left corner, as in the PDF export)
        if (f.type === 'image') {
          const w = (f.w || 0) * s;
          const h = (f.h || 0) * s;
          ctx.save();
          ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
          ctx.fillRect(cx, cy, w, h);
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx, cy, w, h);
          ctx.fillStyle = '#dc2626';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `bold ${10 * (s / 1.5)}px sans-serif`;
          ctx.fillText(f.text, cx + w / 2, cy + h / 2);
          ctx.restore();
          return;
        }

        ctx.fillStyle = '#000';
        ctx.textAlign = f.center ? 'center' : 'left';
        ctx.font = `${(f.size * s) / 1.5}px 'Times New Roman', Times, serif`;
        ctx.fillText(f.text, cx, cy);
      });

    ctx.textAlign = 'left';

    // Highlight selected field
    const selected = this.selectedField();
    if (selected) {
      const selectedPage = selected.page || 1; // Default to page 1
      if (selectedPage === pageNum) {
        const box = this.getFieldBox(selected, viewport, ctx);
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
        ctx.restore();
      }
    }
  }

  /** Bounding box of a text field in canvas pixels, matching how drawOverlays draws it. */
  private getFieldBox(f: FieldOverlay, viewport: any, ctx: CanvasRenderingContext2D) {
    const s = viewport.scale;
    if (f.type === 'image') {
      const left = f.x * s;
      const top = viewport.height - f.y * s;
      return { left, right: left + (f.w || 0) * s, top, bottom: top + (f.h || 0) * s };
    }
    const fontPx = (f.size * s) / 1.5;
    ctx.save();
    ctx.font = `${fontPx}px 'Times New Roman', Times, serif`;
    const width = Math.max(ctx.measureText(f.text || '').width, 16);
    ctx.restore();

    const cx = f.x * s;
    const cy = viewport.height - f.y * s;
    const left = f.center ? cx - width / 2 : cx;
    const pad = 3;
    return {
      left: left - pad,
      right: left + width + pad,
      top: cy - fontPx - pad,
      bottom: cy + fontPx * 0.25 + pad,
    };
  }

  /** Converts a mouse event to canvas pixels and PDF points on the current page. */
  private pointerPosition(event: MouseEvent) {
    const canvas = this.locatorCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const cx = (event.clientX - rect.left) * scale;
    const cy = (event.clientY - rect.top) * scale;
    const s = this.currentViewport.scale;
    return { cx, cy, px: cx / s, py: (canvas.height - cy) / s };
  }

  private fieldAt(cx: number, cy: number): FieldOverlay | null {
    const ctx = this.overlayCanvas.nativeElement.getContext('2d');
    if (!ctx || !this.currentViewport) return null;
    const page = this.currentPage();
    // Search from the end so the field drawn on top wins
    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const f = this.overlays[i];
      if ((f.page || 1) !== page) continue;
      const b = this.getFieldBox(f, this.currentViewport, ctx);
      if (cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom) return f;
    }
    return null;
  }

  onCanvasMouseDown(event: MouseEvent) {
    if (!this.currentViewport || event.button !== 0) return;
    const pos = this.pointerPosition(event);
    const field = this.fieldAt(pos.cx, pos.cy);
    if (!field) return;

    event.preventDefault();
    this.selectField(field);
    this.dragState = { field, offsetX: pos.px - field.x, offsetY: pos.py - field.y, moved: false };
  }

  onCanvasMouseUp() {
    if (!this.dragState) return;
    const moved = this.dragState.moved;
    this.dragState = null;
    if (moved) this.updateFieldList();
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.renderPage(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.renderPage(this.currentPage() + 1);
    }
  }

  toggleLocator() {
    this.locatorOn.update((v) => !v);
  }

  onLocatorMove(event: MouseEvent) {
    if (!this.currentViewport) return;
    const pos = this.pointerPosition(event);

    if (this.dragState) {
      const f = this.dragState.field;
      f.x = Math.round(pos.px - this.dragState.offsetX);
      f.y = Math.round(pos.py - this.dragState.offsetY);
      this.dragState.moved = true;
      this.fieldEditorX.set(f.x);
      this.fieldEditorY.set(f.y);
      this.drawOverlays(this.currentPage(), this.currentViewport);
    } else {
      this.hoveringField.set(this.fieldAt(pos.cx, pos.cy) !== null);
    }

    if (!this.locatorOn()) return;
    const px = Math.round(pos.px);
    const py = Math.round(pos.py);
    this.coordX.set(px);
    this.coordY.set(py);
    this.coordLiveText.set(`x: ${px}  y: ${py}`);
  }

  selectField(field: FieldOverlay) {
    this.selectedField.set(field);
    this.fieldEditorVisible.set(true);
    this.fieldEditorKey.set(field.key);
    this.fieldEditorX.set(field.x);
    this.fieldEditorY.set(field.y);
    this.fieldEditorCenter.set(field.center);
    this.fieldEditorW.set(field.w || 0);
    this.fieldEditorH.set(field.h || 0);
    this.fieldEditorText.set(field.text);
    this.fieldEditorMaxWidth.set(field.maxWidth || null);
    this.fieldEditorOverflow.set(field.overflow || 'shrink');

    // Navigate to field's page if different (default to page 1 if not set)
    const fieldPage = field.page || 1;
    if (fieldPage !== this.currentPage()) {
      this.renderPage(fieldPage);
    } else if (this.currentViewport) {
      this.drawOverlays(this.currentPage(), this.currentViewport);
    }
  }

  applyFieldEdit() {
    const selected = this.selectedField();
    if (!selected) return;

    selected.x = this.fieldEditorX();
    selected.y = this.fieldEditorY();
    selected.center = this.fieldEditorCenter();
    selected.text = this.fieldEditorText();
    
    if (selected.type === 'image') {
      selected.w = this.fieldEditorW();
      selected.h = this.fieldEditorH();
    } else {
      selected.maxWidth = this.fieldEditorMaxWidth();
      selected.overflow = this.fieldEditorOverflow();
    }

    if (this.currentViewport) {
      this.drawOverlays(this.currentPage(), this.currentViewport);
    }

    this.updateFieldList();
    
    Swal.fire({
      icon: 'success',
      title: 'Applied',
      text: 'Field position updated',
      timer: 1500,
      showConfirmButton: false,
    });
  }

  async savePositions() {
    this.saving.set(true);

    // The positions only line up on the PDF they were placed on, so that PDF is saved with them
    // and faculty/dean downloads are drawn on it instead of the bundled template.
    const pdf = this.uploadedPDFs().find((p) => p.id === this.selectedPdfId());

    // Convert overlays to match PDSTemplateConfigData interface
    const configData = {
      template_key: pdf?.serverKey ?? this.activeTemplateKey,
      template_name: pdf?.name,
      positions: this.overlays.map((overlay) => ({
        key: overlay.key,
        x: overlay.x,
        y: overlay.y,
        center: overlay.center,
        text: overlay.text,
        size: overlay.size,
        maxWidth: overlay.maxWidth,
        overflow: overlay.overflow,
        page: overlay.page,
        type: overlay.type,
        w: overlay.w,
        h: overlay.h,
        image: overlay.image,
      })),
    };

    this.configService.saveConfig(configData).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.activeTemplateKey = configData.template_key;
        Swal.fire({
          icon: 'success',
          title: 'Saved',
          text: 'PDS template configuration saved successfully',
        });
      },
      error: (error) => {
        this.saving.set(false);
        console.error('Save error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Save Failed',
          text: error.error?.message || 'Failed to save configuration',
        });
      },
    });
  }

  resetPositions() {
    Swal.fire({
      icon: 'warning',
      title: 'Reset Positions?',
      text: 'This will reset all fields to their default positions. Continue?',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.overlays.forEach((o) => {
          const def = this.defaultPositions.get(o.key);
          if (def) {
            o.x = def.x;
            o.y = def.y;
            o.center = def.center;
            o.w = def.w;
            o.h = def.h;
            o.text = def.text;
            o.maxWidth = def.maxWidth;
            o.overflow = def.overflow;
          }
        });

        if (this.currentViewport) {
          this.drawOverlays(this.currentPage(), this.currentViewport);
        }

        this.updateFieldList();

        Swal.fire({
          icon: 'success',
          title: 'Reset',
          text: 'All positions reset to defaults',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }

  private updateFieldList() {
    const query = this.fieldSearchQuery().toLowerCase();
    const filtered = query
      ? this.overlays.filter((f) => f.key.toLowerCase().includes(query))
      : this.overlays;

    this.filteredFields.set(filtered);

    // Group fields by category
    const grouped = new Map<string, FieldOverlay[]>();
    filtered.forEach((field) => {
      const category = this.getCategoryFor(field.key);
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(field);
    });

    this.groupedFields.set(grouped);
  }

  private getCategoryFor(key: string): string {
    if (key.startsWith('c5_')) return 'C5 – L&D (Continuation)';
    if (key.startsWith('c6_')) return 'C6 – Work Experience (Continuation)';
    if (key.startsWith('c7_')) return 'C7 – Family Background (Continuation)';
    if (key.startsWith('c8_')) return 'C8 – Educational Background (Continuation)';
    if (key.startsWith('c9_')) return 'C9 – Civil Service Eligibility (Continuation)';
    if (key.startsWith('c10_')) return 'C10 – Voluntary Work (Continuation)';
    if (key.startsWith('c11_')) return 'C11 – Other Information (Continuation)';
    if (key.startsWith('signature_')) return 'Signature';
    if (key === 'photo') return 'Photo';
    if (key.startsWith('child_')) return 'Children';
    if (key.startsWith('spouse_')) return 'Spouse';
    if (key.startsWith('father_') || key.startsWith('mother_')) return 'Father / Mother';
    if (key.startsWith('edu_')) return 'Educational Background';
    if (key.startsWith('eligibility_')) return 'Civil Service Eligibility';
    if (key.startsWith('work_')) return 'Work Experience';
    if (key.startsWith('voluntary_')) return 'Voluntary Work';
    if (key.startsWith('training_')) return 'Learning & Development';
    if (key.startsWith('other_')) return 'Other Information';
    if (key.startsWith('reference_')) return 'References';
    if (/^q(3[4-9]|4[0-4])/.test(key)) return 'Questions 34-44';
    if (key.startsWith('residential_')) return 'Residential Address';
    if (key.startsWith('permanent_')) return 'Permanent Address';
    if (key.startsWith('government_') || key === 'submitted_at') return 'Government ID / Date';
    if (key.startsWith('citizenship_') || key === 'dual_citizenship_country')
      return 'Citizenship';
    if (key.startsWith('sex_') || key.startsWith('civil_status_'))
      return 'Sex / Civil Status';
    return 'Personal Information';
  }

  onFieldSearch() {
    this.updateFieldList();
  }

  formatCoordText(field: FieldOverlay): string {
    const base = `p${field.page ?? 1} · ${field.x},${field.y}`;
    return field.type === 'image' ? `${base} · ${field.w}×${field.h}` : base;
  }
}
