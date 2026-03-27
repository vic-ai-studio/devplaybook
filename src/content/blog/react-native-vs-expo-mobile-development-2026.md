---
title: "React Native vs Expo: Mobile Development Guide for Web Developers (2026)"
description: "React Native vs Expo compared for 2026. Learn when to use bare React Native vs Expo managed workflow, Expo SDK 52 new architecture, EAS Build, and how to migrate from web React to mobile."
date: "2026-03-27"
tags: ["react-native", "expo", "mobile", "ios", "android", "javascript", "typescript", "web-development"]
category: "mobile-development"
readingTime: "10 min read"
---

# React Native vs Expo: Mobile Development Guide for Web Developers (2026)

If you already build React apps for the web, React Native is the fastest path to mobile. But the first decision you'll face is whether to use bare React Native or Expo — and it matters more than you'd think. This guide gives web developers the context to make the right call in 2026.

---

## What's the Difference?

**React Native** is the core framework from Meta. It compiles JavaScript/TypeScript to native iOS and Android components. To use it directly, you need Xcode (macOS only) for iOS and Android Studio for Android.

**Expo** is a platform built on top of React Native that handles tooling, native modules, and infrastructure. Think of it like Next.js for React — it adds conventions, tools, and managed services, but the underlying runtime is still React Native.

| | React Native (bare) | Expo Managed | Expo Bare |
|-|--------------------|--------------|-----------|
| Setup complexity | High | Low | Medium |
| iOS build without Mac | No | Yes (EAS) | Yes (EAS) |
| Customizable native code | Full | Limited | Full |
| Native module support | All | Expo SDK only | All |
| Over-the-air updates | Manual | Expo Updates | Expo Updates |
| File-based routing | Manual | Expo Router | Expo Router |
| Who it's for | Advanced teams, custom native | Most new projects | Expo start, custom later |

---

## Expo Managed Workflow: Where to Start

For most web developers building their first React Native app, **start with Expo managed workflow**. You get:

- No Xcode or Android Studio required on day 1
- The Expo Go app for instant testing on your physical device
- Pre-configured TypeScript, linting, metro bundler
- A large SDK of pre-built native modules (camera, maps, notifications, biometrics)

```bash
npx create-expo-app@latest my-app --template
cd my-app
npx expo start
```

Scan the QR code with Expo Go on your phone — your app runs immediately.

### File-Based Routing with Expo Router

Expo Router brings Next.js-style file-based routing to React Native. If you know Next.js App Router, this feels immediately familiar.

```
app/
├── _layout.tsx      ← Root layout (like layout.tsx in Next.js)
├── index.tsx        ← Home screen (/)
├── about.tsx        ← About screen (/about)
└── (tabs)/
    ├── _layout.tsx  ← Tab bar layout
    ├── home.tsx
    └── profile.tsx
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
```

```tsx
// app/index.tsx
import { View, Text, Pressable } from 'react-native'
import { Link, useRouter } from 'expo-router'

export default function Home() {
  const router = useRouter()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Welcome</Text>

      {/* Link component works like Next.js Link */}
      <Link href="/about">
        <Text>Go to About</Text>
      </Link>

      {/* Programmatic navigation */}
      <Pressable onPress={() => router.push('/profile')}>
        <Text>View Profile</Text>
      </Pressable>
    </View>
  )
}
```

---

## Key Differences from Web React

### No CSS — Use StyleSheet

```tsx
import { StyleSheet, View, Text } from 'react-native'

export default function Card({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,  // Android shadow
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
})
```

Or use **NativeWind** for Tailwind-like classes:

```bash
npm install nativewind tailwindcss
```

```tsx
import { View, Text } from 'react-native'

export default function Card({ title }: { title: string }) {
  return (
    <View className="bg-white rounded-xl p-4 my-2 shadow-sm">
      <Text className="text-lg font-semibold text-gray-900">{title}</Text>
    </View>
  )
}
```

### Touch Instead of Click

```tsx
import { Pressable, TouchableOpacity } from 'react-native'

// Pressable (recommended in React Native 0.70+)
<Pressable
  onPress={handlePress}
  onLongPress={handleLongPress}
  style={({ pressed }) => [
    styles.button,
    pressed && styles.buttonPressed,
  ]}
>
  <Text>Press Me</Text>
</Pressable>
```

### Scrollable Containers

On mobile, `div` overflow doesn't scroll. Use `ScrollView` or `FlatList`:

```tsx
import { FlatList } from 'react-native'

// FlatList for long lists — only renders visible items
<FlatList
  data={items}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <ItemCard item={item} />}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
/>
```

---

## Expo SDK 52: The New Architecture

React Native's **New Architecture** (Fabric renderer + TurboModules + JSI) has been in development for years. With Expo SDK 52 and React Native 0.76, it's enabled by default.

### What the New Architecture Changes

**Before (Old Architecture):**
- JavaScript ↔ Native communication via JSON serialization over a bridge
- Asynchronous only — no synchronous calls
- Layout calculated on native thread, JS on its own thread

