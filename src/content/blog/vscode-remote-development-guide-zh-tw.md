---
title: "VS Code Remote Development 完整教學：SSH 遠端連線與 Dev Containers 設定"
description: "用 VS Code Remote 系列擴充套件直接在遠端伺服器或 Docker 容器內開發，享有本機般的編輯體驗。涵蓋 SSH Remote、Dev Containers 完整設定步驟。"
date: "2026-04-04"
author: "DevPlaybook Team"
lang: "zh-TW"
tags: ["vscode", "remote-development", "ssh", "dev-containers", "docker", "開發環境"]
readingTime: "11 分鐘"
---

VS Code Remote Development 系列讓你把編輯器 UI 留在本機，把真正的開發工作放到遠端——無論是雲端伺服器、虛擬機，還是 Docker 容器。你用本機的鍵盤和螢幕，但程式碼、終端機、語言伺服器全都在遠端執行。

---

## 三種 Remote 擴充套件

| 擴充套件 | 使用場景 |
|---------|---------|
| **Remote - SSH** | 連線到任意有 SSH 的伺服器或 VM |
| **Dev Containers** | 在 Docker 容器內開發，環境完全隔離 |
| **Remote - WSL** | Windows 上直接在 WSL Linux 環境開發 |

安裝 **Remote Development** 擴充套件包即可一次取得三者。

---

## Remote - SSH：連線到遠端伺服器

### 前置要求

- 遠端伺服器有 SSH 存取（Linux/macOS）
- 本機安裝 OpenSSH 用戶端

### 設定 SSH 金鑰（推薦）

```bash
# 在本機產生 SSH 金鑰
ssh-keygen -t ed25519 -C "your_email@example.com"

# 複製公鑰到伺服器
ssh-copy-id user@your-server.com

# 或手動貼上（沒有 ssh-copy-id 時）
cat ~/.ssh/id_ed25519.pub | ssh user@your-server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 設定 SSH Config

編輯 `~/.ssh/config`（VS Code 會自動讀取這個檔案）：

```ssh-config
Host myserver
    HostName your-server.com
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60

Host staging
    HostName 10.0.1.50
    User deploy
    IdentityFile ~/.ssh/staging_key
    ProxyJump bastion   # 透過跳板機連線
```

### 連線步驟

1. 按 `F1` → 輸入 `Remote-SSH: Connect to Host`
2. 選擇你設定的 Host，或輸入 `user@hostname`
3. VS Code 會在遠端自動安裝 VS Code Server，首次需要幾秒鐘
4. 開啟遠端資料夾：`File → Open Folder`

連線後，VS Code 右下角會顯示 `SSH: myserver`，終端機也是在遠端執行。

---

## Dev Containers：在 Docker 容器內開發

Dev Containers 讓你把整個開發環境（編譯器、工具、擴充套件）打包進 Docker 容器，確保所有人的開發環境完全一致。

### devcontainer.json 設定

在專案根目錄建立 `.devcontainer/devcontainer.json`：

```json
{
  "name": "Node.js 開發環境",
  "image": "mcr.microsoft.com/devcontainers/node:20-bookworm",

  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-typescript-next"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "terminal.integrated.defaultProfile.linux": "zsh"
      }
    }
  },

  "postCreateCommand": "npm install",
  "forwardPorts": [3000, 5173],
  "remoteUser": "node"
}
```

### 使用 Docker Compose 的 Dev Container

如果你的專案已有 `docker-compose.yml`，可以讓 Dev Container 整合進去：

```json
{
  "name": "全端開發環境",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "backend",
  "workspaceFolder": "/app",

  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "prisma.prisma"
      ]
    }
  },

  "postCreateCommand": "npm install",
  "forwardPorts": [3000, 5173, 5432]
}
```

### 開啟 Dev Container

1. 在已有 `.devcontainer/devcontainer.json` 的資料夾開啟 VS Code
2. 右下角出現提示「Reopen in Container」→ 點擊
3. 或按 `F1` → `Dev Containers: Reopen in Container`

VS Code 會建置容器、安裝指定的擴充套件，全程自動完成。

---

## 進階技巧

### 轉發本機 Port 到遠端

在 Remote SSH 或 Dev Container 中，某服務在遠端跑在 port 3000，想在本機瀏覽器存取：

- **自動轉發**：VS Code 偵測到服務後會自動提示轉發
- **手動轉發**：`F1` → `Forward a Port` → 輸入 3000

### dotfiles 自動同步

每次進入新 Dev Container 都要重新設定 zsh、aliases？把 dotfiles 存到 GitHub，在 VS Code 設定中啟用：

```json
// settings.json
{
  "dotfiles.repository": "github.com/username/dotfiles",
  "dotfiles.installCommand": "install.sh"
}
```

### 在遠端安裝額外工具

`devcontainer.json` 的 `postCreateCommand` 可以執行任何指令：

```json
{
  "postCreateCommand": "npm install && npx husky install && sudo apt-get install -y jq"
}
```

---

## 常見問題

**連線後 Git 沒辦法 push**

SSH Remote 預設不會把本機的 SSH agent 轉發到遠端。在 `~/.ssh/config` 加上：

```ssh-config
Host myserver
    ForwardAgent yes
```

**Dev Container 建置很慢**

把常用的工具預先打包到自訂的 base image，而不是每次在 `postCreateCommand` 安裝：

```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/node:20
RUN apt-get update && apt-get install -y jq postgresql-client
```

然後在 `devcontainer.json` 改用：

```json
{
  "build": {
    "dockerfile": "Dockerfile"
  }
}
```

---

## 小結

VS Code Remote Development 改變了「開發環境需要本機安裝」的假設。SSH Remote 讓你直接在強力伺服器上開發，Dev Containers 讓環境設定成為程式碼的一部分。兩者結合 Docker Compose，你就能打造一個 `git clone` + `Reopen in Container` 就完整重現的開發環境。
