const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", ".env");

// Nodemon does not normally watch .env. Read the key pair together on each
// development request so editing it cannot leave the widget on an old key.
// Deployed environments continue to use their process environment.
function getRecaptchaConfig() {
  const variables = process.env.NODE_ENV === "development"
    ? dotenv.parse(fs.readFileSync(envPath))
    : process.env;
  // A partial save must not silently disable verification that is already on.
  const enabled = variables.RECAPTCHA_ENABLED || process.env.RECAPTCHA_ENABLED;
  if (enabled && enabled !== "true" && enabled !== "false") {
    throw new Error("Invalid RECAPTCHA_ENABLED setting");
  }

  return {
    siteKey: (variables.RECAPTCHA_SITE_KEY || "").trim(),
    secretKey: (variables.RECAPTCHA_SECRET_KEY || "").trim(),
    enabled: enabled === "true",
  };
}

module.exports = { getRecaptchaConfig };
