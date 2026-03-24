# Google Analytics 4 設定指南 (VIC)

## 前置準備
1. 前往 Google Analytics 建立 GA4 資源
2. 取得 Measurement ID (G-XXXXXXXXXX)
3. 前往 Admin > Data Streams > Web Stream 取得 Measurement ID
4. 建立 Measurement Protocol API Secret

## 設定步驟
### 步驟 1: 環境變數設定
在專案根目錄建立 `.env` 檔案，設定以下變數:
```
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_API_SECRET=your_api_secret_here
```

### 步驟 2: 更新 ga4_config.json
將 placeholder 值替换為實際的 Measurement ID 和 API Secret

### 步驟 3: 驗證設定
使用 GA4 DebugView (GA4 > DebugView) 確認事件傳送正常

## 支援的事件
- page_view: 頁面瀏覽
- search: 搜尋行為
- view_item: 瀏覽商品
- add_to_cart: 加入購物車
- purchase: 完成購買

## 注意事項
- 確保 cookie consent 取得後才傳送追蹤資料
- 遵守 GDPR 規範，IP 位址匿名化已啟用
- 敏感資料請勿傳送至 GA4