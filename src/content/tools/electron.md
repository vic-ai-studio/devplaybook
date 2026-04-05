---
title: "Electron — Build Desktop Apps with JavaScript, HTML & CSS"
description: "Build cross-platform desktop apps for Windows, Mac, and Linux using Node.js and Chromium. Powers VS Code, Slack, Discord, and GitHub Desktop."
category: "Desktop"
pricing: "Open Source"
pricingDetail: "Free and open source. No licensing fees."
website: "https://www.electronjs.org"
github: "https://github.com/electron/electron"
tags: ["desktop", "javascript", "nodejs", "chromium", "cross-platform", "electron", "gui", "web-technologies"]
pros:
  - "Massive npm ecosystem — virtually any Node.js or web library works"
  - "Web developers can build full-featured desktop apps with existing skills"
  - "Full Chromium APIs — Canvas, WebGL, WebRTC, WebSockets all available"
  - "Built-in auto-updater for seamless app updates"
  - "Proven at massive scale — VS Code, Slack, Discord, GitHub Desktop, Figma"
cons:
  - "Large bundle size — 150MB+ minimum due to bundled Chromium"
  - "High memory usage — each Electron app runs its own Chromium instance"
  - "Not truly native — no native OS UI components"
  - "Node.js integration in renderer requires careful security configuration"
  - "Chromium overhead adds to startup time"
date: "2026-04-02"
---

## What is Electron?

Electron is an open-source framework developed by GitHub (now Microsoft) for building cross-platform desktop applications using web technologies. It bundles Chromium (the browser engine) and Node.js together, allowing you to write desktop apps with HTML, CSS, and JavaScript that run on Windows, macOS, and Linux.

Applications like Visual Studio Code, Slack, Discord, GitHub Desktop, Figma, Notion, and 1Password are built with Electron. It's the most battle-tested and widely-deployed desktop web app framework in existence.

## Architecture: Main + Renderer + Preload

An Electron app has three distinct execution contexts:

### Main Process

The main process is Node.js — it has full system access, manages windows, handles native menus, and is the app's entry point:

```javascript
// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,   // Security: MUST be true
            nodeIntegration: false,   // Security: MUST be false
        },
    });

    win.loadFile('index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
```

### Renderer Process

The renderer process is a Chromium browser tab — your HTML/CSS/JS web app. It has no direct Node.js access (with `contextIsolation: true`):

```javascript
// renderer.js — runs in the browser context
document.getElementById('open-file').addEventListener('click', async () => {
    // Must go through the contextBridge, not direct Node.js
    const filePath = await window.electronAPI.openFileDialog();
    console.log('Selected:', filePath);
});
```

### Preload Script

The preload script runs before the renderer with access to both Node.js and the DOM. It's the bridge between secure renderer and privileged main:

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose only specific APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    onFileUpdate: (callback) => ipcRenderer.on('file-updated', callback),
});
```

## IPC Communication

IPC (Inter-Process Communication) is how main and renderer processes talk:

```javascript
// main.js — handle IPC requests
const { ipcMain, dialog } = require('electron');
const fs = require('fs/promises');

ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
    return await fs.readFile(filePath, 'utf-8');
});
```

```javascript
// renderer.js — call via exposed API
const content = await window.electronAPI.readFile('/path/to/file.json');
```

## Security Best Practices

Electron's security model has evolved significantly. Key rules:

1. **Always set `contextIsolation: true`** — prevents renderer from accessing Node.js directly
2. **Always set `nodeIntegration: false`** — never expose Node.js to renderer process
3. **Use `contextBridge`** — only expose specific, minimal APIs to renderer
4. **Validate IPC input** — treat renderer messages as untrusted user input
5. **Use `sandbox: true`** for maximum isolation
6. **Set CSP headers** — Content Security Policy on loaded pages

```javascript
// Dangerous (legacy) — DO NOT DO THIS
new BrowserWindow({
    webPreferences: {
        nodeIntegration: true,    // NEVER
        contextIsolation: false,  // NEVER
    }
})
```

## Packaging with electron-builder

`electron-builder` is the standard tool for packaging and distributing Electron apps:

```bash
npm install --save-dev electron-builder
```

```json
// package.json
{
  "build": {
    "appId": "com.mycompany.myapp",
    "productName": "My App",
    "mac": { "category": "public.app-category.developer-tools" },
    "win": { "target": "nsis" },
    "linux": { "target": "AppImage" },
    "publish": {
      "provider": "github",
      "owner": "myorg",
      "repo": "myapp"
    }
  }
}
```

```bash
electron-builder --mac --win --linux  # Build for all platforms
```

## Auto-Updater

Electron's built-in `autoUpdater` module (powered by Squirrel) handles seamless updates:

```javascript
const { autoUpdater } = require('electron');

autoUpdater.setFeedURL({
    url: `https://my-update-server.com/update/${process.platform}/${app.getVersion()}`
});

autoUpdater.on('update-available', () => {
    console.log('Update available, downloading...');
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

app.on('ready', () => {
    autoUpdater.checkForUpdates();
});
```

## Electron vs Tauri vs NW.js

| Factor | Electron | Tauri | NW.js |
|--------|----------|-------|-------|
| Bundle size | 150-350MB | 3-15MB | 100MB+ |
| Backend | Node.js | Rust | Node.js |
| WebView | Bundled Chromium | OS native | Bundled Chromium |
| Memory usage | High (Chromium) | Low | High |
| Security model | Manual setup required | Capability-based | Manual |
| Ecosystem maturity | Very mature | Growing | Dated |
| Learning curve | Low (web skills) | High (Rust) | Low |
| Production examples | VS Code, Slack, Discord | Growing list | NW.js apps |

## Getting Started

```bash
# Quick start with electron-forge
npm init electron-app@latest my-app
cd my-app
npm start   # Start development

# Or from scratch
mkdir my-electron-app && cd my-electron-app
npm init -y
npm install --save-dev electron
# Create main.js and index.html
npx electron .
```

Electron remains the most pragmatic choice for desktop apps when developer productivity and ecosystem access matter more than bundle size and memory footprint. The VS Code team chose Electron for a reason — the web ecosystem's breadth, combined with Node.js's system access, enables building sophisticated apps faster than any alternative. If binary size is a critical constraint, evaluate Tauri.
