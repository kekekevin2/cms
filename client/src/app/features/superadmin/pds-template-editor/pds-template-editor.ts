import { Component, OnInit, signal, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PDSTemplateConfigService } from '../../../services/core/pds-template-config.service';
import Swal from 'sweetalert2';

declare const pdfjsLib: any;
declare const jsPDF: any;

interface UploadedPDF {
  id: string;
  name: string;
  data: Uint8Array;
  uploadedAt: Date;
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
  pdfUploaded = signal(false);
  
  // Multiple PDF support
  uploadedPDFs = signal<UploadedPDF[]>([]);
  selectedPdfId = signal<string | null>(null);
  
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

  ngOnInit() {
    this.loadConfig();
  }

  ngAfterViewInit() {
    // Initialize PDF.js worker when library is loaded
    const initPdfJs = () => {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js initialized successfully');
      } else {
        // Try again after a short delay
        setTimeout(initPdfJs, 100);
      }
    };
    initPdfJs();
  }

  onPdfFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please select a PDF file',
      });
      return;
    }

    this.loading.set(true);
    const reader = new FileReader();
    
    reader.onload = async (e: any) => {
      try {
        const pdfData = new Uint8Array(e.target.result);
        
        // Create new PDF entry
        const newPDF: UploadedPDF = {
          id: Date.now().toString(),
          name: file.name,
          data: pdfData,
          uploadedAt: new Date()
        };
        
        // Add to list
        const currentPDFs = this.uploadedPDFs();
        this.uploadedPDFs.set([...currentPDFs, newPDF]);
        
        // Select the newly uploaded PDF
        this.selectedPdfId.set(newPDF.id);
        this.uploadedPdfData = pdfData;
        
        // Set pdfUploaded FIRST so canvas elements appear in DOM
        this.pdfUploaded.set(true);
        
        // Wait for Angular to render the canvas elements
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await this.loadUploadedPDF();
        this.loading.set(false);
        
        // Reset file input so same file can be uploaded again
        input.value = '';
        
        Swal.fire({
          icon: 'success',
          title: 'PDF Loaded',
          text: `${file.name} has been loaded successfully`,
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Error loading PDF:', error);
        this.loading.set(false);
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load PDF file. Please try again.',
        });
      }
    };

    reader.onerror = () => {
      this.loading.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to read PDF file',
      });
    };

    reader.readAsArrayBuffer(file);
  }

  async selectPDF(pdfId: string) {
    const pdf = this.uploadedPDFs().find(p => p.id === pdfId);
    if (!pdf) return;

    this.loading.set(true);
    this.selectedPdfId.set(pdfId);
    this.uploadedPdfData = pdf.data;

    try {
      await this.loadUploadedPDF();
      this.loading.set(false);
    } catch (error) {
      console.error('Error switching PDF:', error);
      this.loading.set(false);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load selected PDF',
      });
    }
  }

  deletePDF(pdfId: string) {
    const pdf = this.uploadedPDFs().find(p => p.id === pdfId);
    if (!pdf) return;

    Swal.fire({
      icon: 'warning',
      title: 'Delete PDF?',
      text: `Remove "${pdf.name}" from the editor?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (result.isConfirmed) {
        const currentPDFs = this.uploadedPDFs();
        const updatedPDFs = currentPDFs.filter(p => p.id !== pdfId);
        this.uploadedPDFs.set(updatedPDFs);

        // If deleted PDF was selected, select another or clear
        if (this.selectedPdfId() === pdfId) {
          if (updatedPDFs.length > 0) {
            this.selectPDF(updatedPDFs[0].id);
          } else {
            this.selectedPdfId.set(null);
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
      }
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
      const loadingTask = pdfjsLib.getDocument({ data: this.uploadedPdfData });
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

  loadConfig() {
    this.loading.set(true);
    this.configService.getActiveConfig().subscribe({
      next: (response) => {
        if (response.config && response.config.config_data) {
          // Ensure all positions have required fields with defaults
          this.overlays = (response.config.config_data.positions || []).map((pos) => ({
            ...pos,
            page: pos.page !== undefined ? pos.page : 1, // Default to page 1 if not specified
            maxWidth: pos.maxWidth ?? null,
            overflow: pos.overflow ?? null,
          }));
          this.saveDefaultPositions();
        } else {
          // No config exists, use built-in defaults
          this.overlays = this.buildDefaultOverlays();
          this.saveDefaultPositions();
        }
        this.updateFieldList();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading config:', error);
        // Use built-in defaults on error
        this.overlays = this.buildDefaultOverlays();
        this.saveDefaultPositions();
        this.updateFieldList();
        this.loading.set(false);
      },
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

  private buildDefaultOverlays(): FieldOverlay[] {
    // ALL 400+ default positions from overlay-positions.json
    // NOTE: page numbers removed to match original JSON structure
    // The system will default all fields to page 1
    return [
      // Personal Information
      { key: "surname", x: 135, y: 718, center: false, text: "DELA CRUZ", size: 11, maxWidth: null, overflow: null },
      { key: "first_name", x: 135, y: 701, center: false, text: "JUAN", size: 11, maxWidth: null, overflow: null },
      { key: "middle_name", x: 135, y: 686, center: false, text: "SANTOS", size: 11, maxWidth: null, overflow: null },
      { key: "name_extension", x: 490, y: 701, center: false, text: "Jr.", size: 11, maxWidth: null, overflow: null },
      { key: "date_of_birth", x: 135, y: 665, center: false, text: "15/01/1995", size: 11, maxWidth: null, overflow: null },
      { key: "place_of_birth", x: 135, y: 645, center: false, text: "Manila, Philippines", size: 11, maxWidth: null, overflow: null },
      { key: "sex_checkbox", x: 137, y: 628, center: false, text: "✓", size: 11, maxWidth: null, overflow: null },
      { key: "civil_status_checkbox", x: 137, y: 613, center: false, text: "✓", size: 11, maxWidth: null, overflow: null },
      { key: "civil_status_other", x: 137, y: 591, center: false, text: "✓", size: 11, maxWidth: null, overflow: null },
      { key: "height", x: 137, y: 573, center: false, text: "170", size: 11, maxWidth: null, overflow: null },
      { key: "weight", x: 137, y: 557, center: false, text: "65", size: 11, maxWidth: null, overflow: null },
      { key: "blood_type", x: 137, y: 540, center: false, text: "O+", size: 11, maxWidth: null, overflow: null },
      { key: "gsis_id_no", x: 137, y: 521, center: false, text: "1234567890", size: 11, maxWidth: null, overflow: null },
      { key: "pag_ibig_id_no", x: 137, y: 504, center: false, text: "1234567890123", size: 11, maxWidth: null, overflow: null },
      { key: "philhealth_no", x: 137, y: 485, center: false, text: "12-345678901-2", size: 11, maxWidth: null, overflow: null },
      { key: "sss_no", x: 137, y: 468, center: false, text: "12-3456789-0", size: 11, maxWidth: null, overflow: null },
      { key: "tin_no", x: 137, y: 450, center: false, text: "123-456-789-000", size: 11, maxWidth: null, overflow: null },
      { key: "agency_employee_no", x: 137, y: 433, center: false, text: "asd", size: 11, maxWidth: null, overflow: null },
      { key: "citizenship_checkbox", x: 375, y: 668, center: false, text: "✓", size: 11, maxWidth: null, overflow: null },
      { key: "dual_citizenship_country", x: 370, y: 625, center: false, text: "", size: 11, maxWidth: null, overflow: null },
      { key: "residential_house_no", x: 378, y: 612, center: true, text: "123", size: 11, maxWidth: null, overflow: null },
      { key: "residential_street", x: 492, y: 612, center: true, text: "Sampaguita Street", size: 11, maxWidth: null, overflow: null },
      { key: "residential_subdivision", x: 378, y: 595, center: true, text: "N/A", size: 11, maxWidth: null, overflow: null },
      { key: "residential_barangay", x: 492, y: 595, center: true, text: "Barangay San Roque", size: 11, maxWidth: null, overflow: null },
      { key: "residential_city", x: 378, y: 577, center: true, text: "Manila City", size: 11, maxWidth: null, overflow: null },
      { key: "residential_province", x: 492, y: 577, center: true, text: "Metro Manila", size: 11, maxWidth: null, overflow: null },
      { key: "residential_zip_code", x: 439, y: 558, center: true, text: "1000", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_house_no", x: 378, y: 543, center: true, text: "123", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_street", x: 492, y: 543, center: true, text: "Sampaguita Street", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_subdivision", x: 378, y: 526, center: true, text: "N/A", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_barangay", x: 492, y: 526, center: true, text: "Barangay San Roque", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_city", x: 378, y: 508, center: true, text: "Manila City", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_province", x: 492, y: 508, center: true, text: "Metro Manila", size: 11, maxWidth: null, overflow: null },
      { key: "permanent_zip_code", x: 439, y: 486, center: true, text: "1000", size: 11, maxWidth: null, overflow: null },
      { key: "telephone_no", x: 335, y: 468, center: false, text: "(02) 123-4567", size: 11, maxWidth: null, overflow: null },
      { key: "mobile_no", x: 335, y: 450, center: false, text: "0917-123-4567", size: 11, maxWidth: null, overflow: null },
      { key: "email_address", x: 335, y: 433, center: false, text: "juan.delacruz@email.com", size: 11, maxWidth: null, overflow: null },
      
      // NOTE: For now, returning just the first page fields to test.
      // Once this works, we'll add all 400+ fields from your overlay-positions.json
    ];
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

    // Draw text overlays - if no page specified, show on page 1
    this.overlays
      .filter((f) => {
        const fieldPage = f.page || 1; // Default to page 1 if no page specified
        return fieldPage === pageNum && f.type !== 'image';
      })
      .forEach((f) => {
        const s = viewport.scale;
        const cx = f.x * s;
        const cy = viewport.height - f.y * s;

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
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        
        const s = viewport.scale;
        const fieldHeight = 20; // Approximate height
        const fieldWidth = ctx.measureText(selected.text).width;
        
        ctx.strokeRect(
          selected.x * s,
          viewport.height - selected.y * s - fieldHeight,
          fieldWidth,
          fieldHeight
        );
        ctx.restore();
      }
    }
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
    if (!this.locatorOn() || !this.currentViewport) return;

    const rect = this.locatorCanvas.nativeElement.getBoundingClientRect();
    const scale = this.locatorCanvas.nativeElement.width / rect.width;
    const cx = (event.clientX - rect.left) * scale;
    const cy = (event.clientY - rect.top) * scale;
    const px = Math.round(cx / 1.5);
    const py = Math.round((this.locatorCanvas.nativeElement.height - cy) / 1.5);

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

  savePositions() {
    this.saving.set(true);

    // Convert overlays to match PDSTemplateConfigData interface
    const configData = {
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
    if (key.startsWith('signature_')) return 'Signature';
    if (key.startsWith('photo_')) return 'Photo';
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
    if (['citizenship_checkbox', 'citizenship_subtype_checkbox', 'dual_citizenship_country'].includes(key))
      return 'Citizenship';
    if (['sex_checkbox', 'civil_status_checkbox', 'civil_status_other'].includes(key))
      return 'Sex / Civil Status';
    return 'Personal Information';
  }

  onFieldSearch() {
    this.updateFieldList();
  }

  formatCoordText(field: FieldOverlay): string {
    const base = `p${field.page} · ${field.x},${field.y}`;
    return field.type === 'image' ? `${base} · ${field.w}×${field.h}` : base;
  }
}
