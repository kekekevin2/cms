# PDS Locator Overflow Handling + Inline Text Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a field in the PDS locator tool (`pds/index.js` + `pds/index.html`) be given a max width, then automatically either shrink its font or wrap onto multiple lines when its sample text would otherwise overflow — replacing the one-off `degree_course` character-count hack — and let sample text be edited directly in the field editor panel instead of hand-editing the `data` object in source.

**Architecture:** One shared measurement/layout helper (`layoutFieldText`) computes, in unscaled PDF-point space, how many lines a field's text needs and at what font size; the three existing draw call sites (`drawOverlays`, `getFieldBox`, `downloadPDF`) each apply their own already-existing scale factor to that result instead of doing a single unscaled `fillText`. New `maxWidth`/`overflow`/editable `text` fields ride along the same overlay object and the same save/load/reset plumbing every other field property already uses (`localStorage`, `overlay-positions.json`, `DEFAULT_POSITIONS`).

**Tech Stack:** Vanilla JS (no build step), `<canvas>` 2D context for measurement and drawing, plain HTML/CSS for the editor panel. No test runner exists for this tool — verification in every task below is manual, in-browser.

## Global Constraints

- Scope is `pds/index.js` and `pds/index.html` only. Do not touch `backend/controllers/pds-excel-export.controller.js` or `client/src/app/services/core/pds-pdf.service.ts` — this tool has no database and this plan adds none.
- Every field that does **not** set `maxWidth` must render byte-for-byte identically to today (single line, `f.size`, no behavior change). This is the regression bar for every task that touches a draw call site.
- Font family strings at each call site are already slightly different (`drawOverlays`: `'Times New Roman', Times, serif`; `downloadPDF`: `Times New Roman`) — preserve each site's existing string, don't unify them.
- The tool is static files with no dev server of its own; `fetch("PDS-template.pdf")` and `fetch("overlay-positions.json")` require being served over `http://`, not opened as `file://`. Use `npx http-server pds -p 8080` (or `python -m http.server 8080` from inside `pds/`) for manual verification in every task, then open `http://localhost:8080/index.html`.

---

### Task 1: `layoutFieldText` helper + wire into `drawOverlays` (on-screen preview)

**Files:**
- Modify: `pds/index.js:1138-1151` (`drawOverlays`)
- Modify: `pds/index.js` — add new function `layoutFieldText` immediately above `drawOverlays` (currently line 1138)

**Interfaces:**
- Produces: `function layoutFieldText(ctx, f)` → `{ lines: [{ text: string, size: number }], lineHeight: number }`. `size` and `lineHeight` are in **unscaled PDF points** (same unit as `f.x`/`f.y`/`f.size`) — callers multiply by their own existing scale factors when actually drawing. `f.maxWidth` (number, points) and `f.overflow` (`"shrink" | "wrap"`, default `"shrink"`) are read if present; absent `maxWidth` always returns a single line at `f.size` unchanged.
- Consumes: nothing new — reads only properties already on the overlay object (`text`, `size`, `maxWidth`, `overflow`).

- [ ] **Step 1: Add `layoutFieldText` above `drawOverlays`**

```js
// Decides how many lines `f.text` needs and at what font size, given an
// optional `f.maxWidth` (PDF points) and `f.overflow` ("shrink" | "wrap").
// Measures using 1 canvas px == 1 PDF point, so the result is scale-independent
// — callers apply their own existing size-to-px and x/y-to-px scale factors.
// Fields without `maxWidth` always get back a single line at `f.size`, unchanged.
function layoutFieldText(ctx, f) {
	const family = "'Times New Roman', Times, serif";
	const baseSize = f.size || 11;
	ctx.font = `${baseSize}px ${family}`;

	if (!f.maxWidth || ctx.measureText(f.text).width <= f.maxWidth) {
		return {
			lines: [{ text: f.text, size: baseSize }],
			lineHeight: baseSize * 1.15,
		};
	}

	if (f.overflow === "wrap") {
		const words = f.text.split(" ");
		const lines = [];
		let current = "";
		words.forEach((word) => {
			const candidate = current ? `${current} ${word}` : word;
			if (!current || ctx.measureText(candidate).width <= f.maxWidth) {
				current = candidate;
			} else {
				lines.push(current);
				current = word;
			}
		});
		if (current) lines.push(current);
		return {
			lines: lines.map((text) => ({ text, size: baseSize })),
			lineHeight: baseSize * 1.15,
		};
	}

	// Default: shrink. Step font size down until it fits, floor at 6pt.
	let size = baseSize;
	while (size > 6) {
		ctx.font = `${size}px ${family}`;
		if (ctx.measureText(f.text).width <= f.maxWidth) break;
		size -= 1;
	}
	return { lines: [{ text: f.text, size }], lineHeight: size * 1.15 };
}
```

