// Standalone dev-only server for the PDS coordinate locator tool (pds/index.js).
// Its own SQLite database (positions.sqlite3), its own port, its own node_modules —
// entirely separate from the main backend/ (MySQL) app. Also serves the tool's
// static files (index.html/js/css + the template PDF) so the whole thing can be
// deployed as a single service (e.g. one Render web service).
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const store = require("./db");

const app = express();
const PORT = process.env.PORT || 2100;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/positions", (req, res) => {
	res.json(store.getAll());
});

app.post("/api/positions", (req, res) => {
	const { key, x, y, center } = req.body || {};
	if (!key || typeof x !== "number" || typeof y !== "number") {
		return res.status(400).json({ error: "key, x, and y are required" });
	}
	store.upsert({ key, x, y, center: !!center });
	res.json({ ok: true });
});

app.post("/api/positions/bulk", (req, res) => {
	const list = req.body;
	if (!Array.isArray(list)) {
		return res
			.status(400)
			.json({ error: "expected an array of { key, x, y, center }" });
	}
	store.upsertMany(list);
	res.json({ ok: true, count: list.length });
});

app.delete("/api/positions", (req, res) => {
	store.clearAll();
	res.json({ ok: true });
});

app.listen(PORT, () => {
	console.log(`PDS locator server running at http://localhost:${PORT}`);
});
