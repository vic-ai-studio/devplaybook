---
title: "Building Chrome Extensions with Manifest V3: WXT vs Plasmo 2026"
description: "A complete guide to building browser extensions in 2026. Learn why Manifest V3 matters, compare WXT vs Plasmo vs vanilla JS, and walk through building a real extension with service workers, content scripts, and storage APIs."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["chrome-extension", "manifest-v3", "wxt", "plasmo", "browser-extension", "javascript", "typescript", "web-extension"]
readingTime: "12 min read"
---

Manifest V3 landed as one of the most controversial browser changes in years. Chrome's extension platform overhaul broke thousands of ad blockers, forced developers to rewrite background pages as service workers, and introduced new security constraints that confused nearly everyone.

Two years later, the dust has settled. Manifest V2 extensions are officially dead in Chrome — if you're building a new extension in 2026, MV3 is the only option. And the build tooling has finally caught up: WXT and Plasmo have made MV3 development dramatically less painful.

This guide covers everything you need to build a production-ready browser extension in 2026.

---

## Why Manifest V3 Matters: What Actually Changed

MV3 isn't just a version bump. It changes the fundamental model of how extensions work.

### Background Pages → Service Workers

The biggest breaking change: persistent background pages are gone. In MV2, your background script lived forever — it could maintain in-memory state, hold open WebSocket connections, and respond instantly to events.

Service workers terminate when idle (typically 30 seconds in Chrome). This means:

- **No persistent state** — you can't rely on a global `let myCache = {}` surviving between events
- **No long-running operations** — a 5-minute API poll loop will get killed
- **Async-first** — every interaction must handle the service worker potentially being asleep

The workaround: persist everything to `chrome.storage` or use `chrome.alarms` for periodic tasks.

### Declarative Net Request vs webRequest

The rule that broke ad blockers: MV3 replaced the `webRequest` blocking API (which could intercept and modify requests) with `declarativeNetRequest` — a declarative ruleset approach where you define rules ahead of time and the browser applies them.

For most extensions (password managers, dev tools, productivity apps), this change is irrelevant. For extensions that do dynamic network manipulation, you need to design your rules statically.

### Content Security Policy Changes

MV3 bans remotely-hosted code. You can't dynamically `eval()` scripts or load code from a CDN at runtime. Everything must be bundled with your extension. This pushes you toward proper build tooling — which is partly why WXT and Plasmo exist.

---

## Choosing Your Build Tool: WXT vs Plasmo vs Vanilla

| Feature | WXT | Plasmo | Vanilla JS |
|---------|-----|--------|------------|
| TypeScript first | ✅ | ✅ | Manual |
| Cross-browser support | ✅ Chrome, Firefox, Safari, Edge | ✅ Chrome, Firefox, Edge | Manual |
| HMR dev mode | ✅ | ✅ | ❌ |
| React/Vue/Svelte | ✅ Any framework | ✅ React first | Manual |
| File-based routing | ✅ | ✅ | ❌ |
| Auto manifest gen | ✅ | ✅ | ❌ |
| Plasmo storage SDK | ❌ | ✅ | ❌ |
| Learning curve | Low | Low | Medium |
| Community size | Growing | Large | N/A |
| Bundle size | Configurable | Larger (React) | Smallest |

**Choose WXT** if you want framework flexibility (Vue, Svelte, or React all work), a clean file-based structure, and first-class Firefox support. WXT feels more like a standard web dev workflow.

**Choose Plasmo** if you're React-heavy and want their ecosystem — messaging SDK, storage SDK, and CS UI component injection helpers. Plasmo has more batteries included.

**Choose vanilla** only if bundle size is critical (browser extension size limits are generous, so rarely needed) or you're building something trivially simple.

For this guide, we'll use WXT — it's the most actively developed in 2026 and produces the cleanest output.

---

## Setting Up a WXT Project

```bash
pnpm create wxt@latest my-extension
cd my-extension
pnpm install
```

During setup, select:
- Framework: Vue / React / Svelte (or vanilla)
- TypeScript: Yes
- Package manager: Your preference

The generated structure:

```
my-extension/
├── entrypoints/
│   ├── background.ts          # Service worker
│   ├── content.ts             # Content script
│   ├── popup/
│   │   ├── index.html
│   │   └── App.tsx
│   └── options/
│       ├── index.html
│       └── App.tsx
├── public/
│   └── icon-128.png
├── wxt.config.ts
└── package.json
```

