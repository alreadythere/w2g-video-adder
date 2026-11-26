// W2G YouTube Adder — background service worker (Manifest V3)
// Version is read from manifest.json; see CHANGELOG.md.
//
// Watch2Gether API (https://community.w2g.tv/t/watch2gether-api-documentation/133767):
//   Add to playlist: POST https://api.w2g.tv/rooms/{streamkey}/playlists/current/playlist_items/sync_update
//                    { w2g_api_key, add_items: [{ url, title }] }
//   Play now:        POST https://api.w2g.tv/rooms/{streamkey}/sync_update
//                    { w2g_api_key, item_url }

// Firefox exposes the promise-based `browser` namespace; Chrome exposes `chrome`.
const api = globalThis.browser ?? globalThis.chrome;

const API_BASE = "https://api.w2g.tv";
const W2G_TAB_PATTERNS = ["https://w2g.tv/*"];
const ROOM_KEY_RE = /\/rooms\/([a-z0-9]{8,40})\//i;

const HISTORY_MAX = 50;
const DUP_WINDOW_MS = 12 * 60 * 60 * 1000; // same video + same room within 12 h = duplicate
const FORCE_WINDOW_MS = 20 * 1000;          // repeat within 20 s to add anyway

const MENU = {
  LINK_ADD: "w2g-link-add",
  LINK_PLAY: "w2g-link-play",
  PAGE_ADD: "w2g-page-add",
  PAGE_PLAY: "w2g-page-play"
};

const YT_LINK_PATTERNS = [
  "*://www.youtube.com/watch*",
  "*://youtube.com/watch*",
  "*://m.youtube.com/watch*",
  "*://www.youtube.com/shorts/*",
  "*://youtube.com/shorts/*",
  "*://youtu.be/*"
];
const YT_PAGE_PATTERNS = [
  "*://www.youtube.com/watch*",
  "*://m.youtube.com/watch*",
  "*://www.youtube.com/shorts/*"
];

// ---------- Context menus ----------

api.runtime.onInstalled.addListener((details) => {
  api.contextMenus.removeAll(() => {
    api.contextMenus.create({ id: MENU.LINK_ADD, title: "Add video to W2G playlist", contexts: ["link"], targetUrlPatterns: YT_LINK_PATTERNS });
    api.contextMenus.create({ id: MENU.LINK_PLAY, title: "Play video now in W2G", contexts: ["link"], targetUrlPatterns: YT_LINK_PATTERNS });
    api.contextMenus.create({ id: MENU.PAGE_ADD, title: "Add this page's video to W2G playlist", contexts: ["page", "video", "frame"], documentUrlPatterns: YT_PAGE_PATTERNS });
    api.contextMenus.create({ id: MENU.PAGE_PLAY, title: "Play this page's video now in W2G", contexts: ["page", "video", "frame"], documentUrlPatterns: YT_PAGE_PATTERNS });
  });
  if (details.reason === "install") api.runtime.openOptionsPage();
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  const isLink = info.menuItemId === MENU.LINK_ADD || info.menuItemId === MENU.LINK_PLAY;
  const action = (info.menuItemId === MENU.LINK_PLAY || info.menuItemId === MENU.PAGE_PLAY) ? "play" : "add";
  const raw = isLink ? info.linkUrl : (info.pageUrl || tab?.url);
  const fallbackTitle = isLink ? "" : cleanYtTitle(tab?.title);
  notifyResult(await sendVideo(raw, { action, fallbackTitle }));
});

// ---------- Keyboard shortcuts ----------

api.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "add-current-video" && command !== "play-current-video") return;
  if (!tab) [tab] = await api.tabs.query({ active: true, lastFocusedWindow: true });
  const action = command === "play-current-video" ? "play" : "add";
  if (!tab || !extractVideoId(tab.url)) {
    notifyResult({ ok: false, msg: "The shortcut works on a YouTube video page. Open a video first." });
    return;
  }
  notifyResult(await sendVideo(tab.url, { action, fallbackTitle: cleanYtTitle(tab.title) }));
});

