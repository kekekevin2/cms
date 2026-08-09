// Faculty Profile Cover — field locator + sample PDF generator.
// Same overlay logic as pds-pdf.service.ts: pdf.js rasterizes the template
// page to a canvas, fields get drawn on top at hand-placed coordinates, the
// canvas is embedded into a fresh jsPDF page. Coordinates here use a
// top-left origin (y grows down) at scale 1 = PDF points, unlike the PDS
// tool's bottom-left convention — simpler to reason about while clicking
// around a single free-form page instead of aligning to pre-printed boxes.

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const PAGE_W = 612;
const PAGE_H = 936;
const STORAGE_KEY = "profile-cover-positions";

// 1-inch left/right page margin — mirrors MARGIN in faculty-profile-pdf.service.ts.
const MARGIN = 72;
const COL_LEFT = MARGIN; // 72, was 26
const COL_LABEL = MARGIN + 27; // 99, was 53
const COL_HEADING = MARGIN + 174; // 246, was 200
const COL_VALUE = MARGIN + 204; // 276, was 230
const COL_COURSE2 = MARGIN + 274; // 346, was 300

// Seed fields with rough starting coordinates guessed from the mockup image.
// Nudge these via the locator UI — that's the whole point of this tool.
const DEFAULT_FIELDS = [
  { key: "photo", type: "photo", x: COL_LEFT, y: 95, w: 150, h: 195 },

  {
    key: "heading_faculty_profile",
    type: "text",
    text: "FACULTY PROFILE",
    x: COL_HEADING,
    y: 108,
    fontSize: 22,
    bold: true,
    color: "#8b1538",
    center: false,
  },
  {
    key: "name",
    type: "text",
    text: "PHILIP D. GENETA",
    x: COL_HEADING,
    y: 155,
    fontSize: 15,
    bold: true,
    color: "#000000",
    center: false,
  },
  {
    key: "academic_rank_line",
    type: "text",
    text: "Associate Professor",
    x: COL_HEADING,
    y: 176,
    fontSize: 11,
    bold: false,
    color: "#000000",
    center: false,
  },
  {
    key: "role_line",
    type: "text",
    text: "Dean / Instructor / Program Chairperson",
    x: COL_HEADING,
    y: 200,
    fontSize: 11,
    bold: true,
    color: "#c0392b",
    center: false,
  },
  {
    key: "department",
    type: "text",
    text: "College of Engineering Technology",
    x: COL_HEADING,
    y: 222,
    fontSize: 11,
    bold: true,
    color: "#000000",
    center: false,
  },
  {
    key: "contact_label",
    type: "text",
    text: "Contact Number:",
    x: COL_HEADING,
    y: 256,
    fontSize: 9,
    bold: false,
    color: "#666666",
    center: false,
  },
  {
    key: "contact_value",
    type: "text",
    text: "09761922265",
    x: COL_HEADING,
    y: 270,
    fontSize: 10,
    bold: false,
    color: "#000000",
    center: false,
  },
  {
    key: "email_label",
    type: "text",
    text: "Email Address:",
    x: COL_HEADING,
    y: 293,
    fontSize: 9,
    bold: false,
    color: "#666666",
    center: false,
  },
  {
    key: "email_value",
    type: "text",
    text: "philip.geneta@g.batstate-u.edu.ph",
    x: COL_HEADING,
    y: 307,
    fontSize: 10,
    bold: false,
    color: "#000000",
    center: false,
  },

  {
    key: "personal_info_header",
    type: "text",
    text: "PERSONAL INFORMATION",
    x: COL_LEFT,
    y: 345,
    fontSize: 13,
    bold: true,
    color: "#8b1538",
    center: false,
  },
  ...personalInfoRow("first_name", "FIRST NAME", "Philip", 372),
  ...personalInfoRow("middle_name", "MIDDLE NAME", "Dilao", 391),
  ...personalInfoRow("last_name", "LAST NAME", "Geneta", 410),
  ...personalInfoRow("academic_rank", "ACADEMIC RANK", "Associate Professor", 429),
  ...personalInfoRow("employment_status", "EMPLOYMENT STATUS", "Permanent Faculty", 448),
  ...personalInfoRow("birth_date", "BIRTH DATE", "July 20, 1985", 467),
  ...personalInfoRow("age", "AGE", "40 years old", 486),
  ...personalInfoRow("civil_status", "CIVIL STATUS", "Single", 505),

  {
    key: "education_header",
    type: "text",
    text: "EDUCATION",
    x: COL_LEFT,
    y: 545,
    fontSize: 13,
    bold: true,
    color: "#8b1538",
    center: false,
  },
  ...educationRow(
    "undergraduate",
    "UNDERGRADUATE",
    "Bachelor of Industrial Technology",
    "Batangas State University Lipa Campus, 2006",
    572,
  ),
  ...educationRow(
    "masters",
    "MASTER'S",
    "Master of Technology",
    "Technological University of the Philippines - Manila, 2006",
    620,
  ),
  ...educationRow(
    "doctorate",
    "DOCTORATE",
    "Doctor of Technology",
    "Batangas State University - Alangilan Campus, Completed Academic Requirements",
    668,
  ),

  {
    key: "courses_header",
    type: "text",
    text: "COURSES HANDLED",
    x: COL_LEFT,
    y: 715,
    fontSize: 13,
    bold: true,
    color: "#8b1538",
    center: false,
  },
  courseField("course_1", "Technology Research 1 & 2", COL_LABEL, 742),
  courseField("course_2", "Computer Programming 1 & 2", COL_LABEL, 760),
  courseField("course_3", "Materials Technology Management", COL_LABEL, 778),
  courseField("course_4", "Applied Physics", COL_COURSE2, 742),
  courseField("course_5", "Applied Chemistry", COL_COURSE2, 760),
  courseField("course_6", "Signal System Analysis", COL_COURSE2, 778),
];

