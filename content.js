// Content script to extract Lottie asset links from lottiefiles.com
class LottieExtractor {
  constructor() {
    this.lottieLinks = new Set();
    this.observer = null;
    this.init();
  }

  init() {
    // Extract links when page loads
    this.extractLinks();
    
    // Set up mutation observer to detect dynamically loaded content
    this.setupObserver();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getLottieLinks') {
        this.extractLinks();
        sendResponse({ 
          links: Array.from(this.lottieLinks),
          count: this.lottieLinks.size 
        });
      }
    });
    
    // Initial extraction and badge update
    setTimeout(() => {
      this.extractLinks();
      this.updateBadge();
    }, 2000);
  }

  extractLinks() {
    const previousCount = this.lottieLinks.size;
    
    // Extract from network requests (if available in DOM)
    this.extractFromNetworkRequests();
    
    // Extract from DOM elements
    this.extractFromDOM();
    
    // Extract from JSON-LD and script tags
    this.extractFromScripts();
    
    // If new links found, update badge
    if (this.lottieLinks.size !== previousCount) {
      this.updateBadge();
    }
  }

  extractFromNetworkRequests() {
    // Look for lottie asset URLs in various elements
    const selectors = [
      'link[href*=".lottie"]',
      'link[href*=".json"][href*="lottiefiles"]',
      '[data-src*=".lottie"]',
      '[data-src*=".json"][data-src*="lottiefiles"]',
      '[data-url*=".lottie"]',
      '[data-url*=".json"][data-url*="lottiefiles"]'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const url = el.src || el.href || el.dataset.src || el.dataset.url;
        if (url && this.isLottieAsset(url)) {
          this.lottieLinks.add(url);
        }
      });
    });
  }

  extractFromDOM() {
    // Look for URLs in text content, data attributes, and other places
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        this.extractLinksFromText(node.textContent);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Check all attributes for lottie URLs
        Array.from(node.attributes || []).forEach(attr => {
          this.extractLinksFromText(attr.value);
        });
      }
    }
  }

  extractFromScripts() {
    // Extract from script tags that might contain lottie URLs
    const scripts = document.querySelectorAll('script:not([src])');
    scripts.forEach(script => {
      this.extractLinksFromText(script.textContent);
    });

    // Extract from JSON-LD
    const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdElements.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        this.extractLinksFromObject(data);
      } catch (e) {
        // Ignore invalid JSON
      }
    });
  }

  extractLinksFromText(text) {
    if (!text) return;
    
    // Regular expressions to match only .lottie and .json files
    const urlPatterns = [
      // .lottie files from various domains
      /https?:\/\/[^\s"'<>()]*\.lottie(?:\?[^\s"'<>()]*)?/gi,
      // .json files from lottiefiles.com domains
      /https?:\/\/assets[-\w]*\.lottiefiles\.com\/[^\s"'<>()]*\.json/gi,
      /https?:\/\/app\.lottiefiles\.com\/[^\s"'<>()]*\.json/gi,
      // Special lottiefiles.com package patterns (JSON)
      /https?:\/\/assets\d*\.lottiefiles\.com\/packages\/[^\s"'<>()]*\.json/gi
    ];

    urlPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(url => {
          // Clean up the URL (remove trailing punctuation)
          const cleanUrl = url.replace(/[.,;:!?"'\])}>]*$/, '');
          if (this.isLottieAsset(cleanUrl)) {
            this.lottieLinks.add(cleanUrl);
          }
        });
      }
    });
  }

  extractLinksFromObject(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.extractLinksFromObject(item));
    } else {
      Object.values(obj).forEach(value => {
        if (typeof value === 'string' && this.isLottieAsset(value)) {
          this.lottieLinks.add(value);
        } else if (typeof value === 'object') {
          this.extractLinksFromObject(value);
        }
      });
    }
  }

  isLottieAsset(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Clean the URL to get the path
    let cleanUrl = url.split('?')[0].toLowerCase();
    
    return (
      // .lottie files from any domain
      cleanUrl.endsWith('.lottie') ||
      
      // .json files only from lottiefiles domains
      (cleanUrl.endsWith('.json') && (
        url.includes('lottiefiles.com') ||
        url.includes('lottie.host')
      ))
    );
  }

  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldExtract = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldExtract = true;
        }
      });
      
      if (shouldExtract) {
        // Debounce extraction
        clearTimeout(this.extractionTimeout);
        this.extractionTimeout = setTimeout(() => {
          this.extractLinks();
        }, 1000);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  updateBadge() {
    chrome.runtime.sendMessage({
      action: 'updateBadge',
      count: this.lottieLinks.size
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    clearTimeout(this.extractionTimeout);
  }
}

// Initialize the extractor
const lottieExtractor = new LottieExtractor();

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
  lottieExtractor.destroy();
});