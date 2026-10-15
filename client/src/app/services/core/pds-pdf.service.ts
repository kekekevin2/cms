import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import {
  PersonalDataSheet,
  PDSEducation,
  PDSEligibility,
  PDSOtherInfo,
  PDSTraining,
  PDSVoluntaryWork,
  PDSWorkExperience,
} from './pds.service';
import { PDSTemplateConfigService, PDSTemplateConfigData } from './pds-template-config.service';
import { firstValueFrom } from 'rxjs';

// Use CDN for worker to avoid Vite dynamic import warning
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

interface Overlay {
  /** Unique field key — the same key the PDS Template Editor saves positions under. */
  key: string;
  page: number;
  x: number;
  y: number;
  text: string;
  size?: number;
  center?: boolean;
  /** Set on the photo/signature boxes, which draw an image of size w×h instead of text. */
  image?: 'photo' | 'signature';
  w?: number;
  h?: number;
  /**
   * Continuation-sheet overlays only: which copy of the sheet this row lands on (0 = first).
   * Undefined means it is drawn on every copy (e.g. the sheet's signature).
   */
  sheet?: number;
}

// All default positions below match the CS Form 212 Revised 2026 template (A4, 595×842 pt, 11
// pages: the 4-page form followed by continuation sheets C5–C11). x/y are PDF points with y measured
// from the page bottom; text y is the baseline, image boxes use x/y as their top-left corner.

// ID photo — the PHOTO box on page 4.
const PHOTO_BOX = { page: 4, x: 448.5, y: 324, w: 79, h: 97.5 };

// Signature — one image, placed in the SIGNATURE box of every page.
const SIGNATURE_BOXES: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 138, y: 35, w: 224, h: 19 },
  2: { x: 142, y: 89, w: 168, h: 17 },
  3: { x: 179, y: 53, w: 166, h: 18 },
  4: { x: 246, y: 185, w: 174, h: 47 },
};

const CHECK = '✓';

/** Rows of each repeating table on the main form; anything past these goes to its continuation sheet. */
const CHILD_ROWS = 13;
const ELIGIBILITY_ROWS = 7;
const WORK_EXPERIENCE_ROWS = 24;
const TRAINING_ROWS = 17;
const VOLUNTARY_WORK_ROWS = 9;
const OTHER_INFO_ROWS = 7;

/**
 * Continuation sheets C5–C11. Entries that do not fit the main form continue on the matching sheet,
 * `rows` per sheet, repeating the sheet as often as needed after page 4. Each is a page of the
 * uploaded template recognised by its "(Continuation)" heading (see findContinuationPages) and is
 * printed only when needed. Their fields are keyed "<id>_…" (e.g. "c6_work_3_position_title") and
 * sit on `page` in the editor, which is where the sheet is in the reference template.
 */
export const CONTINUATION_SHEETS = {
  c5: { heading: /LEARNING AND DEVELOPMENT .*\(Continuation\)/i, rows: 44, page: 5 },
  c6: { heading: /WORK EXPERIENCE \(Continuation\)/i, rows: 33, page: 6 },
  c7: { heading: /FAMILY BACKGROUND \(Continuation\)/i, rows: 20, page: 7 },
  c8: { heading: /EDUCATIONAL BACKGROUND \(Continuation\)/i, rows: 36, page: 8 },
  c9: { heading: /CIVIL SERVICE ELIGIBILITY \(Continuation\)/i, rows: 24, page: 9 },
  c10: { heading: /VOLUNTARY WORK .*\(Continuation\)/i, rows: 29, page: 10 },
  c11: { heading: /OTHER INFORMATION \(Continuation\)/i, rows: 31, page: 11 },
} as const;
type SheetId = keyof typeof CONTINUATION_SHEETS;
const SHEET_IDS = Object.keys(CONTINUATION_SHEETS) as SheetId[];

