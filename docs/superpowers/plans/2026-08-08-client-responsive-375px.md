# Client Responsive (375px+) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page, modal, and shared UI shell in `client/` renders correctly and usably at viewport widths from 375px up, using per-component mobile-first Tailwind classes instead of the current global `!important` CSS overrides.

**Architecture:** Angular 20 standalone components, Tailwind v4 (`@import 'tailwindcss'` in `src/styles.css`, no `tailwind.config.js` — breakpoints are Tailwind defaults: `sm`=640px, `md`=768px, `lg`=1024px, `xl`=1280px). No component-level unit tests exist for these files and none will be added — verification is manual/visual per the design spec (static review, this session; browser confirmation is the user's own follow-up).

**Tech Stack:** Angular 20, Tailwind v4, TypeScript, no build step beyond `ng build`/`ng serve`.

## Global Constraints

- Do not touch `pds/`, `backend/`, or anything outside `client/` — out of scope per spec.
- Do not add automated tests — this codebase has no meaningful component test suite (`ng test` runs Karma/Jasmine with only the generated `app.spec.ts`), and the spec's verification method is static code review, not test-driven.
- Keep every non-layout global rule in `src/styles/responsive.css` untouched: iOS input-zoom fix, safe-area insets, `prefers-reduced-motion`, print styles, `focus-visible` outline, touch-target sizing (`hover: none` block).
- Baseline breakpoint is unprefixed Tailwind classes = 375px+ (mobile-first). Only add `sm:`/`md:`/`lg:` prefixes to scale *up* from that baseline — never introduce a `max-width` media query or a new breakpoint below 375px.
- After each task, run `npx tsc --noEmit -p tsconfig.json` from `client/` to confirm no template/type errors were introduced (Angular's `--noEmit` check catches most inline-template typos too, since templates are inline strings type-checked by the Angular compiler plugin — but if a task only touches an external `.html` file, also run `npx ng build --configuration development` once at the end of that task to catch template compile errors `tsc` alone won't see).

## Reference: the broken sidebar pattern (read before Task 2)

`dean.html`, `organization.html`, `college-department.html`, `superadmin.html`, and `dashboards/faculty/faculty.ts` (inline template) each independently copy-paste the same sidebar/topbar shell (they do **not** use the shared `app-layout` component — only `admin.html` does, via `<app-layout>`). In all five, the component class defaults to:

```ts
isSidebarOpen = signal(true);
```

and the template drives visibility purely off that signal with no responsive (`sm:`) override:

```html
<aside
  [class.translate-x-0]="isSidebarOpen()"
  [class.-translate-x-full]="!isSidebarOpen()"
  class="fixed top-0 left-0 z-50 w-64 h-full transition-transform bg-white border-r border-gray-200"
>
```
```html
<div
  class="fixed top-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 gap-4 transition-all duration-300"
  [class.left-64]="isSidebarOpen()"
  [class.left-0]="!isSidebarOpen()"
  [class.right-0]="true"
>
```
```html
<div class="pt-20 pl-4 pr-4 pb-4 transition-all duration-300" [class.ml-64]="isSidebarOpen()">
```

Because `isSidebarOpen` defaults to `true` and there is no `sm:` breakpoint anywhere in this markup, on a fresh 375px load the 256px (`w-64`) sidebar is always open **and** the topbar/content are always pushed right by `left-64`/`ml-64` — leaving roughly 375 − 256 = 119px (minus padding) for actual content. This is the highest-severity 375px bug in the app and Tasks 2–3 below fix it identically across all five shells.

The fix pattern (applied per-file in Task 2):
1. Default the signal to `false` instead of `true` — sidebar starts closed on first load (matches how a mobile drawer should behave; on `sm:`+ it will be forced visible by CSS regardless of the signal, so desktop users still always see it).
2. Add `sm:translate-x-0` to the `<aside>` class so it's always visible ≥640px regardless of the signal.
3. Replace the `[class.left-64]`/`[class.left-0]` bindings on the topbar with static `left-0 sm:left-64` classes (topbar always sits right of the sidebar on `sm:`+, and starts flush-left under 640px since the sidebar is an overlay there).
4. Replace `[class.ml-64]="isSidebarOpen()"` on the main-content div with a static `sm:ml-64` class (content is always offset ≥640px, never offset under 640px since the sidebar overlays rather than pushes there).
5. Add a mobile-only backdrop that closes the sidebar on click, shown only when open and only under `sm:`:
   ```html
   @if (isSidebarOpen()) {
     <div class="fixed inset-0 z-30 bg-black/50 sm:hidden" (click)="toggleSidebar()"></div>
   }
   ```
   Placed immediately after the `</aside>` closing tag.

---

### Task 1: Remove layout-forcing rules from the global responsive.css

**Files:**
- Modify: `client/src/styles/responsive.css`

**Interfaces:** None (pure CSS file, no component interface).

- [ ] **Step 1: Remove the mobile-breakpoint layout-forcing rules**

In the `@media (max-width: 767px)` block, delete these rule sets entirely (they conflict with per-component responsive classes added in later tasks): the `aside` rule, the `.fixed.top-0` rule, the `.pt-20` rule, the `.hidden.sm\\:inline` rule, the `.grid` rule, the `button:not(.inline-button)` rule, the `.p-4`/`.p-6` rules, the `.fixed.inset-0 > div` rule, the `.absolute.right-0` rule, and the `.gap-4`/`.gap-6` rules.

Keep, unchanged, within that same block: the `html, body { overflow-x: hidden; ... }` rule at the top of the file, the `* { box-sizing: border-box; }` rule, the `table` rule (tables becoming horizontally scrollable is still a reasonable global default), `h1`/`h2`/`h3` font-size rules, `canvas`, `img`, `.flex { flex-wrap: wrap; }` is borderline — **remove it too**, since forcing every flex container to wrap is exactly the kind of blanket rule Task 6+ replaces with per-component `flex-wrap` decisions.

- [ ] **Step 2: Remove the tablet-breakpoint layout-forcing rules**

In the `@media (min-width: 768px) and (max-width: 1023px)` block, delete: the `aside` rule, the `.ml-64` rule, the `.grid.md\\:grid-cols-2` rule, and the `.grid.md\\:grid-cols-3` rule. Keep the `table` rule and the `h1`/`h2` font-size rules.

- [ ] **Step 3: Remove the desktop-breakpoint layout-forcing rules**

In the `@media (min-width: 1024px)` block, delete: the `aside` rule, the `.ml-64` rule, the `.grid.lg\\:grid-cols-3` rule, and the `.grid.lg\\:grid-cols-4` rule. This empties the block; delete the now-empty `@media (min-width: 1024px) { }` block entirely.

- [ ] **Step 4: Verify the file still parses and the app still builds**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds with no CSS or template errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/styles/responsive.css
git commit -m "fix(client): remove global !important layout overrides from responsive.css

Per-component Tailwind responsive classes now own grid/sidebar/spacing
layout; the blanket overrides fought them and used coarse breakpoints
that didn't distinguish a 375px phone from a 750px tablet."
```

---

### Task 2: Fix the mobile sidebar overlay pattern in the five duplicated dashboard shells

**Files:**
- Modify: `client/src/app/features/dashboards/dean/dean.html`
- Modify: `client/src/app/features/dashboards/dean/dean.ts`
- Modify: `client/src/app/features/dashboards/organization/organization.html`
- Modify: `client/src/app/features/dashboards/organization/organization.ts`
- Modify: `client/src/app/features/dashboards/college-department/college-department.html`
- Modify: `client/src/app/features/dashboards/college-department/college-department.ts`
- Modify: `client/src/app/features/dashboards/superadmin/superadmin.html`
- Modify: `client/src/app/features/dashboards/superadmin/superadmin.ts`
- Modify: `client/src/app/features/dashboards/faculty/faculty.ts` (inline template)

**Interfaces:** None — each component keeps its own `isSidebarOpen`/`toggleSidebar()`, only the default value and template classes change.

- [ ] **Step 1: Fix `dean.html` + `dean.ts`**

In `dean.ts`, change:
```ts
  isSidebarOpen = signal(true);
```
to:
```ts
  isSidebarOpen = signal(false);
```

In `dean.html`, change the aside class (around line 5):
```html
  class="fixed top-0 left-0 z-50 w-64 h-full transition-transform bg-white border-r border-gray-200"
```
to:
```html
  class="fixed top-0 left-0 z-50 w-64 h-full transition-transform sm:translate-x-0 bg-white border-r border-gray-200"
```

Immediately after the `</aside>` closing tag (around line 123), add:
```html
@if (isSidebarOpen()) {
  <div class="fixed inset-0 z-30 bg-black/50 sm:hidden" (click)="toggleSidebar()"></div>
}
```

Change the topbar div (around lines 126-131) from:
```html
<div
  class="fixed top-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 gap-4 transition-all duration-300"
  [class.left-64]="isSidebarOpen()"
  [class.left-0]="!isSidebarOpen()"
  [class.right-0]="true"
>
```
to:
```html
<div
  class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 gap-4 transition-all duration-300 sm:left-64"
>
```

Change the main content div (around line 201) from:
```html
<div class="pt-20 pl-4 pr-4 pb-4 transition-all duration-300" [class.ml-64]="isSidebarOpen()">
```
to:
```html
<div class="pt-20 pl-4 pr-4 pb-4 transition-all duration-300 sm:ml-64">
```

- [ ] **Step 2: Fix `organization.html` + `organization.ts`**

Apply the exact same five edits as Step 1, in `organization.ts` (the `isSidebarOpen = signal(true)` at line 54) and `organization.html` (aside class at line 5, backdrop insertion after `</aside>`, topbar div at lines 126-131-equivalent, main content div at line 144).

- [ ] **Step 3: Fix `college-department.html` + `college-department.ts`**

Apply the exact same five edits, in `college-department.ts` (`isSidebarOpen = signal(true)` at line 41) and `college-department.html` (aside class at line 5, backdrop after `</aside>`, topbar div, main content div at line 110).

- [ ] **Step 4: Fix `superadmin.html` + `superadmin.ts`**

Apply the exact same five edits, in `superadmin.ts` (`isSidebarOpen = signal(true)` at line 35) and `superadmin.html` (aside class at line 5, backdrop after `</aside>`, topbar div, main content div at line 189).

- [ ] **Step 5: Fix `faculty.ts` (inline template)**

Change (around line 521):
```ts
  isSidebarOpen = signal(true);
```
to:
```ts
  isSidebarOpen = signal(false);
```

Change the aside class (line 38) from:
```
class="fixed top-0 left-0 z-50 w-64 h-full transition-transform bg-white border-r border-gray-200"
```
to:
```
class="fixed top-0 left-0 z-50 w-64 h-full transition-transform sm:translate-x-0 bg-white border-r border-gray-200"
```

Immediately after the `</aside>` closing tag (line 106), add:
```html
      @if (isSidebarOpen()) {
        <div class="fixed inset-0 z-30 bg-black/50 sm:hidden" (click)="toggleSidebar()"></div>
      }
```

Change the topbar div (lines 109-114) from:
```html
    <div
      class="fixed top-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 gap-4 transition-all duration-300"
      [class.left-64]="isSidebarOpen()"
      [class.left-0]="!isSidebarOpen()"
      [class.right-0]="true"
    >
```
to:
```html
    <div
      class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 gap-4 transition-all duration-300 sm:left-64"
    >
```

Change the main content div (line 180) from:
```html
    <div class="pt-20 pl-4 pr-4 pb-4 transition-all duration-300" [class.ml-64]="isSidebarOpen()">
```
to:
```html
    <div class="pt-20 pl-4 pr-4 pb-4 transition-all duration-300 sm:ml-64">
```

- [ ] **Step 6: Verify no leftover `[class.left-64]`, `[class.left-0]`, or `[class.ml-64]` bindings remain**

Run from `client/`:
```bash
grep -rn "class.left-64\|class.ml-64\]=\"isSidebarOpen" src/app/features/dashboards/dean/ src/app/features/dashboards/organization/ src/app/features/dashboards/college-department/ src/app/features/dashboards/superadmin/ src/app/features/dashboards/faculty/faculty.ts
```
Expected: no output (all matches removed).

- [ ] **Step 7: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add client/src/app/features/dashboards/dean/dean.html client/src/app/features/dashboards/dean/dean.ts \
        client/src/app/features/dashboards/organization/organization.html client/src/app/features/dashboards/organization/organization.ts \
        client/src/app/features/dashboards/college-department/college-department.html client/src/app/features/dashboards/college-department/college-department.ts \
        client/src/app/features/dashboards/superadmin/superadmin.html client/src/app/features/dashboards/superadmin/superadmin.ts \
        client/src/app/features/dashboards/faculty/faculty.ts
git commit -m "fix(client): sidebar starts closed and stays overlay-only under 640px

isSidebarOpen defaulted to true with no sm: breakpoint, so a 375px phone
loaded with the 256px sidebar permanently open and content squeezed into
~119px via ml-64/left-64. Sidebar now defaults closed on mobile, is
forced visible only at sm:+ via sm:translate-x-0/sm:left-64/sm:ml-64, and
gets a tap-to-close backdrop when open on mobile."
```

---

### Task 3: Add mobile backdrop + auto-close to the shared `app-layout` component (admin portal)

**Files:**
- Modify: `client/src/app/shared/components/layout.component.ts`

**Interfaces:** None — internal template/behavior change only, `@Output() tabChange` signature unchanged.

`layout.component.ts` already has the correct `sm:translate-x-0` responsive class and `sm:ml-64` on its content div (it doesn't have the Task 2 bug), but it has no backdrop and nothing closes the sidebar after a nav link is tapped on mobile, so a user can open it, tap a link, and the drawer stays open covering the page underneath until they tap the hamburger again.

- [ ] **Step 1: Add a mobile backdrop after the `</aside>` tag**

Find (around line 449):
```html
    </aside>

    <!-- Main Content -->
```
Replace with:
```html
    </aside>

    @if (isSidebarOpen()) {
      <div class="fixed inset-0 z-30 bg-black/50 sm:hidden" (click)="toggleSidebar()"></div>
    }

    <!-- Main Content -->
```

- [ ] **Step 2: Auto-close the sidebar when a nav link is tapped (non-admin branch)**

The non-admin branch (`@else` block, the `routerLink` items around lines 350-395) doesn't close the sidebar on navigation. Find the dashboard link:
```html
            <li>
              <a
                [routerLink]="['/' + authService.currentUser()?.role + '/dashboard']"
                routerLinkActive="bg-green-50 text-green-600"
                class="flex items-center px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
              >
```
Add `(click)="isSidebarOpen.set(false)"`:
```html
            <li>
              <a
                [routerLink]="['/' + authService.currentUser()?.role + '/dashboard']"
                routerLinkActive="bg-green-50 text-green-600"
                (click)="isSidebarOpen.set(false)"
                class="flex items-center px-2 py-1.5 text-gray-700 rounded-lg hover:bg-gray-100 group"
              >
```
Apply the same `(click)="isSidebarOpen.set(false)"` addition to the three `faculty`-role `<a routerLink=...>` items below it (Accomplishments, Announcements, Personal Data Sheet).

The admin branch uses `(click)="selectTab(...)"` buttons instead of router links (it stays on one page and swaps tab content) — leave those as-is; closing the drawer there isn't necessary since the content update happens instantly on the same page.

- [ ] **Step 3: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/app/shared/components/layout.component.ts
git commit -m "fix(client): close mobile sidebar drawer on backdrop tap or nav

The shared app-layout sidebar (used by the admin portal) had no way to
close on mobile except re-tapping the hamburger, so it stayed open over
page content after navigating."
```

---

### Task 4: Fix `change-password-modal.ts` for 375px

**Files:**
- Modify: `client/src/app/shared/components/change-password-modal/change-password-modal.ts`

**Interfaces:** None — `@Output() close` unchanged.

This modal is already close to correct at 375px (`max-w-md mx-4 p-6`, full-width inputs). Two gaps: no height cap for short viewports (a phone with the on-screen keyboard open has very little vertical space, and the modal's `<div class="fixed inset-0 ... items-center ...">` wrapper will simply overflow the viewport if content is taller than available height), and the two action buttons sit side-by-side unconditionally, which is tight but not broken at 375px — stack them below 375px-adjacent widths for comfortable tap targets.

- [ ] **Step 1: Cap the modal panel height and make it internally scrollable**

Find (around line 16-19):
```html
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        (click)="$event.stopPropagation()"
      >
```
Replace with:
```html
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
```

- [ ] **Step 2: Stack the action buttons on narrow screens**

Find (around line 175):
```html
        <div class="flex justify-end gap-3 mt-6">
```
Replace with:
```html
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
```

Then find the two buttons directly inside that div and add `w-full sm:w-auto` to each. The Cancel button (around line 176-182):
```html
          <button
            (click)="close.emit()"
            type="button"
            class="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
          >
            Cancel
          </button>
```
becomes:
```html
          <button
            (click)="close.emit()"
            type="button"
            class="w-full sm:w-auto px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
          >
            Cancel
          </button>
```
The submit button (around line 183-200), add `w-full sm:w-auto` to its class the same way:
```html
          <button
            (click)="submit()"
            [disabled]="
              submitting() ||
              !oldPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            "
            type="button"
            class="w-full sm:w-auto px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
```

- [ ] **Step 3: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/app/shared/components/change-password-modal/change-password-modal.ts
git commit -m "fix(client): cap change-password modal height and stack its buttons on mobile"
```

---

### Task 5: Fix the two inline modals in `report-submission.ts`

**Files:**
- Modify: `client/src/app/features/faculty/report-submission/report-submission.ts`

**Interfaces:** None.

- [ ] **Step 1: Read the file's full modal sections before editing**

Run: read `client/src/app/features/faculty/report-submission/report-submission.ts` around lines 205-260 (Submit New Report modal, already has `max-h-[90vh] overflow-y-auto` on its panel — check its internal form fields and action buttons for fixed widths or unstacked side-by-side buttons at 375px) and lines 355-400 (Review Comments modal, panel currently has no `max-h`/`overflow-y-auto` at all: `class="bg-white rounded-lg p-6 max-w-lg w-full"`).

- [ ] **Step 2: Add height cap to the Review Comments modal panel**

Find (around line 363):
```html
          <div class="bg-white rounded-lg p-6 max-w-lg w-full">
```
Replace with:
```html
          <div class="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
```

- [ ] **Step 3: Find and stack any side-by-side action button rows in both modals**

Run:
```bash
grep -n "flex justify-end\|flex items-center justify-end" client/src/app/features/faculty/report-submission/report-submission.ts
```
For each match found inside the two modal blocks (lines ~205-260 and ~355-400), apply the same transform as Task 4 Step 2: change the wrapping div to `flex flex-col-reverse sm:flex-row sm:justify-end gap-3`, and add `w-full sm:w-auto` to each direct-child `<button>` inside it.

- [ ] **Step 4: Check the Submit New Report modal's form fields for fixed widths**

Run:
```bash
grep -n "w-\[\|width:" client/src/app/features/faculty/report-submission/report-submission.ts
```
If any match is inside the modal block (lines ~205-260) and specifies a fixed pixel width wider than roughly 300px (i.e. would overflow a 343px-wide modal panel — 375px viewport minus `mx-4` margins), replace it with `w-full` or a `max-w-*` Tailwind class instead of a literal pixel width.

- [ ] **Step 5: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/app/features/faculty/report-submission/report-submission.ts
git commit -m "fix(client): cap report-submission modal heights and stack action buttons on mobile"
```

---

## Responsive Playbook (used by Tasks 6-10)

For every file listed in Tasks 6-10, apply these mechanical transforms wherever the described pattern is found. These are the only patterns to change — do not restyle anything that doesn't match one of these.

**A. Fixed-column grids → mobile-first grids.** Any `grid-cols-N` (N ≥ 2) not already preceded by a smaller responsive step gets a `grid-cols-1` base:
```
Before: class="grid grid-cols-3 gap-4"
After:  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
```
```
Before: class="grid grid-cols-2 md:grid-cols-4 gap-4"
After:  class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
```
If a grid already starts from `grid-cols-1` (no change needed) or is a 2-column grid intentionally fine at 375px (e.g. two small icon-only stat tiles that together are under ~340px), leave it — use judgment, but default to converting.

**B. Tables → horizontally-scrollable, contained.** Any `<table>` not already wrapped in a scroll container gets one:
```
Before: <table class="w-full ...">...</table>
After:  <div class="overflow-x-auto"><table class="w-full min-w-[640px] ...">...</table></div>
```
The `min-w-[640px]` (or whatever width the table's columns realistically need — inspect column count/content) keeps columns from being crushed illegibly; the wrapper's `overflow-x-auto` makes only the table scroll, not the whole page.

**C. Fixed pixel widths → fluid widths.** Any `w-[Npx]` or inline `style="width: Npx"` wider than 343px (a 375px viewport minus typical `p-4`/`mx-4` margins) becomes `w-full` (if it should fill its container) or `max-w-[Npx] w-full` (if it should cap out at N but shrink below that).

**D. Side-by-side action button rows → stack on mobile.** Any `<div class="flex ... justify-end gap-*">` wrapping two or more `<button>`/`<a>` elements that visually act as a form's submit/cancel row:
```
Before: <div class="flex justify-end gap-3">
After:  <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
```
and add `w-full sm:w-auto` to each direct-child button/link.

**E. Unwrapped horizontal filter/toolbar rows → wrap.** Any `<div class="flex items-center gap-*">` holding several filter dropdowns/inputs side by side with no wrap gets `flex-wrap`:
```
Before: class="flex items-center gap-3"
After:  class="flex items-center gap-3 flex-wrap"
```
(Skip this if `flex-wrap` is already present.)

**F. Verification per file.** After editing a file, run:
```bash
grep -n "grid-cols-[2-9]\|w-\[[3-9][0-9][0-9]px\]\|w-\[[0-9]\{4,\}px\]" <file>
```
Any remaining match not already preceded by a smaller `grid-cols-1`/responsive step, or not justified by a comment, means the playbook wasn't fully applied — fix it before moving on.

---

### Task 6: Sweep the Faculty portal for 375px issues

**Files:**
- Modify (as needed): `client/src/app/features/faculty/announcements/announcements.ts`
- Modify (as needed): `client/src/app/features/faculty/credentials/credentials.ts`
- Modify (as needed): `client/src/app/features/faculty/my-profile/my-profile.ts`
- Modify (as needed): `client/src/app/features/faculty/personal-data-sheet/personal-data-sheet.component.ts`
- Modify (as needed): `client/src/app/features/faculty/requirements/requirements.ts`
- Modify (as needed): `client/src/app/features/dashboards/faculty/faculty.ts` (dashboard tab content below the shell fixed in Task 2 — the stat-card grid and any tables/forms within `activeTab() === 'dashboard'`/other tab blocks)

**Interfaces:** None — these are leaf feature components with no cross-task interface dependencies.

- [ ] **Step 1: Audit each file for the five playbook patterns**

For each file in the list, run:
```bash
grep -n "grid-cols-[2-9]\|<table\|w-\[[0-9]\+px\]\|flex justify-end\|flex items-center gap-" <file>
```
Read the matched lines in context (open the file around each match) and classify each against Playbook patterns A-E.

- [ ] **Step 2: Apply the Responsive Playbook transforms**

For every match classified in Step 1, apply the corresponding Playbook transform (A-E) exactly as specified in the Playbook section above.

- [ ] **Step 3: Run the per-file verification grep from Playbook item F on every file in this task**

Confirm no unaddressed matches remain, or that any remaining match is a deliberate exception (leave a one-line comment explaining why, e.g. `<!-- 2-col grid intentional, fits at 375px -->`).

- [ ] **Step 4: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/features/faculty/ client/src/app/features/dashboards/faculty/faculty.ts
git commit -m "fix(client): responsive sweep of Faculty portal pages for 375px"
```

---

### Task 7: Sweep the Organization portal for 375px issues

**Files:**
- Modify (as needed): `client/src/app/features/organization/documents/organization-documents.ts`
- Modify (as needed): `client/src/app/features/organization/events/organization-events.ts`
- Modify (as needed): `client/src/app/features/organization/members/organization-members.ts`
- Modify (as needed): `client/src/app/features/dashboards/organization/organization.html` (tab content below the shell fixed in Task 2)

**Interfaces:** None.

- [ ] **Step 1: Audit each file for the five playbook patterns**

Same grep and classification procedure as Task 6 Step 1, run against this task's file list.

- [ ] **Step 2: Apply the Responsive Playbook transforms**

Same as Task 6 Step 2.

- [ ] **Step 3: Run the per-file verification grep from Playbook item F**

Same as Task 6 Step 3.

- [ ] **Step 4: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/features/organization/ client/src/app/features/dashboards/organization/organization.html
git commit -m "fix(client): responsive sweep of Organization portal pages for 375px"
```

---

### Task 8: Sweep the Dean/College-Department portal for 375px issues

**Files:**
- Modify (as needed): `client/src/app/features/dean/announcements/announcements.ts`
- Modify (as needed): `client/src/app/features/dean/components/dean-sidebar/dean-sidebar.ts`
- Modify (as needed): `client/src/app/features/dean/faculty-credentials-view/faculty-credentials-view.ts`
- Modify (as needed): `client/src/app/features/dean/faculty-management/faculty-management.ts`
- Modify (as needed): `client/src/app/features/dean/faculty-notifications/faculty-notifications.ts`
- Modify (as needed): `client/src/app/features/dean/member-demographics/dean-member-demographics.ts`
- Modify (as needed): `client/src/app/features/dean/my-profile/my-profile.ts`
- Modify (as needed): `client/src/app/features/dean/organization-advisers/dean-organization-advisers.ts`
- Modify (as needed): `client/src/app/features/dean/organization-dashboard/organization-dashboard.ts`
- Modify (as needed): `client/src/app/features/dean/organization-documents/dean-organization-documents.ts`
- Modify (as needed): `client/src/app/features/dean/organization-events/dean-organization-events.ts`
- Modify (as needed): `client/src/app/features/dean/organization-management/organization-management.ts`
- Modify (as needed): `client/src/app/features/dean/personal-data-sheet/personal-data-sheet.component.ts`
- Modify (as needed): `client/src/app/features/dean/requirements-monitoring/requirements-monitoring.ts`
- Modify (as needed): `client/src/app/features/dashboards/dean/dean.html` (tab content below the shell fixed in Task 2)
- Modify (as needed): `client/src/app/features/dashboards/college-department/college-department.html` (tab content below the shell fixed in Task 2)

**Interfaces:** None.

- [ ] **Step 1: Confirm whether `dean-sidebar.ts` is actually used**

Run: `grep -rn "app-dean-sidebar\|DeanSidebar" client/src/app --include="*.ts" --include="*.html"`
If it's only self-referenced (its own `selector:` line and class definition, no usage elsewhere), skip it in Steps 2-3 below and note it as dead code in the commit message instead of editing it.

- [ ] **Step 2: Audit each (in-use) file for the five playbook patterns**

Same grep and classification procedure as Task 6 Step 1, run against this task's file list (minus `dean-sidebar.ts` if Step 1 found it unused).

- [ ] **Step 3: Apply the Responsive Playbook transforms**

Same as Task 6 Step 2.

- [ ] **Step 4: Run the per-file verification grep from Playbook item F**

Same as Task 6 Step 3.

- [ ] **Step 5: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/app/features/dean/ client/src/app/features/dashboards/dean/dean.html client/src/app/features/dashboards/college-department/college-department.html
git commit -m "fix(client): responsive sweep of Dean/College-Department portal pages for 375px"
```

---

### Task 9: Sweep the Admin portal for 375px issues

**Files:**
- Modify (as needed): `client/src/app/features/admin/dean-management/dean-management.ts`
- Modify (as needed): `client/src/app/features/admin/faculty-management/faculty-management.ts`
- Modify (as needed): `client/src/app/features/admin/organization-management/organization-management.ts`
- Modify (as needed): `client/src/app/features/dashboards/admin/admin.html` (tab content — this dashboard uses the shared `<app-layout>` fixed in Task 3, so only the tab-content grids/tables/forms within `admin.html` itself need the playbook sweep, not the shell)

**Interfaces:** None.

- [ ] **Step 1: Audit each file for the five playbook patterns**

Same grep and classification procedure as Task 6 Step 1.

- [ ] **Step 2: Apply the Responsive Playbook transforms**

Same as Task 6 Step 2.

- [ ] **Step 3: Run the per-file verification grep from Playbook item F**

Same as Task 6 Step 3.

- [ ] **Step 4: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/features/admin/ client/src/app/features/dashboards/admin/admin.html
git commit -m "fix(client): responsive sweep of Admin portal pages for 375px"
```

---

### Task 10: Sweep the Superadmin portal for 375px issues

**Files:**
- Modify (as needed): `client/src/app/features/superadmin/academic-year-management/academic-year-management.ts`
- Modify (as needed): `client/src/app/features/superadmin/campus-management/campus-management.ts`
- Modify (as needed): `client/src/app/features/superadmin/college-department-management/college-department-management.ts`
- Modify (as needed): `client/src/app/features/superadmin/dean-management/dean-management.ts`
- Modify (as needed): `client/src/app/features/superadmin/department-management/department-management.ts`
- Modify (as needed): `client/src/app/features/superadmin/faculty-view/faculty-view.ts`
- Modify (as needed): `client/src/app/features/superadmin/organization-view/organization-view.ts`
- Modify (as needed): `client/src/app/features/dashboards/superadmin/superadmin.html` (tab content below the shell fixed in Task 2)

**Interfaces:** None.

- [ ] **Step 1: Audit each file for the five playbook patterns**

Same grep and classification procedure as Task 6 Step 1.

- [ ] **Step 2: Apply the Responsive Playbook transforms**

Same as Task 6 Step 2.

- [ ] **Step 3: Run the per-file verification grep from Playbook item F**

Same as Task 6 Step 3.

- [ ] **Step 4: Build and confirm no template errors**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add client/src/app/features/superadmin/ client/src/app/features/dashboards/superadmin/superadmin.html
git commit -m "fix(client): responsive sweep of Superadmin portal pages for 375px"
```

---

### Task 11: Final whole-client audit pass

**Files:** None created/modified directly by this task unless the audit in Step 1 finds a leftover issue, in which case fix it in the specific file(s) found (following the Responsive Playbook) before the final commit.

**Interfaces:** None.

- [ ] **Step 1: Run a client-wide grep for any remaining anti-patterns**

From `client/`, run:
```bash
grep -rn "grid-cols-[2-9]" src/app --include="*.ts" --include="*.html" | grep -v "sm:grid-cols\|grid-cols-1"
grep -rn "w-\[[3-9][0-9][0-9]px\]\|w-\[[0-9]\{4,\}px\]" src/app --include="*.ts" --include="*.html"
grep -rln "<table" src/app --include="*.ts" --include="*.html"
```
For the third command's file list, confirm each `<table>` is inside an `overflow-x-auto` wrapper (Playbook item B) — for any that isn't, apply the wrap.
For the first two commands, review each match: if it's a `grid-cols-N`/fixed-width usage without a smaller responsive step and wasn't already covered by Tasks 2-10 (e.g. inside a component this plan's file lists missed, such as a shared component under `src/app/shared/` not yet touched), apply the appropriate Playbook transform.

- [ ] **Step 2: Confirm `src/styles/responsive.css` no longer has any `!important` rule tied to a specific Tailwind utility class name**

Run: `grep -n "!important" client/src/styles/responsive.css`
Expected: only the `*:focus-visible` outline rule and the iOS-input-zoom `font-size: 16px !important` rule remain (both legitimately global, not layout-forcing, per Task 1's scope).

- [ ] **Step 3: Full build**

Run from `client/`: `npx ng build --configuration development`
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit (only if Step 1 found and fixed something)**

```bash
git add -A client/src
git commit -m "fix(client): close remaining 375px responsive gaps found in final audit"
```

If Step 1 found nothing to fix, skip this commit — there's nothing new to record.
