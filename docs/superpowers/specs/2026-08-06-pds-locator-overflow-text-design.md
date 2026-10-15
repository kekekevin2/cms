# PDS locator: per-field overflow handling + inline sample-text editing

Date: 2026-08-06
Scope: `pds/index.js` (the standalone, dev-only field-coordinate locator tool). Does **not** touch the runtime PDS export (`backend/controllers/pds-excel-export.controller.js`, `client/src/app/services/core/pds-pdf.service.ts`) or any database — this tool has no DB and never has; positions persist to `localStorage` and `overlay-positions.json` only.

## Problem

Some sample field values (e.g. `degree_course: "Bachelor of Science in Computer Science"`) render wider than the space available on the PDS template, so the text visibly overflows its cell. There was one ad hoc fix for `degree_course` (shrink font below 30 chars). This spec generalizes that into a per-field option in the locator's field editor, and adds the ability to edit a field's sample text directly in the browser instead of hand-editing the `data` object in `index.js`.

## Data model

Extend the overlay object (built in `buildOverlays()`, list item shape defined in the `field()` helper at `pds/index.js:465`) with two new optional properties, applicable to text-type fields only (`type !== "image"`):

- `maxWidth` (number, PDF points — same coordinate space as `x`/`y`/`w`/`h`). Unset (`undefined`) means "no overflow handling," which is the current behavior for every field today. This is the only new required input from the user per field that wants overflow handling.
- `overflow`: `"shrink" | "wrap"`. Defaults to `"shrink"` when `maxWidth` is set but `overflow` isn't. Selects which strategy applies once the rendered text at `size` would exceed `maxWidth`.

The one-off shrink logic added for `degree_course` (`pds/index.js:648`, comparing `.length > 30`) is superseded by this general mechanism and should be replaced with a `maxWidth` on that field's overlay instead of a hardcoded character-count check.

## Field editor UI (`pds/index.js`, field editor panel + its HTML in `pds/index.html`)

For the currently selected field, when `field.type !== "image"`:

- **Text** — a new `<textarea>` (or single-line `<input>` if multi-line editing of the underlying value doesn't make sense for a given field — default to `<input type="text">` since sample values here are single-line strings) bound to `field.text`. Pre-filled with the field's current value. Wired into the existing live-apply pattern (`applyFieldEditLive`, debounced save) so typing updates the on-canvas preview immediately, same as x/y today.
- **Max Width** — a new number input, always visible for text fields (parallel to the existing X/Y inputs). Empty/blank means `undefined` (no overflow handling).
- **Overflow mode** — a `<select>` with `Shrink` / `Wrap` options, shown only when Max Width has a value (hidden otherwise, same show/hide pattern already used for `fieldEditorCenterRow` / `fieldEditorSizeRow` based on `isImage`).

Image-type fields are unaffected — their existing W/H/Center controls stay exactly as they are.

## Rendering

Today, text is drawn via three separate call sites, each doing its own `ctx.font = ...; ctx.fillText(f.text, ...)`:
1. `drawOverlays()` (`pds/index.js:1138`) — on-screen preview canvas.
2. `getFieldBox()` (`pds/index.js:1434`) — used only to compute the highlight bounding box for the selected field.
3. `downloadPDF()` (`pds/index.js:1619`) — baking the final exported PDF.

Introduce one shared helper, `layoutFieldText(ctx, f)`, that returns an array of `{ text, size, dy }` entries (one entry per rendered line, `dy` = vertical offset in points from the field's anchor `y`, `size` = the font size to actually use for that line):

- If `f.type === "image"`, not applicable.
- Measure `f.text` at `f.size` using `ctx.measureText` (caller must have already set `ctx.font` to the base size before calling, or the helper sets it internally — implementation detail, but must match the font family string already used at each of the three call sites: `'Times New Roman', Times, serif`).
- If `!f.maxWidth` or the measured width already fits: return a single entry `{ text: f.text, size: f.size, dy: 0 }` — i.e., today's exact behavior, byte-for-byte compatible for every field that doesn't set `maxWidth`.
- If `f.overflow === "wrap"` (or defaults to shrink otherwise): greedily split `f.text` on whitespace into lines, each kept under `f.maxWidth` at `f.size`, using `ctx.measureText` per candidate line. Return one entry per line: `{ text: line, size: f.size, dy: i * f.size * 1.15 }` (line height = 1.15× font size, first line at `dy: 0`, growing downward). A single word alone longer than `maxWidth` is not further broken (no mid-word hyphenation) — it just overflows on its own line.
- Otherwise (`shrink`, the default): reduce `size` in 1pt steps from `f.size` down to a floor of `6`, re-measuring at each step, stopping as soon as it fits (or hitting the floor). Return a single entry `{ text: f.text, size: <reduced size>, dy: 0 }`.

All three existing call sites replace their single `ctx.font = ...; ctx.fillText(...)` with: call `layoutFieldText`, then loop over the returned entries, setting `ctx.font` per entry's `size` and drawing at `(cx, cy + dy * scaleFactor)` — `scaleFactor` matches whatever scale that call site already applies to `x`/`y` (viewport scale for the two canvas sites, none for `downloadPDF`'s already-scaled coordinates — check each site's existing scale math when wiring this in, since `drawOverlays` and `downloadPDF` scale differently today).

`getFieldBox()` additionally needs its returned bounding box to grow in height when `layoutFieldText` returns multiple lines (wrap case), so the selection highlight covers all rendered lines, not just the first.

## Persistence

The snapshot objects built in three places must all gain `maxWidth`, `overflow`, and `text`:
- `DEFAULT_POSITIONS` (`pds/index.js:904`) — captured once at startup from the hardcoded `buildOverlays()` output, so **Reset Positions** restores a field's original sample text, max width, and overflow mode along with its original x/y/w/h/center.
- `saveToLocalStorage()` (`pds/index.js:942`) and its counterpart read in `loadFromLocalStorage()`.
- `savePositionsToFile()` / `loadSavedPositionsFile()` (the `overlay-positions.json` round-trip).
- `applyPositions()` (`pds/index.js:918`) — the function that merges a loaded snapshot back onto the live `overlays` array — needs to copy `maxWidth`, `overflow`, and `text` across when present, mirroring how it already copies `center`/`w`/`h` only `if (saved.X !== undefined)`.

No new storage key, no new file, no backend/DB involvement — same single save/load path positions already use, just a wider snapshot shape.

## Explicitly out of scope

- Runtime PDS export (backend controller, client `pds-pdf.service.ts`) — this spec only prototypes the behavior in the locator tool. Porting a chosen `maxWidth`/`overflow` value into the real app's `buildOverlays()`-equivalent is a manual follow-up, not automated by this change.
- Repeating grids (`ROW_ANCHORED_GRIDS`): no cascading of `maxWidth`/`overflow` from row 0 to other rows. Each row's field would need `maxWidth` set individually if desired. Can be added later by extending `cascadeGridFromRow0()` the same way `x`/`y`/`center` already cascade, if it turns out to be needed.
- Mid-word hyphenation/breaking in wrap mode.
- Any database or backend persistence — none exists in this tool and none is being added.
