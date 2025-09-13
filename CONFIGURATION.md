# 🔧 Cấu hình Extension Lottie Assets

## Cấu hình Download từ Console

Extension hỗ trợ cấu hình động các thông số download từ DevTools Console:

### 📊 Xem cấu hình hiện tại:
```javascript
showLottieConfig()
```

### ⚙️ Điều chỉnh cấu hình:
```javascript
// Cấu hình cơ bản
configureLottieDownloads({
  batchSize: 3,        // Số tab download song song (1-10)
  maxRetries: 1,       // Số lần thử lại khi lỗi (0-5)
  batchDelay: 1500,    // Thời gian chờ giữa các batch (500-5000ms)
  tabCloseDelay: 2500  // Thời gian chờ trước khi đóng tab (1000-10000ms)
})
```

### 🚀 Các preset khuyến nghị:

**Mạng nhanh, máy mạnh:**
```javascript
configureLottieDownloads({
  batchSize: 5,
  maxRetries: 1,
  batchDelay: 800,
  tabCloseDelay: 2000
})
```

**Mạng chậm, cẩn thận:**
```javascript
configureLottieDownloads({
  batchSize: 2,
  maxRetries: 3,
  batchDelay: 2000,
  tabCloseDelay: 4000
})
```

**Siêu nhanh (rủi ro cao):**
```javascript
configureLottieDownloads({
  batchSize: 8,
  maxRetries: 0,
  batchDelay: 500,
  tabCloseDelay: 1500
})
```

## 📋 Các tính năng chính:

- **Copy All**: Sao chép tất cả links
- **Copy All (Rows)**: Sao chép mỗi link một dòng
- **Copy by Extension**: Nút động theo loại file (.lottie, .json)
- **Download All**: Tải hàng loạt với progress bar
- **Failed Downloads**: Xem log các file tải lỗi
- **Parallel Processing**: Tải song song nhiều tab

## 🌐 Hỗ trợ các domain:
- lottiefiles.com
- app.lottiefiles.com  
- lottie.host

## ⚠️ Xử lý lỗi:
- Retry tự động khi download lỗi
- Log failed downloads vào localStorage
- UI hiển thị progress và lỗi
- Tab tự đóng sau khi download xong

## 💾 Lưu cấu hình:
Cấu hình sẽ được lưu tự động và khôi phục khi khởi động lại extension.