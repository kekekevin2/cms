import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { environment } from '../../environments/environment';
import { PersonalDataSheet, PDSEducation } from './pds.service';

// Use CDN for worker to avoid Vite dynamic import warning
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

interface Overlay {
  page: number;
  x: number;
  y: number;
  text: string;
  size?: number;
  center?: boolean;
}

// ID photo — page 4 only (over the government ID section), 1x1" box in PDF points.
const PHOTO_BOX = { page: 4, x: 445, y: 330, size: 90 };

// Signature — one image, placed on every page. x/y is the bottom-left corner, w/h the box size.
const SIGNATURE_BOXES: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 208, y: 59, w: 113, h: 57 },
  2: { x: 197, y: 51, w: 110, h: 40 },
  3: { x: 231, y: 47, w: 110, h: 44 },
  4: { x: 284, y: 202, w: 110, h: 64 },
};

const CHECK = '✓';

/** Renders a Personal Data Sheet onto the CS Form No. 212 template and downloads the result as a PDF. */
@Injectable({ providedIn: 'root' })
export class PdsPdfService {
  private templateDoc: Promise<PDFDocumentProxy> | null = null;

  private getTemplate(): Promise<PDFDocumentProxy> {
    if (!this.templateDoc) {
      this.templateDoc = pdfjsLib.getDocument('/pds-template.pdf').promise;
    }
    return this.templateDoc!;
  }

  async generateAndDownload(pds: PersonalDataSheet): Promise<void> {
    const pdf = await this.buildPdf(pds);
    if (!pdf) return;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    pdf.save(`PDS_${pds.surname || 'Faculty'}_${pds.first_name || ''}_${dateStr}.pdf`);
  }

  /** Builds the same PDF and returns a blob: URL for in-app preview instead of downloading it. */
  async generatePreviewUrl(pds: PersonalDataSheet): Promise<string | null> {
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

    const overlays = buildOverlays(pds);
    let pdf: jsPDF | null = null;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const scale = viewport.scale;
      overlays
        .filter((o) => o.page === pageNum)
        .forEach((o) => {
          const cx = o.x * scale;
          const cy = viewport.height - o.y * scale;
          ctx.font = `${((o.size || 11) * scale) / 1.5}px 'Times New Roman', Times, serif`;
          ctx.fillStyle = '#000';
          ctx.textAlign = o.center ? 'center' : 'left';
          ctx.fillText(o.text, cx, cy);
        });
      ctx.textAlign = 'left';

      if (photoImage && pageNum === PHOTO_BOX.page) {
        const sizePx = PHOTO_BOX.size * scale;
        const cx = PHOTO_BOX.x * scale;
        const cy = viewport.height - PHOTO_BOX.y * scale;
        ctx.drawImage(photoImage, cx, cy, sizePx, sizePx);
      }

      const signatureBox = SIGNATURE_BOXES[pageNum];
      if (signatureImage && signatureBox) {
        const cx = signatureBox.x * scale;
        const cy = viewport.height - signatureBox.y * scale;
        ctx.drawImage(signatureImage, cx, cy, signatureBox.w * scale, signatureBox.h * scale);
      }

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
    }

