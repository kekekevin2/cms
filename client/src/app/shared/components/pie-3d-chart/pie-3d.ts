/**
 * Canvas drawing for the isometric ("3-D") pie used by Pie3dChartComponent — kept free of Angular
 * so it can be rendered and checked on its own.
 *
 * The pie is a tilted disc: the top face is an ellipse (height = TILT × width) and the front half
 * of its rim is extruded downwards by DEPTH × radius, shaded darker towards the sides. Slices run
 * clockwise from 12 o'clock. Each slice is labelled outside the disc with its name and percentage
 * in the slice colour (like a spreadsheet's 3-D pie); labels on the same side are nudged apart.
 */
export interface Pie3dSlice {
  /** Short label printed beside the slice (e.g. the surname) */
  label: string;
  /** Full text for the hover tooltip */
  title: string;
  value: number;
  /** Printed percentage text, e.g. "15%" */
  percentText: string;
  color: string;
}

export interface Pie3dTheme {
  dark: boolean;
  fontFamily: string;
}

/** Hit-test geometry of the last draw, in CSS pixels */
export interface Pie3dGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Start/end angle (radians, canvas convention) of each slice */
  arcs: { start: number; end: number }[];
}

const TILT = 0.46;
const DEPTH = 0.22;
const START = -Math.PI / 2;
const TAU = Math.PI * 2;

/** Excel-like palette: distinct, mid-tone hues that read on both white and dark cards */
export const PIE_3D_COLORS = [
  '#E8743B',
  '#1F9BD7',
  '#4CA92F',
  '#A3461A',
  '#155F85',
  '#2F6A1F',
  '#D4A62A',
  '#7E57C2',
  '#D9497A',
  '#2A9D8F',
];

export function drawPie3d(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  slices: Pie3dSlice[],
  theme: Pie3dTheme,
): Pie3dGeometry | null {
  ctx.clearRect(0, 0, width, height);
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  if (total <= 0) return null;

  // Room for the outside labels: wider at the sides than above/below
  const labelX = Math.min(90, width * 0.2);
  const labelY = 34;
  const rx = Math.max(20, Math.min((width - labelX * 2) / 2, (height - labelY * 2) / (2 * TILT + DEPTH)));
  const ry = rx * TILT;
  const depth = rx * DEPTH;
  const cx = width / 2;
  const cy = (height - depth) / 2;

  let angle = START;
  const arcs = slices.map((s) => {
    const start = angle;
    angle += (Math.max(0, s.value) / total) * TAU;
    return { start, end: angle };
  });
  // 0. Soft shadow under the disc, so it sits on the card
  ctx.save();
  ctx.translate(cx, cy + depth + ry * 0.12);
  ctx.scale(1, TILT);
  const shadow = ctx.createRadialGradient(0, 0, rx * 0.7, 0, 0, rx * 1.1);
  shadow.addColorStop(0, `rgba(0, 0, 0, ${theme.dark ? 0.5 : 0.22})`);
  shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.1, 0, TAU);
  ctx.fill();
  ctx.restore();

  // 1. Front rim (only the half facing the viewer, angles 0…π, is visible). Lit from the left,
  //    like a spreadsheet 3-D pie: a deeper shade of the slice colour, darkening to the right,
  //    with a lighter band just under the top edge where the bevel catches the light.
  const rimPath = (a: number, b: number) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, a, b);
    ctx.lineTo(cx + rx * Math.cos(b), cy + ry * Math.sin(b) + depth);
    ctx.ellipse(cx, cy + depth, rx, ry, 0, b, a, true);
    ctx.closePath();
  };
  arcs.forEach((arc, i) => {
    for (const [a, b] of visibleFront(arc.start, arc.end)) {
      const color = slices[i].color;
      const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      g.addColorStop(0, shade(color, -0.42));
      g.addColorStop(0.08, shade(color, -0.3));
      g.addColorStop(0.35, shade(color, -0.32));
      g.addColorStop(0.7, shade(color, -0.5));
      g.addColorStop(1, shade(color, -0.68));
      rimPath(a, b);
      ctx.fillStyle = g;
      ctx.fill();
    }
  });
  // Vertical light: brighter under the top edge (bevel), darker towards the bottom
  rimPath(0, Math.PI);
  ctx.save();
  ctx.clip();
  // Thin copies of the rim's top curve stacked down its height, so the shading follows the curve
  const steps = 48;
  for (let k = 0; k < steps; k++) {
    const t = k / (steps - 1);
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth * t, rx, ry, 0, 0, Math.PI);
    ctx.lineWidth = depth / steps + 0.6;
    ctx.strokeStyle = t < 0.3 ? `rgba(255, 255, 255, ${0.06 * (1 - t / 0.3)})` : `rgba(0, 0, 0, ${0.07 * ((t - 0.3) / 0.7)})`;
    ctx.stroke();
  }
  ctx.restore();

  // 2. Top face wedges: flat, solid slice colours
  arcs.forEach((arc, i) => {
    ctx.beginPath();
    if (arc.end - arc.start >= TAU - 1e-6) {
      // A single 100% slice is the whole ellipse (a 2π arc from the centre can render as nothing)
      ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    } else {
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, arc.start, arc.end);
      ctx.closePath();
    }
    ctx.fillStyle = slices[i].color;
    ctx.fill();
  });
  // Rounded bevel where the top face turns into the rim: a soft light lip along the front edge
  // in each slice's own colour, then a fine highlight on the very edge
  arcs.forEach((arc, i) => {
    for (const [a, b] of visibleFront(arc.start, arc.end)) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx - 2, ry - 2, 0, a, b);
      ctx.strokeStyle = shade(slices[i].color, 0.2);
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 0.5, ry - 0.5, 0, 0.02, Math.PI - 0.02);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Back edge of the top face: a faint darker line so the disc's outline reads all round
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 0.5, ry - 0.5, 0, Math.PI, TAU);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.stroke();
  // Slices meet edge to edge (no white gaps), just a hairline so neighbours stay distinct
  if (arcs.length > 1) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 0.75;
    arcs.forEach((arc) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + rx * Math.cos(arc.start), cy + ry * Math.sin(arc.start));
      ctx.stroke();
      if (Math.sin(arc.start) > 0) {
        // carry the seam down the rim
        const x = cx + rx * Math.cos(arc.start);
        const y = cy + ry * Math.sin(arc.start);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + depth);
        ctx.stroke();
      }
    });
  }

  // 3. Labels: name (bold) over percentage, in the slice colour, just outside the disc
  type Label = { x: number; y: number; align: CanvasTextAlign; slice: Pie3dSlice };
  const labels: Label[] = arcs.map((arc, i) => {
    const mid = (arc.start + arc.end) / 2;
    const cos = Math.cos(mid);
    const sin = Math.sin(mid);
    const x = cx + (rx + 10) * cos;
    const y = cy + (ry + 14) * sin + (sin > 0 ? depth + 8 * sin : 0);
    const align: CanvasTextAlign = cos > 0.25 ? 'left' : cos < -0.25 ? 'right' : 'center';
    return { x, y, align, slice: slices[i] };
  });
  spreadLabels(labels, height);

  const textColor = (c: string) => (theme.dark ? shade(c, 0.35) : shade(c, -0.08));
  ctx.textBaseline = 'middle';
  for (const l of labels) {
    ctx.textAlign = l.align;
    ctx.fillStyle = textColor(l.slice.color);
    ctx.font = `700 12px ${theme.fontFamily}`;
    ctx.fillText(l.slice.label, l.x, l.y - 7);
    ctx.font = `700 11px ${theme.fontFamily}`;
    ctx.fillText(l.slice.percentText, l.x, l.y + 8);
  }

  return { cx, cy, rx, ry, arcs };
}

