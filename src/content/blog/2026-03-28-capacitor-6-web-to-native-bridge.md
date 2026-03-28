---
title: "Capacitor 6: Web-to-Native Bridge for Modern Web Apps"
description: "Capacitor 6 lets you build native iOS and Android apps from web code. Learn about the plugin API, native bridge architecture, VS Code extension, and when to choose Capacitor over React Native or Flutter."
date: "2026-03-28"
tags: [capacitor, ionic, mobile, pwa, web, javascript, ios, android]
readingTime: "9 min read"
author: "DevPlaybook Team"
---

# Capacitor 6: Web-to-Native Bridge for Modern Web Apps

Capacitor 6 is the runtime that turns web apps into native iOS and Android apps. Built by the Ionic team as a spiritual successor to Cordova, Capacitor lets you write your app in any modern web framework — React, Angular, Vue, Svelte, or plain JavaScript — and deploy it to the App Store and Google Play with access to native device APIs.

This guide covers Capacitor 6's architecture, the native bridge, plugin system, and the practical trade-offs of choosing Capacitor over React Native or Flutter.

## What Capacitor Is (and Isn't)

Capacitor is a native runtime, not a UI framework. This distinction matters:

**What Capacitor does:**
- Embeds your web app in a native WebView (`WKWebView` on iOS, `WebView` on Android)
- Provides a JavaScript API to call native device features (camera, GPS, filesystem, etc.)
- Handles app lifecycle, permissions, and native navigation chrome
- Enables publishing to App Store and Google Play

**What Capacitor doesn't do:**
- Replace your UI framework (use React, Vue, Angular, or whatever you prefer)
- Compile JavaScript to native code (it runs in a WebView)
- Match native app performance for graphics-intensive applications

The result is a web app that runs in a WebView, with the ability to call native APIs via a bridge layer. Modern WebViews are fast enough for most app use cases, and Capacitor's bridge adds minimal overhead for native calls.

## Architecture

Capacitor's architecture is straightforward:

```
┌─────────────────────────────────┐
│         Your Web App            │
│   (React / Angular / Vue / etc) │
├─────────────────────────────────┤
│       Capacitor Runtime         │
│   JavaScript Bridge API         │
├─────────────────────────────────┤
│    Native WebView Container     │
│    WKWebView / Android WebView  │
├─────────┬───────────────────────┤
│   iOS   │       Android         │
│  Swift  │       Kotlin          │
│ Plugins │      Plugins          │
└─────────┴───────────────────────┘
```

The bridge works via a message-passing protocol. When your JavaScript calls `Camera.getPhoto()`, Capacitor serializes the call to a JSON message, passes it to the native layer, executes the native code, and returns the result.

### Capacitor 6 Bridge Improvements

Capacitor 6 significantly improves bridge performance over previous versions:

**Serialization**: The message format switched from a text-based protocol to a binary protocol for large data (images, audio, files). Photo capture that previously required base64 encoding the entire image now uses direct memory references, reducing memory usage by 60-70% for media-heavy operations.

**Async queue**: Bridge calls are now queued on a dedicated thread rather than the main thread, preventing UI jank during native operations.

**Promise resolution**: Bridge promises resolve in the same microtask queue as JavaScript Promises, eliminating the frame delay that caused subtle timing issues in previous versions.

## Setting Up Capacitor 6

Add Capacitor to any existing web project:

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize with your app details
npx cap init "My App" "com.example.myapp"

# Add platforms
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

Your `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.myapp',
  appName: 'My App',
  webDir: 'dist', // Your build output directory
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    Camera: {
      permissionType: 'prompt',
    },
  },
};

export default config;
```

Build and sync your web app to native:

```bash
# Build your web app
npm run build

# Sync web assets to native projects
npx cap sync
```

Open in Xcode or Android Studio:

```bash
npx cap open ios
npx cap open android
```

## The Plugin API

Capacitor's plugin system is how you access native features. The team maintains a set of official plugins, and a large ecosystem of community plugins exists for everything else.

### Official Plugins

```bash
npm install @capacitor/camera @capacitor/geolocation @capacitor/filesystem @capacitor/push-notifications
```

Using the Camera plugin:

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function takePhoto() {
  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
  });

  // photo.webPath is a URL usable in web contexts
  const imageElement = document.querySelector('#preview') as HTMLImageElement;
  imageElement.src = photo.webPath ?? '';
}
```

Geolocation:

```typescript
import { Geolocation } from '@capacitor/geolocation';

async function getCurrentPosition() {
  const coordinates = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  });

  console.log(`Lat: ${coordinates.coords.latitude}`);
  console.log(`Lng: ${coordinates.coords.longitude}`);
}
```

Push Notifications:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

async function registerForPush() {
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value);
    // Send token to your server
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notification received:', notification);
  });
}
```

### Writing Custom Plugins

When you need native functionality beyond the official plugins:

```bash
npm install @capacitor/plugin-template
npx cap plugin:generate
```

iOS plugin (Swift):

```swift
import Foundation
import Capacitor

@objc(MyPlugin)
public class MyPlugin: CAPPlugin {

  @objc func getValue(_ call: CAPPluginCall) {
    let deviceName = UIDevice.current.name
    call.resolve([
      "value": deviceName
    ])
  }

  @objc func doAsyncWork(_ call: CAPPluginCall) {
    DispatchQueue.global(qos: .background).async {
      // Expensive work
      let result = // ...
      call.resolve(["result": result])
    }
  }
}
```

Android plugin (Kotlin):

