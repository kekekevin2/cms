# Client responsive design, 375px and up

## Goal

Every page, modal, and shared UI element in `client/` renders correctly and
usably at viewport widths from 375px up (iPhone SE/mini-class phones),
scaling smoothly through tablet and desktop breakpoints, using Tailwind's
mobile-first responsive utilities on each component instead of the current
global CSS overrides.

## Current state

- `src/styles.css` imports `src/styles/responsive.css` globally. That file
  (375 lines) retrofits responsiveness with blanket `!important` rules keyed
  to Tailwind class *names* — e.g. `.grid { grid-template-columns: 1fr
  !important }`, `.ml-64 { margin-left: 240px !important }`, `aside { width:
  100% !important; max-width: 280px }`. These apply to every element that
  happens to carry that class, regardless of the element's actual layout
  intent, and they fight the component's own Tailwind classes rather than
  cooperating with them.
- Concretely: `layout.component.ts`'s sidebar already implements a correct
  slide-in pattern (`w-64 -translate-x-full sm:translate-x-0`), which the
  global CSS then stomps on with a conflicting `width`/`max-width` override.
- Breakpoints are coarse — a single `max-width: 767px` bucket covers both a
  375px phone and a 750px small tablet identically. Nothing specifically
  targets or has been verified at 375px.
- Scope: ~50 feature components across 6 portals (superadmin,
  dean/college-department, faculty, organization, admin), a shared layout
  shell (`layout.component.ts`, 486 lines: sidebar + topbar), and a small
  number of modal-pattern components (`change-password-modal.ts`, plus
  inline modals inside `faculty.ts` dashboard and `report-submission.ts`).

## Approach

### 1. Shared shell first

Fix, in this order, since every page depends on them:
- `layout.component.ts` (sidebar + topbar + content offset)
- `change-password-modal.ts`
- Inline modals in `dashboards/faculty/faculty.ts` and
  `faculty/report-submission/report-submission.ts`
- Any other shared component under `src/app/shared/components/`

Each gets mobile-first Tailwind classes verified against a 375px viewport:
no horizontal scroll, no clipped content, tap targets effectively ≥44px,
text readable without zooming, modals fit within the viewport with internal
scroll rather than overflowing it.

### 2. Sweep by portal

Order: faculty → organization → dean/college-department → admin →
superadmin (roughly simplest to most complex, so early portals validate the
pattern before the largest ones).

Per page component, apply mobile-first Tailwind conventions:
- Grids: base `grid-cols-1`, scale up via `sm:`/`md:`/`lg:` instead of fixed
  `grid-cols-3`/`grid-cols-4`.
- Tables: wrap in a horizontally-scrollable container scoped to the table
  (`overflow-x-auto` on a wrapper div), not a whole-page scroll; consider a
  stacked-card fallback only where a table is unusually dense and scrolling
  alone would be poor.
- Forms/buttons/dropdowns: full-width or stacked on narrow viewports,
  side-by-side once there's room; no fixed pixel widths that exceed 375px.
- Any remaining hardcoded pixel widths (`w-[Npx]`, inline `width: Npx`)
  become responsive/fluid equivalents (`w-full`, `max-w-*`, percentage, or a
  responsive Tailwind width scale).

### 3. Global CSS cleanup

From `responsive.css`, remove the layout-forcing rules that per-component
classes now own: the `.grid`, `.ml-64`, `aside`, `.p-4`/`.p-6`,
mobile-modal-margin (`.fixed.inset-0 > div`), and dropdown-position
(`.absolute.right-0`) overrides, across all three of its breakpoint blocks
(mobile/tablet/desktop/large-desktop).

Keep, unchanged, the rules that are legitimately global and not part of the
layout-forcing problem: iOS input-zoom fix (`font-size: 16px !important` on
inputs under 767px), safe-area insets, `prefers-reduced-motion`, print
styles, `focus-visible` outline, and the touch-target-sizing media query
(`hover: none` and `pointer: coarse`).

### 4. Verification

This is a static code read-through — no running app/browser session for
this pass. Verification is by inspecting each template against Tailwind's
breakpoint semantics (unprefixed = 375px+ baseline, `sm:` = 640px, `md:` =
768px, `lg:` = 1024px) and checking for the failure patterns above (fixed
widths wider than 375px, non-wrapped tables, unstacked flex/grid rows,
undersized tap targets). Anything that genuinely needs eyes-on browser
confirmation (visual overlap, font rendering, exact spacing) gets flagged
explicitly rather than asserted as fixed.

## Out of scope

- Running the dev server / visually testing in a browser (explicitly
  deferred per user's choice of static-only review for this pass).
- Non-responsive bugs, accessibility issues, or design/UX inconsistencies
  unrelated to viewport width — noted separately if encountered, not fixed
  as part of this effort.
- The `pds/` locator tool and PDF generator (unrelated, print/PDF layout,
  not a responsive-web-viewport concern).
