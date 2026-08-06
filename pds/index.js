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
	photo_path: "pasport.jpg",

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
	signature_path: "e-signature.png", // dev placeholder — swap for a real signature image on disk
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
	{
		career_service: "CS Sub-Professional",
		rating: "82.30",
		date_of_examination: "2013-08-11",
		place_of_examination: "Quezon City",
		license_number: "7654321",
		license_validity: "N/A",
	},
	{
		career_service: "CSC Honor Graduate",
		rating: "90.00",
		date_of_examination: "2015-04-20",
		place_of_examination: "Manila",
		license_number: "1111222",
		license_validity: "N/A",
	},
	{
		career_service: "RA 1080 (Board/Bar)",
		rating: "88.75",
		date_of_examination: "2016-05-10",
		place_of_examination: "Batangas City",
		license_number: "2223334",
		license_validity: "Lifetime",
	},
	{
		career_service: "Barangay Official Eligibility",
		rating: "N/A",
		date_of_examination: "2017-10-29",
		place_of_examination: "Manila",
		license_number: "3334445",
		license_validity: "N/A",
	},
	{
		career_service: "Skills Test (Driver)",
		rating: "84.00",
		date_of_examination: "2018-02-14",
		place_of_examination: "Quezon City",
		license_number: "4445556",
		license_validity: "2028-02-14",
	},
	{
		career_service: "CS Sub-Professional",
		rating: "80.50",
		date_of_examination: "2012-08-12",
		place_of_examination: "Batangas City",
		license_number: "5556667",
		license_validity: "N/A",
	},
];

// Position/department/status cycle for generating 28 sample rows (matches the
// work_experiences.slice(0, 28) cap in buildOverlays()).
const WORK_POSITIONS = [
	"Junior Developer",
	"Software Engineer",
	"Senior Developer",
	"Team Lead",
	"IT Officer",
	"Systems Analyst",
	"Project Coordinator",
	"Database Administrator",
	"Network Administrator",
	"QA Tester",
	"Business Analyst",
	"Technical Writer",
	"IT Consultant",
	"Software Architect",
	"DevOps Engineer",
	"Support Specialist",
	"Web Developer",
	"Mobile Developer",
	"Data Analyst",
	"IT Manager",
	"Solutions Engineer",
	"Application Developer",
	"Infrastructure Engineer",
	"Security Analyst",
	"Cloud Engineer",
	"Automation Engineer",
	"Release Manager",
	"Senior IT Manager",
];
const WORK_DEPARTMENTS = [
	"IT Department",
	"Systems Office",
	"MIS Department",
	"ICT Office",
	"Records Office",
];
const WORK_STATUSES = ["Permanent", "Temporary", "Casual", "Contractual"];

const work_experiences = Array.from({ length: 28 }, (_, i) => {
	const yearFrom = 1995 + i;
	const isLast = i === 27;
	return {
		date_from: `${yearFrom}-01-01`,
		date_to: isLast ? "Present" : `${yearFrom + 1}-12-31`,
		position_title: WORK_POSITIONS[i % WORK_POSITIONS.length],
		department_agency: WORK_DEPARTMENTS[i % WORK_DEPARTMENTS.length],
		status_of_appointment: WORK_STATUSES[i % WORK_STATUSES.length],
		is_government_service: i % 3 !== 0,
	};
});

// Org/position cycle for generating 7 sample rows (matches the
// voluntary_works.slice(0, 7) cap in buildOverlays()).
const VOLUNTARY_ORGS = [
	"Philippine Red Cross",
	"Habitat for Humanity",
	"Gawad Kalinga",
	"World Wildlife Fund Philippines",
	"Batangas State University Alumni Foundation",
	"Rotary Club of Batangas",
	"Philippine National Red Cross Youth Council",
];
const VOLUNTARY_POSITIONS = [
	"Volunteer",
	"Site Volunteer",
	"Team Leader",
	"Community Organizer",
	"Program Volunteer",
	"Project Coordinator",
	"Relief Operations Volunteer",
];

const voluntary_works = Array.from({ length: 7 }, (_, i) => {
	const yearFrom = 2018 + i;
	return {
		organization_name: VOLUNTARY_ORGS[i % VOLUNTARY_ORGS.length],
		date_from: `${yearFrom}-01-01`,
		date_to: `${yearFrom}-12-15`,
		number_of_hours: String(40 + i * 15),
		position_nature_of_work:
			VOLUNTARY_POSITIONS[i % VOLUNTARY_POSITIONS.length],
	};
});

