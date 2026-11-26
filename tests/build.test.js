// Verifies scripts/build.js output for both browsers.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
execFileSync(process.execPath, [path.join(ROOT, "scripts", "build.js")], { stdio: "ignore" });
const read = (t) => JSON.parse(fs.readFileSync(path.join(ROOT, "dist", t, "manifest.json"), "utf8"));
const src = JSON.parse(fs.readFileSync(path.join(ROOT, "extension", "manifest.json"), "utf8"));

test("chrome build: manifest identical to source", () => {
  assert.deepEqual(read("chrome"), src);
});

test("firefox build: event-page background, no Chrome-only keys, gecko settings", () => {
  const m = read("firefox");
  assert.deepEqual(m.background, { scripts: ["background.js"] });
  assert.equal(m.version, src.version);
  assert.equal(m.version_name, undefined);
  assert.equal(m.options_page, undefined);
  assert.deepEqual(m.options_ui, { page: "options.html", open_in_tab: true });
  const g = m.browser_specific_settings.gecko;
  assert.match(g.id, /@/);
  assert.equal(g.strict_min_version, "142.0");
  assert.deepEqual(g.data_collection_permissions.required.sort(), ["authenticationInfo", "browsingActivity", "websiteContent"]);
  // everything else carried over unchanged
  for (const k of ["permissions", "host_permissions", "content_scripts", "commands", "action", "icons", "name"]) {
    assert.deepEqual(m[k], src[k], k);
  }
});

test("both zips exist with manifest.json at the root", () => {
  for (const t of ["chrome", "firefox"]) {
    const z = path.join(ROOT, "dist", `w2g-video-adder-${t}-v${src.version}.zip`);
    assert.ok(fs.existsSync(z), z);
    const buf = fs.readFileSync(z);
    assert.ok(buf.includes(Buffer.from("manifest.json")), `${t} zip has manifest.json`);
  }
});

test("source uses the browser/chrome shim everywhere (no bare chrome.* API calls)", () => {
  for (const f of ["background.js", "content.js", "popup.js", "options.js"]) {
    const code = fs.readFileSync(path.join(ROOT, "extension", f), "utf8");
    assert.match(code, /const api = globalThis\.browser \?\? globalThis\.chrome;/, f);
    const bare = code.split("\n").filter((l) => /(^|[^\w.\/])chrome\.[a-z]/.test(l) && !/globalThis\.chrome/.test(l));
    assert.deepEqual(bare, [], `${f} has bare chrome.* calls`);
  }
});
