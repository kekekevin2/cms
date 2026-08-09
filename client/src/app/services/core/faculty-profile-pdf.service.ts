import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import {
  PersonalProfile,
  AcademicProfile,
  EmploymentProfile,
} from '../faculty/faculty-profile.service';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** Minimal faculty identity fields needed for the cover — matches dean-faculty.service's Faculty. */
export interface FacultyProfileHeader {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  contact_number?: string;
  department: string;
  position_level?: string;
}

export interface FacultyProfilePdfData {
  faculty: FacultyProfileHeader;
  personal: PersonalProfile | null;
  academic: AcademicProfile[];
  employment: EmploymentProfile[];
  coursesHandled: string[];
}

/** One printable section of the activities report — e.g. Seminars, Research, Extension. */
export interface ActivityReportColumn {
  key: string;
  header: string;
  /** Fraction of the usable content width (all columns in a section should sum to ~1). */
  widthFraction: number;
}
export interface ActivityReportSection {
  title: string;
  columns: ActivityReportColumn[];
  rows: Record<string, string>[];
}

// Overlay coordinates use a top-left origin (y grows down), matching the
// profile/index.js locator tool this was positioned with — the opposite
// convention from pds-pdf.service.ts's bottom-left PDF-point origin, since
// this template has no pre-printed boxes to align against; positions were
// just clicked into place freehand. Re-run the locator tool at profile/ and
// copy its DEFAULT_FIELDS here if these need adjusting.
interface TextOverlay {
  x: number;
  y: number;
  text: string;
  size: number;
  bold?: boolean;
  color?: string;
  center?: boolean;
}

const PAGE_W = 612;
const PAGE_H = 936;

// 1-inch left/right page margin, so nothing sits flush against the edges.
const MARGIN = 72;
const COL_LEFT = MARGIN; // section headers, photo
const COL_LABEL = MARGIN + 27; // table row labels (First Name, Undergraduate, ...)
const COL_HEADING = MARGIN + 174; // name/position/department/contact block
const COL_VALUE = MARGIN + 204; // table row values
const COL_COURSE2 = MARGIN + 274; // second column of the courses-handled list

const PHOTO_BOX = { x: COL_LEFT, y: 95, w: 150, h: 195 };

// Layout for the multi-page activities table report — reuses the same
// template/margin/font as the cover, but content is variable-length so rows
// paginate dynamically instead of sitting at fixed coordinates.
const CONTENT_RIGHT = PAGE_W - MARGIN;
const CONTENT_WIDTH = CONTENT_RIGHT - MARGIN;
const TABLE_TOP_FIRST = 170; // below the template's header graphic
const TABLE_BOTTOM = 880; // above the template's footer band
const ROW_PADDING = 5;
const ROW_LINE_HEIGHT = 10;
const CELL_FONT_SIZE = 8.5;
const HEADER_FONT_SIZE = 8.5;

/** Renders a faculty's profile onto the branded cover template and downloads it as a PDF. */
@Injectable({ providedIn: 'root' })
export class FacultyProfilePdfService {
  private templateDoc: Promise<PDFDocumentProxy> | null = null;

  private getTemplate(): Promise<PDFDocumentProxy> {
    if (!this.templateDoc) {
      this.templateDoc = pdfjsLib.getDocument('/profile-cover.pdf').promise;
    }
    return this.templateDoc;
  }

  async generateAndDownload(data: FacultyProfilePdfData): Promise<void> {
    const pdf = await this.buildPdf(data);
    const surname = data.faculty.last_name || 'Faculty';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    pdf.save(`FacultyProfile_${surname}_${dateStr}.pdf`);
  }

