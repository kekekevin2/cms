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

	console.log("getUrl (view)     →", await storage.getUrl(key));
	console.log("getUrl (download) →", await storage.getUrl(key, { download: true, filename: "my report.txt" }));

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

	console.log("\nALL CHECKS PASSED");
}

main().catch((err) => {
	console.error("FAILED:", err);
	process.exit(1);
});
