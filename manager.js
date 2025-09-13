class LottieAssetsManager {
  constructor() {
    this.lottieLinks = [];
    this.linksByExtension = new Map();
    this.currentActiveTab = null;
    
    // Download configuration
    this.BATCH_SIZE = 5; // Number of simultaneous downloads
    this.MAX_RETRIES = 2; // Maximum retry attempts per file
    this.BATCH_DELAY = 1000; // Delay between batches (ms)
    this.TAB_CLOSE_DELAY = 2000; // Time to wait before closing download tab (ms)
    
    // Load saved configuration
    this.loadDownloadConfig();
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.findLottieTabsAndLoad();
  }

  async findLottieTabsAndLoad() {
    try {
      // First try to load from storage
      await this.loadFromStorage();
      
      // Find all Lottie-supported tabs
      const allTabs = await chrome.tabs.query({});
      const lottieTabs = allTabs.filter(tab => this.isLottieSupportedUrl(tab.url));
      
      if (lottieTabs.length === 0) {
        this.showNoTabsMessage();
        return;
      }

      // Show tabs selection UI
      this.showTabSelection(lottieTabs);
      
      // If we have cached data, show it
      if (this.lottieLinks.length > 0) {
        const statusElement = document.getElementById('status');
        const controlsElement = document.getElementById('controls');
        statusElement.style.display = 'none';
        controlsElement.style.display = 'block';
        this.showToast(`Loaded ${this.lottieLinks.length} cached assets`, 'success');
      }
      
    } catch (error) {
      console.error('Error finding Lottie tabs:', error);
      this.showError('Failed to find LottieFiles tabs');
    }
  }

  showNoTabsMessage() {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <h3>📄 No LottieFiles tabs found</h3>
        <p>Please navigate to one of these supported domains:</p>
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          <li>🌐 lottiefiles.com</li>
          <li>🌐 app.lottiefiles.com</li>
          <li>🌐 lottie.host</li>
        </ul>
        <button id="openLottieFilesFromStatus" class="primary-button" style="margin-top: 20px;">
          🌐 Open LottieFiles
        </button>
      </div>
    `;
    
    document.getElementById('openLottieFilesFromStatus').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://lottiefiles.com/free-animations' });
    });
  }

  showTabSelection(tabs) {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `
      <div style="padding: 20px;">
        <h3>🔍 Found ${tabs.length} LottieFiles tab${tabs.length === 1 ? '' : 's'}</h3>
        <div id="tabsList" style="margin: 16px 0;">
          ${tabs.map((tab, index) => `
            <div class="tab-item" data-tab-id="${tab.id}" style="
              display: flex; 
              align-items: center; 
              padding: 12px; 
              margin: 8px 0; 
              border: 1px solid #ddd; 
              border-radius: 6px; 
              cursor: pointer;
              transition: all 0.2s ease;
            ">
              <img src="${tab.favIconUrl || 'hello_extensions.png'}" style="width: 16px; height: 16px; margin-right: 12px;" />
              <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 4px;">${tab.title}</div>
                <div style="font-size: 12px; color: #666; font-family: monospace;">${tab.url}</div>
              </div>
              <button class="primary-button extract-btn" data-tab-id="${tab.id}" style="margin-left: 12px; padding: 6px 12px; font-size: 12px;">
                📥 Extract
              </button>
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
          <button id="extractAllTabs" class="success-button">
            📥 Extract from All Tabs
          </button>
          <button id="clearStoredData" class="warning-button" style="margin-left: 12px;">
            🗑️ Clear Stored Data
          </button>
        </div>
      </div>
    `;

    // Add event listeners for individual extract buttons
    tabs.forEach(tab => {
      const extractBtn = document.querySelector(`[data-tab-id="${tab.id}"]`);
      if (extractBtn) {
        extractBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.extractFromTab(tab);
        });
      }
    });

    // Extract from all tabs button
    document.getElementById('extractAllTabs').addEventListener('click', () => {
      this.extractFromAllTabs(tabs);
    });

    // Clear stored data button
    document.getElementById('clearStoredData').addEventListener('click', () => {
      this.clearStoredData();
    });

    // Tab item hover effects
    document.querySelectorAll('.tab-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f5f5f5';
        item.style.borderColor = '#999';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = '';
        item.style.borderColor = '#ddd';
      });
    });
  }

  isLottieSupportedUrl(url) {
    if (!url) return false;
    return url.includes('lottiefiles.com') || 
           url.includes('app.lottiefiles.com') || 
           url.includes('lottie.host');
  }

  setupEventListeners() {
    // Copy all links button
    document.getElementById('copyAll').addEventListener('click', () => {
      this.copyAllLinks();
    });

    // Copy all links (each in a row) button
    document.getElementById('copyAllRows').addEventListener('click', () => {
      this.copyAllLinksRows();
    });

    // Download all files button
    document.getElementById('downloadAll').addEventListener('click', () => {
      this.downloadAllFiles();
    });

    // Clear found assets button
    document.getElementById('clearAssets').addEventListener('click', () => {
      this.clearFoundAssets();
    });

    // Open LottieFiles button
    document.getElementById('openLottieFiles').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://lottiefiles.com' });
    });

    // Failed downloads button
    document.getElementById('failedDownloadsBtn').addEventListener('click', () => {
      this.showFailedDownloads();
    });
  }

  async loadLottieLinks() {
    // This method is now called from extractFromTab
    this.updateUI();
  }

  async extractFromTab(tab) {
    const statusElement = document.getElementById('status');
    const controlsElement = document.getElementById('controls');
    
    try {
      statusElement.textContent = `Requesting assets from ${new URL(tab.url).hostname}...`;
      statusElement.style.display = 'block';

      // Try to get links from content script first
      chrome.tabs.sendMessage(tab.id, { action: 'getLottieLinks' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Content script not available, trying executeScript fallback');
          this.executeScriptFallback(tab);
        } else if (response && response.links) {
          this.processExtractedLinks(response.links, tab);
        } else {
          statusElement.textContent = 'No response from tab content script.';
        }
      });
      
    } catch (error) {
      console.error('Error extracting from tab:', error);
      statusElement.textContent = 'Error loading assets. Please refresh the page and try again.';
      this.showToast('Failed to extract assets from tab', 'error');
    }
  }

  async executeScriptFallback(tab) {
    const statusElement = document.getElementById('status');
    
    try {
      // Fallback to executeScript
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.extractLottieLinksFromPage
      });

      if (results && results[0]) {
        const tabLinks = results[0].result || [];
        this.processExtractedLinks(tabLinks, tab);
      }
    } catch (error) {
      console.warn('ExecuteScript also failed:', error);
      statusElement.textContent = 'Could not extract from this tab. Please refresh the page.';
    }
  }

  processExtractedLinks(tabLinks, tab) {
    const statusElement = document.getElementById('status');
    const controlsElement = document.getElementById('controls');
    
    // Add to existing links (avoid duplicates)
    const newLinks = tabLinks.filter(link => !this.lottieLinks.includes(link));
    this.lottieLinks.push(...newLinks);
    
    // Update extension data
    this.linksByExtension.clear();
    this.lottieLinks.forEach(link => {
      const extension = this.getFileExtension(link);
      if (!this.linksByExtension.has(extension)) {
        this.linksByExtension.set(extension, []);
      }
      this.linksByExtension.get(extension).push(link);
    });

    // Save to storage
    this.saveToStorage();

    this.updateUI();
    
    if (this.lottieLinks.length > 0) {
      statusElement.style.display = 'none';
      controlsElement.style.display = 'block';
      this.showToast(`Found ${newLinks.length} new assets from ${tab.title}`, 'success');
    } else {
      statusElement.textContent = 'No Lottie assets found on this page.';
    }
  }

  async extractFromAllTabs(tabs) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = 'Extracting from all tabs...';
    statusElement.style.display = 'block';
    
    let totalNewLinks = 0;
    
    for (const tab of tabs) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: this.extractLottieLinksFromPage
        });

        if (results && results[0]) {
          const tabLinks = results[0].result || [];
          const newLinks = tabLinks.filter(link => !this.lottieLinks.includes(link));
          this.lottieLinks.push(...newLinks);
          totalNewLinks += newLinks.length;
        }
      } catch (error) {
        console.warn(`Failed to extract from tab ${tab.title}:`, error);
      }
    }

    // Update extension data
    this.linksByExtension.clear();
    this.lottieLinks.forEach(link => {
      const extension = this.getFileExtension(link);
      if (!this.linksByExtension.has(extension)) {
        this.linksByExtension.set(extension, []);
      }
      this.linksByExtension.get(extension).push(link);
    });

    // Save to storage
    await this.saveToStorage();

    this.updateUI();

    if (this.lottieLinks.length > 0) {
      const controlsElement = document.getElementById('controls');
      statusElement.style.display = 'none';
      controlsElement.style.display = 'block';
      this.showToast(`Found ${totalNewLinks} new assets from ${tabs.length} tabs`, 'success');
    } else {
      statusElement.textContent = 'No Lottie assets found in any tabs.';
      this.showToast('No assets found', 'warning');
    }
  }

  async saveToStorage() {
    try {
      // Save in the new format compatible with content script
      await chrome.storage.local.set({
        'lottie_extracted_links': this.lottieLinks,
        'lottie_extraction_timestamp': Date.now()
      });
      
      // Also save in tabs format for compatibility  
      const tabData = {
        url: 'manager',
        title: 'Manager Combined',
        links: this.lottieLinks,
        timestamp: Date.now()
      };

      const result = await chrome.storage.local.get(['lottie_tabs_data']);
      const tabsData = result.lottie_tabs_data || {};
      tabsData['manager_combined'] = tabData;
      
      await chrome.storage.local.set({ 'lottie_tabs_data': tabsData });
      console.log('Saved extracted links to storage:', this.lottieLinks.length);
    } catch (error) {
      console.warn('Failed to save to storage:', error);
    }
  }

  async loadFromStorage() {
    try {
      // Load from new tabs data format
      const result = await chrome.storage.local.get(['lottie_tabs_data']);
      
      if (result.lottie_tabs_data) {
        const tabsData = result.lottie_tabs_data;
        const allLinks = new Set();
        
        // Merge links from all stored tabs
        Object.values(tabsData).forEach(tabData => {
          if (tabData.links && Array.isArray(tabData.links)) {
            tabData.links.forEach(link => allLinks.add(link));
          }
        });
        
        this.lottieLinks = Array.from(allLinks);
        
        // Rebuild extensions map
        this.linksByExtension.clear();
        this.lottieLinks.forEach(link => {
          const extension = this.getFileExtension(link);
          if (!this.linksByExtension.has(extension)) {
            this.linksByExtension.set(extension, []);
          }
          this.linksByExtension.get(extension).push(link);
        });
        
        console.log('Loaded extracted links from storage:', this.lottieLinks.length);
        
        if (this.lottieLinks.length > 0) {
          this.updateUI();
        }
      } else {
        // Try fallback to old format
        const oldResult = await chrome.storage.local.get(['lottie_extracted_links', 'lottie_extraction_timestamp']);
        
        if (oldResult.lottie_extracted_links && oldResult.lottie_extraction_timestamp) {
          const oneHour = 60 * 60 * 1000;
          const isRecent = (Date.now() - oldResult.lottie_extraction_timestamp) < oneHour;
          
          if (isRecent) {
            this.lottieLinks = oldResult.lottie_extracted_links;
            
            this.linksByExtension.clear();
            this.lottieLinks.forEach(link => {
              const extension = this.getFileExtension(link);
              if (!this.linksByExtension.has(extension)) {
                this.linksByExtension.set(extension, []);
              }
              this.linksByExtension.get(extension).push(link);
            });
            
            console.log('Loaded extracted links from old storage format:', this.lottieLinks.length);
            this.updateUI();
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    }
  }

  async clearStoredData() {
    try {
      await chrome.storage.local.remove(['lottie_extracted_links', 'lottie_extraction_timestamp', 'lottie_tabs_data']);
      this.lottieLinks = [];
      this.linksByExtension.clear();
      this.updateUI();
      this.showToast('Cleared stored data', 'success');
      console.log('Cleared stored extracted links');
      
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  async clearFoundAssets() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No assets to clear', 'warning');
      return;
    }

    const confirmed = confirm(`Clear all ${this.lottieLinks.length} found assets?\n\nThis will:\n- Remove all assets from the current list\n- Clear cached data from storage\n- Reset the manager interface\n\nNote: This won't affect the original sources, only the found assets list.`);
    
    if (confirmed) {
      try {
        // Clear in-memory data
        this.lottieLinks = [];
        this.linksByExtension.clear();
        
        // Clear storage
        await chrome.storage.local.remove(['lottie_extracted_links', 'lottie_extraction_timestamp', 'lottie_tabs_data']);
        
        // Update UI to show empty state
        this.updateUI();
        
        // Clear badges from all tabs
        const allTabs = await chrome.tabs.query({});
        allTabs.forEach(tab => {
          if (this.isLottieSupportedUrl(tab.url)) {
            chrome.action.setBadgeText({ text: '', tabId: tab.id });
          }
        });
        
        // Show success message and refresh UI
        this.showToast('All found assets cleared successfully', 'success');
        
        // Reset status to show tabs selection again
        const statusElement = document.getElementById('status');
        const controlsElement = document.getElementById('controls');
        statusElement.style.display = 'block';
        controlsElement.style.display = 'none';
        
        // Re-initialize to show tab selection
        await this.findLottieTabsAndLoad();
        
        console.log('Successfully cleared all found assets');
      } catch (error) {
        console.error('Error clearing assets:', error);
        this.showToast('Failed to clear assets', 'error');
      }
    }
  }

  showError(message) {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #dc3545;">
        <h3>❌ Error</h3>
        <p>${message}</p>
        <button onclick="window.location.reload()" class="primary-button" style="margin-top: 20px;">
          🔄 Refresh
        </button>
      </div>
    `;
  }

  // This function will be injected into the target page
  extractLottieLinksFromPage() {
    const links = new Set();
    
    // Regex patterns for different Lottie asset types
    const lottiePatterns = [
      /https:\/\/assets-v2\.lottiefiles\.com\/[^"'\s]+\.lottie/gi,
      /https:\/\/assets\d*\.lottiefiles\.com\/[^"'\s]+\.json/gi,
      /https:\/\/lottie\.host\/[^"'\s]+\.(lottie|json)/gi,
      /https:\/\/[^"'\s]*lottiefiles[^"'\s]*\.(lottie|json)/gi
    ];

    // Extract from page content
    const pageText = document.documentElement.innerHTML;
    lottiePatterns.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches) {
        matches.forEach(match => links.add(match));
      }
    });

    // Extract from network requests if available
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

    return Array.from(links);
  }

  updateUI() {
    this.updateLinksDisplay();
    this.updateExtensionButtons();
    this.updateBadge();
    this.updateFailedDownloadsButton();
  }

  updateLinksDisplay() {
    const container = document.getElementById('linksContainer');
    const noLinksElement = document.getElementById('noLinks');
    const assetsCount = document.getElementById('assetsCount');
    
    assetsCount.textContent = this.lottieLinks.length;

    if (this.lottieLinks.length === 0) {
      noLinksElement.style.display = 'block';
      return;
    }

    noLinksElement.style.display = 'none';
    container.innerHTML = '';

    this.lottieLinks.forEach((link, index) => {
      const linkElement = this.createLinkElement(link, index);
      container.appendChild(linkElement);
    });
  }

  createLinkElement(link, index) {
    const linkItem = document.createElement('div');
    linkItem.className = 'link-item';

    const filename = this.getFilename(link);
    const extension = this.getFileExtension(link);
    const domain = this.getDomain(link);

    linkItem.innerHTML = `
      <div class="link-info">
        <div class="link-url">${link}</div>
        <div class="link-meta">${filename} • ${extension.toUpperCase()} • ${domain}</div>
      </div>
      <div class="link-actions">
        <button class="link-button" onclick="window.lottieManager.copyLink('${link}')">
          📋 Copy
        </button>
        <button class="link-button" onclick="window.lottieManager.downloadFile('${link}')">
          📥 Download
        </button>
      </div>
    `;

    return linkItem;
  }

  updateExtensionButtons() {
    const container = document.getElementById('extensionButtons');
    container.innerHTML = '';

    this.linksByExtension.forEach((links, extension) => {
      if (links.length > 0) {
        const button = document.createElement('button');
        button.className = 'extension-button';
        button.innerHTML = `📋 Copy ${extension.toUpperCase()} (${links.length})`;
        button.addEventListener('click', () => {
          this.copyLinksByExtension(extension);
        });
        container.appendChild(button);

        const downloadButton = document.createElement('button');
        downloadButton.className = 'extension-button';
        downloadButton.innerHTML = `📥 Download ${extension.toUpperCase()} (${links.length})`;
        downloadButton.addEventListener('click', () => {
          this.downloadLinksByExtension(extension);
        });
        container.appendChild(downloadButton);
      }
    });
  }

  updateBadge() {
    // Update badge for all Lottie tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (this.isLottieSupportedUrl(tab.url)) {
          chrome.action.setBadgeText({
            text: this.lottieLinks.length > 0 ? this.lottieLinks.length.toString() : '',
            tabId: tab.id
          });
        }
      });
    });
  }

  updateFailedDownloadsButton() {
    const failedDownloads = this.getFailedDownloads();
    const button = document.getElementById('failedDownloadsBtn');
    if (failedDownloads.length > 0) {
      button.style.display = 'block';
      button.textContent = `⚠️ Failed Downloads (${failedDownloads.length})`;
    } else {
      button.style.display = 'none';
    }
  }

  // Copy functions
  copyAllLinks() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No links to copy', 'warning');
      return;
    }

    navigator.clipboard.writeText(this.lottieLinks.join(', ')).then(() => {
      this.showToast(`Copied ${this.lottieLinks.length} links to clipboard!`, 'success');
    }).catch(() => {
      this.showToast('Failed to copy links', 'error');
    });
  }

  copyAllLinksRows() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No links to copy', 'warning');
      return;
    }

    navigator.clipboard.writeText(this.lottieLinks.join('\n')).then(() => {
      this.showToast(`Copied ${this.lottieLinks.length} links (rows) to clipboard!`, 'success');
    }).catch(() => {
      this.showToast('Failed to copy links', 'error');
    });
  }

  copyLinksByExtension(extension) {
    const links = this.linksByExtension.get(extension) || [];
    if (links.length === 0) {
      this.showToast(`No ${extension} links to copy`, 'warning');
      return;
    }

    navigator.clipboard.writeText(links.join('\n')).then(() => {
      this.showToast(`Copied ${links.length} ${extension.toUpperCase()} links to clipboard!`, 'success');
    }).catch(() => {
      this.showToast('Failed to copy links', 'error');
    });
  }

  copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
      this.showToast('Link copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy link', 'error');
    });
  }

  // Download functions
  async downloadAllFiles() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No files to download', 'warning');
      return;
    }

    const progressContainer = document.getElementById('progressContainer');
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    const progressFill = document.getElementById('progressFill');

    progressContainer.style.display = 'block';
    progressText.textContent = 'Preparing downloads...';
    progressCount.textContent = `0/${this.lottieLinks.length}`;
    progressFill.style.width = '0%';

    let completed = 0;
    let failed = 0;
    const total = this.lottieLinks.length;

    // Process downloads in batches
    for (let i = 0; i < this.lottieLinks.length; i += this.BATCH_SIZE) {
      const batch = this.lottieLinks.slice(i, i + this.BATCH_SIZE);
      
      const batchPromises = batch.map(async (link) => {
        try {
          await this.downloadFile(link);
          completed++;
        } catch (error) {
          failed++;
          this.logFailedDownload(link, error.message);
        }
        
        // Update progress
        const progress = ((completed + failed) / total) * 100;
        progressFill.style.width = `${progress}%`;
        progressCount.textContent = `${completed + failed}/${total}`;
        progressText.textContent = failed > 0 ? 
          `Downloaded: ${completed}, Failed: ${failed}` : 
          `Downloading... (${completed + failed}/${total})`;
      });

      await Promise.all(batchPromises);

      // Delay between batches (except for the last batch)
      if (i + this.BATCH_SIZE < this.lottieLinks.length) {
        await this.delay(this.BATCH_DELAY);
      }
    }

    // Final status
    setTimeout(() => {
      progressContainer.style.display = 'none';
      this.updateFailedDownloadsButton();
      
      if (failed === 0) {
        this.showToast(`Successfully downloaded ${completed} files!`, 'success');
      } else {
        this.showToast(`Downloaded ${completed} files, ${failed} failed. Check Failed Downloads.`, 'warning');
      }
    }, 1000);
  }

  async downloadLinksByExtension(extension) {
    const links = this.linksByExtension.get(extension) || [];
    if (links.length === 0) {
      this.showToast(`No ${extension} files to download`, 'warning');
      return;
    }

    // Temporarily set links to only this extension for downloadAllFiles
    const originalLinks = this.lottieLinks;
    this.lottieLinks = links;
    await this.downloadAllFiles();
    this.lottieLinks = originalLinks;
  }

  async downloadFile(url, retryCount = 0) {
    try {
      // Create a new tab for download
      const tab = await chrome.tabs.create({ 
        url: url, 
        active: false 
      });

      // Wait for download to start
      await this.delay(this.TAB_CLOSE_DELAY);

      // Close the tab
      try {
        await chrome.tabs.remove(tab.id);
      } catch (tabError) {
        // Tab might already be closed or removed
        console.log('Tab already closed:', tabError);
      }

    } catch (error) {
      console.error('Download error for', url, ':', error);
      
      if (retryCount < this.MAX_RETRIES) {
        console.log(`Retrying download ${retryCount + 1}/${this.MAX_RETRIES} for:`, url);
        await this.delay(1000);
        return this.downloadFile(url, retryCount + 1);
      } else {
        throw error;
      }
    }
  }

  // Utility functions
  getFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'unknown';
    } catch {
      return url.split('/').pop() || 'unknown';
    }
  }

  getFileExtension(url) {
    const filename = this.getFilename(url);
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : 'unknown';
  }

  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Failed downloads management
  logFailedDownload(url, error) {
    const failed = this.getFailedDownloads();
    failed.push({ url, error, timestamp: new Date().toISOString() });
    localStorage.setItem('lottie_failed_downloads', JSON.stringify(failed));
    console.log('Logged failed download:', url, error);
  }

  getFailedDownloads() {
    try {
      const failed = localStorage.getItem('lottie_failed_downloads');
      return failed ? JSON.parse(failed) : [];
    } catch (error) {
      console.warn('Error reading failed downloads:', error);
      return [];
    }
  }

  clearFailedDownloads() {
    localStorage.removeItem('lottie_failed_downloads');
    console.log('Failed downloads log cleared');
  }

  // Configuration methods
  configureDownloads(options = {}) {
    const oldConfig = {
      BATCH_SIZE: this.BATCH_SIZE,
      MAX_RETRIES: this.MAX_RETRIES,
      BATCH_DELAY: this.BATCH_DELAY,
      TAB_CLOSE_DELAY: this.TAB_CLOSE_DELAY
    };

    if (options.batchSize !== undefined) this.BATCH_SIZE = Math.max(1, Math.min(10, options.batchSize));
    if (options.maxRetries !== undefined) this.MAX_RETRIES = Math.max(0, Math.min(5, options.maxRetries));
    if (options.batchDelay !== undefined) this.BATCH_DELAY = Math.max(500, Math.min(5000, options.batchDelay));
    if (options.tabCloseDelay !== undefined) this.TAB_CLOSE_DELAY = Math.max(1000, Math.min(10000, options.tabCloseDelay));

    console.log('🔧 Download configuration updated:');
    console.log('Old config:', oldConfig);
    console.log('New config:', {
      BATCH_SIZE: this.BATCH_SIZE,
      MAX_RETRIES: this.MAX_RETRIES,
      BATCH_DELAY: this.BATCH_DELAY,
      TAB_CLOSE_DELAY: this.TAB_CLOSE_DELAY
    });

    localStorage.setItem('lottie_download_config', JSON.stringify({
      BATCH_SIZE: this.BATCH_SIZE,
      MAX_RETRIES: this.MAX_RETRIES,
      BATCH_DELAY: this.BATCH_DELAY,
      TAB_CLOSE_DELAY: this.TAB_CLOSE_DELAY
    }));

    return {
      BATCH_SIZE: this.BATCH_SIZE,
      MAX_RETRIES: this.MAX_RETRIES,
      BATCH_DELAY: this.BATCH_DELAY,
      TAB_CLOSE_DELAY: this.TAB_CLOSE_DELAY
    };
  }

  loadDownloadConfig() {
    try {
      const saved = localStorage.getItem('lottie_download_config');
      if (saved) {
        const config = JSON.parse(saved);
        this.BATCH_SIZE = config.BATCH_SIZE || this.BATCH_SIZE;
        this.MAX_RETRIES = config.MAX_RETRIES || this.MAX_RETRIES;
        this.BATCH_DELAY = config.BATCH_DELAY || this.BATCH_DELAY;
        this.TAB_CLOSE_DELAY = config.TAB_CLOSE_DELAY || this.TAB_CLOSE_DELAY;
        console.log('📁 Loaded saved download config:', config);
      }
    } catch (error) {
      console.warn('Failed to load download config:', error);
    }
  }

  showFailedDownloads() {
    const failed = this.getFailedDownloads();
    if (failed.length === 0) {
      this.showToast('No failed downloads to show', 'success');
      return;
    }

    const failedList = failed.map(item => `${item.url} (${item.error})`).join('\n');
    
    if (confirm(`Found ${failed.length} failed downloads. Copy to clipboard?`)) {
      navigator.clipboard.writeText(failedList).then(() => {
        this.showToast(`Copied ${failed.length} failed downloads to clipboard`, 'success');
      }).catch(() => {
        console.log('Failed downloads:', failed);
        this.showToast('Check console for failed downloads list', 'warning');
      });
    }
  }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.lottieManager = new LottieAssetsManager();
});

// Global configuration helpers for console usage
window.configureLottieDownloads = (options) => {
  if (window.lottieManager) {
    return window.lottieManager.configureDownloads(options);
  } else {
    console.warn('LottieManager not initialized yet');
    return null;
  }
};

window.showLottieConfig = () => {
  if (window.lottieManager) {
    const config = {
      BATCH_SIZE: window.lottieManager.BATCH_SIZE,
      MAX_RETRIES: window.lottieManager.MAX_RETRIES,
      BATCH_DELAY: window.lottieManager.BATCH_DELAY,
      TAB_CLOSE_DELAY: window.lottieManager.TAB_CLOSE_DELAY
    };
    console.table(config);
    return config;
  } else {
    console.warn('LottieManager not initialized yet');
    return null;
  }
};

console.log('🎪 Lottie Assets Manager initialized!');
console.log('💡 Use configureLottieDownloads({batchSize: 3, maxRetries: 1, batchDelay: 1500}) to adjust settings');
console.log('📊 Use showLottieConfig() to view current configuration');