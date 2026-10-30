import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { drawPie3d, hitPie3d, Pie3dGeometry, Pie3dSlice, PIE_3D_COLORS } from './pie-3d';

export interface Pie3dItem {
  /** Full name; the label beside the slice is the surname, the tooltip shows this */
  name: string;
  value: number;
  /** Printed percentage, e.g. "15" or "15%"; computed from the values when omitted */
  percentage?: string | number;
}

/**
 * Isometric ("3-D") pie chart, styled like a spreadsheet 3-D pie: tilted disc with a shaded rim
 * and each slice labelled outside with its name and percentage. Fills its container (give the
 * container a height), redraws on resize and when the app's dark mode is toggled, and shows the
 * full name and share on hover.
 *
 *   <div class="h-64"><app-pie-3d-chart [items]="items" /></div>
 */
@Component({
  selector: 'app-pie-3d-chart',
  standalone: true,
  template: `
    <div class="relative w-full h-full">
      <canvas
        #canvas
        class="block w-full h-full"
        (mousemove)="onMove($event)"
        (mouseleave)="hideTip()"
      ></canvas>
      @if (!items.length) {
        <p class="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
          No data yet
        </p>
      }
    </div>
  `,
  host: { class: 'block w-full h-full' },
})
export class Pie3dChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: Pie3dItem[] = [];

  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private slices: Pie3dSlice[] = [];
  private geometry: Pie3dGeometry | null = null;
  private resizeObserver?: ResizeObserver;
  private themeObserver?: MutationObserver;
  private tip: HTMLElement | null = null;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef!.nativeElement;
    this.resizeObserver = new ResizeObserver(() => this.draw());
    this.resizeObserver.observe(canvas);
    this.themeObserver = new MutationObserver(() => this.draw());
    this.themeObserver.observe(document.documentElement, { attributeFilter: ['class'] });
    this.draw();
  }

  ngOnChanges(): void {
    this.slices = toPie3dSlices(this.items);
    this.draw();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.hideTip();
  }

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.geometry = drawPie3d(ctx, width, height, this.slices, {
      dark: document.documentElement.classList.contains('dark'),
      fontFamily: getComputedStyle(canvas).fontFamily || 'sans-serif',
    });
  }

  onMove(event: MouseEvent): void {
    const canvas = this.canvasRef!.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const index = this.geometry ? hitPie3d(this.geometry, event.clientX - rect.left, event.clientY - rect.top) : -1;
    canvas.style.cursor = index >= 0 ? 'pointer' : '';
    if (index < 0) return this.hideTip();

    const slice = this.slices[index];
    const item = this.items[index];
    if (!this.tip) {
      // Same styled bubble as the app-wide tooltips (styles.css .app-tooltip)
      this.tip = document.createElement('div');
      this.tip.className = 'app-tooltip app-tooltip--above app-tooltip--visible';
      this.tip.setAttribute('role', 'tooltip');
      document.body.appendChild(this.tip);
    }
    this.tip.textContent = `${slice.title}: ${item.value} (${slice.percentText})`;
    const b = this.tip.getBoundingClientRect();
    const left = Math.min(Math.max(8, event.clientX - b.width / 2), window.innerWidth - b.width - 8);
    this.tip.style.left = `${left}px`;
    this.tip.style.top = `${event.clientY - b.height - 12}px`;
    this.tip.style.setProperty('--arrow-x', `${event.clientX - left}px`);
  }

  hideTip(): void {
    this.tip?.remove();
    this.tip = null;
  }
}

/** "Mary A. Garcia Jr." → "Garcia" (the sample chart labels slices by surname) */
function surname(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  while (parts.length > 1 && /^(jr|sr|ii|iii|iv|v)\.?$/i.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1] || name;
}

/** Shared conversion keeps printed labels and percentages identical to the dashboard. */
export function toPie3dSlices(items: Pie3dItem[]): Pie3dSlice[] {
    const total = items.reduce((sum, i) => sum + Math.max(0, i.value), 0) || 1;
    return items.map((item, i) => {
      const pct =
        item.percentage !== undefined && item.percentage !== ''
          ? String(item.percentage).replace(/%$/, '')
          : String(Math.round((Math.max(0, item.value) / total) * 100));
      return {
        label: surname(item.name),
        title: item.name,
        value: item.value,
        percentText: `${pct}%`,
        color: PIE_3D_COLORS[i % PIE_3D_COLORS.length],
      };
    });
}
