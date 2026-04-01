---
title: "NativeScript — Build Native iOS & Android with JavaScript"
description: "NativeScript lets you build truly native iOS and Android apps using JavaScript or TypeScript with Angular, React, Vue, or Svelte. Direct access to native APIs without bridges."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Free and open source. NativeScript Pro (enterprise support) is paid."
website: "https://nativescript.org"
github: "https://github.com/NativeScript/NativeScript"
tags: ["mobile", "javascript", "typescript", "angular", "vue", "react", "native", "ios", "android"]
pros:
  - "Truly native rendering — real native UI components, no WebView"
  - "Direct access to native platform APIs from JavaScript without writing native code"
  - "Works with Angular, React, Vue, Svelte, or plain TypeScript"
  - "Access 100% of iOS and Android APIs directly from JS/TS"
  - "Open source with a dedicated community"
cons:
  - "Smaller community and fewer packages compared to React Native"
  - "Less third-party library availability than the npm/React Native ecosystem"
  - "Steeper initial learning curve — native API access requires understanding platform conventions"
  - "NativeScript 8 introduced breaking changes from older versions"
date: "2026-04-02"
---

## What is NativeScript?

NativeScript is an open-source framework that enables you to build truly native iOS and Android applications using JavaScript or TypeScript. Unlike hybrid frameworks (Capacitor, Cordova) that wrap a WebView, and unlike React Native which requires a bridge, NativeScript provides direct access to native platform APIs from JavaScript — the same APIs that Swift/Kotlin developers use.

A JavaScript call to `new android.widget.Button(context)` in NativeScript actually instantiates a real Android button. There is no WebView, no Chromium, no native UI simulator. The result is genuine native performance and access to 100% of the platform SDK.

## NativeScript Architecture: Direct Native Bridge

NativeScript's core innovation is its direct metadata bridge:

1. **Metadata generation**: At build time, NativeScript scans all iOS Frameworks and Android APIs and generates TypeScript metadata.
2. **Runtime binding**: The NativeScript JavaScript runtime (V8 on Android, JavaScriptCore on iOS) has direct bindings to native APIs.
3. **No serialization**: Unlike React Native's old bridge, NativeScript doesn't serialize data to JSON. Native objects are first-class citizens in the JS runtime.

```typescript
// Direct native Android API access from TypeScript
const button = new android.widget.Button(this._context);
button.setText("Click Me");
button.setOnClickListener(new android.view.View.OnClickListener({
    onClick(view: android.view.View) {
        console.log("Native button tapped!");
    }
}));

// Direct native iOS API access
const alert = UIAlertController.alertControllerWithTitleMessagePreferredStyle(
    "Hello",
    "This is a native iOS alert",
    UIAlertControllerStyle.Alert
);
```

In practice, you rarely write raw native API calls — NativeScript components and plugins abstract these into a consistent cross-platform API.

## NativeScript with Angular

The original and most mature NativeScript integration:

```bash
ns create myApp --template @nativescript/template-hello-world-ng
```

```html
<!-- app.component.html — NativeScript XML components, not HTML -->
<Page>
  <ActionBar title="My App"></ActionBar>
  <StackLayout>
    <Label [text]="greeting" class="h1 text-center"></Label>
    <Button text="Tap Me!" (tap)="onTap()" class="btn btn-primary"></Button>
  </StackLayout>
</Page>
```

```typescript
@Component({ selector: 'ns-app', templateUrl: './app.component.html' })
export class AppComponent {
    greeting = 'Hello, NativeScript!';
    onTap() { this.greeting = 'You tapped!'; }
}
```

Note: NativeScript uses its own XML-based component system, not HTML. The components (`StackLayout`, `Label`, `Button`) map to native views, not DOM elements.

## NativeScript with Vue

```bash
ns create myApp --template @nativescript/template-hello-world-vue
```

```vue
<template>
  <Page>
    <ActionBar :title="title" />
    <StackLayout>
      <Label :text="message" class="message" />
      <Button text="Change Message" @tap="changeMessage" />
    </StackLayout>
  </Page>
</template>

<script setup lang="ts">
import { ref } from 'nativescript-vue';
const title = 'NativeScript + Vue';
const message = ref('Hello from Vue!');
const changeMessage = () => { message.value = 'Message changed!'; };
</script>
```

## NativeScript with React

`react-nativescript` provides a React binding:

```bash
ns create myApp --template @nativescript/template-blank-react
```

The React integration is less mature than Angular or Vue but functional for new projects.

## Accessing Native APIs

One of NativeScript's strongest features is the ability to call native APIs directly when no plugin exists:

```typescript
// iOS: access CoreMotion from TypeScript
import { isIOS } from '@nativescript/core';

if (isIOS) {
    const motionManager = CMMotionManager.new();
    motionManager.accelerometerUpdateInterval = 0.1;
    motionManager.startAccelerometerUpdatesToQueueWithHandler(
        NSOperationQueue.mainQueue,
        (data, error) => {
            if (data) {
                console.log(`X: ${data.acceleration.x}`);
            }
        }
    );
}
```

This is unique to NativeScript — no other JS framework lets you call native APIs this directly without writing a native plugin in Swift/Kotlin.

## NativeScript vs React Native

| Factor | NativeScript | React Native |
|--------|-------------|-------------|
| Native API access | Direct from JS | Via native modules (Swift/Kotlin) |
| Bridge | No bridge (direct) | Legacy bridge / JSI |
| Framework support | Angular, Vue, React, Svelte | React only |
| Community size | Smaller | Much larger |
| npm packages | Limited (native access needed) | Huge (most web JS works) |
| Learning curve | High (native API knowledge helps) | Medium |
| Corporate backing | Progress Software | Meta |
| Enterprise support | NativeScript Pro | Various |

## Plugin Ecosystem

NativeScript has a growing plugin ecosystem at [market.nativescript.org](https://market.nativescript.org):

- `@nativescript/firebase` — Firebase SDK
- `@nativescript/camera` — Camera access
- `@nativescript/geolocation` — GPS
- `@nativescript/local-notifications` — Push notifications
- `@nativescript/biometrics` — Face ID / fingerprint
- `@nativescript/sqlite` — SQLite database

## Getting Started

```bash
# Install NativeScript CLI
npm install -g nativescript

# Create a new app
ns create myApp --template @nativescript/template-hello-world-ts

# Run on device/simulator
ns run ios
ns run android

# Check environment
ns doctor
```

NativeScript is the right choice when you need direct native API access from JavaScript without writing Swift or Kotlin, prefer Angular or Vue over React for mobile development, or are building apps that rely heavily on platform-specific APIs not covered by React Native's ecosystem. Its smaller community is the main trade-off compared to React Native.
