# Chrome Web Store listing — W2G Video Adder

Answers for each tab of the Chrome Web Store Developer Dashboard. Keep in sync with each release.
Package: `dist/w2g-video-adder-chrome-v<version>.zip` (`npm run build`). Images: `store/images/` (`npm run store:images`).

## Store listing tab

**Name / summary:** come from `extension/manifest.json` (summary = `description`, max 132 characters).

**Description**
```
Watching YouTube together on Watch2Gether (w2g.tv)? W2G Video Adder lets you send videos to your room without copying and pasting links.

How to send a video:
• Hover any YouTube thumbnail and click "+ W2G" to add it to the room's playlist, or "▶" to play it now
• Right-click a YouTube link or thumbnail → "Add video to W2G playlist" or "Play video now in W2G"
• On a video page, press Alt+Shift+Y to add it or Alt+Shift+U to play it now (change them at chrome://extensions/shortcuts)
• Or use the toolbar popup

More features:
• Finds your room automatically from your open Watch2Gether tab, or you can set a fixed room
• Works with regular videos, Shorts and youtu.be links
• Recent history in the popup (copy link, send again)
• Warns before adding the same video to the same room twice within 12 hours

Setup: you need a free Watch2Gether account and its API key. Log in on w2g.tv → Edit Profile → at the bottom, click "New" to create a key, then paste it into the extension's options. Your W2G account must be a member of the room.

Privacy: the extension sends the video link and title, the room ID and your W2G API key only to Watch2Gether, and the video link to YouTube to look up its title, and only when you send a video. Nothing else is collected; there are no analytics. Your API key, settings and history stay in your browser.

Not affiliated with Watch2Gether or YouTube. Open source (MIT): https://github.com/alreadythere/w2g-video-adder
```

**Category:** Entertainment · **Language:** English

**Graphic assets**
| Field | File |
|---|---|
| Store icon (128×128) | `store/images/store-icon-128.png` |
| Screenshots (1280×800) | `store/images/screenshot-1-thumbnail-buttons.png`, `screenshot-2-popup.png`, `screenshot-3-options.png` |
| Small promo tile (440×280) | `store/images/promo-small-440x280.png` |

**Additional fields**
- Homepage URL: https://github.com/alreadythere/w2g-video-adder
- Support URL: https://github.com/alreadythere/w2g-video-adder/issues

## Privacy practices tab

**Single purpose**
```
Send YouTube videos the user chooses to the user's own Watch2Gether (w2g.tv) room, either adding them to the room's current playlist or playing them immediately.
```

**Permission justifications**
| Permission | Justification |
|---|---|
| contextMenus | Adds "Add video to W2G playlist" and "Play video now in W2G" items to the right-click menu on YouTube links and YouTube video pages. |
| storage | Saves the user's Watch2Gether API key and settings, the last room used, and a local list of the last 50 videos the user sent (shown in the popup and used for the duplicate warning). Nothing is synced or uploaded. |
| scripting | If the user's w2g.tv room tab was already open before the extension was installed, reads that tab's own resource-timing entries to find the room ID. Only runs on w2g.tv tabs. |
| webRequest | Observes, without blocking or changing, the requests that the user's open Watch2Gether room page makes to w2g-api.w2g.tv/rooms/…, to learn the room ID so the user doesn't have to type it. |
| notifications | Shows whether a video was added or played, or why sending failed. |
| tabs | Finds the user's open w2g.tv room tab (the most recently used one), and reads the current tab's address and title when the user sends the video they're watching from the popup or a keyboard shortcut. |
| Host permissions | api.w2g.tv: send the add/play request to the official Watch2Gether API. w2g.tv and w2g-api.w2g.tv: detect the room ID from the open room tab. www.youtube.com: content script that shows the "+ W2G" / "▶" buttons on thumbnails, and YouTube's oEmbed endpoint to look up the video title. |

**Remote code:** No, I am not using remote code. (All JavaScript is in the package; no eval, no remote scripts.)

**Data usage — collected:** ☑ Authentication information (the user's W2G API key, sent only to Watch2Gether) · ☑ Web history (the link of the video the user chooses to send) · ☑ Website content (that video's title).
Everything else unchecked.

**Certifications:** ☑ I do not sell or transfer user data to third parties, outside of the approved use cases · ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose · ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/alreadythere/w2g-video-adder/blob/main/PRIVACY.md

## Distribution tab
Free · Public · All regions.

## Test instructions (for reviewers)
```
Needs a free Watch2Gether account. 1) Sign up at w2g.tv, then Edit Profile → New to create an API key. 2) Create a room and keep it open in a tab (logged in). 3) Paste the key in the extension's Options and Save, then reload the room tab. 4) On youtube.com, hover a thumbnail and click "+ W2G" (or right-click a video link → "Add video to W2G playlist"). The video appears in the room's playlist. API docs: https://community.w2g.tv/t/watch2gether-api-documentation/133767
```
