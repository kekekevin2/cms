// ─── DATA ─────────────────────────────────────────────────────
// Field names below mirror the real PersonalDataSheet model used by
// client/src/app/services/core/pds-pdf.service.ts, so overlay coordinates
// found here can be copied straight into that file's buildOverlays().
const data = {
	surname: "DELA CRUZ",
	first_name: "JUAN",
	middle_name: "SANTOS",
	name_extension: "Jr.",
	date_of_birth: "1995-01-15", // ISO yyyy-mm-dd, same shape as the API
	place_of_birth: "Manila, Philippines",
	sex: "Male",
	civil_status: "Single", // Single | Married | Widowed | Separated | other free text
	height: "170",
	weight: "65",
	blood_type: "O+",
	gsis_id_no: "1234567890",
	pag_ibig_id_no: "1234567890123",
	philhealth_no: "12-345678901-2",
	sss_no: "12-3456789-0",
	tin_no: "123-456-789-000",
	agency_employee_no: "asd",
	citizenship_type: "Filipino", // Filipino | Dual Citizenship | By Naturalization
	dual_citizenship_country: "",
	residential_house_no: "123",
	residential_street: "Sampaguita Street",
	residential_subdivision: "N/A",
	residential_barangay: "Barangay San Roque",
	residential_city: "Manila City",
	residential_province: "Metro Manila",
	residential_zip_code: "1000",
	permanent_house_no: "123",
	permanent_street: "Sampaguita Street",
	permanent_subdivision: "N/A",
	permanent_barangay: "Barangay San Roque",
	permanent_city: "Manila City",
	permanent_province: "Metro Manila",
	permanent_zip_code: "1000",
	telephone_no: "(02) 123-4567",
	mobile_no: "0917-123-4567",
	email_address: "juan.delacruz@email.com",
	photo_path: "cool-profile-picture-87h46gcobjl5e4xu.jpg",

	spouse_surname: "asd",
	spouse_first_name: "asdaasda",
	spouse_middle_name: "asdasd",
	spouse_name_ext: "sds",
	spouse_occupation: "aasdas",
	spouse_employer: "asdasd",
	spouse_business_address: "asdasdasdas",
	spouse_telephone: "asdasdas",

	father_surname: "DELA CRUZ",
	father_first_name: "PEDRO",
	father_middle_name: "REYES",
	father_name_ext: "sss",
	mother_surname: "sample",
	mother_first_name: "sample",
	mother_middle_name: "sample",

	government_issued_id: "Philippine Passport",
	government_id_number: "P1234567",
	government_id_date_issued: "2020-01-15",
	submitted_at: "2024-06-15",
};

