import { Directive, ElementRef, HostListener, Input, OnDestroy } from '@angular/core';
import { showTooltip } from '../utils/tooltip.util';

/**
 * Styled hover tooltip with options a plain `title` doesn't have (plain `title` attributes are
 * already styled app-wide by installGlobalTooltips()).
 *
 *   <span appTooltip="Full text">…</span>
 *   <span class="truncate" [appTooltip]="name" tooltipWhenTruncated>{{ name }}</span>
 *
 * With `tooltipWhenTruncated` it only appears when the element's text is cut off.
 */
@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') text: string | null | undefined = '';
  @Input() tooltipWhenTruncated: boolean | '' = false;

  private bubble: HTMLElement | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('mouseenter')
  @HostListener('focusin')
  show(): void {
    const el = this.host.nativeElement;
    if (!this.text || this.bubble) return;
    if (this.tooltipWhenTruncated !== false && el.scrollWidth <= el.clientWidth) return;
    this.bubble = showTooltip(el, this.text);
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  @HostListener('window:scroll')
  hide(): void {
    this.bubble?.remove();
    this.bubble = null;
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
