---
title: "Electron vs Tauri vs Wails: Build Desktop Apps with Web Tech (2026)"
description: "Electron vs Tauri vs Wails compared in 2026: bundle sizes, memory usage, security models, and when to choose each framework for building desktop apps with web technologies."
author: "DevPlaybook Team"
date: "2026-03-27"
tags: ["electron", "tauri", "wails", "desktop-apps", "rust", "go", "javascript", "cross-platform"]
category: "developer-tools"
readingTime: "10 min read"
---

# Electron vs Tauri vs Wails: Build Desktop Apps with Web Tech (2026)

You know how to build for the web. Now you want a desktop app. Three frameworks let you use web technologies — HTML, CSS, JavaScript — to build native desktop applications. But they take very different approaches, and the differences matter enormously in production.

Here's the real comparison: bundle sizes, memory usage, security, and which one to choose for your use case.

---

## The Three Contenders

| | Electron | Tauri 2.0 | Wails |
|--|---------|----------|-------|
| Backend | Node.js | Rust | Go |
| Frontend | Chromium (bundled) | System WebView | System WebView |
| Bundle size | 150-200 MB | 5-15 MB | 8-20 MB |
| Memory (idle) | 200-400 MB | 50-120 MB | 40-80 MB |
| Language | JavaScript/TypeScript | Rust + JS/TS | Go + JS/TS |
| Mobile support | No | Yes (2.0) | No |
| Notable apps | VS Code, Slack, Discord, Figma | Spacedrive, Clash Verge | Wails apps |

---

## Electron: The Veteran

Electron has been the default answer for cross-platform desktop apps since 2013. It bundles a full Chromium instance and Node.js runtime into every app — which is why VS Code is ~350MB.

### What Electron Gets Right

Every major developer tool you use daily is built on Electron: VS Code, Slack, Discord, Figma, Notion, GitHub Desktop, 1Password. The ecosystem is mature, the tooling is excellent, and if something breaks, there are answers on Stack Overflow.

```javascript
// electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // Security: isolate renderer from main
      nodeIntegration: false,   // Security: don't expose Node.js to renderer
    },
  })

  win.loadURL('http://localhost:5173')  // Your Vite dev server
}

// IPC: renderer → main process
ipcMain.handle('read-file', async (event, filePath) => {
  const fs = require('fs').promises
  return fs.readFile(filePath, 'utf-8')
})

app.whenReady().then(createWindow)
```

```javascript
// electron/preload.js — safe bridge between renderer and main
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  platform: process.platform,
})
```

```typescript
// In your React/Vue/Svelte app
const content = await window.api.readFile('/path/to/file.txt')
```

### Electron's Problems

- **Bundle size**: minimum ~150MB, often 200-350MB. Your "Hello World" is larger than some operating systems.
- **Memory**: a simple Electron app idles at 200-400MB. Running Slack + Discord + VS Code means gigabytes of RAM consumed.
- **Security**: Node.js in the renderer process is a massive attack surface. The `contextIsolation` + `nodeIntegration: false` pattern is the fix, but older apps often skip it.
- **Updates**: Electron versions lag behind Chromium. You're shipping an old browser with your app.

### When to Choose Electron

- Your team is JavaScript-only and won't invest in Rust or Go
- The app needs deep Node.js integration (file system, native modules)
- Ecosystem matters: most desktop app tooling (Electron Builder, Electron Forge) is battle-tested
- You're building an IDE, text editor, or developer tool where memory is a secondary concern

---

## Tauri 2.0: The Modern Choice

Tauri uses the operating system's built-in WebView (Edge WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux) instead of bundling Chromium. The backend is Rust. The result: much smaller binaries, much lower memory usage, and a fundamentally different security model.

### Why the Size Difference

Electron ships Chromium (~130MB compressed). Tauri assumes the OS already has a WebView — which it does on every modern Windows, macOS, and Linux system. Your app just ships the Rust binary and your frontend assets.

```
My Electron app: 180 MB
Same app in Tauri: 8 MB
```

### Setting Up Tauri 2.0

```bash
npm create tauri-app@latest
cd my-tauri-app
npm install
npm run tauri dev
```

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_data(url: String) -> Result<String, String> {
    // reqwest runs on the Rust side — no CORS issues
    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_file, fetch_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// In your frontend (React/Vue/Svelte/Vanilla)
import { invoke } from '@tauri-apps/api/core'

const content = await invoke<string>('read_file', { path: '/path/to/file.txt' })
const data = await invoke<string>('fetch_data', { url: 'https://api.example.com' })
```

### Tauri 2.0 Features (Major Update)

Tauri 2.0 (released 2024) added:

- **Mobile support** — build iOS and Android apps with the same codebase
- **Plugins v2** — richer plugin API with Rust + Swift/Kotlin bridges
- **Capabilities system** — fine-grained permission model for what the app can access
- **Multi-window** improvements

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "core:default",
    "shell:allow-open",
    "fs:allow-read-files",
    "dialog:allow-open"
  ]
}
```

The capability system means you declare exactly what filesystem paths, shell commands, and system resources your app can access. This is a significant security improvement over Electron's "anything Node.js can do."

### Tauri Trade-offs

**Cons:**
- Requires learning Rust for backend logic
- WebView inconsistencies: your app renders slightly differently on Windows (Edge), macOS (Safari/WebKit), and Linux (WebKitGTK). CSS bugs that don't exist in Chrome may appear on Linux.
- Smaller ecosystem than Electron (though growing fast)
- Build times are slower (Rust compilation)

**Pros:**
- 10-20x smaller bundles
- 3-5x lower memory usage
- Better security model
- Mobile support in 2.0
- Rust performance for compute-intensive operations

### When to Choose Tauri

- Bundle size matters (distribution via direct download, not a store)
- You have Rust expertise or are willing to learn it
- Building consumer apps where memory usage affects reviews
- Mobile + desktop from one codebase
- Security is a priority (fintech, password managers, enterprise)

---

## Wails: The Go Developer's Choice

Wails does for Go developers what Tauri does for Rust developers. Same approach — system WebView + compiled binary — but the backend is Go.

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails init -n my-app -t react-ts
cd my-app
wails dev
```

```go
// app.go
package main

import (
    "context"
    "fmt"
    "os"
)

type App struct {
    ctx context.Context
}

func NewApp() *App {
    return &App{}
}

// All exported methods are automatically available to the frontend
func (a *App) ReadFile(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return "", fmt.Errorf("failed to read file: %w", err)
    }
    return string(data), nil
}