    return pdf;
  }

  private loadImage(path: string | undefined): Promise<HTMLImageElement | null> {
    if (!path) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${environment.apiUrl}/../${path}`;
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

function buildOverlays(pds: PersonalDataSheet): Overlay[] {
  const overlays: Overlay[] = [];
  const push = (o: Overlay) => overlays.push(o);

  // PAGE 1 - Personal Information
  push({ page: 1, x: 135, y: 718, text: pds.surname || '', size: 11 });
  push({ page: 1, x: 135, y: 701, text: pds.first_name || '', size: 11 });
  push({ page: 1, x: 135, y: 686, text: pds.middle_name || '', size: 11 });
  push({ page: 1, x: 490, y: 701, text: pds.name_extension || '', size: 11 });
  push({ page: 1, x: 135, y: 665, text: formatDMY(pds.date_of_birth), size: 11 });
  push({ page: 1, x: 135, y: 645, text: pds.place_of_birth || '', size: 11 });

  // Sex checkbox
  push({
    page: 1,
    x: pds.sex === 'Female' ? 210 : 137,
    y: 628,
    text: CHECK,
    size: 11,
  });

  // Civil status checkbox
  const civilStatusCoords: Record<string, { x: number; y: number }> = {
    Single: { x: 137, y: 613 },
    Married: { x: 210, y: 612 },
    Widowed: { x: 137, y: 602 },
    Separated: { x: 210, y: 602 },
  };
  const civilCoord = civilStatusCoords[pds.civil_status] ?? { x: 137, y: 591 };
  push({ page: 1, x: civilCoord.x, y: civilCoord.y, text: CHECK, size: 11 });
  push({ page: 1, x: 170, y: 591, text: civilStatusOther(pds.civil_status), size: 11 });

  push({ page: 1, x: 137, y: 573, text: pds.height != null ? String(pds.height) : '', size: 11 });
  push({ page: 1, x: 137, y: 557, text: pds.weight != null ? String(pds.weight) : '', size: 11 });
  push({ page: 1, x: 137, y: 540, text: pds.blood_type || '', size: 11 });
  push({ page: 1, x: 137, y: 521, text: pds.gsis_id_no || '', size: 11 });
  push({ page: 1, x: 137, y: 504, text: pds.pag_ibig_id_no || '', size: 11 });
  push({ page: 1, x: 137, y: 485, text: pds.philhealth_no || '', size: 11 });
  push({ page: 1, x: 137, y: 468, text: pds.sss_no || '', size: 11 });
  push({ page: 1, x: 134, y: 460, text: pds.tin_no || '', size: 11 });
  push({ page: 1, x: 137, y: 433, text: pds.agency_employee_no || '', size: 11 });

  // Citizenship — Filipino vs Dual Citizenship checkbox
  push({
    page: 1,
    x: pds.citizenship_type === 'Filipino' ? 375 : 423,
    y: 668,
    text: CHECK,
    size: 11,
  });

  // Dual citizenship sub-type — By Birth vs By Naturalization
  if (pds.citizenship_type !== 'Filipino') {
    push({
      page: 1,
      x: pds.citizenship_type === 'By Naturalization' ? 476 : 436,
      y: 658,
      text: CHECK,
      size: 11,
    });
  }

  push({ page: 1, x: 370, y: 625, text: pds.dual_citizenship_country || '', size: 11 });

  // Residential Address
  push({ page: 1, x: 378, y: 612, text: pds.residential_house_no || '', size: 11, center: true });
  push({ page: 1, x: 492, y: 612, text: pds.residential_street || '', size: 11, center: true });
  push({
    page: 1,
    x: 378,
    y: 595,
    text: pds.residential_subdivision || '',
    size: 11,
    center: true,
  });
  push({ page: 1, x: 492, y: 595, text: pds.residential_barangay || '', size: 11, center: true });
  push({ page: 1, x: 378, y: 577, text: pds.residential_city || '', size: 11, center: true });
  push({ page: 1, x: 492, y: 577, text: pds.residential_province || '', size: 11, center: true });
  push({ page: 1, x: 439, y: 558, text: pds.residential_zip_code || '', size: 11, center: true });

  // Permanent Address
  push({ page: 1, x: 378, y: 543, text: pds.permanent_house_no || '', size: 11, center: true });
  push({ page: 1, x: 492, y: 543, text: pds.permanent_street || '', size: 11, center: true });
  push({ page: 1, x: 378, y: 526, text: pds.permanent_subdivision || '', size: 11, center: true });
  push({ page: 1, x: 492, y: 526, text: pds.permanent_barangay || '', size: 11, center: true });
  push({ page: 1, x: 378, y: 508, text: pds.permanent_city || '', size: 11, center: true });
  push({ page: 1, x: 492, y: 508, text: pds.permanent_province || '', size: 11, center: true });
  push({ page: 1, x: 439, y: 486, text: pds.permanent_zip_code || '', size: 11, center: true });

  push({ page: 1, x: 335, y: 468, text: pds.telephone_no || '', size: 11 });
  push({ page: 1, x: 335, y: 450, text: pds.mobile_no || '', size: 11 });
  push({ page: 1, x: 335, y: 433, text: pds.email_address || '', size: 11 });

  // Spouse
  push({ page: 1, x: 135, y: 404, text: pds.spouse_surname || '', size: 11 });
  push({ page: 1, x: 135, y: 389, text: pds.spouse_first_name || '', size: 11 });
  push({ page: 1, x: 135, y: 374, text: pds.spouse_middle_name || '', size: 11 });
  push({ page: 1, x: 312, y: 389, text: pds.spouse_name_ext || '', size: 11 });
  push({ page: 1, x: 135, y: 359, text: pds.spouse_occupation || '', size: 11 });
  push({ page: 1, x: 135, y: 344, text: pds.spouse_employer || '', size: 11 });
  push({ page: 1, x: 135, y: 329, text: pds.spouse_business_address || '', size: 11 });
  push({ page: 1, x: 135, y: 314, text: pds.spouse_telephone || '', size: 11 });

  // Children (up to 12)
  (pds.children || []).slice(0, 12).forEach((child, i) => {
    const y = 390 - i * 15.3;
    push({ page: 1, x: 334, y, text: child.child_name || '', size: 11 });
    push({ page: 1, x: 480, y, text: formatDMY(child.date_of_birth), size: 11 });
  });

  // Father / Mother
  push({ page: 1, x: 135, y: 298, text: pds.father_surname || '', size: 11 });
  push({ page: 1, x: 135, y: 283, text: pds.father_first_name || '', size: 11 });
  push({ page: 1, x: 135, y: 268, text: pds.father_middle_name || '', size: 11 });
  push({ page: 1, x: 312, y: 283, text: pds.father_name_ext || '', size: 11 });
  push({ page: 1, x: 135, y: 237, text: pds.mother_surname || '', size: 11 });
  push({ page: 1, x: 135, y: 222, text: pds.mother_first_name || '', size: 11 });
  push({ page: 1, x: 135, y: 207, text: pds.mother_middle_name || '', size: 11 });

  // Educational Background (fixed rows, one per level) — each level's exact column
  // x/y/center was hand-tuned against the template, so no shared formula here.
  const eduFor = (level: PDSEducation['level']) => (pds.education || []).find((e) => e.level === level);
  const eduRow = (
    level: PDSEducation['level'],
    schoolY: number,
    numericY: number,
    degreeX: number | null,
    fromX: number,
    toX: number,
    gradYearX: number,
    gradYearCenter: boolean,
    honorsX: number,
    honorsY: number,
  ) => {
    const e = eduFor(level);
    push({ page: 1, x: 135, y: schoolY, text: e?.school_name || '', size: 11 });
    if (degreeX != null) {
      push({ page: 1, x: degreeX, y: schoolY, text: e?.degree_course || '', size: 11 });
    }
    push({
      page: 1,
      x: fromX,
      y: numericY,
      text: e?.period_from != null ? String(e.period_from) : '',
      size: 11,
      center: true,
    });
    push({
      page: 1,
      x: toX,
      y: numericY,
      text: e?.period_to != null ? String(e.period_to) : '',
      size: 11,
      center: true,
    });
    push({
      page: 1,
      x: gradYearX,
      y: numericY,
      text: e?.year_graduated != null ? String(e.year_graduated) : '',
      size: 11,
      center: gradYearCenter,
    });
    push({ page: 1, x: honorsX, y: honorsY, text: e?.scholarship_honors || '', size: 11, center: true });
  };

  eduRow('ELEMENTARY', 145, 143, null, 382, 413, 493, true, 534, 143);
  eduRow('SECONDARY', 122, 122, null, 382, 414, 492, true, 535, 122);
  eduRow('VOCATIONAL', 99, 99, 255, 382, 413, 494, true, 533, 99);
  eduRow('COLLEGE', 80, 81, 256, 380, 412, 492, true, 533, 81);
  eduRow('GRADUATE STUDIES', 58, 58, 257, 382, 413, 475, false, 534, 57);

  // PAGE 2 - Civil Service Eligibility (up to 7)
  (pds.eligibilities || []).slice(0, 7).forEach((e, i) => {
    const y = 768 - i * 20;
    push({ page: 2, x: 80, y, text: e.career_service || '', size: 11 });
    push({ page: 2, x: 262, y, text: e.rating || '', size: 11, center: true });
    push({ page: 2, x: 317, y, text: formatDMY(e.date_of_examination), size: 11, center: true });
    push({ page: 2, x: 352, y, text: e.place_of_examination || '', size: 11 });
    push({ page: 2, x: 447, y, text: e.license_number || '', size: 11, center: true });
    push({ page: 2, x: 496, y, text: e.license_validity || '', size: 11, center: true });
  });

  // Work Experience (up to 28)
  (pds.work_experiences || []).slice(0, 28).forEach((w, i) => {
    const y = 556 - i * 18.55;
    push({ page: 2, x: 96, y, text: formatDMY(w.date_from), size: 11, center: true });
    push({
      page: 2,
      x: 138,
      y,
      text: w.date_to
        ? w.date_to.toLowerCase() === 'present'
          ? 'Present'
          : formatDMY(w.date_to)
        : '',
      size: 11,
      center: true,
    });
    push({ page: 2, x: 164, y, text: w.position_title || '', size: 11 });
    push({ page: 2, x: 352, y, text: w.department_agency || '', size: 11, center: true });
    push({ page: 2, x: 448, y, text: w.status_of_appointment || '', size: 11, center: true });
    push({ page: 2, x: 497, y, text: w.is_government_service ? 'Y' : 'N', size: 11, center: true });
  });

  // PAGE 3 - Voluntary Work (up to 7)
  (pds.voluntary_works || []).slice(0, 7).forEach((v, i) => {
    const y = 761 - i * 20;
    push({ page: 3, x: 46, y, text: v.organization_name || '', size: 11 });
    push({ page: 3, x: 270, y, text: formatDMY(v.date_from), size: 11 });
    push({ page: 3, x: 310, y, text: formatDMY(v.date_to), size: 11 });
    push({
      page: 3,
      x: 360,
      y,
      text: v.number_of_hours != null ? String(v.number_of_hours) : '',
      size: 11,
    });
    push({ page: 3, x: 400, y, text: v.position_nature_of_work || '', size: 11 });
  });

  // Learning & Development (up to 21)
  (pds.trainings || []).slice(0, 21).forEach((l, i) => {
    const y = 564 - i * 17;
    push({ page: 3, x: 45, y, text: l.title || '', size: 11 });
    push({ page: 3, x: 286, y, text: formatDMY(l.date_from), size: 11, center: true });
    push({ page: 3, x: 325, y, text: formatDMY(l.date_to), size: 11, center: true });
    push({
      page: 3,
      x: 364,
      y,
      text: l.number_of_hours != null ? String(l.number_of_hours) : '',
      size: 11,
      center: true,
    });
    push({ page: 3, x: 405, y, text: l.type_of_ld || '', size: 11, center: true });
    push({ page: 3, x: 431, y, text: l.conducted_by || '', size: 11 });
  });

  // Other Information (Skills / Recognition / Membership — up to 7 each)
  const otherInfo = pds.other_info || [];
  otherInfo
    .filter((o) => o.info_type === 'SKILL')
    .slice(0, 7)
    .forEach((s, i) => push({ page: 3, x: 44, y: 160 - i * 18, text: s.details, size: 11 }));
  otherInfo
    .filter((o) => o.info_type === 'RECOGNITION')
    .slice(0, 7)
    .forEach((r, i) => push({ page: 3, x: 178, y: 160 - i * 18, text: r.details, size: 11 }));
  otherInfo
    .filter((o) => o.info_type === 'MEMBERSHIP')
    .slice(0, 7)
    .forEach((m, i) => push({ page: 3, x: 430, y: 160 - i * 18, text: m.details, size: 11 }));

  // PAGE 4 - Questions YES/NO checkmarks — each row's yes/no box was individually
  // hand-tuned against the template, so x/y/center are given per row, not a formula.
  const questions: {
    answer: boolean | undefined;
    yesX: number;
    noX: number;
    y: number;
    noCenter: boolean;
  }[] = [
    { answer: pds.q34_a_answer, yesX: 378, noX: 430, y: 772, noCenter: true },
    { answer: pds.q34_b_answer, yesX: 378, noX: 430, y: 757, noCenter: true },
    { answer: pds.q35_a_answer, yesX: 376, noX: 431, y: 718, noCenter: true },
    { answer: pds.q35_b_answer, yesX: 376, noX: 430, y: 674, noCenter: false },
    { answer: pds.q36_answer, yesX: 376, noX: 434, y: 620, noCenter: false },
    { answer: pds.q37_answer, yesX: 375, noX: 434, y: 579, noCenter: false },
    { answer: pds.q38_answer, yesX: 376, noX: 438, y: 543, noCenter: false },
    { answer: pds.q39_answer, yesX: 378, noX: 439, y: 517, noCenter: false },
    { answer: pds.q40_answer, yesX: 376, noX: 438, y: 486, noCenter: false },
    { answer: pds.q41_answer, yesX: 376, noX: 439, y: 414, noCenter: false },
    { answer: pds.q43_answer, yesX: 376, noX: 439, y: 393, noCenter: false },
    { answer: pds.q44_answer, yesX: 376, noX: 439, y: 370, noCenter: false },
  ];
  questions.forEach((q) => {
    push({ page: 4, x: q.yesX, y: q.y, text: yn(q.answer), size: 11, center: true });
    push({ page: 4, x: q.noX, y: q.y, text: yn(q.answer === false), size: 11, center: q.noCenter });
  });

  // References
  (pds.references || []).slice(0, 3).forEach((r, i) => {
    const y = 310 - i * 20;
    push({ page: 4, x: 52, y, text: r.name || '', size: 11 });
    push({ page: 4, x: 243, y, text: r.address || '', size: 11 });
    push({ page: 4, x: 395, y, text: r.telephone_number || '', size: 11, center: true });
  });

  // Government ID — stacked vertically at a shared x
  push({ page: 4, x: 115, y: 160, text: pds.government_issued_id || '', size: 11 });
  push({ page: 4, x: 115, y: 144, text: pds.government_id_number || '', size: 11 });
  push({ page: 4, x: 115, y: 127, text: formatDMY(pds.government_id_date_issued), size: 11 });

  // Date filled / Place issued
  push({ page: 4, x: 332, y: 131, text: formatDMY(pds.submitted_at), size: 11, center: true });

  return overlays;
}
