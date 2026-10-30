import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * Fitting long values into the PDS form's boxes. Shared by the PDF export (pds-pdf.service) and the
 * PDS Template Editor preview so both draw the same thing.
 *
 * The box around a value is found from the template's own table rules (the lines drawn on the
 * page), so it works for every field and wherever a field has been dragged to in the editor.
 * A value that fits stays on one line at its normal size and baseline; a longer one wraps onto
 * more lines inside the same box, shrinking the font until all lines fit the box's height.
 */

/** Horizontal rules as [y, x1, x2] and vertical rules as [x, y1, y2], in PDF points (y up). */
export interface PageRules {
  h: [number, number, number][];
  v: [number, number, number][];
}

const rulesCache = new WeakMap<PDFDocumentProxy, Map<number, Promise<PageRules>>>();

/** Table rules of one template page (read once per page). */
export function getPageRules(doc: PDFDocumentProxy, pageNum: number): Promise<PageRules> {
  let pages = rulesCache.get(doc);
  if (!pages) rulesCache.set(doc, (pages = new Map()));
  let rules = pages.get(pageNum);
  if (!rules) {
    rules = doc.getPage(pageNum).then((page) => page.getOperatorList()).then(extractRules);
    rules.catch(() => pages!.delete(pageNum));
    pages.set(pageNum, rules);
  }
  return rules;
}

type Matrix = [number, number, number, number, number, number];

/** Shorter strokes are check boxes and glyph-like marks, not table rules. */
const MIN_RULE = 12;

/** Walks a page's drawing operations and collects axis-aligned lines and thin rectangles. */
function extractRules(ops: { fnArray: number[]; argsArray: any[] }): PageRules {
  const OPS = pdfjsLib.OPS;
  const h: PageRules['h'] = [];
  const v: PageRules['v'] = [];
  let ctm: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const mul = (m: Matrix, n: Matrix): Matrix => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const T = (x: number, y: number): [number, number] => [
    ctm[0] * x + ctm[2] * y + ctm[4],
    ctm[1] * x + ctm[3] * y + ctm[5],
  ];
  const addSeg = (x1: number, y1: number, x2: number, y2: number) => {
    if (Math.abs(y2 - y1) < 0.6 && Math.abs(x2 - x1) > MIN_RULE) h.push([y1, Math.min(x1, x2), Math.max(x1, x2)]);
    else if (Math.abs(x2 - x1) < 0.6 && Math.abs(y2 - y1) > MIN_RULE) v.push([x1, Math.min(y1, y2), Math.max(y1, y2)]);
  };

  for (let k = 0; k < ops.fnArray.length; k++) {
    const fn = ops.fnArray[k];
    if (fn === OPS.save) {
      stack.push(ctm);
      continue;
    }
    if (fn === OPS.restore) {
      ctm = stack.pop() || ctm;
      continue;
    }
    if (fn === OPS.transform) {
      ctm = mul(ctm, ops.argsArray[k] as Matrix);
      continue;
    }
    if (fn !== OPS.constructPath) continue;
    const [pathOps, coords] = ops.argsArray[k];
    const c: number[] = Array.from(coords || []);
    let ci = 0;
    let cur: [number, number] | null = null;
    for (const o of pathOps || []) {
      if (o === OPS.rectangle) {
        const [x, y, w, hh] = c.slice(ci, ci + 4);
        ci += 4;
        const [x1, y1] = T(x, y);
        const [x2, y2] = T(x + w, y + hh);
        if (Math.abs(y2 - y1) < 2.5 && Math.abs(x2 - x1) > MIN_RULE) {
          h.push([(y1 + y2) / 2, Math.min(x1, x2), Math.max(x1, x2)]);
        } else if (Math.abs(x2 - x1) < 2.5 && Math.abs(y2 - y1) > MIN_RULE) {
          v.push([(x1 + x2) / 2, Math.min(y1, y2), Math.max(y1, y2)]);
        } else if (Math.abs(x2 - x1) > 12 || Math.abs(y2 - y1) > 12) {
          // A cell drawn as a full rectangle: its four edges are rules too (small squares are
          // check boxes, not cells, so they are skipped)
          addSeg(x1, y1, x2, y1);
          addSeg(x1, y2, x2, y2);
          addSeg(x1, y1, x1, y2);
          addSeg(x2, y1, x2, y2);
        }
      } else if (o === OPS.moveTo) {
        cur = T(c[ci], c[ci + 1]);
        ci += 2;
      } else if (o === OPS.lineTo) {
        const next = T(c[ci], c[ci + 1]);
        ci += 2;
        if (cur) addSeg(cur[0], cur[1], next[0], next[1]);
        cur = next;
      } else if (o === OPS.curveTo) {
        ci += 6;
      } else if (o === OPS.curveTo2 || o === OPS.curveTo3) {
        ci += 4;
      }
    }
  }
  return { h, v };
}

