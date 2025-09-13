class LottieAssetsPopup {
  constructor() {
    this.lottieLinks = [];
    this.linksByExtension = new Map();
    
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
    await this.loadLottieLinks();
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

    // Refresh links button
    document.getElementById('refreshLinks').addEventListener('click', () => {
      this.refreshLinks();
    });

    // View failed downloads button
    document.getElementById('viewFailedDownloads').addEventListener('click', () => {
      this.showFailedDownloads();
    });

    // Open LottieFiles website buttons
    document.getElementById('openLottieFiles').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLottieFilesWebsite();
    });

    document.getElementById('openLottieFilesBtn').addEventListener('click', () => {
      this.openLottieFilesWebsite();
    });

    // Individual copy buttons will be added dynamically
  }

  async loadLottieLinks() {
    this.showLoading();
    
    try {
      // Get current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || (!tab.url.includes('lottiefiles.com') && !tab.url.includes('app.lottiefiles.com'))) {
        this.showNoLinks();
        return;
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getLottieLinks' 
      });

      if (response && response.links) {
        this.lottieLinks = response.links;
        this.displayLinks();
      } else {
        this.showNoLinks();
      }
    } catch (error) {
      console.error('Error loading Lottie links:', error);
      this.showNoLinks();
    }
  }

  showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('noLinks').style.display = 'none';
    document.getElementById('linksSection').style.display = 'none';
  }

  showNoLinks() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('noLinks').style.display = 'block';
    document.getElementById('linksSection').style.display = 'none';
  }

  displayLinks() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('noLinks').style.display = 'none';
    
    if (this.lottieLinks.length === 0) {
      this.showNoLinks();
      return;
    }

    document.getElementById('linksSection').style.display = 'block';
    
    // Update count
    const countBadge = document.getElementById('countBadge');
    countBadge.textContent = this.lottieLinks.length;
    
    // Group links by extension
    this.groupLinksByExtension();
    
    // Create extension buttons
    this.createExtensionButtons();
    
    // Create links list
    const linksList = document.getElementById('linksList');
    linksList.innerHTML = '';
    
    this.lottieLinks.forEach((link, index) => {
      const linkItem = this.createLinkItem(link, index);
      linksList.appendChild(linkItem);
    });
  }

  groupLinksByExtension() {
    this.linksByExtension.clear();
    
    this.lottieLinks.forEach(link => {
      const extension = this.getFileExtension(link);
      if (extension && (extension === 'lottie' || extension === 'json')) {
        if (!this.linksByExtension.has(extension)) {
          this.linksByExtension.set(extension, []);
        }
        this.linksByExtension.get(extension).push(link);
      }
    });
  }

  getFileExtension(url) {
    // Handle only Lottie file patterns
    if (url.includes('.lottie')) {
      return 'lottie';
    } else if (url.includes('.json')) {
      return 'json';
    } else {
      // Try to extract extension from URL (fallback)
      const match = url.match(/\.(lottie|json)(?:[?#].*)?$/i);
      return match ? match[1].toLowerCase() : null;
    }
  }

  createExtensionButtons() {
    const extensionButtonsContainer = document.getElementById('extensionButtonsContainer');
    const extensionButtonsSection = document.getElementById('extensionButtons');
    
    extensionButtonsContainer.innerHTML = '';
    
    if (this.linksByExtension.size <= 1) {
      extensionButtonsSection.style.display = 'none';
      return;
    }
    
    extensionButtonsSection.style.display = 'block';
    
    // Sort extensions by count (descending)
    const sortedExtensions = Array.from(this.linksByExtension.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    sortedExtensions.forEach(([extension, links]) => {
      const button = this.createExtensionButton(extension, links.length);
      extensionButtonsContainer.appendChild(button);
    });
  }

  createExtensionButton(extension, count) {
    const button = document.createElement('button');
    button.className = 'btn btn-extension';
    button.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
        <polyline points="14,2 14,8 20,8"></polyline>
      </svg>
      .${extension}
      <span class="count">${count}</span>
    `;
    button.title = `Copy all .${extension} files`;
    button.addEventListener('click', () => {
      this.copyLinksByExtension(extension);
    });
    
    return button;
  }

  async copyLinksByExtension(extension) {
    const links = this.linksByExtension.get(extension);
    if (!links || links.length === 0) {
      this.showToast(`No .${extension} files found`, 'error');
      return;
    }

    try {
      const linksText = links.join('\r\n');
      await navigator.clipboard.writeText(linksText);
      
      this.showToast(`${links.length} .${extension} files copied!`);
      
      // Send notification to background script
      chrome.runtime.sendMessage({
        action: 'showNotification',
        message: `${links.length} .${extension} Lottie files copied to clipboard!`
      });
    } catch (error) {
      console.error(`Failed to copy .${extension} links:`, error);
      this.showToast(`Failed to copy .${extension} files`, 'error');
    }
  }

  createLinkItem(link, index) {
    const item = document.createElement('div');
    item.className = 'link-item';
    
    const linkText = document.createElement('div');
    linkText.className = 'link-text';
    linkText.textContent = link;
    linkText.title = link;
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'link-buttons';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-copy';
    copyBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
      </svg>
    `;
    copyBtn.title = 'Copy this link';
    copyBtn.addEventListener('click', () => {
      this.copyLink(link);
    });
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-copy';
    downloadBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
        <polyline points="7,10 12,15 17,10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;
    downloadBtn.title = 'Download this file';
    downloadBtn.addEventListener('click', () => {
      this.downloadSingleFile(link);
    });
    
    buttonsContainer.appendChild(copyBtn);
    buttonsContainer.appendChild(downloadBtn);
    
    item.appendChild(linkText);
    item.appendChild(buttonsContainer);
    
    return item;
  }

  async downloadSingleFile(url) {
    try {
      console.log(`Single file download requested: ${url}`);
      await this.downloadFile(url);
      this.showToast('File download started!', 'success');
    } catch (error) {
      console.error(`Failed to download file: ${url} - ${error.message}`);
      this.logFailedDownload(url, error.message);
      this.showToast(`Failed to download file: ${error.message}`, 'error');
    }
  }

  async copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      this.showToast('Link copied to clipboard!');
      
      // Send notification to background script
      chrome.runtime.sendMessage({
        action: 'showNotification',
        message: 'Lottie asset link copied to clipboard!'
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      this.showToast('Failed to copy link', 'error');
    }
  }

  async copyAllLinks() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No links to copy', 'error');
      return;
    }

    try {
      const allLinks = this.lottieLinks.join('\n');
      await navigator.clipboard.writeText(allLinks);
      
      this.showToast(`${this.lottieLinks.length} links copied to clipboard!`);
      
      // Send notification to background script
      chrome.runtime.sendMessage({
        action: 'showNotification',
        message: `${this.lottieLinks.length} Lottie asset links copied to clipboard!`
      });
    } catch (error) {
      console.error('Failed to copy links:', error);
      this.showToast('Failed to copy links', 'error');
    }
  }

  async copyAllLinksRows() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No links to copy', 'error');
      return;
    }

    try {
      // Format each link on a separate line with proper line breaks
      const allLinksRows = this.lottieLinks.join('\r\n');
      await navigator.clipboard.writeText(allLinksRows);
      
      this.showToast(`${this.lottieLinks.length} links copied as rows!`);
      
      // Send notification to background script
      chrome.runtime.sendMessage({
        action: 'showNotification',
        message: `${this.lottieLinks.length} Lottie asset links copied as separate rows!`
      });
    } catch (error) {
      console.error('Failed to copy links as rows:', error);
      this.showToast('Failed to copy links as rows', 'error');
    }
  }

  async downloadAllFiles() {
    if (this.lottieLinks.length === 0) {
      this.showToast('No files to download', 'error');
      return;
    }

    const downloadBtn = document.getElementById('downloadAll');
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
      </svg>
      Downloading...
    `;

    this.showDownloadProgress(true);
    const startTime = Date.now();
    console.log(`🚀 Starting parallel download of ${this.lottieLinks.length} files...`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Configuration for parallel processing
    const BATCH_SIZE = this.BATCH_SIZE; // Download multiple files simultaneously
    const batches = [];
    
    // Split links into batches
    for (let i = 0; i < this.lottieLinks.length; i += BATCH_SIZE) {
      batches.push(this.lottieLinks.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 Processing ${batches.length} batches of up to ${BATCH_SIZE} files each (${BATCH_SIZE} parallel downloads)`);
    console.log(`⚙️ Config: ${this.MAX_RETRIES} retries per file, ${this.BATCH_DELAY}ms delay between batches`);
    
    // Process each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * BATCH_SIZE;
      
      console.log(`📥 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} files)`);
      
      // Download all files in current batch simultaneously
      const batchPromises = batch.map(async (link, indexInBatch) => {
        const globalIndex = batchStartIndex + indexInBatch;
        try {
          console.log(`[${globalIndex + 1}/${this.lottieLinks.length}] Starting: ${link}`);
          await this.downloadFile(link);
          console.log(`✅ [${globalIndex + 1}/${this.lottieLinks.length}] Success: ${link}`);
          return { success: true, link, index: globalIndex + 1 };
        } catch (error) {
          console.error(`❌ [${globalIndex + 1}/${this.lottieLinks.length}] Failed: ${link} - ${error.message}`);
          return { success: false, link, error: error.message, index: globalIndex + 1 };
        }
      });
      
      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process batch results
      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push({ url: result.link, error: result.error });
        }
      });
      
      // Update progress after each batch
      const progress = ((batchIndex + 1) / batches.length) * 100;
      const completedFiles = Math.min((batchIndex + 1) * BATCH_SIZE, this.lottieLinks.length);
      this.updateDownloadProgress(progress, `Completed ${completedFiles}/${this.lottieLinks.length} files...`);
      
      // Small delay between batches to avoid overwhelming browser
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting ${this.BATCH_DELAY}ms before next batch...`);
        await this.delay(this.BATCH_DELAY);
      }
    }
    
    this.showDownloadProgress(false);
    
    // Log failed downloads summary if any
    if (errors.length > 0) {
      console.group('🚫 Failed Downloads Summary:');
      errors.forEach((error, index) => {
        console.error(`${index + 1}. ${error.url} - ${error.error}`);
      });
      console.groupEnd();
    }
    
    // Reset button
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
        <polyline points="7,10 12,15 17,10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Download All
    `;
    
    // Show summary
    if (errorCount > 0) {
      this.showToast(`Downloaded ${successCount}/${this.lottieLinks.length} files (${errorCount} failed). Check console for details.`, 'warning');
      console.log('📋 Download Summary:');
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${errorCount}`);
      console.log(`⏰ Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    } else {
      this.showToast(`All ${successCount} files downloaded successfully!`, 'success');
      console.log(`🎉 All ${successCount} files downloaded successfully in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    }
    
    // Send notification
    chrome.runtime.sendMessage({
      action: 'showNotification',
      message: `Download complete: ${successCount} files downloaded, ${errorCount} failed`
    });
  }

  async downloadFile(url, maxRetries = this.MAX_RETRIES) {
    return new Promise(async (resolve, reject) => {
      let retryCount = 0;
      
      const attemptDownload = async () => {
        try {
          if (retryCount === 0) {
            console.log(`Starting download: ${url}`);
          } else {
            console.log(`Retry ${retryCount}/${maxRetries} for: ${url}`);
          }
          
          // Check if URL is valid
          if (!url || !url.startsWith('http')) {
            throw new Error('Invalid URL');
          }
          
          // Open download in new tab
          const downloadTab = await chrome.tabs.create({
            url: url,
            active: false
          });
          
          // Wait for download to start, then close tab
          setTimeout(async () => {
            try {
              await chrome.tabs.remove(downloadTab.id);
              console.log(`✓ Download tab closed for: ${url}`);
              resolve();
            } catch (closeError) {
              console.warn(`Warning: Failed to close download tab for ${url}:`, closeError);
              // Still resolve as download might have started
              resolve();
            }
          }, this.TAB_CLOSE_DELAY);
          
        } catch (error) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.warn(`⚠️ Download failed for ${url} (attempt ${retryCount}/${maxRetries}), retrying in ${retryCount}s...`);
            // Wait a bit before retry (exponential backoff)
            setTimeout(() => attemptDownload(), 1000 * retryCount);
          } else {
            console.error(`✗ Download failed for ${url} after ${maxRetries} retries:`, error);
            this.logFailedDownload(url, error.message);
            reject(new Error(`Download failed after ${maxRetries} retries: ${error.message}`));
          }
        }
      };
      
      attemptDownload();
    });
  }

  getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract filename from path
      const filename = pathname.split('/').pop();
      
      // If filename has extension, use it
      if (filename && filename.includes('.')) {
        return filename;
      }
      
      // Generate filename based on URL
      if (url.includes('lottie.host')) {
        const match = url.match(/\/([a-f0-9-]+)\/([^/]+)\.lottie/);
        if (match) {
          return `${match[2]}.lottie`;
        }
      }
      
      if (url.includes('app.lottiefiles.com')) {
        const match = url.match(/\/([^/]+\.lottie)/);
        if (match) {
          return match[1];
        }
      }
      
      // Fallback: generate filename
      const timestamp = Date.now();
      const extension = url.includes('.lottie') ? '.lottie' : 
                       url.includes('.json') ? '.json' : '.file';
      return `lottie_${timestamp}${extension}`;
      
    } catch (error) {
      // Fallback filename
      const timestamp = Date.now();
      return `lottie_${timestamp}.lottie`;
    }
  }

  showDownloadProgress(show) {
    const progressElement = document.getElementById('downloadProgress');
    if (show) {
      progressElement.classList.add('show');
    } else {
      progressElement.classList.remove('show');
    }
  }

  updateDownloadProgress(percentage, text) {
    document.getElementById('downloadProgressText').textContent = text;
    document.getElementById('downloadProgressFill').style.width = `${percentage}%`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async refreshLinks() {
    await this.loadLottieLinks();
    this.showToast('Links refreshed!');
  }

  openLottieFilesWebsite() {
    chrome.runtime.sendMessage({ action: 'openLottieFiles' });
    window.close(); // Close popup after opening the website
  }

  logFailedDownload(url, errorMessage) {
    const failedDownloads = JSON.parse(localStorage.getItem('lottie_failed_downloads') || '[]');
    const failedDownload = {
      url: url,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    failedDownloads.push(failedDownload);
    
    // Keep only last 50 failed downloads
    if (failedDownloads.length > 50) {
      failedDownloads.splice(0, failedDownloads.length - 50);
    }
    
    localStorage.setItem('lottie_failed_downloads', JSON.stringify(failedDownloads));
    console.error('Failed download logged:', failedDownload);
  }

  getFailedDownloads() {
    return JSON.parse(localStorage.getItem('lottie_failed_downloads') || '[]');
  }

  clearFailedDownloads() {
    localStorage.removeItem('lottie_failed_downloads');
    console.log('Failed downloads log cleared');
  }

  // Method to configure download settings (can be called from console)
  configureDownloads(options = {}) {
    const oldConfig = {
      BATCH_SIZE: this.BATCH_SIZE,
      MAX_RETRIES: this.MAX_RETRIES,
      BATCH_DELAY: this.BATCH_DELAY,
      TAB_CLOSE_DELAY: this.TAB_CLOSE_DELAY
    };

    // Update configuration
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

    // Save to localStorage for persistence
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

  // Load saved configuration
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
    const failedDownloads = this.getFailedDownloads();
    
    if (failedDownloads.length === 0) {
      this.showToast('No failed downloads found', 'success');
      return;
    }

    console.group(`📋 Failed Downloads Log (${failedDownloads.length} items):`);
    failedDownloads.forEach((failed, index) => {
      console.error(`${index + 1}. [${failed.timestamp}] ${failed.url}`);
      console.error(`   Error: ${failed.error}`);
    });
    console.groupEnd();
    
    this.showToast(`Found ${failedDownloads.length} failed downloads. Check console for details.`, 'warning');
    
    // Option to clear failed downloads log
    if (confirm(`Found ${failedDownloads.length} failed downloads.\n\nWould you like to clear the failed downloads log?`)) {
      this.clearFailedDownloads();
      this.showToast('Failed downloads log cleared', 'success');
    }
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.lottiePopup = new LottieAssetsPopup();
});

// Global configuration helper for console usage
window.configureLottieDownloads = (options) => {
  if (window.lottiePopup) {
    return window.lottiePopup.configureDownloads(options);
  } else {
    console.warn('LottiePopup not initialized yet');
    return null;
  }
};

// Console helper to show current config
window.showLottieConfig = () => {
  if (window.lottiePopup) {
    const config = {
      BATCH_SIZE: window.lottiePopup.BATCH_SIZE,
      MAX_RETRIES: window.lottiePopup.MAX_RETRIES,
      BATCH_DELAY: window.lottiePopup.BATCH_DELAY,
      TAB_CLOSE_DELAY: window.lottiePopup.TAB_CLOSE_DELAY
    };
    console.table(config);
    return config;
  } else {
    console.warn('LottiePopup not initialized yet');
    return null;
  }
};

console.log('🎪 Lottie Assets Popup initialized!');
console.log('💡 Use configureLottieDownloads({batchSize: 3, maxRetries: 1, batchDelay: 1500}) to adjust settings');
console.log('📊 Use showLottieConfig() to view current configuration');