// ---------- Room (streamkey) detection ----------
// The W2G room page calls w2g-api.w2g.tv/rooms/{streamkey}/room_info, /join_room, /sync_state…

api.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const m = details.url.match(ROOM_KEY_RE);
    if (m) rememberRoom(details.tabId, m[1].toLowerCase());
  },
  { urls: ["https://w2g-api.w2g.tv/rooms/*"] }
);

api.tabs.onRemoved.addListener(async (tabId) => {
  const { roomsByTab = {} } = await api.storage.session.get("roomsByTab");
  if (roomsByTab[tabId]) {
    delete roomsByTab[tabId];
    await api.storage.session.set({ roomsByTab });
  }
});

async function rememberRoom(tabId, key) {
  const { roomsByTab = {} } = await api.storage.session.get("roomsByTab");
  if (roomsByTab[tabId]?.key === key) return;
  roomsByTab[tabId] = { key, ts: Date.now() };
  await api.storage.session.set({ roomsByTab });
}

// For room tabs opened before the extension was installed: scan resource-timing entries.
async function scanTabForRoomKey(tabId) {
  try {
    const [res] = await api.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const re = /w2g-api\.w2g\.tv\/(?:rooms|streams)\/([a-z0-9]{8,40})\//i;
        const entries = performance.getEntriesByType("resource");
        for (let i = entries.length - 1; i >= 0; i--) {
          const m = entries[i].name.match(re);
          if (m) return m[1].toLowerCase();
        }
        const pm = location.pathname.match(/\/rooms\/([a-z0-9-]+)/i);
        if (pm) return pm[1].split("-").pop().toLowerCase();
        return null;
      }
    });
    return res?.result || null;
  } catch (e) {
    return null;
  }
}

async function resolveRoom() {
  const { mode = "auto", manualKey = "", lastRoom = "" } =
    await api.storage.local.get(["mode", "manualKey", "lastRoom"]);

  if (mode === "manual" && manualKey) return { key: manualKey, source: "manual" };

  const tabs = await api.tabs.query({ url: W2G_TAB_PATTERNS });
  tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  const { roomsByTab = {} } = await api.storage.session.get("roomsByTab");

  for (const t of tabs) {
    let key = roomsByTab[t.id]?.key;
    if (!key) {
      key = await scanTabForRoomKey(t.id);
      if (key) await rememberRoom(t.id, key);
    }
    if (key) return { key, source: "open tab", tabTitle: t.title };
  }

  if (manualKey) return { key: manualKey, source: "saved key" };
  if (lastRoom) return { key: lastRoom, source: "last used" };
  return null;
}

// ---------- YouTube URL helpers ----------

function extractVideoId(raw) {
  if (!raw) return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
  if (host === "youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") return u.searchParams.get("v");
    const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/);
    if (m) return m[2];
  }
  return null;
}

function cleanYtTitle(t) {
  return (t || "").replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, "").trim();
}

