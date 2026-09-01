const storage = require("./utils/storage");

async function main() {
	console.log(`driver = ${storage.driver}`);

	const key = await storage.put(Buffer.from("hello storage"), {
		folder: "test-scratch",
		originalname: "my report.txt",
		mimetype: "text/plain",
	});
	console.log("put →", key);

	if (key.startsWith("/") || key.includes("\\") || key.includes("uploads/")) {
		throw new Error(`BAD KEY FORMAT: ${key}`);
	}
	if (!key.startsWith("test-scratch/")) {
		throw new Error(`key missing folder prefix: ${key}`);
	}

	const viewUrl = await storage.getUrl(key);
	console.log("getUrl (view)     →", viewUrl);
	console.log("getUrl (download) →", await storage.getUrl(key, { download: true, filename: "my report.txt" }));

	// Must be absolute under BOTH drivers: the client runs on a different origin
	// than the API, so a relative "/uploads/..." would resolve against the
	// frontend and 404. Requires PORT or PUBLIC_BASE_URL to be set for disk.
	if (!/^https?:\/\//.test(viewUrl)) {
		throw new Error(`getUrl must return an absolute URL, got: ${viewUrl}`);
	}

	const readBack = await storage.getBuffer(key);
	if (!Buffer.isBuffer(readBack) || readBack.toString("utf8") !== "hello storage") {
		throw new Error(`BAD getBuffer ROUND-TRIP: got ${JSON.stringify(readBack && readBack.toString())}`);
	}
	console.log("getBuffer round-trip → ok");

	await storage.remove(key);
	console.log("remove → ok");

	await storage.remove(key);
	console.log("remove again (must not throw) → ok");

	try {
		await storage.getUrl("../../etc/passwd");
		throw new Error("FAIL: traversal key was accepted");
	} catch (err) {
		if (!err.message.startsWith("Unsafe storage key")) throw err;
		console.log("traversal rejected → ok");
	}

	try {
		await storage.getBuffer("../../etc/passwd");
		throw new Error("FAIL: getBuffer traversal key was accepted");
	} catch (err) {
		if (!err.message.startsWith("Unsafe storage key")) throw err;
		console.log("getBuffer traversal rejected → ok");
	}

	try {
		await storage.put(Buffer.from("bad"), {
			folder: "../../escape",
			originalname: "x.txt",
		});
		throw new Error("FAIL: traversal folder was accepted");
	} catch (err) {
		if (!err.message.startsWith("Unsafe folder")) throw err;
		console.log("put with traversal folder rejected → ok");
	}

	try {
		await storage.put(Buffer.from("bad"), {
			folder: undefined,
			originalname: "x.txt",
		});
		throw new Error("FAIL: undefined folder was accepted");
	} catch (err) {
		if (!err.message.startsWith("Folder must be")) throw err;
		console.log("put with undefined folder rejected → ok");
	}

	try {
		await storage.put(Buffer.from("bad"), {
			folder: "",
			originalname: "x.txt",
		});
		throw new Error("FAIL: empty folder was accepted");
	} catch (err) {
		if (!err.message.startsWith("Folder must be")) throw err;
		console.log("put with empty folder rejected → ok");
	}

	console.log("\nALL CHECKS PASSED");
}

main().catch((err) => {
	console.error("FAILED:", err);
	process.exit(1);
});
