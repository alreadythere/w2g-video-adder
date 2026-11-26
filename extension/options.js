// Firefox exposes the promise-based `browser` namespace; Chrome exposes `chrome`.
const api = globalThis.browser ?? globalThis.chrome;

const $ = (id) => document.getElementById(id);

// Firefox 137+ has commands.openShortcutSettings(); Chrome uses its shortcuts page.
function openShortcutSettings() {
  if (api.commands && typeof api.commands.openShortcutSettings === "function") return api.commands.openShortcutSettings();
  return api.tabs.create({ url: "chrome://extensions/shortcuts" });
}


function parseRoomKey(input) {
  const s = (input || "").trim();
  if (!s) return "";
  const m = s.match(/\/rooms\/([a-z0-9-]+)/i);
  const tail = m ? m[1] : s;
  // "myroom-1234567890abcd" -> "1234567890abcd"
  return tail.split("-").pop().replace(/[^a-z0-9]/gi, "").toLowerCase();
}

async function load() {
  const mf = api.runtime.getManifest();
  $("version").textContent = `v${mf.version_name || mf.version}`;
  const { apiKey = "", mode = "auto", manualKey = "", showThumbButtons = true, dupCheck = true } =
    await api.storage.local.get(["apiKey", "mode", "manualKey", "showThumbButtons", "dupCheck"]);
  $("showThumbButtons").checked = showThumbButtons;
  $("dupCheck").checked = dupCheck;
  $("apiKey").value = apiKey;
  $("manualKey").value = manualKey;
  document.querySelector(`input[name=mode][value=${mode}]`).checked = true;
}

$("save").addEventListener("click", async () => {
  const mode = document.querySelector("input[name=mode]:checked").value;
  const manualKey = parseRoomKey($("manualKey").value);
  await api.storage.local.set({
    apiKey: $("apiKey").value.trim(), mode, manualKey,
    showThumbButtons: $("showThumbButtons").checked,
    dupCheck: $("dupCheck").checked
  });
  $("manualKey").value = manualKey;
  $("status").textContent = mode === "manual" && !manualKey ? "Saved — but no room key entered." : "Saved.";
  setTimeout(() => ($("status").textContent = ""), 2500);
});

$("shortcuts").addEventListener("click", (e) => {
  e.preventDefault();
  openShortcutSettings();
});

load();
