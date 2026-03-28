---
title: "Expo SDK 52: Universal Apps with Native Modules"
description: "Expo SDK 52 brings React Native New Architecture as default, Expo Modules API, DOM Components, and React Native DevTools integration. Build universal apps with native modules the modern way."
date: "2026-03-28"
tags: [expo, react-native, mobile, universal-apps, ios, android]
readingTime: "9 min read"
author: "DevPlaybook Team"
---

# Expo SDK 52: Universal Apps with Native Modules

Expo SDK 52 represents the most significant update to the Expo platform in years. The New Architecture ships as the default, the Expo Modules API reaches maturity, DOM Components bridge web-native boundaries, and React Native DevTools replaces the aging Flipper integration.

If you're building mobile apps with Expo — whether targeting iOS, Android, or web — this guide covers everything that changed and how to take advantage of it.

## New Architecture: Now the Default

The most significant change in SDK 52 is that React Native's New Architecture is enabled by default for all new Expo projects. This means:

- **JSI** for direct JavaScript-to-native communication
- **TurboModules** for lazy-loaded native modules
- **Fabric** for the rendering pipeline
- **Bridgeless Mode** enabled by default

For existing projects upgrading to SDK 52:

```bash
npx expo install expo@^52.0.0
npx expo install --fix
```

The New Architecture flag in `app.json`:

```json
{
  "expo": {
    "newArchEnabled": true
  }
}
```

This is now the default for new projects. Existing projects upgrading should test thoroughly — particularly gesture handling and animation-heavy screens.

### Compatibility Layer

SDK 52 includes a compatibility layer for third-party libraries that haven't fully migrated to TurboModules. Libraries using the legacy NativeModules system continue working via automatic interop. You'll see a deprecation warning in development, but no runtime errors.

Check your dependencies:

```bash
npx expo-doctor
```

`expo-doctor` now reports New Architecture compatibility status for each installed package, making it straightforward to identify migration work needed.

## Expo Modules API

The Expo Modules API, introduced in SDK 44, reaches maturity in SDK 52. It's now the recommended way to write native modules for Expo projects, replacing the lower-level React Native TurboModules API for most use cases.

The Expo Modules API provides:

- **Swift and Kotlin-first API** with automatic JSI bindings
- **TypeScript type generation** from native definitions
- **Hooks and lifecycle callbacks** matching React Native's event system
- **Automatic memory management** for native objects

### Creating a Native Module

```bash
npx create-expo-module my-module
```

This generates a complete module structure:

```
my-module/
├── src/
│   └── index.ts          # TypeScript exports
├── ios/
│   └── MyModule.swift    # iOS implementation
├── android/
│   └── MyModule.kt       # Android implementation
└── expo-module.config.json
```

iOS implementation with the Expo Modules API:

```swift
import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Function("getValue") { () -> String in
      return "Hello from iOS!"
    }

    AsyncFunction("fetchData") { (url: String, promise: Promise) in
      // Async native work
      DispatchQueue.global().async {
        let result = // ... network call
        promise.resolve(result)
      }
    }

    Events("onDataReceived")
  }
}
```

Android implementation:

```kotlin
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    Function("getValue") {
      "Hello from Android!"
    }

    AsyncFunction("fetchData") { url: String ->
      // Async work with coroutines
      suspendCoroutine { continuation ->
        // ... network call
        continuation.resume(result)
      }
    }

    Events("onDataReceived")
  }
}
```

TypeScript usage:

```typescript
import MyModule from 'my-module';

const value = MyModule.getValue(); // synchronous
const data = await MyModule.fetchData('https://api.example.com'); // async

// Event subscription
const subscription = MyModule.addListener('onDataReceived', (event) => {
  console.log(event.data);
});
```

The Expo Modules API handles the JSI bindings, TurboModule registration, and codegen automatically. You write business logic, not boilerplate.

## DOM Components (Experimental)

DOM Components is a new SDK 52 feature that lets you render web content (HTML, CSS, JavaScript) within React Native screens using a dedicated Web Worker-based renderer.

This isn't a WebView wrapper — it's a first-class rendering primitive that integrates with the React tree and supports native-web communication.

```tsx
import { use } from 'react';
import { Text } from 'react-native';
import { WebView } from 'expo-dom'; // New in SDK 52

// Mark a component as DOM-rendered
'use dom';

export default function WebComponent({ html }: { html: string }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}
```

```tsx
// Native React Native component using DOM component
import WebComponent from './WebComponent';

function MyScreen() {
  return (
    <View>
      <Text>Native content above</Text>
      <WebComponent html="<p>Web content rendered here</p>" />
      <Text>Native content below</Text>
    </View>
  );
}
```

DOM Components excel for:
- Rich text rendering (articles, documentation)
- Interactive embeds (charts using D3, maps using Leaflet)
- Content that's already authored for web
- Legacy web components that need native integration

The implementation uses a separate rendering thread to avoid blocking the native UI thread.

## React Native DevTools Integration

SDK 52 ships with React Native DevTools as the primary debugging interface, replacing the Flipper plugin system deprecated in React Native 0.73.

React Native DevTools is built on Chrome DevTools Protocol (CDP) and provides:

- **JavaScript debugger**: Set breakpoints, step through code, inspect variables
- **Network inspector**: View HTTP requests, responses, and WebSocket messages
- **React component inspector**: Inspect and modify component props and state
- **Performance profiler**: Flame charts for JavaScript execution, component renders
- **Console**: Full DevTools console with rich object inspection

