const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { createEnv } = require("./chrome-mock");

const MANIFEST = path.join(__dirname, "..", "extension", "manifest.json");
const KEY = "lsl0123456789abcdef"; // fake 19-char streamkey
const VID = "dQw4w9WgXcQ";
const WATCH = `https://www.youtube.com/watch?v=${VID}`;
const ADD_EP = `https://api.w2g.tv/rooms/${KEY}/playlists/current/playlist_items/sync_update`;
const PLAY_EP = `https://api.w2g.tv/rooms/${KEY}/sync_update`;

function setup({ apiStatus = 200, local = {}, withRoomTab = true } = {}) {
  const env = createEnv({
    manifestPath: MANIFEST,
    fetchHandler: (req) => {
      if (req.url.startsWith("https://www.youtube.com/oembed")) return { status: 200, json: { title: "Never Gonna Give You Up" } };
      if (req.url.startsWith("https://api.w2g.tv/")) return { status: apiStatus, json: {} };
      return { status: 404, json: {} };
    }
  });
  env.chrome.storage.local._reset({ apiKey: "TESTKEY", ...local });
  if (withRoomTab) env.state.tabs = [{ id: 7, url: "https://w2g.tv/en/room/?access_key=x", title: "W2G room", lastAccessed: 100 }];
  env.state.executeScriptResult = withRoomTab ? KEY : null;
  return env;
}
const apiCalls = (env) => env.calls.fetch.filter((f) => f.url.startsWith("https://api.w2g.tv/"));

test("manifest: version 1.1.0, date in version_name, commands declared", () => {
  const env = setup();
  const m = env.chrome.runtime.getManifest();
  assert.equal(m.version, "1.1.0");
  assert.match(m.version_name, /2026-11-26/);
  assert.equal(m.commands["add-current-video"].suggested_key.default, "Alt+Shift+Y");
  assert.equal(m.commands["play-current-video"].suggested_key.default, "Alt+Shift+U");
  assert.deepEqual(m.content_scripts[0].js, ["content.js"]);
});

test("install creates 4 context menu items with correct contexts", async () => {
  const env = setup();
  await env.chrome.runtime.onInstalled.fire({ reason: "update" });
  const ids = env.calls.menus.map((m) => m.id).sort();
  assert.deepEqual(ids, ["w2g-link-add", "w2g-link-play", "w2g-page-add", "w2g-page-play"]);
  for (const m of env.calls.menus) {
    if (m.id.includes("link")) { assert.deepEqual([...m.contexts], ["link"]); assert.ok(m.targetUrlPatterns.length); }
    else { assert.ok(m.contexts.includes("page")); assert.ok(m.documentUrlPatterns.length); }
  }
});

test("right-click link → Add: posts to playlist endpoint with normalized URL + oEmbed title", async () => {
  const env = setup();
  await env.chrome.contextMenus.onClicked.fire({ menuItemId: "w2g-link-add", linkUrl: `https://youtu.be/${VID}?si=abc&t=30` }, { id: 1 });
  const calls = apiCalls(env);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ADD_EP);
  assert.deepEqual(calls[0].body, { w2g_api_key: "TESTKEY", add_items: [{ url: WATCH, title: "Never Gonna Give You Up" }] });
  assert.equal(env.calls.notifications.at(-1).title, "Added to W2G");
  assert.equal(env.calls.badge[0], "✓");
});

test("right-click link → Play now: posts item_url to room sync_update", async () => {
  const env = setup();
  await env.chrome.contextMenus.onClicked.fire({ menuItemId: "w2g-link-play", linkUrl: `https://www.youtube.com/shorts/${VID}` }, { id: 1 });
  const calls = apiCalls(env);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, PLAY_EP);
  assert.deepEqual(calls[0].body, { w2g_api_key: "TESTKEY", item_url: WATCH });
  assert.equal(env.calls.notifications.at(-1).title, "Playing in W2G");
});

test("page menu uses page URL and tab title fallback", async () => {
  const env = setup();
  await env.chrome.contextMenus.onClicked.fire({ menuItemId: "w2g-page-add", pageUrl: `${WATCH}&list=PL1` }, { id: 3, url: WATCH, title: "(3) Song - YouTube" });
  assert.equal(apiCalls(env)[0].body.add_items[0].url, WATCH);
});

test("history: records entries newest-first, capped at 50", async () => {
  const env = setup({ local: { dupCheck: false } });
  for (let i = 0; i < 55; i++) {
    await env.message({ type: "sendVideo", action: "add", url: `https://www.youtube.com/watch?v=vid${String(i).padStart(8, "0")}` });
  }
  const { history } = await env.chrome.storage.local.get("history");
  assert.equal(history.length, 50);
  assert.equal(history[0].id, "vid00000054");
  assert.deepEqual(Object.keys(history[0]).sort(), ["action", "id", "room", "title", "ts", "url"]);
  assert.equal(history[0].room, KEY);
});

