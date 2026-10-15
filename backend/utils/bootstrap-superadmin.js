const bcrypt = require("bcrypt");
const db = require("../models");

/**
 * Creates the first superadmin on boot when none exists yet.
 *
 * Render's filesystem is ephemeral and there is no shell step in a deploy, so
 * `npm run create-superadmin` (which is interactive) cannot be used there. This
 * runs automatically instead, and is a no-op once any superadmin exists.
 *
 * Credentials come from the environment — never hardcode them, because this file
 * is committed to git:
 *   SUPERADMIN_EMAIL      required to do anything
 *   SUPERADMIN_PASSWORD   required to do anything
 *   SUPERADMIN_FIRST_NAME optional, defaults to "Super"
 *   SUPERADMIN_LAST_NAME  optional, defaults to "Admin"
 *   SUPERADMIN_CONTACT    optional
 *
 * Safe to run on every boot: it counts existing superadmins first and exits
 * early, so a redeploy never overwrites a password or creates a duplicate.
 * Never throws — a bootstrap failure logs and lets the server start, since a
 * missing seed account is far less bad than a server that will not boot.
 */
async function bootstrapSuperadmin() {
	const email = (process.env.SUPERADMIN_EMAIL || "").trim();
	const password = process.env.SUPERADMIN_PASSWORD || "";

	if (!email || !password) {
		// Not configured — normal for local dev, where the interactive script is used.
		return;
	}

	try {
		const existingCount = await db.User.count({ where: { role: "superadmin" } });
		if (existingCount > 0) {
			console.log(
				`Superadmin bootstrap skipped: ${existingCount} superadmin account(s) already exist.`,
			);
			return;
		}

		const firstName = (process.env.SUPERADMIN_FIRST_NAME || "Super").trim();
		const lastName = (process.env.SUPERADMIN_LAST_NAME || "Admin").trim();
		const contactNumber = (process.env.SUPERADMIN_CONTACT || "").trim() || null;

		const t = await db.sequelize.transaction();
		try {
			const hashedPassword = await bcrypt.hash(password, 10);

			const user = await db.User.create(
				{ email, password: hashedPassword, role: "superadmin", is_active: true },
				{ transaction: t },
			);

			await db.Admin.create(
				{
					first_name: firstName,
					last_name: lastName,
					email,
					contact_number: contactNumber,
					user_id: user.user_id,
				},
				{ transaction: t },
			);

			await t.commit();
			// Log the email so a deploy log shows which account was seeded. Never
			// log the password.
			console.log(`Superadmin bootstrap: created initial superadmin ${email}`);
		} catch (err) {
			await t.rollback();
			throw err;
		}
	} catch (err) {
		console.error("Superadmin bootstrap failed:", err.message);
	}
}

module.exports = { bootstrapSuperadmin };
