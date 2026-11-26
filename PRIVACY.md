# Privacy Policy — W2G Video Adder

_Last updated: 2026-11-26 (version 1.3.0)_

W2G Video Adder is a browser extension that sends YouTube videos you choose to your Watch2Gether (W2G) room.
It has no servers of its own, no analytics and no ads. The developer never receives any of your data.

## What is sent, and to whom

Only when **you** send a video (thumbnail button, right-click menu, keyboard shortcut or popup):

| Sent to | What | Why |
|---|---|---|
| **Watch2Gether** (`api.w2g.tv`) | The video's YouTube link and title, the room's ID, and your W2G API key | To add the video to your room's playlist or play it. The API key proves the request comes from your W2G account. |
| **YouTube** (`www.youtube.com/oembed`) | The video's YouTube link | To look up the video's title. |

Nothing is sent anywhere else, and nothing is sent in the background.

## What is read on your device (never sent)

- **Which W2G room you're in:** read from the web addresses that your open W2G room page itself requests from W2G.
  The extension only extracts the room ID and keeps it in temporary browser storage.
- **The YouTube link and title** of the video you choose to send, from the page you're on.

## What is stored on your device

In your browser's extension storage, never synced or uploaded by the extension:

- Your W2G API key and settings (room mode, saved room key, thumbnail buttons on/off, duplicate warning on/off)
- The last room a video was sent to
- A history of the last 50 videos you sent (link, title, room ID, added or played, time), used for the popup's
  Recent list and the duplicate warning. Clear it any time with **Clear** in the popup.
- Temporary data (detected room IDs, the duplicate-confirmation window), deleted when the browser closes

Uninstalling the extension deletes all of it.

## Third parties

Data you send goes to Watch2Gether and YouTube, under their own privacy policies:
[Watch2Gether](https://w2g.tv) (see the privacy link on their site) · [Google/YouTube](https://policies.google.com/privacy)

## Contact

Questions or concerns: open an issue at https://github.com/alreadythere/w2g-video-adder/issues