  private async buildPdf(data: FacultyProfilePdfData): Promise<jsPDF> {
    const [pdfDoc, photoImage] = await Promise.all([
      this.getTemplate(),
      this.loadImage(data.personal?.profile_picture),
    ]);

    const page = await pdfDoc.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;

    buildOverlays(data).forEach((o) => {
      const x = o.x * scale;
      const y = o.y * scale;
      ctx.font = `${o.bold ? 'bold ' : ''}${o.size * scale}px 'Times New Roman', Times, serif`;
      ctx.fillStyle = o.color || '#000000';
      ctx.textAlign = o.center ? 'center' : 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(o.text, x, y);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (photoImage) {
      ctx.drawImage(
        photoImage,
        PHOTO_BOX.x * scale,
        PHOTO_BOX.y * scale,
        PHOTO_BOX.w * scale,
        PHOTO_BOX.h * scale,
      );
    }

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PAGE_W, PAGE_H] });
    pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, PAGE_W, PAGE_H);
    return pdf;
  }

  private loadImage(path: string | undefined | null): Promise<HTMLImageElement | null> {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  /**
   * Renders a faculty's activities (seminars/trainings, research, extension —
   * whatever non-empty sections are passed in) as bordered tables on top of
   * the same branded cover template, one or more pages per section as rows
   * overflow. Skips sections with no rows entirely.
   */
  async generateActivitiesReport(
    faculty: FacultyProfileHeader,
    sections: ActivityReportSection[],
  ): Promise<void> {
    const nonEmptySections = sections.filter((s) => s.rows.length > 0);
    if (nonEmptySections.length === 0) return;

    const pdfDoc = await this.getTemplate();
    const templatePage = await pdfDoc.getPage(1);
    const scale = 2;
    const viewport = templatePage.getViewport({ scale });

    const templateCanvas = document.createElement('canvas');
    templateCanvas.width = viewport.width;
    templateCanvas.height = viewport.height;
    await templatePage.render({
      canvasContext: templateCanvas.getContext('2d')!,
      viewport,
    }).promise;

    const currentYear = new Date().getFullYear();
    const facultyName = `${faculty.last_name}, ${faculty.first_name} ${faculty.middle_name || ''}`
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PAGE_W, PAGE_H] });
    let isFirstPageOverall = true;

    const startPage = (
      ctx: CanvasRenderingContext2D,
      title: string,
      columns: ActivityReportColumn[],
    ): number => {
      ctx.drawImage(templateCanvas, 0, 0);
      this.drawSectionHeader(ctx, scale, title, currentYear, facultyName);
      return this.drawTableHeaderRow(ctx, scale, columns);
    };

    for (const section of nonEmptySections) {
      let canvas = this.newCanvas(templateCanvas);
      let ctx = canvas.getContext('2d')!;
      let cursorY = startPage(ctx, section.title, section.columns);

      section.rows.forEach((row) => {
        ctx.font = `${CELL_FONT_SIZE * scale}px 'Times New Roman', Times, serif`;
        const wrapped = section.columns.map((c) =>
          this.wrapText(ctx, row[c.key] || '', c.widthFraction * CONTENT_WIDTH - 6, scale),
        );
        const lineCount = Math.max(...wrapped.map((l) => l.length), 1);
        const rowHeight = lineCount * ROW_LINE_HEIGHT + ROW_PADDING * 2;

        if (cursorY + rowHeight > TABLE_BOTTOM) {
          this.commitPage(pdf, canvas, isFirstPageOverall);
          isFirstPageOverall = false;
          canvas = this.newCanvas(templateCanvas);
          ctx = canvas.getContext('2d')!;
          cursorY = startPage(ctx, `${section.title} (continued)`, section.columns);
        }

        this.drawTableRow(ctx, scale, section.columns, wrapped, cursorY, rowHeight);
        cursorY += rowHeight;
      });

      this.commitPage(pdf, canvas, isFirstPageOverall);
      isFirstPageOverall = false;
    }

    const surname = faculty.last_name || 'Faculty';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    pdf.save(`FacultyActivities_${surname}_${dateStr}.pdf`);
  }

  private newCanvas(template: HTMLCanvasElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = template.width;
    canvas.height = template.height;
    return canvas;
  }

  private commitPage(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstPage: boolean): void {
    if (!isFirstPage) pdf.addPage([PAGE_W, PAGE_H], 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, PAGE_W, PAGE_H);
  }

  private drawSectionHeader(
    ctx: CanvasRenderingContext2D,
    scale: number,
    title: string,
    year: number,
    facultyName: string,
  ): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#8b1538';
    ctx.font = `bold ${13 * scale}px 'Times New Roman', Times, serif`;
    ctx.fillText(title, (PAGE_W / 2) * scale, 100 * scale);

    ctx.font = `${10 * scale}px 'Times New Roman', Times, serif`;
    ctx.fillStyle = '#000000';
    ctx.fillText(`FY ${year}-${year + 1}`, (PAGE_W / 2) * scale, 118 * scale);

    ctx.textAlign = 'left';
    ctx.font = `bold ${10 * scale}px 'Times New Roman', Times, serif`;
    ctx.fillText(`Faculty Name: ${facultyName}`, MARGIN * scale, 140 * scale);
    ctx.textBaseline = 'alphabetic';
  }

  private drawTableHeaderRow(
    ctx: CanvasRenderingContext2D,
    scale: number,
    columns: ActivityReportColumn[],
  ): number {
    const y = TABLE_TOP_FIRST;
    const rowHeight = 22;
    let x = MARGIN;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(MARGIN * scale, y * scale, CONTENT_WIDTH * scale, rowHeight * scale);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = scale;
    ctx.strokeRect(MARGIN * scale, y * scale, CONTENT_WIDTH * scale, rowHeight * scale);

    ctx.font = `bold ${HEADER_FONT_SIZE * scale}px 'Times New Roman', Times, serif`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    columns.forEach((col) => {
      const colWidth = col.widthFraction * CONTENT_WIDTH;
      ctx.strokeRect(x * scale, y * scale, colWidth * scale, rowHeight * scale);
      const lines = this.wrapText(ctx, col.header, colWidth - 6, scale);
      lines.forEach((line, i) => {
        ctx.fillText(line, (x + 3) * scale, (y + ROW_PADDING + i * ROW_LINE_HEIGHT) * scale);
      });
      x += colWidth;
    });

    ctx.textBaseline = 'alphabetic';
    return y + rowHeight;
  }

  private drawTableRow(
    ctx: CanvasRenderingContext2D,
    scale: number,
    columns: ActivityReportColumn[],
    wrappedCells: string[][],
    y: number,
    rowHeight: number,
  ): void {
    let x = MARGIN;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = scale;
    ctx.font = `${CELL_FONT_SIZE * scale}px 'Times New Roman', Times, serif`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';

    columns.forEach((col, i) => {
      const colWidth = col.widthFraction * CONTENT_WIDTH;
      ctx.strokeRect(x * scale, y * scale, colWidth * scale, rowHeight * scale);
      wrappedCells[i].forEach((line, li) => {
        ctx.fillText(line, (x + 3) * scale, (y + ROW_PADDING + li * ROW_LINE_HEIGHT) * scale);
      });
      x += colWidth;
    });

    ctx.textBaseline = 'alphabetic';
  }

  /** Greedy word-wrap using actual canvas text measurement (ctx.font must already be set). */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidthPt: number,
    scale: number,
  ): string[] {
    const maxWidthPx = maxWidthPt * scale;
    const words = (text || '').split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];

    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(candidate).width > maxWidthPx) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}