**After (New Architecture):**
- JSI (JavaScript Interface) — direct C++ bindings, synchronous access
- TurboModules — native modules load on demand, not all at startup
- Fabric — concurrent rendering, interop with React's scheduler

In practice, you'll notice:
- 20-40% faster list scrolling
- Better animation performance
- Faster startup (TurboModules lazy-load)
- More reliable gesture handling

```typescript
// SDK 52: enable new architecture in app.json
{
  "expo": {
    "experiments": {
      "newArchEnabled": true  // default in SDK 52
    }
  }
}
```

---

## EAS Build: iOS Without a Mac

**Expo Application Services (EAS) Build** is a cloud build service. You push your code; Expo's servers compile it and deliver `.ipa` (iOS) and `.apk`/`.aab` (Android) files.

```bash
npm install -g eas-cli
eas login
eas build:configure
```

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

```bash
# Build for iOS (no Mac required)
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store and Play Store
eas submit --platform ios
eas submit --platform android
```

### EAS Update: Over-the-Air Updates

```bash
eas update --branch production --message "Fix checkout bug"
```

OTA updates let you push JavaScript and asset changes without going through App Store review. Only use for bug fixes — Apple's guidelines prohibit using OTA updates to change app functionality significantly.

---

## When to Use Bare React Native

Managed Expo has limits. You'll need to eject to bare workflow (or start bare) when:

1. **Custom native modules** — third-party SDKs that aren't in Expo SDK (some payment SDKs, custom Bluetooth, proprietary analytics)

2. **Deep native customization** — custom app extensions, widgets, watch apps, carplay

3. **Performance-critical code** — custom C++ bridges, custom renderers

```bash
# Start bare from scratch
npx create-expo-app@latest my-app --template bare-minimum

# Or eject from managed
npx expo prebuild  # Generates ios/ and android/ folders
```

Once you have `ios/` and `android/` folders, you can write native code and use any React Native library. You still get most Expo tools (EAS Build, EAS Update, Expo Router).

---

## React Native vs Flutter vs Capacitor

| | React Native/Expo | Flutter | Capacitor |
|-|------------------|---------|-----------|
| Language | JavaScript/TS | Dart | JavaScript/TS |
| Renders | Native components | Custom canvas | WebView |
| Web support | Experimental | Yes | Native web |
| Performance | Good | Excellent | Good |
| Learning curve | Low (React devs) | Medium | Very low |
| Hot reload | Yes | Yes | Yes |

**Choose React Native/Expo if:** You know React and want mobile.
**Choose Flutter if:** You want the best performance and don't mind learning Dart.
**Choose Capacitor if:** You want to wrap an existing web app as a mobile app with minimal changes.

---

## Debugging Tools

### Expo DevTools

```bash
npx expo start
# Press 'm' in terminal to open Expo Dev Menu on device
# Or shake your device
```

From the dev menu: inspect component tree, network requests, performance monitor.

### React Native Debugger

A standalone DevTools app that combines Chrome DevTools, Redux DevTools, and React DevTools in one window.

```bash
brew install --cask react-native-debugger  # macOS
# Or download from GitHub: jhen0409/react-native-debugger
```

### Flipper (Meta's Debug Tool)

```bash
brew install flipper  # macOS
```

Flipper connects to running apps and shows:
- Network requests (Hermes-based apps)
- Layout inspector with component highlight
- Crash reporter
- Custom plugins

### Expo Snack: Browser-Based Prototyping

[Expo Snack](https://snack.expo.dev) is a browser-based React Native sandbox — no installation needed. Great for sharing reproducible examples and prototyping UI components.

---

## Migration Path: Web React → React Native

Most React concepts transfer directly. Here's the translation:

| Web React | React Native |
|-----------|-------------|
| `<div>` | `<View>` |
| `<p>`, `<h1>`, `<span>` | `<Text>` |
| `<img>` | `<Image>` |
| `<input>` | `<TextInput>` |
| `<button>` | `<Pressable>` |
| CSS flexbox | StyleSheet flexbox (default, same properties) |
| `onClick` | `onPress` |
| `<a>` | `<Link>` (Expo Router) |
| `useState`, `useEffect` | Same |
| `fetch` | Same |
| Context API, Zustand, Jotai | Same |

Your state management, API calls, and business logic transfer unchanged. You rewrite only the UI layer.

---

## Summary

For web developers entering mobile in 2026:

- **Start with Expo** (managed workflow) — you'll have a working app on your phone in 20 minutes
- **Use Expo Router** — file-based routing feels like home if you know Next.js
- **Expo SDK 52 + New Architecture** — enabled by default, meaningfully better performance
- **EAS Build** — iOS builds without a Mac, App Store submission from CI/CD
- **Eject to bare** only when you need custom native modules or deep customization

The React knowledge you have today transfers directly. The main investment is learning the mobile-specific components (`View`, `Text`, `FlatList`) and understanding how touch, gestures, and platform differences work. For most apps, you'll be productive in React Native within a week.

---

For debugging your React Native apps, check out [React Native Debugger](https://devplaybook.cc) and [Expo Snack](https://devplaybook.cc) tools on DevPlaybook.
