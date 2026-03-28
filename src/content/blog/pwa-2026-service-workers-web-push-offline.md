---
title: "PWA in 2026: Service Workers, Web Push & Offline-First"
description: "Build Progressive Web Apps in 2026: service workers, Web Push API, Background Sync, offline-first strategies with Workbox, install prompt, app manifest, and iOS/Android compatibility."
date: "2026-03-28"
tags: [pwa, service-workers, web-push, offline, javascript]
readingTime: "14 min read"
---

Progressive Web Apps have matured dramatically. In 2026, PWAs are no longer a compromise between native and web — they are a legitimate distribution strategy for apps that need offline capability, push notifications, and a native-like install experience across every platform. This guide walks through everything you need: service worker lifecycle, caching strategies, Workbox 7, Web Push with VAPID, Background Sync, and the Web App Manifest.

## Why PWAs Matter in 2026

The browser vendor landscape has converged. Chrome, Edge, and Firefox have shipped robust PWA support for years. Safari on iOS has closed most of the historical gaps — Web Push landed in iOS 16.4, and installation via "Add to Home Screen" has become a first-class workflow. Android WebAPK packaging means installed PWAs on Android are indistinguishable from Play Store apps at the OS level.

For developers, this means one codebase that reaches web, desktop (via Chrome/Edge), Android, and iOS with push notifications, offline support, and app-store-like presence on the home screen.

## Service Worker Lifecycle

The service worker is a JavaScript file that runs in a background thread, separate from your page's main thread. It acts as a programmable network proxy and manages caching, background sync, and push events.

### Registration

Register the service worker from your main application code:

```javascript
// main.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('SW registered:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — prompt user to refresh
            showUpdateNotification();
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}
```

### Install Event

During installation, the service worker pre-caches critical assets. This is your app shell — the minimum resources needed to render the UI offline.

```javascript
// sw.js
const CACHE_NAME = 'app-shell-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/icons/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );

  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});
```

### Activate Event

The activate event fires when the new service worker takes control. Use it to clean up old caches:

```javascript
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, 'runtime-cache-v1'];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});
```

### Fetch Event

The fetch event intercepts every network request made by pages under the service worker's scope. This is where caching strategies live.

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(handleFetch(request));
});
```

## Caching Strategies

Choosing the right strategy for each resource type is the core skill of PWA development.

### Cache-First

Best for versioned static assets (JS bundles with hashes, images, fonts). Serve from cache, fall back to network only on miss.

```javascript
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open('static-assets-v1');
  cache.put(request, response.clone());
  return response;
}
```

### Network-First

Best for HTML pages and API responses where freshness matters. Try the network first; fall back to cache on failure.

```javascript
async function networkFirst(request) {
  const cache = await caches.open('api-cache-v1');

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Return offline fallback page
    return caches.match('/offline.html');
  }
}
```

### Stale-While-Revalidate

Best for resources where speed matters more than absolute freshness — avatars, non-critical API data, article content. Serve the cached version immediately while updating the cache in the background.

```javascript
async function staleWhileRevalidate(request) {
  const cache = await caches.open('runtime-cache-v1');
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });

  return cached || fetchPromise;
}
```

## Workbox 7 Setup

Writing service workers by hand gets complex fast. Workbox is Google's library for service worker management. Version 7 ships as ESM modules and integrates cleanly with Vite, webpack, and Rollup.

### Install

```bash
npm install workbox-core workbox-routing workbox-strategies workbox-precaching workbox-background-sync
```

### Vite Integration with vite-plugin-pwa

The easiest path for Vite projects:

```bash
npm install -D vite-plugin-pwa
```

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.yourapp\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Your App Name',
        short_name: 'YourApp',
        theme_color: '#1a1a2e',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});
```

### Manual Workbox Service Worker

For more control, write the service worker directly using Workbox modules:

```javascript
// sw.js (with Workbox)
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache assets injected by build tool
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API routes: network-first with background sync fallback
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60 // 24 hours in minutes
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-responses',
    plugins: [
      bgSyncPlugin,
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 3600 })
    ]
  })
);

// Images: cache-first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 86400 * 30 })]
  })
);

// Google Fonts: stale-while-revalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);
```

