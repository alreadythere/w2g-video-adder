# Changelog

All notable changes to W2G YouTube Adder. Format: [Keep a Changelog](https://keepachangelog.com/), versioning: [SemVer](https://semver.org/).

## [1.1.0] — 2026-11-26

### Added
- **Keyboard shortcuts:** `Alt+Shift+Y` adds the current YouTube video to the W2G playlist; `Alt+Shift+U` plays it now.
  Change them at `chrome://extensions/shortcuts`.
- **Play now:** new right-click items ("Play now in W2G") and popup button that switch the room to the video
  immediately (W2G `sync_update` API) instead of queueing it.
- **Recent history:** the popup lists the last 10 videos sent (title, room, added/played, time), with
  *Copy link* and *Send again* buttons and *Clear*. The extension keeps the last 50.
- **Duplicate warning:** adding a video that this extension already added to the same room in the last 12 hours
  is held back with a "?" badge and notification. Repeat the same action within 20 seconds to add it anyway.
  Can be turned off in Options.
- **+W2G thumbnail buttons:** hovering a YouTube thumbnail shows "+ W2G" (add) and "▶" (play now) buttons.
  Can be turned off in Options.
- Version number and release date shown in the popup and Options page.

### Changed
- Right-click menu now has four items (add/play for a link, add/play for the current watch page). Chrome groups
  them under "W2G YouTube Adder".

## [1.0.0] — 2026-11-26

### Added
- Right-click a YouTube link or watch page → add the video to the current playlist of the open W2G room
  (W2G `playlists/current/playlist_items/sync_update` API).
- Auto-detects the room's streamkey from the open W2G tab; manual room key as override/fallback.
- Video titles looked up via YouTube oEmbed.
- Options page for API key and room; popup with "Add this tab's video"; badge + notification feedback.
