const multer = require("multer");

const MB = 1024 * 1024;
const MAX_ALLOWED = 25 * MB;

/**
 * Builds a multer instance that keeps files in memory. Controllers hand the
 * resulting buffer to utils/storage.js, which owns naming and placement.
 *
 * maxSize is capped at 25MB: memoryStorage buffers whole files in RAM, and
 * several routes accept up to 10 files per request.
 */
function makeUpload({ folder, allowedTypes, maxSize }) {
	if (!folder) throw new Error("makeUpload requires a folder");
	if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
		throw new Error("makeUpload requires a non-empty allowedTypes array");
	}

	const instance = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: Math.min(maxSize || MAX_ALLOWED, MAX_ALLOWED) },
		fileFilter: (req, file, cb) => {
			if (allowedTypes.includes(file.mimetype)) return cb(null, true);
			cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(", ")}`), false);
		},
	});

	instance.folder = folder;
	return instance;
}

const DOCUMENT_TYPES = [
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"image/jpeg",
	"image/jpg",
	"image/png",
];

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const SPREADSHEET_TYPES = [
	"text/csv",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

module.exports = { makeUpload, MB, DOCUMENT_TYPES, IMAGE_TYPES, SPREADSHEET_TYPES };
