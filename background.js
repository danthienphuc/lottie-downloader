// Background service worker for the Lottie Assets Extractor
chrome.runtime.onInstalled.addListener(() => {
  console.log('Lottie Assets Extractor installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'updateBadge':
      updateBadge(sender.tab.id, request.count);
      break;
    
    case 'getLottieLinks':
      // Forward request to content script if popup is asking
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, request, sendResponse);
        return true; // Keep message channel open for async response
      }
      break;
    
    case 'openLottieFiles':
      chrome.tabs.create({ url: 'https://lottiefiles.com/free-animations' });
      break;
    
    case 'showNotification':
      showNotification(request.message);
      break;
  }
});

// Update extension badge
function updateBadge(tabId, count) {
  if (count > 0) {
    chrome.action.setBadgeText({
      text: count.toString(),
      tabId: tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#4CAF50',
      tabId: tabId
    });
  } else {
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }
}

// Show notification
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'hello_extensions.png',
    title: 'Lottie Assets Extractor',
    message: message
  });
}

// Clear badge when tab is updated (navigated to different page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      !tab.url.includes('lottiefiles.com') && 
      !tab.url.includes('app.lottiefiles.com')) {
    chrome.action.setBadgeText({
      text: '',
      tabId: tabId
    });
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Clear badge for non-lottiefiles tabs
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url || 
      (!tab.url.includes('lottiefiles.com') && 
       !tab.url.includes('app.lottiefiles.com'))) {
    chrome.action.setBadgeText({
      text: '',
      tabId: activeInfo.tabId
    });
  }
});