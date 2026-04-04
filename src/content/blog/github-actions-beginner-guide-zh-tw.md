---
title: "GitHub Actions 入門必讀：從 0 到自動化部署"
description: "完整的 GitHub Actions 新手教學，從基本概念、workflow 語法到實戰 CI/CD 自動部署。附完整 YAML 範例，30 分鐘學會持續整合。"
date: "2026-04-04"
author: "DevPlaybook Team"
lang: "zh-TW"
tags: ["github-actions", "ci-cd", "自動化", "devops", "yaml", "部署"]
readingTime: "12 分鐘"
---

GitHub Actions 是 GitHub 內建的 CI/CD 平台，讓你直接在 repository 裡定義自動化流程——測試、建置、部署，全部用 YAML 設定，不需要額外安裝任何工具。

---

## 核心概念

在寫第一個 workflow 之前，先理解五個關鍵術語：

| 術語 | 說明 |
|------|------|
| **Workflow** | 一個自動化流程，存放在 `.github/workflows/` 目錄下 |
| **Event** | 觸發 workflow 的事件（push、PR、cron 等） |
| **Job** | Workflow 內的一個執行單位，可以並行或依序執行 |
| **Step** | Job 內的單一動作，可以是指令或 Action |
| **Action** | 可重用的模組（GitHub Marketplace 有數千個現成 Action） |

---

## 你的第一個 Workflow

在 repository 根目錄建立 `.github/workflows/hello.yml`：

```yaml
name: Hello World

on:
  push:
    branches: [main]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: 打招呼
        run: echo "Hello, GitHub Actions!"
```

每次推送到 `main` 分支，這個 workflow 就會自動執行。

---

## 實戰：Node.js 專案 CI

以下是一個完整的 Node.js 測試 workflow：

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - name: Checkout 程式碼
        uses: actions/checkout@v4

      - name: 設定 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: 安裝依賴
        run: npm ci

      - name: 執行測試
        run: npm test

      - name: 建置
        run: npm run build
```

重點說明：
- `matrix` 讓你同時在多個 Node.js 版本上測試
- `actions/checkout@v4` 是官方的程式碼拉取 Action
- `cache: 'npm'` 快取 node_modules，加速後續執行

---

## 實戰：自動部署到 Vercel

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 部署到 Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

把 `VERCEL_TOKEN`、`ORG_ID`、`PROJECT_ID` 加入 Repository Settings → Secrets，部署就完全自動化。

---

## 環境變數與 Secrets

**明文環境變數**（非機密）：

```yaml
jobs:
  build:
    env:
      NODE_ENV: production
      API_URL: https://api.example.com
    steps:
      - run: echo $API_URL
```

**Secrets**（機密資訊，加密儲存）：

```yaml
steps:
  - name: 發送通知
    run: curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d '{"text":"部署完成！"}'
```

Secrets 在 log 中會自動被遮蔽，確保安全。

---

## 常用觸發事件

```yaml
on:
  # 推送時觸發
  push:
    branches: [main]
    paths:
      - 'src/**'       # 只有 src/ 有變更才觸發

  # PR 時觸發
  pull_request:
    types: [opened, synchronize, reopened]

  # 排程執行（每天凌晨 2 點）
  schedule:
    - cron: '0 2 * * *'

  # 手動觸發
  workflow_dispatch:
    inputs:
      environment:
        description: '部署環境'
        required: true
        default: 'staging'
```

---

## 實用技巧

### 快取依賴，加速執行

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### Job 之間的依賴關係

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy:
    needs: test          # 等 test job 完成才執行
    runs-on: ubuntu-latest
    steps:
      - run: npm run deploy
```

### 條件執行

```yaml
steps:
  - name: 只在 main 分支部署
    if: github.ref == 'refs/heads/main'
    run: npm run deploy
```

---

## 除錯技巧

執行失敗時，在 step 加上 `continue-on-error: true` 讓後續步驟繼續跑，方便蒐集更多資訊：

```yaml
steps:
  - name: 測試（失敗也繼續）
    continue-on-error: true
    run: npm test

  - name: 上傳測試結果
    uses: actions/upload-artifact@v4
    with:
      name: test-results
      path: test-results/
```

---

## 小結

GitHub Actions 的學習曲線比想像中平緩——大部分需求只需要 `push` 觸發 + `checkout` + 執行指令三個步驟就能搞定。掌握 matrix、secrets 和 job 依賴後，你就能建立完整的 CI/CD 流水線，讓重複性工作完全自動化。

建議下一步：瀏覽 [GitHub Marketplace](https://github.com/marketplace?type=actions) 找到你的工具鏈對應的 Action，大部分常見的部署目標都有官方或社群維護的現成 Action 可以直接使用。