// Title/type/conductor cycle for generating 21 sample rows (matches the
// trainings.slice(0, 21) cap in buildOverlays()).
const TRAINING_TITLES = [
	"Advanced Programming Workshop",
	"Project Management Fundamentals",
	"Cybersecurity Awareness Training",
	"Data Privacy Act Orientation",
	"Effective Business Communication",
	"Leadership and Management Development",
	"Customer Service Excellence",
	"Records Management Seminar",
	"Financial Management for Non-Financial Managers",
	"Public Speaking and Presentation Skills",
	"Strategic Planning Workshop",
	"Basic Occupational Safety and Health Training",
	"Gender and Development Orientation",
	"Values Formation and Ethics Seminar",
	"Disaster Risk Reduction and Management Training",
	"ICT Skills Enhancement Training",
	"Report Writing and Documentation Workshop",
	"Supervisory Development Course",
	"Anti-Red Tape Act Orientation",
	"Knowledge Management Seminar",
	"Change Management Workshop",
];
const TRAINING_TYPES = ["Training", "Seminar", "Workshop", "Conference"];
const TRAINING_CONDUCTORS = ["DICT", "CSC", "DBM", "BatStateU HRDO"];

const trainings = Array.from({ length: 21 }, (_, i) => {
	const yearFrom = 2015 + i;
	return {
		title: TRAINING_TITLES[i % TRAINING_TITLES.length],
		date_from: `${yearFrom}-01-15`,
		date_to: `${yearFrom}-01-20`,
		number_of_hours: String(16 + i * 4),
		type_of_ld: TRAINING_TYPES[i % TRAINING_TYPES.length],
		conducted_by: TRAINING_CONDUCTORS[i % TRAINING_CONDUCTORS.length],
	};
});

const other_info = [
	{ info_type: "SKILL", details: "Programming" },
	{ info_type: "SKILL", details: "Database Management" },
	{ info_type: "SKILL", details: "Web Development" },
	{ info_type: "SKILL", details: "Network Administration" },
	{ info_type: "SKILL", details: "Technical Writing" },
	{ info_type: "SKILL", details: "Public Speaking" },
	{ info_type: "SKILL", details: "Graphic Design" },
	{ info_type: "RECOGNITION", details: "Employee of the Month - March 2020" },
	{ info_type: "RECOGNITION", details: "Best in Service Award - 2020" },
	{ info_type: "RECOGNITION", details: "Outstanding Employee - 2021" },
	{ info_type: "RECOGNITION", details: "Loyalty Award (5 Years) - 2022" },
	{ info_type: "RECOGNITION", details: "Innovation Award - 2022" },
	{ info_type: "RECOGNITION", details: "Perfect Attendance Award - 2023" },
	{ info_type: "RECOGNITION", details: "Excellence in Public Service - 2024" },
	{ info_type: "MEMBERSHIP", details: "Philippine Computer Society" },
	{ info_type: "MEMBERSHIP", details: "Philippine Society of IT Educators" },
	{ info_type: "MEMBERSHIP", details: "Computing Society of the Philippines" },
	{ info_type: "MEMBERSHIP", details: "Philippine Statistical Association" },
	{
		info_type: "MEMBERSHIP",
		details: "Batangas State University Alumni Association",
	},
	{ info_type: "MEMBERSHIP", details: "Data Privacy Officers Network" },
	{
		info_type: "MEMBERSHIP",
		details: "Junior Chamber International Philippines",
	},
];