function personalInfoRow(key, label, sample, y) {
  return [
    {
      key: `label_${key}`,
      type: "text",
      text: label,
      x: COL_LABEL,
      y,
      fontSize: 10,
      bold: true,
      color: "#333333",
      center: false,
    },
    {
      key: `value_${key}`,
      type: "text",
      text: sample,
      x: COL_VALUE,
      y,
      fontSize: 10,
      bold: false,
      color: "#000000",
      center: false,
    },
  ];
}

function educationRow(key, label, degree, details, y) {
  return [
    {
      key: `label_${key}`,
      type: "text",
      text: label,
      x: COL_LABEL,
      y,
      fontSize: 10,
      bold: true,
      color: "#333333",
      center: false,
    },
    {
      key: `value_${key}_degree`,
      type: "text",
      text: degree,
      x: COL_VALUE,
      y,
      fontSize: 10,
      bold: true,
      color: "#000000",
      center: false,
    },
    {
      key: `value_${key}_details`,
      type: "text",
      text: details,
      x: COL_VALUE,
      y: y + 15,
      fontSize: 8.5,
      bold: false,
      color: "#666666",
      center: false,
    },
  ];
}

function courseField(key, sample, x, y) {
  return {
    key,
    type: "text",
    text: `• ${sample}`,
    x,
    y,
    fontSize: 9.5,
    bold: false,
    color: "#000000",
    center: false,
  };
}

let fields = [];
let pdfDoc = null;
let renderScale = 1;
let locatorOn = false;
let selectedKey = null;
let savedFileHandle = null;

const pdfCanvas = document.getElementById("pdf-canvas");
const overlayCanvas = document.getElementById("overlay");
const locatorCanvas = document.getElementById("locator-canvas");
const locatorBtn = document.getElementById("locator-btn");
const addFieldBtn = document.getElementById("add-field-btn");
const saveBtn = document.getElementById("save-positions-btn");
const resetBtn = document.getElementById("reset-positions-btn");
const coordLive = document.getElementById("coord-live");
const coordBadge = document.getElementById("coord-badge");
const bX = document.getElementById("b-x");
const bY = document.getElementById("b-y");
const fieldListEl = document.getElementById("field-list");
const fieldSearchEl = document.getElementById("field-search");

