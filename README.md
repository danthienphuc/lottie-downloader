# 🎪 Lottie Assets Manager - Chrome Extension

Chrome extension to extract and manage Lottie animation asset links from LottieFiles websites.

## ✨ New: Tab Manager Interface

**No more popup!** Extension now opens a dedicated tab manager:
- Click extension icon → Opens full-page manager in new tab  
- **Scans all open LottieFiles tabs** - No more empty results!
- Choose specific tabs to extract from or extract from all tabs
- **Cached results** - Data persists for 1 hour across sessions  
- Downloads continue running even if you close the manager tab
- Better UI/UX with full-page layout and tab selection
- Auto-focus existing manager tab if already open

## 🔍 Features

### 🔍 Extraction
- Automatically detects .lottie and .json files
- Supports multiple domains:
  - lottiefiles.com
  - app.lottiefiles.com
  - lottie.host
- Real-time page monitoring with mutation observer

### 📋 Copy Functions
- **Copy All**: Copy all links as comma-separated
- **Copy All (Rows)**: Copy each link on separate lines
- **Copy by Extension**: Dynamic buttons for .lottie, .json files

### 📥 Download Features
- **Download All**: Bulk download with progress tracking
- **Parallel Processing**: Configurable concurrent downloads
- **Error Handling**: Retry logic with failed download logging
- **Individual Downloads**: Per-link download buttons

### ⚙️ Configuration
- Adjustable batch size (1-10 parallel downloads)
- Retry attempts (0-5 times)
- Batch delay timing (500-5000ms)
- Tab close delay (1000-10000ms)

## 🔧 Console Configuration

Open DevTools Console in popup and use:

```javascript
// View current config
showLottieConfig()

// Adjust settings
configureLottieDownloads({
  batchSize: 3,        // Concurrent downloads
  maxRetries: 2,       // Retry attempts  
  batchDelay: 1000,    // Batch delay (ms)
  tabCloseDelay: 2000  // Tab close delay (ms)
})
```

### Recommended Presets:

**Fast Network:**
```javascript
configureLottieDownloads({batchSize: 5, maxRetries: 1, batchDelay: 800})
```

**Slow Network:**
```javascript
configureLottieDownloads({batchSize: 2, maxRetries: 3, batchDelay: 2000})
```

## 🚀 Installation

1. Enable Developer mode in Chrome Extensions
2. Load unpacked extension from this folder
3. Navigate to supported LottieFiles domains
4. Click extension icon to view detected assets

## 🎯 Usage

1. Visit any supported LottieFiles domain  
2. Extension badge shows count of detected assets
3. **Click extension icon to open tab manager** (new!)
4. Use copy/download buttons in the manager tab
5. Downloads continue even if you close the manager tab
6. Check console in manager tab for configuration options
7. View failed downloads log if needed

## 📁 File Structure

- `manifest.json` - Extension configuration
- `content.js` - Page content analysis
- `background.js` - Badge and notification management  
- `popup.html/css/js` - User interface
- `CONFIGURATION.md` - Detailed configuration guide

## 🔄 Updates

v3.0.0 (Latest):
- **NEW: Tab Manager Interface** - No more popup! Full-page manager tab
- Downloads continue running in background after closing manager
- Better UX with full-page layout and improved navigation
- Existing manager tab auto-focus when clicking extension icon

v2.0.0:
- Added parallel batch downloads
- Configurable download settings
- Improved error handling and logging
- Support for app.lottiefiles.com and lottie.host  
- Enhanced UI with progress tracking

## 📝 Notes

- Settings auto-save to localStorage
- Failed downloads logged and retrievable
- Tab-based downloads for error resilience
- Real-time asset detection via mutation observer

---

## Original Request (Vietnamese)

Bạn là một lập trình viên và bạn có thể giúp tôi viết một đoạn mã JavaScript để lấy các liên kết tài sản Lottie từ trang web lottiefiles.com không? Tôi muốn đoạn mã này có thể chạy trong một tiện ích mở rộng của Chrome và hiển thị các liên kết trong một cửa sổ bật lên. Ngoài ra, tôi muốn có một nút để sao chép các liên kết vào clipboard và một nút khác để mở trang web LottieFiles. Khi người dùng sao chép các liên kết, tôi muốn hiển thị một thông báo cho họ biết rằng các liên kết đã được sao chép thành công. Cuối cùng, tôi muốn tiện ích mở rộng hiển thị một huy hiệu trên biểu tượng của nó với số lượng liên kết tìm thấy. Nếu người dùng nhấp vào nút mở trang web LottieFiles, tôi muốn nó mở một tab mới với trang web đó.

### Sample Links

links to lottie page: https://lottiefiles.com/free-animations/free?page=2

Sample links of Lottie assets to extract (captured from network tab in devtools):
- https://assets-v2.lottiefiles.com/a/232ca578-117d-11ee-a574-5bcc50b1bc8f/zQ6XDzfCaS.lottie
- https://assets-v2.lottiefiles.com/a/569d9eae-116d-11ee-ade3-df3bcdfa8a46/eJNjiPkRNE.lottie
- https://assets-v2.lottiefiles.com/a/7e7afcb0-1180-11ee-a8c1-effed0d43a4c/f3pU1nohZa.lottie

Other sample links:
- https://assets3.lottiefiles.com/packages/lf20_dmw9ppkc.json (rocket launch)
- https://assets2.lottiefiles.com/packages/lf20_qp1q7mct.json (growth chart)
- https://assets1.lottiefiles.com/packages/lf20_w51pcehl.json (adapt/resilience)