const references = [
	{
		name: "JOSE RIZAL",
		address: "456 Rizal Street, Calamba, Laguna",
		telephone_number: "0918-765-4321",
	},
	{
		name: "ANDRES BONIFACIO",
		address: "789 Bonifacio Avenue, Tondo, Manila",
		telephone_number: "0919-876-5432",
	},
	{
		name: "EMILIO AGUINALDO",
		address: "321 Aguinaldo Highway, Kawit, Cavite",
		telephone_number: "0920-987-6543",
	},
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

// Civil Service Eligibility grid: row 0 is the anchor. ROW_HEIGHT is the
// vertical gap between rows — change it here if rows need to be tighter/looser.
const ELIGIBILITY_ROWS = 7;
const ELIGIBILITY_BASE_Y = 720;
const ELIGIBILITY_ROW_HEIGHT = 20;
const ELIGIBILITY_COLUMNS = [
	"career",
	"rating",
	"examdate",
	"examplace",
	"license",
	"validity",
];

// Work Experience grid: same row-0-is-the-anchor scheme as eligibility.
const WORK_ROWS = 28;
const WORK_BASE_Y = 590;
const WORK_ROW_HEIGHT = 18.55;
const WORK_COLUMNS = ["from", "to", "position", "department", "status", "govt"];

// Voluntary Work grid: same row-0-is-the-anchor scheme as eligibility/work.
const VOLUNTARY_ROWS = 7;
const VOLUNTARY_BASE_Y = 830;
const VOLUNTARY_ROW_HEIGHT = 19.5;
const VOLUNTARY_COLUMNS = ["org", "from", "to", "hours", "position"];

// Learning & Development grid: same row-0-is-the-anchor scheme as the others.
const TRAINING_ROWS = 21;
const TRAINING_BASE_Y = 680;
const TRAINING_ROW_HEIGHT = 17;
const TRAINING_COLUMNS = [
	"title",
	"from",
	"to",
	"hours",
	"type",
	"conducted_by",
];

// Other Information — Skills / Recognition / Membership grids: same
// row-0-is-the-anchor scheme as the others. Single-column grids (just the
// "text" field), unlike the multi-column ones above. Recognition and
// Membership share the same base y / row height as Skills since they're
// meant to sit at the same vertical position, just in a different column.
const OTHER_SKILL_ROWS = 7;
const OTHER_SKILL_BASE_Y = 480;
const OTHER_SKILL_ROW_HEIGHT = 18;
const OTHER_SKILL_COLUMNS = ["text"];

const OTHER_RECOGNITION_ROWS = 7;
const OTHER_RECOGNITION_BASE_Y = OTHER_SKILL_BASE_Y;
const OTHER_RECOGNITION_ROW_HEIGHT = OTHER_SKILL_ROW_HEIGHT;
const OTHER_RECOGNITION_COLUMNS = ["text"];

const OTHER_MEMBERSHIP_ROWS = 7;
const OTHER_MEMBERSHIP_BASE_Y = OTHER_SKILL_BASE_Y;
const OTHER_MEMBERSHIP_ROW_HEIGHT = OTHER_SKILL_ROW_HEIGHT;
const OTHER_MEMBERSHIP_COLUMNS = ["text"];

// References grid: same row-0-is-the-anchor scheme as the others.
const REFERENCE_ROWS = 3;
const REFERENCE_BASE_Y = 420;
const REFERENCE_ROW_HEIGHT = 20;
const REFERENCE_COLUMNS = ["name", "address", "telephone"];

const EDUCATION_LEVELS = [
	"ELEMENTARY",
	"SECONDARY",
	"VOCATIONAL",
	"COLLEGE",
	"GRADUATE STUDIES",
];
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
	field(
		"citizenship_checkbox",
		1,
		data.citizenship_type === "Filipino" ? 375 : 423,
		668,
		CHECK,
	);

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

	field(
		"dual_citizenship_country",
		1,
		370,
		625,
		data.dual_citizenship_country || "",
	);

	// Residential Address
	field("residential_house_no", 1, 378, 612, data.residential_house_no || "", {
		center: true,
	});
	field("residential_street", 1, 492, 612, data.residential_street || "", {
		center: true,
	});
	field(
		"residential_subdivision",
		1,
		378,
		595,
		data.residential_subdivision || "",
		{ center: true },
	);
	field("residential_barangay", 1, 492, 595, data.residential_barangay || "", {
		center: true,
	});
	field("residential_city", 1, 378, 577, data.residential_city || "", {
		center: true,
	});
	field("residential_province", 1, 492, 577, data.residential_province || "", {
		center: true,
	});
	field("residential_zip_code", 1, 439, 558, data.residential_zip_code || "", {
		center: true,
	});

	// Permanent Address
	field("permanent_house_no", 1, 378, 543, data.permanent_house_no || "", {
		center: true,
	});
	field("permanent_street", 1, 492, 543, data.permanent_street || "", {
		center: true,
	});
	field(
		"permanent_subdivision",
		1,
		378,
		526,
		data.permanent_subdivision || "",
		{ center: true },
	);
	field("permanent_barangay", 1, 492, 526, data.permanent_barangay || "", {
		center: true,
	});
	field("permanent_city", 1, 378, 508, data.permanent_city || "", {
		center: true,
	});
	field("permanent_province", 1, 492, 508, data.permanent_province || "", {
		center: true,
	});
	field("permanent_zip_code", 1, 439, 486, data.permanent_zip_code || "", {
		center: true,
	});

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
	field(
		"spouse_business_address",
		1,
		135,
		329,
		data.spouse_business_address || "",
	);
	field("spouse_telephone", 1, 135, 314, data.spouse_telephone || "");

	// Children (up to 12)
	children.slice(0, 12).forEach((child, i) => {
		field(`child_${i}_name`, 1, 334, 390 - i * 15.3, child.child_name || "");
		field(
			`child_${i}_dob`,
			1,
			480,
			390 - i * 15.3,
			formatDMY(child.date_of_birth),
		);
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
		if (
			level === "VOCATIONAL" ||
			level === "COLLEGE" ||
			level === "GRADUATE STUDIES"
		) {
			field(`edu_${level}_degree`, 1, 190, y, edu.degree_course || "", {
				maxWidth: 105,
				overflow: "shrink",
			});
		}
		field(
			`edu_${level}_from`,
			1,
			310,
			y,
			edu.period_from != null ? String(edu.period_from) : "",
		);
		field(
			`edu_${level}_to`,
			1,
			350,
			y,
			edu.period_to != null ? String(edu.period_to) : "",
		);
		field(
			`edu_${level}_gradyear`,
			1,
			395,
			y,
			edu.year_graduated != null ? String(edu.year_graduated) : "",
		);
		field(`edu_${level}_honors`, 1, 450, y, edu.scholarship_honors || "");
	});

	// PAGE 2 - Civil Service Eligibility (up to 7)
	// Row 0 is the anchor — editing it on the site cascades to rows 1-6 (see
	// cascadeEligibilityFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	eligibilities.slice(0, ELIGIBILITY_ROWS).forEach((e, i) => {
		const y = ELIGIBILITY_BASE_Y - i * ELIGIBILITY_ROW_HEIGHT;
		field(`eligibility_${i}_career`, 2, 92, y, e.career_service || "");
		field(`eligibility_${i}_rating`, 2, 230, y, e.rating || "");
		field(
			`eligibility_${i}_examdate`,
			2,
			290,
			y,
			formatDMY(e.date_of_examination),
		);
		field(
			`eligibility_${i}_examplace`,
			2,
			360,
			y,
			e.place_of_examination || "",
		);
		field(`eligibility_${i}_license`, 2, 450, y, e.license_number || "");
		field(`eligibility_${i}_validity`, 2, 510, y, e.license_validity || "");
	});

	// Work Experience (up to 28)
	// Row 0 is the anchor — editing it on the site cascades to rows 1-27 (see
	// cascadeWorkFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	work_experiences.slice(0, WORK_ROWS).forEach((w, i) => {
		const y = WORK_BASE_Y - i * WORK_ROW_HEIGHT;
		field(`work_${i}_from`, 2, 92, y, formatDMY(w.date_from));
		field(
			`work_${i}_to`,
			2,
			135,
			y,
			w.date_to
				? w.date_to.toLowerCase() === "present"
					? "Present"
					: formatDMY(w.date_to)
				: "",
		);
		field(`work_${i}_position`, 2, 185, y, w.position_title || "");
		field(`work_${i}_department`, 2, 290, y, w.department_agency || "");
		field(`work_${i}_status`, 2, 450, y, w.status_of_appointment || "");
		field(`work_${i}_govt`, 2, 515, y, w.is_government_service ? "Y" : "N");
	});

	// PAGE 3 - Voluntary Work (up to 7)
	// Row 0 is the anchor — editing it on the site cascades to rows 1-6 (see
	// cascadeGridFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	voluntary_works.slice(0, VOLUNTARY_ROWS).forEach((v, i) => {
		const y = VOLUNTARY_BASE_Y - i * VOLUNTARY_ROW_HEIGHT;
		field(`voluntary_${i}_org`, 3, 92, y, v.organization_name || "");
		field(`voluntary_${i}_from`, 3, 270, y, formatDMY(v.date_from));
		field(`voluntary_${i}_to`, 3, 310, y, formatDMY(v.date_to));
		field(
			`voluntary_${i}_hours`,
			3,
			360,
			y,
			v.number_of_hours != null ? String(v.number_of_hours) : "",
		);
		field(
			`voluntary_${i}_position`,
			3,
			400,
			y,
			v.position_nature_of_work || "",
		);
	});

	// Learning & Development (up to 21)
	// Row 0 is the anchor — editing it on the site cascades to rows 1-20 (see
	// cascadeGridFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	trainings.slice(0, TRAINING_ROWS).forEach((l, i) => {
		const y = TRAINING_BASE_Y - i * TRAINING_ROW_HEIGHT;
		field(`training_${i}_title`, 3, 92, y, l.title || "");
		field(`training_${i}_from`, 3, 280, y, formatDMY(l.date_from));
		field(`training_${i}_to`, 3, 320, y, formatDMY(l.date_to));
		field(
			`training_${i}_hours`,
			3,
			365,
			y,
			l.number_of_hours != null ? String(l.number_of_hours) : "",
		);
		field(`training_${i}_type`, 3, 400, y, l.type_of_ld || "");
		field(`training_${i}_conducted_by`, 3, 450, y, l.conducted_by || "");
	});

	// Other Information — Skills
	// Row 0 is the anchor — editing it on the site cascades to rows 1-6 (see
	// cascadeGridFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	other_info
		.filter((o) => o.info_type === "SKILL")
		.slice(0, OTHER_SKILL_ROWS)
		.forEach((s, i) =>
			field(
				`other_skill_${i}_text`,
				3,
				92,
				OTHER_SKILL_BASE_Y - i * OTHER_SKILL_ROW_HEIGHT,
				s.details,
			),
		);
	// Other Information — Recognition (Non-Academic Distinctions)
	// Row 0 is the anchor — editing it on the site cascades to rows 1-6 (see
	// cascadeGridFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	other_info
		.filter((o) => o.info_type === "RECOGNITION")
		.slice(0, OTHER_RECOGNITION_ROWS)
		.forEach((r, i) =>
			field(
				`other_recognition_${i}_text`,
				3,
				250,
				OTHER_RECOGNITION_BASE_Y - i * OTHER_RECOGNITION_ROW_HEIGHT,
				r.details,
			),
		);

	// Other Information — Membership in Organizations
	// Row 0 is the anchor — editing it on the site cascades to rows 1-6 (see
	// cascadeGridFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	other_info
		.filter((o) => o.info_type === "MEMBERSHIP")
		.slice(0, OTHER_MEMBERSHIP_ROWS)
		.forEach((m, i) =>
			field(
				`other_membership_${i}_text`,
				3,
				430,
				OTHER_MEMBERSHIP_BASE_Y - i * OTHER_MEMBERSHIP_ROW_HEIGHT,
				m.details,
			),
		);

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
		field(`${q.key}_yes`, 4, 378, q.y, yn(q.answer), { center: true });
		field(`${q.key}_no`, 4, 519, q.y, yn(q.answer === false), { center: true });
	});

	// References
	// Row 0 is the anchor — editing it on the site cascades to rows 1-2 (see
	// cascadeGridFromRow0()), which are otherwise just row0 minus i * ROW_HEIGHT.
	references.slice(0, REFERENCE_ROWS).forEach((r, i) => {
		const y = REFERENCE_BASE_Y - i * REFERENCE_ROW_HEIGHT;
		field(`reference_${i}_name`, 4, 92, y, r.name || "");
		field(`reference_${i}_address`, 4, 280, y, r.address || "");
		field(`reference_${i}_telephone`, 4, 450, y, r.telephone_number || "");
	});

	// Government ID
	field("government_issued_id", 4, 92, 310, data.government_issued_id || "");
	field("government_id_number", 4, 280, 310, data.government_id_number || "");
	field(
		"government_id_date_issued",
		4,
		450,
		310,
		formatDMY(data.government_id_date_issued),
	);

	// Date filled (production doesn't render a separate "place issued" field)
	field("submitted_at", 4, 92, 200, formatDMY(data.submitted_at));

	// Signature (one image, placed on every page) — x/y is the bottom-left
	// corner, w/h the box size, all in PDF points. Editable via the sidebar
	// like any other field (drag the X/Y/W/H inputs), same as text fields.
	const SIGNATURE_DEFAULTS = {
		1: { x: 430, y: 175, w: 110, h: 34 },
		2: { x: 430, y: 40, w: 110, h: 34 },
		3: { x: 430, y: 40, w: 110, h: 34 },
		4: { x: 430, y: 175, w: 110, h: 34 },
	};
	Object.entries(SIGNATURE_DEFAULTS).forEach(([page, box]) => {
		field(`signature_page_${page}`, Number(page), box.x, box.y, "", {
			type: "image",
			image: "signature",
			w: box.w,
			h: box.h,
		});
	});

	// Passport-size ID photo — placed only on page 4, over the government ID
	// section. x/y is the bottom-left corner, w/h the box size, all in PDF
	// points. Editable via the sidebar like the signature boxes.
	const PHOTO_DEFAULTS = {
		// Placed clear of the x:378-519 Yes/No question columns (y:520-820) —
		// adjust with the Locator tool if the real template needs it elsewhere.
		4: { x: 540, y: 660, w: 90, h: 90 },
	};
	Object.entries(PHOTO_DEFAULTS).forEach(([page, box]) => {
		field(`photo_page_${page}`, Number(page), box.x, box.y, "", {
			type: "image",
			image: "photo",
			w: box.w,
			h: box.h,
		});
	});

	return list;
}

