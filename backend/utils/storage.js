const path = require("node:path");
const fs = require("node:fs/promises");
require("dotenv").config();

const DRIVER = process.env.STORAGE_DRIVER === "s3" ? "s3" : "disk";
const PRESIGN_TTL = parseInt(process.env.S3_PRESIGN_TTL, 10) || 900;
const DISK_ROOT = path.join(__dirname, "..", "uploads");

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

/** Rejects keys that would escape the storage root. */
function assertSafeKey(key) {
	if (typeof key !== "string" || key.length === 0) {
		throw new Error("Storage key must be a non-empty string");
	}
	if (key.startsWith("/") || key.includes("..") || key.includes("\\") || /^[a-zA-Z]:/.test(key)) {
		throw new Error(`Unsafe storage key: ${key}`);
	}
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
		assertSafeKey(key);
		return `/uploads/${key}`;
	},

	async remove(key) {
		assertSafeKey(key);
		await fs.unlink(path.join(DISK_ROOT, key)).catch(err => {
			if (err.code !== 'ENOENT') throw err;
		});
	},

	async getBuffer(key) {
		assertSafeKey(key);
		return fs.readFile(path.join(DISK_ROOT, key));
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
			assertSafeKey(key);
			const command = new GetObjectCommand({
				Bucket,
				Key: key,
				...(download && {
					ResponseContentDisposition: `attachment; filename="${(filename || path.basename(key)).replace(/"/g, "")}"`,
				}),
			});
			return getSignedUrl(client, command, { expiresIn: PRESIGN_TTL });
		},

		async remove(key) {
			assertSafeKey(key);
			await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
		},

		async getBuffer(key) {
			assertSafeKey(key);
			const response = await client.send(new GetObjectCommand({ Bucket, Key: key }));
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
