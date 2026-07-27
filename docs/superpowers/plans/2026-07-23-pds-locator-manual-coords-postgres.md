# PDS Locator: Manual Coordinate Editing + PostgreSQL Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the PDS locator tool's click-to-place editing with direct numeric x/y inputs in the sidebar, and swap its storage backend from SQLite to PostgreSQL — without losing any already-saved field positions.

**Architecture:** `pds/server/` is a small standalone Express server with a `db.js` storage module behind a fixed function interface (`init/getAll/upsert/upsertMany/clearAll`). We swap that module's internals from synchronous `node:sqlite` calls to the async `pg` driver, update the route handlers in `pds/server/index.js` to `await` it, add a one-time script to copy existing rows out of `positions.sqlite3` into Postgres, then update `pds/index.js`'s sidebar to render number inputs per field instead of static coordinate text, removing the old click-to-place "Edit Positions" mode entirely.

**Tech Stack:** Node.js/Express (existing), `pg` (new dependency) for PostgreSQL, `node:sqlite` (existing, read-only use in the migration script), vanilla JS/HTML/CSS on the frontend (no framework, matches existing `pds/index.js`).

## Global Constraints

- No `.env` file — Postgres connection settings are hardcoded constants in `pds/server/db.js`: `host=localhost, port=5432, user=postgres, password=dyasmir, database=eche`.
- Do not delete or modify `positions.sqlite3` — it holds the user's in-progress saved field positions and must survive this change untouched, migrated (not moved) into Postgres.
- No changes to `backend/` or `client/` (the real apps) — this only touches the standalone `pds/` tool.
- No changes to `pds/deploy-ec2.sh`.
- The REST API surface (`GET/POST /api/positions`, `POST /api/positions/bulk`, `DELETE /api/positions`) must stay unchanged so `pds/index.js`'s `fetch` calls don't need to change.
- No automated test suite exists for this tool (repo-wide convention for `pds/`) — verification steps in this plan are manual (curl / browser), not unit tests.

---

## Task 1: Postgres-backed storage module

**Files:**
- Modify: `pds/server/db.js` (full rewrite)
- Modify: `pds/server/package.json`

**Interfaces:**
- Produces: `module.exports = { init, getAll, upsert, upsertMany, clearAll }` from `pds/server/db.js`, where:
  - `init(): Promise<void>` — creates the `field_positions` table if missing.
  - `getAll(): Promise<{key: string, x: number, y: number, center: boolean}[]>`
  - `upsert({key, x, y, center}): Promise<void>`
  - `upsertMany(list: {key,x,y,center}[]): Promise<void>`
  - `clearAll(): Promise<void>`
  - (Same names/shapes as the current SQLite-backed `db.js`, but now `async`/returning Promises instead of synchronous.)

- [ ] **Step 1: Add the `pg` dependency**

Edit `pds/server/package.json` — add `"pg"` to `dependencies`:

```json
{
  "name": "pds-locator-server",
  "version": "1.0.0",
  "private": true,
  "description": "Standalone dev-only server storing PDS overlay field positions in PostgreSQL. Not part of the main backend/ or client/ apps.",
  "main": "index.js",
  "engines": {
    "node": ">=22.5.0"
  },
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "pg": "^8.13.0"
  }
}
```

Run:
```bash
cd pds/server && npm install
```
Expected: `pg` appears in `pds/server/node_modules/` and `pds/server/package-lock.json` is updated. No errors.

- [ ] **Step 2: Rewrite `db.js` against `pg`**

Replace the entire contents of `pds/server/db.js` with:

