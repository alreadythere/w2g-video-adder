# W2G Video Adder

A Chrome and Firefox extension that sends YouTube videos to your open [Watch2Gether](https://w2g.tv) room in one click.
You can **queue** a video at the end of the room's current playlist or **play it now**.

**Current version: 1.3.0 (2026-11-26).** What changed: [extension/CHANGELOG.md](extension/CHANGELOG.md)

---

## Contents
- [Quick start (Chrome)](#quick-start-chrome)
- [Quick start (Firefox)](#quick-start-firefox)
- [Ways to send a video](#ways-to-send-a-video)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Thumbnail buttons](#thumbnail-buttons)
- [The toolbar popup](#the-toolbar-popup)
- [Duplicate warning](#duplicate-warning)
- [Options](#options)
- [Which room gets the video](#which-room-gets-the-video)
- [What the feedback means](#what-the-feedback-means)
- [Troubleshooting](#troubleshooting)
- [Updating](#updating)
- [Privacy and your API key](#privacy-and-your-api-key)
- [Development](#development)
- [License](#license)

---

## Quick start (Chrome)

Works in Chrome and other Chromium browsers (Edge, Brave).

1. **Get the code.** Clone this repo, or click **Code → Download ZIP** on GitHub and unzip it somewhere you'll keep it.
2. **Load it into Chrome.**
   1. Open `chrome://extensions`.
   2. Turn on **Developer mode** (top right).
   3. Click **Load unpacked** and select the **`extension`** folder (not the repo root).
3. **Add your W2G API key.** The Options page opens by itself the first time.
   1. On [w2g.tv](https://w2g.tv), log in, then go to **Edit Profile**.
   2. At the bottom of that page, click **New** to generate a key.
   3. Paste it into the extension's Options and click **Save**.
4. **Join your room.** Open your W2G room in a tab while logged in to the same W2G account. Reload that tab once
   after installing, so the extension can detect the room.
5. **Reload any open YouTube tabs** so the thumbnail buttons appear.
6. **Pin the extension** (puzzle-piece icon in the toolbar → pin) so you can see its badge and open the popup.

> Your W2G account (the one the API key belongs to) must be a member of the room you're sending to.

---

## Quick start (Firefox)

Needs **Firefox 142 or newer** (desktop). Firefox uses its own build of the extension, made from the same code.

**1. Build it** (needs [Node.js](https://nodejs.org) 20+):
```bash
git clone https://github.com/alreadythere/w2g-video-adder
cd w2g-video-adder
npm install
npm run build
```
This creates the `dist/firefox/` folder and `dist/w2g-video-adder-firefox-v<version>.zip`.

**2. Install it.** Regular Firefox only keeps add-ons that Mozilla has signed, so pick one:

| Option | Lasts | How |
|---|---|---|
| **Temporary** (quickest) | Until Firefox restarts | Open `about:debugging` → **This Firefox** → **Load Temporary Add-on…** → pick `dist/firefox/manifest.json` |
| **Signed, private** (recommended) | Permanently | Sign it yourself as an *unlisted* add-on (it won't appear on Mozilla's site). Create API credentials at [addons.mozilla.org → Developer Hub → Manage API Keys](https://addons.mozilla.org/developers/addon/api/key/), set them as the `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` environment variables, then run `npm run sign:firefox`. Open the signed `.xpi` it saves in `dist/` with Firefox to install it. |
| **Unsigned** | Permanently | Only in Firefox Developer Edition, Nightly or ESR: set `xpinstall.signatures.required` to `false` in `about:config`, then open the zip from `dist/` with Firefox. |

**3. Set it up.** Firefox shows what the add-on can access and the data it sends (the video link, the page title
as a fallback, and your W2G API key, all sent only to W2G). Then follow steps 3–6 of the Chrome quick start:
API key in Options, reload your W2G room tab and YouTube tabs, and pin the icon (Extensions puzzle-piece button →
gear → **Pin to Toolbar**).

> Never paste your AMO API credentials or W2G API key into the repo or into an issue.

---

## Ways to send a video

| Where you are | To add to the playlist | To play it now |
|---|---|---|
| Hovering any YouTube thumbnail | Click **+ W2G** | Click **▶** |
| Right-clicking a YouTube link or thumbnail | **Add video to W2G playlist** | **Play video now in W2G** |
| Right-clicking an empty part of a watch page | **Add this page's video to W2G playlist** | **Play this page's video now in W2G** |
| Watching a video (keyboard) | `Alt+Shift+Y` | `Alt+Shift+U` |
| Watching a video (toolbar popup) | **+ Add to playlist** | **▶ Play now** |

- **Add** puts the video at the end of the room's current playlist.
- **Play now** switches the room's player to that video immediately (W2G's "share" call).
- **Supported links:** regular videos (`youtube.com/watch?v=…`), Shorts (`youtube.com/shorts/…`), short links
  (`youtu.be/…`) and mobile links (`m.youtube.com`). Shorts are sent as normal video links. Extra parameters
  such as playlist position, timestamp and tracking codes are stripped.
- **Right-click menu:** Chrome groups the menu items under **W2G Video Adder**. Over the video player itself,
  YouTube shows its own menu; right-click a second time to get Chrome's.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+Y` | Add the video you're watching to the W2G playlist |
| `Alt+Shift+U` | Play the video you're watching now in W2G |

- **Where they work:** on any YouTube video or Shorts page. On other pages they show an error notification.
- **On a Mac,** `Alt` is the **Option** key.
- **To change them,** or to set one the browser left blank because another extension already uses that key:
  - **Chrome:** open `chrome://extensions/shortcuts`, find **W2G Video Adder**, click the pencil icon, and press your new keys.
  - **Firefox:** open `about:addons`, click the gear icon → **Manage Extension Shortcuts**, and type new keys
    in the boxes under **W2G Video Adder**.
- **Check what's active:** hover the **+ Add to playlist** or **▶ Play now** button in the popup. The tooltip shows
  the current shortcut, or "not set".
- The popup's **Shortcuts** link opens the shortcuts page directly.

---

## Thumbnail buttons

Hover a video thumbnail on YouTube and two buttons appear in its top-left corner. Verified on the home feed and
Shorts shelves. They should work anywhere YouTube shows a linked video thumbnail (search, subscriptions, the
watch-page sidebar), but those pages haven't been tested.

| Button | Does |
|---|---|
| **+ W2G** | Adds the video to the room's playlist |
| **▶** | Plays the video now in the room |

- **The button changes to show the result:** **✓ Added**, **▶ Playing**, **Dup? click again** (see
  [Duplicate warning](#duplicate-warning)) or **! Error**. Hover the button to read the full message.
- **Clicking a button never opens the video,** so you can keep browsing.
- **Hover previews:** the buttons also work while YouTube's hover preview is playing.
- **Scrolling** hides the buttons. Move the mouse again and they come back.
- **Notifications:** thumbnail buttons show their result on the button itself, so they skip the pop-up
  notification. The toolbar badge still updates.
- **To turn them off:** Options → **Show "+ W2G" / "▶" buttons when hovering YouTube thumbnails**.
  The change applies right away.

---

## The toolbar popup

Click the extension icon to open it:

- **Target room:** the room ID the next video will go to, and how it was found (for example
  "via open tab — Watch2Gether").
- **+ Add to playlist / ▶ Play now:** sends the video in the current tab. These buttons are greyed out
  unless the current tab is a YouTube video.
- **Recent:** the last 10 videos you sent, newest first. Each shows whether it was added or played, how long ago,
  and which room.
  - **Copy link:** copies the YouTube link.
  - **Send again:** adds it to the current room's playlist again, skipping the duplicate check.
  - **Clear:** empties the history.
- **Footer:** the version (plus release date in Chrome), and **Shortcuts** and **Options** links.

The extension keeps the last 50 sends. History is stored only in your browser.

---

## Duplicate warning

If you **add** a video that this extension already added to the **same room** in the **last 12 hours**, it isn't
sent straight away:

- The badge shows an amber **?**, and a notification says when it was added.
- On a thumbnail, the button changes to **Dup? click again**.
- **To add it anyway,** repeat the same action (click, menu item or shortcut) within **20 seconds**.

**Play now** is never blocked, and neither is **Send again** in the popup. The extension only knows about
videos it sent itself, not ones added directly in W2G. To turn the check off: Options → **Warn before adding a video
already added to the same room in the last 12 hours**.

---

## Options

Right-click the extension icon and choose **Options**, or use the **Options** link in the popup.

| Setting | What it does |
|---|---|
| **Watch2Gether API key** | Required. Lets the extension send videos to your rooms. |
| **Auto-detect from my open W2G tab** | Default. Uses the W2G room you have open (see below). |
| **Always use the room below** | Always sends to the room you enter, even if a different room is open. |
| **Room streamkey or room URL** | Paste a room link like `https://w2g.tv/rooms/myroom-abc123…` or just the key. Also used as a fallback when no room tab is open. |
| **Show "+ W2G" / "▶" buttons…** | Turns the thumbnail buttons on or off. |
| **Warn before adding a video already added…** | Turns the duplicate warning on or off. |

The Options page also shows the version and a link to the shortcuts page. Click **Save** after changes.

---

## Which room gets the video

1. **"Always use the room below"** is selected and a room is entered → that room.
2. Otherwise, **your open W2G room tab.** If several are open, the one you used most recently wins. The
   extension reads the room's ID from the room page's own requests to W2G. That's why the room tab needs one
   reload after installing.
3. Otherwise, the **room key saved in Options**.
4. Otherwise, the **last room that worked**.

The popup always shows which room is targeted and why.

---

## What the feedback means

| Badge on the icon | Meaning |
|---|---|
| Green **✓** | Sent successfully |
| Amber **?** | Held back as a duplicate. Repeat within 20 s to add anyway |
| Red **!** | Something went wrong. The notification, button tooltip or popup says what |

The badge clears after about 4 seconds.

---

## Troubleshooting

| Message or symptom | What to do |
|---|---|
| "Set your W2G API key in the extension options first." | Generate a key on w2g.tv (Edit Profile → New) and save it in Options. |
| "No W2G room found…" | Open your room in a tab and reload it once, or paste the room link into Options. |
| "W2G returned 401" or "403 …" | The API key is wrong, or your W2G account hasn't joined that room. Open the room while logged in. |
| "W2G returned 404 … Room not found" | The room key is wrong. Re-paste the room link in Options, or switch back to auto-detect. |
| "The shortcut works on a YouTube video page." | Open a video first. On the home page, use the thumbnail buttons or the right-click menu instead. |
| "That doesn't look like a YouTube video link." | The link is a channel, playlist or other non-video page. |
| Thumbnail button says "! Error" with "Extension was reloaded — refresh this YouTube tab." | You updated or reloaded the extension. Refresh the YouTube tab. |
| No thumbnail buttons | Reload the YouTube tab, and check that the option is on. YouTube occasionally changes its page layout; if buttons stop appearing for good, the right-click menu and shortcuts still work. |
| A shortcut does nothing | Check the shortcut settings (see [Keyboard shortcuts](#keyboard-shortcuts)). The browser leaves a shortcut blank if another extension already uses those keys. |
| Firefox: nothing works, or no thumbnail buttons | Open `about:addons` → **W2G Video Adder** → **Permissions** and make sure access to youtube.com and the w2g.tv sites is allowed. |
| Firefox: the add-on is gone after a restart | It was loaded as a temporary add-on. Install a signed copy instead (see [Quick start (Firefox)](#quick-start-firefox)). |
| The video went to the wrong room | Check the popup's **Target room**. Close other W2G tabs, or use **Always use the room below**. |

---

## Updating

**Chrome:**
1. Replace the files in your `extension` folder with the new ones (or `git pull`).
2. On `chrome://extensions`, click the **⟳** reload icon on the extension's card.
3. Refresh your W2G room tab and YouTube tabs.

**Firefox:** `git pull`, `npm run build`, then reload the temporary add-on in `about:debugging`. If you use a
signed copy, run `npm run sign:firefox` again and open the new `.xpi`. Firefox needs the version number in
`extension/manifest.json` to go up before it will sign a new copy.

Your API key, settings and history are kept.

---

## Privacy and your API key

- **Your API key** is stored only in your browser profile and is sent only to `api.w2g.tv`.
- **Video titles** are looked up from YouTube's public oEmbed service (`youtube.com/oembed`).
- **No other data** is collected or sent anywhere. Full details: [PRIVACY.md](PRIVACY.md).
- **Never commit your API key** to this repo or share it. Anyone with it can change rooms your account belongs to.
  If it leaks, generate a new one on w2g.tv.

---

## Development

```
extension/   the extension source (Chrome manifest; load this folder in Chrome)
scripts/     build.js: makes dist/chrome and dist/firefox (+ zips) from extension/
tests/       unit tests (mocked browser APIs), build tests, end-to-end test in real Chrome
dist/        build output (git-ignored)
```

```bash
npm install
npm test               # 42 tests: background logic under Chrome's and Firefox's API namespaces, plus the build
npm run test:e2e       # loads extension/ into real Chrome against a local mock of YouTube + W2G
npm run build          # dist/chrome, dist/firefox and a zip for each
npm run lint:firefox   # Mozilla's add-ons linter on the Firefox build
npm run start:firefox  # opens Firefox with the add-on in a temporary profile (needs Firefox installed)
npm run sign:firefox   # signs the Firefox build as an unlisted add-on (needs WEB_EXT_API_KEY / WEB_EXT_API_SECRET)
```

**Publishing:** listing text, reviewer notes and categories for addons.mozilla.org are in
[store/amo-listing.md](store/amo-listing.md). Bump the version in `extension/manifest.json` and run `npm run build`
before each upload.

**Cross-browser notes:** all API calls go through `const api = globalThis.browser ?? globalThis.chrome`.
`extension/manifest.json` is the Chrome manifest. `scripts/build.js` derives the Firefox manifest from it:
background event page instead of a service worker, `options_ui`, the gecko add-on ID, minimum version 142,
and data-collection permissions.

- **Browser:** the end-to-end test needs Chrome or Chrome for Testing. Set `CHROME_PATH` to its location; the
  default is `/usr/bin/google-chrome`.
- **Certificates:** it also needs `openssl`, which it uses to generate a throwaway self-signed certificate for the
  mock hosts.
- **Port:** it uses port 8443 by default; set `MOCK_PORT` to change it.
- **Screenshots** are saved in `tests/shots/`.

**APIs used** ([W2G API docs](https://community.w2g.tv/t/watch2gether-api-documentation/133767)):
- Add: `POST https://api.w2g.tv/rooms/{streamkey}/playlists/current/playlist_items/sync_update`
  with `{ "w2g_api_key", "add_items": [{ "url", "title" }] }`
- Play now: `POST https://api.w2g.tv/rooms/{streamkey}/sync_update` with `{ "w2g_api_key", "item_url" }`

---

## License

[MIT](LICENSE)
