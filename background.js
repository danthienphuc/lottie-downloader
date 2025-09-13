// Background service worker for the Lottie Assets Extractor
chrome.runtime.onInstalled.addListener(() => {
  console.log('Lottie Assets Extractor installed');
});

// Handle extension icon click - open manager tab
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if manager tab already exists
    const existingTabs = await chrome.tabs.query({ 
      url: chrome.runtime.getURL('manager.html') 
    });
    
    if (existingTabs.length > 0) {
      // Focus existing manager tab
      chrome.tabs.update(existingTabs[0].id, { active: true });
      chrome.windows.update(existingTabs[0].windowId, { focused: true });
    } else {
      // Create new manager tab in new window
      chrome.windows.create({
        url: chrome.runtime.getURL('manager.html'),
        type: 'normal',
        focused: true,
        width: 1200,
        height: 800
      });
    }
  } catch (error) {
    console.error('Error opening manager tab:', error);
  }
});

// Handle messages from content script and manager
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'updateBadge':
      updateBadge(sender.tab.id, request.count);
      break;
    
    case 'getLottieLinks':
      // Forward request to content script if manager is asking
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

// Listen for tab updates to update badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('lottiefiles.com') || 
        tab.url.includes('app.lottiefiles.com') || 
        tab.url.includes('lottie.host')) {
      
      // Execute content script to count links
      try {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: countLottieLinks
        }).then(results => {
          if (results && results[0]) {
            const linkCount = results[0].result || 0;
            
            // Update badge
            chrome.action.setBadgeText({
              text: linkCount > 0 ? linkCount.toString() : '',
              tabId: tabId
            });
            
            chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
            
            // Show notification if links found
            if (linkCount > 0) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'hello_extensions.png',
                title: 'Lottie Assets Found!',
                message: `Found ${linkCount} Lottie asset${linkCount === 1 ? '' : 's'} on this page. Click extension to manage.`
              });
            }
          }
        }).catch(error => {
          console.warn('Error counting Lottie links:', error);
          // Try to get count from existing content script
          chrome.tabs.sendMessage(tabId, { action: 'getLinkCount' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Content script not available yet');
            } else if (response && response.count) {
              chrome.action.setBadgeText({
                text: response.count > 0 ? response.count.toString() : '',
                tabId: tabId
              });
            }
          });
        });
      } catch (error) {
        console.error('Chrome scripting API not available:', error);
      }
    } else {
      // Clear badge for non-lottiefiles tabs
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  }
});

// Handle tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url || 
        !(tab.url.includes('lottiefiles.com') || 
          tab.url.includes('app.lottiefiles.com') || 
          tab.url.includes('lottie.host'))) {
      chrome.action.setBadgeText({
        text: '',
        tabId: activeInfo.tabId
      });
    }
  } catch (error) {
    // Tab might not exist anymore
  }
});

// Clear badge when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.action.setBadgeText({ text: '', tabId: tabId });
});

// Function to count Lottie links (injected into page)
function countLottieLinks() {
  const links = new Set();
  
  const lottiePatterns = [
    /https:\/\/assets-v2\.lottiefiles\.com\/[^"'\s]+\.lottie/gi,
    /https:\/\/assets\d*\.lottiefiles\.com\/[^"'\s]+\.json/gi,
    /https:\/\/lottie\.host\/[^"'\s]+\.(lottie|json)/gi,
    /https:\/\/[^"'\s]*lottiefiles[^"'\s]*\.(lottie|json)/gi
  ];

  const pageText = document.documentElement.innerHTML;
  lottiePatterns.forEach(pattern => {
    const matches = pageText.match(pattern);
    if (matches) {
      matches.forEach(match => links.add(match));
    }
  });

  // Also check performance entries
  if (window.performance && window.performance.getEntriesByType) {
    const networkEntries = window.performance.getEntriesByType('resource');
    networkEntries.forEach(entry => {
      if (entry.name && (entry.name.includes('.lottie') || entry.name.includes('.json'))) {
        lottiePatterns.forEach(pattern => {
          if (pattern.test(entry.name)) {
            links.add(entry.name);
          }
        });
      }
    });
  }

  return links.size;
}