## Web App Manifest

The manifest.json file tells the browser how to present your app when installed.

```json
{
  "name": "DevPlaybook",
  "short_name": "DevPlaybook",
  "description": "Developer tools, articles, and references",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1a1a2e",
  "background_color": "#ffffff",
  "lang": "en",
  "scope": "/",
  "icons": [
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Open Tools",
      "short_name": "Tools",
      "description": "Browse developer tools",
      "url": "/tools?source=pwa-shortcut",
      "icons": [{ "src": "/icons/shortcut-tools.png", "sizes": "96x96" }]
    },
    {
      "name": "Read Articles",
      "short_name": "Articles",
      "url": "/blog?source=pwa-shortcut",
      "icons": [{ "src": "/icons/shortcut-blog.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Desktop view"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Mobile view"
    }
  ]
}
```

The `display` field controls the chrome around your app. Use `standalone` for most apps (no browser UI), `minimal-ui` to keep a back button, or `fullscreen` for games. The `maskable` icon purpose is critical for Android — it allows the OS to apply adaptive icon shapes without white boxes.

## Install Prompt (beforeinstallprompt)

The `beforeinstallprompt` event fires when Chrome determines your PWA is installable. Capture it and show your own install UI rather than relying on the browser's default banner.

```javascript
// install-prompt.js
let deferredPrompt = null;
const installButton = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (event) => {
  // Prevent the default mini-infobar on mobile Chrome
  event.preventDefault();
  deferredPrompt = event;

  // Show your custom install button
  installButton.style.display = 'flex';
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log(`Install outcome: ${outcome}`); // 'accepted' or 'dismissed'

  deferredPrompt = null;
  installButton.style.display = 'none';
});

// Hide button if app is already installed
window.addEventListener('appinstalled', () => {
  installButton.style.display = 'none';
  deferredPrompt = null;
  console.log('PWA installed');
});

// Check if running as installed PWA
function isInstalledPWA() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS
}
```

## Web Push API with VAPID

Web Push lets your server send notifications to users even when your app is not open. VAPID (Voluntary Application Server Identification) is the authentication standard — you generate a key pair, keep the private key on your server, and send the public key to the browser.

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U
Private Key: UUxI4O8-HoKXBjgkqKOgNAjhk_LqMZQNsB1aGD9w5vg
```

Store these as environment variables. Never expose the private key.

### Client-Side: Subscribe to Push

```javascript
// push-client.js
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9...';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  // Check existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  // Send subscription to your server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });

  return subscription;
}

async function requestPushPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    await subscribeToPush();
  }
}
```

### Service Worker: Handle Push Events

```javascript
// sw.js — push event handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    image: data.image,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open', title: 'Open App', icon: '/icons/action-open.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/action-close.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

### Server-Side: Send Push Notifications

```javascript
// server/push.js (Node.js)
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:you@yourapp.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store subscriptions in your database
const subscriptions = new Map(); // In production: use a real DB

export async function saveSubscription(subscription) {
  subscriptions.set(subscription.endpoint, subscription);
}

export async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        image: payload.image
      })
    );
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription has expired — remove it
      subscriptions.delete(subscription.endpoint);
    } else {
      throw error;
    }
  }
}

export async function broadcastNotification(payload) {
  const promises = [...subscriptions.values()].map((sub) =>
    sendPushNotification(sub, payload)
  );
  await Promise.allSettled(promises);
}
```

## Background Sync API

Background Sync allows your app to defer work until the user has a stable connection. This is ideal for form submissions, data uploads, and analytics that should not be lost if the user goes offline mid-action.

```javascript
// Trigger background sync when going offline
async function submitFormWithSync(formData) {
  // Store the data in IndexedDB first
  await saveToIndexedDB('pending-submissions', formData);

  const registration = await navigator.serviceWorker.ready;

  try {
    await registration.sync.register('submit-form');
    console.log('Background sync registered');
  } catch {
    // Background sync not supported — try directly
    await submitDirectly(formData);
  }
}
```