```js
// Standalone dev-only storage module for the PDS coordinate locator tool.
// Backed by PostgreSQL — a separate database from the main backend/ (MySQL) app.
// Connection settings are hardcoded here (no .env) per project decision; edit
// these constants directly if your local Postgres setup differs.
const { Pool } = require("pg");

const pool = new Pool({
	host: "localhost",
	port: 5432,
	user: "postgres",
	password: "dyasmir",
	database: "eche",
});

async function init() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS field_positions (
			key TEXT PRIMARY KEY,
			x REAL NOT NULL,
			y REAL NOT NULL,
			center BOOLEAN NOT NULL DEFAULT false,
			updated_at TIMESTAMP NOT NULL DEFAULT now()
		)
	`);
}

async function getAll() {
	const { rows } = await pool.query("SELECT key, x, y, center FROM field_positions");
	return rows.map((r) => ({ key: r.key, x: r.x, y: r.y, center: !!r.center }));
}

async function upsert({ key, x, y, center }) {
	await pool.query(
		`INSERT INTO field_positions (key, x, y, center, updated_at)
		 VALUES ($1, $2, $3, $4, now())
		 ON CONFLICT (key) DO UPDATE SET x = excluded.x, y = excluded.y, center = excluded.center, updated_at = excluded.updated_at`,
		[key, x, y, !!center],
	);
}

async function upsertMany(list) {
	for (const item of list) await upsert(item);
}

async function clearAll() {
	await pool.query("DELETE FROM field_positions");
}

module.exports = { init, getAll, upsert, upsertMany, clearAll };
```

- [ ] **Step 3: Verify the module connects and round-trips data**

Run:
```bash
cd pds/server && node -e "
const store = require('./db');
(async () => {
  await store.init();
  await store.upsert({ key: '__smoke_test__', x: 1, y: 2, center: true });
  const rows = await store.getAll();
  console.log(rows.find(r => r.key === '__smoke_test__'));
  await store.clearAll();
  console.log('after clearAll:', (await store.getAll()).length);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
"
```
Expected output:
```
{ key: '__smoke_test__', x: 1, y: 2, center: true }
after clearAll: 0
```
Troubleshooting: if you see `database "eche" does not exist`, create it first with `psql -U postgres -c "CREATE DATABASE eche;"` (password `dyasmir`), then re-run. If you see `password authentication failed`, double check the hardcoded credentials in `db.js` match your local Postgres user.

- [ ] **Step 4: Commit**

```bash
git add pds/server/db.js pds/server/package.json pds/server/package-lock.json
git commit -m "Switch PDS locator storage module from SQLite to PostgreSQL"
```

---

## Task 2: Async route handlers + startup init

**Files:**
- Modify: `pds/server/index.js`

**Interfaces:**
- Consumes: `store.init()`, `store.getAll()`, `store.upsert()`, `store.upsertMany()`, `store.clearAll()` (all `Promise`-returning, from Task 1's `pds/server/db.js`).
- Produces: no new exports — this is the server entry point.

- [ ] **Step 1: Update route handlers to `async`/`await` and gate `listen()` on `store.init()`**

Replace the entire contents of `pds/server/index.js` with:

```js
// Standalone dev-only server for the PDS coordinate locator tool (pds/index.js).
// Talks to its own PostgreSQL database (see pds/server/db.js), its own port,
// its own node_modules — entirely separate from the main backend/ (MySQL) app.
// Also serves the tool's static files (index.html/js/css + the template PDF)
// so the whole thing can be deployed as a single service (e.g. one Render web service).
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const store = require("./db");

const app = express();
const PORT = process.env.PORT || 2100;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/positions", async (req, res) => {
	res.json(await store.getAll());
});

app.post("/api/positions", async (req, res) => {
	const { key, x, y, center } = req.body || {};
	if (!key || typeof x !== "number" || typeof y !== "number") {
		return res.status(400).json({ error: "key, x, and y are required" });
	}
	await store.upsert({ key, x, y, center: !!center });
	res.json({ ok: true });
});

app.post("/api/positions/bulk", async (req, res) => {
	const list = req.body;
	if (!Array.isArray(list)) {
		return res
			.status(400)
			.json({ error: "expected an array of { key, x, y, center }" });
	}
	await store.upsertMany(list);
	res.json({ ok: true, count: list.length });
});