const overlays = buildOverlays();
const DEFAULT_POSITIONS = new Map(
	overlays.map((o) => [
		o.key,
		{ x: o.x, y: o.y, center: o.center, w: o.w, h: o.h },
	]),
);

// ─── POSITION PERSISTENCE ──────────────────────────────────────
// Positions are kept as part of each overlay object so edits can mutate them in
// place. Saved to this browser's localStorage on every edit, plus
// overlay-positions.json via the explicit Save Positions button (no backend/DB).
const STORAGE_KEY = "pds_overlay_positions_v1";
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
			if (saved.w !== undefined) o.w = saved.w;
			if (saved.h !== undefined) o.h = saved.h;
		}
	});
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
	const snapshot = overlays.map((o) => ({
		key: o.key,
		x: o.x,
		y: o.y,
		center: !!o.center,
		w: o.w,
		h: o.h,
	}));
	const json = JSON.stringify(snapshot, null, 2);

	if (window.showSaveFilePicker) {
		try {
			if (!savedFileHandle) {
				savedFileHandle = await window.showSaveFilePicker({
					suggestedName: "overlay-positions.json",
					types: [
						{ description: "JSON", accept: { "application/json": [".json"] } },
					],
				});
			}
			const writable = await savedFileHandle.createWritable();
			await writable.write(json);
			await writable.close();
			flashMessage("✅ Saved to overlay-positions.json");
			return;
		} catch (e) {
			if (e && e.name === "AbortError") return; // user cancelled the picker
			console.warn(
				"File System Access save failed, falling back to download",
				e,
			);
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
	flashMessage(
		"⬇️ Downloaded overlay-positions.json — place it next to index.js",
	);
}

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

function flashMessage(msg) {
	coordLive.textContent = msg;
	setTimeout(() => {
		if (coordLive.textContent === msg) coordLive.textContent = "";
	}, 1800);
}

// ─── PHOTO ────────────────────────────────────────────────────
// Box position/size for each page lives in the `overlays` list (keys
// photo_page_1, photo_page_4, ...) and is editable via the sidebar, same as
// the signature boxes below.
const photoImage = new Image();
let photoLoaded = false;
photoImage.onload = () => {
	photoLoaded = true;
	if (pdfDoc) {
		pdfDoc.getPage(currentPage).then((page) => {
			const viewport = page.getViewport({ scale: 1.5 });
			drawOverlays(currentPage, viewport);
		});
	}
};
photoImage.onerror = () => {
	// Sample/placeholder photo path doesn't exist on disk — draw without a photo instead of crashing.
	photoLoaded = false;
};
photoImage.src = data.photo_path;

// ─── SIGNATURE (one image, placed on every page) ────────────────
// CS Form No. 212 requires a signature on each of the 4 pages. Box position/size
// for each page lives in the `overlays` list (keys signature_page_1..4) and is
// editable via the sidebar, same as any other field.
const signatureImage = new Image();
let signatureLoaded = false;
signatureImage.onload = () => {
	signatureLoaded = true;
	if (pdfDoc) {
		pdfDoc.getPage(currentPage).then((page) => {
			const viewport = page.getViewport({ scale: 1.5 });
			drawOverlays(currentPage, viewport);
		});
	}
};
signatureImage.onerror = () => {
	// Sample/placeholder signature path doesn't exist on disk — draw without it instead of crashing.
	signatureLoaded = false;
};
signatureImage.src = data.signature_path;

// Maps an overlay's `image` tag to the actual <img> element to draw, so any
// number of image-backed overlays (photo, signature, ...) can share the same
// generic drawing loop in drawOverlays()/downloadPDF() instead of bespoke code.
const IMAGE_LAYERS = {
	photo: () => (photoLoaded ? photoImage : null),
	signature: () => (signatureLoaded ? signatureImage : null),
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

Promise.all([
	pdfjsLib.getDocument("PDS-template.pdf").promise,
	loadSavedPositionsFile(),
]).then(([doc, filePositions]) => {
	pdfDoc = doc;
	applyPositions(filePositions || loadFromLocalStorage());
	// Re-sync every question's "_no" y to its "_yes" partner in case a saved
	// position file/localStorage snapshot has them drifted apart.
	overlays
		.filter((o) => o.key.endsWith("_yes"))
		.forEach((o) => cascadeQuestionYesToNo(o.key));
	renderPage(currentPage);
});

function renderPage(num) {
	pdfDoc.getPage(num).then((page) => {
		const viewport = page.getViewport({ scale: 1.5 });
		currentViewport = viewport;
		pdfCanvas.width = overlayCanvas.width = viewport.width;
		pdfCanvas.height = overlayCanvas.height = viewport.height;
		// locatorCanvas is the top layer that actually receives clicks — without this it stays
		// at the browser's default 300x150 size until some other handler happens to resize it,
		// so clicks anywhere outside that tiny corner would silently miss it entirely.
		locatorCanvas.width = viewport.width;
		locatorCanvas.height = viewport.height;
		page
			.render({ canvasContext: pdfCtx, viewport })
			.promise.then(() => drawOverlays(num, viewport));
		pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
		prevBtn.disabled = num <= 1;
		nextBtn.disabled = num >= pdfDoc.numPages;
	});
}

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

	// Draw every image-backed overlay (photo, signature, ...) defined for this page
	overlays
		.filter((f) => f.page === pageNum && f.type === "image")
		.forEach((box) => {
			const img = IMAGE_LAYERS[box.image]?.();
			if (!img) return;
			const s = viewport.scale;
			const cx = box.x * s;
			const cy = viewport.height - box.y * s;
			oCtx.drawImage(img, cx, cy, box.w * s, box.h * s);
		});

	// Highlight the field currently selected in the sidebar
	if (selectedField && selectedField.page === pageNum) {
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
	locatorBtn.textContent = `📍 Locator: ${locatorOn ? "ON" : "OFF"}`;
	locatorBtn.style.background = locatorOn ? "#dc2626" : "#0f766e";
	locatorCanvas.classList.toggle("inactive", !locatorOn);
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
// then type its x/y coordinates in the editor panel below the search box.
const fieldListEl = document.getElementById("field-list");
const fieldSearchEl = document.getElementById("field-search");

function categoryFor(key) {
	if (key.startsWith("signature_")) return "Signature";
	if (key.startsWith("photo_")) return "Photo";
	if (key.startsWith("child_")) return "Children";
	if (key.startsWith("spouse_")) return "Spouse";
	if (key.startsWith("father_") || key.startsWith("mother_"))
		return "Father / Mother";
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
	if (key.startsWith("government_") || key === "submitted_at")
		return "Government ID / Date";
	if (
		[
			"citizenship_checkbox",
			"citizenship_subtype_checkbox",
			"dual_citizenship_country",
		].includes(key)
	)
		return "Citizenship";
	if (
		["sex_checkbox", "civil_status_checkbox", "civil_status_other"].includes(
			key,
		)
	)
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
			coordSpan.textContent = formatCoordText(f);
			li.appendChild(keySpan);
			li.appendChild(coordSpan);
			li.addEventListener("click", () => selectField(f));
			fieldListEl.appendChild(li);
		});
	});
}

