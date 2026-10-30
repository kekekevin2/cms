import type { AcademicProfile, EmploymentProfile, PersonalProfile } from '../faculty/faculty-profile.service';

/**
 * The Faculty Profile cover page, drawn onto the branded template (public/profile-cover.pdf,
 * 612×936 pt). Every position, size and colour below was measured from the reference design
 * (a 1308×2000 px export of the same template, 1 px = 612/1308 pt). Coordinates are PDF points
 * from the top-left; text y values are baselines. Content flows top to bottom, so longer or
 * missing values move the sections below them instead of overlapping.
 *
 * Pure canvas drawing (no DOM, no Angular) so it can also be rendered outside the browser.
 */

export interface FacultyProfileHeader {
  first_name: string;
  middle_name?: string;
  last_name: string;
  extension_name?: string | null;
  email: string;
  contact_number?: string;
  department: string;
  position_level?: string;
  academic_rank?: string;
  /** Designations assigned by the College Department, separated by newlines. */
  designation?: string | null;
  /** Status assigned by the College Department on the faculty record. */
  employment_status?: string | null;
  birth_date?: string;
  civil_status?: string;
}

export interface PdsEducationRow {
  level: string;
  degree_course?: string;
  school_name?: string;
  year_graduated?: number;
  scholarship_honors?: string;
  highest_level_earned?: string;
}

export interface FacultyProfilePdfData {
  faculty: FacultyProfileHeader;
  personal: PersonalProfile | null;
  academic: AcademicProfile[];
  employment: EmploymentProfile[];
  coursesHandled: string[];
  /** Civil service eligibility titles (from the PDS) */
  eligibilities?: string[];
  /** PDS education, used when the academic profile has no entries */
  pdsEducation?: PdsEducationRow[];
  /** Viewable URL of the photo to place in the photo box */
  photoUrl?: string | null;
}

/** Image-like source the canvas can draw (HTMLImageElement in the browser). */
type Drawable = CanvasImageSource & { width: number; height: number };
/** The parts of CanvasRenderingContext2D the cover uses. */
type Ctx = Pick<
  CanvasRenderingContext2D,
  'font' | 'fillStyle' | 'textAlign' | 'textBaseline' | 'fillText' | 'measureText' | 'fillRect' | 'drawImage' | 'beginPath' | 'arc' | 'fill'
>;

export const PROFILE_FONT = 'Montserrat';

const RED = '#860000';
const BLACK = '#000000';
const RULE_RIGHT = 550; // right end of the horizontal rule; header text wraps before it
const VALUE_RIGHT = 590; // values in the right-hand column (degrees, eligibilities…) run this far

const PHOTO = { x: 80.5, y: 101.5, w: 145, h: 205.4 };

const HEAD = {
  x: 250.8,
  titleY: 138,
  nameGap: 38.4, // title → name baselines
  rankGap: 13.6,
  designationGap: 24.3,
  collegeGap: 13.8,
  contactLabelGap: 26,
  valueGap: 14,
  emailLabelGap: 21.5,
  valueX: 287.3,
};

const RULE = { x1: 61.3, x2: 550.2, y: 328.9, h: 2.8 };

const SECTION = { x: 81.9, size: 17.85, firstGap: 33.2, gapAfter: 39.8 };
const ROW = { labelX: 94.5, valueX: 303.2, firstGap: 23.9, step: 23.46, labelSize: 13.8, valueSize: 14 };
const DIVIDER = { x: 280.3, w: 1.4, above: 13.1, below: 10.3 };
const EXTENSION = { x: 418, gap: 16 };
const EDU = { degreeSize: 11.75, degreeStep: 10.8, detailSize: 9.9, detailGap: 11.4, detailStep: 10.2, entryGap: 24 };
const ELIG = { size: 9.95, step: 11.7, firstOffset: -4.2 };
const COURSE = {
  bulletX: 110.9, textX: 124, size: 12, firstGap: 16.9,
  lineHeight: 14, itemGap: 2.4, columnShift: 210, maxY: 885,
};

interface ProfileLayout {
  bottom: number;
  draw: () => void;
}

