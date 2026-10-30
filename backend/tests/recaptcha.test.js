const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");

// Isolate environment/files/network without reading real keys or touching the DB.
function loadModule(relativePath, dependencies, env = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    module, exports: module.exports,
    require: (name) => dependencies[name] ?? nativeRequire(name),
    __dirname: path.dirname(filename),
    process: { env }, URLSearchParams,
    console: { log() {}, error() {} },
  }, { filename });
  return module.exports;
}

test("development refreshes the entire key pair after an env edit without restart", () => {
  let contents = "RECAPTCHA_SITE_KEY=first-site\nRECAPTCHA_SECRET_KEY=first-secret\nRECAPTCHA_ENABLED=true";
  const { getRecaptchaConfig } = loadModule("config/recaptcha.config.js", {
    "node:fs": { readFileSync: () => contents },
  }, { NODE_ENV: "development", RECAPTCHA_SITE_KEY: "stale-site", RECAPTCHA_SECRET_KEY: "stale-secret" });
  assert.equal(getRecaptchaConfig().siteKey, "first-site");
  contents = "RECAPTCHA_SITE_KEY=second-site\nRECAPTCHA_SECRET_KEY=second-secret\nRECAPTCHA_ENABLED=true";
  const updated = getRecaptchaConfig();
  assert.equal(updated.siteKey, "second-site");
  assert.equal(updated.secretKey, "second-secret");
  assert.equal(updated.enabled, true);
});

test("production uses process configuration and does not read a local env file", () => {
  const { getRecaptchaConfig } = loadModule("config/recaptcha.config.js", {
    "node:fs": { readFileSync: () => assert.fail("must not read local env") },
  }, { NODE_ENV: "production", RECAPTCHA_SITE_KEY: "deployed-site", RECAPTCHA_SECRET_KEY: "deployed-secret", RECAPTCHA_ENABLED: "true" });
  assert.equal(getRecaptchaConfig().siteKey, "deployed-site");
  assert.equal(getRecaptchaConfig().secretKey, "deployed-secret");
});

test("partial env save does not silently disable existing verification or reuse old keys", () => {
  const { getRecaptchaConfig } = loadModule("config/recaptcha.config.js", {
    "node:fs": { readFileSync: () => "RECAPTCHA_SITE_KEY=new-site" },
  }, { NODE_ENV: "development", RECAPTCHA_ENABLED: "true", RECAPTCHA_SECRET_KEY: "stale-secret" });
  assert.equal(getRecaptchaConfig().enabled, true);
  assert.equal(getRecaptchaConfig().secretKey, "");
});

async function verify({ token, config, result, networkError, configError } = {}) {
  const calls = [];
  const middleware = loadModule("middleware/recaptcha.middleware.js", {
    "../config/recaptcha.config": {
      getRecaptchaConfig: () => {
        if (configError) throw new Error("unreadable config");
        return config ?? { enabled: true, siteKey: "new-site", secretKey: "new-secret" };
      },
    },
    axios: { post: async (...args) => {
      calls.push(args);
      if (networkError) throw new Error("network unavailable");
      return { data: result ?? { success: true } };
    } },
  }, { RECAPTCHA_SECRET_KEY: "stale-process-secret", RECAPTCHA_ENABLED: "true" });
  const req = { body: { recaptchaToken: token } };
  const res = {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let advanced = false;
  await middleware(req, res, () => { advanced = true; });
  return { req, res, calls, advanced };
}

test("missing, blank, and malformed tokens are rejected before authentication", async () => {
  for (const token of [undefined, "", "   ", [], {}]) {
    const checked = await verify({ token });
    assert.equal(checked.res.statusCode, 400);
    assert.equal(checked.advanced, false);
    assert.equal(checked.calls.length, 0);
  }
});

test("verified v2 token uses current secret in POST body, then permits authentication", async () => {
  const checked = await verify({ token: "valid-token" });
  const [url, body, options] = checked.calls[0];
  assert.equal(url, "https://www.google.com/recaptcha/api/siteverify");
  assert.equal(new URLSearchParams(body).get("secret"), "new-secret");
  assert.equal(new URLSearchParams(body).get("response"), "valid-token");
  assert.equal(options.timeout, 10000);
  assert.equal(checked.advanced, true);
  assert.equal(checked.req.recaptchaVerified, true);
  assert.equal(checked.req.body.recaptchaToken, undefined);
});

test("failed or non-boolean verification results cannot pass authentication", async () => {
  for (const success of [false, undefined, "true"]) {
    const checked = await verify({ token: "invalid-token", result: { success } });
    assert.equal(checked.res.statusCode, 400);
    assert.equal(checked.advanced, false);
  }
});

test("unreadable or incomplete configuration fails closed", async () => {
  for (const options of [{ configError: true }, { config: { enabled: true, siteKey: "new-site", secretKey: "" } }]) {
    const checked = await verify({ token: "token", ...options });
    assert.equal(checked.res.statusCode, 503);
    assert.equal(checked.advanced, false);
    assert.equal(checked.calls.length, 0);
  }
});

test("Google network failure cannot bypass verification", async () => {
  const checked = await verify({ token: "token", networkError: true });
  assert.equal(checked.res.statusCode, 500);
  assert.equal(checked.advanced, false);
});
