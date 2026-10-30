/**
 * Styled tooltip bubble shared by the appTooltip directive and the app-wide `title` replacement.
 * Styles live in styles.css (.app-tooltip).
 *
 * The bubble is appended to <body> with fixed positioning, so table/scroll containers with
 * overflow hidden can't clip it. It sits above the element, or below when there is no room.
 */
export function showTooltip(el: HTMLElement, text: string): HTMLElement {
  const bubble = document.createElement('div');
  bubble.className = 'app-tooltip';
  bubble.setAttribute('role', 'tooltip');
  bubble.textContent = text;
  document.body.appendChild(bubble);

  const gap = 8;
  const r = el.getBoundingClientRect();
  const b = bubble.getBoundingClientRect();
  const below = r.top - b.height - gap < 0;
  const top = below ? r.bottom + gap : r.top - b.height - gap;
  const left = Math.min(
    Math.max(8, r.left + r.width / 2 - b.width / 2),
    window.innerWidth - b.width - 8,
  );
  bubble.style.top = `${top}px`;
  bubble.style.left = `${left}px`;
  // Point the arrow at the element's centre even when the bubble is shifted to stay on screen
  bubble.style.setProperty('--arrow-x', `${r.left + r.width / 2 - left}px`);
  bubble.classList.add(below ? 'app-tooltip--below' : 'app-tooltip--above');
  requestAnimationFrame(() => bubble.classList.add('app-tooltip--visible'));
  return bubble;
}

/**
 * Replaces the browser's plain `title` popup everywhere in the app with the styled bubble, so every
 * icon button ("Edit", "Delete", "Download", …) gets the same tooltip without touching templates.
 *
 * On first hover/focus an element's `title` is moved to `data-tooltip` (which stops the native
 * popup); when Angular later rebinds `[title]`, the next hover moves the new value over again.
 * Icon-only elements also get the text as their aria-label so screen readers keep the name.
 * Called once from the root App component.
 */
export function installGlobalTooltips(): void {
  let current: HTMLElement | null = null;
  let bubble: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const hide = () => {
    clearTimeout(timer);
    bubble?.remove();
    bubble = null;
    current = null;
  };

  const tooltipTarget = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    const el = target.closest<HTMLElement>('[title], [data-tooltip]');
    // A PDF preview <iframe> covers a whole panel; a bubble over it would just get in the way
    if (!el || el.tagName === 'IFRAME') return null;

    const title = el.getAttribute('title');
    if (title !== null) {
      el.setAttribute('data-tooltip', title);
      el.removeAttribute('title');
      if (title && !el.hasAttribute('aria-label') && !el.textContent?.trim()) {
        el.setAttribute('aria-label', title);
      }
    }
    return el;
  };

  const show = (event: Event) => {
    const el = tooltipTarget(event.target);
    if (el === current) return;
    hide();
    const text = el?.getAttribute('data-tooltip')?.trim();
    if (!el || !text) return;
    current = el;
    // Short delay so sweeping the pointer across a row of buttons doesn't flash every tooltip
    timer = setTimeout(() => {
      if (current === el && el.isConnected) bubble = showTooltip(el, text);
    }, 150);
  };

  const leave = (event: Event) => {
    const next = (event as MouseEvent | FocusEvent).relatedTarget;
    if (current && !(next instanceof Node && current.contains(next))) hide();
  };

  document.addEventListener('mouseover', show, true);
  document.addEventListener('focusin', show, true);
  document.addEventListener('mouseout', leave, true);
  document.addEventListener('focusout', leave, true);
  // Anything that moves or replaces the element takes the bubble away with it
  document.addEventListener('mousedown', hide, true);
  document.addEventListener('keydown', hide, true);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}