```javascript
// sw.js — sync event handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-form') {
    event.waitUntil(processPendingSubmissions());
  }
});

async function processPendingSubmissions() {
  const db = await openIndexedDB();
  const pending = await db.getAll('pending-submissions');

  for (const submission of pending) {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });

      if (response.ok) {
        await db.delete('pending-submissions', submission.id);
      }
    } catch (error) {
      // Will retry on next sync event
      console.error('Sync failed for submission:', submission.id);
      throw error; // Re-throw to tell the browser to retry
    }
  }
}
```

Workbox's `BackgroundSyncPlugin` handles most of this boilerplate automatically when attached to a strategy's plugin array, replaying failed requests from an IndexedDB queue.

## iOS PWA: What Works and What Does Not

iOS has historically been the problematic platform for PWAs. Here is the current state in 2026:

**What works on iOS (16.4+):**
- Web Push Notifications (requires user gesture to request permission)
- Add to Home Screen with standalone display mode
- Service workers and offline caching
- Background Fetch (limited)
- Web Share API
- Badging API

**Remaining iOS limitations:**
- No `beforeinstallprompt` event — you must provide your own "Add to Home Screen" instructions with a custom UI
- Push notifications only work from installed PWAs (not from Safari browser tabs)
- Periodic Background Sync is not supported
- Push subscriptions are lost when the app is deleted and reinstalled
- No WebAPK — iOS does not package PWAs as native app containers

**iOS Install Detection and Prompt:**

```javascript
function showIOSInstallInstructions() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;

  if (isIOS && !isStandalone) {
    // Show custom "Tap Share, then Add to Home Screen" UI
    document.getElementById('ios-install-banner').style.display = 'flex';
  }
}
```

On Android, installed PWAs via Chrome receive full WebAPK packaging — the app appears in the app drawer, has its own task entry, and integrates with Android sharing. The experience is genuinely native.

## Testing PWAs in DevTools

Chrome DevTools has a dedicated Application panel for PWA debugging.

**Service Worker Panel:**
- See registered workers, their state (installing/waiting/active), and scope
- "Update on reload" forces a new service worker on every page load — essential during development
- "Bypass for network" skips the service worker entirely to test without caching
- Manually trigger push events and sync events without a real server

**Cache Storage:**
- Inspect every cache by name and see its contents
- Right-click to delete individual entries or entire caches
- Track cache size growth over time

**Manifest Panel:**
- Validates your manifest.json for errors
- Shows icon previews for different sizes
- Displays installability criteria and any reasons the browser will not show the install prompt

**Lighthouse PWA Audit:**

Run Lighthouse in DevTools (or via CLI) to get a PWA score. It checks:
- HTTPS (mandatory)
- Service worker registered with fetch handler
- Web App Manifest with required fields
- Icons in correct sizes
- Offline fallback page returns a valid 200 response
- Viewport meta tag present
- Page loads fast enough on slow 3G

```bash
# CLI audit
npx lighthouse https://yourapp.com --only-categories=pwa --output=html
```

**Simulating Offline:**

In DevTools Network tab, set "Throttling" to "Offline" to test your offline fallback. Combine with clearing site data (Application > Storage > Clear site data) to simulate a first-time offline visit.

## Putting It All Together

A production-ready PWA in 2026 combines all these pieces:

1. **Manifest** — correct icons, display mode, shortcuts, and screenshots for app store-quality install experience
2. **Service worker** — Workbox-managed precaching for app shell, runtime caching per resource type
3. **Offline fallback** — a cached `/offline.html` served when network requests fail for navigation
4. **Web Push** — VAPID-authenticated subscriptions stored in your database, notifications handled in the service worker
5. **Background Sync** — queue failed mutations in IndexedDB, replay when connectivity returns
6. **Install prompt** — custom UI for both Android (`beforeinstallprompt`) and iOS (manual instructions)
7. **Update flow** — detect new service worker versions and prompt users to refresh rather than silently forcing updates

The combination delivers an app that works on a subway with no signal, sends timely notifications, and installs from any browser without an app store — at zero distribution overhead. In 2026, there is no good reason to ship a web app that does not check these boxes.
