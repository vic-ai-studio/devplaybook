---
title: "React Native — Cross-Platform Mobile with JavaScript/TypeScript"
description: "React Native lets you build native iOS and Android apps using JavaScript/TypeScript with React. Share up to 90% of code between platforms with access to native APIs."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Free and open source (Meta). You pay for your own API services and any paid Expo EAS tiers."
website: "https://reactnative.dev"
github: "https://github.com/facebook/react-native"
tags: ["mobile", "react", "javascript", "typescript", "ios", "android", "cross-platform"]
pros:
  - "Native performance via JSI/Fabric in the New Architecture — no bridge serialization overhead"
  - "Massive ecosystem — thousands of npm packages and community libraries"
  - "Share up to 90% of code between iOS and Android"
  - "Fast Refresh (hot reload) significantly speeds up iteration"
  - "First-class Expo integration for zero-config setup"
  - "Meta backing with active long-term development and investment"
cons:
  - "Legacy bridge architecture still common in older projects — serialization overhead"
  - "Complex animations can lag behind Flutter's 60fps Impeller engine"
  - "Platform inconsistencies require OS-specific code in some edge cases"
  - "Major version upgrades can be painful with breaking changes"
date: "2026-04-02"
---

## What is React Native?

React Native is an open-source framework developed by Meta (Facebook) that lets you build native iOS and Android mobile applications using JavaScript or TypeScript with the React paradigm. Unlike hybrid frameworks that wrap a WebView, React Native renders actual native UI components — a `<View>` becomes a `UIView` on iOS and an `android.view.View` on Android.

The key value proposition: one codebase, two native apps. Developers who already know React can apply their knowledge directly to mobile development. Business logic, API calls, state management, and most UI code can be shared between iOS and Android, leaving only platform-specific details to diverge.

## Architecture: Legacy Bridge vs New Architecture

### Legacy Architecture (Bridge)

The original React Native architecture communicates between the JavaScript thread and the native thread via an asynchronous JSON serialization bridge. Every call from JS to native (and back) must serialize data to JSON, pass it over the bridge, and deserialize on the other side. This works, but introduces latency — particularly painful for high-frequency interactions like gesture-driven animations.

### New Architecture (JSI + Fabric + TurboModules)

React Native's New Architecture, now the default in RN 0.74+, replaces the bridge with three major components:

- **JSI (JavaScript Interface)**: A C++ layer that lets JavaScript hold direct references to native objects — no serialization required.
- **Fabric**: The new UI rendering system. UI updates happen synchronously on the native thread, enabling 60fps animations that were previously impossible.
- **TurboModules**: Lazy-loaded native modules that are only initialized when first called, improving startup time significantly.

The result is a React Native that can approach near-native performance for most use cases.

## Expo vs Bare Workflow

### Expo Managed Workflow

Expo wraps React Native with a pre-configured toolchain. You get:
- `expo-cli` for local development
- Expo Go app for instant testing on device (no build required)
- EAS Build for cloud-based iOS/Android builds (no Mac required for iOS)
- 60+ pre-built SDK modules (Camera, Location, Notifications, etc.)
- OTA (over-the-air) updates via EAS Update

The managed workflow is ideal for most new projects, especially if you want to avoid Xcode and Android Studio complexity.

### Bare Workflow

The bare workflow gives you full access to the native iOS and Android project files alongside your React Native code. You lose some Expo convenience but gain complete control — useful when you need a native module not available in the Expo SDK or need to customize build configurations.

## Key Libraries

| Category | Library | Notes |
|----------|---------|-------|
| Navigation | React Navigation v6 | Industry standard, Stack/Tab/Drawer |
| UI Components | React Native Paper | Material Design 3 components |
| State Management | Zustand / Redux Toolkit | Zustand for simplicity, RTK for complex state |
| Storage | MMKV | 10x faster than AsyncStorage |
| Images | react-native-fast-image | Better caching than default Image |
| Animations | Reanimated 3 | Runs on UI thread, 60fps guaranteed |
| Forms | React Hook Form | Same library as web React |

## Performance Tips

1. **Use Reanimated 3** for any animation that runs continuously — it executes on the native UI thread, not the JS thread.
2. **Enable Hermes** (enabled by default since RN 0.70) — Meta's JavaScript engine optimized for React Native.
3. **Use FlashList** instead of FlatList for long lists — 10x faster rendering for large datasets.
4. **Memoize aggressively** with `React.memo`, `useMemo`, and `useCallback` — the JS thread is single-threaded.
5. **Enable the New Architecture** — migrate to JSI/Fabric for any performance-critical app.

## When to Choose React Native vs Flutter vs Expo

| Factor | React Native | Flutter | Expo |
|--------|-------------|---------|------|
| Team background | Web/React developers | No existing preference | Fastest startup |
| Performance needs | Good (New Arch) | Excellent (Impeller) | Good |
| Native feel | Excellent (real native) | Good (custom renderer) | Excellent |
| Setup complexity | Medium | Medium | Low |
| Ecosystem size | Very large (npm) | Growing (pub.dev) | Medium |
| OTA updates | Via EAS Update | Limited | First-class |

React Native is the default choice for teams coming from a web/React background. If pixel-perfect custom UI with guaranteed 60fps animations is the priority, Flutter is worth the Dart learning curve. For the fastest possible start with least friction, Expo's managed workflow is unbeatable.

## Getting Started

```bash
# With Expo (recommended)
npx create-expo-app MyApp --template

# Bare React Native
npx @react-native-community/cli init MyApp
```

React Native's combination of a massive ecosystem, familiar React patterns, Expo's managed infrastructure, and the performance gains of the New Architecture make it the most practical choice for most cross-platform mobile projects in 2026.
