const storage = require("./storage");

/**
 * Replaces stored storage keys with viewable URLs on the way out of a
 * controller, so <img src> in the client works without an extra round trip.
 *
 * Accepts a Sequelize instance, plain object, array of either, or null.
 * Returns plain objects; the input is never mutated.
 */
async function presignFields(input, fieldNames) {
	if (input == null) return input;

	if (Array.isArray(input)) {
		return Promise.all(input.map((row) => presignFields(row, fieldNames)));
	}

	const plain = typeof input.toJSON === "function" ? input.toJSON() : { ...input };

	await Promise.all(
		fieldNames.map(async (field) => {
			const key = plain[field];
			if (!key || typeof key !== "string") return;
			try {
				plain[field] = await storage.getUrl(key);
			} catch (err) {
				// Legacy or unmigrated value that isn't a valid storage key.
				// Null the field rather than failing the whole response: one bad
				// row must not take down an entire list endpoint.
				console.warn(`presignFields: unusable storage key in "${field}": ${key} (${err.message})`);
				plain[field] = null;
			}
		}),
	);

	return plain;
}

module.exports = { presignFields };
