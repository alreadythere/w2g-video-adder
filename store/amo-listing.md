# addons.mozilla.org listing — W2G Video Adder

Copy these into the AMO submission form. Keep this file in sync with each release.

## Name
W2G Video Adder

## Add-on URL slug
w2g-video-adder

## Summary (max 250 characters)
Send YouTube videos to your Watch2Gether room in one click. Add them to the room's playlist or play them right away, using hover buttons on thumbnails, the right-click menu, keyboard shortcuts or the toolbar popup.

## Description
Watching YouTube together on Watch2Gether (w2g.tv)? W2G Video Adder lets you send videos to your room without copying and pasting links.

How to send a video:
• Hover any YouTube thumbnail and click "+ W2G" to add it to the room's playlist, or "▶" to play it now
• Right-click a YouTube link or thumbnail → "Add video to W2G playlist" or "Play video now in W2G"
• On a video page, press Alt+Shift+Y to add it or Alt+Shift+U to play it now (changeable in Manage Extension Shortcuts)
• Or use the toolbar popup

More features:
• Finds your room automatically from your open Watch2Gether tab, or you can set a fixed room
• Works with regular videos, Shorts and youtu.be links
• Recent history in the popup (copy link, send again)
• Warns before adding the same video to the same room twice within 12 hours

Setup: you need a free Watch2Gether account and its API key. Log in on w2g.tv → Edit Profile → at the bottom, click "New" to create a key, then paste it into the add-on's options. Your W2G account must be a member of the room.

Privacy: the add-on sends the video link and title, the room ID and your W2G API key only to Watch2Gether, and the video link to YouTube to look up its title, and only when you send a video. Nothing else is collected; there are no analytics. Your API key, settings and history stay in your browser. Full policy: https://github.com/alreadythere/w2g-video-adder/blob/main/PRIVACY.md

Not affiliated with Watch2Gether or YouTube. Open source (MIT): https://github.com/alreadythere/w2g-video-adder

## Categories
Firefox: Social & Communication (primary), Photos, Music & Videos

## Tags
watch2gether, w2g, youtube, playlist, watch party

## Support / homepage
- Homepage: https://github.com/alreadythere/w2g-video-adder
- Support site: https://github.com/alreadythere/w2g-video-adder/issues

## License
MIT License

## Privacy policy (link)
https://github.com/alreadythere/w2g-video-adder/blob/main/PRIVACY.md

## Platforms
Firefox for desktop only (the right-click menu and keyboard shortcuts aren't available on Firefox for Android).

## Release notes (1.3.0)
First release on addons.mozilla.org. Send YouTube videos to your Watch2Gether room: add to the playlist or play now, from thumbnail buttons, the right-click menu, keyboard shortcuts or the popup.

## Source code
Not needed: the uploaded files are the plain, unminified source (no build tools or bundlers beyond copying files
and writing the Firefox manifest). Public repo: https://github.com/alreadythere/w2g-video-adder

## Notes to reviewer
This add-on calls the official Watch2Gether API (https://community.w2g.tv/t/watch2gether-api-documentation/133767):
- POST https://api.w2g.tv/rooms/{streamkey}/playlists/current/playlist_items/sync_update (add to playlist)
- POST https://api.w2g.tv/rooms/{streamkey}/sync_update (play now)
and https://www.youtube.com/oembed to look up video titles. Requests happen only when the user sends a video.

Permissions:
- webRequest (non-blocking, filtered to https://w2g-api.w2g.tv/rooms/*): reads the room ID from the W2G room page's own requests, so the user doesn't have to type it.
- scripting: if the room tab was opened before install, reads the same room ID from that tab's performance (resource timing) entries.
- tabs: find the open w2g.tv room tab; read the current tab's URL for the popup and shortcuts.
- contextMenus, notifications, storage: right-click items, result notifications, settings and history.
- Content script on www.youtube.com: adds the hover buttons only; it doesn't read or send page content except the hovered video's link and title.

To test: create a free account on w2g.tv, generate an API key (Edit Profile → New), open a room while logged in, paste the key in the add-on's options, then hover a YouTube thumbnail and click "+ W2G". No remote code is loaded; there are no third-party libraries.