const editorEl = document.getElementById("field-editor");
const editorKeyEl = document.getElementById("field-editor-key");
const editorTextRow = document.getElementById("field-editor-text-row");
const editorTextEl = document.getElementById("field-editor-text");
const editorXEl = document.getElementById("field-editor-x");
const editorYEl = document.getElementById("field-editor-y");
const editorSizeRow = document.getElementById("field-editor-size-row");
const editorWEl = document.getElementById("field-editor-w");
const editorHEl = document.getElementById("field-editor-h");
const editorStyleRow = document.getElementById("field-editor-style-row");
const editorFontSizeEl = document.getElementById("field-editor-fontsize");
const editorColorEl = document.getElementById("field-editor-color");
const editorChecks = document.getElementById("field-editor-checks");
const editorBoldEl = document.getElementById("field-editor-bold");
const editorCenterEl = document.getElementById("field-editor-center");
const editorApplyBtn = document.getElementById("field-editor-apply");
const editorDeleteBtn = document.getElementById("field-editor-delete");

async function init() {
  fields = (await loadSavedPositionsFile()) || loadFromLocalStorage() || clone(DEFAULT_FIELDS);

  const loadingTask = pdfjsLib.getDocument("profile-cover.pdf");
  pdfDoc = await loadingTask.promise;

  await renderPage();
  populateFieldList();
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

async function renderPage() {
  const page = await pdfDoc.getPage(1);
  const containerWidth = Math.min(window.innerWidth - 380, 900);
  const scale = Math.max(0.5, containerWidth / PAGE_W);
  const viewport = page.getViewport({ scale });
  renderScale = scale;

  [pdfCanvas, overlayCanvas, locatorCanvas].forEach((c) => {
    c.width = viewport.width;
    c.height = viewport.height;
  });

  const ctx = pdfCanvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  drawOverlays();
}

function drawOverlays() {
  const ctx = overlayCanvas.getContext("2d");
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  fields.forEach((f) => {
    const selected = f.key === selectedKey;
    if (f.type === "photo") {
      const x = f.x * renderScale;
      const y = f.y * renderScale;
      const w = f.w * renderScale;
      const h = f.h * renderScale;
      ctx.fillStyle = "rgba(147,51,234,0.10)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = selected ? "#2563eb" : "#9333ea";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#7e22ce";
      ctx.font = "11px sans-serif";
      ctx.fillText("PHOTO", x + 4, y + 14);
    } else {
      const x = f.x * renderScale;
      const y = f.y * renderScale;
      ctx.font = `${f.bold ? "bold " : ""}${f.fontSize * renderScale}px Arial`;
      ctx.fillStyle = f.color || "#000000";
      ctx.textAlign = f.center ? "center" : "left";
      ctx.textBaseline = "top";
      const text = f.text || "(empty)";
      ctx.fillText(text, x, y);

      if (selected) {
        const w = ctx.measureText(text).width;
        const boxX = f.center ? x - w / 2 : x;
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX - 2, y - 2, w + 4, f.fontSize * renderScale + 4);
      }
    }
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function toPageCoords(e) {
  const rect = locatorCanvas.getBoundingClientRect();
  const scaleX = locatorCanvas.width / rect.width;
  const scaleY = locatorCanvas.height / rect.height;
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;
  return { x: canvasX / renderScale, y: canvasY / renderScale };
}

locatorBtn.addEventListener("click", () => {
  locatorOn = !locatorOn;
  locatorBtn.textContent = `📍 Locator: ${locatorOn ? "ON" : "OFF"}`;
  locatorCanvas.classList.toggle("inactive", !locatorOn);
  coordBadge.style.display = locatorOn ? "block" : "none";
});

locatorCanvas.addEventListener("mousemove", (e) => {
  const { x, y } = toPageCoords(e);
  bX.textContent = Math.round(x);
  bY.textContent = Math.round(y);
});

locatorCanvas.addEventListener("click", (e) => {
  const { x, y } = toPageCoords(e);
  createFieldAt(Math.round(x), Math.round(y));
});

addFieldBtn.addEventListener("click", () => createFieldAt(Math.round(PAGE_W / 2), Math.round(PAGE_H / 2)));

function createFieldAt(x, y) {
  const key = prompt("New field key (unique id, e.g. faculty_bio):");
  if (!key) return;
  if (fields.some((f) => f.key === key)) {
    alert("A field with that key already exists.");
    return;
  }
  const isPhoto = confirm("Is this a photo/image box?\n\nOK = photo box\nCancel = text field");
  const field = isPhoto
    ? { key, type: "photo", x, y, w: 150, h: 195 }
    : {
        key,
        type: "text",
        text: "Sample",
        x,
        y,
        fontSize: 11,
        bold: false,
        color: "#000000",
        center: false,
      };
  fields.push(field);
  selectedKey = key;
  drawOverlays();
  populateFieldList();
  selectField(field);
  debouncedSave();
}

function groupFor(key) {
  if (key === "photo") return "Photo";
  if (key.startsWith("course_")) return "Courses Handled";
  if (key.includes("education") || key.startsWith("label_undergraduate") || key.startsWith("value_undergraduate") || key.startsWith("label_masters") || key.startsWith("value_masters") || key.startsWith("label_doctorate") || key.startsWith("value_doctorate"))
    return "Education";
  if (
    key.startsWith("label_") ||
    (key.startsWith("value_") && !key.includes("undergraduate") && !key.includes("masters") && !key.includes("doctorate"))
  )
    return "Personal Information";
  return "Header";
}

function populateFieldList() {
  const query = fieldSearchEl.value.trim().toLowerCase();
  fieldListEl.innerHTML = "";

  const groups = ["Header", "Personal Information", "Education", "Courses Handled", "Photo"];
  groups.forEach((group) => {
    const items = fields.filter((f) => groupFor(f.key) === group && f.key.toLowerCase().includes(query));
    if (items.length === 0) return;

    const heading = document.createElement("div");
    heading.className = "field-group-heading";
    heading.textContent = group;
    fieldListEl.appendChild(heading);

    items.forEach((f) => {
      const li = document.createElement("li");
      li.className = "field-item" + (f.key === selectedKey ? " selected" : "");
      const keySpan = document.createElement("span");
      keySpan.className = "field-key";
      keySpan.textContent = f.key;
      const coordSpan = document.createElement("span");
      coordSpan.className = "field-coords";
      coordSpan.textContent = `${Math.round(f.x)},${Math.round(f.y)}`;
      li.appendChild(keySpan);
      li.appendChild(coordSpan);
      li.addEventListener("click", () => selectField(f));
      fieldListEl.appendChild(li);
    });
  });
}

fieldSearchEl.addEventListener("input", populateFieldList);

function selectField(field) {
  selectedKey = field.key;
  editorEl.classList.remove("hidden");
  editorKeyEl.textContent = field.key;

  const isPhoto = field.type === "photo";
  editorTextRow.classList.toggle("hidden", isPhoto);
  editorSizeRow.classList.toggle("hidden", !isPhoto);
  editorStyleRow.classList.toggle("hidden", isPhoto);
  editorChecks.classList.toggle("hidden", isPhoto);

  editorXEl.value = field.x;
  editorYEl.value = field.y;

  if (isPhoto) {
    editorWEl.value = field.w;
    editorHEl.value = field.h;
  } else {
    editorTextEl.value = field.text || "";
    editorFontSizeEl.value = field.fontSize;
    editorColorEl.value = field.color || "#000000";
    editorBoldEl.checked = !!field.bold;
    editorCenterEl.checked = !!field.center;
  }

  drawOverlays();
  populateFieldList();
}

function currentField() {
  return fields.find((f) => f.key === selectedKey) || null;
}

editorApplyBtn.addEventListener("click", () => {
  const field = currentField();
  if (!field) return;

  field.x = Number(editorXEl.value) || 0;
  field.y = Number(editorYEl.value) || 0;

  if (field.type === "photo") {
    field.w = Number(editorWEl.value) || field.w;
    field.h = Number(editorHEl.value) || field.h;
  } else {
    field.text = editorTextEl.value;
    field.fontSize = Number(editorFontSizeEl.value) || field.fontSize;
    field.color = editorColorEl.value;
    field.bold = editorBoldEl.checked;
    field.center = editorCenterEl.checked;
  }

  drawOverlays();
  populateFieldList();
  debouncedSave();
});

editorDeleteBtn.addEventListener("click", () => {
  const field = currentField();
  if (!field) return;
  if (!confirm(`Delete field "${field.key}"?`)) return;
  fields = fields.filter((f) => f.key !== field.key);
  selectedKey = null;
  editorEl.classList.add("hidden");
  drawOverlays();
  populateFieldList();
  debouncedSave();
});

// Live-nudge with arrow keys while a field is selected and focus isn't in an input.
window.addEventListener("keydown", (e) => {
  const field = currentField();
  if (!field) return;
  if (document.activeElement && ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  const step = e.shiftKey ? 10 : 1;
  let moved = true;
  if (e.key === "ArrowLeft") field.x -= step;
  else if (e.key === "ArrowRight") field.x += step;
  else if (e.key === "ArrowUp") field.y -= step;
  else if (e.key === "ArrowDown") field.y += step;
  else moved = false;

  if (moved) {
    e.preventDefault();
    editorXEl.value = field.x;
    editorYEl.value = field.y;
    drawOverlays();
    populateFieldList();
    debouncedSave();
  }
});

let saveTimer = null;
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToLocalStorage, 300);
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {
    // storage full/unavailable — not fatal, explicit Save button still works
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function loadSavedPositionsFile() {
  try {
    const res = await fetch("profile-positions.json", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {
    // no file yet, or not served over http — fall through to localStorage
  }
  return null;
}

saveBtn.addEventListener("click", () => savePositionsToFile());

async function savePositionsToFile() {
  const json = JSON.stringify(fields, null, 2);

  if (window.showSaveFilePicker) {
    try {
      if (!savedFileHandle) {
        savedFileHandle = await window.showSaveFilePicker({
          suggestedName: "profile-positions.json",
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        });
      }
      const writable = await savedFileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      flashMessage("✅ Saved to profile-positions.json");
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      console.warn("File System Access save failed, falling back to download", e);
    }
  }

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "profile-positions.json";
  a.click();
  URL.revokeObjectURL(url);
  flashMessage("⬇️ Downloaded profile-positions.json — place it next to index.js");
}

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset all fields to their default seed positions? This discards your edits.")) return;
  fields = clone(DEFAULT_FIELDS);
  selectedKey = null;
  editorEl.classList.add("hidden");
  drawOverlays();
  populateFieldList();
  saveToLocalStorage();
});

function flashMessage(msg) {
  coordLive.textContent = msg;
  setTimeout(() => {
    coordLive.textContent = "";
  }, 2500);
}

window.addEventListener("resize", () => renderPage());

// ==================== Sample PDF generation ====================
// Mirrors buildPdf() in pds-pdf.service.ts: rasterize the template page to
// canvas at 2x, draw every field on top at its point coordinates, embed the
// canvas as a JPEG into a jsPDF page, download.

async function downloadPDF() {
  const page = await pdfDoc.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;

  fields.forEach((f) => {
    if (f.type === "photo") return; // no sample image in this dev tool
    const x = f.x * scale;
    const y = f.y * scale;
    ctx.font = `${f.bold ? "bold " : ""}${f.fontSize * scale}px Arial`;
    ctx.fillStyle = f.color || "#000000";
    ctx.textAlign = f.center ? "center" : "left";
    ctx.textBaseline = "top";
    ctx.fillText(f.text || "", x, y);
  });
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const wPt = PAGE_W;
  const hPt = PAGE_H;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [wPt, hPt] });
  pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, wPt, hPt);
  pdf.save("faculty-profile-sample.pdf");
}

init();