function formatCoordText(f) {
	const base = `p${f.page} · ${f.x},${f.y}`;
	return f.type === "image" ? `${base} · ${f.w}×${f.h}` : base;
}

function updateSidebarCoords(field) {
	const li = fieldListEl.querySelector(
		`.field-item[data-key="${CSS.escape(field.key)}"]`,
	);
	if (li)
		li.querySelector(".field-coords").textContent = formatCoordText(field);
}

function selectField(field) {
	selectedField = field;
	fieldListEl
		.querySelectorAll(".field-item.selected")
		.forEach((el) => el.classList.remove("selected"));
	const li = fieldListEl.querySelector(
		`.field-item[data-key="${CSS.escape(field.key)}"]`,
	);
	if (li) {
		li.classList.add("selected");
		li.scrollIntoView({ block: "nearest" });
	}
	if (field.page !== currentPage) {
		currentPage = field.page;
		renderPage(currentPage);
	} else if (currentViewport) {
		drawOverlays(currentPage, currentViewport);
	}

	fieldEditor.classList.remove("hidden");
	fieldEditorKey.textContent = field.key;
	fieldEditorX.value = field.x;
	fieldEditorY.value = field.y;
	fieldEditorCenter.checked = !!field.center;

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
	fieldEditorTextRow.classList.toggle("hidden", isImage);
	fieldEditorMaxWidthRow.classList.toggle("hidden", isImage);
	fieldEditorOverflowRow.classList.toggle("hidden", isImage || !field.maxWidth);

	fieldEditorX.focus();
}