/** Draw every profile field on one page, reducing type and spacing only when needed. */
export function drawProfileCover(ctx: Ctx, scale: number, data: FacultyProfilePdfData, photo: Drawable | null): void {
  let layout = planProfileCover(ctx, scale, data, photo, 1);
  if (layout.bottom > COURSE.maxY) {
    let low = 0;
    let high = 1;
    let fitting: ProfileLayout | undefined;
    for (let attempt = 0; attempt < 18; attempt++) {
      const density = (low + high) / 2;
      const candidate = planProfileCover(ctx, scale, data, photo, density);
      if (candidate.bottom <= COURSE.maxY) {
        fitting = candidate;
        low = density;
      } else {
        high = density;
      }
    }
    if (!fitting) throw new Error('The Faculty Profile could not fit within the page.');
    layout = fitting;
  }
  layout.draw();
}

/** Measure and queue drawing before committing anything onto the branded page. */
function planProfileCover(ctx: Ctx, scale: number, data: FacultyProfilePdfData, photo: Drawable | null, density: number): ProfileLayout {
  const { faculty, personal, academic } = data;

  const commands: (() => void)[] = [];
  let bottom = 0;
  const head = {
    ...HEAD,
    nameGap: HEAD.nameGap * density, rankGap: HEAD.rankGap * density,
    designationGap: HEAD.designationGap * density, collegeGap: HEAD.collegeGap * density,
    contactLabelGap: HEAD.contactLabelGap * density, valueGap: HEAD.valueGap * density,
    emailLabelGap: HEAD.emailLabelGap * density,
  };
  const section = { ...SECTION, firstGap: SECTION.firstGap * density, gapAfter: SECTION.gapAfter * density };
  const row = { ...ROW, firstGap: ROW.firstGap * density, step: ROW.step * density };
  const divider = { ...DIVIDER, above: DIVIDER.above * density, below: DIVIDER.below * density };
  const extension = { ...EXTENSION, gap: EXTENSION.gap * density };
  const edu = {
    ...EDU, degreeStep: EDU.degreeStep * density, detailGap: EDU.detailGap * density,
    detailStep: EDU.detailStep * density, entryGap: EDU.entryGap * density,
  };
  const elig = { ...ELIG, step: ELIG.step * density, firstOffset: ELIG.firstOffset * density };
  type Weight = 400 | 800 | 900;
  const font = (weight: Weight, size: number) => `${weight} ${size * density * scale}px ${PROFILE_FONT}, Arial, sans-serif`;
  const measure = (t: string, weight: Weight, size: number) => {
    ctx.font = font(weight, size);
    return ctx.measureText(t).width / scale;
  };
  const text = (t: string, x: number, y: number, weight: Weight, size: number, color = BLACK) => {
    if (!t) return;
    ctx.font = font(weight, size);
    ctx.textBaseline = 'alphabetic';
    const descent = ctx.measureText(t).actualBoundingBoxDescent / scale;
    bottom = Math.max(bottom, y + Math.max(0, descent));
    commands.push(() => {
      ctx.font = font(weight, size);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(t, x * scale, y * scale);
    });
  };
  /** Wraps `t` to `maxWidth`; returns the baseline of the last line drawn. */
  const wrapped = (t: string, x: number, y: number, weight: Weight, size: number, step: number, maxWidth: number) => {
    const lines = wrapLines(t, (s) => measure(s, weight, size), maxWidth);
    lines.forEach((line, i) => text(line, x, y + i * step, weight, size));
    return y + Math.max(lines.length - 1, 0) * step;
  };
  const rect = (x: number, y: number, w: number, h: number) => {
    bottom = Math.max(bottom, y + h);
    commands.push(() => {
      ctx.fillStyle = BLACK;
      ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
    });
  };

  // ── Photo (cropped to fill the box, like CSS object-fit: cover) ──
  if (photo && photo.width && photo.height) {
    const boxRatio = PHOTO.w / PHOTO.h;
    const imgRatio = photo.width / photo.height;
    let sw = photo.width;
    let sh = photo.height;
    if (imgRatio > boxRatio) sw = photo.height * boxRatio;
    else sh = photo.width / boxRatio;
    const sx = (photo.width - sw) / 2;
    const sy = (photo.height - sh) / 2;
    bottom = Math.max(bottom, PHOTO.y + PHOTO.h);
    commands.push(() => ctx.drawImage(photo, sx, sy, sw, sh, PHOTO.x * scale, PHOTO.y * scale, PHOTO.w * scale, PHOTO.h * scale));
  }

  // ── Header block ──
  const rank = titleCase(faculty.position_level?.trim() || faculty.academic_rank?.trim() || '');
  const designations = (faculty.designation || '').split(/\r?\n/)
    .map((value) => value.trim()).filter(Boolean);
  const designation = designations.length > 0
    ? [...designations, rank].filter(Boolean).join(' | ')
    : '';
  const nameExtension = profileNameExtension(data);
  const fullName = profileFullName(data);
  const headWidth = RULE_RIGHT - head.x;

  text('FACULTY PROFILE', head.x, head.titleY, 800, 25, RED);
  let y = head.titleY + head.nameGap;
  y = wrapped(fullName, head.x, y, 800, 19.8, 21 * density, headWidth);
  if (rank) y = wrapped(rank, head.x, y + head.rankGap, 400, 14.2, 15.5 * density, headWidth);
  if (designation) y = wrapped(designation, head.x, y + head.designationGap, 800, 14.2, 15.5 * density, headWidth);
  if (faculty.department) {
    y = wrapped(faculty.department, head.x, y + (designation ? head.collegeGap : head.designationGap), 400, 14.15, 15.5 * density, headWidth);
  }
  y += head.contactLabelGap;
  text('Contact Number:', head.x, y, 400, 11.9);
  y += head.valueGap;
  y = wrapped(faculty.contact_number || personal?.mobile_number_primary || '—', head.valueX, y, 400, 11.9, 13 * density, RULE_RIGHT - head.valueX);
  y += head.emailLabelGap;
  text('Email Address:', head.x, y, 400, 11.9);
  y += 13.1 * density;
  y = wrapped(faculty.email || personal?.email_primary || '—', head.valueX, y, 400, 11.9, 13 * density, RULE_RIGHT - head.valueX);

  // ── Horizontal rule (moves down only if the header block is unusually long) ──
  const ruleY = Math.max(RULE.y, y + 24 * density, PHOTO.y + PHOTO.h + 20);
  rect(RULE.x1, ruleY, RULE.x2 - RULE.x1, RULE.h);

  // ── Personal information ──
  let sectionY = ruleY + section.firstGap;
  text('PERSONAL INFORMATION', section.x, sectionY, 900, section.size, RED);
  const birthDate = personal?.date_of_birth || faculty.birth_date;
  const rows: [string, string][] = [
    ['FIRST NAME', faculty.first_name || ''],
    ['MIDDLE NAME', faculty.middle_name || ''],
    ['LAST NAME', faculty.last_name || ''],
    ['ACADEMIC RANK', rank],
    ['EMPLOYMENT STATUS', titleCase(faculty.employment_status || '')],
    ['BIRTH DATE', formatLongDate(birthDate)],
    ['AGE', calculateAge(birthDate)],
    ['CIVIL STATUS', titleCase(personal?.civil_status || faculty.civil_status || '')],
  ];
  let rowY = sectionY + row.firstGap;
  const firstRowY = rowY;
  const extensionLines = wrapLines(nameExtension, (s) => measure(s, 400, row.valueSize), VALUE_RIGHT - extension.x);
  const extensionBottom = firstRowY + extension.gap * extensionLines.length;
  rows.forEach(([label, value], i) => {
    if (i > 0) rowY += row.step;
    text(label, row.labelX, rowY, 900, row.labelSize);
    const valueRight = nameExtension && rowY - row.valueSize * density < extensionBottom + 4 * density
      ? extension.x - 12 : VALUE_RIGHT;
    rowY = wrapped(value, row.valueX, rowY, 400, row.valueSize, 16 * density, valueRight - row.valueX);
  });
  if (nameExtension) {
    const label = 'NAME EXTENSION:';
    text(label, extension.x, firstRowY, 900, row.labelSize);
    const labelWidth = measure(label, 900, row.labelSize);
    extensionLines.forEach((line, i) => {
      const valueWidth = measure(line, 400, row.valueSize);
      text(line, extension.x + Math.max(0, (labelWidth - valueWidth) / 2), firstRowY + extension.gap * (i + 1), 400, row.valueSize);
    });
  }
  rect(divider.x, firstRowY - divider.above, divider.w, rowY + divider.below - (firstRowY - divider.above));
  let last = rowY + divider.below;

  // ── Education ──
  const education = educationEntries(academic, data.pdsEducation || []);
  if (education.length > 0) {
    sectionY = last + (section.gapAfter - divider.below);
    text('EDUCATION', section.x, sectionY, 900, section.size, RED);
    let entryY = sectionY + row.firstGap;
    const top = entryY - divider.above;
    let bottom = entryY;
    education.forEach((e, i) => {
      if (i > 0) entryY = bottom + edu.entryGap;
      text(e.label, row.labelX, entryY, 900, row.labelSize);
      let lineY = wrapped(e.degree || '—', row.valueX, entryY - 3 * density, 800, edu.degreeSize, edu.degreeStep, VALUE_RIGHT - row.valueX);
      e.details.forEach((d, j) => {
        lineY = wrapped(d, row.valueX, lineY + (j === 0 ? edu.detailGap : edu.detailStep), 400, edu.detailSize, edu.detailStep, VALUE_RIGHT - row.valueX);
      });
      bottom = Math.max(lineY, entryY);
    });
    rect(divider.x, top, divider.w, bottom + 2.5 * density - top);
    last = bottom + 2.5 * density;
  }

  // ── Eligibilities ──
  const eligibilities = (data.eligibilities || []).map((e) => e.trim()).filter(Boolean);
  if (eligibilities.length > 0) {
    sectionY = last + 41.3 * density;
    text('ELIGIBILITIES', section.x, sectionY, 900, section.size, RED);
    let itemY = sectionY + elig.firstOffset;
    const top = itemY - 12.7 * density;
    eligibilities.forEach((e, i) => {
      if (i > 0) itemY += elig.step;
      itemY = wrapped(e, row.valueX, itemY, 400, elig.size, elig.step, VALUE_RIGHT - row.valueX);
    });
    const bottom = Math.max(itemY + 3.2 * density, sectionY + 3 * density);
    rect(divider.x, top, divider.w, bottom - top);
    last = Math.max(bottom, sectionY);
  }

  // ── Courses handled ──
  const courses = data.coursesHandled.map((c) => c.trim()).filter(Boolean);
  if (courses.length > 0) {
    sectionY = last + (eligibilities.length > 0 ? 31.8 : 39) * density;
    text('COURSES HANDLED', section.x, sectionY, 900, section.size, RED);
    drawCourseColumns(ctx, scale, courses, sectionY + COURSE.firstGap * density, density, text, (x, y, radius) => {
      bottom = Math.max(bottom, y + radius);
      commands.push(() => {
        ctx.fillStyle = BLACK;
        ctx.beginPath();
        ctx.arc(x * scale, y * scale, radius * scale, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }
  return { bottom, draw: () => commands.forEach((draw) => draw()) };
}

function profileNameExtension(data: FacultyProfilePdfData): string {
  // My Profile is authoritative: an empty choice must not revive an old PDS suffix.
  const extension = (data.personal?.extension_name || '').trim().toUpperCase();
  return /^(JR\.?|SR\.?|II|III|IV|V)$/.test(extension) ? extension : '';
}

function profileFullName(data: FacultyProfilePdfData): string {
  const { faculty } = data;
  const initial = (faculty.middle_name || '').trim().charAt(0);
  return [faculty.first_name, initial ? `${initial}.` : '', faculty.last_name, profileNameExtension(data)]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().toUpperCase();
}

/** Balance all courses across columns without dropping entries or creating another page. */
function drawCourseColumns(
  ctx: Ctx, scale: number, courses: string[], firstY: number, density: number,
  text: (value: string, x: number, y: number, weight: 400 | 800 | 900, size: number) => void,
  bullet: (x: number, y: number, radius: number) => void,
): void {
  ctx.font = `400 ${COURSE.size * density * scale}px ${PROFILE_FONT}, Arial, sans-serif`;
  const wrap = (value: string, width: number) => wrapLines(value, (s) => ctx.measureText(s).width / scale, width);
  const height = (lines: string[]) => (lines.length * COURSE.lineHeight + COURSE.itemGap) * density;
  const drawColumn = (items: string[][], offset: number) => {
    let y = firstY;
    for (const lines of items) {
      bullet(COURSE.bulletX + 1.4 * density + offset, y - 4.2 * density, 1.4 * density);
      lines.forEach((line, i) => text(line, COURSE.textX + offset, y + i * COURSE.lineHeight * density, 400, COURSE.size));
      y += height(lines);
    }
  };
  if (courses.length <= 5) {
    drawColumn(courses.map((course) => wrap(course, VALUE_RIGHT - COURSE.textX)), 0);
    return;
  }
  const left = courses.map((course) => wrap(course, COURSE.columnShift - 20));
  const right = courses.map((course) => wrap(course, VALUE_RIGHT - COURSE.textX - COURSE.columnShift));
  const prefixHeights = (items: string[][]) => {
    const sums = [0];
    items.forEach((lines) => sums.push(sums[sums.length - 1] + height(lines)));
    return sums;
  };
  const leftHeights = prefixHeights(left);
  const rightHeights = prefixHeights(right);
  let split = 1;
  let bestHeight = Infinity;
  const middle = Math.ceil(courses.length / 2);
  for (let i = 1; i < courses.length; i++) {
    const columnHeight = Math.max(leftHeights[i], rightHeights[courses.length] - rightHeights[i]);
    if (columnHeight < bestHeight - 0.01 ||
        (Math.abs(columnHeight - bestHeight) < 0.01 && Math.abs(i - middle) < Math.abs(split - middle))) {
      split = i;
      bestHeight = columnHeight;
    }
  }
  drawColumn(left.slice(0, split), 0);
  drawColumn(right.slice(split), COURSE.columnShift);
}

interface EducationEntry {
  label: string;
  degree: string;
  details: string[];
}

/** Undergraduate / Master's / Doctorate entries from the academic profile, else from the PDS. */
function educationEntries(academic: AcademicProfile[], pds: PdsEducationRow[]): EducationEntry[] {
  const levels: [string, RegExp][] = [
    ['UNDERGRADUATE', /under|bachelor|college/i],
    ['MASTER’S', /master/i],
    ['DOCTORATE', /doctor|ph\.?d/i],
  ];
  const fromAcademic = levels
    .map(([label, re]) => {
      const e = academic.find((a) => re.test(a.level || ''));
      if (!e) return null;
      const years = e.year_graduated
        ? String(e.year_graduated)
        : e.year_from || e.year_to
          ? [e.year_from, e.year_to].filter(Boolean).join(' – ')
          : '';
      return {
        label,
        degree: (e.degree_course || '').trim(),
        details: [e.school_name || '', years, e.honors_received || ''].map((s) => s.trim()).filter(Boolean),
      };
    })
    .filter((e): e is EducationEntry => !!e);
  if (fromAcademic.length > 0) return fromAcademic;

  // PDS: College → Undergraduate; Graduate Studies → Doctorate when the degree says so, else Master's
  const entries: EducationEntry[] = [];
  const add = (label: string, e: PdsEducationRow | undefined) => {
    if (!e) return;
    entries.push({
      label,
      degree: (e.degree_course || '').trim(),
      details: [e.school_name || '', e.year_graduated ? String(e.year_graduated) : e.highest_level_earned || '', e.scholarship_honors || '']
        .map((s) => String(s).trim())
        .filter(Boolean),
    });
  };
  const graduate = pds.filter((e) => /graduate/i.test(e.level));
  add('UNDERGRADUATE', pds.find((e) => /college/i.test(e.level)));
  add('MASTER’S', graduate.find((e) => !/doctor|ph\.?d/i.test(e.degree_course || '')));
  add('DOCTORATE', graduate.find((e) => /doctor|ph\.?d/i.test(e.degree_course || '')));
  return entries;
}

function wrapLines(t: string, measure: (s: string) => number, maxWidth: number): string[] {
  const words = (t || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (measure(w) > maxWidth) {
      if (line) lines.push(line);
      line = '';
      for (const character of w) {
        if (line && measure(line + character) > maxWidth) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
      continue;
    }
    const candidate = line ? `${line} ${w}` : w;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** "ASSOCIATE PROFESSOR II" → "Associate Professor II" (roman numerals stay upper case). */
function titleCase(s: string): string {
  if (!s || s !== s.toUpperCase()) return s.trim();
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (/^[ivxlcdm]+$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim();
}

function formatLongDate(value: string | undefined | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function calculateAge(birthDate: string | undefined | null): string {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getUTCFullYear();
  const monthDiff = today.getMonth() - d.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getUTCDate())) age--;
  return `${age} years old`;
}
