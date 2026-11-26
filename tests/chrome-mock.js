// Minimal in-memory chrome.* mock for running background.js under Node's vm.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function event() {
  const listeners = [];
  return {
    addListener: (fn) => listeners.push(fn),
    fire: (...args) => Promise.all(listeners.map((fn) => fn(...args))),
    listeners
  };
}

function storageArea() {
  let data = {};
  return {
    _data: () => data,
    _reset: (d = {}) => { data = JSON.parse(JSON.stringify(d)); },
    async get(keys) {
      if (keys == null) return JSON.parse(JSON.stringify(data));
      const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out = {};
      for (const k of list) {
        if (k in data) out[k] = JSON.parse(JSON.stringify(data[k]));
        else if (keys && typeof keys === "object" && !Array.isArray(keys)) out[k] = keys[k];
      }
      return out;
    },
    async set(obj) { Object.assign(data, JSON.parse(JSON.stringify(obj))); },
    async remove(k) { for (const x of [].concat(k)) delete data[x]; }
  };
}

function createEnv({ manifestPath, fetchHandler, namespace = "chrome" }) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const calls = { fetch: [], notifications: [], menus: [], badge: [], optionsOpened: 0, executeScript: [] };
  const state = { tabs: [], executeScriptResult: null, activeTab: null };

  const chrome = {
    runtime: {
      onInstalled: event(),
      onMessage: event(),
      getManifest: () => manifest,
      openOptionsPage: () => { calls.optionsOpened++; }
    },
    contextMenus: {
      onClicked: event(),
      removeAll: (cb) => { calls.menus = []; cb && cb(); },
      create: (o) => { calls.menus.push(o); }
    },
    commands: { onCommand: event(), getAll: async () => [] },
    webRequest: { onBeforeRequest: event() },
    tabs: {
      onRemoved: event(),
      query: async (q) => {
        if (q.url) return state.tabs.filter((t) => /^https:\/\/w2g\.tv\//.test(t.url));
        if (q.active) return state.activeTab ? [state.activeTab] : [];
        return state.tabs;
      },
      create: async () => {}
    },
    scripting: {
      executeScript: async (o) => { calls.executeScript.push(o); return [{ result: state.executeScriptResult }]; }
    },
    storage: { local: storageArea(), session: storageArea(), onChanged: event() },
    action: {
      setBadgeText: (o) => calls.badge.push(o.text),
      setBadgeBackgroundColor: () => {}
    },
    notifications: { create: (o) => calls.notifications.push(o) }
  };

  async function fetch(url, opts = {}) {
    const rec = { url, method: opts.method || "GET", body: opts.body ? JSON.parse(opts.body) : null };
    calls.fetch.push(rec);
    const r = await fetchHandler(rec);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.json,
      text: async () => (r.text != null ? r.text : JSON.stringify(r.json || {}))
    };
  }

  // namespace "browser" simulates Firefox (only `browser` defined); "chrome" simulates Chrome.
  const ctx = vm.createContext({ [namespace]: chrome, fetch, URL, console, setTimeout: () => 0, clearTimeout: () => {} });
  const src = fs.readFileSync(path.join(path.dirname(manifestPath), "background.js"), "utf8");
  vm.runInContext(src, ctx, { filename: "background.js" });

  // helper: send a runtime message and await the response
  function message(msg, sender = {}) {
    return new Promise((resolve) => {
      for (const fn of chrome.runtime.onMessage.listeners) fn(msg, sender, resolve);
    });
  }

  return { chrome, calls, state, message, ctx };
}

module.exports = { createEnv };
