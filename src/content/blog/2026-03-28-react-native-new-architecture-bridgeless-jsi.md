---
title: "React Native 0.74+ New Architecture: Bridgeless Mode & JSI Deep Dive"
description: "Explore React Native's New Architecture in 0.74 and beyond. Learn how Bridgeless Mode, JSI, TurboModules, and Fabric renderer eliminate the legacy bridge bottleneck and transform app performance."
date: "2026-03-28"
tags: [react-native, mobile, javascript, performance, ios, android]
readingTime: "10 min read"
author: "DevPlaybook Team"
---

# React Native 0.74+ New Architecture: Bridgeless Mode & JSI Deep Dive

React Native's architecture has undergone its most significant transformation since the framework launched in 2015. The "New Architecture" — a complete reimagining of how JavaScript talks to native code — shipped as the default in React Native 0.74. If you're building React Native apps, understanding what changed and why is no longer optional.

This guide goes deep on the JavaScript Interface (JSI), Bridgeless Mode, TurboModules, and the Fabric renderer. By the end, you'll understand why these changes matter and how to take advantage of them.

## The Problem with the Old Bridge

To understand the New Architecture, you need to understand what it replaced.

The legacy React Native bridge was an asynchronous message-passing system. JavaScript and native code never touched each other directly. Instead:

1. JavaScript serialized data to JSON
2. JSON was passed across an async bridge
3. Native code deserialized the JSON and processed the message
4. Native code serialized a response back to JSON
5. The response crossed the bridge back to JavaScript

This design made the framework portable and isolated the two worlds, but it created serious bottlenecks. Every UI update, gesture event, and native API call incurred serialization overhead. Complex animations could stutter. Gesture handlers lagged behind touch events. Synchronous operations between JS and native were impossible.

The old bridge was also a single point of failure: all communication funneled through one queue.

## JSI: JavaScript Interface

The JavaScript Interface (JSI) is the foundation of the New Architecture. Instead of message passing, JSI gives JavaScript direct references to C++ objects.

With JSI, JavaScript code can:

- Hold references to native C++ host objects
- Call native functions synchronously
- Share memory between JavaScript and native without serialization

Here's what this looks like conceptually:

```javascript
// Old architecture: async bridge call
NativeModules.FileSystem.readFile(path, encoding, (error, content) => {
  // Called asynchronously, after JSON round-trip
});

// New architecture: JSI-based synchronous call (TurboModule)
const content = NativeFileSystem.readFileSync(path, encoding);
// Returns immediately, no serialization
```

JSI is implemented in C++ and works with any JavaScript engine — Hermes, V8, or JavaScriptCore. The React Native team used this flexibility to optimize Hermes specifically for React Native workloads.

### Hermes + JSI

Hermes, React Native's default JavaScript engine since 0.70, was built to complement JSI. Key Hermes features that matter for performance:

**Ahead-of-Time (AOT) compilation**: Hermes compiles JavaScript to bytecode at build time rather than runtime. App startup is dramatically faster because the JS engine isn't parsing and compiling source code on first launch.

**Static Hermes (0.74+)**: An opt-in mode that compiles TypeScript/Flow-typed code to native code paths, eliminating dynamic type checks in hot paths. For compute-heavy code, Static Hermes delivers near-native performance.

**Lazy module initialization**: Modules are only initialized when first accessed, reducing startup memory footprint.

## TurboModules: Native Modules Reimagined

TurboModules replace the old NativeModules system. Built on JSI, they provide:

**Lazy loading**: Old native modules were all initialized at startup regardless of whether they were used. TurboModules are initialized on first access, improving startup time proportional to how many modules your app includes.

**Synchronous or asynchronous**: TurboModules can expose synchronous functions when appropriate. The old bridge was always async.

**Type safety**: TurboModule specs are defined in typed JavaScript or TypeScript. The codegen tool generates native bindings automatically, eliminating a major source of type mismatch bugs.

Defining a TurboModule spec:

```typescript
// NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;
  multiply(a: number, b: number): Promise<number>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Calculator');
```

The codegen system reads this spec and generates the C++ and native bindings. You implement the native side once in Swift/Kotlin and the interface is automatically consistent with the JS spec.

## Fabric: The New Renderer

The legacy renderer (UIManager) processed UI updates asynchronously. Layout calculation happened on a background thread, but the actual mounting of UI components happened on the main thread after an async handoff.

Fabric, the new renderer, is a C++ reimplementation of the rendering pipeline. Key improvements:

**Synchronous rendering**: Fabric can render UI synchronously when needed. This is critical for certain animations and interactions where async rendering caused visual artifacts.

**Concurrent features**: Fabric is built to support React's Concurrent Mode features — `useTransition`, `useDeferredValue`, and Suspense for data fetching. These features require the renderer to be interruptible, which the old renderer couldn't support.

**Reduced copies**: The old pipeline made multiple copies of the component tree as it passed between threads. Fabric uses shared C++ state, reducing memory usage and copying overhead.

**Shadow tree in C++**: Layout calculation using Yoga runs in C++ rather than Java/Kotlin on Android, eliminating JNI overhead.

