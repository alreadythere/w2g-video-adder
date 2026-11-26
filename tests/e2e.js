// End-to-end: load the real unpacked extension into Chrome, point YouTube/W2G hosts at the local mock,
// and drive it like a user. Prints PASS/FAIL per check and saves screenshots.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { server, log, ROOM_KEY, PORT } = require("./mock-server");

const EXT = path.resolve(__dirname, "..", "extension");
const SHOTS = path.resolve(__dirname, "shots");
require("fs").mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, cond, detail = "") {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const v = await fn(); if (v) return v; await sleep(100); }
  return fn();
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const hosts = ["www.youtube.com", "api.w2g.tv", "w2g.tv", "w2g-api.w2g.tv"];
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: "new",
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`,
      `--host-resolver-rules=${hosts.map((h) => `MAP ${h} 127.0.0.1:${PORT}`).join(", ")}`,
      "--ignore-certificate-errors", "--no-proxy-server", "--no-sandbox", "--window-size=1280,900"
    ]
  });

  try {
    // ---- extension loaded ----
    const swTarget = await browser.waitForTarget((t) => t.type() === "service_worker" && t.url().endsWith("background.js"), { timeout: 10000 });
    const extId = new URL(swTarget.url()).host;
    const sw = await swTarget.worker();
    check("extension loads, service worker running", !!extId, extId);

    const mf = await sw.evaluate(() => chrome.runtime.getManifest());
    check("manifest version 1.3.1 with date", mf.version === "1.3.1" && /2026-11-26/.test(mf.version_name), mf.version_name);

    await sw.evaluate(() => chrome.storage.local.set({ apiKey: "E2E_KEY" }));

    // ---- room detection ----
    const room = await browser.newPage();
    await room.goto("https://w2g.tv/en/room/?access_key=abc", { waitUntil: "networkidle0" });
    const detected = await waitFor(() => sw.evaluate(async () => {
      const { roomsByTab = {} } = await chrome.storage.session.get("roomsByTab");
      return Object.values(roomsByTab)[0]?.key || null;
    }));
    check("room streamkey auto-detected from W2G tab", detected === ROOM_KEY.toLowerCase(), detected);

    // ---- YouTube thumbnail buttons ----
    const yt = await browser.newPage();
    await yt.setViewport({ width: 1280, height: 600 });
    await yt.goto("https://www.youtube.com/", { waitUntil: "networkidle0" });
    const overlayState = () => yt.evaluate(() => {
      const h = document.getElementById("w2g-adder-overlay");
      if (!h) return null;
      const r = h.getBoundingClientRect();
      const add = h.shadowRoot.getElementById("add"), play = h.shadowRoot.getElementById("play");
      return { display: h.style.display, top: r.top, left: r.left,
        add: add.textContent, addTitle: add.title, play: play.textContent,
        addRect: (({ x, y, width, height }) => ({ x, y, width, height }))(add.getBoundingClientRect()),
        playRect: (({ x, y, width, height }) => ({ x, y, width, height }))(play.getBoundingClientRect()) };
    });
    check("content script injected overlay host", !!(await overlayState()));

    await yt.hover("#card1 a#thumbnail");
    let st = await waitFor(async () => { const s = await overlayState(); return s.display === "block" && s; });
    const thumbRect = await yt.$eval("#card1 a#thumbnail", (a) => { const r = a.getBoundingClientRect(); return { x: r.x, y: r.y }; });
    check("hover classic thumbnail → buttons appear at its corner", st && Math.abs(st.left - (thumbRect.x + 6)) < 2 && Math.abs(st.top - (thumbRect.y + 6)) < 2, JSON.stringify({ overlay: [st.left, st.top], thumb: [thumbRect.x, thumbRect.y] }));
    await yt.screenshot({ path: path.join(SHOTS, "1-hover-buttons.png") });

    const clickBtn = async (which) => {
      const s = await overlayState();
      const r = s[which + "Rect"];
      await yt.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 4 });
      await yt.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    };

    await clickBtn("add");
    st = await waitFor(async () => { const s = await overlayState(); return s.add.includes("Added") && s; });
    check("click + W2G → button shows ✓ Added", st && st.add === "✓ Added", st && st.add);
    check("…and page did NOT navigate to the video", yt.url() === "https://www.youtube.com/");
    let last = log.at(-1);
    check("…API got add request to playlist endpoint",
      last && last.path === `/rooms/${ROOM_KEY.toLowerCase()}/playlists/current/playlist_items/sync_update`, last && last.path);
    check("…with correct key, URL and title",
      last && last.body.w2g_api_key === "E2E_KEY" &&
      last.body.add_items?.[0]?.url === "https://www.youtube.com/watch?v=AAAAAAAAAAA" &&
      last.body.add_items?.[0]?.title === "oEmbed title for AAAAAAAAAAA", JSON.stringify(last && last.body.add_items));
    await yt.screenshot({ path: path.join(SHOTS, "2-added.png") });

    // duplicate
    const before = log.length;
    await clickBtn("add");
    st = await waitFor(async () => { const s = await overlayState(); return s.add.startsWith("Dup") && s; });
    check("click + W2G again → duplicate warning, nothing sent", st && log.length === before, st && st.add);
    await yt.screenshot({ path: path.join(SHOTS, "3-duplicate.png") });
    await clickBtn("add");
    st = await waitFor(async () => { const s = await overlayState(); return s.add === "✓ Added" && s; });
    check("click again within 20 s → added anyway", st && log.length === before + 1);

    // new lockup layout + play now
    await yt.mouse.move(5, 590);
    await yt.hover("#card2 a");
    st = await waitFor(async () => { const s = await overlayState(); return s.display === "block" && s.add === "+ W2G" && s; });
    check("hover new-layout (lockup) thumbnail → buttons appear, reset to default", !!st);
    await clickBtn("play");
    st = await waitFor(async () => { const s = await overlayState(); return s.play.includes("Playing") && s; });
    last = log.at(-1);
    check("click ▶ → Play now request to room sync_update with item_url (tracking param stripped)",
      last && last.path === `/rooms/${ROOM_KEY.toLowerCase()}/sync_update` && last.body.item_url === "https://www.youtube.com/watch?v=BBBBBBBBBBB", JSON.stringify(last));

    // shorts
    await yt.mouse.move(5, 590);
    await yt.hover("#card3 a");
    st = await waitFor(async () => { const s = await overlayState(); return s.display === "block" && s; });
    check("hover Shorts thumbnail → buttons appear", !!st);

    // regression (found live on YouTube): hover preview tears its link down before the click lands
    await yt.evaluate(() => { const a = document.querySelector("#card3 a"); a.removeAttribute("href"); a.style.height = "0"; });
    const n1 = log.length;
    await clickBtn("add");
    await waitFor(() => log.length > n1);
    last = log.at(-1);
    check("link removed before click (preview teardown) → still sends the hovered video",
      last && last.body.add_items?.[0]?.url === "https://www.youtube.com/watch?v=CCCCCCCCCCC", JSON.stringify(last && last.body.add_items));
    await yt.evaluate(() => window.scrollBy(0, 40));
    await sleep(300);
    st = await overlayState();
    check("scroll → buttons hide (no stale floating buttons)", st.display === "none", st.display);
    await yt.evaluate(() => window.scrollTo(0, 0));
    await sleep(200);

    // non-video link
    await yt.mouse.move(5, 590);
    await sleep(400);
    await yt.hover("#card4 a");
    await sleep(400);
    st = await overlayState();
    check("hover channel (non-video) link → no buttons", st.display === "none", st.display);

    // ---- popup ----
    const popup = await browser.newPage();
    await popup.setViewport({ width: 360, height: 640 });
    await popup.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: "networkidle0" });
    await sleep(500);
    const p = await popup.evaluate(() => ({
      version: document.getElementById("version").textContent,
      room: document.getElementById("room").textContent,
      items: [...document.querySelectorAll("#history li")].map((li) => li.innerText.replace(/\s+/g, " ").trim()),
      addTitle: document.getElementById("add").title,
      playTitle: document.getElementById("play").title
    }));
    check("popup shows version + date", p.version === "v1.3.1 (2026-11-26)", p.version);
    check("popup shows detected room", p.room === ROOM_KEY.toLowerCase(), p.room);
    check("popup history lists 4 sends, newest first",
      p.items.length === 4 && /added/.test(p.items[0]) && /played/.test(p.items[1]), p.items[0]);
    check("keyboard shortcuts registered (Alt+Shift+Y / Alt+Shift+U)",
      /Alt\+Shift\+Y/.test(p.addTitle) && /Alt\+Shift\+U/.test(p.playTitle), `${p.addTitle} | ${p.playTitle}`);
    await popup.screenshot({ path: path.join(SHOTS, "4-popup.png"), fullPage: true });

    const n0 = log.length;
    await popup.evaluate(() => [...document.querySelectorAll("#history li button")].find((b) => b.textContent === "Send again").click());
    await waitFor(() => log.length > n0);
    check("popup 'Send again' re-adds (bypasses duplicate check)", log.length === n0 + 1 && log.at(-1).path.includes("playlist_items"));

    await popup.click("#clear");
    await sleep(300);
    const cleared = await popup.$$eval("#history li", (l) => l.map((x) => x.textContent));
    check("popup Clear empties history", cleared.length === 1 && /Nothing sent/.test(cleared[0]));

    // ---- options: toggle off thumbnail buttons ----
    const opts = await browser.newPage();
    await opts.goto(`chrome-extension://${extId}/options.html`, { waitUntil: "networkidle0" });
    await sleep(300);
    const o = await opts.evaluate(() => ({ v: document.getElementById("version").textContent, thumbs: document.getElementById("showThumbButtons").checked, dup: document.getElementById("dupCheck").checked, key: document.getElementById("apiKey").value }));
    check("options shows version, toggles default on, key loaded", o.v.includes("2026-11-26") && o.thumbs && o.dup && o.key === "E2E_KEY", JSON.stringify(o));
    await opts.screenshot({ path: path.join(SHOTS, "5-options.png"), fullPage: true });
    await opts.click("#showThumbButtons");
    await opts.click("#save");
    await sleep(300);

    await yt.bringToFront();
    await yt.mouse.move(5, 590);
    await sleep(400);
    await yt.hover("#card1 a#thumbnail");
    await sleep(400);
    st = await overlayState();
    check("thumbnail buttons OFF in options → no buttons on hover (live, no reload)", st.display === "none");

    // ---- watch page: popup add would use tab; check content script doesn't break watch page ----
    await yt.goto("https://www.youtube.com/watch?v=DDDDDDDDDDD", { waitUntil: "networkidle0" });
    check("watch page loads with content script, no errors", (await yt.title()).includes("DDDDDDDDDDD"));
  } catch (e) {
    check("e2e run completed without exception", false, e.stack);
  } finally {
    await browser.close();
    server.close();
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
  }
})();