app.delete("/api/positions", async (req, res) => {
	await store.clearAll();
	res.json({ ok: true });
});

store.init().then(() => {
	app.listen(PORT, () => {
		console.log(`PDS locator server running at http://localhost:${PORT}`);
	});
});
```

- [ ] **Step 2: Verify the server starts and the API round-trips over HTTP**

Run in one terminal:
```bash
cd pds/server && node index.js
```
Expected: prints `PDS locator server running at http://localhost:2100`, stays running.

In a second terminal:
```bash
curl -s http://localhost:2100/api/positions
curl -s -X POST http://localhost:2100/api/positions -H "Content-Type: application/json" -d "{\"key\":\"__http_smoke_test__\",\"x\":10,\"y\":20,\"center\":false}"
curl -s http://localhost:2100/api/positions
curl -s -X DELETE http://localhost:2100/api/positions
curl -s http://localhost:2100/api/positions
```
Expected: first call returns `[]` (or whatever's already in the table), POST returns `{"ok":true}`, third call includes `{"key":"__http_smoke_test__","x":10,"y":20,"center":false}`, DELETE returns `{"ok":true}`, final call returns `[]`. Stop the server with Ctrl+C afterward.

- [ ] **Step 3: Commit**

```bash
git add pds/server/index.js
git commit -m "Make PDS locator server routes async for the Postgres-backed store"
```

---

## Task 3: Migration script — copy existing SQLite positions into Postgres

**Files:**
- Create: `pds/server/migrate-to-postgres.js`

**Interfaces:**
- Consumes: `store.init()`, `store.upsertMany()` (from Task 1's `pds/server/db.js`).
- Produces: no exports — a one-off CLI script (`node pds/server/migrate-to-postgres.js`).

- [ ] **Step 1: Write the migration script**

Create `pds/server/migrate-to-postgres.js`:

```js
// One-time migration: copies every row out of the old positions.sqlite3
// (used before the switch to PostgreSQL) into the new Postgres field_positions
// table. Does NOT delete or modify positions.sqlite3 — it's left on disk as
// a backup of prior progress. Safe to re-run (upsertMany overwrites by key).
//
// Usage: node pds/server/migrate-to-postgres.js
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const store = require("./db");

async function main() {
	const sqlitePath = path.join(__dirname, "positions.sqlite3");
	const sqliteDb = new DatabaseSync(sqlitePath);
	const rows = sqliteDb.prepare("SELECT key, x, y, center FROM field_positions").all();
	sqliteDb.close();

	const list = rows.map((r) => ({ key: r.key, x: r.x, y: r.y, center: !!r.center }));

	await store.init();
	await store.upsertMany(list);

	console.log(`Migrated ${list.length} field position(s) from positions.sqlite3 to Postgres.`);
	process.exit(0);
}

main().catch((err) => {
	console.error("Migration failed:", err);
	process.exit(1);
});
```

- [ ] **Step 2: Run the migration and verify the row count**

First, check how many rows are currently in SQLite:
```bash
cd pds/server && node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./positions.sqlite3');
console.log(db.prepare('SELECT count(*) AS c FROM field_positions').get());
db.close();
"
```
Note the printed count (e.g. `{ c: 42 }`).

Then run the migration:
```bash
node migrate-to-postgres.js
```
Expected: `Migrated <N> field position(s) from positions.sqlite3 to Postgres.` where `<N>` matches the count from the previous command.

Then confirm Postgres has them:
```bash
node -e "
const store = require('./db');
store.getAll().then((rows) => { console.log('postgres row count:', rows.length); process.exit(0); });
"
```
Expected: `postgres row count: <N>` — same number.

- [ ] **Step 3: Commit**

```bash
git add pds/server/migrate-to-postgres.js
git commit -m "Add one-time script to migrate saved PDS positions from SQLite to Postgres"
```

---

## Task 4: Remove click-to-place "Edit Positions" mode

**Files:**
- Modify: `pds/index.js`
- Modify: `pds/index.html`

**Interfaces:**
- Consumes: nothing new.
- Produces: `pds/index.js` no longer defines `editOn`, `selectedField`, `setEditMode`, `getFieldBox`, or the `edit-btn` click listener — later tasks (Task 5) must not reference them. `drawOverlays(pageNum, viewport)` keeps its existing signature but drops the selected-field highlight branch. The `locatorCanvas` "click-to-place" listener is removed entirely (the earlier "click-to-copy-coordinate" listener under `locatorBtn`/locator mode is untouched and stays).

- [ ] **Step 1: Remove the "Edit Positions" button from the HTML**

In `pds/index.html`, delete this block (it sits between `#locator-btn` and `#save-positions-btn`):

```html
      <button id="edit-btn" style="background: #1a1a2e">
        âï¸ Edit Positions: OFF
      </button>
```

- [ ] **Step 2: Simplify the locator toggle to no longer reference edit mode**

In `pds/index.js`, find:

```js
locatorBtn.addEventListener("click", () => {
	locatorOn = !locatorOn;
	if (locatorOn && editOn) setEditMode(false);
	locatorBtn.textContent = `ð Locator: ${locatorOn ? "ON" : "OFF"}`;
	locatorBtn.style.background = locatorOn ? "#dc2626" : "#0f766e";
	locatorCanvas.classList.toggle("inactive", !locatorOn && !editOn);
	if (!locatorOn) {
		lCtx.clearRect(0, 0, locatorCanvas.width, locatorCanvas.height);
		coordLive.textContent = "";
		badge.style.display = "none";
	}
});
```

Replace with:

```js
locatorBtn.addEventListener("click", () => {
	locatorOn = !locatorOn;
	locatorBtn.textContent = `ð Locator: ${locatorOn ? "ON" : "OFF"}`;
	locatorBtn.style.background = locatorOn ? "#dc2626" : "#0f766e";
	locatorCanvas.classList.toggle("inactive", !locatorOn);
	if (!locatorOn) {
		lCtx.clearRect(0, 0, locatorCanvas.width, locatorCanvas.height);
		coordLive.textContent = "";
		badge.style.display = "none";
	}
});
```

- [ ] **Step 3: Remove the selected-field highlight branch from `drawOverlays`**

In `pds/index.js`, find and delete this block from inside `drawOverlays`:

```js

	// Highlight the field currently selected for placement in Edit mode
	if (editOn && selectedField && selectedField.page === pageNum) {
		const box = getFieldBox(selectedField);
		const s = viewport.scale;
		oCtx.save();
		oCtx.strokeStyle = "#2563eb";
		oCtx.lineWidth = 1.5;
		oCtx.setLineDash([4, 3]);
		oCtx.strokeRect(
			box.x0 * s,
			viewport.height - box.y1 * s,
			(box.x1 - box.x0) * s,
			(box.y1 - box.y0) * s,
		);
		oCtx.restore();
	}
```

(`drawOverlays` should now end right after the photo-drawing block that precedes this.)

- [ ] **Step 4: Delete the entire "EDIT POSITIONS" section**

In `pds/index.js`, delete this whole block, from the section comment through the closing `});` of the click listener at the end of the section:

```js
// ─── EDIT POSITIONS (pick a field, click its spot, confirm alignment) ──
const editBtn = document.getElementById("edit-btn");
const saveBtn = document.getElementById("save-positions-btn");
const resetBtn = document.getElementById("reset-positions-btn");
let editOn = false;
let selectedField = null;

function setEditMode(on) {
	editOn = on;
	if (editOn && locatorOn) {
		locatorOn = false;
		locatorBtn.textContent = "ð Locator: OFF";
		locatorBtn.style.background = "#0f766e";
	}
	editBtn.textContent = `âï¸ Edit Positions: ${editOn ? "ON" : "OFF"}`;
	editBtn.style.background = editOn ? "#dc2626" : "#1a1a2e";
	locatorCanvas.classList.toggle("inactive", !editOn && !locatorOn);
	locatorCanvas.style.cursor = editOn ? "crosshair" : "";
	if (!editOn) {
		selectedField = null;
		fieldListEl.querySelectorAll(".field-item.selected").forEach((el) => el.classList.remove("selected"));
	}
	if (pdfDoc) renderPage(currentPage);
}

editBtn.addEventListener("click", () => setEditMode(!editOn));
saveBtn.addEventListener("click", async () => {
	const savedToDb = await saveAllToDb();
	if (savedToDb) {
		flashMessage("â All positions saved to DB");
	} else {
		await savePositionsToFile();
	}
});
resetBtn.addEventListener("click", () => {
	if (confirm("Reset all field positions back to the hardcoded defaults?")) resetPositions();
});

// Approximate bounding box (in page-point space) of a rendered field â only used to draw its highlight box.
function getFieldBox(f) {
	oCtx.font = `${f.size || 11}px 'Times New Roman', Times, serif`;
	const text = f.text && f.text.length ? f.text : "(empty)";
	const w = Math.max(oCtx.measureText(text).width, 24);
	const h = (f.size || 11) + 6;
	const x0 = f.center ? f.x - w / 2 : f.x;
	const y0 = f.y - 3;
	return { x0, y0, x1: x0 + w, y1: y0 + h };
}

// Click = place the currently-selected field at that spot. Asks whether it should be
// center-aligned first, then updates the field and auto-saves (localStorage + file).
locatorCanvas.addEventListener("click", async (e) => {
	if (!editOn || !pdfDoc || !selectedField) return;
	syncLocatorSize();
	const { px, py } = toPageCoords(e);
	const center = confirm(`Place "${selectedField.key}" at x:${px} y:${py}\n\nOK = Centered\nCancel = Left-aligned`);

	selectedField.x = px;
	selectedField.y = py;
	selectedField.center = center;

	updateSidebarCoords(selectedField);
	if (currentViewport) drawOverlays(currentPage, currentViewport);
	coordLive.textContent = `${selectedField.key} â x:${px} y:${py} (${center ? "centered" : "left"}), saving...`;

	// Always keep a local safety net, then try the standalone DB server.
	saveToLocalStorage();
	const savedToDb = await saveFieldToDb(selectedField);
	if (savedToDb) {
		flashMessage(`â ${selectedField.key} saved to DB`);
	} else {
		await savePositionsToFile();
	}
});
```

Replace it with just the two element lookups and their still-needed listeners (this preserves "Save Positions" and "Reset Positions" behavior, which Task 5 relies on unchanged):

```js
// ─── SAVE / RESET ────────────────────────────────────────────────────
const saveBtn = document.getElementById("save-positions-btn");
const resetBtn = document.getElementById("reset-positions-btn");

saveBtn.addEventListener("click", async () => {
	const savedToDb = await saveAllToDb();
	if (savedToDb) {
		flashMessage("â All positions saved to DB");
	} else {
		await savePositionsToFile();
	}
});
resetBtn.addEventListener("click", () => {
	if (confirm("Reset all field positions back to the hardcoded defaults?")) resetPositions();
});
```

- [ ] **Step 5: Manually verify the page still loads with no console errors**

Serve the tool (e.g. `cd pds/server && node index.js`, or any static server pointed at `pds/`) and open it in a browser. Open the browser devtools console.

Expected: page loads, PDF renders with overlays, no red console errors (in particular no `editBtn is not defined` / `setEditMode is not defined` errors), the Locator button still toggles the crosshair readout, and clicking anywhere on the page while Locator is off does nothing (since the placement click listener is gone).

- [ ] **Step 6: Commit**

```bash
git add pds/index.js pds/index.html
git commit -m "Remove click-to-place Edit Positions mode from PDS locator tool"
```

---

## Task 5: Manual x/y/center inputs in the sidebar

**Files:**
- Modify: `pds/index.js`
- Modify: `pds/index.css`

**Interfaces:**
- Consumes: `saveToLocalStorage()`, `saveFieldToDb(field)`, `savePositionsToFile()`, `flashMessage(msg)`, `drawOverlays(pageNum, viewport)`, `currentPage`, `currentViewport` (all pre-existing, unchanged, from `pds/index.js`).
- Produces: `handleFieldValueChange(field, prop, rawValue): Promise<void>` in `pds/index.js` — the `change` handler wired to each sidebar input.

- [ ] **Step 1: Replace `populateFieldList()` to render inputs instead of static text, and drop the now-unused selection helpers**

In `pds/index.js`, find the whole block from `function populateFieldList() {` through the end of `selectField(field) { ... }` (this includes `updateSidebarCoords` and `selectField`, both only used by the removed click-to-place flow):

```js
function populateFieldList() {
	const groups = new Map();
	overlays.forEach((o) => {
		const cat = categoryFor(o.key);
		if (!groups.has(cat)) groups.set(cat, []);
		groups.get(cat).push(o);
	});
	fieldListEl.innerHTML = "";
	groups.forEach((fields, cat) => {
		const heading = document.createElement("li");
		heading.className = "field-group-heading";
		heading.textContent = cat;
		fieldListEl.appendChild(heading);
		fields.forEach((f) => {
			const li = document.createElement("li");
			li.className = "field-item";
			li.dataset.key = f.key;
			const keySpan = document.createElement("span");
			keySpan.className = "field-key";
			keySpan.textContent = f.key;
			const coordSpan = document.createElement("span");
			coordSpan.className = "field-coords";
			coordSpan.textContent = `p${f.page} Â· ${f.x},${f.y}`;
			li.appendChild(keySpan);
			li.appendChild(coordSpan);
			li.addEventListener("click", () => selectField(f));
			fieldListEl.appendChild(li);
		});
	});
}

function updateSidebarCoords(field) {
	const li = fieldListEl.querySelector(`.field-item[data-key="${CSS.escape(field.key)}"]`);
	if (li) li.querySelector(".field-coords").textContent = `p${field.page} Â· ${field.x},${field.y}`;
}

function selectField(field) {
	selectedField = field;
	fieldListEl
		.querySelectorAll(".field-item.selected")
		.forEach((el) => el.classList.remove("selected"));
	const li = fieldListEl.querySelector(`.field-item[data-key="${CSS.escape(field.key)}"]`);
	if (li) {
		li.classList.add("selected");
		li.scrollIntoView({ block: "nearest" });
	}
	if (!editOn) setEditMode(true);
	if (field.page !== currentPage) {
		currentPage = field.page;
		renderPage(currentPage);
	} else if (currentViewport) {
		drawOverlays(currentPage, currentViewport);
	}
	coordLive.textContent = `${field.key} â x:${field.x} y:${field.y} (click on the page to place it)`;
}
```

Replace with:

```js
function populateFieldList() {
	const groups = new Map();
	overlays.forEach((o) => {
		const cat = categoryFor(o.key);
		if (!groups.has(cat)) groups.set(cat, []);
		groups.get(cat).push(o);
	});
	fieldListEl.innerHTML = "";
	groups.forEach((fields, cat) => {
		const heading = document.createElement("li");
		heading.className = "field-group-heading";
		heading.textContent = cat;
		fieldListEl.appendChild(heading);
		fields.forEach((f) => {
			const li = document.createElement("li");
			li.className = "field-item";
			li.dataset.key = f.key;

			const keySpan = document.createElement("span");
			keySpan.className = "field-key";
			keySpan.textContent = f.key;
			li.appendChild(keySpan);

			const inputs = document.createElement("span");
			inputs.className = "field-inputs";

			const xInput = document.createElement("input");
			xInput.type = "number";
			xInput.className = "field-x";
			xInput.step = "0.5";
			xInput.value = f.x;
			xInput.addEventListener("change", () => handleFieldValueChange(f, "x", xInput.value));

			const yInput = document.createElement("input");
			yInput.type = "number";
			yInput.className = "field-y";
			yInput.step = "0.5";
			yInput.value = f.y;
			yInput.addEventListener("change", () => handleFieldValueChange(f, "y", yInput.value));

			const centerLabel = document.createElement("label");
			centerLabel.className = "field-center";
			const centerInput = document.createElement("input");
			centerInput.type = "checkbox";
			centerInput.checked = !!f.center;
			centerInput.addEventListener("change", () => handleFieldValueChange(f, "center", centerInput.checked));
			centerLabel.appendChild(centerInput);
			centerLabel.appendChild(document.createTextNode("C"));

			inputs.appendChild(xInput);
			inputs.appendChild(yInput);
			inputs.appendChild(centerLabel);
			li.appendChild(inputs);

			fieldListEl.appendChild(li);
		});
	});
}

// Fires on blur/Enter (not per-keystroke) for a field's x/y/center input.
// Updates the in-memory overlay, redraws if that field's page is showing,
// and persists to localStorage + the Postgres-backed server.
async function handleFieldValueChange(field, prop, rawValue) {
	if (prop === "center") {
		field.center = !!rawValue;
	} else {
		const parsed = Number(rawValue);
		if (Number.isNaN(parsed)) return;
		field[prop] = parsed;
	}

	if (currentViewport && field.page === currentPage) {
		drawOverlays(currentPage, currentViewport);
	}

	saveToLocalStorage();
	const savedToDb = await saveFieldToDb(field);
	if (savedToDb) {
		flashMessage(`${field.key} saved to DB`);
	} else {
		await savePositionsToFile();
	}
}
```

- [ ] **Step 2: Replace the `.field-coords`/`.field-item.selected` CSS rules with styles for the new inputs**

In `pds/index.css`, find:

```css
.field-item.selected {
  background: #dbeafe;
  outline: 1px solid #2563eb;
}

.field-key {
  font-family: monospace;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-coords {
  font-family: monospace;
  font-size: 11px;
  color: #6b7280;
  flex-shrink: 0;
}
```

Replace with:

```css
.field-key {
  font-family: monospace;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.field-x,
.field-y {
  width: 52px;
  padding: 3px 4px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
}

.field-center {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #6b7280;
  cursor: pointer;
}
```

- [ ] **Step 3: Manually verify editing a field updates the overlay and persists**

With `pds/server` running (`node index.js` in `pds/server/`) and the tool open in a browser on a page where a known field is visible (e.g. page 1, `surname`):

1. In the sidebar, find `surname`'s x input, change its value (e.g. add 20 to the current number), press Tab or click elsewhere to blur.
2. Expected: the "DELA CRUZ" text overlay on the canvas visibly shifts, and a `surname saved to DB` message flashes near the top controls.
3. Reload the browser page.
4. Expected: the `surname` x input still shows the new value, and the overlay renders at the new position (i.e. it round-tripped through Postgres, not just localStorage).
5. Toggle the `C` checkbox for a field and confirm the overlay's text alignment changes (centered vs left) after blur.
6. Click "Save Positions" and confirm the `All positions saved to DB` flash message appears.
7. Click "Reset Positions", confirm the browser's confirm dialog, and confirm all fields snap back to their hardcoded defaults (both on the canvas and in the sidebar inputs).

- [ ] **Step 4: Commit**

```bash
git add pds/index.js pds/index.css
git commit -m "Add manual x/y/center inputs to PDS locator sidebar"
```
