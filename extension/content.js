// W2G Video Adder — content script for youtube.com
// Shows "+ W2G" (add to playlist) and "▶" (play now) buttons when hovering a video thumbnail.
// Uses one shared floating overlay (in a shadow root), so YouTube's own markup is never modified.

(() => {
  // Firefox exposes the promise-based `browser` namespace; Chrome exposes `chrome`.
  const api = globalThis.browser ?? globalThis.chrome;

  if (window.__w2gAdderLoaded) return;
  window.__w2gAdderLoaded = true;

  const MEDIA_SEL = "img, video, yt-image, yt-thumbnail-view-model, ytd-thumbnail";
  const CARD_SEL = [
    "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer",
    "ytd-grid-video-renderer", "ytd-playlist-video-renderer", "ytd-reel-item-renderer",
    "yt-lockup-view-model", "ytm-shorts-lockup-view-model", "ytd-playlist-panel-video-renderer"
  ].join(",");

  let enabled = true;
  let currentAnchor = null;
  // Snapshot of the hovered video, taken when the buttons appear. YouTube's hover-preview player
  // tears down its link when the mouse moves onto our buttons, so we never read the link at click time.
  let current = null; // { id, url, title }
  let hideTimer = null;

  // ----- overlay -----
  const host = document.createElement("div");
  host.id = "w2g-adder-overlay";
  host.style.cssText = "position:fixed;z-index:2147483647;display:none;top:0;left:0;";
  const root = host.attachShadow({ mode: "open" });
  // Built with DOM calls (no innerHTML) and styled through the CSSOM (element.style) instead of a
  // <style> tag, so neither YouTube's Trusted Types policy nor a page CSP style-src rule can block it,
  // in Chrome or Firefox.
  const BTN_BASE = {
    all: "unset", cursor: "pointer", font: "600 12px/1 Roboto, Arial, sans-serif", color: "#fff",
    background: "rgba(15,15,15,.88)", border: "1px solid rgba(255,255,255,.25)", borderRadius: "6px",
    padding: "6px 8px", whiteSpace: "nowrap", boxShadow: "0 1px 4px rgba(0,0,0,.4)"
  };
  const STATE_BG = { "": "rgba(15,15,15,.88)", hover: "#e62117", ok: "#2e7d32", warn: "#f9a825", err: "#c62828" };
  function paint(b) {
    const state = b.className || (b._hover ? "hover" : ""); // result states win over hover
    const bg = STATE_BG[state] ?? STATE_BG[""];
    b.style.background = bg;
    b.style.borderColor = state ? bg : "rgba(255,255,255,.25)";
    b.style.color = state === "warn" ? "#111" : "#fff";
  }
  const bar = document.createElement("div");
  bar.className = "bar";
  bar.style.display = "flex";
  bar.style.gap = "4px";
  const mkBtn = (id, label, title) => {
    const b = document.createElement("button");
    b.id = id;
    b.textContent = label;
    b.title = title;
    Object.assign(b.style, BTN_BASE);
    b.addEventListener("mouseenter", () => { b._hover = true; paint(b); });
    b.addEventListener("mouseleave", () => { b._hover = false; paint(b); });
    bar.appendChild(b);
    return b;
  };
  const btnAdd = mkBtn("add", "+ W2G", "Add to W2G playlist");
  const btnPlay = mkBtn("play", "▶", "Play now in W2G");
  root.append(bar);
  (document.body || document.documentElement).appendChild(host);

  // ----- helpers -----
  function videoHref(a) {
    if (!a || a.tagName !== "A" || !a.href) return null;
    let u;
    try { u = new URL(a.href, location.href); } catch { return null; }
    if (!/(^|\.)youtube\.com$/.test(u.hostname)) return null;
    if (u.pathname === "/watch" && u.searchParams.get("v")) return u.href;
    if (/^\/shorts\/[\w-]{6,}/.test(u.pathname)) return u.href;
    return null;
  }

  function looksLikeThumbnail(a) {
    if (a.id === "thumbnail" || a.id === "media-container-link") return true;
    if (a.querySelector(MEDIA_SEL)) return true;
    const r = a.getBoundingClientRect();
    return r.width >= 100 && r.height >= 56;
  }

  // Find a thumbnail link in the event path (works through YouTube's shadow DOM).
  function thumbAnchorFromEvent(e) {
    const path = e.composedPath ? e.composedPath() : [e.target];
    for (const el of path) {
      if (el === host) return "overlay";
      if (el && el.tagName === "A" && videoHref(el) && looksLikeThumbnail(el)) return el;
    }
    return null;
  }

  function videoId(href) {
    try {
      const u = new URL(href);
      return u.pathname === "/watch" ? u.searchParams.get("v") : u.pathname.split("/")[2] || null;
    } catch { return null; }
  }

  function titleFor(a) {
    const t = a.getAttribute("title") || a.getAttribute("aria-label");
    if (t) return t.trim();
    const card = a.closest(CARD_SEL);
    const el = card && card.querySelector("#video-title, h3, [title]");
    return el ? (el.getAttribute("title") || el.textContent || "").trim() : "";
  }

  function place(a) {
    const r = a.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return; // link collapsed (e.g. preview closing): leave buttons in place
    host.style.top = `${Math.max(0, r.top + 6)}px`;
    host.style.left = `${Math.max(0, r.left + 6)}px`;
    host.style.display = "block";
  }

  function show(a) {
    clearTimeout(hideTimer);
    const url = videoHref(a);
    const id = videoId(url);
    if (!current || current.id !== id) {
      resetButtons();
      current = { id, url: `https://www.youtube.com/watch?v=${id}`, title: titleFor(a) };
    } else if (!current.title) {
      current.title = titleFor(a); // same video (e.g. thumbnail → its hover preview): keep best title
    }
    currentAnchor = a;
    place(a);
  }

  function hide() {
    host.style.display = "none";
    currentAnchor = null;
    current = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 250);
  }

  function resetButtons() {
    for (const [b, label] of [[btnAdd, "+ W2G"], [btnPlay, "▶"]]) {
      clearTimeout(b._t);
      b.textContent = label;
      b.className = "";
      b.title = b === btnAdd ? "Add to W2G playlist" : "Play now in W2G";
      paint(b);
    }
  }

  function flash(b, label, cls, title, ms = 3000) {
    clearTimeout(b._t);
    b.textContent = label;
    b.className = cls;
    b.title = title;
    paint(b);
    b._t = setTimeout(resetButtons, ms);
  }

  async function send(action, btn) {
    const v = current;
    if (!v || !v.id) return;
    flash(btn, "…", "", "Sending…", 15000);
    let r;
    try {
      r = await api.runtime.sendMessage({ type: "sendVideo", action, url: v.url, fallbackTitle: v.title, quiet: true });
    } catch (e) {
      r = { ok: false, msg: "Extension was reloaded — refresh this YouTube tab." };
    }
    if (!r) r = { ok: false, msg: "No response from extension." };
    if (r.ok) flash(btn, action === "play" ? "▶ Playing" : "✓ Added", "ok", r.msg);
    else if (r.duplicate) flash(btn, "Dup? click again", "warn", r.msg, 20000);
    else flash(btn, "! Error", "err", r.msg, 6000);
  }

  // ----- events -----
  for (const [b, action] of [[btnAdd, "add"], [btnPlay, "play"]]) {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      send(action, b);
    });
    // keep YouTube from treating presses on our buttons as clicks on the thumbnail
    for (const t of ["mousedown", "mouseup", "pointerdown", "pointerup"]) {
      b.addEventListener(t, (e) => e.stopPropagation());
    }
  }

  document.addEventListener("mouseover", (e) => {
    if (!enabled) return;
    const a = thumbAnchorFromEvent(e);
    if (a === "overlay") return clearTimeout(hideTimer);
    if (a) show(a);
    else if (currentAnchor) scheduleHide();
  }, true);

  // Hide on scroll/resize (like YouTube's own hover preview) so buttons never float away from their
  // thumbnail. They come back on the next mouse move over a thumbnail.
  const hideIfShown = () => { if (currentAnchor || current) hide(); };
  window.addEventListener("scroll", hideIfShown, { passive: true }); // page scroll only, not inner scrollers
  window.addEventListener("resize", hideIfShown, { passive: true });

  // YouTube is a single-page app: hide on navigation
  document.addEventListener("yt-navigate-start", hide, true);

  // ----- settings -----
  api.storage.local.get("showThumbButtons").then(({ showThumbButtons = true }) => {
    enabled = showThumbButtons;
    if (!enabled) hide();
  });
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "showThumbButtons" in changes) {
      enabled = changes.showThumbButtons.newValue !== false;
      if (!enabled) hide();
    }
  });
})();