/** The continuation sheet a field belongs to ("c6_work_1_…" → "c6"), or null for main-form fields. */
export function continuationSheetOf(key: string): SheetId | null {
  const m = /^(c\d+)_/.exec(key);
  return m && m[1] in CONTINUATION_SHEETS ? (m[1] as SheetId) : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fallback template shipped in client/public, used until a template is uploaded in the editor. */
const BUNDLED_TEMPLATE = '/pds-template.pdf';

/** Renders a Personal Data Sheet onto the CS Form No. 212 template and downloads the result as a PDF. */
@Injectable({ providedIn: 'root' })
export class PdsPdfService {
  /** Loaded template PDFs, keyed by storage key (or the bundled path when no template was uploaded). */
  private templateDocs = new Map<string, Promise<PDFDocumentProxy>>();
  private configData: PDSTemplateConfigData | null = null;
  /** URL of the template PDF uploaded in the PDS Template Editor, if any. */
  private templateUrl: string | null = null;

  constructor(private configService: PDSTemplateConfigService) {}

  /** Loads (once per storage key) a PDF from the given URL. */
  private loadDoc(cacheKey: string, url: string): Promise<PDFDocumentProxy> {
    let doc = this.templateDocs.get(cacheKey);
    if (!doc) {
      doc = pdfjsLib.getDocument(url).promise;
      // Don't cache a failed load, so the next export retries
      doc.catch(() => this.templateDocs.delete(cacheKey));
      this.templateDocs.set(cacheKey, doc);
    }
    return doc;
  }

  /**
   * The template the saved positions were set against: the PDF uploaded in the PDS
   * Template Editor, or the bundled /pds-template.pdf when none has been uploaded.
   */
  private getTemplate(): Promise<PDFDocumentProxy> {
    const key = this.configData?.template_key;
    return key && this.templateUrl
      ? this.loadDoc(key, this.templateUrl)
      : this.loadDoc(BUNDLED_TEMPLATE, BUNDLED_TEMPLATE);
  }

  /** Load the active configuration from the backend */
  private async loadConfig(): Promise<void> {
    // Re-fetched on every export so positions saved in the editor apply without a page reload
    this.configData = null;
    this.templateUrl = null;
    try {
      const response = await firstValueFrom(this.configService.getActiveConfig());
      if (response.config && response.config.config_data) {
        this.configData = response.config.config_data;
        this.templateUrl = response.config.template_url || null;
        console.log('PDS Template Configuration loaded:', this.configData);
      } else {
        console.log('No active PDS template configuration found, using defaults');
      }
    } catch (error) {
      console.error('Error loading PDS template configuration, using defaults:', error);
    }
  }

  async generateAndDownload(pds: PersonalDataSheet): Promise<void> {
    await this.loadConfig();
    const pdf = await this.buildPdf(pds);
    if (!pdf) return;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    pdf.save(`PDS_${pds.surname || 'Faculty'}_${pds.first_name || ''}_${dateStr}.pdf`);
  }

  /** Builds the same PDF and returns a blob: URL for in-app preview instead of downloading it. */
  async generatePreviewUrl(pds: PersonalDataSheet): Promise<string | null> {
    await this.loadConfig();
    const pdf = await this.buildPdf(pds);
    if (!pdf) return null;
    return pdf.output('bloburl').toString();
  }

  private async buildPdf(pds: PersonalDataSheet): Promise<jsPDF | null> {
    const [pdfDoc, photoImage, signatureImage] = await Promise.all([
      this.getTemplate(),
      this.loadImage(pds.photo_path),
      this.loadImage(pds.signature_path),
    ]);

    // Built-in positions, with every field saved in the PDS Template Editor moved to its saved position
    const defaults = buildOverlays(pds);
    const overlays = this.configData ? this.applyConfig(defaults, this.configData) : defaults;
    let pdf: jsPDF | null = null;

    const renderPage = async (doc: PDFDocumentProxy, pageNum: number, pageOverlays: Overlay[]) => {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const scale = viewport.scale;
      pageOverlays.forEach((o) => {
        const cx = o.x * scale;
        const cy = viewport.height - o.y * scale;
        if (o.image) {
          const img = o.image === 'photo' ? photoImage : signatureImage;
          if (img) ctx.drawImage(img, cx, cy, (o.w ?? 0) * scale, (o.h ?? 0) * scale);
          return;
        }
        ctx.font = `${((o.size || 11) * scale) / 1.5}px 'Times New Roman', Times, serif`;
        ctx.fillStyle = '#000';
        ctx.textAlign = o.center ? 'center' : 'left';
        ctx.fillText(o.text, cx, cy);
      });
      ctx.textAlign = 'left';

      const rawViewport = page.getViewport({ scale: 1 });
      const wPt = rawViewport.width * 0.75;
      const hPt = rawViewport.height * 0.75;
      const orientation = hPt > wPt ? 'portrait' : 'landscape';
      if (!pdf) {
        pdf = new jsPDF({ orientation, unit: 'pt', format: [wPt, hPt] });
      } else {
        pdf.addPage([wPt, hPt], orientation);
      }
      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, wPt, hPt);
    };

    // Continuation sheets (C5–C11) are pages of the template, printed only for rows that overflow
    // the main form — once per sheet's worth of rows, after the regular pages, in C5→C11 order.
    const continuationPages = await findContinuationPages(pdfDoc);
    const skip = new Set(continuationPages.values());
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      if (skip.has(pageNum)) continue;
      await renderPage(pdfDoc, pageNum, overlays.filter((o) => o.page === pageNum && !continuationSheetOf(o.key)));
    }
    for (const id of SHEET_IDS) {
      const page = continuationPages.get(id);
      if (!page) continue;
      const rows = overlays.filter((o) => continuationSheetOf(o.key) === id);
      const sheets = Math.max(0, ...rows.map((o) => (o.sheet ?? -1) + 1));
      for (let sheet = 0; sheet < sheets; sheet++) {
        await renderPage(pdfDoc, page, rows.filter((o) => o.sheet === undefined || o.sheet === sheet));
      }
    }

    return pdf;
  }

  /** Moves each default overlay that has a saved position (by key) to that position. */
  private applyConfig(defaults: Overlay[], config: PDSTemplateConfigData): Overlay[] {
    const saved = new Map((config.positions || []).map((p) => [p.key, p]));
    return defaults.map((o) => {
      const p = saved.get(o.key);
      if (!p) return o;
      return {
        ...o,
        page: p.page || o.page,
        x: p.x,
        y: p.y,
        center: p.center ?? o.center,
        size: p.size || o.size,
        w: o.image ? p.w || o.w : o.w,
        h: o.image ? p.h || o.h : o.h,
      };
    });
  }

  private loadImage(path: string | undefined): Promise<HTMLImageElement | null> {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }
}

function formatDMY(value: string | undefined | null): string {
  if (!value) return '';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const [year, month, day] = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : (() => {
        const d = new Date(value);
        if (isNaN(d.getTime())) return ['', '', ''];
        return [
          String(d.getFullYear()),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0'),
        ];
      })();
  if (!year) return '';
  return `${day}/${month}/${year}`;
}

function yn(value: boolean | undefined): string {
  return value ? CHECK : '';
}

function civilStatusOther(status: PersonalDataSheet['civil_status']): string {
  const standard: PersonalDataSheet['civil_status'][] = [
    'Single',
    'Married',
    'Widowed',
    'Separated',
  ];
  return status && !standard.includes(status) ? status : '';
}

/**
 * Splits a list between the rows on the main form and its continuation sheet: the first `mainRows`
 * items go to `main(item, i)`, the rest to `cont(item, row, sheet)`, `sheetRows` per sheet copy.
 */
function spill<T>(
  items: T[],
  mainRows: number,
  sheetRows: number,
  main: (item: T, i: number) => void,
  cont: (item: T, row: number, sheet: number) => void,
) {
  items.forEach((item, i) => {
    if (i < mainRows) return main(item, i);
    const j = i - mainRows;
    cont(item, j % sheetRows, Math.floor(j / sheetRows));
  });
}

/**
 * Every text position drawn on the PDS, each with a unique key. The PDS Template Editor lists exactly
 * these keys (see buildTemplateFieldPositions), and a saved position for a key replaces that
 * overlay's x/y here.
 *
 * `showAllChecks` draws every checkbox option (used by the editor so each one can be positioned).
 */
