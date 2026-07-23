# PDS Locator: Manual Coordinate Editing + PostgreSQL Storage

## Context

`pds/` is a standalone, unbuilt dev tool (not part of the `backend/` or `client/` apps) used to find and record x/y coordinates for each field overlaid on the CS Form No. 212 (PDS) PDF template. `pds/index.js` renders the PDF with text overlays and lets you adjust field positions; `pds/server/` is a small Express server (its own SQLite database, `positions.sqlite3`) that persists those positions so the tool remembers them across reloads.

Today, adjusting a field's position works by: selecting a field from the sidebar list, entering "Edit Positions" mode, then clicking a spot on the rendered PDF page (with a confirm dialog asking whether to center it). This is fiddly for small nudges.

## Goals

1. Replace click-to-place with direct numeric input: each field in the sidebar gets x/y number inputs (and a center checkbox) that can be typed into directly, with the overlay redrawing live.
2. Swap the storage backend from SQLite to PostgreSQL, with connection settings hardcoded (no `.env` for now).
3. Preserve all currently-saved field positions (the user's in-progress work) — nothing is deleted or reset by this change.

## Non-goals

- No changes to `backend/` or `client/` (the real apps) — this only touches the standalone `pds/` tool.
- No env-based config for Postgres credentials (explicitly deferred).
- No changes to `pds/deploy-ec2.sh` (EC2 deploy script) — its `node:sqlite`-oriented Node-version check becomes stale but updating deploy tooling for Postgres provisioning is out of scope here.
- The Locator tool (crosshair readout + click-to-copy coordinate snippet) is unaffected — it remains useful for finding a coordinate to type into the new inputs.

## Design

### Frontend (`pds/index.js`, `pds/index.html`, `pds/index.css`)

- Remove the "Edit Positions" mode entirely: `editOn`, `selectedField`, `setEditMode()`, `getFieldBox()`, the edit-mode click listener on `locatorCanvas`, the `edit-btn` element/listener, and the dashed selected-field highlight box in `drawOverlays()`.
- In `populateFieldList()`, each field row renders two `<input type="number">` elements (x, y) and one `<input type="checkbox">` (center), initialized from the field's current values, instead of the static `p{page} · {x},{y}` text span.
- Add a `change` listener (fires on blur/Enter, not per-keystroke) on these inputs that:
  1. Parses and writes the new value onto the in-memory `overlays` entry.
  2. Redraws the canvas via `drawOverlays()` if the field's page is currently shown.
  3. Writes to `localStorage` (existing safety-net behavior, unchanged).
  4. Calls the existing `saveFieldToDb()` to persist the single field via the REST API (unchanged request shape).
- "Save Positions" (bulk save) and "Reset Positions" buttons keep their current behavior and event wiring.
- `index.html`/`index.css`: drop the "Edit Positions" button; add compact styling for the new per-row number inputs/checkbox (replacing `.field-coords`).

### Backend (`pds/server/`)

- `db.js` rewritten against the `pg` package instead of Node's built-in `node:sqlite`:
  - Hardcoded connection constants at the top of the file:
    ```js
    const pool = new Pool({
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: "postgres",
      database: "pds_locator",
    });
    ```
  - Same table shape as today: `field_positions(key TEXT PRIMARY KEY, x REAL, y REAL, center BOOLEAN, updated_at TIMESTAMP)`, created via `CREATE TABLE IF NOT EXISTS` on startup.
  - `getAll`/`upsert`/`upsertMany`/`clearAll` become `async` (pg is promise-based, unlike the old synchronous `node:sqlite` calls).
- `index.js` (server): route handlers become `async`/`await` around the now-async store functions. The REST API surface (`GET/POST /api/positions`, `POST /api/positions/bulk`, `DELETE /api/positions`) is unchanged, so the frontend's `fetch` calls need no changes.
- `package.json`: add `"pg"` as a dependency.

### Migration (preserving existing progress)

- One-time script `pds/server/migrate-to-postgres.js`:
  1. Opens `positions.sqlite3` read-only via `node:sqlite`.
  2. Reads all rows from `field_positions`.
  3. Connects to the new Postgres `pool` and calls `upsertMany()` (from the new `db.js`) to insert them.
  4. Prints a summary count; does not delete or modify `positions.sqlite3`.
- Run once, manually, after Postgres is set up and before starting the new server: `node pds/server/migrate-to-postgres.js`.
- `positions.sqlite3` is left on disk afterward as a backup — not deleted by this change or the migration script.

## Testing

No automated test suite exists for this tool (consistent with the rest of the repo's manual-script conventions). Verification is manual:
- Run the migration script against the real `positions.sqlite3` and confirm the row count printed matches `SELECT count(*) FROM field_positions` in Postgres.
- Start `pds/server`, open the tool, confirm previously-placed fields render at their saved (pre-migration) coordinates.
- Edit an x/y input for a field, confirm the overlay moves live and the value persists across a page reload (i.e. round-trips through Postgres).
- Confirm "Save Positions" and "Reset Positions" still work.
