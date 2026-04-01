---
title: "Ionic Framework — Cross-Platform Apps with Web Technologies"
description: "Ionic is a UI component library for building hybrid mobile apps with Angular, React, or Vue. Paired with Capacitor for native access to iOS/Android/Desktop."
category: "Mobile"
pricing: "Open Source"
pricingDetail: "Ionic Framework is free and open source. Ionic AppFlow (CI/CD) has paid plans from $49/month."
website: "https://ionicframework.com"
github: "https://github.com/ionic-team/ionic-framework"
tags: ["mobile", "hybrid", "angular", "react", "vue", "ios", "android", "web-components"]
pros:
  - "100+ pre-built UI components styled for iOS and Android design patterns"
  - "Framework-agnostic — works with Angular, React, Vue, or no framework"
  - "Built on web standards (Web Components) — future-proof architecture"
  - "Large community and extensive documentation"
  - "Ionic AppFlow provides CI/CD, live updates, and device testing"
cons:
  - "WebView-based rendering — performance ceiling below native apps"
  - "Native feel requires careful CSS tuning, varies between platforms"
  - "Not suitable for graphics-heavy or gaming applications"
  - "AppFlow CI/CD pricing is high for small teams"
date: "2026-04-02"
---

## What is Ionic Framework?

Ionic Framework is a front-end UI toolkit for building cross-platform mobile and web applications using web technologies. It provides a library of 100+ mobile-optimized UI components — tabs, modals, action sheets, navigation bars, forms, lists, cards — that automatically adapt their appearance to match iOS (Human Interface Guidelines) or Android (Material Design) conventions based on the platform.

Ionic is not a runtime itself. You pair it with:
- **Capacitor** (or legacy Cordova) to wrap your web app as a native iOS/Android app
- **Your JS framework** (Angular, React, Vue) for application logic and state

Together these three form the classic Ionic stack: Ionic UI + Capacitor native + Angular/React/Vue logic.

## Component Library Overview

Ionic's components are built as standard Web Components, meaning they work in any JavaScript framework:

```tsx
// React (using @ionic/react)
import { IonApp, IonPage, IonHeader, IonToolbar, IonTitle,
         IonContent, IonList, IonItem, IonLabel, IonButton } from '@ionic/react';

function HomePage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My App</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonLabel>Item 1</IonLabel>
          </IonItem>
        </IonList>
        <IonButton expand="block">Get Started</IonButton>
      </IonContent>
    </IonPage>
  );
}
```

Key component categories:

| Category | Components |
|----------|-----------|
| Navigation | IonTabs, IonRouterOutlet, IonBackButton |
| Layout | IonGrid, IonCard, IonList, IonItem |
| Forms | IonInput, IonSelect, IonToggle, IonRange, IonCheckbox |
| Feedback | IonAlert, IonToast, IonModal, IonActionSheet, IonLoading |
| Media | IonAvatar, IonChip, IonBadge, IonIcon |

## Framework Integration

### Ionic + Angular

The original and most mature Ionic integration. Ionic Angular uses Angular routing, Angular forms, and Angular dependency injection natively:

```bash
npm install -g @ionic/cli
ionic start myApp tabs --type=angular
```

### Ionic + React

Uses React Router (or IonReactRouter) for navigation, React state for app logic:

```bash
ionic start myApp tabs --type=react
```

### Ionic + Vue

Uses Vue Router, Vue Composition API, and Pinia for state:

```bash
ionic start myApp tabs --type=vue
```

All three integrations provide the same Ionic UI components — only the surrounding framework syntax differs.

## Adaptive Styling: iOS vs Android

One of Ionic's best features is automatic platform adaptation. The same component renders differently based on the detected platform:

- **iOS mode**: Rounded inputs, iOS-style back button text, blur-effect modals
- **Android (MD) mode**: Material Design shadows, FAB buttons, bottom sheets

You can force a mode for consistent branding:

```typescript
// Force Material Design on all platforms
setupIonicReact({ mode: 'md' });
```

Or use CSS variables to customize the design system:

```css
:root {
  --ion-color-primary: #3880ff;
  --ion-font-family: 'Inter', sans-serif;
  --ion-border-radius: 12px;
}
```

## Ionic AppFlow

Ionic AppFlow is the commercial CI/CD and DevOps platform for Ionic apps:

- **Live Updates**: Push JS/CSS changes to users without app store review (similar to EAS Update)
- **Automated Builds**: Cloud-based iOS and Android builds
- **Device Testing**: Test on real devices in the cloud
- **Deploy Channels**: Staging/production update channels

AppFlow is similar to Expo EAS but integrated with the Ionic ecosystem. Pricing starts at $49/month, making it expensive for solo developers — Expo EAS is often a better value for smaller teams.

## Ionic vs React Native for Web Developers

Ionic is frequently the first choice for web developers who want to build a mobile app without learning a new paradigm. The decision between Ionic and React Native often comes down to:

| Consideration | Ionic | React Native |
|---------------|-------|-------------|
| Existing web codebase | Reuse more code | Must rewrite UI |
| Native feel requirement | Good with tuning | Excellent |
| Team expertise | Web (HTML/CSS/JS) | React |
| Performance ceiling | Medium (WebView) | High (native) |
| PWA + native app | First-class | Native only |
| Time to first ship | Faster | Slower |

If your team knows Angular or Vue and wants to ship a mobile app quickly, Ionic is the most natural path. If you need React Native performance and your team already knows React, React Native with Expo is the better long-term foundation.

## Getting Started

```bash
# Install Ionic CLI
npm install -g @ionic/cli

# Create a new app
ionic start myApp tabs --type=react  # or angular, vue

# Serve in browser
ionic serve

# Add native platforms via Capacitor
ionic integrations enable capacitor
ionic build
npx cap add ios
npx cap add android
npx cap open ios
```
