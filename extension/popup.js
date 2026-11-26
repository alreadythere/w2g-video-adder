const $ = (id) => document.getElementById(id);
const HISTORY_SHOWN = 10;

function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function showMsg(r) {
  $("msg").style.color = r.ok ? "#2e7d32" : r.duplicate ? "#a66b00" : "#c62828";
  $("msg").textContent = r.msg;
}

async function renderHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  const ul = $("history");
  ul.textContent = "";
  if (!history.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nothing sent yet.";
    ul.appendChild(li);
    return;
  }
  for (const h of history.slice(0, HISTORY_SHOWN)) {
    const li = document.createElement("li");

    const t = document.createElement("a");
    t.className = "t";
    t.href = h.url;
    t.target = "_blank";
    t.textContent = h.title || h.url;
    t.title = h.title || h.url;

    const m = document.createElement("div");
    m.className = "m";
    const info = document.createElement("span");
    info.textContent = `${h.action === "play" ? "▶ played" : "+ added"} · ${ago(h.ts)} · ${h.room}`;

    const btns = document.createElement("span");
    const copy = document.createElement("button");
    copy.textContent = "Copy link";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(h.url);
      copy.textContent = "Copied";
      setTimeout(() => (copy.textContent = "Copy link"), 1500);
    });
    const again = document.createElement("button");
    again.textContent = "Send again";
    again.title = "Add to the current room's playlist again (skips the duplicate check)";
    again.addEventListener("click", async () => {
      again.disabled = true;
      const r = await chrome.runtime.sendMessage({ type: "sendVideo", action: "add", url: h.url, fallbackTitle: h.title, force: true });
      showMsg(r);
      again.disabled = false;
      renderHistory();
    });
    btns.append(copy, again);
    m.append(info, btns);
    li.append(t, m);
    ul.appendChild(li);
  }
}

async function init() {
  const mf = chrome.runtime.getManifest();
  $("version").textContent = `v${mf.version_name || mf.version}`;

  const room = await chrome.runtime.sendMessage({ type: "getRoom" });
  $("room").textContent = room ? room.key : "none found";
  $("src").textContent = room ? `via ${room.source}${room.tabTitle ? " — " + room.tabTitle : ""}` :
    "Open your W2G room (reload it once after installing), or set a room in Options.";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isYt = /^https:\/\/(www\.|m\.)?youtube\.com\/(watch\?|shorts\/)|^https:\/\/youtu\.be\//.test(tab?.url || "");
  for (const id of ["add", "play"]) $(id).disabled = !isYt || !room;
  if (!isYt) $("msg").textContent = "Open a YouTube video to send it from here.";

  for (const action of ["add", "play"]) {
    $(action).addEventListener("click", async () => {
      $(action).disabled = true;
      $("msg").style.color = "";
      $("msg").textContent = "Sending…";
      const r = await chrome.runtime.sendMessage({
        type: "sendVideo", action, url: tab.url,
        fallbackTitle: (tab.title || "").replace(/\s*-\s*YouTube$/, "")
      });
      showMsg(r);
      $(action).disabled = false;
      renderHistory();
    });
  }

  // show current shortcut keys in button tooltips
  try {
    const cmds = await chrome.commands.getAll();
    const key = (name) => cmds.find((c) => c.name === name)?.shortcut || "not set";
    $("add").title = `Shortcut: ${key("add-current-video")}`;
    $("play").title = `Shortcut: ${key("play-current-video")}`;
    $("shortcuts").title = `Add: ${key("add-current-video")} · Play: ${key("play-current-video")}`;
  } catch {}

  renderHistory();
}

$("clear").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "clearHistory" });
  renderHistory();
});
$("opts").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("shortcuts").addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));

init();