/** Index of the slice under (x, y) on the top face or front rim, or -1 */
export function hitPie3d(geo: Pie3dGeometry, x: number, y: number): number {
  const depth = geo.rx * DEPTH;
  const inside = (dy: number) => ((x - geo.cx) / geo.rx) ** 2 + ((y - dy) / geo.ry) ** 2 <= 1;
  let py = y;
  if (!inside(geo.cy)) {
    // On the rim: map back up to the top-face edge point above it
    if (!(inside(geo.cy + depth) && y > geo.cy)) return -1;
    py = geo.cy + geo.ry * Math.sqrt(Math.max(0, 1 - ((x - geo.cx) / geo.rx) ** 2)) - 0.5;
  }
  let a = Math.atan2((py - geo.cy) / geo.ry, (x - geo.cx) / geo.rx);
  while (a < START) a += TAU;
  return geo.arcs.findIndex((arc) => a >= arc.start && a < arc.end);
}

/** Parts of [start, end] (any winding) that lie on the front half, angles (0, π) mod 2π */
function visibleFront(start: number, end: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = -1; k <= 1; k++) {
    const lo = Math.max(start, k * TAU);
    const hi = Math.min(end, k * TAU + Math.PI);
    if (hi > lo) out.push([lo, hi]);
  }
  return out;
}

/** Keeps labels on each side at least LINE apart vertically, within the canvas */
function spreadLabels(labels: { x: number; y: number; align: CanvasTextAlign }[], height: number): void {
  const LINE = 30;
  for (const side of ['left', 'right', 'center'] as CanvasTextAlign[]) {
    const group = labels.filter((l) => l.align === side).sort((a, b) => a.y - b.y);
    for (let i = 1; i < group.length; i++) {
      if (group[i].y - group[i - 1].y < LINE) group[i].y = group[i - 1].y + LINE;
    }
    const overflow = (group.at(-1)?.y ?? 0) - (height - 16);
    if (overflow > 0) group.forEach((l) => (l.y -= overflow));
    group.forEach((l) => (l.y = Math.max(16, l.y)));
  }
}

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}
