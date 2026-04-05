---
title: "Apache Cordova — Legacy Hybrid Mobile Apps with HTML/CSS/JS"
description: "Apache Cordova builds hybrid mobile apps using HTML, CSS, and JavaScript in a native WebView with plugin access to device APIs across platforms."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Free and open source (Apache Software Foundation). No licensing fees."
website: "https://cordova.apache.org"
github: "https://github.com/apache/cordova-ios"
tags: ["mobile", "hybrid", "javascript", "webview", "apache", "phonegap", "legacy"]
pros:
  - "Build mobile apps with standard HTML, CSS, and JavaScript — no new language required"
  - "Plugin ecosystem for device APIs (Camera, GPS, Contacts, FileSystem)"
  - "Targets iOS and Android from a single web codebase"
  - "Simple mental model for web developers"
  - "Battle-tested over 15+ years in production"
cons:
  - "WebView-based rendering — not truly native, performance ceiling"
  - "Largely superseded by Capacitor (the modern replacement)"
  - "Plugin maintenance is inconsistent — many plugins are unmaintained"
  - "No hot reload or fast refresh during development"
  - "Cordova is effectively in maintenance mode — limited new development"
date: "2026-04-02"
---

## What is Apache Cordova?

Apache Cordova (originally created by Nitobi, then acquired by Adobe as PhoneGap, then open-sourced to Apache) is a hybrid mobile app framework that wraps web applications in a native WebView. Released in 2009, Cordova was the original solution for "write once in web, run on mobile" development — predating React Native (2015), Flutter (2018), and Capacitor (2019) by years.

A Cordova app is essentially a website running inside a full-screen, chrome-free native browser on your phone. Cordova's JavaScript plugin API provides access to device capabilities that a regular browser can't reach: camera, contacts, GPS, accelerometer, file system, push notifications, and more.

## Cordova Architecture

```
+------------------+
|   Your Web App   |  ← HTML/CSS/JavaScript
|  (HTML/CSS/JS)   |
+------------------+
        |
+------------------+
|  Cordova Bridge  |  ← JavaScript → Native plugin call
+------------------+
        |
+------------------+
|  Native Plugins  |  ← Swift/ObjC (iOS), Java/Kotlin (Android)
+------------------+
        |
+------------------+
| Native WebView   |  ← WKWebView (iOS), WebView (Android)
+------------------+
```

The WebView loads your `index.html`, and the Cordova JavaScript library (`cordova.js`) sets up the plugin bridge. When you call `navigator.camera.getPicture()`, Cordova serializes that call, passes it to the native layer, the native plugin executes, and the result comes back to your JavaScript callback.

## Core Plugins

The standard Cordova plugin set covers the most common device APIs:

| Plugin | NPM Package | Functionality |
|--------|-------------|--------------|
| Camera | cordova-plugin-camera | Photo capture and library access |
| Geolocation | cordova-plugin-geolocation | GPS positioning |
| File | cordova-plugin-file | Filesystem read/write |
| Network | cordova-plugin-network-information | Connection type detection |
| Battery | cordova-plugin-battery-status | Battery level/status |
| Device | cordova-plugin-device | Device info (model, platform, UUID) |
| Dialogs | cordova-plugin-dialogs | Native alert/confirm/prompt |
| Vibration | cordova-plugin-vibration | Haptic feedback |

```javascript
// Example: Camera plugin
navigator.camera.getPicture(
    (imageData) => {
        const img = document.getElementById('photo');
        img.src = 'data:image/jpeg;base64,' + imageData;
    },
    (error) => { console.error('Camera error:', error); },
    {
        quality: 80,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: Camera.PictureSourceType.CAMERA
    }
);
```

## Project Structure

```
my-cordova-app/
├── config.xml          # App configuration (id, name, plugins, permissions)
├── www/                # Your web application (HTML/CSS/JS)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── img/
├── platforms/          # Generated native projects (don't edit directly)
│   ├── ios/
│   └── android/
└── plugins/            # Installed Cordova plugins
```

The `www/` folder is your web app. Cordova builds it into native projects in `platforms/`.

## Basic Usage

```bash
# Install Cordova CLI
npm install -g cordova

# Create project
cordova create myApp com.example.myapp "My App"
cd myApp

# Add platforms
cordova platform add ios
cordova platform add android

# Add plugins
cordova plugin add cordova-plugin-camera
cordova plugin add cordova-plugin-geolocation

# Build and run
cordova run ios
cordova run android

# Build for release
cordova build ios --release
cordova build android --release
```

## Migrating from Cordova to Capacitor

Since Capacitor was designed as Cordova's successor by the Ionic team, migration is structured:

```bash
# In your existing Cordova project
npm install @capacitor/core @capacitor/cli
npx cap init [appName] [appId]

# Migrate platforms
npx cap add ios
npx cap add android

# Replace Cordova plugins with Capacitor equivalents
# cordova-plugin-camera → @capacitor/camera
# cordova-plugin-geolocation → @capacitor/geolocation
# cordova-plugin-push → @capacitor/push-notifications
```

Most official Cordova plugins have direct Capacitor equivalents with a similar API surface. The migration usually takes a few days for a medium-sized app.

## Cordova vs Capacitor

| Feature | Cordova | Capacitor |
|---------|---------|-----------|
| Maintenance status | Maintenance mode | Actively developed |
| Native project ownership | Auto-managed | You own ios/ and android/ |
| Plugin installation | `cordova plugin add` | `npm install` + `cap sync` |
| TypeScript support | Added later | First-class |
| PWA support | No | Yes |
| Modern tooling | Dated | Modern (Vite, etc.) |
| Hot reload | No | Yes (with Ionic CLI) |
| Framework preference | Framework-agnostic | Framework-agnostic |

## When Cordova Still Makes Sense

Despite being in maintenance mode, Cordova remains relevant in specific scenarios:

1. **Legacy apps**: Existing Cordova apps in production that work fine and don't need new native features — no migration pressure.

2. **Specialized plugins**: A few niche Cordova plugins have no Capacitor equivalent. If you need one of them, Cordova (or writing a custom Capacitor plugin) may be the only option.

3. **Enterprise tooling**: Some enterprise MDM (Mobile Device Management) systems and corporate build pipelines are still built around Cordova workflows.

4. **Team familiarity**: Teams with deep Cordova expertise maintaining existing apps may find migration cost higher than value for stable, maintained apps.

For any new hybrid mobile project started in 2026, Capacitor is the correct choice. The architecture is modern, the tooling is better, and the Ionic team is actively investing in it. Cordova's 15-year legacy is impressive, but its time as the default choice for new projects has passed.