```kotlin
package com.example.myplugin

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MyPlugin")
class MyPlugin : Plugin() {

  @PluginMethod
  fun getValue(call: PluginCall) {
    val deviceName = android.os.Build.MODEL
    call.resolve(JSObject().put("value", deviceName))
  }

  @PluginMethod
  fun doAsyncWork(call: PluginCall) {
    PluginCall.keepAlive(call)
    Thread {
      val result = // ... expensive work
      call.resolve(JSObject().put("result", result))
    }.start()
  }
}
```

JavaScript usage:

```typescript
import { registerPlugin } from '@capacitor/core';

interface MyPluginInterface {
  getValue(): Promise<{ value: string }>;
  doAsyncWork(): Promise<{ result: string }>;
}

const MyPlugin = registerPlugin<MyPluginInterface>('MyPlugin');

const { value } = await MyPlugin.getValue();
```

## Live Reload During Development

Capacitor 6 supports live reload, refreshing your native app when you save web files:

```bash
# Start your dev server (example with Vite)
npm run dev

# In capacitor.config.ts, set the server URL
const config: CapacitorConfig = {
  // ...
  server: {
    url: 'http://192.168.1.100:5173', // Your machine's IP
    cleartext: true,
  },
};

# Sync and open
npx cap sync
npx cap open ios
```

Changes to your web code now reflect immediately in the native app — no need to rebuild and reinstall.

## VS Code Extension

Capacitor 6 ships with an official VS Code extension that adds:

- **Native project panel**: View and manage iOS/Android projects from VS Code
- **One-click build and run**: Build and launch on device/simulator from the editor
- **Plugin inspector**: See which plugins are installed and their versions
- **Diagnostics**: Flag common configuration issues

```bash
# Install from VS Code Marketplace
# Search: "Ionic" or install ID: ionic.ionic
```

The extension replaces much of the Xcode/Android Studio usage for common tasks — useful if you prefer staying in VS Code.

## Capacitor vs Cordova

Capacitor is designed as a Cordova replacement. Key differences:

| Feature | Capacitor 6 | Cordova |
|---------|------------|---------|
| Native project ownership | You own iOS/Android projects | Generated, not meant to edit |
| Plugin architecture | Native plugins (Swift/Kotlin) | JavaScript + native bridge |
| CLI tool | Minimal, uses native CLIs | Heavy abstraction |
| TypeScript support | First-class | Afterthought |
| Performance | Modern WebView optimization | Legacy compatibility |
| Maintenance | Active (Ionic) | Declining |

Capacitor gives you a native Xcode project and Android Studio project that you own and can modify. Cordova generated these and discouraged touching them. This matters for advanced native integrations — in Capacitor you just open Xcode and write Swift.

## When to Choose Capacitor

Capacitor makes sense when:

**You have an existing web app**: If you've built a React or Angular web app and want to publish to the app stores without rebuilding the UI, Capacitor is the lowest-friction path. Your existing code, CSS, and JavaScript run largely unchanged.

**Web is the primary target**: For apps where web is the primary target and mobile is secondary, Capacitor lets you maintain a single codebase with mobile as an add-on.

**Fast time-to-market**: For MVPs or internal tools, Capacitor's minimal setup gets you to the app store faster than rebuilding with React Native or Flutter.

**Web developer teams**: Teams without native mobile expertise can ship mobile apps using their existing web skills.

**PWA + native hybrid**: Capacitor shares code with Progressive Web App deployments. The same codebase can target iOS, Android, and the web browser.

## When to Choose React Native or Flutter Instead

Capacitor isn't the right choice for:

**Performance-critical apps**: Games, AR, video processing, or any app requiring consistent 60fps with complex interactions. WebViews can't match native rendering performance for these use cases.

**Native-feeling UI**: WebView-based apps can feel slightly "webby" — scrolling physics, transitions, and text rendering differ subtly from native apps. For consumer apps where feel matters, React Native or Flutter deliver a more native experience.

**Complex animations**: CSS animations in a WebView are fast for simple cases, but complex multi-element animations with physics require React Native's `Animated` API or Flutter's animation system for smooth 60fps performance.

**Offline-first apps**: React Native and Flutter handle offline scenarios more reliably. WebView-based apps depend on web caching strategies that are more fragile.

## Performance in Practice

For most business apps — forms, lists, dashboards, content — Capacitor's WebView performance is entirely adequate:

| Scenario | Capacitor Performance |
|----------|----------------------|
| Form-heavy UI | Excellent |
| List scrolling (< 1000 items) | Good |
| Data visualization (D3, Chart.js) | Good |
| Video playback | Good (uses native player) |
| Camera/photo | Good |
| Maps | Good (native plugin) |
| Complex animations | Acceptable |
| 60fps games | Poor |

The gap between WebView and native has narrowed significantly with modern Chrome-based WebViews (Android) and WKWebView (iOS). Apps built with performant frameworks like Svelte or Solid run impressively fast.

## Ecosystem

The Capacitor ecosystem has grown substantially:

- **300+ community plugins** for everything from NFC to Bluetooth to Face ID
- **Ionic Framework** (optional): Ionic 8 provides mobile-optimized UI components that match iOS and Android design conventions
- **CapacitorJS** ecosystem separate from Ionic — Capacitor works with any web framework
- **Appflow**: Ionic's CI/CD and OTA update platform for Capacitor apps

## Conclusion

Capacitor 6 is the best option for web developers who need to ship to mobile app stores without abandoning their web stack. The bridge performance improvements in version 6, combined with the official VS Code extension and VS Code-native workflow, make the development experience better than ever.

Choose Capacitor when you're a web team shipping to mobile, when you have existing web code to leverage, or when you need a single codebase spanning web and mobile without the overhead of learning React Native or Dart. Choose React Native or Flutter when native performance and feel are non-negotiable requirements.