async function fetchTitle(watchUrl) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`);
    if (!r.ok) return "";
    const j = await r.json();
    return j.title || "";
  } catch {
    return "";
  }
}

// ---------- History & duplicate check ----------

async function getHistory() {
  const { history = [] } = await api.storage.local.get("history");
  return history;
}

async function recordHistory(entry) {
  const history = await getHistory();
  history.unshift(entry);
  await api.storage.local.set({ history: history.slice(0, HISTORY_MAX) });
}

// Returns { duplicate: false } or { duplicate: true, prev } and arms the "repeat to force" window.
async function checkDuplicate(id, room) {
  const { dupCheck = true } = await api.storage.local.get("dupCheck");
  if (!dupCheck) return { duplicate: false };

  const now = Date.now();
  const prev = (await getHistory()).find(
    (h) => h.id === id && h.room === room && h.action === "add" && now - h.ts < DUP_WINDOW_MS
  );
  if (!prev) return { duplicate: false };

  const { pendingDup } = await api.storage.session.get("pendingDup");
  if (pendingDup && pendingDup.id === id && pendingDup.room === room && now - pendingDup.ts < FORCE_WINDOW_MS) {
    await api.storage.session.remove("pendingDup");
    return { duplicate: false, forced: true };
  }
  await api.storage.session.set({ pendingDup: { id, room, ts: now } });
  return { duplicate: true, prev };
}

function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

// ---------- Main action ----------

// action: "add" (queue in current playlist) | "play" (play immediately)
async function sendVideo(rawUrl, { action = "add", fallbackTitle = "", force = false } = {}) {
  const id = extractVideoId(rawUrl);
  if (!id) return { ok: false, msg: "That doesn't look like a YouTube video link." };
  const url = `https://www.youtube.com/watch?v=${id}`;

  const { apiKey = "" } = await api.storage.local.get("apiKey");
  if (!apiKey) {
    api.runtime.openOptionsPage();
    return { ok: false, msg: "Set your W2G API key in the extension options first." };
  }

  const room = await resolveRoom();
  if (!room) {
    return { ok: false, msg: "No W2G room found. Open your room in a tab (reload it once) or set a room key in options." };
  }

  if (action === "add" && !force) {
    const dup = await checkDuplicate(id, room.key);
    if (dup.duplicate) {
      return {
        ok: false,
        duplicate: true,
        msg: `“${dup.prev.title}” was already added to this room ${ago(dup.prev.ts)}. Do it again within 20 s to add anyway.`
      };
    }
  }

  const title = (await fetchTitle(url)) || fallbackTitle || url;

  const endpoint = action === "play"
    ? `${API_BASE}/rooms/${encodeURIComponent(room.key)}/sync_update`
    : `${API_BASE}/rooms/${encodeURIComponent(room.key)}/playlists/current/playlist_items/sync_update`;
  const body = action === "play"
    ? { w2g_api_key: apiKey, item_url: url }
    : { w2g_api_key: apiKey, add_items: [{ url, title }] };

  let res, bodyText = "";
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    bodyText = await res.text().catch(() => "");
  } catch (e) {
    return { ok: false, msg: `Network error talking to W2G: ${e.message}` };
  }

  if (!res.ok) {
    let hint = "";
    if (res.status === 401 || res.status === 403) hint = " Check the API key, and make sure your W2G account has joined this room.";
    if (res.status === 404) hint = " Room not found — the streamkey may be wrong.";
    return { ok: false, msg: `W2G returned ${res.status}.${hint} ${bodyText.slice(0, 120)}`.trim() };
  }

  await api.storage.local.set({ lastRoom: room.key });
  await recordHistory({ id, url, title, room: room.key, action, ts: Date.now() });
  const verb = action === "play" ? "Now playing" : "Added";
  return { ok: true, action, title, msg: `${verb} “${title}” in room ${room.key} (${room.source}).` };
}

// ---------- Feedback ----------

function notifyResult({ ok, msg, duplicate, action }, { quiet = false } = {}) {
  const color = ok ? "#2e7d32" : duplicate ? "#f9a825" : "#c62828";
  api.action.setBadgeBackgroundColor({ color });
  api.action.setBadgeText({ text: ok ? "✓" : duplicate ? "?" : "!" });
  setTimeout(() => api.action.setBadgeText({ text: "" }), 4000);
  if (quiet) return; // thumbnail buttons show their own inline result
  api.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: ok ? (action === "play" ? "Playing in W2G" : "Added to W2G") : duplicate ? "Already in W2G playlist?" : "W2G: couldn't send video",
    message: msg
  });
}

// ---------- Messages from popup / content script ----------

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "getRoom") {
      sendResponse(await resolveRoom());
    } else if (msg.type === "sendVideo") {
      const r = await sendVideo(msg.url, {
        action: msg.action === "play" ? "play" : "add",
        fallbackTitle: msg.fallbackTitle || "",
        force: !!msg.force
      });
      notifyResult(r, { quiet: !!msg.quiet });
      sendResponse(r);
    } else if (msg.type === "clearHistory") {
      await api.storage.local.set({ history: [] });
      sendResponse({ ok: true });
    } else {
      sendResponse(null);
    }
  })();
  return true;
});