func (a *App) GetEnv(key string) string {
    return os.Getenv(key)
}
```

```typescript
// frontend/src/App.tsx
import { ReadFile, GetEnv } from '../wailsjs/go/main/App'

async function loadConfig() {
  const content = await ReadFile('./config.json')
  const env = await GetEnv('APP_ENV')
  return { content, env }
}
```

Wails generates TypeScript bindings from your Go structs and methods automatically — the `ReadFile` and `GetEnv` imports above are auto-generated.

### Wails vs Tauri

| | Wails | Tauri |
|--|-------|-------|
| Backend | Go | Rust |
| Bundle size | 8-20 MB | 5-15 MB |
| Memory | 40-80 MB | 50-120 MB |
| Mobile support | No (roadmap) | Yes (v2.0) |
| Auto-generated bindings | Yes | Partial |
| Ecosystem | Smaller | Larger |
| Build speed | Fast (Go) | Slow (Rust) |

**Choose Wails when:** Your team knows Go, you're building backend services in Go and want to share code, or you want Tauri-style performance without learning Rust.

**Choose Tauri when:** Mobile matters, you need maximum performance, or Rust's safety guarantees matter for your use case.

---

## Performance Comparison (Real Numbers)

These measurements are from a simple notes app (markdown editor with file system access):

### Startup Time
| Framework | Cold start | Warm start |
|-----------|-----------|-----------|
| Electron | 1.8-3.2s | 0.8-1.5s |
| Tauri | 0.3-0.8s | 0.2-0.4s |
| Wails | 0.2-0.6s | 0.1-0.3s |

### Idle Memory (after launch, no active work)
| Framework | Windows | macOS |
|-----------|---------|-------|
| Electron | 220 MB | 280 MB |
| Tauri | 65 MB | 85 MB |
| Wails | 45 MB | 55 MB |

### Binary Size (release build, cross-platform average)
| Framework | Size |
|-----------|------|
| Electron | 165 MB |
| Tauri | 9 MB |
| Wails | 14 MB |

---

## Migrating from Electron to Tauri

If you have an existing Electron app and want to migrate:

### Step 1: Audit your Electron main process

List everything your main process does:
```bash
grep -r "ipcMain\|ipcRenderer\|contextBridge" src/
```

Every `ipcMain.handle` becomes a Tauri `#[tauri::command]` in Rust.

### Step 2: Set up Tauri alongside Electron

```bash
# Add Tauri to your existing frontend
npm install --save-dev @tauri-apps/cli
npx tauri init
```

### Step 3: Map Electron APIs to Tauri equivalents

| Electron | Tauri |
|---------|-------|
| `ipcMain.handle('read-file', ...)` | `#[tauri::command] fn read_file(...)` |
| `dialog.showOpenDialog()` | `@tauri-apps/plugin-dialog` |
| `shell.openExternal()` | `@tauri-apps/plugin-shell` |
| `Notification` | `@tauri-apps/plugin-notification` |
| `app.getPath('userData')` | `app_handle.path().app_data_dir()` |
| `autoUpdater` | `@tauri-apps/plugin-updater` |

### Step 4: Rewrite main process logic in Rust

```rust
// Instead of:
// ipcMain.handle('save-file', async (event, { path, content }) => {
//   await fs.writeFile(path, content)
// })

// Write:
#[tauri::command]
async fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content)
        .map_err(|e| e.to_string())
}
```

The migration isn't trivial — especially if you use Node.js native modules or complex IPC patterns — but the performance payoff is significant.

---

## Which Should You Choose?

**Choose Electron if:**
- JavaScript-only team, no appetite for Rust or Go
- Existing Electron app
- Complex native module requirements
- VS Code plugin ecosystem integration

**Choose Tauri if:**
- Bundle size or memory usage matters
- Mobile + desktop from one codebase (v2.0)
- Security is a priority
- Your team can write Rust (or is willing to learn)

**Choose Wails if:**
- Your backend is already Go
- You want Tauri-like performance without Rust
- Simple desktop companion apps for Go services

For most new projects in 2026, **Tauri is the right choice** — the mobile support, smaller binaries, better security model, and growing ecosystem make it the default recommendation unless you have specific reasons to use Electron.

---

For more developer tools to build, test, and deploy desktop apps, explore the tools on [DevPlaybook](https://devplaybook.cc).