- [ ] **Step 2: Rewrite `drawOverlays` to use it**

Replace the current body (`pds/index.js:1138-1151`):

```js
function drawOverlays(pageNum, viewport) {
	oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	overlays
		.filter((f) => f.page === pageNum && f.type !== "image")
		.forEach((f) => {
			const s = viewport.scale;
			const cx = f.x * s;
			const cy = viewport.height - f.y * s;
			const { lines, lineHeight } = layoutFieldText(oCtx, f);
			oCtx.fillStyle = f.color || "#000";
			oCtx.textAlign = f.center ? "center" : "left";
			lines.forEach((line, i) => {
				oCtx.font = `${(line.size * s) / 1.5}px 'Times New Roman', Times, serif`;
				oCtx.fillText(line.text, cx, cy + i * lineHeight * s);
			});
		});
	oCtx.textAlign = "left";
```

(Leave the image-drawing loop and highlight-box block that follow untouched — this only replaces the text-drawing `forEach`.)

- [ ] **Step 3: Manual verification — no regression**

Serve the tool (`npx http-server pds -p 8080`), open `http://localhost:8080/index.html`. Confirm every field renders exactly where/how it did before (nothing has `maxWidth` yet, so this step is a pure regression check). Specifically check `degree_course` for the COLLEGE row still shows "Bachelor of Science in Computer Science" at whatever size it rendered at before this task (it still has no `maxWidth` yet — that migration is Task 4).

- [ ] **Step 4: Manual verification — shrink and wrap actually work**

Temporarily edit the COLLEGE row's overlay in `buildOverlays()` (`pds/index.js:648`, already produces `edu_COLLEGE_degree`) to pass `{ size: 11, maxWidth: 100, overflow: "shrink" }` as a throwaway local test, reload, confirm the text visibly shrinks to fit within roughly 100pt. Change `overflow` to `"wrap"`, reload, confirm it now wraps onto multiple lines instead of shrinking, each roughly under 100pt wide. Revert this throwaway edit before committing (Task 4 will make the real change).

- [ ] **Step 5: Commit**

```bash
git add pds/index.js
git commit -m "feat(pds-locator): add layoutFieldText for shrink/wrap overflow, wire into preview"
```

---

### Task 2: Wire `layoutFieldText` into `getFieldBox` (selection highlight box)

**Files:**
- Modify: `pds/index.js:1434-1445` (`getFieldBox`)

