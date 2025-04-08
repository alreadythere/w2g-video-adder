# W2G Video Adder Chrome Extension

This Chrome extension allows you to right-click YouTube links and directly add them to your Watch2Gether (W2G) room playlist.

## Features

- Right-click on any YouTube link on youtube.com to add it to your W2G room playlist
- Configure your API key and room ID through the extension popup
- Simple visual feedback when videos are added successfully

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension should now be installed and visible in your Chrome toolbar

## Usage

1. Click on the extension icon in your Chrome toolbar to configure:
   - API Key (pre-filled with the provided key)
   - Room ID (pre-filled with the provided room ID)
2. Save your settings
3. Go to YouTube.com
4. Right-click on any YouTube video link
5. Select "Add to W2G Playlist" from the context menu
6. The video will be added to your W2G room playlist

## Required Files

The extension consists of the following files:
- `manifest.json` - Extension configuration
- `background.js` - Background script that handles the context menu and API calls
- `popup.html` - Settings popup interface
- `popup.js` - JavaScript for the settings popup
- `images/` - Folder containing icon images (16px, 48px, and 128px)

## Notes

- You need to create icon files for the extension (16x16, 48x48, and 128x128 pixels)
- The extension only works on YouTube.com domains
- The context menu only appears for YouTube video links

## API Details

This extension uses the W2G API to add videos to a playlist. For more information about the API, see the [W2G API documentation](https://w2g.tv/api).