function buildOverlays(pds: PersonalDataSheet, showAllChecks = false): Overlay[] {
  const overlays: Overlay[] = [];
  const push = (o: Overlay) => overlays.push(o);
  const chk = (on: boolean) => (showAllChecks || on ? CHECK : '');
  const sheetSignature = (id: SheetId) => {
    const box = CONTINUATION_SIGNATURES[id];
    push({ key: `${id}_signature`, image: 'signature', page: CONTINUATION_SHEETS[id].page, ...box, text: '' });
  };

  // ── PAGE 1 — I. Personal Information ──
  push({ key: 'surname', page: 1, x: 139, y: 721, text: pds.surname || '', size: 11 });
  push({ key: 'first_name', page: 1, x: 139, y: 704.6, text: pds.first_name || '', size: 11 });
  push({ key: 'name_extension', page: 1, x: 465.4, y: 702.5, text: pds.name_extension || '', size: 9, center: true });
  push({ key: 'middle_name', page: 1, x: 139, y: 689.3, text: pds.middle_name || '', size: 11 });
  push({ key: 'date_of_birth', page: 1, x: 139, y: 668, text: formatDMY(pds.date_of_birth), size: 11 });
  push({ key: 'place_of_birth', page: 1, x: 139, y: 646, text: pds.place_of_birth || '', size: 11 });

  // Sex / civil status check boxes (box centres sit ~5pt left of their labels)
  push({ key: 'sex_check_male', page: 1, x: 143.1, y: 630, text: chk(pds.sex !== 'Female'), size: 11, center: true });
  push({ key: 'sex_check_female', page: 1, x: 212.9, y: 630, text: chk(pds.sex === 'Female'), size: 11, center: true });
  const otherStatus = civilStatusOther(pds.civil_status);
  const civil = pds.civil_status;
  push({ key: 'civil_status_check_single', page: 1, x: 143.1, y: 615.4, text: chk(civil === 'Single'), size: 11, center: true });
  push({ key: 'civil_status_check_married', page: 1, x: 212.9, y: 615, text: chk(civil === 'Married'), size: 11, center: true });
  push({ key: 'civil_status_check_widowed', page: 1, x: 143.1, y: 605, text: chk(civil === 'Widowed'), size: 11, center: true });
  push({ key: 'civil_status_check_separated', page: 1, x: 212.9, y: 605, text: chk(civil === 'Separated'), size: 11, center: true });
  push({ key: 'civil_status_check_other', page: 1, x: 143.1, y: 595, text: chk(!!otherStatus || !civil), size: 11, center: true });
  push({ key: 'civil_status_other', page: 1, x: 172, y: 595, text: otherStatus, size: 10 });

  push({ key: 'height', page: 1, x: 139, y: 575, text: pds.height != null ? String(pds.height) : '', size: 11 });
  push({ key: 'weight', page: 1, x: 139, y: 558.5, text: pds.weight != null ? String(pds.weight) : '', size: 11 });
  push({ key: 'blood_type', page: 1, x: 139, y: 541, text: pds.blood_type || '', size: 11 });
  // The 2026 form's "10. UMID ID NO." and "13. PhilSys Card Number (PCN)" rows hold the fields the
  // faculty form still calls GSIS ID No. and SSS No.
  push({ key: 'gsis_id_no', page: 1, x: 139, y: 523, text: pds.gsis_id_no || '', size: 11 });
  push({ key: 'pag_ibig_id_no', page: 1, x: 139, y: 505, text: pds.pag_ibig_id_no || '', size: 11 });
  push({ key: 'philhealth_no', page: 1, x: 139, y: 487, text: pds.philhealth_no || '', size: 11 });
  push({ key: 'sss_no', page: 1, x: 139, y: 469, text: pds.sss_no || '', size: 11 });
  push({ key: 'tin_no', page: 1, x: 139, y: 451, text: pds.tin_no || '', size: 11 });
  push({ key: 'agency_employee_no', page: 1, x: 139, y: 433, text: pds.agency_employee_no || '', size: 11 });

  // 16. Citizenship
  const filipino = pds.citizenship_type === 'Filipino';
  const naturalized = pds.citizenship_type === 'By Naturalization';
  push({ key: 'citizenship_check_filipino', page: 1, x: 374.6, y: 670.6, text: chk(filipino), size: 11, center: true });
  push({ key: 'citizenship_check_dual', page: 1, x: 417, y: 670.6, text: chk(!filipino), size: 11, center: true });
  push({ key: 'citizenship_check_by_birth', page: 1, x: 430.1, y: 659.6, text: chk(!filipino && !naturalized), size: 11, center: true });
  push({ key: 'citizenship_check_by_naturalization', page: 1, x: 467.3, y: 659.4, text: chk(!filipino && naturalized), size: 11, center: true });
  push({ key: 'dual_citizenship_country', page: 1, x: 370, y: 628, text: pds.dual_citizenship_country || '', size: 11 });

  // 17. Residential / 18. Permanent address — each value sits above its italic caption
  const address = (prefix: 'residential' | 'permanent', rowY: [number, number, number], zipY: number) => {
    const v = (f: string) => ((pds as any)[`${prefix}_${f}`] as string) || '';
    push({ key: `${prefix}_house_no`, page: 1, x: 377, y: rowY[0], text: v('house_no'), size: 10, center: true });
    push({ key: `${prefix}_street`, page: 1, x: 485.6, y: rowY[0], text: v('street'), size: 10, center: true });
    push({ key: `${prefix}_subdivision`, page: 1, x: 377, y: rowY[1], text: v('subdivision'), size: 10, center: true });
    push({ key: `${prefix}_barangay`, page: 1, x: 485.6, y: rowY[1], text: v('barangay'), size: 10, center: true });
    push({ key: `${prefix}_city`, page: 1, x: 377, y: rowY[2], text: v('city'), size: 10, center: true });
    push({ key: `${prefix}_province`, page: 1, x: 485.6, y: rowY[2], text: v('province'), size: 10, center: true });
    push({ key: `${prefix}_zip_code`, page: 1, x: 437.3, y: zipY, text: v('zip_code'), size: 11, center: true });
  };
  address('residential', [615, 597.5, 579.5], 559);
  address('permanent', [546.8, 528.8, 510.8], 488);

  push({ key: 'telephone_no', page: 1, x: 332, y: 469, text: pds.telephone_no || '', size: 11 });
  push({ key: 'mobile_no', page: 1, x: 332, y: 451, text: pds.mobile_no || '', size: 11 });
  push({ key: 'email_address', page: 1, x: 332, y: 433, text: pds.email_address || '', size: 11 });

  // ── II. Family Background ──
  push({ key: 'spouse_surname', page: 1, x: 139, y: 405, text: pds.spouse_surname || '', size: 11 });
  push({ key: 'spouse_first_name', page: 1, x: 139, y: 390, text: pds.spouse_first_name || '', size: 11 });
  push({ key: 'spouse_name_ext', page: 1, x: 311, y: 390, text: pds.spouse_name_ext || '', size: 9, center: true });
  push({ key: 'spouse_middle_name', page: 1, x: 139, y: 375, text: pds.spouse_middle_name || '', size: 11 });
  push({ key: 'spouse_occupation', page: 1, x: 139, y: 360, text: pds.spouse_occupation || '', size: 11 });
  push({ key: 'spouse_employer', page: 1, x: 139, y: 345, text: pds.spouse_employer || '', size: 11 });
  push({ key: 'spouse_business_address', page: 1, x: 139, y: 330, text: pds.spouse_business_address || '', size: 10 });
  push({ key: 'spouse_telephone', page: 1, x: 139, y: 315, text: pds.spouse_telephone || '', size: 11 });

  // 23. Children — 13 rows on page 1, the rest on C7 (its child columns)
  const childBottoms = [386.3, 371.3, 356.3, 341.3, 326.3, 311.3, 296.3, 281.3, 266.3, 251.6, 236.3, 221.3, 206.3];
  spill(
    pds.children || [],
    CHILD_ROWS,
    CONTINUATION_SHEETS.c7.rows,
    (child, i) => {
      const y = round2(childBottoms[i] + 4.5);
      push({ key: `child_${i + 1}_name`, page: 1, x: 332, y, text: child.child_name || '', size: 10 });
      push({ key: `child_${i + 1}_date_of_birth`, page: 1, x: 508, y, text: formatDMY(child.date_of_birth), size: 10, center: true });
    },
    (child, row, sheet) => {
      const y = round2(757.9 - row * 22.8);
      const page = CONTINUATION_SHEETS.c7.page;
      push({ key: `c7_child_${row + 1}_name`, page, sheet, x: 472, y, text: child.child_name || '', size: 9 });
      push({ key: `c7_child_${row + 1}_date_of_birth`, page, sheet, x: 571.6, y, text: formatDMY(child.date_of_birth), size: 8, center: true });
    },
  );
  if ((pds.children || []).length > CHILD_ROWS) sheetSignature('c7');

  push({ key: 'father_surname', page: 1, x: 139, y: 285.5, text: pds.father_surname || '', size: 11 });
  push({ key: 'father_first_name', page: 1, x: 139, y: 270.5, text: pds.father_first_name || '', size: 11 });
  push({ key: 'father_name_ext', page: 1, x: 311, y: 270.5, text: pds.father_name_ext || '', size: 9, center: true });
  push({ key: 'father_middle_name', page: 1, x: 139, y: 255.8, text: pds.father_middle_name || '', size: 11 });
  push({ key: 'mother_surname', page: 1, x: 139, y: 225.5, text: pds.mother_surname || '', size: 11 });
  push({ key: 'mother_first_name', page: 1, x: 139, y: 210.5, text: pds.mother_first_name || '', size: 11 });
  push({ key: 'mother_middle_name', page: 1, x: 139, y: 196, text: pds.mother_middle_name || '', size: 11 });

  // ── III. Educational Background — one row per level on page 1; any other entries on C8 ──
  const levels: [PDSEducation['level'], number][] = [
    ['ELEMENTARY', 131],
    ['SECONDARY', 110.5],
    ['VOCATIONAL', 90],
    ['COLLEGE', 69.6],
    ['GRADUATE STUDIES', 49.5],
  ];
  const onPage1 = new Set<PDSEducation>();
  levels.forEach(([level, y]) => {
    const e = (pds.education || []).find((x) => x.level === level);
    if (e) onPage1.add(e);
    const k = `edu_${level.toLowerCase().replace(/ /g, '_')}`;
    push({ key: `${k}_school_name`, page: 1, x: 139, y, text: e?.school_name || '', size: 10 });
    push({ key: `${k}_degree_course`, page: 1, x: 258, y, text: e?.degree_course || '', size: 10 });
    push({ key: `${k}_period_from`, page: 1, x: 380.4, y, text: e?.period_from != null ? String(e.period_from) : '', size: 9, center: true });
    push({ key: `${k}_period_to`, page: 1, x: 410.4, y, text: e?.period_to != null ? String(e.period_to) : '', size: 9, center: true });
    push({ key: `${k}_highest_level_earned`, page: 1, x: 447.6, y, text: e?.highest_level_earned || '', size: 9, center: true });
    push({ key: `${k}_year_graduated`, page: 1, x: 487.8, y, text: e?.year_graduated != null ? String(e.year_graduated) : '', size: 9, center: true });
    push({ key: `${k}_scholarship_honors`, page: 1, x: 525.8, y, text: e?.scholarship_honors || '', size: 8, center: true });
  });
  const extraEducation = (pds.education || []).filter((e) => !onPage1.has(e));
  extraEducation.forEach((e, j) => {
    const row = j % CONTINUATION_SHEETS.c8.rows;
    const sheet = Math.floor(j / CONTINUATION_SHEETS.c8.rows);
    const k = `c8_edu_${row + 1}`;
    const y = round2(717.5 - row * 18);
    const page = CONTINUATION_SHEETS.c8.page;
    push({ key: `${k}_level`, page, sheet, x: 54, y, text: e.level || '', size: 9 });
    push({ key: `${k}_school_name`, page, sheet, x: 155, y, text: e.school_name || '', size: 9 });
    push({ key: `${k}_degree_course`, page, sheet, x: 256, y, text: e.degree_course || '', size: 9 });
    push({ key: `${k}_period_from`, page, sheet, x: 369.6, y, text: e.period_from != null ? String(e.period_from) : '', size: 9, center: true });
    push({ key: `${k}_period_to`, page, sheet, x: 403.2, y, text: e.period_to != null ? String(e.period_to) : '', size: 9, center: true });
    push({ key: `${k}_highest_level_earned`, page, sheet, x: 444.9, y, text: e.highest_level_earned || '', size: 9, center: true });
    push({ key: `${k}_year_graduated`, page, sheet, x: 486.7, y, text: e.year_graduated != null ? String(e.year_graduated) : '', size: 9, center: true });
    push({ key: `${k}_scholarship_honors`, page, sheet, x: 520.2, y, text: e.scholarship_honors || '', size: 8, center: true });
  });
  if (extraEducation.length > 0) sheetSignature('c8');

  // ── PAGE 2 — IV. Civil Service Eligibility (7 rows; the rest on C9) ──
  const eligibilityRow = (
    e: PDSEligibility,
    k: string,
    page: number,
    y: number,
    col: { career: number; rating: number; date: number; place: number; number: number; validity: number },
    sheet?: number,
  ) => {
    push({ key: `${k}_career_service`, page, sheet, x: col.career, y, text: e.career_service || '', size: 10 });
    push({ key: `${k}_rating`, page, sheet, x: col.rating, y, text: e.rating || '', size: 10, center: true });
    push({ key: `${k}_date_of_examination`, page, sheet, x: col.date, y, text: formatDMY(e.date_of_examination), size: 10, center: true });
    push({ key: `${k}_place_of_examination`, page, sheet, x: col.place, y, text: e.place_of_examination || '', size: 10 });
    push({ key: `${k}_license_number`, page, sheet, x: col.number, y, text: e.license_number || '', size: 9, center: true });
    push({ key: `${k}_license_validity`, page, sheet, x: col.validity, y, text: e.license_validity || '', size: 8, center: true });
  };
  spill(
    pds.eligibilities || [],
    ELIGIBILITY_ROWS,
    CONTINUATION_SHEETS.c9.rows,
    (e, i) =>
      eligibilityRow(e, `eligibility_${i + 1}`, 2, round2(726 - i * 19.77), {
        career: 66, rating: 234, date: 286.6, place: 317, number: 478.3, validity: 516,
      }),
    (e, row, sheet) =>
      eligibilityRow(e, `c9_eligibility_${row + 1}`, CONTINUATION_SHEETS.c9.page, round2(735.6 - row * 25.2), {
        career: 27, rating: 257.4, date: 327.6, place: 367, number: 489, validity: 550.2,
      }, sheet),
  );
  if ((pds.eligibilities || []).length > ELIGIBILITY_ROWS) sheetSignature('c9');

  // V. Work Experience (24 rows; the rest on C6)
  const workRow = (
    w: PDSWorkExperience,
    k: string,
    page: number,
    y: number,
    col: { from: number; to: number; position: number; dept: number; salary: number; grade: number; status: number; gov: number },
    sheet?: number,
  ) => {
    const dateTo = w.date_to ? (w.date_to.toLowerCase() === 'present' ? 'Present' : formatDMY(w.date_to)) : '';
    push({ key: `${k}_date_from`, page, sheet, x: col.from, y, text: formatDMY(w.date_from), size: 9, center: true });
    push({ key: `${k}_date_to`, page, sheet, x: col.to, y, text: dateTo, size: 9, center: true });
    push({ key: `${k}_position_title`, page, sheet, x: col.position, y, text: w.position_title || '', size: 10 });
    push({ key: `${k}_department_agency`, page, sheet, x: col.dept, y, text: w.department_agency || '', size: 10, center: true });
    push({ key: `${k}_monthly_salary`, page, sheet, x: col.salary, y, text: w.monthly_salary != null ? String(w.monthly_salary) : '', size: 9, center: true });
    push({ key: `${k}_salary_grade`, page, sheet, x: col.grade, y, text: w.salary_grade || '', size: 9, center: true });
    push({ key: `${k}_status_of_appointment`, page, sheet, x: col.status, y, text: w.status_of_appointment || '', size: 9, center: true });
    push({ key: `${k}_is_government_service`, page, sheet, x: col.gov, y, text: w.is_government_service ? 'Y' : 'N', size: 10, center: true });
  };
  spill(
    pds.work_experiences || [],
    WORK_EXPERIENCE_ROWS,
    CONTINUATION_SHEETS.c6.rows,
    (w, i) =>
      workRow(w, `work_${i + 1}`, 2, round2(512.6 - i * 17.44), {
        from: 81.9, to: 120.4, position: 143, dept: 321.1, salary: 399.1, grade: 436, status: 478.3, gov: 516,
      }),
    (w, row, sheet) =>
      workRow(w, `c6_work_${row + 1}`, CONTINUATION_SHEETS.c6.page, round2(709.5 - row * 21), {
        from: 56.9, to: 100.9, position: 126, dept: 331.9, salary: 422.2, grade: 462.7, status: 509.2, gov: 552.2,
      }, sheet),
  );
  if ((pds.work_experiences || []).length > WORK_EXPERIENCE_ROWS) sheetSignature('c6');

  // ── PAGE 3 — VI. Learning & Development (17 rows; the rest on C5) ──
  const trainingRow = (
    l: PDSTraining,
    k: string,
    page: number,
    y: number,
    col: { title: number; from: number; to: number; hours: number; type: number; by: number },
    sheet?: number,
  ) => {
    push({ key: `${k}_title`, page, sheet, x: col.title, y, text: l.title || '', size: 10 });
    push({ key: `${k}_date_from`, page, sheet, x: col.from, y, text: formatDMY(l.date_from), size: 9, center: true });
    push({ key: `${k}_date_to`, page, sheet, x: col.to, y, text: formatDMY(l.date_to), size: 9, center: true });
    push({ key: `${k}_number_of_hours`, page, sheet, x: col.hours, y, text: l.number_of_hours != null ? String(l.number_of_hours) : '', size: 10, center: true });
    push({ key: `${k}_type_of_ld`, page, sheet, x: col.type, y, text: l.type_of_ld || '', size: 8, center: true });
    push({ key: `${k}_conducted_by`, page, sheet, x: col.by, y, text: l.conducted_by || '', size: 10 });
  };
  spill(
    pds.trainings || [],
    TRAINING_ROWS,
    CONTINUATION_SHEETS.c5.rows,
    (l, i) =>
      trainingRow(l, `training_${i + 1}`, 3, round2(751.2 - i * 17.4), {
        title: 49, from: 288.2, to: 327.8, hours: 367.4, type: 408.8, by: 434,
      }),
    (l, row, sheet) =>
      trainingRow(l, `c5_training_${row + 1}`, CONTINUATION_SHEETS.c5.page, round2(756.3 - row * 16.2), {
        title: 34, from: 326, to: 362, hours: 398, type: 435.8, by: 459,
      }, sheet),
  );
  if ((pds.trainings || []).length > TRAINING_ROWS) sheetSignature('c5');

  // VII. Voluntary Work (9 rows; the rest on C10). The form has a single "Name & Address of
  // Organization" column, so both go in that cell.
  const voluntaryRow = (
    v: PDSVoluntaryWork,
    k: string,
    page: number,
    y: number,
    col: { name: number; from: number; to: number; hours: number; position: number },
    sheet?: number,
  ) => {
    const nameAndAddress = [v.organization_name, v.organization_address].filter(Boolean).join(', ');
    push({ key: `${k}_organization_name`, page, sheet, x: col.name, y, text: nameAndAddress, size: 10 });
    push({ key: `${k}_date_from`, page, sheet, x: col.from, y, text: formatDMY(v.date_from), size: 9, center: true });
    push({ key: `${k}_date_to`, page, sheet, x: col.to, y, text: formatDMY(v.date_to), size: 9, center: true });
    push({ key: `${k}_number_of_hours`, page, sheet, x: col.hours, y, text: v.number_of_hours != null ? String(v.number_of_hours) : '', size: 10, center: true });
    push({ key: `${k}_position_nature_of_work`, page, sheet, x: col.position, y, text: v.position_nature_of_work || '', size: 10 });
  };
  spill(
    pds.voluntary_works || [],
    VOLUNTARY_WORK_ROWS,
    CONTINUATION_SHEETS.c10.rows,
    (v, i) =>
      voluntaryRow(v, `voluntary_${i + 1}`, 3, round2(377.4 - i * 17.4), {
        name: 49, from: 288.2, to: 327.8, hours: 367.4, position: 391,
      }),
    (v, row, sheet) =>
      voluntaryRow(v, `c10_voluntary_${row + 1}`, CONTINUATION_SHEETS.c10.page, round2(751 - row * 20.4), {
        name: 16, from: 286, to: 330.4, hours: 374.8, position: 401,
      }, sheet),
  );
  if ((pds.voluntary_works || []).length > VOLUNTARY_WORK_ROWS) sheetSignature('c10');

  // VIII. Other Information — skills / recognition / membership side by side (7 rows; the rest on C11)
  const otherInfo = pds.other_info || [];
  const otherColumns: [PDSOtherInfo['info_type'], string, number, number][] = [
    ['SKILL', 'skill', 49, 16],
    ['RECOGNITION', 'recognition', 180, 164],
    ['MEMBERSHIP', 'membership', 434, 450],
  ];
  let otherOverflow = false;
  otherColumns.forEach(([type, name, x, contX]) => {
    spill(
      otherInfo.filter((o) => o.info_type === type),
      OTHER_INFO_ROWS,
      CONTINUATION_SHEETS.c11.rows,
      (o, i) => push({ key: `other_${name}_${i + 1}`, page: 3, x, y: round2(171.6 - i * 17.43), text: o.details, size: 10 }),
      (o, row, sheet) => {
        otherOverflow = true;
        const y = round2(755.2 - row * 20.4);
        push({ key: `c11_${name}_${row + 1}`, page: CONTINUATION_SHEETS.c11.page, sheet, x: contX, y, text: o.details, size: 10 });
      },
    );
  });
  if (otherOverflow) sheetSignature('c11');

  // ── PAGE 4 ── Questions use the 2026 numbering (34–40); the data fields keep their older names,
  // mapped the same way the faculty PDS form asks them:
  //   34a/b → q34_a/q34_b, 35a/b → q35_a/q35_b (+ q36_date_filed/q36_case_status), 36 → q36,
  //   37 → q37, 38a → q38, 38b → q39, 39 → q40, 40a → q41 (q41_country holds the group),
  //   40b → q43, 40c → q44.
  // yesX/noX are the centres of the printed check boxes; y is their baseline.
  const questions: { key: string; answer: boolean | undefined; yesX: number; noX: number; y: number }[] = [
    { key: 'q34_a', answer: pds.q34_a_answer, yesX: 375, noX: 427.7, y: 796.6 },
    { key: 'q34_b', answer: pds.q34_b_answer, yesX: 375, noX: 427.7, y: 753.4 },
    { key: 'q35_a', answer: pds.q35_a_answer, yesX: 373.5, noX: 429.5, y: 711.6 },
    { key: 'q35_b', answer: pds.q35_b_answer, yesX: 373.5, noX: 431.9, y: 668.1 },
    { key: 'q36', answer: pds.q36_answer, yesX: 373, noX: 434.4, y: 614 },
    { key: 'q37', answer: pds.q37_answer, yesX: 372.5, noX: 434.4, y: 571.3 },
    { key: 'q38_a', answer: pds.q38_answer, yesX: 373.5, noX: 438.8, y: 535.3 },
    { key: 'q38_b', answer: pds.q39_answer, yesX: 375, noX: 440.2, y: 508.8 },
    { key: 'q39', answer: pds.q40_answer, yesX: 373.5, noX: 438.8, y: 477.8 },
    { key: 'q40_a', answer: pds.q41_answer, yesX: 373.5, noX: 440.2, y: 407.3 },
    { key: 'q40_b', answer: pds.q43_answer, yesX: 373.5, noX: 440.2, y: 385.6 },
    { key: 'q40_c', answer: pds.q44_answer, yesX: 373.5, noX: 440.2, y: 361.3 },
  ];
  questions.forEach((q) => {
    push({ key: `${q.key}_yes`, page: 4, x: q.yesX, y: q.y, text: chk(!!q.answer), size: 11, center: true });
    push({ key: `${q.key}_no`, page: 4, x: q.noX, y: q.y, text: chk(q.answer === false), size: 11, center: true });
  });

  // "If YES, give details" answers, written on each question's answer line.
  const details: [string, string | undefined, number, number][] = [
    ['q34_a_details', pds.q34_a_details, 385, 767],
    ['q34_b_details', pds.q34_b_details, 385, 729.5],
    ['q35_a_details', pds.q35_a_details, 385, 687.5],
    ['q35_b_details', pds.q35_b_details, 436, 656],
    ['q35_b_date_filed', formatDMY(pds.q36_date_filed), 436, 645],
    ['q35_b_case_status', pds.q36_case_status, 436, 633.5],
    ['q36_details', pds.q36_details, 385, 589],
    ['q37_details', pds.q37_details, 385, 554],
    ['q38_a_details', pds.q38_details, 437, 525],
    ['q38_b_details', pds.q39_details, 437, 497],
    ['q39_details', pds.q40_details, 385, 457],
    ['q40_a_details', pds.q41_country, 469, 397],
    ['q40_b_details', pds.q43_id_no, 469, 373.7],
    ['q40_c_details', pds.q44_id_no, 469, 352],
  ];
  details.forEach(([key, value, x, y]) => {
    push({ key, page: 4, x, y, text: value || '', size: 9 });
  });

  // 41. References (3 rows)
  (pds.references || []).slice(0, 3).forEach((r, i) => {
    const k = `reference_${i + 1}`;
    const y = [297, 277.3, 257.8][i];
    push({ key: `${k}_name`, page: 4, x: 59, y, text: r.name || '', size: 10 });
    push({ key: `${k}_address`, page: 4, x: 246, y, text: r.address || '', size: 9 });
    push({ key: `${k}_telephone_number`, page: 4, x: 392.4, y, text: r.telephone_number || '', size: 8, center: true });
  });

  // Government Issued ID — values in the right-hand column of the ID box
  push({ key: 'government_issued_id', page: 4, x: 131, y: 148, text: pds.government_issued_id || '', size: 9 });
  push({ key: 'government_id_number', page: 4, x: 131, y: 131.5, text: pds.government_id_number || '', size: 9 });
  push({ key: 'government_id_date_issued', page: 4, x: 131, y: 113.5, text: formatDMY(pds.government_id_date_issued), size: 9 });

  // Date Accomplished (the row above its label)
  push({ key: 'submitted_at', page: 4, x: 332.6, y: 119.5, text: formatDMY(pds.submitted_at), size: 9, center: true });

  // Photo and signature boxes. x/y is the box's top-left corner (y measured from the page bottom).
  push({ key: 'photo', image: 'photo', page: PHOTO_BOX.page, x: PHOTO_BOX.x, y: PHOTO_BOX.y, w: PHOTO_BOX.w, h: PHOTO_BOX.h, text: '' });
  Object.entries(SIGNATURE_BOXES).forEach(([page, box]) => {
    push({ key: `signature_page_${page}`, image: 'signature', page: Number(page), x: box.x, y: box.y, w: box.w, h: box.h, text: '' });
  });

  return overlays;
}

