---
title: "Ionic Capacitor — Hybrid Mobile Apps with Web Technologies"
description: "Ionic Capacitor bridges web apps to native iOS and Android — use any web framework with full access to native device APIs via a plugin ecosystem."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Free and open source. Capacitor Cloud (advanced features) has paid tiers."
website: "https://capacitorjs.com"
github: "https://github.com/ionic-team/capacitor"
tags: ["mobile", "hybrid", "ionic", "web", "javascript", "ios", "android", "pwa"]
pros:
  - "Use any JS framework — React, Vue, Angular, Svelte, or plain HTML/CSS/JS"
  - "Rich official plugin ecosystem for Camera, Geolocation, Filesystem, Push Notifications"
  - "Web-first development — build and test in the browser, deploy to native"
  - "Progressive Web App (PWA) support alongside native app builds"
  - "Drop-in replacement for Apache Cordova with modern architecture"
cons:
  - "WebView-based — not truly native rendering, has performance ceiling"
  - "Smooth animations and complex gestures harder than with React Native or Flutter"
  - "Community plugin quality varies significantly"
  - "Debugging native issues requires platform-specific knowledge"
date: "2026-04-02"
---

## What is Capacitor?

Capacitor is a cross-platform native runtime created by the Ionic team that enables web applications to run as native iOS and Android apps. Rather than reimplementing native UI in JavaScript, Capacitor takes a different approach: your entire UI runs in a native WebView, and Capacitor provides a plugin bridge to access device capabilities like the camera, GPS, filesystem, and notifications.

Capacitor 3+ is the modern successor to Apache Cordova. It's designed as a web-first tool — you build your app with any web technology, and Capacitor handles the native wrapper.

## Capacitor vs Cordova

Capacitor is frequently described as "Cordova done right." Key improvements over Cordova:

| Feature | Capacitor | Cordova |
|---------|-----------|---------|
| Native project files | You own them | Hidden, auto-managed |
| Plugin installation | npm install + sync | cordova plugin add |
| First-class PWA | Yes | No |
| TypeScript support | First-class | Added later |
| Framework agnostic | Yes | Yes |
| Modern tooling | Yes | Dated |
| Maintenance status | Active | Maintenance mode |

With Capacitor, the `ios/` and `android/` folders are standard Xcode and Android Studio projects that you commit to git. This means you can add any native code directly — no plugin abstraction required.

## Core Plugins

The official `@capacitor` plugins provide type-safe access to device APIs:

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PushNotifications } from '@capacitor/push-notifications';

// Take a photo
const photo = await Camera.getPhoto({
  resultType: CameraResultType.Uri,
  quality: 90,
});

// Get GPS coordinates
const coords = await Geolocation.getCurrentPosition();
console.log(coords.coords.latitude, coords.coords.longitude);

// Write a file
await Filesystem.writeFile({
  path: 'data.json',
  data: JSON.stringify({ key: 'value' }),
  directory: Directory.Documents,
});
```

All official plugins work identically on iOS, Android, and as PWAs (falling back to Web APIs where available).

## Installing and Using Capacitor

```bash
# Add Capacitor to an existing web project
npm install @capacitor/core @capacitor/cli
npx cap init

# Add platforms
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android

# After building your web app:
npx cap sync        # Copies web build + installs plugins
npx cap open ios    # Opens Xcode
npx cap open android # Opens Android Studio
```

The `cap sync` command is the key workflow step — it copies your `dist/` web output into the native projects and installs any Capacitor plugin native code.

## Custom Native Plugins

When the official plugins don't cover your use case, you can write custom native plugins in Swift/Objective-C (iOS) or Java/Kotlin (Android):

```swift
// iOS: MyPlugin.swift
@objc(MyPlugin)
public class MyPlugin: CAPPlugin {
  @objc func echo(_ call: CAPPluginCall) {
    let value = call.getString("value") ?? ""
    call.resolve(["value": value])
  }
}
```

```typescript
// TypeScript usage
import { registerPlugin } from '@capacitor/core';
const MyPlugin = registerPlugin<{ echo(options: { value: string }): Promise<{ value: string }> }>('MyPlugin');
const result = await MyPlugin.echo({ value: 'Hello' });
```

## Ionic + Capacitor Stack

While Capacitor works with any web framework, it pairs especially well with the Ionic Framework — a component library of 100+ mobile-optimized UI components (tabs, modals, action sheets, cards, etc.) that mimic iOS and Android design patterns.

```bash
npm install @ionic/react   # or @ionic/vue / @ionic/angular
```

This combination gives you: Ionic UI components (mobile look and feel) + Capacitor native access (device APIs) + your JS framework (React/Vue/Angular) for app logic.

## Capacitor vs React Native vs Flutter

| Factor | Capacitor | React Native | Flutter |
|--------|-----------|-------------|---------|
| Rendering | WebView | Native widgets | Custom engine |
| Performance | Good (not gaming-level) | Very good | Excellent |
| Web reuse | Maximized | Partial | Minimal |
| Native feel | Depends on CSS | Excellent | Excellent |
| Learning curve | Low (web skills) | Medium | Medium-High |
| PWA support | First-class | No | Limited |
| Team background | Web developers | React developers | Any |

Capacitor shines when your team is web-centric and you want to ship a native app wrapper around an existing (or new) web application with minimal learning curve. For apps that need to feel deeply native or have demanding performance requirements, React Native or Flutter are better choices.