test("duplicate: 2nd add is held, 3rd within 20 s goes through", async () => {
  const env = setup();
  const r1 = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r1.ok, true);
  const r2 = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r2.ok, false);
  assert.equal(r2.duplicate, true);
  assert.match(r2.msg, /already added/);
  assert.equal(apiCalls(env).length, 1, "no API call for held duplicate");
  assert.equal(env.calls.badge.at(-1), "?");
  const r3 = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r3.ok, true);
  assert.equal(apiCalls(env).length, 2);
});

test("duplicate: confirm window expires after 20 s", async () => {
  const env = setup();
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  await env.message({ type: "sendVideo", action: "add", url: WATCH }); // held, arms window
  const s = env.chrome.storage.session._data();
  s.pendingDup.ts -= 21_000; // pretend 21 s passed
  const r = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r.duplicate, true, "held again after window expired");
  assert.equal(apiCalls(env).length, 1);
});

test("duplicate: older than 12 h is not a duplicate", async () => {
  const env = setup();
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  const l = env.chrome.storage.local._data();
  l.history[0].ts -= 12 * 3600_000 + 1000;
  const r = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r.ok, true);
});

test("duplicate: different room is not a duplicate", async () => {
  const env = setup();
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  env.chrome.storage.local._data().history[0].room = "otherroom123";
  const r = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r.ok, true);
});

test("duplicate: disabled in options, force flag, and play-now all bypass it", async () => {
  let env = setup({ local: { dupCheck: false } });
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal((await env.message({ type: "sendVideo", action: "add", url: WATCH })).ok, true);

  env = setup();
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal((await env.message({ type: "sendVideo", action: "add", url: WATCH, force: true })).ok, true);
  assert.equal((await env.message({ type: "sendVideo", action: "play", url: WATCH })).ok, true);
  assert.equal(apiCalls(env).length, 3);
});

test("keyboard shortcuts: add / play on a YouTube tab", async () => {
  const env = setup();
  await env.chrome.commands.onCommand.fire("add-current-video", { id: 5, url: WATCH, title: "x - YouTube" });
  await env.chrome.commands.onCommand.fire("play-current-video", { id: 5, url: WATCH, title: "x - YouTube" });
  const calls = apiCalls(env);
  assert.equal(calls[0].url, ADD_EP);
  assert.equal(calls[1].url, PLAY_EP);
});

test("keyboard shortcut: falls back to active tab when tab arg missing", async () => {
  const env = setup();
  env.state.activeTab = { id: 9, url: WATCH, title: "y - YouTube" };
  await env.chrome.commands.onCommand.fire("add-current-video");
  assert.equal(apiCalls(env).length, 1);
});

test("keyboard shortcut on a non-YouTube page: error, no API call", async () => {
  const env = setup();
  await env.chrome.commands.onCommand.fire("add-current-video", { id: 5, url: "https://example.com/", title: "x" });
  assert.equal(apiCalls(env).length, 0);
  assert.match(env.calls.notifications.at(-1).message, /YouTube video page/);
});

test("quiet flag (thumbnail buttons): badge but no notification", async () => {
  const env = setup();
  const r = await env.message({ type: "sendVideo", action: "add", url: WATCH, quiet: true });
  assert.equal(r.ok, true);
  assert.equal(env.calls.notifications.length, 0);
  assert.equal(env.calls.badge[0], "✓");
});

test("clearHistory empties history", async () => {
  const env = setup();
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  await env.message({ type: "clearHistory" });
  assert.deepEqual((await env.chrome.storage.local.get("history")).history, []);
});

test("room detection: webRequest from room tab is used (no page scan needed)", async () => {
  const env = setup();
  env.state.executeScriptResult = null;
  await env.chrome.webRequest.onBeforeRequest.fire({ tabId: 7, url: `https://w2g-api.w2g.tv/rooms/${KEY}/room_info` });
  await new Promise((r) => setImmediate(r));
  const r = await env.message({ type: "getRoom" });
  assert.equal(r.key, KEY);
  assert.equal(r.source, "open tab");
  assert.equal(env.calls.executeScript.length, 0);
});

test("manual mode overrides open tab", async () => {
  const env = setup({ local: { mode: "manual", manualKey: "manualroom99" } });
  await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(apiCalls(env)[0].url, "https://api.w2g.tv/rooms/manualroom99/playlists/current/playlist_items/sync_update");
});

test("errors: missing key opens options; 403 gives membership hint; no room; bad URL", async () => {
  let env = setup({ local: { apiKey: "" } });
  let r = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.equal(r.ok, false); assert.equal(env.calls.optionsOpened, 1);

  env = setup({ apiStatus: 403 });
  r = await env.message({ type: "sendVideo", action: "play", url: WATCH });
  assert.equal(r.ok, false); assert.match(r.msg, /403.*joined this room/);
  assert.equal((await env.chrome.storage.local.get("history")).history, undefined, "failed send not recorded");

  env = setup({ withRoomTab: false });
  r = await env.message({ type: "sendVideo", action: "add", url: WATCH });
  assert.match(r.msg, /No W2G room found/);

  env = setup();
  r = await env.message({ type: "sendVideo", action: "add", url: "https://www.youtube.com/@channel" });
  assert.match(r.msg, /doesn't look like a YouTube video/);
  assert.equal(apiCalls(env).length, 0);
});
