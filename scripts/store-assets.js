#!/usr/bin/env node
// Generates Chrome Web Store / AMO listing images from the REAL extension UI:
//   store/images/screenshot-1-thumbnail-buttons.png  (1280x800)
//   store/images/screenshot-2-popup.png              (1280x800)
//   store/images/screenshot-3-options.png            (1280x800)
//   store/images/promo-small-440x280.png             (440x280)
//   store/images/store-icon-128.png                  (128x128, 96px artwork + transparent padding)
// Uses the same local mock of YouTube/W2G as the e2e test, with a neutral demo feed (tests/fixtures/demo-home.html).
// Usage: npm run store:images   (needs Chrome: CHROME_PATH, default /usr/bin/google-chrome)

const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const { server, PORT } = require("../tests/mock-server");

const ROOT = path.resolve(__dirname, "..");
const EXT = path.join(ROOT, "extension");
const OUT = path.join(ROOT, "store", "images");
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dataUrl = (buf) => "data:image/png;base64," + Buffer.from(buf).toString("base64");
const iconUrl = dataUrl(fs.readFileSync(path.join(EXT, "icons", "icon128.png")));

// A 1280x800 frame: caption on the left, real UI capture on the right.
const frame = (title, lines, img, imgW) => `<!doctype html><html><head><style>
  body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:Roboto,Arial,sans-serif;
       background:linear-gradient(135deg,#1b1b1f 0%,#2a1414 60%,#5c0f0b 100%);color:#fff;display:flex;align-items:center}
  .txt{width:470px;padding:0 40px 0 70px} .brand{display:flex;align-items:center;gap:12px;font-size:20px;opacity:.9;margin-bottom:28px}
  .brand img{width:44px;height:44px} h1{font-size:40px;line-height:1.15;margin:0 0 22px}
  li{font-size:20px;line-height:1.45;margin:0 0 10px;color:#e8e8e8} ul{padding-left:22px;margin:0}
  .shot{flex:1;display:flex;justify-content:center} .shot img{width:${imgW}px;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.12)}
</style></head><body><div class="txt"><div class="brand"><img src="${iconUrl}">W2G Video Adder</div><h1>${title}</h1>
<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div><div class="shot"><img src="${img}"></div></body></html>`;

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const hosts = ["www.youtube.com", "api.w2g.tv", "w2g.tv", "w2g-api.w2g.tv"];
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: "new",
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`,
      `--host-resolver-rules=${hosts.map((h) => `MAP ${h} 127.0.0.1:${PORT}`).join(", ")}`,
      "--ignore-certificate-errors", "--no-proxy-server", "--no-sandbox", "--hide-scrollbars", "--force-device-scale-factor=1"]
  });
  try {
    const swT = await browser.waitForTarget((t) => t.type() === "service_worker", { timeout: 10000 });
    const extId = new URL(swT.url()).host;
    const sw = await swT.worker();
    await sw.evaluate(() => chrome.storage.local.set({ apiKey: "demo-key-not-real" }));
    const room = await browser.newPage();
    await room.goto("https://w2g.tv/en/room/?access_key=demo", { waitUntil: "networkidle0" });

    // ---- 1: thumbnail buttons on a video feed ----
    const yt = await browser.newPage();
    await yt.setViewport({ width: 1280, height: 800 });
    await yt.goto("https://www.youtube.com/demo", { waitUntil: "networkidle0" });
    // send two videos first so the popup history has content
    for (const [sel, which] of [["#t0", "play"], ["#t3", "add"]]) {
      await yt.hover(sel); await sleep(150);
      const r = await yt.evaluate((w) => { const b = document.getElementById("w2g-adder-overlay").shadowRoot.getElementById(w).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, which);
      await yt.mouse.move(...r, { steps: 3 }); await yt.mouse.click(...r); await sleep(500);
    }
    await yt.mouse.move(5, 790); await sleep(400);
    await yt.hover("#t1"); await sleep(200);
    let r = await yt.evaluate(() => { const b = document.getElementById("w2g-adder-overlay").shadowRoot.getElementById("add").getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
    await yt.mouse.move(...r, { steps: 3 }); await yt.mouse.click(...r); await sleep(600);
    // keep pointer over the overlay so it stays visible, showing the "✓ Added" result
    await yt.screenshot({ path: path.join(OUT, "screenshot-1-thumbnail-buttons.png") });

    // ---- 2: popup (opened on a watch page so its buttons are live) ----
    const watch = await browser.newPage();
    await watch.goto("https://www.youtube.com/watch?v=DEMOvid0002", { waitUntil: "networkidle0" });
    await watch.bringToFront();
    let popupPng = null;
    try {
      await sw.evaluate(() => chrome.action.openPopup());
      const pt = await browser.waitForTarget((t) => t.url().endsWith("/popup.html"), { timeout: 4000 });
      const pp = await pt.asPage(); await sleep(700);
      popupPng = await pp.screenshot({ fullPage: true });
    } catch (e) {
      // fallback: popup page in a tab (buttons show disabled because the active tab is the popup itself)
      const pp = await browser.newPage();
      await pp.setViewport({ width: 344, height: 600 });
      await pp.goto(`chrome-extension://${extId}/popup.html`, { waitUntil: "networkidle0" }); await sleep(500);
      popupPng = await pp.screenshot({ fullPage: true });
      console.warn("openPopup unavailable, used tab fallback:", e.message);
    }

    // ---- 3: options ----
    const op = await browser.newPage();
    await op.setViewport({ width: 760, height: 640 });
    await op.goto(`chrome-extension://${extId}/options.html`, { waitUntil: "networkidle0" }); await sleep(300);
    const optPng = await op.screenshot({ fullPage: false });

    // ---- compose frames ----
    const fr = await browser.newPage();
    await fr.setViewport({ width: 1280, height: 800 });
    const shoot = async (html, file, w, h) => {
      await fr.setViewport({ width: w || 1280, height: h || 800 });
      await fr.setContent(html, { waitUntil: "load" }); await sleep(150);
      await fr.screenshot({ path: path.join(OUT, file), omitBackground: file.includes("icon") });
    };
    await shoot(frame("Your room's queue, one click away", [
      "Shows which W2G room videos will go to",
      "Add the current video, or play it now",
      "Recent sends: copy link or send again",
      "Shortcuts: Alt+Shift+Y add, Alt+Shift+U play"], dataUrl(popupPng), 360), "screenshot-2-popup.png");
    await shoot(frame("Set up once", [
      "Paste your free Watch2Gether API key",
      "Auto-detects the room from your open W2G tab, or pick a fixed room",
      "Toggle thumbnail buttons and the duplicate warning",
      "Key and settings stay in your browser"], dataUrl(optPng), 640), "screenshot-3-options.png");

    // ---- promo tile 440x280 ----
    await shoot(`<!doctype html><html><body style="margin:0;width:440px;height:280px;overflow:hidden;font-family:Roboto,Arial,sans-serif;
      background:linear-gradient(135deg,#b3120c,#e62117 60%,#ff5a3c);color:#fff;display:flex;align-items:center;gap:22px;padding:0 30px;box-sizing:border-box">
      <img src="${iconUrl}" style="width:104px;height:104px;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))">
      <div><div style="font-size:34px;font-weight:700;line-height:1.05">W2G Video<br>Adder</div>
      <div style="font-size:16px;margin-top:12px;line-height:1.35;opacity:.95">Send YouTube videos to your<br>Watch2Gether room in one click</div></div></body></html>`,
      "promo-small-440x280.png", 440, 280);

    // ---- store icon: 96px artwork centered in transparent 128 ----
    await shoot(`<!doctype html><html><body style="margin:0;width:128px;height:128px;background:transparent;display:flex;align-items:center;justify-content:center">
      <img src="${iconUrl}" style="width:96px;height:96px"></body></html>`, "store-icon-128.png", 128, 128);

    for (const f of fs.readdirSync(OUT)) console.log("wrote store/images/" + f);
  } finally {
    await browser.close();
    server.close();
  }
})();