**Interfaces:**
- Consumes: `layoutFieldText(ctx, f)` from Task 1.
- Produces: `getFieldBox(f)` keeps its existing return shape `{ x0, y0, x1, y1 }` (unscaled page-point space) — callers (`drawOverlays`'s highlight block, `pds/index.js:1167`) are unaffected.

- [ ] **Step 1: Rewrite `getFieldBox`**

Replace `pds/index.js:1434-1445`:

```js
function getFieldBox(f) {
	if (f.type === "image") {
		return { x0: f.x, y0: f.y, x1: f.x + f.w, y1: f.y + f.h };
	}
	const textedField =
		f.text && f.text.length ? f : { ...f, text: "(empty)" };
	const { lines, lineHeight } = layoutFieldText(oCtx, textedField);
	const widest = Math.max(
		...lines.map((line) => {
			oCtx.font = `${line.size}px 'Times New Roman', Times, serif`;
			return oCtx.measureText(line.text).width;
		}),
		24,
	);
	const h = (lines.length - 1) * lineHeight + lines[0].size + 6;
	const y0 = f.y - 3 - (lines.length - 1) * lineHeight;
	const x0 = f.center ? f.x - widest / 2 : f.x;
	return { x0, y0, x1: x0 + widest, y1: y0 + h };
}
```

- [ ] **Step 2: Manual verification**

Serve the tool, select a field with no `maxWidth` in the sidebar — confirm the blue dashed highlight box is in the same place/size as before this change (single-line case must be identical: `lines.length === 1` collapses the new formula back to the original `y0 = f.y - 3`, `h = size + 6`). Then re-apply the throwaway `maxWidth`/`overflow: "wrap"` test from Task 1 Step 4 to `edu_COLLEGE_degree`, reload, select that field, and confirm the highlight box now visibly grows taller to cover all wrapped lines. Revert the throwaway edit again.

- [ ] **Step 3: Commit**

```bash
git add pds/index.js
git commit -m "feat(pds-locator): grow selection highlight box for wrapped multi-line fields"
```

---

### Task 3: Wire `layoutFieldText` into `downloadPDF` (export)

**Files:**
- Modify: `pds/index.js:1619-1641` (`downloadPDF`, specifically the text-drawing `forEach` inside its page loop)

**Interfaces:**
- Consumes: `layoutFieldText(ctx, f)` from Task 1.

- [ ] **Step 1: Rewrite the text-drawing block inside `downloadPDF`**

Locate the block (inside the `for (let p = 1; p <= pdfDoc.numPages; p++)` loop):

```js
overlays
	.filter((f) => f.page === p && f.type !== "image")
	.forEach((f) => {
		const s = viewport.scale;
		const cx = f.x * s;
		const cy = viewport.height - f.y * s;
		ctx.font = `${((f.size || 11) * s) / 1.5}px Times New Roman`;
		ctx.fillStyle = "#000";
		ctx.textAlign = f.center ? "center" : "left";
		ctx.fillText(f.text, cx, cy);
	});
```

Replace with:

```js
overlays
	.filter((f) => f.page === p && f.type !== "image")
	.forEach((f) => {
		const s = viewport.scale;
		const cx = f.x * s;
		const cy = viewport.height - f.y * s;
		const { lines, lineHeight } = layoutFieldText(ctx, f);
		ctx.fillStyle = "#000";
		ctx.textAlign = f.center ? "center" : "left";
		lines.forEach((line, i) => {
			ctx.font = `${(line.size * s) / 1.5}px Times New Roman`;
			ctx.fillText(line.text, cx, cy + i * lineHeight * s);
		});
	});
```

- [ ] **Step 2: Manual verification**

Serve the tool, click the "Download PDF" control (whatever UI element calls `downloadPDF()` — confirm its id via `grep -n "downloadPDF" pds/index.html pds/index.js` if not obviously wired to a visible button), open the downloaded PDF, and confirm text renders identically to the preview canvas for both a plain field (no `maxWidth`) and the throwaway wrap/shrink test field from Task 1.

- [ ] **Step 3: Commit**

```bash
git add pds/index.js
git commit -m "feat(pds-locator): apply shrink/wrap overflow in PDF export, matching preview"
```

---

### Task 4: Migrate `degree_course` off the character-count hack

**Files:**
- Modify: `pds/index.js:648-650` (the `edu_${level}_degree` field call added for the earlier `degree_course` font-size fix)

**Interfaces:**
- Consumes: `maxWidth`/`overflow` options on `field(...)`, already supported by the `field` helper's `opts` parameter (`pds/index.js:465-479` already forwards arbitrary `opts.size`; it needs `maxWidth`/`overflow` added to its own `list.push` — see Step 1).

- [ ] **Step 1: Add `maxWidth`/`overflow` to the `field()` helper**

In `pds/index.js`, the `field` helper (around line 465) currently pushes:

```js
	const field = (key, page, x, y, text, opts = {}) => {
		list.push({
			key,
			page,
			x,
			y,
			text,
			size: opts.size || 11,
			center: !!opts.center,
			type: opts.type || "text",
			w: opts.w,
			h: opts.h,
			image: opts.image,
		});
	};
```

Add two lines so it becomes:

```js
	const field = (key, page, x, y, text, opts = {}) => {
		list.push({
			key,
			page,
			x,
			y,
			text,
			size: opts.size || 11,
			center: !!opts.center,
			type: opts.type || "text",
			w: opts.w,
			h: opts.h,
			image: opts.image,
			maxWidth: opts.maxWidth,
			overflow: opts.overflow,
		});
	};
```

- [ ] **Step 2: Replace the character-count hack**

Find (around line 648, inside the `EDUCATION_LEVELS.forEach` loop):

```js
			const degreeCourse = edu.degree_course || "";
			field(`edu_${level}_degree`, 1, 200, y, degreeCourse, {
				size: degreeCourse.length > 30 ? 8 : 11,
			});
```

Replace with:

```js
			field(`edu_${level}_degree`, 1, 200, y, edu.degree_course || "", {
				maxWidth: 105,
				overflow: "shrink",
			});
```

(`maxWidth: 105` is a starting estimate for the degree/course column's width on the template — it's the same value someone would otherwise type into the new Max Width field-editor input from Task 5, so it's fine to fine-tune later through the UI rather than getting it exactly right here.)

- [ ] **Step 3: Manual verification**

Serve the tool, confirm the COLLEGE row's "Bachelor of Science in Computer Science" still shrinks to fit (same visual result as the pre-Task-1 hardcoded hack), and that the VOCATIONAL/GRADUATE STUDIES rows (empty `degree_course` in sample data) are unaffected.

- [ ] **Step 4: Commit**

```bash
git add pds/index.js
git commit -m "refactor(pds-locator): replace degree_course length hack with maxWidth/overflow"
```

---

### Task 5: Field editor UI — Max Width, Overflow mode, editable Text

**Files:**
- Modify: `pds/index.html:54-68` (`#field-editor` panel)
- Modify: `pds/index.js:1360-1394` (`selectField`)
- Modify: `pds/index.js:1416-1431` (new `const` lookups alongside the existing `fieldEditor*` ones)
- Modify: `pds/index.js:1563-1610` (`applyFieldEditLive`, the `fieldEditorX`/etc. `addEventListener` calls, and `fieldEditorApply`'s click handler)

**Interfaces:**
- Consumes: `selectedField` (existing module-level variable), `overlays` array, `debouncedSaveToLocalStorage()`, `updateSidebarCoords()`, `drawOverlays()` — all already defined in this file.
- Produces: nothing new consumed elsewhere; this task is UI-only plumbing into the existing overlay objects' `maxWidth`/`overflow`/`text` properties (added in Tasks 1 and 4).

- [ ] **Step 1: Add the new inputs to `index.html`**

Replace `pds/index.html:54-68`:

```html
        <div id="field-editor" class="hidden">
          <div id="field-editor-key"></div>
          <div id="field-editor-row">
            <label>X <input id="field-editor-x" type="number" step="1" /></label>
            <label>Y <input id="field-editor-y" type="number" step="1" /></label>
          </div>
          <label id="field-editor-center-row">
            <input id="field-editor-center" type="checkbox" /> Centered
          </label>
          <div id="field-editor-size-row" class="hidden">
            <label>W <input id="field-editor-w" type="number" step="1" /></label>
            <label>H <input id="field-editor-h" type="number" step="1" /></label>
          </div>
          <button id="field-editor-apply">✓ Apply</button>
        </div>
```

With:

```html
        <div id="field-editor" class="hidden">
          <div id="field-editor-key"></div>
          <label id="field-editor-text-row">
            Text
            <input id="field-editor-text" type="text" />
          </label>
          <div id="field-editor-row">
            <label>X <input id="field-editor-x" type="number" step="1" /></label>
            <label>Y <input id="field-editor-y" type="number" step="1" /></label>
          </div>
          <label id="field-editor-center-row">
            <input id="field-editor-center" type="checkbox" /> Centered
          </label>
          <div id="field-editor-size-row" class="hidden">
            <label>W <input id="field-editor-w" type="number" step="1" /></label>
            <label>H <input id="field-editor-h" type="number" step="1" /></label>
          </div>
          <label id="field-editor-maxwidth-row">
            Max Width
            <input id="field-editor-maxwidth" type="number" step="1" placeholder="none" />
          </label>
          <label id="field-editor-overflow-row" class="hidden">
            Overflow
            <select id="field-editor-overflow">
              <option value="shrink">Shrink</option>
              <option value="wrap">Wrap</option>
            </select>
          </label>
          <button id="field-editor-apply">✓ Apply</button>
        </div>
```

- [ ] **Step 2: Add CSS to hide `#field-editor-overflow-row` like the existing rows**

In `pds/index.css`, find the rule block that currently hides `#field-editor-center-row.hidden, #field-editor-size-row.hidden` (around line 186) and add `#field-editor-overflow-row.hidden` to the same selector list:

```css
#field-editor-center-row.hidden,
#field-editor-size-row.hidden,
#field-editor-overflow-row.hidden {
	display: none;
}
```

- [ ] **Step 3: Add the new element lookups in `index.js`**

Immediately after `pds/index.js:1429` (`const fieldEditorH = ...`), add:

```js
const fieldEditorText = document.getElementById("field-editor-text");
const fieldEditorMaxWidth = document.getElementById("field-editor-maxwidth");
const fieldEditorOverflow = document.getElementById("field-editor-overflow");
const fieldEditorOverflowRow = document.getElementById(
	"field-editor-overflow-row",
);
```

- [ ] **Step 4: Populate the new inputs in `selectField`**

In `pds/index.js`, `selectField` (starting line 1360) currently ends with:

```js
	const isImage = field.type === "image";
	fieldEditorCenterRow.classList.toggle("hidden", isImage);
	fieldEditorSizeRow.classList.toggle("hidden", !isImage);
	if (isImage) {
		fieldEditorW.value = field.w;
		fieldEditorH.value = field.h;
	}

	fieldEditorX.focus();
}
```

Change it to:

```js
	const isImage = field.type === "image";
	fieldEditorCenterRow.classList.toggle("hidden", isImage);
	fieldEditorSizeRow.classList.toggle("hidden", !isImage);
	if (isImage) {
		fieldEditorW.value = field.w;
		fieldEditorH.value = field.h;
	}

	fieldEditorText.value = field.text || "";
	fieldEditorMaxWidth.value = field.maxWidth ?? "";
	fieldEditorOverflow.value = field.overflow || "shrink";
	fieldEditorOverflowRow.classList.toggle("hidden", !field.maxWidth);

	fieldEditorX.focus();
}
```

- [ ] **Step 5: Wire live-apply for the new inputs in `applyFieldEditLive`**

`applyFieldEditLive` (starting `pds/index.js:1563`) currently ends its non-image branch with `selectedField.center = fieldEditorCenter.checked;` inside an `if (selectedField.type === "image") { ... } else { ... }` block. Add the text/maxWidth/overflow handling right after that `if/else`, before the grid-cascade calls:

```js
function applyFieldEditLive() {
	if (!selectedField) return;
	const x = Number(fieldEditorX.value);
	const y = Number(fieldEditorY.value);
	if (!Number.isFinite(x) || !Number.isFinite(y)) return;

	selectedField.x = x;
	selectedField.y = y;

	if (selectedField.type === "image") {
		const w = Number(fieldEditorW.value);
		const h = Number(fieldEditorH.value);
		if (Number.isFinite(w) && w > 0) selectedField.w = w;
		if (Number.isFinite(h) && h > 0) selectedField.h = h;
	} else {
		selectedField.center = fieldEditorCenter.checked;
		selectedField.text = fieldEditorText.value;
		const maxWidth = Number(fieldEditorMaxWidth.value);
		selectedField.maxWidth =
			fieldEditorMaxWidth.value !== "" && Number.isFinite(maxWidth) && maxWidth > 0
				? maxWidth
				: undefined;
		selectedField.overflow = fieldEditorOverflow.value;
		fieldEditorOverflowRow.classList.toggle("hidden", !selectedField.maxWidth);
	}

	const grid = findRow0Grid(selectedField.key);
	if (grid) cascadeGridFromRow0(grid);
	cascadeQuestionYesToNo(selectedField.key);

	updateSidebarCoords(selectedField);
	if (currentViewport && selectedField.page === currentPage)
		drawOverlays(currentPage, currentViewport);
	debouncedSaveToLocalStorage();
}
```

- [ ] **Step 6: Register the new listeners**

After the existing listener registrations (`pds/index.js:1591-1595`):

```js
fieldEditorX.addEventListener("input", applyFieldEditLive);
fieldEditorY.addEventListener("input", applyFieldEditLive);
fieldEditorCenter.addEventListener("change", applyFieldEditLive);
fieldEditorW.addEventListener("input", applyFieldEditLive);
fieldEditorH.addEventListener("input", applyFieldEditLive);
```

Add:

```js
fieldEditorText.addEventListener("input", applyFieldEditLive);
fieldEditorMaxWidth.addEventListener("input", applyFieldEditLive);
fieldEditorOverflow.addEventListener("change", applyFieldEditLive);
```

- [ ] **Step 7: Manual verification**

Serve the tool, select `edu_COLLEGE_degree` in the sidebar. Confirm the Text input shows "Bachelor of Science in Computer Science" and Max Width shows `105` (from Task 4) with the Overflow row visible showing "Shrink". Change Overflow to "Wrap" — confirm the on-canvas text switches from shrunk-single-line to multi-line immediately (no Apply click needed, matching the existing live-update behavior for X/Y). Clear Max Width — confirm the Overflow row hides and the text renders at its plain base size again. Type new text into the Text input — confirm it updates on canvas live. Select a plain field with no `maxWidth` (e.g. `surname`) — confirm Max Width shows blank/placeholder "none" and the Overflow row stays hidden.

- [ ] **Step 8: Commit**

```bash
git add pds/index.html pds/index.css pds/index.js
git commit -m "feat(pds-locator): editable text, max width, and overflow mode in field editor"
```

---

### Task 6: Persist `maxWidth`/`overflow`/`text` through save/load/reset

**Files:**
- Modify: `pds/index.js:904-909` (`DEFAULT_POSITIONS`)
- Modify: `pds/index.js:918-931` (`applyPositions`)
- Modify: `pds/index.js:942-956` (`saveToLocalStorage`)
- Modify: `pds/index.js:968-976` (`savePositionsToFile`, the `snapshot` map)
- Modify: `pds/index.js:1016-1030` (`resetPositions`)

**Interfaces:**
- Consumes: `overlays` array (now carrying `maxWidth`/`overflow`/`text`, from Tasks 1, 4, 5).
- Produces: no new exported names — this task only widens the snapshot shape already flowing through `localStorage` / `overlay-positions.json`.

- [ ] **Step 1: Widen `DEFAULT_POSITIONS`**

Replace `pds/index.js:904-909`:

```js
const DEFAULT_POSITIONS = new Map(
	overlays.map((o) => [
		o.key,
		{ x: o.x, y: o.y, center: o.center, w: o.w, h: o.h },
	]),
);
```

With:

```js
const DEFAULT_POSITIONS = new Map(
	overlays.map((o) => [
		o.key,
		{
			x: o.x,
			y: o.y,
			center: o.center,
			w: o.w,
			h: o.h,
			text: o.text,
			maxWidth: o.maxWidth,
			overflow: o.overflow,
		},
	]),
);
```

- [ ] **Step 2: Widen `applyPositions`**

Replace `pds/index.js:918-931`:

```js
function applyPositions(list) {
	if (!Array.isArray(list)) return;
	const map = new Map(list.map((p) => [p.key, p]));
	overlays.forEach((o) => {
		const saved = map.get(o.key);
		if (saved) {
			o.x = saved.x;
			o.y = saved.y;
			if (saved.center !== undefined) o.center = !!saved.center;
			if (saved.w !== undefined) o.w = saved.w;
			if (saved.h !== undefined) o.h = saved.h;
		}
	});
}
```

With:

```js
function applyPositions(list) {
	if (!Array.isArray(list)) return;
	const map = new Map(list.map((p) => [p.key, p]));
	overlays.forEach((o) => {
		const saved = map.get(o.key);
		if (saved) {
			o.x = saved.x;
			o.y = saved.y;
			if (saved.center !== undefined) o.center = !!saved.center;
			if (saved.w !== undefined) o.w = saved.w;
			if (saved.h !== undefined) o.h = saved.h;
			if (saved.text !== undefined) o.text = saved.text;
			if (saved.maxWidth !== undefined) o.maxWidth = saved.maxWidth;
			if (saved.overflow !== undefined) o.overflow = saved.overflow;
		}
	});
}
```

- [ ] **Step 3: Widen `saveToLocalStorage`'s snapshot**

Replace `pds/index.js:942-956`:

```js
function saveToLocalStorage() {
	try {
		const snapshot = overlays.map((o) => ({
			key: o.key,
			x: o.x,
			y: o.y,
			center: !!o.center,
			w: o.w,
			h: o.h,
		}));
		localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
	} catch {
		// storage full/unavailable — not fatal, explicit Save button still works
	}
}
```

With:

```js
function saveToLocalStorage() {
	try {
		const snapshot = overlays.map((o) => ({
			key: o.key,
			x: o.x,
			y: o.y,
			center: !!o.center,
			w: o.w,
			h: o.h,
			text: o.text,
			maxWidth: o.maxWidth,
			overflow: o.overflow,
		}));
		localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
	} catch {
		// storage full/unavailable — not fatal, explicit Save button still works
	}
}
```

- [ ] **Step 4: Widen `savePositionsToFile`'s snapshot**

Replace `pds/index.js:968-976`:

```js
async function savePositionsToFile() {
	const snapshot = overlays.map((o) => ({
		key: o.key,
		x: o.x,
		y: o.y,
		center: !!o.center,
		w: o.w,
		h: o.h,
	}));
```

With:

```js
async function savePositionsToFile() {
	const snapshot = overlays.map((o) => ({
		key: o.key,
		x: o.x,
		y: o.y,
		center: !!o.center,
		w: o.w,
		h: o.h,
		text: o.text,
		maxWidth: o.maxWidth,
		overflow: o.overflow,
	}));
```

(Leave the rest of the function — the File System Access API / download-fallback logic — untouched.)

- [ ] **Step 5: Widen `resetPositions`**

Replace `pds/index.js:1016-1030`:

```js
function resetPositions() {
	overlays.forEach((o) => {
		const def = DEFAULT_POSITIONS.get(o.key);
		if (def) {
			o.x = def.x;
			o.y = def.y;
			o.center = def.center;
			o.w = def.w;
			o.h = def.h;
		}
	});
	localStorage.removeItem(STORAGE_KEY);
	if (pdfDoc) renderPage(currentPage);
	flashMessage("↺ Reset to hardcoded defaults");
}
```

With:

```js
function resetPositions() {
	overlays.forEach((o) => {
		const def = DEFAULT_POSITIONS.get(o.key);
		if (def) {
			o.x = def.x;
			o.y = def.y;
			o.center = def.center;
			o.w = def.w;
			o.h = def.h;
			o.text = def.text;
			o.maxWidth = def.maxWidth;
			o.overflow = def.overflow;
		}
	});
	localStorage.removeItem(STORAGE_KEY);
	if (pdfDoc) renderPage(currentPage);
	flashMessage("↺ Reset to hardcoded defaults");
}
```

- [ ] **Step 6: Manual verification — full round trip**

Serve the tool. Select `edu_COLLEGE_degree`, change its Text to a longer throwaway string and switch Overflow to "Wrap", confirm it wraps. Reload the page (`http://localhost:8080/index.html`, no cache-busting needed since `localStorage` persists across reloads) — confirm the edited text, max width, and wrap mode are still applied after reload (this proves `saveToLocalStorage`/`loadFromLocalStorage` round-trip the new fields). Click "Save Positions" and confirm `overlay-positions.json` (or the downloaded file, depending on browser) now contains `text`, `maxWidth`, and `overflow` keys for `edu_COLLEGE_degree`. Click "Reset Positions" and confirm the field goes back to the Task 4 defaults (`degree_course` from sample data, `maxWidth: 105`, `overflow: "shrink"`) — not blank/undefined.

- [ ] **Step 7: Commit**

```bash
git add pds/index.js
git commit -m "feat(pds-locator): persist text/maxWidth/overflow through save, load, and reset"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1, 4), field editor UI (Task 5), rendering across all three call sites (Tasks 1–3), persistence (Task 6), out-of-scope items (grids, hyphenation, DB) — none touched, as required. `degree_course` migration explicitly called out in the spec's "Rendering" section is Task 4.
- **Type consistency:** `layoutFieldText(ctx, f)` return shape (`{ lines: [{ text, size }], lineHeight }`) is identical across Tasks 1, 2, 3 — verified each call site destructures the same two keys the same way.
- **No placeholders:** every step has literal before/after code; manual verification steps name exact fields, exact expected values (`maxWidth: 105`), and exact UI behavior to check.
