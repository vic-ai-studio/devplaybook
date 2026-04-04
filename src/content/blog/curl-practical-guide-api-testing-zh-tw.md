---
title: "curl 深度使用手冊：API 測試從入門到進階"
description: "curl 是每位開發者必備的 CLI 工具。本文涵蓋 GET/POST/PUT/DELETE 請求、認證、header 設定、檔案上傳、除錯技巧，以及 REST API 測試的完整實戰範例。"
date: "2026-04-04"
author: "DevPlaybook Team"
lang: "zh-TW"
tags: ["curl", "api", "cli", "http", "rest", "開發工具"]
readingTime: "12 分鐘"
---

`curl` 是任何能發出 HTTP 請求的環境都會有的指令列工具。學好 curl，你就有了一個不需要 Postman、不需要 GUI、可以在任何伺服器上直接測試 API 的瑞士刀。

---

## 基本語法

```bash
curl [選項] [URL]
```

最簡單的用法：

```bash
# GET 請求
curl https://api.example.com/users

# 加上格式化輸出（需要安裝 jq）
curl https://api.example.com/users | jq .
```

---

## 常用選項速查表

| 選項 | 說明 | 範例 |
|------|------|------|
| `-X` | 指定 HTTP 方法 | `-X POST` |
| `-H` | 設定 Header | `-H "Content-Type: application/json"` |
| `-d` | 請求 body | `-d '{"name":"John"}'` |
| `-o` | 儲存回應到檔案 | `-o output.json` |
| `-s` | 靜默模式（不顯示進度） | `-s` |
| `-v` | 詳細模式（顯示 request/response header） | `-v` |
| `-i` | 顯示 response header | `-i` |
| `-L` | 跟隨重導向 | `-L` |
| `-u` | Basic Auth | `-u user:password` |
| `-k` | 忽略 SSL 憑證錯誤 | `-k`（只用在測試！） |

---

## HTTP 方法完整範例

### GET 請求

```bash
# 基本 GET
curl https://jsonplaceholder.typicode.com/posts/1

# 帶 Query String
curl "https://api.example.com/users?page=2&limit=10"

# 顯示 Response Header
curl -i https://api.example.com/users
```

### POST 請求（JSON body）

```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

從檔案讀取 body（避免 shell 特殊字元問題）：

```bash
# 建立 payload.json
cat > payload.json << 'EOF'
{
  "name": "Alice",
  "email": "alice@example.com",
  "role": "admin"
}
EOF

curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d @payload.json
```

### PUT / PATCH

```bash
# PUT（完整更新）
curl -X PUT https://api.example.com/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated", "email": "alice@example.com"}'

# PATCH（部分更新）
curl -X PATCH https://api.example.com/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated"}'
```

### DELETE

```bash
curl -X DELETE https://api.example.com/users/123
```

---

## 認證方式

### Bearer Token（JWT）

```bash
curl https://api.example.com/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Basic Auth

```bash
curl -u username:password https://api.example.com/admin
# 等同於：
curl -H "Authorization: Basic $(echo -n 'username:password' | base64)" https://api.example.com/admin
```

### API Key

```bash
# Header 方式
curl https://api.example.com/data \
  -H "X-API-Key: your-api-key-here"

# Query String 方式
curl "https://api.example.com/data?api_key=your-api-key-here"
```

---

## 檔案上傳

### multipart/form-data（表單上傳）

```bash
curl -X POST https://api.example.com/upload \
  -F "file=@/path/to/image.jpg" \
  -F "description=我的圖片"
```

### 純二進位上傳

```bash
curl -X PUT https://api.example.com/files/image.jpg \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/image.jpg
```

---

## 除錯技巧

### 查看完整 Request 和 Response

```bash
curl -v https://api.example.com/users 2>&1 | head -50
```

輸出說明：
- `>` 開頭 = 你發出的 request
- `<` 開頭 = 伺服器的 response

### 只看 HTTP Status Code

```bash
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/users
# 輸出：200
```

### 計時

```bash
curl -s -o /dev/null -w "Total: %{time_total}s\nDNS: %{time_namelookup}s\nConnect: %{time_connect}s\n" https://api.example.com
```

---

## 實戰：測試完整的 REST API

假設你有一個 Todo API：

```bash
#!/bin/bash
BASE_URL="http://localhost:3000/api"

# 1. 登入取得 Token
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 2. 建立 Todo
TODO_ID=$(curl -s -X POST "$BASE_URL/todos" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"學習 curl","done":false}' \
  | jq -r '.id')

echo "建立 Todo ID: $TODO_ID"

# 3. 取得列表
curl -s "$BASE_URL/todos" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {id, title, done}'

# 4. 更新為完成
curl -s -X PATCH "$BASE_URL/todos/$TODO_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"done":true}'

# 5. 刪除
curl -s -X DELETE "$BASE_URL/todos/$TODO_ID" \
  -H "Authorization: Bearer $TOKEN"
echo "Todo $TODO_ID 已刪除"
```

---

## 常見問題

**Q：中文 body 內容亂碼**

Windows 上的 shell 可能有編碼問題，改用 `@file.json` 從檔案讀取，確保 UTF-8 編碼。

**Q：HTTPS 連線失敗**

在測試環境用 `-k` 忽略憑證驗證，但正式環境絕對不能這樣做。如果是自簽憑證，用 `--cacert your-ca.crt` 指定 CA 憑證。

---

## 小結

curl 看似簡單，但熟練之後是最快的 API 除錯工具——不需要開 GUI、可以直接在伺服器上執行、可以寫進 shell script 自動化。掌握 `-X`、`-H`、`-d`、`-v` 四個核心選項，90% 的日常 API 測試需求都能搞定。
