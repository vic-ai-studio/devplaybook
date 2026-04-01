---
title: "Flutter — Google's Cross-Platform UI Toolkit for Native Apps"
description: "Flutter lets you build natively compiled iOS, Android, Web, Desktop apps from a single Dart codebase with pixel-perfect UI and 60fps animations using the Skia/Impeller engine."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Free and open source (Google). No licensing fees for any platform target."
website: "https://flutter.dev"
github: "https://github.com/flutter/flutter"
tags: ["mobile", "dart", "ios", "android", "web", "desktop", "cross-platform", "google"]
pros:
  - "Single codebase targets iOS, Android, Web, Windows, macOS, and Linux"
  - "Impeller rendering engine delivers consistent 60fps animations on all platforms"
  - "Hot reload for near-instant UI iteration during development"
  - "Strong static typing with Dart — catches errors at compile time"
  - "Growing pub.dev ecosystem with high-quality packages"
  - "Excellent tooling: flutter analyze, flutter test, DevTools profiler"
cons:
  - "Dart language learning curve for developers from JavaScript/Swift/Kotlin backgrounds"
  - "Larger binary size than native apps due to bundled Dart runtime"
  - "Web performance lags behind native web frameworks (React, Vue) for content-heavy sites"
  - "Accessing native platform APIs requires writing platform channel code"
  - "Smaller community and package ecosystem compared to React Native's npm universe"
date: "2026-04-02"
---

## What is Flutter?

Flutter is Google's open-source UI toolkit for building natively compiled applications from a single codebase. Unlike React Native (which maps to native platform widgets), Flutter renders everything itself using its own graphics engine — first Skia, now Impeller. This means every pixel on screen is drawn by Flutter, giving it unmatched consistency across platforms and the ability to deliver custom UI that looks identical on iOS and Android.

Released at Flutter 1.0 in December 2018 and now at Flutter 3.x, it supports six platforms: iOS, Android, Web, Windows, macOS, and Linux — all from one Dart codebase.

## Dart Language Basics

Flutter uses Dart, a statically typed, object-oriented language designed by Google. If you know Java, Kotlin, or TypeScript, Dart feels familiar within a day or two.

```dart
// Null-safe Dart
String greet(String? name) {
  return 'Hello, ${name ?? 'World'}!';
}

// Async/await (same as JS)
Future<List<User>> fetchUsers() async {
  final response = await http.get(Uri.parse('https://api.example.com/users'));
  return (jsonDecode(response.body) as List)
      .map((j) => User.fromJson(j))
      .toList();
}
```

Dart's sound null safety (introduced in Dart 2.12) eliminates an entire class of null pointer exceptions at compile time. AOT compilation produces fast native code; the Dart VM enables hot reload during development.

## Widget Tree: StatelessWidget vs StatefulWidget

Everything in Flutter is a widget. Widgets are immutable descriptions of UI that Flutter renders into a widget tree.

**StatelessWidget** — for UI that never changes after creation:

```dart
class GreetingCard extends StatelessWidget {
  final String name;
  const GreetingCard({required this.name, super.key});

  @override
  Widget build(BuildContext context) {
    return Text('Hello, $name!');
  }
}
```

**StatefulWidget** — for UI that can rebuild in response to events:

```dart
class Counter extends StatefulWidget {
  const Counter({super.key});
  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () => setState(() => _count++),
      child: Text('Count: $_count'),
    );
  }
}
```

## State Management Options

Flutter has a rich ecosystem of state management solutions:

| Solution | Complexity | Best For |
|----------|-----------|---------|
| setState | Minimal | Local widget state |
| Provider | Low | Small-medium apps |
| Riverpod | Medium | Testable, compile-safe state |
| Bloc / Cubit | Medium-High | Enterprise apps, clear separation |
| GetX | Low | Quick prototypes (controversial) |

**Riverpod** (by the author of Provider) is the current community favorite — it offers compile-time safety, no BuildContext dependency, and excellent testability.

## The Impeller Rendering Engine

Flutter's legacy Skia renderer compiled shaders at runtime, causing "jank" (frame drops) on first render. Impeller, Flutter's new renderer (default on iOS since Flutter 3.10, Android since 3.16), pre-compiles all shaders at build time. The result: smooth 60fps (or 120fps on ProMotion displays) from the very first frame, with no runtime compilation stutter.

## pub.dev Ecosystem

Flutter packages are hosted at [pub.dev](https://pub.dev). Key packages:

- **http / dio** — HTTP clients
- **go_router** — declarative navigation
- **flutter_riverpod** — state management
- **freezed** — immutable data classes with code generation
- **hive / isar** — local NoSQL databases
- **flutter_secure_storage** — keychain/keystore access
- **cached_network_image** — image caching
- **flutter_localizations** — i18n/l10n

## Flutter vs React Native: Comparison Table

| Factor | Flutter | React Native |
|--------|---------|-------------|
| Language | Dart | JavaScript / TypeScript |
| Rendering | Custom (Impeller) | Native platform widgets |
| Native feel | Custom but consistent | Platform-native |
| Animation | 60fps guaranteed | Good (Reanimated 3) |
| Binary size | ~15-20MB | ~10-15MB |
| Ecosystem | pub.dev (~35k packages) | npm (millions of packages) |
| Web support | Yes (Canvas-based) | Limited |
| Desktop support | Yes (Windows/Mac/Linux) | Limited |
| Learning curve | Dart (medium) | JS/TS (low for web devs) |
| Community | Large, growing | Very large |

## Getting Started

```bash
# Install Flutter SDK (via flutter.dev or fvm)
flutter doctor          # Check setup
flutter create my_app   # Create project
cd my_app
flutter run             # Run on connected device/simulator
```

Flutter is the right choice when you want pixel-perfect custom UI that looks identical on all platforms, need 60fps animations without compromise, or are targeting all six platforms (mobile + web + desktop) from a single team. The Dart learning curve is real but shallow — most developers are productive within a week.
