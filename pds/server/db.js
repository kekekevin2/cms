const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

// Its own SQLite file, completely separate from the main backend's MySQL database.
const db = new DatabaseSync(path.join(__dirname, "positions.sqlite3"));

db.exec(`
	CREATE TABLE IF NOT EXISTS field_positions (
		key TEXT PRIMARY KEY,
		x REAL NOT NULL,
		y REAL NOT NULL,
		center INTEGER NOT NULL DEFAULT 0,
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	)
`);

function getAll() {
	const rows = db.prepare("SELECT key, x, y, center FROM field_positions").all();
	return rows.map((r) => ({ key: r.key, x: r.x, y: r.y, center: !!r.center }));
}

const upsertStmt = db.prepare(`
	INSERT INTO field_positions (key, x, y, center, updated_at)
	VALUES (?, ?, ?, ?, datetime('now'))
	ON CONFLICT(key) DO UPDATE SET x = excluded.x, y = excluded.y, center = excluded.center, updated_at = excluded.updated_at
`);

function upsert({ key, x, y, center }) {
	upsertStmt.run(key, x, y, center ? 1 : 0);
}

function upsertMany(list) {
	for (const item of list) upsert(item);
}

function clearAll() {
	db.exec("DELETE FROM field_positions");
}

module.exports = { getAll, upsert, upsertMany, clearAll };
