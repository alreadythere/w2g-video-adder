# W2G YouTube Adder — quick reference

**Version 1.2.0 (2026-11-26).** Chrome and Firefox (142+). Changes: [CHANGELOG.md](CHANGELOG.md).
Full guide with options, room selection and troubleshooting: https://github.com/alreadythere/w2g-video-adder#readme

## Install
1. **Chrome:** `chrome://extensions` → **Developer mode** on → **Load unpacked** → select this `extension` folder.
   **Firefox:** build it first (`npm run build` in the repo), then `about:debugging` → **This Firefox** →
   **Load Temporary Add-on…** → `dist/firefox/manifest.json`. For a permanent install, see the full guide.
2. Options: paste your W2G API key (w2g.tv → log in → Edit Profile → bottom → **New**) and click **Save**.
3. Reload your W2G room tab and any open YouTube tabs once.

## Send a video
| Where you are | Add to playlist | Play now |
|---|---|---|
| Hovering a YouTube thumbnail | **+ W2G** button | **▶** button |
| Right-clicking a YouTube link or thumbnail | *Add video to W2G playlist* | *Play video now in W2G* |
| Right-clicking an empty part of a watch page | *Add this page's video to W2G playlist* | *Play this page's video now in W2G* |
| Watching a video (keyboard) | `Alt+Shift+Y` | `Alt+Shift+U` |
| Watching a video (toolbar popup) | **+ Add to playlist** | **▶ Play now** |

- **Change shortcuts** at `chrome://extensions/shortcuts` (Chrome) or `about:addons` → gear → **Manage Extension Shortcuts** (Firefox). On a Mac, `Alt` is the Option key.
- **Badge:** green ✓ means sent, amber ? means a duplicate (repeat within 20 s to add anyway), red ! means an error.
- **The popup** shows the target room and your last 10 sends (Copy link / Send again / Clear).

Your W2G account must be a member of the room. Your API key stays in your browser profile and is sent only to api.w2g.tv.

License: MIT (see LICENSE).