/** The table cell around a value anchored at (x, baseline y), in PDF points. */
export function findCell(rules: PageRules, x: number, y: number, pageWidth: number, pageHeight: number) {
  const py = y + 2; // just above the baseline, inside the cell
  let left = 0;
  let right = pageWidth;
  let bottom = 0;
  let top = pageHeight;
  for (const [vx, y1, y2] of rules.v) {
    if (py < y1 - 0.5 || py > y2 + 0.5) continue;
    if (vx <= x - 0.5 && vx > left) left = vx;
    if (vx >= x + 0.5 && vx < right) right = vx;
  }
  for (const [hy, x1, x2] of rules.h) {
    if (x < x1 - 0.5 || x > x2 + 0.5) continue;
    if (hy <= py && hy > bottom) bottom = hy;
    if (hy > py && hy < top) top = hy;
  }
  return { left, right, bottom, top };
}

export interface TextLine {
  text: string;
  /** x in PDF points: left edge, or the centre when `center` */
  x: number;
  /** baseline y in PDF points */
  y: number;
}

/**
 * Lays out one value. `measure(text, fontPt)` returns its width in points for the PDF's
 * font at that size. Returns the lines to draw and the font size (points) to draw them at.
 */
export function layoutText(
  text: string,
  anchor: { x: number; y: number; center: boolean; fontPt: number },
  cell: { left: number; right: number; bottom: number; top: number },
  measure: (text: string, fontPt: number) => number,
): { lines: TextLine[]; fontPt: number } {
  const { x, y, center, fontPt } = anchor;
  const pad = 1.5;
  const maxWidth = center
    ? 2 * Math.max(0, Math.min(x - cell.left, cell.right - x) - pad)
    : Math.max(0, cell.right - x - pad);
  const single = { lines: [{ text, x, y }], fontPt };
  if (!text || maxWidth <= 0 || measure(text, fontPt) <= maxWidth) return single;

  // Too wide: wrap within the box and shrink until every line fits its height. The box reaches no
  // higher than about one line above the baseline, so text never climbs into labels or other
  // rows sharing a tall unruled area (e.g. "Other/s:" in Civil Status, Q38 details, the label
  // inside the Name Extension box).
  const top = Math.min(cell.top, y + fontPt + 1);
  cell = { ...cell, top };
  const boxHeight = Math.max(cell.top - cell.bottom - 2 * pad, fontPt);
  const minPt = Math.max(3, fontPt * 0.4);
  let fit: { lines: string[]; pt: number } | null = null;
  for (let pt = fontPt; pt >= minPt; pt -= 0.25) {
    const lines = wrap(text, maxWidth, pt, measure);
    if (lines.length * pt * 1.12 <= boxHeight || pt - 0.25 < minPt) {
      fit = { lines, pt };
      break;
    }
  }
  const pt = fit!.pt;
  let lines = fit!.lines;
  // Even the smallest size is too tall: keep the lines that fit and end the last with "…",
  // rather than spilling into the rows above and below
  const maxLines = Math.max(1, Math.floor(boxHeight / (pt * 1.12)));
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && measure(`${last}…`, pt) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }

  // Centre the block of lines vertically in the box
  const lineHeight = pt * 1.12;
  const blockHeight = lines.length * lineHeight;
  const middle = (cell.top + cell.bottom) / 2;
  const firstBaseline = middle + blockHeight / 2 - pt * 0.85;
  return {
    lines: lines.map((t, i) => ({ text: t, x, y: firstBaseline - i * lineHeight })),
    fontPt: pt,
  };
}

/** Greedy word wrap; words longer than the width are split by character. */
function wrap(text: string, maxWidth: number, pt: number, measure: (t: string, pt: number) => number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, pt) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    if (measure(word, pt) <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = '';
    for (const ch of word) {
      if (chunk && measure(chunk + ch, pt) > maxWidth) {
        lines.push(chunk);
        chunk = '';
      }
      chunk += ch;
    }
    line = chunk;
  }
  if (line) lines.push(line);
  return lines;
}

export const PDS_FONT_FAMILY = `'Times New Roman', Times, serif`;

/**
 * Draws one value on a page canvas, wrapped and shrunk to fit its box when it is too long.
 * `size` is the overlay's size setting (drawn at size / 1.5 pt, as everywhere in the PDS export);
 * `page` is the page size in PDF points and `scale` the canvas pixels per point.
 */
export function drawFittedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  anchor: { x: number; y: number; center?: boolean; size?: number },
  rules: PageRules | null,
  page: { width: number; height: number },
  scale: number,
): void {
  if (!text) return;
  const fontPt = (anchor.size || 11) / 1.5;
  const center = !!anchor.center;
  const measure = (t: string, pt: number) => {
    ctx.font = `${pt * scale}px ${PDS_FONT_FAMILY}`;
    return ctx.measureText(t).width / scale;
  };
  // Check marks and single characters never need fitting
  const { lines, fontPt: pt } =
    rules && text.length > 1
      ? layoutText(
          text,
          { x: anchor.x, y: anchor.y, center, fontPt },
          findCell(rules, anchor.x, anchor.y, page.width, page.height),
          measure,
        )
      : { lines: [{ text, x: anchor.x, y: anchor.y }], fontPt };

  ctx.font = `${pt * scale}px ${PDS_FONT_FAMILY}`;
  ctx.fillStyle = '#000';
  ctx.textAlign = center ? 'center' : 'left';
  for (const line of lines) ctx.fillText(line.text, line.x * scale, (page.height - line.y) * scale);
  ctx.textAlign = 'left';
}
