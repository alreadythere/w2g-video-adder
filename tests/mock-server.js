// HTTPS mock for www.youtube.com, w2g.tv, w2g-api.w2g.tv and api.w2g.tv (routed by Host header).
const https = require("https");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOM_KEY = "lslmockroom1234567";
// Titles for the made-up videos on /demo (store screenshots).
const DEMO_TITLES = {
  DEMOvid0001: "Synthwave Night Drive — 1 Hour Mix",
  DEMOvid0002: "Ramen From Scratch: 12-Hour Broth",
  DEMOvid0003: "Retro Handheld Showdown 2026",
  DEMOvid0004: "Morning Jazz Café — Live Session",
  DEMOvid0005: "Garage Workshop Build in 10 Minutes",
  DEMOvid0006: "Trail Run at Sunrise — Full Route"
};
const log = [];

const YT_HOME = `<!doctype html><html><head><title>YouTube</title>
<style>body{font-family:Arial;background:#fff;margin:20px} .grid{display:flex;gap:16px;flex-wrap:wrap}
.card{width:320px} a#thumbnail,.yt-lockup-view-model__content-image{display:block;width:320px;height:180px;background:#333;border-radius:12px;overflow:hidden}
img{width:320px;height:180px;object-fit:cover;display:block} h3{font-size:14px;margin:6px 0}</style></head>
<body>
<div class="grid">
  <ytd-rich-item-renderer class="card" id="card1">
    <a id="thumbnail" href="/watch?v=AAAAAAAAAAA"><yt-image><img src="/thumb.svg?c=c62828"></yt-image></a>
    <h3><a id="video-title-link" href="/watch?v=AAAAAAAAAAA" title="Classic Layout Video">Classic Layout Video</a></h3>
  </ytd-rich-item-renderer>
  <yt-lockup-view-model class="card" id="card2">
    <a class="yt-lockup-view-model__content-image" href="/watch?v=BBBBBBBBBBB&amp;pp=xyz"><yt-thumbnail-view-model><img src="/thumb.svg?c=1565c0"></yt-thumbnail-view-model></a>
    <h3 title="New Lockup Layout Video">New Lockup Layout Video</h3>
  </yt-lockup-view-model>
  <ytm-shorts-lockup-view-model class="card" id="card3">
    <a class="shortsLockupViewModelHostEndpoint" href="/shorts/CCCCCCCCCCC"><img src="/thumb.svg?c=2e7d32"></a>
    <h3>A Short</h3>
  </ytm-shorts-lockup-view-model>
  <div class="card" id="card4"><a id="channel-link" href="/@somechannel"><img src="/thumb.svg?c=777"></a><h3>Channel link (should NOT get buttons)</h3></div>
</div>
<div style="height:2000px"></div>
</body></html>`;

const W2G_ROOM = `<!doctype html><html><head><title>Watch2Gether</title></head><body>
<h1>Mock W2G room</h1>
<script>fetch("https://w2g-api.w2g.tv/rooms/${ROOM_KEY}/room_info").then(r=>r.text()).then(()=>document.title="Watch2Gether (joined)");</script>
</body></html>`;

function send(res, status, type, body, extra = {}) {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*", ...extra });
  res.end(body);
}

const PORT = Number(process.env.MOCK_PORT || 8443);

// Self-signed cert for the mocked hosts; generated on first run (needs openssl).
const KEY = path.join(__dirname, "key.pem");
const CERT = path.join(__dirname, "cert.pem");
if (!fs.existsSync(KEY) || !fs.existsSync(CERT)) {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", KEY, "-out", CERT,
    "-days", "30", "-subj", "/CN=w2g-mock",
    "-addext", "subjectAltName=DNS:www.youtube.com,DNS:api.w2g.tv,DNS:w2g.tv,DNS:w2g-api.w2g.tv"], { stdio: "ignore" });
}

const server = https.createServer(
  { key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) },
  (req, res) => {
    const host = (req.headers.host || "").split(":")[0];
    const url = new URL(req.url, `https://${host}`);
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (host === "www.youtube.com") {
        if (url.pathname === "/") return send(res, 200, "text/html", YT_HOME);
        if (url.pathname === "/demo") return send(res, 200, "text/html", fs.readFileSync(path.join(__dirname, "fixtures", "demo-home.html"), "utf8"));
        if (url.pathname === "/thumb.svg") {
          const c = "#" + (url.searchParams.get("c") || "999");
          return send(res, 200, "image/svg+xml", `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="${c}"/></svg>`);
        }
        if (url.pathname === "/watch") return send(res, 200, "text/html", `<!doctype html><title>Mock Watch ${url.searchParams.get("v")} - YouTube</title><body><h1>Watch page</h1></body>`);
        if (url.pathname === "/oembed") {
          const v = new URL(url.searchParams.get("url")).searchParams.get("v");
          return send(res, 200, "application/json", JSON.stringify({ title: DEMO_TITLES[v] || `oEmbed title for ${v}` }));
        }
      }
      if (host === "w2g.tv" && url.pathname.startsWith("/en/room")) return send(res, 200, "text/html", W2G_ROOM);
      if (host === "w2g-api.w2g.tv") return send(res, 200, "application/json", "{}");
      if (host === "api.w2g.tv") {
        if (url.pathname === "/__log") return send(res, 200, "application/json", JSON.stringify(log));
        if (url.pathname === "/__reset") { log.length = 0; return send(res, 200, "application/json", "[]"); }
        if (req.method === "POST") {
          log.push({ path: url.pathname, body: JSON.parse(body || "{}") });
          return send(res, 200, "application/json", "{}");
        }
      }
      send(res, 404, "text/plain", "not found");
    });
  }
);

if (require.main === module) server.listen(PORT, () => console.log(`mock listening on ${PORT}`));
module.exports = { server, log, ROOM_KEY, PORT };