/** SIGNATURE box on each continuation sheet (drawn on every copy of the sheet). */
const CONTINUATION_SIGNATURES: Record<SheetId, { x: number; y: number; w: number; h: number }> = {
  c5: { x: 153, y: 55, w: 188, h: 12 },
  c6: { x: 125, y: 30, w: 133, h: 14 },
  c7: { x: 133, y: 317, w: 222, h: 22 },
  c8: { x: 154, y: 82, w: 196, h: 18 },
  c9: { x: 131, y: 147, w: 157, h: 17 },
  c10: { x: 162, y: 173, w: 188, h: 14 },
  c11: { x: 162, y: 136, w: 143, h: 13 },
};

const continuationPageCache = new WeakMap<PDFDocumentProxy, Promise<Map<SheetId, number>>>();

/**
 * Template page number of each continuation sheet present in the template, found by its
 * "(Continuation)" heading. Pages are read once per template.
 */
function findContinuationPages(doc: PDFDocumentProxy): Promise<Map<SheetId, number>> {
  let found = continuationPageCache.get(doc);
  if (!found) {
    found = (async () => {
      const pages = new Map<SheetId, number>();
      for (let p = 1; p <= doc.numPages; p++) {
        const content = await (await doc.getPage(p)).getTextContent();
        const text = content.items
          .map((i) => ('str' in i ? i.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ');
        const id = SHEET_IDS.find((s) => CONTINUATION_SHEETS[s].heading.test(text));
        if (id && !pages.has(id)) pages.set(id, p);
      }
      return pages;
    })();
    continuationPageCache.set(doc, found);
  }
  return found;
}

/** Sample PDS that fills every row of the form and one full copy of each continuation sheet. */
function samplePds(): PersonalDataSheet {
  const rows = <T>(count: number, make: (n: number) => T): T[] =>
    Array.from({ length: count }, (_, i) => make(i + 1));
  const C = CONTINUATION_SHEETS;
  const sample = {
    surname: 'DELA CRUZ',
    first_name: 'JUAN',
    middle_name: 'SANTOS',
    name_extension: 'JR.',
    date_of_birth: '1995-01-15',
    place_of_birth: 'Batangas City',
    sex: 'Male',
    civil_status: 'Single',
    height: 1.7,
    weight: 65,
    blood_type: 'O+',
    gsis_id_no: '1234567890',
    pag_ibig_id_no: '1234-5678-9012',
    philhealth_no: '12-345678901-2',
    sss_no: '1234-5678-9012-3456',
    tin_no: '123-456-789-000',
    agency_employee_no: 'EMP-0001',
    citizenship_type: 'Filipino',
    dual_citizenship_country: 'Country',
    residential_house_no: '123',
    residential_street: 'Rizal Street',
    residential_subdivision: 'Subdivision',
    residential_barangay: 'Barangay',
    residential_city: 'Batangas City',
    residential_province: 'Batangas',
    residential_zip_code: '4200',
    permanent_house_no: '123',
    permanent_street: 'Rizal Street',
    permanent_subdivision: 'Subdivision',
    permanent_barangay: 'Barangay',
    permanent_city: 'Batangas City',
    permanent_province: 'Batangas',
    permanent_zip_code: '4200',
    telephone_no: '(043) 123-4567',
    mobile_no: '0917-123-4567',
    email_address: 'juan@email.com',
    spouse_surname: 'SPOUSE SURNAME',
    spouse_first_name: 'SPOUSE FIRST',
    spouse_middle_name: 'SPOUSE MIDDLE',
    spouse_name_ext: 'JR.',
    spouse_occupation: 'Occupation',
    spouse_employer: 'Employer',
    spouse_business_address: 'Business Address',
    spouse_telephone: '(043) 765-4321',
    father_surname: 'FATHER SURNAME',
    father_first_name: 'FATHER FIRST',
    father_middle_name: 'FATHER MIDDLE',
    father_name_ext: 'SR.',
    mother_surname: 'MOTHER SURNAME',
    mother_first_name: 'MOTHER FIRST',
    mother_middle_name: 'MOTHER MIDDLE',
    children: rows(CHILD_ROWS + C.c7.rows, (n) => ({ child_name: `Child ${n}`, date_of_birth: '2015-01-01' })),
    education: [
      ...(['ELEMENTARY', 'SECONDARY', 'VOCATIONAL', 'COLLEGE', 'GRADUATE STUDIES'] as const).map((level) => ({
        level,
        school_name: `${level} School`,
        degree_course: 'Degree / Course',
        highest_level_earned: 'Units',
        period_from: 2010,
        period_to: 2014,
        year_graduated: 2014,
        scholarship_honors: 'Honors',
      })),
      ...rows(C.c8.rows, (n) => ({
        level: 'COLLEGE',
        school_name: `Other School ${n}`,
        degree_course: 'Degree / Course',
        highest_level_earned: 'Units',
        period_from: 2015,
        period_to: 2019,
        year_graduated: 2019,
        scholarship_honors: 'Honors',
      })),
    ],
    eligibilities: rows(ELIGIBILITY_ROWS + C.c9.rows, (n) => ({
      career_service: `Eligibility ${n}`,
      rating: '85',
      date_of_examination: '2018-01-01',
      place_of_examination: 'Place',
      license_number: '12345',
      license_validity: '01/01/2030',
    })),
    work_experiences: rows(WORK_EXPERIENCE_ROWS + C.c6.rows, (n) => ({
      date_from: '2018-01-01',
      date_to: 'Present',
      position_title: `Position ${n}`,
      department_agency: 'Agency',
      monthly_salary: 30000,
      salary_grade: '11-1',
      status_of_appointment: 'Permanent',
      is_government_service: true,
    })),
    voluntary_works: rows(VOLUNTARY_WORK_ROWS + C.c10.rows, (n) => ({
      organization_name: `Organization ${n}`,
      date_from: '2018-01-01',
      date_to: '2018-12-31',
      number_of_hours: 8,
      organization_address: 'Org Address',
      position_nature_of_work: 'Volunteer',
    })),
    trainings: rows(TRAINING_ROWS + C.c5.rows, (n) => ({
      title: `Training ${n}`,
      date_from: '2018-01-01',
      date_to: '2018-01-02',
      number_of_hours: 8,
      type_of_ld: 'Technical',
      conducted_by: 'Sponsor',
    })),
    other_info: [
      ...rows(OTHER_INFO_ROWS + C.c11.rows, (n) => ({ info_type: 'SKILL', details: `Skill ${n}` })),
      ...rows(OTHER_INFO_ROWS + C.c11.rows, (n) => ({ info_type: 'RECOGNITION', details: `Recognition ${n}` })),
      ...rows(OTHER_INFO_ROWS + C.c11.rows, (n) => ({ info_type: 'MEMBERSHIP', details: `Membership ${n}` })),
    ],
    references: rows(3, (n) => ({
      name: `Reference ${n}`,
      address: 'Address',
      telephone_number: '0917-000-0000',
    })),
    q34_a_details: 'Q34a details',
    q34_b_details: 'Q34b details',
    q35_a_details: 'Q35a details',
    q35_b_details: 'Q35b details',
    q36_details: 'Q36 details',
    q36_date_filed: '2020-01-01',
    q36_case_status: 'Case status',
    q37_details: 'Q37 details',
    q38_details: 'Q38 details',
    q39_details: 'Q39 details',
    q40_details: 'Country',
    q41_country: 'Indigenous group',
    q43_id_no: 'PWD ID no.',
    q44_id_no: 'Solo parent ID no.',
    government_issued_id: 'Passport',
    government_id_number: 'P1234567',
    government_id_date_issued: '2020-01-01',
    submitted_at: '2026-01-01',
  };
  return sample as unknown as PersonalDataSheet;
}

/** Every editable PDS field with its built-in position and sample text, for the PDS Template Editor. */
export function buildTemplateFieldPositions(): {
  key: string;
  page: number;
  x: number;
  y: number;
  text: string;
  size: number;
  center: boolean;
  type?: 'image';
  w?: number;
  h?: number;
}[] {
  return buildOverlays(samplePds(), true).map((o) => ({
    key: o.key,
    page: o.page,
    x: o.x,
    y: o.y,
    text: o.image ? (o.image === 'photo' ? 'PHOTO' : 'SIGNATURE') : o.text,
    size: o.size ?? 11,
    center: !!o.center,
    ...(o.image ? { type: 'image' as const, w: o.w, h: o.h } : {}),
  }));
}