Connecting to React Native DevTools:

```bash
npx expo start
```

Press `j` in the terminal to open the debugger, or open `chrome://inspect` in Chrome and select your device.

For programmatic breakpoints:

```javascript
// In your app code
debugger; // Opens DevTools if connected
```

### Hermes Inspector Protocol

The DevTools integration uses Hermes' native inspector protocol for more accurate debugging than the legacy remote debugger. This means:

- Breakpoints work correctly in async code
- Variable inspection shows accurate native types
- Async stack traces show the full call chain
- Source maps work for both production and development builds

## Expo Router 4

SDK 52 ships with Expo Router 4, the file-based routing system for Expo apps.

### Key Changes in Expo Router 4

**Typed routes (stable)**: Route parameters are now TypeScript-typed automatically based on your file structure.

```typescript
// Fully typed navigation
import { Link, useLocalSearchParams } from 'expo-router';

// app/users/[id].tsx
export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>User {id}</Text>;
}

// Navigate with full type checking
<Link href="/users/123">Go to user</Link>
```

**Shared element transitions (experimental)**: Native shared element transitions between screens with a simple API:

```tsx
import { SharedTransition } from 'expo-router';

// Source screen
<SharedTransition tag="profile-image">
  <Image source={{ uri: user.avatar }} />
</SharedTransition>

// Destination screen
<SharedTransition tag="profile-image">
  <Image source={{ uri: user.avatar }} style={styles.largeAvatar} />
</SharedTransition>
```

**Improved web support**: Static rendering for web now supports nested layouts correctly. SEO metadata APIs work consistently between mobile and web.

**Async routes**: Dynamic imports for routes enable code splitting in web builds:

```typescript
// app/(tabs)/heavy-screen.tsx
export const unstable_settings = {
  async: true, // Lazy-loaded in web builds
};
```

## EAS (Expo Application Services) Updates

SDK 52 brings several EAS improvements relevant to the New Architecture:

### EAS Build

- New Architecture builds are now faster due to improved caching of C++ compilation
- Hermesc (Hermes compiler) runs during build rather than first launch
- Build worker pools are dedicated per platform, reducing queue time

### EAS Update (OTA Updates)

The over-the-air update system now supports:

```bash
eas update --branch preview --message "Fix login crash"
```

New in SDK 52:
- **Rollout percentage**: Gradually roll out updates to a percentage of users
- **Rollback trigger**: Automatically roll back if crash rate exceeds threshold
- **Update groups**: Bundle multiple app versions with the same update

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "rollbackOnCrash": true,
      "crashThreshold": 0.05
    }
  }
}
```

## Updated Core Libraries

### expo-camera

Version 15 in SDK 52 rewrites the camera module using the Expo Modules API for better performance and reliability:

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return <Button onPress={requestPermission} title="Grant Permission" />;
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      onBarcodeScanned={({ data, type }) => {
        console.log(`Barcode: ${data} (${type})`);
      }}
    />
  );
}
```

The new API supports:
- Multi-camera (wide + ultrawide + telephoto)
- Real-time frame processing via `useFrameProcessor`
- Better async permission handling

### expo-image

The `expo-image` component, a fast image loading alternative to React Native's built-in `Image`, adds in SDK 52:

- **Blurhash placeholders**: Show while image loads
- **ThumbHash placeholders**: More accurate than Blurhash
- **Animated GIF and APNG support**
- **Priority loading**: Hint at image priority for network requests

```tsx
import { Image } from 'expo-image';

<Image
  source="https://example.com/photo.jpg"
  placeholder={{ thumbhash: "HhkSPYZ..." }}
  contentFit="cover"
  transition={300}
/>
```

### expo-sqlite

Full-text search and WAL mode improvements in the SQLite module:

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('myapp.db');

// New: FTS5 full-text search
db.execSync(`
  CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts
  USING fts5(title, body, content='articles', content_rowid='id')
`);

// Efficient full-text queries
const results = db.getAllSync(
  `SELECT * FROM articles WHERE articles_fts MATCH ?`,
  ['react native performance']
);
```

## Migration from SDK 51

```bash
# Install the latest Expo CLI
npm install -g expo-cli

# Upgrade SDK
npx expo install expo@^52.0.0

# Fix incompatible packages
npx expo install --fix

# Check for issues
npx expo-doctor
```

Common issues during migration:

1. **Libraries using legacy NativeModules**: Will work with compatibility layer, but test gesture and animation-heavy features
2. **Custom native modules**: Need updating to use Expo Modules API or TurboModules
3. **Flipper plugins**: Flipper integration is removed — migrate to React Native DevTools
4. **Metro config**: Some custom Metro configurations need updating for the New Architecture resolver

## Conclusion

Expo SDK 52 delivers the most production-ready Expo yet. The New Architecture as default means new projects benefit immediately from JSI performance, TurboModule lazy loading, and Fabric rendering without any configuration. The Expo Modules API makes native modules accessible to developers who aren't native platform specialists. DOM Components open new possibilities for hybrid content. And React Native DevTools finally replaces the aging Flipper ecosystem.

For teams building mobile apps in 2026, Expo SDK 52 with the New Architecture is the starting point to use.