## Bridgeless Mode

Bridgeless Mode, stabilized in React Native 0.74 and enabled by default in 0.75, completes the transition to the New Architecture by removing the legacy bridge entirely.

Previously, even apps that opted into JSI, TurboModules, and Fabric kept the bridge running for compatibility. Bridgeless Mode removes that fallback:

- All native module communication goes through JSI
- The async bridge queue is removed
- Memory overhead from the bridge infrastructure is eliminated
- Startup time improves because bridge initialization is skipped

Enabling Bridgeless Mode in your app (if not already default):

```javascript
// android/gradle.properties
newArchEnabled=true

// ios/Podfile
:bridgeless_enabled => true
```

For React Native 0.75+, this is the default. No configuration needed for new projects.

### Checking New Architecture Status

```javascript
import { isNewArchEnabled } from 'react-native';

if (isNewArchEnabled) {
  console.log('Running on New Architecture');
} else {
  console.log('Running on Legacy Architecture');
}
```

## Codegen: Automatic Native Bindings

The codegen tool is central to the New Architecture workflow. It takes typed JavaScript specs and generates:

- C++ headers for JSI interfaces
- Swift/ObjC wrappers for iOS
- Kotlin/Java wrappers for Android

Running codegen:

```bash
# Typically runs automatically during build
cd android && ./gradlew generateCodegenArtifactsFromSchema

# iOS: runs during pod install
cd ios && bundle exec pod install
```

Codegen eliminates the category of bugs where the JavaScript spec and native implementation get out of sync. If the types don't match, the build fails rather than crashing at runtime.

## Migration Path for Existing Apps

Migrating an existing app to the New Architecture involves several steps:

**1. Audit your native modules**

Check which native modules you use and whether they have TurboModule-compatible versions:

```bash
npx react-native info
```

The React Native community has migrated most popular packages. Check the package's README for New Architecture support status.

**2. Update to React Native 0.74+**

```bash
npx react-native upgrade
```

**3. Enable the New Architecture**

For Android, set `newArchEnabled=true` in `android/gradle.properties`.

For iOS, use the Xcode build flag or update `ios/Podfile`.

**4. Handle incompatible modules**

Modules that haven't migrated yet will either:
- Work in interop mode (React Native provides a compatibility layer)
- Need to be replaced with alternatives
- Need to be updated manually

**5. Test thoroughly**

The New Architecture changes subtle timing behaviors. Animations, gesture handling, and native interactions deserve careful testing.

## Performance Impact in Practice

The New Architecture's performance benefits are most visible in specific scenarios:

**Gesture-heavy UIs**: Gesture handlers can now run synchronously with JavaScript, eliminating the frame-delay that caused "sliding off" artifacts in complex gesture interactions.

**Animated values**: `Animated.Value` and `useAnimatedValue` benefit from reduced synchronization overhead, particularly in complex animation sequences.

**App startup**: TurboModule lazy loading and Hermes AOT compilation combine to meaningfully reduce cold start times, especially for apps with many native modules.

**Large lists**: Fabric's rendering improvements reduce jank in `FlatList` and `FlashList` when scrolling through complex item renderers.

**Benchmarks from the React Native team** show 10-30% startup time improvement for typical apps, with some seeing more dramatic improvements depending on module count.

## What This Means for Library Authors

If you maintain a React Native library with native code, migration to TurboModules is necessary for users on Bridgeless Mode. The migration involves:

1. Adding a typed spec file (`.ts` or `.js` with Flow types)
2. Updating native implementation files
3. Updating the `package.json` with `codegenConfig`
4. Adding the interop compatibility layer for users still on the old architecture

The [React Native community template](https://github.com/react-native-community/react-native-template-new-architecture) provides a reference implementation.

## The Concurrent React Connection

The New Architecture unlocks React 18+ concurrent features that were previously unavailable or unreliable in React Native:

**`startTransition`**: Mark UI updates as non-urgent. React can yield to higher-priority updates (like user input) mid-render.

```javascript
import { startTransition } from 'react';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleInput(text) {
    setQuery(text); // Urgent: update input immediately
    startTransition(() => {
      setResults(search(text)); // Non-urgent: can be interrupted
    });
  }
}
```

**`Suspense` for data fetching**: Components can suspend while data loads, enabling coordinated loading states without manual loading flags.

**Automatic batching**: Multiple state updates within the same event are automatically batched into a single render, reducing unnecessary re-renders.

## Conclusion

React Native's New Architecture is a foundational rebuild that addresses the core limitations of the original bridge-based design. JSI, TurboModules, Fabric, and Bridgeless Mode work together to deliver:

- Direct JS-to-native communication without serialization overhead
- Synchronous operations where needed
- Support for React's concurrent features
- Faster startup through lazy loading and Hermes AOT compilation

For apps on React Native 0.74+, the New Architecture is now the default. Understanding how it works helps you write better-performing code and debug issues that arise from the changed timing and execution model. For apps still on older versions, migration is straightforward for most codebases and the performance benefits are worth the effort.
