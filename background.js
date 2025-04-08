// Default configuration
const DEFAULT_CONFIG = {
  apiKey: 'xtm4nui82w30qzdtjvlhlg8d4zwkdjtq8d6diyz4m8hp7jeavzm8vcbttpabaz2t',
  roomId: 'lsli7nje42qm4x3l48'
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  // Set default configuration
  chrome.storage.sync.get(['apiKey', 'roomId'], (result) => {
    if (!result.apiKey) {
      chrome.storage.sync.set({ apiKey: DEFAULT_CONFIG.apiKey });
    }
    if (!result.roomId) {
      chrome.storage.sync.set({ roomId: DEFAULT_CONFIG.roomId });
    }
  });

  // Create context menu item for YouTube links
  chrome.contextMenus.create({
    id: 'addToW2G',
    title: 'Add to W2G Playlist',
    contexts: ['link'],
    documentUrlPatterns: ['*://*.youtube.com/*'],
    targetUrlPatterns: ['*://*.youtube.com/watch?v=*', '*://youtu.be/*']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'addToW2G') {
    addVideoToW2G(info.linkUrl);
  }
});

// Function to add video to W2G playlist
function addVideoToW2G(videoUrl) {
  chrome.storage.sync.get(['apiKey', 'roomId'], (config) => {
    const apiKey = config.apiKey || DEFAULT_CONFIG.apiKey;
    const roomId = config.roomId || DEFAULT_CONFIG.roomId;
    
    // Extract video title if possible (will be empty if not available)
    let videoTitle = '';
    try {
      // Try to extract title from URL or page content
      const urlObj = new URL(videoUrl);
      if (urlObj.searchParams.has('title')) {
        videoTitle = urlObj.searchParams.get('title');
      }
    } catch (e) {
      console.error('Error parsing URL:', e);
    }

    // Make API request to add video to playlist
    fetch(`https://api.w2g.tv/rooms/${roomId}/playlists/current/playlist_items/sync_update`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "w2g_api_key": apiKey,
        "add_items": [{"url": videoUrl, "title": videoTitle}]
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      // Show success notification
      chrome.action.setBadgeText({text: '✓'});
      chrome.action.setBadgeBackgroundColor({color: '#4CAF50'});
      
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({text: ''});
      }, 3000);
      
      console.log('Video added to W2G playlist:', data);
    })
    .catch(error => {
      // Show error notification
      chrome.action.setBadgeText({text: '✗'});
      chrome.action.setBadgeBackgroundColor({color: '#F44336'});
      
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({text: ''});
      }, 3000);
      
      console.error('Error adding video to W2G playlist:', error);
    });
  });
}