fieldSearchEl.addEventListener("input", () => {
	const q = fieldSearchEl.value.trim().toLowerCase();
	let lastHeading = null;
	let headingHasVisibleItem = false;
	fieldListEl.querySelectorAll("li").forEach((li) => {
		if (li.classList.contains("field-group-heading")) {
			if (lastHeading)
				lastHeading.style.display = headingHasVisibleItem ? "" : "none";
			lastHeading = li;
			headingHasVisibleItem = false;
			return;
		}
		const match = !q || li.dataset.key.toLowerCase().includes(q);
		li.style.display = match ? "" : "none";
		if (match) headingHasVisibleItem = true;
	});
	if (lastHeading)
		lastHeading.style.display = headingHasVisibleItem ? "" : "none";
});

populateFieldList();

// ─── EDIT POSITIONS (pick a field, type its x/y, apply) ─────────
const saveBtn = document.getElementById("save-positions-btn");
const resetBtn = document.getElementById("reset-positions-btn");
const fieldEditor = document.getElementById("field-editor");
const fieldEditorKey = document.getElementById("field-editor-key");
const fieldEditorX = document.getElementById("field-editor-x");
const fieldEditorY = document.getElementById("field-editor-y");
const fieldEditorCenter = document.getElementById("field-editor-center");
const fieldEditorCenterRow = document.getElementById("field-editor-center-row");
const fieldEditorSizeRow = document.getElementById("field-editor-size-row");
const fieldEditorW = document.getElementById("field-editor-w");
const fieldEditorH = document.getElementById("field-editor-h");
const fieldEditorTextRow = document.getElementById("field-editor-text-row");
const fieldEditorText = document.getElementById("field-editor-text");
const fieldEditorMaxWidthRow = document.getElementById(
	"field-editor-maxwidth-row",
);
const fieldEditorMaxWidth = document.getElementById("field-editor-maxwidth");
const fieldEditorOverflow = document.getElementById("field-editor-overflow");
const fieldEditorOverflowRow = document.getElementById(
	"field-editor-overflow-row",
);
const fieldEditorApply = document.getElementById("field-editor-apply");
let selectedField = null;