function formatLongDate(value: string | undefined | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function calculateAge(birthDate: string | undefined | null): string {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const monthDiff = today.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
  return `${age} years old`;
}

function personalInfoRow(x: number, y: number, label: string, value: string): TextOverlay[] {
  return [
    { x: COL_LABEL, y, text: label, size: 10, bold: true, color: '#333333' },
    { x, y, text: value, size: 10, color: '#000000' },
  ];
}

function educationRow(
  y: number,
  label: string,
  degree: string,
  details: string,
): TextOverlay[] {
  return [
    { x: COL_LABEL, y, text: label, size: 10, bold: true, color: '#333333' },
    { x: COL_VALUE, y, text: degree, size: 10, bold: true, color: '#000000' },
    { x: COL_VALUE, y: y + 15, text: details, size: 8.5, color: '#666666' },
  ];
}

function buildOverlays(data: FacultyProfilePdfData): TextOverlay[] {
  const { faculty, personal, academic, employment, coursesHandled } = data;
  const overlays: TextOverlay[] = [];
  const push = (...items: TextOverlay[]) => overlays.push(...items);

  const middleInitial = (faculty.middle_name || '').charAt(0);
  const fullName =
    `${faculty.first_name} ${middleInitial ? middleInitial + '.' : ''} ${faculty.last_name}`
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  const currentEmployment = employment.find((e) => e.is_current) || employment[0];
  const academicRank = currentEmployment?.position_title || faculty.position_level || '';

  push({ x: COL_HEADING, y: 108, text: 'FACULTY PROFILE', size: 22, bold: true, color: '#8b1538' });
  push({ x: COL_HEADING, y: 155, text: fullName, size: 15, bold: true, color: '#000000' });
  push({ x: COL_HEADING, y: 176, text: academicRank, size: 11, color: '#000000' });
  push({
    x: COL_HEADING,
    y: 222,
    text: faculty.department || '',
    size: 11,
    bold: true,
    color: '#000000',
  });

  push({ x: COL_HEADING, y: 256, text: 'Contact Number:', size: 9, color: '#666666' });
  push({ x: COL_HEADING, y: 270, text: faculty.contact_number || '', size: 10, color: '#000000' });
  push({ x: COL_HEADING, y: 293, text: 'Email Address:', size: 9, color: '#666666' });
  push({ x: COL_HEADING, y: 307, text: faculty.email || '', size: 10, color: '#000000' });

  push({
    x: COL_LEFT,
    y: 345,
    text: 'PERSONAL INFORMATION',
    size: 13,
    bold: true,
    color: '#8b1538',
  });
  push(...personalInfoRow(COL_VALUE, 372, 'FIRST NAME', faculty.first_name || ''));
  push(...personalInfoRow(COL_VALUE, 391, 'MIDDLE NAME', faculty.middle_name || ''));
  push(...personalInfoRow(COL_VALUE, 410, 'LAST NAME', faculty.last_name || ''));
  push(...personalInfoRow(COL_VALUE, 429, 'ACADEMIC RANK', academicRank));
  push(
    ...personalInfoRow(
      COL_VALUE,
      448,
      'EMPLOYMENT STATUS',
      currentEmployment?.employment_status || '',
    ),
  );
  push(...personalInfoRow(COL_VALUE, 467, 'BIRTH DATE', formatLongDate(personal?.date_of_birth)));
  push(...personalInfoRow(COL_VALUE, 486, 'AGE', calculateAge(personal?.date_of_birth)));
  push(...personalInfoRow(COL_VALUE, 505, 'CIVIL STATUS', personal?.civil_status || ''));

  push({ x: COL_LEFT, y: 545, text: 'EDUCATION', size: 13, bold: true, color: '#8b1538' });
  const eduFor = (level: string) => academic.find((e) => e.level === level);
  const undergrad = eduFor('Undergraduate');
  const masters = eduFor('Masters');
  const doctorate = eduFor('Doctorate');
  push(
    ...educationRow(
      572,
      'UNDERGRADUATE',
      undergrad?.degree_course || '',
      eduDetails(undergrad),
    ),
  );
  push(...educationRow(620, "MASTER'S", masters?.degree_course || '', eduDetails(masters)));
  push(...educationRow(668, 'DOCTORATE', doctorate?.degree_course || '', eduDetails(doctorate)));

  push({ x: COL_LEFT, y: 715, text: 'COURSES HANDLED', size: 13, bold: true, color: '#8b1538' });
  const rowHeight = 18;
  const rowsPerColumn = 3;
  coursesHandled.forEach((course, i) => {
    const col = Math.floor(i / rowsPerColumn);
    const row = i % rowsPerColumn;
    push({
      x: col === 0 ? COL_LABEL : COL_COURSE2,
      y: 742 + row * rowHeight,
      text: `• ${course}`,
      size: 9.5,
      color: '#000000',
    });
  });

  return overlays;
}

function eduDetails(edu: AcademicProfile | undefined): string {
  if (!edu) return '';
  const parts = [edu.school_name, edu.year_graduated != null ? String(edu.year_graduated) : null].filter(
    Boolean,
  );
  return parts.join(', ');
}