const children = [
	{ child_name: "DELA CRUZ, MARIA ISABEL SANTOS", date_of_birth: "2020-01-15" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
	{ child_name: "DELA CRUZ, JOSE PEDRO SANTOS", date_of_birth: "2021-03-22" },
];

// One row per fixed education level, same shape/order as EDUCATION_LEVELS in pds-pdf.service.ts
const education = [
	{
		level: "ELEMENTARY",
		school_name: "Manila Elementary School",
		degree_course: "",
		period_from: 2001,
		period_to: 2007,
		year_graduated: 2007,
		scholarship_honors: "",
	},
	{
		level: "SECONDARY",
		school_name: "Manila High School",
		degree_course: "",
		period_from: 2007,
		period_to: 2011,
		year_graduated: 2011,
		scholarship_honors: "",
	},
	{
		level: "COLLEGE",
		school_name: "Batangas State University",
		degree_course: "Bachelor of Science in Computer Science",
		period_from: 2011,
		period_to: 2015,
		year_graduated: 2015,
		scholarship_honors: "Cum Laude",
	},
];

const eligibilities = [
	{
		career_service: "CS Professional",
		rating: "85.50",
		date_of_examination: "2015-03-15",
		place_of_examination: "Manila",
		license_number: "1234567",
		license_validity: "Lifetime",
	},
];

const work_experiences = [
	{
		date_from: "2015-06-01",
		date_to: "2018-12-31",
		position_title: "Junior Developer",
		department_agency: "IT Department",
		monthly_salary: "25000",
		salary_grade: "15",
		status_of_appointment: "Permanent",
		is_government_service: true,
	},
	{
		date_from: "2019-01-01",
		date_to: "Present",
		position_title: "Senior Developer",
		department_agency: "IT Department",
		monthly_salary: "45000",
		salary_grade: "20",
		status_of_appointment: "Permanent",
		is_government_service: true,
	},
];

const voluntary_works = [
	{
		organization_name: "Philippine Red Cross",
		date_from: "2020-01-01",
		date_to: "2020-12-31",
		number_of_hours: "120",
		position_nature_of_work: "Volunteer",
	},
];

const trainings = [
	{
		title: "Advanced Programming Workshop",
		date_from: "2020-01-15",
		date_to: "2020-01-20",
		number_of_hours: "40",
		type_of_ld: "Training",
		conducted_by: "DICT",
	},
];

const other_info = [
	{ info_type: "SKILL", details: "Programming" },
	{ info_type: "SKILL", details: "Database Management" },
	{ info_type: "SKILL", details: "Web Development" },
	{ info_type: "RECOGNITION", details: "Employee of the Month - March 2020" },
	{ info_type: "MEMBERSHIP", details: "Philippine Computer Society" },
];

const references = [
	{ name: "JOSE RIZAL", address: "456 Rizal Street, Calamba, Laguna", telephone_number: "0918-765-4321" },
	{ name: "ANDRES BONIFACIO", address: "789 Bonifacio Avenue, Tondo, Manila", telephone_number: "0919-876-5432" },
	{ name: "EMILIO AGUINALDO", address: "321 Aguinaldo Highway, Kawit, Cavite", telephone_number: "0920-987-6543" },
];

// Same 12-slot list (and same q42 omission) as the questions array in pds-pdf.service.ts's buildOverlays()
const questions = {
	q34_a_answer: false,
	q34_b_answer: false,
	q35_a_answer: false,
	q35_b_answer: false,
	q36_answer: false,
	q37_answer: false,
	q38_answer: false,
	q39_answer: false,
	q40_answer: false,
	q41_answer: false,
	q43_answer: false,
	q44_answer: false,
};

const EDUCATION_LEVELS = ["ELEMENTARY", "SECONDARY", "VOCATIONAL", "COLLEGE", "GRADUATE STUDIES"];
const CHECK = "✓";

// ─── HELPERS (match pds-pdf.service.ts) ────────────────────────
function formatDMY(value) {
	if (!value) return "";
	const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
	let year, month, day;
	if (isoMatch) {
		[, year, month, day] = isoMatch;
	} else {
		const d = new Date(value);
		if (isNaN(d.getTime())) return "";
		year = String(d.getFullYear());
		month = String(d.getMonth() + 1).padStart(2, "0");
		day = String(d.getDate()).padStart(2, "0");
	}
	if (!year) return "";
	return `${day}/${month}/${year}`;
}

function yn(value) {
	return value ? CHECK : "";
}

function civilStatusOther(status) {
	const standard = ["Single", "Married", "Widowed", "Separated"];
	return status && !standard.includes(status) ? status : "";
}

// ─── OVERLAYS ─────────────────────────────────────────────────
// Every field below carries a stable `key` (independent of x/y) so positions
// can be dragged, saved, and reloaded without losing track of which field is which.
// Structure mirrors buildOverlays() in pds-pdf.service.ts field-for-field.
function buildOverlays() {
	const list = [];
	const field = (key, page, x, y, text, opts = {}) => {
		list.push({ key, page, x, y, text, size: opts.size || 11, center: !!opts.center });
	};

	// PAGE 1 - Personal Information
	field("surname", 1, 135, 718, data.surname || "");
	field("first_name", 1, 135, 701, data.first_name || "");
	field("middle_name", 1, 135, 686, data.middle_name || "");
	field("name_extension", 1, 490, 701, data.name_extension || "");
	field("date_of_birth", 1, 135, 665, formatDMY(data.date_of_birth));
	field("place_of_birth", 1, 135, 645, data.place_of_birth || "");

	// Sex checkbox
	field("sex_checkbox", 1, data.sex === "Female" ? 210 : 137, 628, CHECK);

	// Civil status checkbox
	const civilStatusCoords = {
		Single: { x: 137, y: 613 },
		Married: { x: 210, y: 612 },
		Widowed: { x: 137, y: 602 },
		Separated: { x: 210, y: 602 },
	};
	const civilCoord = civilStatusCoords[data.civil_status] ?? { x: 137, y: 591 };
	field("civil_status_checkbox", 1, civilCoord.x, civilCoord.y, CHECK);
	field("civil_status_other", 1, 170, 591, civilStatusOther(data.civil_status));

	field("height", 1, 137, 573, data.height || "");
	field("weight", 1, 137, 557, data.weight || "");
	field("blood_type", 1, 137, 540, data.blood_type || "");
	field("gsis_id_no", 1, 137, 521, data.gsis_id_no || "");
	field("pag_ibig_id_no", 1, 137, 504, data.pag_ibig_id_no || "");
	field("philhealth_no", 1, 137, 485, data.philhealth_no || "");
	field("sss_no", 1, 137, 468, data.sss_no || "");
	field("tin_no", 1, 137, 450, data.tin_no || "");
	field("agency_employee_no", 1, 137, 433, data.agency_employee_no || "");

	// Citizenship — Filipino vs Dual Citizenship checkbox
	field("citizenship_checkbox", 1, data.citizenship_type === "Filipino" ? 375 : 423, 668, CHECK);

	// Dual citizenship sub-type — By Birth vs By Naturalization (only when not Filipino)
	if (data.citizenship_type !== "Filipino") {
		field(
			"citizenship_subtype_checkbox",
			1,
			data.citizenship_type === "By Naturalization" ? 476 : 436,
			658,
			CHECK,
		);
	}

	field("dual_citizenship_country", 1, 370, 625, data.dual_citizenship_country || "");

	// Residential Address
	field("residential_house_no", 1, 378, 612, data.residential_house_no || "", { center: true });
	field("residential_street", 1, 492, 612, data.residential_street || "", { center: true });
	field("residential_subdivision", 1, 378, 595, data.residential_subdivision || "", { center: true });
	field("residential_barangay", 1, 492, 595, data.residential_barangay || "", { center: true });
	field("residential_city", 1, 378, 577, data.residential_city || "", { center: true });
	field("residential_province", 1, 492, 577, data.residential_province || "", { center: true });
	field("residential_zip_code", 1, 439, 558, data.residential_zip_code || "", { center: true });

	// Permanent Address
	field("permanent_house_no", 1, 378, 543, data.permanent_house_no || "", { center: true });
	field("permanent_street", 1, 492, 543, data.permanent_street || "", { center: true });
	field("permanent_subdivision", 1, 378, 526, data.permanent_subdivision || "", { center: true });
	field("permanent_barangay", 1, 492, 526, data.permanent_barangay || "", { center: true });
	field("permanent_city", 1, 378, 508, data.permanent_city || "", { center: true });
	field("permanent_province", 1, 492, 508, data.permanent_province || "", { center: true });
	field("permanent_zip_code", 1, 439, 486, data.permanent_zip_code || "", { center: true });

	field("telephone_no", 1, 335, 468, data.telephone_no || "");
	field("mobile_no", 1, 335, 450, data.mobile_no || "");
	field("email_address", 1, 335, 433, data.email_address || "");

	// Spouse
	field("spouse_surname", 1, 135, 404, data.spouse_surname || "");
	field("spouse_first_name", 1, 135, 389, data.spouse_first_name || "");
	field("spouse_middle_name", 1, 135, 374, data.spouse_middle_name || "");
	field("spouse_name_ext", 1, 312, 389, data.spouse_name_ext || "");
	field("spouse_occupation", 1, 135, 359, data.spouse_occupation || "");
	field("spouse_employer", 1, 135, 344, data.spouse_employer || "");
	field("spouse_business_address", 1, 135, 329, data.spouse_business_address || "");
	field("spouse_telephone", 1, 135, 314, data.spouse_telephone || "");

	// Children (up to 12)
	children.slice(0, 12).forEach((child, i) => {
		field(`child_${i}_name`, 1, 334, 390 - i * 15.3, child.child_name || "");
		field(`child_${i}_dob`, 1, 480, 390 - i * 15.3, formatDMY(child.date_of_birth));
	});

	// Father / Mother
	field("father_surname", 1, 135, 298, data.father_surname || "");
	field("father_first_name", 1, 135, 283, data.father_first_name || "");
	field("father_middle_name", 1, 135, 268, data.father_middle_name || "");
	field("father_name_ext", 1, 312, 283, data.father_name_ext || "");
	field("mother_surname", 1, 135, 237, data.mother_surname || "");
	field("mother_first_name", 1, 135, 222, data.mother_first_name || "");
	field("mother_middle_name", 1, 135, 207, data.mother_middle_name || "");

	// Educational Background (fixed rows, one per level)
	EDUCATION_LEVELS.forEach((level, i) => {
		const edu = education.find((e) => e.level === level) || {};
		const y = 145 - i * 23;
		field(`edu_${level}_school`, 1, 135, y, edu.school_name || "");
		if (level === "VOCATIONAL" || level === "COLLEGE" || level === "GRADUATE STUDIES") {
			field(`edu_${level}_degree`, 1, 200, y, edu.degree_course || "");
		}
		field(`edu_${level}_from`, 1, 310, y, edu.period_from != null ? String(edu.period_from) : "");
		field(`edu_${level}_to`, 1, 350, y, edu.period_to != null ? String(edu.period_to) : "");
		field(`edu_${level}_gradyear`, 1, 395, y, edu.year_graduated != null ? String(edu.year_graduated) : "");
		field(`edu_${level}_honors`, 1, 450, y, edu.scholarship_honors || "");
	});

	// PAGE 2 - Civil Service Eligibility (up to 7)
	eligibilities.slice(0, 7).forEach((e, i) => {
		const y = 720 - i * 18;
		field(`eligibility_${i}_career`, 2, 92, y, e.career_service || "");
		field(`eligibility_${i}_rating`, 2, 230, y, e.rating || "");
		field(`eligibility_${i}_examdate`, 2, 290, y, formatDMY(e.date_of_examination));
		field(`eligibility_${i}_examplace`, 2, 360, y, e.place_of_examination || "");
		field(`eligibility_${i}_license`, 2, 450, y, e.license_number || "");
		field(`eligibility_${i}_validity`, 2, 510, y, e.license_validity || "");
	});

	// Work Experience (up to 28)
	work_experiences.slice(0, 28).forEach((w, i) => {
		const y = 590 - i * 18;
		field(`work_${i}_from`, 2, 92, y, formatDMY(w.date_from));
		field(
			`work_${i}_to`,
			2,
			135,
			y,
			w.date_to ? (w.date_to.toLowerCase() === "present" ? "Present" : formatDMY(w.date_to)) : "",
		);
		field(`work_${i}_position`, 2, 185, y, w.position_title || "");
		field(`work_${i}_department`, 2, 290, y, w.department_agency || "");
		field(`work_${i}_salary`, 2, 365, y, w.monthly_salary != null ? String(w.monthly_salary) : "");
		field(`work_${i}_grade`, 2, 415, y, w.salary_grade || "");
		field(`work_${i}_status`, 2, 450, y, w.status_of_appointment || "");
		field(`work_${i}_govt`, 2, 515, y, w.is_government_service ? "Y" : "N");
	});

	// PAGE 3 - Voluntary Work (up to 7)
	voluntary_works.slice(0, 7).forEach((v, i) => {
		const y = 830 - i * 18;
		field(`voluntary_${i}_org`, 3, 92, y, v.organization_name || "");
		field(`voluntary_${i}_from`, 3, 270, y, formatDMY(v.date_from));
		field(`voluntary_${i}_to`, 3, 310, y, formatDMY(v.date_to));
		field(`voluntary_${i}_hours`, 3, 360, y, v.number_of_hours != null ? String(v.number_of_hours) : "");
		field(`voluntary_${i}_position`, 3, 400, y, v.position_nature_of_work || "");
	});

	// Learning & Development (up to 11)
	trainings.slice(0, 11).forEach((l, i) => {
		const y = 680 - i * 18;
		field(`training_${i}_title`, 3, 92, y, l.title || "");
		field(`training_${i}_from`, 3, 280, y, formatDMY(l.date_from));
		field(`training_${i}_to`, 3, 320, y, formatDMY(l.date_to));
		field(`training_${i}_hours`, 3, 365, y, l.number_of_hours != null ? String(l.number_of_hours) : "");
		field(`training_${i}_type`, 3, 400, y, l.type_of_ld || "");
		field(`training_${i}_conducted_by`, 3, 450, y, l.conducted_by || "");
	});

	// Other Information
	other_info
		.filter((o) => o.info_type === "SKILL")
		.forEach((s, i) => field(`other_skill_${i}`, 3, 92, 480 - i * 18, s.details));
	other_info
		.filter((o) => o.info_type === "RECOGNITION")
		.forEach((r, i) => field(`other_recognition_${i}`, 3, 250, 480 - i * 18, r.details));
	other_info
		.filter((o) => o.info_type === "MEMBERSHIP")
		.forEach((m, i) => field(`other_membership_${i}`, 3, 430, 480 - i * 18, m.details));

	// PAGE 4 - Questions YES/NO checkmarks (same 12 slots as production; q42 intentionally has no row here)
	const questionRows = [
		{ key: "q34_a", answer: questions.q34_a_answer, y: 820 },
		{ key: "q34_b", answer: questions.q34_b_answer, y: 795 },
		{ key: "q35_a", answer: questions.q35_a_answer, y: 765 },
		{ key: "q35_b", answer: questions.q35_b_answer, y: 740 },
		{ key: "q36", answer: questions.q36_answer, y: 710 },
		{ key: "q37", answer: questions.q37_answer, y: 685 },
		{ key: "q38", answer: questions.q38_answer, y: 655 },
		{ key: "q39", answer: questions.q39_answer, y: 630 },
		{ key: "q40", answer: questions.q40_answer, y: 600 },
		{ key: "q41", answer: questions.q41_answer, y: 570 },
		{ key: "q43", answer: questions.q43_answer, y: 545 },
		{ key: "q44", answer: questions.q44_answer, y: 520 },
	];
	questionRows.forEach((q) => {
		field(`${q.key}_yes`, 4, 489, q.y, yn(q.answer));
		field(`${q.key}_no`, 4, 519, q.y, yn(q.answer === false));
	});

	// References
	references.slice(0, 3).forEach((r, i) => {
		const y = 420 - i * 20;
		field(`reference_${i}_name`, 4, 92, y, r.name || "");
		field(`reference_${i}_address`, 4, 280, y, r.address || "");
		field(`reference_${i}_telephone`, 4, 450, y, r.telephone_number || "");
	});

	// Government ID
	field("government_issued_id", 4, 92, 310, data.government_issued_id || "");
	field("government_id_number", 4, 280, 310, data.government_id_number || "");
	field("government_id_date_issued", 4, 450, 310, formatDMY(data.government_id_date_issued));

	// Date filled (production doesn't render a separate "place issued" field)
	field("submitted_at", 4, 92, 200, formatDMY(data.submitted_at));

	return list;
}

const overlays = buildOverlays();
const DEFAULT_POSITIONS = new Map(overlays.map((o) => [o.key, { x: o.x, y: o.y, center: o.center }]));

// ─── POSITION PERSISTENCE ──────────────────────────────────────
// Positions are kept as part of each overlay object so edits can mutate them in
// place. Primary storage is the standalone server in pds/server/ (its own SQLite
// database — see pds/server/index.js). If that server isn't running, positions
// still auto-save to localStorage / overlay-positions.json so the tool keeps working.
const STORAGE_KEY = "pds_overlay_positions_v1";
// Relative path — works locally (open http://localhost:2100/ once pds/server is running)
// and once deployed (same server serves both this page and the API, same origin).
const DB_API = "/api/positions";
let savedFileHandle = null;

function applyPositions(list) {
	if (!Array.isArray(list)) return;
	const map = new Map(list.map((p) => [p.key, p]));
	overlays.forEach((o) => {
		const saved = map.get(o.key);
		if (saved) {
			o.x = saved.x;
			o.y = saved.y;
			if (saved.center !== undefined) o.center = !!saved.center;
		}
	});
}

async function loadPositionsFromDb() {
	try {
		const res = await fetch(DB_API, { cache: "no-store" });
		if (res.ok) {
			const rows = await res.json();
			if (Array.isArray(rows) && rows.length) return rows;
		}
	} catch {
		// pds/server isn't running — fall through to file/localStorage
	}
	return null;
}

async function saveFieldToDb(field) {
	try {
		const res = await fetch(DB_API, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ key: field.key, x: field.x, y: field.y, center: !!field.center }),
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function saveAllToDb() {
	try {
		const snapshot = overlays.map((o) => ({ key: o.key, x: o.x, y: o.y, center: !!o.center }));
		const res = await fetch(`${DB_API}/bulk`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(snapshot),
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function clearDbPositions() {
	try {
		await fetch(DB_API, { method: "DELETE" });
	} catch {
		// server not running — nothing to clear
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

function saveToLocalStorage() {
	try {
		const snapshot = overlays.map((o) => ({ key: o.key, x: o.x, y: o.y, center: !!o.center }));
		localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
	} catch {
		// storage full/unavailable — not fatal, explicit Save button still works
	}
}

async function loadSavedPositionsFile() {
	try {
		const res = await fetch("overlay-positions.json", { cache: "no-store" });
		if (res.ok) return await res.json();
	} catch {
		// no file yet, or not served over http — fall through to localStorage
	}
	return null;
}

async function savePositionsToFile() {
	const snapshot = overlays.map((o) => ({ key: o.key, x: o.x, y: o.y, center: !!o.center }));
	const json = JSON.stringify(snapshot, null, 2);

	if (window.showSaveFilePicker) {
		try {
			if (!savedFileHandle) {
				savedFileHandle = await window.showSaveFilePicker({
					suggestedName: "overlay-positions.json",
					types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
				});
			}
			const writable = await savedFileHandle.createWritable();
			await writable.write(json);
			await writable.close();
			flashMessage("✅ Saved to overlay-positions.json");
			return;
		} catch (e) {
			if (e && e.name === "AbortError") return; // user cancelled the picker
			console.warn("File System Access save failed, falling back to download", e);
		}
	}

	// Fallback for browsers without the File System Access API: plain download.
	const blob = new Blob([json], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "overlay-positions.json";
	a.click();
	URL.revokeObjectURL(url);
	flashMessage("⬇️ Downloaded overlay-positions.json — place it next to index.js");
}

function resetPositions() {
	overlays.forEach((o) => {
		const def = DEFAULT_POSITIONS.get(o.key);
		if (def) {
			o.x = def.x;
			o.y = def.y;
			o.center = def.center;
		}
	});
	localStorage.removeItem(STORAGE_KEY);
	clearDbPositions();
	if (pdfDoc) renderPage(currentPage);
	flashMessage("↺ Reset to hardcoded defaults");
}

function flashMessage(msg) {
	coordLive.textContent = msg;
	setTimeout(() => {
		if (coordLive.textContent === msg) coordLive.textContent = "";
	}, 1800);
}

// ─── PHOTO ────────────────────────────────────────────────────
// x/y = bottom-left of the 1x1" picture box in PDF points (72pt = 1 inch)
// Adjust x/y using the Locator tool
const PHOTO_BOX = { x: 500, y: 750, size: 96 };
const photoImage = new Image();
photoImage.src = data.photo_path;
photoImage.onload = () => {
	if (pdfDoc) {
		pdfDoc.getPage(currentPage).then((page) => {
			const viewport = page.getViewport({ scale: 1.5 });
			drawOverlays(currentPage, viewport);
		});
	}
};

pdfjsLib.GlobalWorkerOptions.workerSrc =
	"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfCanvas = document.getElementById("pdf-canvas");
const overlayCanvas = document.getElementById("overlay");
const pdfCtx = pdfCanvas.getContext("2d");
const oCtx = overlayCanvas.getContext("2d");
const pageInfo = document.getElementById("page-info");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

let pdfDoc = null,
	currentPage = 1,
	currentViewport = null;

Promise.all([pdfjsLib.getDocument("PDS-template.pdf").promise, loadPositionsFromDb()]).then(
	async ([doc, dbPositions]) => {
		pdfDoc = doc;
		const positions = dbPositions || (await loadSavedPositionsFile()) || loadFromLocalStorage();
		applyPositions(positions);
		renderPage(currentPage);
	},
);

function renderPage(num) {
	pdfDoc.getPage(num).then((page) => {
		const viewport = page.getViewport({ scale: 1.5 });
		currentViewport = viewport;
		pdfCanvas.width = overlayCanvas.width = viewport.width;
		pdfCanvas.height = overlayCanvas.height = viewport.height;
		page
			.render({ canvasContext: pdfCtx, viewport })
			.promise.then(() => drawOverlays(num, viewport));
		pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
		prevBtn.disabled = num <= 1;
		nextBtn.disabled = num >= pdfDoc.numPages;
	});
}

function drawOverlays(pageNum, viewport) {
	oCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
	overlays
		.filter((f) => f.page === pageNum)
		.forEach((f) => {
			const s = viewport.scale;
			const cx = f.x * s;
			const cy = viewport.height - f.y * s;
			oCtx.font = `${((f.size || 11) * s) / 1.5}px 'Times New Roman', Times, serif`;
			oCtx.fillStyle = f.color || "#000";
			oCtx.textAlign = f.center ? "center" : "left";
			oCtx.fillText(f.text, cx, cy);
		});
	oCtx.textAlign = "left";

	// Draw photo if uploaded (page 1 only)
	if (photoImage && pageNum === 1) {
		const s = viewport.scale;
		const sizePx = PHOTO_BOX.size * s;
		const cx = PHOTO_BOX.x * s;
		const cy = viewport.height - PHOTO_BOX.y * s;
		oCtx.drawImage(photoImage, cx, cy, sizePx, sizePx);
	}

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
}

prevBtn.addEventListener("click", () => {
	if (currentPage > 1) renderPage(--currentPage);
});
nextBtn.addEventListener("click", () => {
	if (currentPage < pdfDoc.numPages) renderPage(++currentPage);
});

// ─── COORDINATE LOCATOR ───────────────────────────────────────
const locatorCanvas = document.getElementById("locator-canvas");
const lCtx = locatorCanvas.getContext("2d");
const locatorBtn = document.getElementById("locator-btn");
const coordLive = document.getElementById("coord-live");
const badge = document.getElementById("coord-badge");
const bx = document.getElementById("b-x");
const by = document.getElementById("b-y");
let locatorOn = false;

function syncLocatorSize() {
	locatorCanvas.width = pdfCanvas.width;
	locatorCanvas.height = pdfCanvas.height;
}

locatorBtn.addEventListener("click", () => {
	locatorOn = !locatorOn;
	if (locatorOn && editOn) setEditMode(false);
	locatorBtn.textContent = `📍 Locator: ${locatorOn ? "ON" : "OFF"}`;
	locatorBtn.style.background = locatorOn ? "#dc2626" : "#0f766e";
	locatorCanvas.classList.toggle("inactive", !locatorOn && !editOn);
	if (!locatorOn) {
		lCtx.clearRect(0, 0, locatorCanvas.width, locatorCanvas.height);
		coordLive.textContent = "";
		badge.style.display = "none";
	}
});

locatorCanvas.addEventListener("mousemove", (e) => {
	if (!locatorOn || !pdfDoc) return;
	syncLocatorSize();
	const { px, py, cx, cy } = toPageCoords(e);
	coordLive.textContent = `x: ${px}  y: ${py}`;
	bx.textContent = px;
	by.textContent = py;
	badge.style.display = "block";
	lCtx.clearRect(0, 0, locatorCanvas.width, locatorCanvas.height);
	lCtx.strokeStyle = "rgba(220, 38, 38, 0.7)";
	lCtx.lineWidth = 1;
	lCtx.setLineDash([4, 4]);
	lCtx.beginPath();
	lCtx.moveTo(cx, 0);
	lCtx.lineTo(cx, locatorCanvas.height);
	lCtx.stroke();
	lCtx.beginPath();
	lCtx.moveTo(0, cy);
	lCtx.lineTo(locatorCanvas.width, cy);
	lCtx.stroke();
	lCtx.setLineDash([]);
	lCtx.fillStyle = "rgba(220, 38, 38, 0.9)";
	lCtx.beginPath();
	lCtx.arc(cx, cy, 4, 0, Math.PI * 2);
	lCtx.fill();
});

locatorCanvas.addEventListener("click", (e) => {
	if (!locatorOn || !pdfDoc) return;
	const { px, py } = toPageCoords(e);
	const snippet = `{ page: ${currentPage}, x: ${px}, y: ${py}, text: "", size: 11 },`;
	navigator.clipboard.writeText(snippet).then(() => {
		coordLive.textContent = `✅ Copied: x:${px} y:${py}`;
		setTimeout(() => (coordLive.textContent = ""), 1500);
	});
	console.log(snippet);
	badge.style.background = "#15803d";
	setTimeout(() => (badge.style.background = "#1a1a2e"), 600);
});

locatorCanvas.addEventListener("mouseleave", () => {
	if (!locatorOn) return;
	lCtx.clearRect(0, 0, locatorCanvas.width, locatorCanvas.height);
	coordLive.textContent = "";
	badge.style.display = "none";
});

function toPageCoords(e) {
	const rect = locatorCanvas.getBoundingClientRect();
	const scale = locatorCanvas.width / rect.width;
	const cx = (e.clientX - rect.left) * scale;
	const cy = (e.clientY - rect.top) * scale;
	const px = Math.round(cx / 1.5);
	const py = Math.round((locatorCanvas.height - cy) / 1.5);
	return { px, py, cx, cy };
}

// ─── FIELD LIST SIDEBAR ─────────────────────────────────────────
// Lets you pick a field by name (instead of hunting for it on the page),
// then click anywhere on the page to place it there.
const fieldListEl = document.getElementById("field-list");
const fieldSearchEl = document.getElementById("field-search");

function categoryFor(key) {
	if (key.startsWith("child_")) return "Children";
	if (key.startsWith("spouse_")) return "Spouse";
	if (key.startsWith("father_") || key.startsWith("mother_")) return "Father / Mother";
	if (key.startsWith("edu_")) return "Educational Background";
	if (key.startsWith("eligibility_")) return "Civil Service Eligibility";
	if (key.startsWith("work_")) return "Work Experience";
	if (key.startsWith("voluntary_")) return "Voluntary Work";
	if (key.startsWith("training_")) return "Learning & Development";
	if (key.startsWith("other_")) return "Other Information";
	if (key.startsWith("reference_")) return "References";
	if (/^q(3[4-9]|4[0-4])/.test(key)) return "Questions 34-44";
	if (key.startsWith("residential_")) return "Residential Address";
	if (key.startsWith("permanent_")) return "Permanent Address";
	if (key.startsWith("government_") || key === "submitted_at") return "Government ID / Date";
	if (["citizenship_checkbox", "citizenship_subtype_checkbox", "dual_citizenship_country"].includes(key))
		return "Citizenship";
	if (["sex_checkbox", "civil_status_checkbox", "civil_status_other"].includes(key))
		return "Sex / Civil Status";
	return "Personal Information";
}

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
			coordSpan.textContent = `p${f.page} · ${f.x},${f.y}`;
			li.appendChild(keySpan);
			li.appendChild(coordSpan);
			li.addEventListener("click", () => selectField(f));
			fieldListEl.appendChild(li);
		});
	});
}

function updateSidebarCoords(field) {
	const li = fieldListEl.querySelector(`.field-item[data-key="${CSS.escape(field.key)}"]`);
	if (li) li.querySelector(".field-coords").textContent = `p${field.page} · ${field.x},${field.y}`;
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
	coordLive.textContent = `${field.key} — x:${field.x} y:${field.y} (click on the page to place it)`;
}

fieldSearchEl.addEventListener("input", () => {
	const q = fieldSearchEl.value.trim().toLowerCase();
	let lastHeading = null;
	let headingHasVisibleItem = false;
	fieldListEl.querySelectorAll("li").forEach((li) => {
		if (li.classList.contains("field-group-heading")) {
			if (lastHeading) lastHeading.style.display = headingHasVisibleItem ? "" : "none";
			lastHeading = li;
			headingHasVisibleItem = false;
			return;
		}
		const match = !q || li.dataset.key.toLowerCase().includes(q);
		li.style.display = match ? "" : "none";
		if (match) headingHasVisibleItem = true;
	});
	if (lastHeading) lastHeading.style.display = headingHasVisibleItem ? "" : "none";
});

populateFieldList();

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
		locatorBtn.textContent = "📍 Locator: OFF";
		locatorBtn.style.background = "#0f766e";
	}
	editBtn.textContent = `✏️ Edit Positions: ${editOn ? "ON" : "OFF"}`;
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
		flashMessage("✅ All positions saved to DB");
	} else {
		await savePositionsToFile();
	}
});
resetBtn.addEventListener("click", () => {
	if (confirm("Reset all field positions back to the hardcoded defaults?")) resetPositions();
});

