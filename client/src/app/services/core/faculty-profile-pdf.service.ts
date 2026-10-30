import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import {
  drawProfileCover,
  FacultyProfileHeader,
  FacultyProfilePdfData,
  PROFILE_FONT,
} from './faculty-profile-cover';

export type { FacultyProfileHeader, FacultyProfilePdfData } from './faculty-profile-cover';

/** One printable section of the activities report — e.g. Seminars, Research, Extension. */
export interface ActivityReportColumn {
  key: string;
  header: string;
  /** Fraction of the usable content width (all columns in a section should sum to ~1). */
  widthFraction: number;
  /** Horizontal alignment of the body cells (headers are always centred). Default 'left'. */
  align?: 'left' | 'center';
}
export interface ActivityReportSection {
  /** Italic heading lines, printed centred above the table (e.g. "List of Faculty Involvement in …") */
  titleLines: string[];
  /** e.g. "FY 2022-2025", printed under the heading */
  period: string;
  columns: ActivityReportColumn[];
  rows: Record<string, string>[];
}

const PAGE_W = 612;
const PAGE_H = 936;

// Layout for the multi-page activities report, modelled on the accreditation "List of Faculty
// Involvement in …" tables: Times New Roman, italic centred heading, bordered table with a bold
// centred header row, cells vertically centred. Rows paginate; continuation pages carry on with
// rows only (no repeated heading/header), as in the sample. Content on the All Activities template
// starts below its letterhead rule at y 132 and ends before its footer.
const REPORT_MARGIN = 54;
const CONTENT_WIDTH = PAGE_W - REPORT_MARGIN * 2;
const REPORT_TOP = 158; // first heading baseline, below the All Activities letterhead
const CONTINUATION_TOP = 152; // table top on continuation pages, below the letterhead
const TABLE_BOTTOM = 880; // above the template footer band
const TITLE_FONT_SIZE = 13;
const TITLE_LINE_HEIGHT = 16;
const NAME_FONT_SIZE = 12;
const CELL_FONT_SIZE = 10.5;
const HEADER_FONT_SIZE = 10.5;
const ROW_LINE_HEIGHT = 12.5;
const CELL_PADDING_X = 5;
const CELL_PADDING_Y = 3;
const REPORT_FONT = "'Times New Roman', Times, serif";

/** Renders a faculty's profile onto the branded cover template and downloads it as a PDF. */
@Injectable({ providedIn: 'root' })
export class FacultyProfilePdfService {
  private templateDoc: Promise<PDFDocumentProxy> | null = null;
  private activitiesTemplateDoc: Promise<PDFDocumentProxy> | null = null;

  private getTemplate(): Promise<PDFDocumentProxy> {
    if (!this.templateDoc) {
      this.templateDoc = pdfjsLib.getDocument('/profile-cover.pdf').promise;
    }
    return this.templateDoc;
  }

