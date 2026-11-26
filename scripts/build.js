#!/usr/bin/env node
// Builds browser-specific copies of extension/ into dist/ and zips them.
//
//   dist/chrome/   = extension/ as-is (Chrome MV3 manifest is the source of truth)
//   dist/firefox/  = extension/ + Firefox manifest changes (see firefoxManifest below)
//   dist/w2g-video-adder-<browser>-v<version>.zip
//
// Usage: node scripts/build.js [chrome|firefox ...]   (default: both)

const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "extension");
const DIST = path.join(ROOT, "dist");

const GECKO_ID = "w2g-video-adder@alreadythere";

// Firefox differences (MDN / Firefox Extension Workshop):
// - MV3 background.service_worker isn't supported in Firefox; it runs background.scripts as an event page.
// - version_name is Chrome-only.
// - options_ui is the Firefox-native form of the options page.
// - browser_specific_settings.gecko: an add-on ID, plus data_collection_permissions, which new Firefox
//   add-ons must declare (Nov 2025+). Firefox 127 and older reject that key, and built-in data consent
//   needs Firefox 140 (Android 142), hence strict_min_version 142.0 (also covers scripting world:"MAIN", Firefox 128+).
// - What this add-on transmits, by Mozilla's categories: the chosen video URL (browsingActivity), a page
//   title used as a fallback video title (websiteContent), and your W2G API key, sent to W2G
//   (authenticationInfo). All of it goes only to api.w2g.tv (and the video URL to YouTube's oEmbed).
function firefoxManifest(m) {
  const out = JSON.parse(JSON.stringify(m));
  out.background = { scripts: ["background.js"] };
  delete out.version_name;
  if (out.options_page) {
    out.options_ui = { page: out.options_page, open_in_tab: true };
    delete out.options_page;
  }
  out.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: "142.0",
      data_collection_permissions: {
        required: ["browsingActivity", "websiteContent", "authenticationInfo"]
      }
    }
  };
  return out;
}

const TARGETS = {
  chrome: (m) => m,
  firefox: firefoxManifest
};

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function build(target) {
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
  const outDir = path.join(DIST, target);
  fs.rmSync(outDir, { recursive: true, force: true });
  copyDir(SRC, outDir);
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(TARGETS[target](manifest), null, 2) + "\n");

  const zipPath = path.join(DIST, `w2g-video-adder-${target}-v${manifest.version}.zip`);
  fs.rmSync(zipPath, { force: true });
  const zip = new AdmZip();
  zip.addLocalFolder(outDir); // manifest.json at the zip root, as both stores require
  zip.writeZip(zipPath);
  console.log(`built ${path.relative(ROOT, outDir)}/  →  ${path.relative(ROOT, zipPath)}`);
}

const wanted = process.argv.slice(2);
for (const t of wanted.length ? wanted : Object.keys(TARGETS)) {
  if (!TARGETS[t]) { console.error(`unknown target: ${t}`); process.exit(1); }
  build(t);
}