// Approximate bounding box (in page-point space) of a rendered field — only used to draw its highlight box.
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

let saveDebounceTimer = null;
function debouncedSaveToLocalStorage() {
	clearTimeout(saveDebounceTimer);
	saveDebounceTimer = setTimeout(saveToLocalStorage, 300);
}

function overlayByKey(key) {
	return overlays.find((o) => o.key === key);
}

// Row-anchored grids: row 0 is the anchor for every one of these repeating
// tables. Editing any row-0 field cascades to the rest of that grid's rows —
// see cascadeGridFromRow0() below. Add a new grid here (not a bespoke function)
// whenever another repeating table needs the same behavior.
const ROW_ANCHORED_GRIDS = [
	{
		prefix: "eligibility_",
		columns: ELIGIBILITY_COLUMNS,
		rows: ELIGIBILITY_ROWS,
		rowHeight: ELIGIBILITY_ROW_HEIGHT,
	},
	{
		prefix: "work_",
		columns: WORK_COLUMNS,
		rows: WORK_ROWS,
		rowHeight: WORK_ROW_HEIGHT,
	},
	{
		prefix: "voluntary_",
		columns: VOLUNTARY_COLUMNS,
		rows: VOLUNTARY_ROWS,
		rowHeight: VOLUNTARY_ROW_HEIGHT,
	},
	{
		prefix: "training_",
		columns: TRAINING_COLUMNS,
		rows: TRAINING_ROWS,
		rowHeight: TRAINING_ROW_HEIGHT,
	},
	{
		prefix: "other_skill_",
		columns: OTHER_SKILL_COLUMNS,
		rows: OTHER_SKILL_ROWS,
		rowHeight: OTHER_SKILL_ROW_HEIGHT,
	},
	{
		prefix: "other_recognition_",
		columns: OTHER_RECOGNITION_COLUMNS,
		rows: OTHER_RECOGNITION_ROWS,
		rowHeight: OTHER_RECOGNITION_ROW_HEIGHT,
	},
	{
		prefix: "other_membership_",
		columns: OTHER_MEMBERSHIP_COLUMNS,
		rows: OTHER_MEMBERSHIP_ROWS,
		rowHeight: OTHER_MEMBERSHIP_ROW_HEIGHT,
	},
	{
		prefix: "reference_",
		columns: REFERENCE_COLUMNS,
		rows: REFERENCE_ROWS,
		rowHeight: REFERENCE_ROW_HEIGHT,
	},
];