  private getActivitiesTemplate(): Promise<PDFDocumentProxy> {
    if (!this.activitiesTemplateDoc) {
      this.activitiesTemplateDoc = pdfjsLib.getDocument('/all-activities-bg-template.pdf').promise;
    }
    return this.activitiesTemplateDoc;
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
      this.loadImage(data.photoUrl || data.personal?.profile_picture),
      loadProfileFonts(),
    ]);

    const page = await pdfDoc.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    drawProfileCover(ctx, scale, data, photoImage);

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
   * Renders a faculty's activities (seminars/trainings, research, extension — whatever non-empty
   * sections are passed in) as "List of Faculty Involvement in …" tables on the branded bond-paper
   * template. Each section starts on a new page; long tables continue onto further pages.
   */
  async generateActivitiesReport(
    faculty: FacultyProfileHeader,
    sections: ActivityReportSection[],
  ): Promise<void> {
    const nonEmptySections = sections.filter((s) => s.rows.length > 0);
    if (nonEmptySections.length === 0) return;

    const pdfDoc = await this.getActivitiesTemplate();
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

    const facultyName = [
      faculty.last_name ? `${faculty.last_name},` : '',
      faculty.first_name,
      faculty.middle_name ? `${faculty.middle_name.trim()[0]}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [PAGE_W, PAGE_H] });
    let isFirstPageOverall = true;

    for (const section of nonEmptySections) {
      let canvas = this.newCanvas(templateCanvas);
      let ctx = canvas.getContext('2d')!;
      ctx.drawImage(templateCanvas, 0, 0);
      const tableTop = this.drawSectionHeading(ctx, scale, section, facultyName);
      let cursorY = this.drawTableHeaderRow(ctx, scale, section.columns, tableTop);

      section.rows.forEach((row) => {
        ctx.font = `${CELL_FONT_SIZE * scale}px ${REPORT_FONT}`;
        const wrapped = section.columns.map((c) =>
          this.wrapText(ctx, row[c.key] || '', c.widthFraction * CONTENT_WIDTH - CELL_PADDING_X * 2, scale),
        );
        const lineCount = Math.max(...wrapped.map((l) => l.length), 1);
        const rowHeight = lineCount * ROW_LINE_HEIGHT + CELL_PADDING_Y * 2;

        if (cursorY + rowHeight > TABLE_BOTTOM) {
          this.commitPage(pdf, canvas, isFirstPageOverall);
          isFirstPageOverall = false;
          canvas = this.newCanvas(templateCanvas);
          ctx = canvas.getContext('2d')!;
          ctx.drawImage(templateCanvas, 0, 0);
          cursorY = CONTINUATION_TOP;
        }

        this.drawTableRow(ctx, scale, section.columns, wrapped, cursorY, rowHeight, false);
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

  /** Italic centred heading + period, then "Faculty Name: SURNAME, FIRST M."; returns the table top (pt). */
  private drawSectionHeading(
    ctx: CanvasRenderingContext2D,
    scale: number,
    section: ActivityReportSection,
    facultyName: string,
  ): number {
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.font = `italic ${TITLE_FONT_SIZE * scale}px ${REPORT_FONT}`;
    let y = REPORT_TOP;
    for (const line of [...section.titleLines, section.period]) {
      ctx.fillText(line, (PAGE_W / 2) * scale, y * scale);
      y += TITLE_LINE_HEIGHT;
    }

    // "Faculty Name:" regular, the name bold, slightly indented from the table edge
    y += 12;
    ctx.textAlign = 'left';
    const nameX = REPORT_MARGIN + 36;
    ctx.font = `${NAME_FONT_SIZE * scale}px ${REPORT_FONT}`;
    const label = 'Faculty Name: ';
    ctx.fillText(label, nameX * scale, y * scale);
    const labelWidth = ctx.measureText(label).width;
    ctx.font = `bold ${NAME_FONT_SIZE * scale}px ${REPORT_FONT}`;
    ctx.fillText(facultyName, nameX * scale + labelWidth, y * scale);

    return y + 6;
  }

  private drawTableHeaderRow(
    ctx: CanvasRenderingContext2D,
    scale: number,
    columns: ActivityReportColumn[],
    top: number,
  ): number {
    ctx.font = `bold ${HEADER_FONT_SIZE * scale}px ${REPORT_FONT}`;
    const wrappedHeaders = columns.map((col) =>
      this.wrapText(ctx, col.header, col.widthFraction * CONTENT_WIDTH - CELL_PADDING_X * 2, scale),
    );
    const lineCount = Math.max(...wrappedHeaders.map((l) => l.length), 1);
    const rowHeight = lineCount * ROW_LINE_HEIGHT + CELL_PADDING_Y * 2;
    this.drawTableRow(ctx, scale, columns, wrappedHeaders, top, rowHeight, true);
    return top + rowHeight;
  }

  /** One bordered row; each cell's lines are centred vertically (and horizontally for headers). */
  private drawTableRow(
    ctx: CanvasRenderingContext2D,
    scale: number,
    columns: ActivityReportColumn[],
    wrappedCells: string[][],
    y: number,
    rowHeight: number,
    isHeader: boolean,
  ): void {
    let x = REPORT_MARGIN;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.9 * scale;
    ctx.font = `${isHeader ? 'bold ' : ''}${(isHeader ? HEADER_FONT_SIZE : CELL_FONT_SIZE) * scale}px ${REPORT_FONT}`;
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'middle';

    columns.forEach((col, i) => {
      const colWidth = col.widthFraction * CONTENT_WIDTH;
      ctx.strokeRect(x * scale, y * scale, colWidth * scale, rowHeight * scale);
      const lines = wrappedCells[i];
      const centred = isHeader || col.align === 'center';
      ctx.textAlign = centred ? 'center' : 'left';
      const textX = centred ? x + colWidth / 2 : x + CELL_PADDING_X;
      const firstMid = y + (rowHeight - lines.length * ROW_LINE_HEIGHT) / 2 + ROW_LINE_HEIGHT / 2;
      lines.forEach((line, li) => {
        ctx.fillText(line, textX * scale, (firstMid + li * ROW_LINE_HEIGHT) * scale);
      });
      x += colWidth;
    });

    ctx.textAlign = 'left';
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

/**
 * Loads the cover's Montserrat weights (styles.css imports them from Google Fonts) so the canvas
 * draws with them rather than a fallback. Gives up after a few seconds and uses the fallback.
 */
function loadProfileFonts(): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  const loads = Promise.all([
    document.fonts.load(`400 16px ${PROFILE_FONT}`),
    document.fonts.load(`800 16px ${PROFILE_FONT}`),
    document.fonts.load(`900 16px ${PROFILE_FONT}`),
  ]);
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
  return Promise.race([loads, timeout]).catch(() => undefined);
}
