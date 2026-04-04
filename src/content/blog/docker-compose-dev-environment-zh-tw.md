---
title: "Docker Compose 開發環境架設：前端、後端、資料庫一鍵啟動"
description: "用 Docker Compose 建立完整的本地開發環境，包含 React 前端、Node.js 後端、PostgreSQL 資料庫，一個指令啟動所有服務，告別「在我電腦上可以跑」的問題。"
date: "2026-04-04"
author: "DevPlaybook Team"
lang: "zh-TW"
tags: ["docker", "docker-compose", "開發環境", "postgresql", "nodejs", "devops"]
readingTime: "13 分鐘"
---

「在我電腦上可以跑」是開發團隊最常聽到的噩夢。Docker Compose 讓你用一個 YAML 檔案定義整個開發環境——前端、後端、資料庫——所有人執行同一個指令，得到完全一致的環境。

---

## Docker Compose 是什麼？

Docker Compose 是 Docker 官方的多容器管理工具。你在 `docker-compose.yml` 裡定義所有服務，然後用 `docker compose up` 一次啟動全部。

與 `docker run` 的差別：

| | `docker run` | `docker compose` |
|---|---|---|
| 服務數量 | 單一容器 | 多容器 |
| 設定方式 | CLI 參數 | YAML 檔案 |
| 服務間通訊 | 需要手動設定網路 | 自動建立網路，用服務名稱互連 |
| 版控友善度 | 低 | 高（設定檔可 commit） |

---

## 安裝確認

Docker Desktop 已內建 Compose v2。確認安裝：

```bash
docker compose version
# Docker Compose version v2.24.0
```

> 注意：新版指令是 `docker compose`（空格），舊版 `docker-compose`（連字符）已棄用。

---

## 實戰：全端開發環境

目標架構：
- **前端**：React（Vite，port 5173）
- **後端**：Node.js + Express（port 3000）
- **資料庫**：PostgreSQL 16
- **管理工具**：pgAdmin（port 8080）

### 專案目錄結構

```
project/
├── frontend/
│   ├── Dockerfile
│   └── package.json
├── backend/
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  # PostgreSQL 資料庫
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Node.js 後端
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/myapp
      NODE_ENV: development
      PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules    # 避免覆蓋容器內的 node_modules
    depends_on:
      db:
        condition: service_healthy
    command: npm run dev

  # React 前端
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      VITE_API_URL: http://localhost:3000
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

  # pgAdmin 資料庫管理介面
  pgadmin:
    image: dpage/pgadmin4:latest
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "8080:80"
    depends_on:
      - db

volumes:
  postgres_data:
```

---

## 後端 Dockerfile（開發版）

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 先複製 package.json，利用 Docker layer 快取
COPY package*.json ./
RUN npm install

# 複製原始碼
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

## 前端 Dockerfile（開發版，支援 HMR）

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
# --host 讓 Vite 在容器外可存取
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

## 常用指令

```bash
# 啟動所有服務（背景執行）
docker compose up -d

# 查看執行中的服務
docker compose ps

# 查看 backend 服務的 log
docker compose logs -f backend

# 進入 backend 容器的 shell
docker compose exec backend sh

# 停止所有服務
docker compose down

# 停止並刪除 volumes（清空資料庫）
docker compose down -v

# 只重建並重啟特定服務
docker compose up -d --build backend
```

---

## 環境變數管理

不要在 `docker-compose.yml` 寫死機密值。改用 `.env` 檔案：

**.env**（加入 `.gitignore`）：
```
POSTGRES_PASSWORD=supersecret123
PGADMIN_PASSWORD=admin456
JWT_SECRET=your-jwt-secret-here
```

**docker-compose.yml** 引用：
```yaml
services:
  db:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

---

## 多環境設定

用 override 檔案處理不同環境：

```bash
# 開發環境（預設）
docker compose up

# 生產環境
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

**docker-compose.prod.yml**：
```yaml
services:
  backend:
    build:
      target: production    # 使用 multi-stage build 的 production 階段
    environment:
      NODE_ENV: production
    command: node dist/server.js    # 改用編譯後的版本
```

---

## 常見問題排解

**Q：容器啟動了但連不到資料庫**

加上 `healthcheck` 和 `depends_on: condition: service_healthy`（如上面範例），確保資料庫完全就緒後才啟動後端。

**Q：修改程式碼沒有即時反映**

確認 volume 掛載正確：`./backend:/app`。同時確認開發模式有啟用 watch 功能（nodemon、Vite HMR 等）。

**Q：node_modules 被覆蓋**

加上匿名 volume：`/app/node_modules`，優先級高於具名掛載，保留容器內安裝的版本。

---

## 小結

Docker Compose 把「環境設定文件」從口頭傳授變成可執行的程式碼。新人加入團隊只需要 `git clone` + `docker compose up`，幾分鐘內就有完整的開發環境。搭配 `.env.example` 給出環境變數範本，就能讓本地開發與 CI/CD 環境保持一致。