WXT generates `manifest.json` automatically from your entrypoints and `wxt.config.ts`. No manual manifest maintenance.

Start the dev server:

```bash
pnpm dev
```

WXT opens Chrome with your extension loaded, with Hot Module Replacement. Edit a content script and it reloads automatically — a massive improvement over the manual extension reload cycle.

---

## Key Concept: Service Workers

Your `entrypoints/background.ts` is a service worker. Treat it accordingly.

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  // This runs when the service worker starts
  console.log('Extension loaded', browser.runtime.id);

  // Listen for installation
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      // Set defaults on first install
      browser.storage.local.set({
        enabled: true,
        count: 0,
      });
    }
  });

  // Handle messages from content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_COUNT') {
      browser.storage.local.get('count').then(({ count }) => {
        sendResponse({ count });
      });
      return true; // Keep channel open for async response
    }
  });
});
```

Key service worker rules:
1. **Don't trust in-memory state** — save everything to `chrome.storage`
2. **Return `true`** from `onMessage` listeners if you respond asynchronously
3. **Use `chrome.alarms`** for periodic work, not `setInterval`

---

## Key Concept: Content Scripts

Content scripts run in the context of web pages. They can read and modify the DOM, but they run in an isolated JavaScript sandbox (they can't access page JavaScript variables directly).

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['https://*.github.com/*'],
  main() {
    console.log('Content script running on GitHub');

    // Inject UI into the page
    const button = document.createElement('button');
    button.textContent = 'Extension Action';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      padding: 8px 16px;
      background: #0969da;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;

    button.addEventListener('click', async () => {
      // Send message to background service worker
      const response = await browser.runtime.sendMessage({ type: 'GET_COUNT' });
      console.log('Count:', response.count);
    });

    document.body.appendChild(button);
  },
});
```

