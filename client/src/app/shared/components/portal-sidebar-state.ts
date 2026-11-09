import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

/** Each portal owns its sidebar state; desktop and mobile keep separate preferences. */
@Injectable()
export class PortalSidebarState {
  private readonly document = inject(DOCUMENT);
  private readonly desktopQuery = this.document.defaultView!.matchMedia('(min-width: 640px)');
  private readonly isDesktop = signal(this.desktopQuery.matches);
  private readonly desktopOpen = signal(true);
  private readonly mobileOpen = signal(false);

  readonly isOpen = computed(() => this.isDesktop() ? this.desktopOpen() : this.mobileOpen());

  constructor() {
    const onResize = (event: MediaQueryListEvent) => {
      this.mobileOpen.set(false);
      this.isDesktop.set(event.matches);
    };
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !this.isDesktop() && this.mobileOpen()) {
        this.closeMobile();
        this.document.querySelector<HTMLButtonElement>('[aria-controls="portal-sidebar"]')?.focus();
      }
    };
    this.desktopQuery.addEventListener('change', onResize);
    this.document.addEventListener('keydown', onKeydown);
    inject(DestroyRef).onDestroy(() => {
      this.desktopQuery.removeEventListener('change', onResize);
      this.document.removeEventListener('keydown', onKeydown);
    });
  }

  toggle() {
    const state = this.isDesktop() ? this.desktopOpen : this.mobileOpen;
    state.update((open) => !open);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }
}