// Approximate bounding box (in page-point space) of a rendered field — only used to draw its highlight box.
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
	coordLive.textContent = `${selectedField.key} — x:${px} y:${py} (${center ? "centered" : "left"}), saving...`;

	// Always keep a local safety net, then try the standalone DB server.
	saveToLocalStorage();
	const savedToDb = await saveFieldToDb(selectedField);
	if (savedToDb) {
		flashMessage(`✅ ${selectedField.key} saved to DB`);
	} else {
		await savePositionsToFile();
	}
});

// ─── DOWNLOAD ─────────────────────────────────────────────────
async function downloadPDF() {
	const { jsPDF } = window.jspdf;
	let pdf = null;
	for (let p = 1; p <= pdfDoc.numPages; p++) {
		const page = await pdfDoc.getPage(p);
		const viewport = page.getViewport({ scale: 2 });
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		canvas.width = viewport.width;
		canvas.height = viewport.height;
		await page.render({ canvasContext: ctx, viewport }).promise;
		overlays
			.filter((f) => f.page === p)
			.forEach((f) => {
				const s = viewport.scale;
				const cx = f.x * s;
				const cy = viewport.height - f.y * s;
				ctx.font = `${((f.size || 11) * s) / 1.5}px Times New Roman`;
				ctx.fillStyle = "#000";
				ctx.textAlign = f.center ? "center" : "left";
				ctx.fillText(f.text, cx, cy);
			});
		ctx.textAlign = "left";
		// Bake photo into download if uploaded
		if (photoImage && p === 1) {
			const s = viewport.scale;
			const sizePx = PHOTO_BOX.size * s;
			const cx = PHOTO_BOX.x * s;
			const cy = viewport.height - PHOTO_BOX.y * s;
			ctx.drawImage(photoImage, cx, cy, sizePx, sizePx);
		}
		const rawViewport = page.getViewport({ scale: 1 });
		const wPt = rawViewport.width * 0.75;
		const hPt = rawViewport.height * 0.75;
		if (p === 1) {
			pdf = new jsPDF({
				orientation: hPt > wPt ? "portrait" : "landscape",
				unit: "pt",
				format: [wPt, hPt],
			});
		} else {
			pdf.addPage([wPt, hPt], hPt > wPt ? "portrait" : "landscape");
		}
		pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, wPt, hPt);
	}
	pdf.save("PDS_Personal_Data_Sheet.pdf");
}
