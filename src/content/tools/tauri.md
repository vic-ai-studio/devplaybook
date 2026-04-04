---
title: "Tauri — Build Desktop & Mobile Apps with Web Tech & Rust"
description: "Tauri lets you build desktop apps (and now mobile) using web frontend (any JS framework) with a Rust backend, producing tiny binaries with native OS webview."
category: "Desktop"
pricing: "Open Source"
pricingDetail: "Free and open source. No commercial licensing fees."
website: "https://tauri.app"
github: "https://github.com/tauri-apps/tauri"
tags: ["desktop", "rust", "javascript", "mobile", "cross-platform", "tauri", "webview", "gui"]
pros:
  - "Tiny bundle size — 3-10MB vs Electron's 150MB+ (no bundled Chromium)"
  - "Uses native OS WebView (WebKit on macOS, WebView2 on Windows, WebKitGTK on Linux)"
  - "Rust backend provides memory safety and native performance"
  - "Active development with Tauri 2.0 adding mobile (iOS/Android) support"
  - "Strong security model with fine-grained permission system"
cons:
  - "WebView inconsistencies across operating systems can cause rendering differences"
  - "Rust required for any backend logic — significant learning curve for web developers"
  - "Less mature than Electron — smaller ecosystem and fewer third-party plugins"
  - "Mobile support in Tauri 2.0 is still maturing"
date: "2026-04-02"
---

## What is Tauri?

Tauri is an open-source toolkit for building desktop applications (and now mobile, with Tauri 2.0) using web frontend technologies alongside a Rust backend. The core premise: instead of bundling Chromium with every app (as Electron does), Tauri uses whatever WebView the operating system already provides — WebKit on macOS/Linux, WebView2 on Windows.

The result is applications that are dramatically smaller and leaner than Electron apps, while still letting you build the UI with any web framework (React, Vue, Svelte, SolidJS, etc.).

## Tauri vs Electron: The Size Difference

This is Tauri's headline advantage:

| App | Framework | Bundle Size |
|-----|-----------|------------|
| VS Code | Electron | ~350MB |
| Slack | Electron | ~250MB |
| Typical Tauri app | Tauri | 3-15MB |

Electron bundles its own Chromium (~130MB) and Node.js runtime into every app. Tauri uses the OS WebView (already installed) and a small Rust binary, making the final package 10-30x smaller.

## Architecture: WebView + Rust Core

A Tauri app has two parts:

1. **Frontend (WebView)**: Your web application — React, Vue, Svelte, vanilla HTML/JS/CSS. Runs in a native OS WebView.
2. **Backend (Rust)**: The Tauri core plus your custom Rust functions called "commands." Handles filesystem access, system calls, window management, and anything requiring native OS access.

The two sides communicate via Tauri's IPC (Inter-Process Communication) system:

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! (from Rust)", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```typescript
// Frontend: invoke Rust command from JavaScript
import { invoke } from '@tauri-apps/api/tauri';

const message = await invoke<string>('greet', { name: 'World' });
// → "Hello, World! (from Rust)"
```

## Project Structure

```
my-tauri-app/
├── src/                    # Frontend (web app)
│   ├── main.tsx
│   └── App.tsx
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json
```

## Security Model

Tauri takes security seriously with a capability-based permission system. By default, a Tauri app cannot access the filesystem, network, or system APIs unless explicitly granted:

```json
// tauri.conf.json — grant only specific permissions
{
  "tauri": {
    "allowlist": {
      "fs": {
        "readFile": true,
        "writeFile": true,
        "scope": ["$APPDATA/**"]
      },
      "http": {
        "request": true,
        "scope": ["https://api.myapp.com/**"]
      }
    }
  }
}
```

This is a significant security improvement over Electron, where Node.js integration historically gave the renderer process broad system access.

## Built-in Features

Tauri comes with batteries included:

- **Window management**: Create, resize, minimize, maximize, custom title bars
- **System tray**: Background apps with tray icons
- **Auto-updater**: Built-in update mechanism with signature verification
- **Notifications**: Native OS notification support
- **File dialogs**: Native open/save dialogs
- **Clipboard**: Read/write clipboard
- **Shell**: Execute system commands (with permission)
- **Global shortcuts**: Register OS-level keyboard shortcuts

## Tauri 2.0: Mobile Support

Tauri 2.0 (stable as of 2024) extends the same architecture to iOS and Android. The same Rust backend and web frontend can now target mobile platforms:

```bash
# Add mobile targets
tauri android init
tauri ios init

# Run on mobile
tauri android dev
tauri ios dev
```

Mobile support is newer and has fewer plugins than desktop, but the roadmap is active and the architecture is sound.

## Tauri vs Electron vs NW.js

| Factor | Tauri | Electron | NW.js |
|--------|-------|----------|-------|
| Bundle size | 3-15MB | 150-350MB | 100MB+ |
| Backend language | Rust | Node.js | Node.js |
| WebView | OS native | Bundled Chromium | Bundled Chromium |
| Security model | Capability-based | Less strict | Less strict |
| Memory usage | Low | High | High |
| Ecosystem maturity | Growing | Very mature | Dated |
| Mobile support | Yes (v2.0) | No | No |
| Learning curve | High (Rust) | Low (Node.js) | Low (Node.js) |

## Getting Started

```bash
# Prerequisites: Rust, Node.js, platform build tools

# Create a new Tauri app
npm create tauri-app@latest
# Select your frontend framework (React/Vue/Svelte/etc.)

cd my-tauri-app
npm install
npm run tauri dev    # Start development

npm run tauri build  # Build for production
```

Tauri is the right choice when bundle size matters (enterprise distribution, slow networks), security is paramount, or you want to avoid Chromium's memory footprint. The Rust learning curve is the main barrier — teams without Rust experience should evaluate whether that investment is justified for their project.
