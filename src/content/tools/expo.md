---
title: "Expo — The Easiest Way to Build React Native Apps"
description: "Expo is the managed React Native platform providing a toolchain (Expo CLI, EAS Build, EAS Submit), SDK of pre-built modules, and OTA updates for iOS and Android."
category: "Mobile"
pricing: "Freemium"
pricingDetail: "Expo SDK and CLI are free. EAS Build has a free tier (30 builds/month) then paid plans from $29/month."
website: "https://expo.dev"
github: "https://github.com/expo/expo"
tags: ["react-native", "mobile", "javascript", "expo", "eas", "ios", "android"]
pros:
  - "Zero native toolchain setup — build iOS apps without a Mac using EAS Build"
  - "EAS Build for cloud-based iOS and Android builds with CI/CD integration"
  - "OTA updates via EAS Update — push JS changes without App Store review"
  - "Expo SDK provides 60+ pre-built modules (Camera, Location, Notifications, etc.)"
  - "Expo Snack for instant browser-based prototyping and sharing"
  - "expo-router for file-based routing (same paradigm as Next.js)"
cons:
  - "EAS Build paid tiers add cost for high-volume teams"
  - "Managed workflow limits access to custom native code without ejecting"
  - "Larger app bundle than a hand-optimized bare React Native app"
  - "Expo SDK version updates sometimes lag behind React Native core releases"
date: "2026-04-02"
---

## What is Expo?

Expo is the complete platform for building, deploying, and updating React Native applications. Rather than dealing with Xcode, Android Studio, CocoaPods, and Gradle directly, Expo abstracts all of that complexity behind a managed toolchain. You write React Native code; Expo handles the native infrastructure.

Expo is the recommended starting point for new React Native projects as of the official React Native documentation. It's not a separate framework — it's a layer on top of React Native that makes the developer experience dramatically better.

## Managed vs Bare Workflow

### Managed Workflow

In the managed workflow, Expo controls the native layer. You never touch `android/` or `ios/` directories. All native functionality comes through Expo SDK modules.

```bash
npx create-expo-app MyApp
cd MyApp
npx expo start   # Opens Expo Go on your device
```

**Best for**: New projects, solo developers, teams without native iOS/Android expertise.

### Bare Workflow

In the bare workflow, you have full access to native project files alongside Expo tools. You can use any React Native library, write custom native modules, and still benefit from EAS Build and EAS Update.

```bash
npx create-expo-app MyApp --template bare-minimum
```

**Best for**: Projects needing native modules not in Expo SDK, or migrating existing React Native projects.

## Expo SDK Modules

The Expo SDK is a collection of high-quality, maintained native modules. Key highlights:

| Module | Functionality |
|--------|--------------|
| expo-camera | Camera access with barcode scanning |
| expo-location | GPS with background tracking |
| expo-notifications | Push notifications (APNs + FCM) |
| expo-image-picker | Photo library and camera picker |
| expo-av | Audio and video playback |
| expo-secure-store | Keychain/Keystore secure storage |
| expo-file-system | File read/write access |
| expo-sqlite | SQLite database |
| expo-in-app-purchases | iOS/Android IAP |
| expo-haptics | Haptic feedback |

All modules have consistent APIs across iOS and Android, are actively maintained by the Expo team, and are tested with the current Expo SDK version.

## EAS: Expo Application Services

EAS is Expo's cloud build and deployment infrastructure:

### EAS Build

Cloud-based iOS and Android builds. Run `eas build` and Expo's servers compile your native app — iOS included, without needing a Mac locally.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all
```

EAS Build handles provisioning profiles, signing certificates, and keystores automatically.

### EAS Submit

Submit your built apps directly to the App Store and Google Play from the command line:

```bash
eas submit --platform ios
eas submit --platform android
```

### EAS Update

Push JavaScript/TypeScript code changes to users instantly without App Store review. Only JS bundle updates are supported (no native code changes):

```bash
eas update --branch production --message "Fix checkout bug"
```

Users get the update on next app launch (or background). This is a game-changer for fixing critical bugs without waiting 1-3 days for App Store approval.

## expo-router: File-Based Routing

`expo-router` brings Next.js-style file-based routing to React Native. Create files in the `app/` directory and they become routes:

```
app/
  _layout.tsx      # Root layout (like RootLayout in Next.js)
  index.tsx        # / route
  profile.tsx      # /profile route
  (tabs)/
    _layout.tsx    # Tab navigator
    home.tsx       # /home tab
    settings.tsx   # /settings tab
  users/
    [id].tsx       # /users/:id (dynamic route)
```

This dramatically reduces navigation boilerplate compared to manually configuring React Navigation stacks.

## Expo vs Bare React Native: When to Choose Each

| Scenario | Recommendation |
|----------|---------------|
| New project, no native requirements | Expo Managed |
| Need a native module not in Expo SDK | Expo Bare or eject |
| Team has no iOS/Android experience | Expo Managed |
| Need maximum app store optimization | Expo Bare |
| Rapid prototyping / MVP | Expo Managed |
| Existing bare React Native project | Add Expo modules selectively |

## Getting Started

```bash
# Create new Expo app
npx create-expo-app@latest MyApp

# Start development server
npx expo start

# Scan QR code with Expo Go app on your phone
# Or press 'i' for iOS Simulator, 'a' for Android Emulator
```

For most new React Native projects in 2026, starting with Expo managed workflow is the right call. You can always eject to bare workflow later if you hit a wall — but most apps never need to.
