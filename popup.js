// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const apiKeyInput = document.getElementById('apiKey');
  const roomIdInput = document.getElementById('roomId');
  const saveButton = document.getElementById('saveButton');
  const statusEl = document.getElementById('status');
  const roomLink = document.getElementById('roomLink');

  // Load saved settings
  chrome.storage.sync.get(['apiKey', 'roomId'], function(result) {
    apiKeyInput.value = result.apiKey || '';
    roomIdInput.value = result.roomId || '';
    updateRoomLink(result.roomId);
  });

  // Save settings when button is clicked
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const roomId = roomIdInput.value.trim();
    
    // Validate input
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (!roomId) {
      showStatus('Please enter a Room ID', 'error');
      return;
    }
    
    // Save settings
    chrome.storage.sync.set({ 
      apiKey: apiKey,
      roomId: roomId
    }, function() {
      showStatus('Settings saved successfully!', 'success');
      updateRoomLink(roomId);
    });
  });

  // Function to show status message
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    statusEl.style.display = 'block';
    
    // Hide status after 3 seconds
    setTimeout(function() {
      statusEl.style.display = 'none';
    }, 3000);
  }
  
  // Function to update room link
  function updateRoomLink(roomId) {
    if (roomId) {
      roomLink.href = `https://w2g.tv/rooms/${roomId}`;
    } else {
      roomLink.href = 'https://w2g.tv/';
    }
  }
});
