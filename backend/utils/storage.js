const path = require("node:path");
const fs = require("node:fs/promises");
require("dotenv").config();

const DRIVER = process.env.STORAGE_DRIVER === "s3" ? "s3" : "disk";
const PRESIGN_TTL = parseInt(process.env.S3_PRESIGN_TTL, 10) || 900;
const DISK_ROOT = path.join(__dirname, "..", "uploads");

// The client runs on a different origin than the API (dev: 7283 vs 3000; prod:
// Vercel vs Render) and there is no dev proxy, so an origin-relative
// "/uploads/..." would resolve against the FRONTEND and 404. The disk driver
// therefore returns an absolute URL, exactly as the s3 driver does.
const PUBLIC_BASE_URL = (
	process.env.PUBLIC_BASE_URL ||
	(process.env.PORT ? `http://localhost:${process.env.PORT}` : "")
).replace(/\/+$/, "");

/**
 * Builds a driver-neutral storage key: "<folder>/<base>-<ts>-<rand><ext>".
 * No leading slash, no "uploads/" prefix, forward slashes only.
 */
function buildKey(folder, originalname) {
	if (!folder || typeof folder !== "string") {
		throw new Error("Folder must be a non-empty string");
	}
	if (folder.startsWith("/") || folder.includes("..") || folder.includes("\\") || /^[a-zA-Z]:/.test(folder)) {
		throw new Error(`Unsafe folder: ${folder}`);
	}
	const ext = path.extname(originalname || "");
	const base = path
		.basename(originalname || "file", ext)
		.replace(/[^a-zA-Z0-9._-]/g, "_")
		.slice(0, 60);
	const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
	return `${folder}/${base}-${unique}${ext}`;
}

/**
 * Normalizes historical disk paths such as
 * "uploads\\organization-documents\\file.pdf" into the driver-neutral key
 * "organization-documents/file.pdf", then rejects anything that could escape
 * the storage root.
 */
function assertSafeKey(key) {
	if (typeof key !== "string" || key.length === 0) {
		throw new Error("Storage key must be a non-empty string");
	}
	let normalized = key.replace(/\\/g, "/");
	const legacyUploadsMarker = normalized.toLowerCase().lastIndexOf("/uploads/");
	if (legacyUploadsMarker >= 0) {
		// Historical database rows may contain an absolute path from an older
		// workspace. Keep only the driver-neutral key after the uploads folder.
		normalized = normalized.slice(legacyUploadsMarker + "/uploads/".length);
	} else if (/^\/?uploads\//i.test(normalized)) {
		normalized = normalized.replace(/^\/?uploads\//i, "");
	}
	if (
		normalized.startsWith("/") ||
		normalized.includes("..") ||
		normalized.includes("\\") ||
		/^[a-zA-Z]:/.test(normalized)
	) {
		throw new Error(`Unsafe storage key: ${key}`);
	}
	return normalized;
}

// ---------------------------------------------------------------- disk driver

const diskDriver = {
	async put(buffer, { folder, originalname }) {
		const key = buildKey(folder, originalname);
		assertSafeKey(key);
		const dest = path.join(DISK_ROOT, key);
		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.writeFile(dest, buffer);
		return key;
	},

	async getUrl(key) {
		const safeKey = assertSafeKey(key);
		return `${PUBLIC_BASE_URL}/uploads/${safeKey}`;
	},

	async remove(key) {
		const safeKey = assertSafeKey(key);
		await fs.unlink(path.join(DISK_ROOT, safeKey)).catch(err => {
			if (err.code !== 'ENOENT') throw err;
		});
	},

	async getBuffer(key) {
		const safeKey = assertSafeKey(key);
		return fs.readFile(path.join(DISK_ROOT, safeKey));
	},
};

// ------------------------------------------------------------------ s3 driver

function makeS3Driver() {
	const {
		S3Client,
		PutObjectCommand,
		GetObjectCommand,
		DeleteObjectCommand,
	} = require("@aws-sdk/client-s3");
	const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

	const Bucket = process.env.S3_BUCKET;
	if (!Bucket) {
		throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET to be set");
	}
	const client = new S3Client({ region: process.env.S3_REGION });

	return {
		async put(buffer, { folder, originalname, mimetype }) {
			const key = buildKey(folder, originalname);
			assertSafeKey(key);
			await client.send(
				new PutObjectCommand({
					Bucket,
					Key: key,
					Body: buffer,
					ContentType: mimetype || "application/octet-stream",
				}),
			);
			return key;
		},

		async getUrl(key, { download = false, filename } = {}) {
			const safeKey = assertSafeKey(key);
			const command = new GetObjectCommand({
				Bucket,
				Key: safeKey,
				...(download && {
					ResponseContentDisposition: `attachment; filename="${(filename || path.basename(safeKey)).replace(/"/g, "")}"`,
				}),
			});
			return getSignedUrl(client, command, { expiresIn: PRESIGN_TTL });
		},

		async remove(key) {
			const safeKey = assertSafeKey(key);
			await client.send(new DeleteObjectCommand({ Bucket, Key: safeKey }));
		},

		async getBuffer(key) {
			const safeKey = assertSafeKey(key);
			const response = await client.send(new GetObjectCommand({ Bucket, Key: safeKey }));
			const bytes = await response.Body.transformToByteArray();
			return Buffer.from(bytes);
		},
	};
}

const active = DRIVER === "s3" ? makeS3Driver() : diskDriver;

module.exports = {
	driver: DRIVER,
	buildKey,
	put: active.put,
	getUrl: active.getUrl,
	remove: active.remove,
	getBuffer: active.getBuffer,
};