// Keeps a repeating grid in sync with its row 0: moving a column's x in row 0
// re-aligns that column across every other row, and moving row 0's y re-derives
// every other row's y from the grid's row height. Without this, rows 1..N stay
// frozen at their original build-time position forever once row 0 is dragged.
function cascadeGridFromRow0(grid) {
	const anchorKey = (col) => `${grid.prefix}0_${col}`;
	const row0Key = anchorKey(grid.columns[0]);
	const row0Anchor = overlayByKey(row0Key);
	if (!row0Anchor) return;
	const row0Y = row0Anchor.y;

	grid.columns.forEach((col) => {
		const anchor = overlayByKey(anchorKey(col));
		if (!anchor) return;
		anchor.y = row0Y; // keep row 0 level across all its columns
		for (let i = 1; i < grid.rows; i++) {
			const cell = overlayByKey(`${grid.prefix}${i}_${col}`);
			if (!cell) continue;
			cell.x = anchor.x;
			cell.y = row0Y - i * grid.rowHeight;
			cell.center = anchor.center;
		}
		updateSidebarCoords(anchor);
	});
	for (let i = 1; i < grid.rows; i++) {
		grid.columns.forEach((col) => {
			const cell = overlayByKey(`${grid.prefix}${i}_${col}`);
			if (cell) updateSidebarCoords(cell);
		});
	}
}

// Finds which registered grid (if any) a field key's row 0 belongs to.
function findRow0Grid(key) {
	return ROW_ANCHORED_GRIDS.find((grid) => key.startsWith(`${grid.prefix}0_`));
}

// Questions 34-44 render as a Yes/No pair per row (q34_a_yes/_no, q36_yes/_no,
// etc.) that must sit at the same height. Editing a "_yes" field's y pushes
// that same y onto its "_no" partner so they never drift apart.
function cascadeQuestionYesToNo(key) {
	if (!key.endsWith("_yes")) return;
	const base = key.slice(0, -"_yes".length);
	const partner = overlayByKey(`${base}_no`);
	if (!partner) return;
	partner.y = overlayByKey(key).y;
	updateSidebarCoords(partner);
}

// Applies whatever's currently in the inputs and redraws immediately — called on every
// keystroke/checkbox toggle so the field visibly moves as you type, not just on submit.
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

fieldEditorX.addEventListener("input", applyFieldEditLive);
fieldEditorY.addEventListener("input", applyFieldEditLive);
fieldEditorCenter.addEventListener("change", applyFieldEditLive);
fieldEditorW.addEventListener("input", applyFieldEditLive);
fieldEditorH.addEventListener("input", applyFieldEditLive);
fieldEditorText.addEventListener("input", applyFieldEditLive);
fieldEditorMaxWidth.addEventListener("input", applyFieldEditLive);
fieldEditorOverflow.addEventListener("change", applyFieldEditLive);

fieldEditorApply.addEventListener("click", () => {
	if (!selectedField) return;
	applyFieldEditLive();
	saveToLocalStorage();
	const detail =
		selectedField.type === "image"
			? `w:${selectedField.w} h:${selectedField.h}`
			: selectedField.center
				? "centered"
				: "left";
	flashMessage(
		`✅ ${selectedField.key} — x:${selectedField.x} y:${selectedField.y} (${detail}), saved`,
	);
});

saveBtn.addEventListener("click", () => savePositionsToFile());
resetBtn.addEventListener("click", () => {
	if (confirm("Reset all field positions back to the hardcoded defaults?"))
		resetPositions();
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
		ctx.textAlign = "left";
		// Bake every image-backed overlay (photo, signature, ...) defined for this page
		overlays
			.filter((f) => f.page === p && f.type === "image")
			.forEach((box) => {
				const img = IMAGE_LAYERS[box.image]?.();
				if (!img) return;
				const s = viewport.scale;
				const cx = box.x * s;
				const cy = viewport.height - box.y * s;
				ctx.drawImage(img, cx, cy, box.w * s, box.h * s);
			});
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