The `matches` array uses [match patterns](https://developer.chrome.com/docs/extensions/mv3/match_patterns/) — WXT uses this to generate the correct manifest entry.

---

## Storage, Messaging, and Permissions

### Storage

MV3 has two storage areas: `local` (device-only) and `sync` (syncs across devices via Chrome Sync, 100KB limit).

```typescript
// Write
await browser.storage.local.set({ key: 'value', settings: { theme: 'dark' } });

// Read single key
const { key } = await browser.storage.local.get('key');

// Read multiple
const { key, settings } = await browser.storage.local.get(['key', 'settings']);

// Listen for changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    console.log('Settings changed:', changes.settings.newValue);
  }
});
```

### Messaging

Three messaging patterns in MV3:

**One-time message (content script → background):**
```typescript
// Sender
const response = await browser.runtime.sendMessage({ type: 'ACTION', data: 'hello' });

// Receiver (background)
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ACTION') {
    sendResponse({ result: 'done' });
  }
});
```

**Background → specific content script tab:**
```typescript
// Get the active tab and send a message to its content script
const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
await browser.tabs.sendMessage(tab.id!, { type: 'UPDATE_UI' });
```

**Long-lived port (for streaming/persistent communication):**
```typescript
// Content script
const port = browser.runtime.connect({ name: 'stream' });
port.onMessage.addListener((msg) => console.log(msg));
port.postMessage({ type: 'START' });

// Background
browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if (msg.type === 'START') {
      port.postMessage({ data: 'streaming...' });
    }
  });
});
```

### Permissions

Declare permissions in `wxt.config.ts`:

```typescript
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    permissions: ['storage', 'alarms', 'tabs'],
    host_permissions: ['https://api.example.com/*'],
    optional_permissions: ['history'], // Request at runtime
  },
});
```

Request optional permissions at runtime (better for user trust):

```typescript
const granted = await browser.permissions.request({
  permissions: ['history'],
});
```

---

## Building a Practical Tool Extension

Let's build a **Page Word Counter** — it shows a badge with the word count of the current page and displays stats in a popup.

**Background service worker** — update the badge:

```typescript
// entrypoints/background.ts
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'UPDATE_BADGE') {
      const count = msg.count;
      const label = count > 999 ? `${Math.floor(count / 1000)}k` : String(count);
      browser.action.setBadgeText({ text: label, tabId: msg.tabId });
      browser.action.setBadgeBackgroundColor({ color: '#0969da', tabId: msg.tabId });
    }
  });
});
```

**Content script** — count words and report:

```typescript
// entrypoints/content.ts
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    function countWords() {
      const text = document.body.innerText || '';
      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
      return words.length;
    }

    async function reportCount() {
      const count = countWords();
      const [tab] = await browser.tabs.getCurrent();
      browser.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        count,
        tabId: tab?.id,
      });
      // Also save to storage for the popup
      await browser.storage.local.set({ [`wordcount_${location.href}`]: count });
    }

    // Run on load and after navigation
    reportCount();
    const observer = new MutationObserver(() => reportCount());
    observer.observe(document.body, { childList: true, subtree: true });
  },
});
```

**Popup** — display stats:

```typescript
// entrypoints/popup/App.tsx
import { useEffect, useState } from 'react';

export default function App() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab.url) {
        browser.storage.local.get(`wordcount_${tab.url}`).then((result) => {
          setCount(result[`wordcount_${tab.url}`] ?? 0);
        });
      }
    });
  }, []);

  return (
    <div style={{ padding: '16px', minWidth: '200px' }}>
      <h2 style={{ margin: '0 0 8px' }}>Word Counter</h2>
      {count === null ? (
        <p>Loading...</p>
      ) : (
        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>{count.toLocaleString()}</p>
      )}
      <p style={{ color: '#666', fontSize: '0.85rem' }}>words on this page</p>
    </div>
  );
}
```

Build it:

```bash
pnpm build
```

WXT outputs to `.output/chrome-mv3/` — this is your packaged extension.

---

## Publishing to Chrome Web Store + Firefox Add-ons

### Chrome Web Store

1. Build with `pnpm build`
2. Zip the `.output/chrome-mv3/` directory
3. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
4. Pay the one-time $5 developer fee
5. Upload the zip, fill in store listing (screenshots required: 1280×800 or 640×400)
6. Submit for review — typically 1-3 business days

WXT has a built-in zip command:
```bash
pnpm zip  # Creates .output/my-extension-1.0.0-chrome.zip
```

### Firefox Add-ons

WXT's Firefox output (`pnpm build --browser firefox`) generates MV2-compatible output (Firefox supports both MV2 and MV3 but handles MV2 better for now).

```bash
pnpm build --browser firefox
pnpm zip --browser firefox
```

Submit at [addons.mozilla.org](https://addons.mozilla.org/developers/). Firefox requires source code submission for review — WXT generates a source zip automatically:

```bash
pnpm zip:sources
```

### Safari

Safari extensions use Xcode. WXT can generate a Safari-compatible build, but you'll need a Mac and an Apple Developer account ($99/year).

---

## 2026 Tips for MV3 in Production

**Handle service worker wake-up time.** If a user hasn't interacted with your extension in a while, the service worker may take 100-300ms to start. For user-facing actions, this is usually fine. For time-sensitive operations, consider using `chrome.alarms` to keep state fresh.

**Use `chrome.storage.session`** (new in Chrome 102) for data that should persist across service worker restarts within a session but not across browser restarts. It's faster than `local` and doesn't persist to disk.

**Side panel API** (Chrome 114+) — WXT supports side panels as a new entrypoint type. Great for extensions that need persistent UI without blocking the tab.

**Offscreen documents** — need to play audio, parse HTML, or use canvas APIs? MV3 introduced offscreen documents as a workaround for service worker limitations:

```typescript
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
  justification: 'Playing notification sound',
});
```

---

## What to Build

The MV3 ecosystem is still young, which means opportunity. High-value extension categories in 2026:

- **AI integration** — inject AI assistants into any web app (many LLM APIs now have CORS headers)
- **Dev tools** — request inspectors, localStorage managers, framework debuggers
- **Productivity** — tab managers, focus tools, reading time estimators
- **Accessibility** — font size overrides, contrast adjusters, screen reader helpers

The Chrome Web Store has 180,000+ extensions, but most are outdated MV2 builds. An actively maintained MV3 alternative to any popular extension is a real opportunity.

---

## Summary

Manifest V3 is a fundamentally different mental model from MV2 — service workers instead of persistent background pages, declarative network rules instead of blocking APIs, bundled code instead of remote scripts. The constraints are tighter, but the security model is better.

WXT and Plasmo have made MV3 approachable. You get TypeScript, HMR, automatic manifest generation, and cross-browser builds out of the box. Pick WXT for flexibility, Plasmo for a React-focused batteries-included experience.

The stack for a production extension in 2026: **WXT + TypeScript + React/Vue + chrome.storage + proper permission scoping**. Build it once, ship to Chrome, Firefox, and Edge from a single codebase.
