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
			plain[field] = await storage.getUrl(key);
		}),
	);

	return plain;
}

module.exports = { presignFields };
