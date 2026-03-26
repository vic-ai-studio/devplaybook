---
title: "Micro-Frontends Architecture: When and How to Split Your Frontend"
description: "A complete guide to micro-frontend architecture in 2026—Module Federation, single-spa, Web Components, server-side composition, shared state, CSS isolation, performance trade-offs, and when NOT to split."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["micro-frontends", "architecture", "module-federation", "single-spa", "webpack", "frontend"]
readingTime: "16 min read"
category: "architecture"
---

Most frontend architecture decisions get made when teams are small and products are young. A single React app, one deployment pipeline, one team—it works. Then the team grows. Then a second team starts owning a different part of the product. Then deployments become coordination problems. A bug fix in the checkout flow requires a full release of the marketing site.

Micro-frontends are the answer to this specific problem. They apply microservices thinking to the frontend: split the application into independently deployable pieces, each owned by a different team. But they introduce real complexity—shared state, CSS isolation, performance overhead, and operational burden. This guide explains what you actually gain, how the main approaches work, and when you should not bother.

---

## What Problem Micro-Frontends Solve

Micro-frontends solve two problems that compound as organizations scale:

### 1. Team Coupling Through the Frontend

When multiple teams share a single frontend codebase, they step on each other:

- Shared CI/CD pipeline means one flaky test blocks everyone's deployment
- Component library changes require coordination across teams
- A breaking TypeScript change in one area fails another team's build
- Merging PRs from 6 teams creates a bottleneck at code review

The root cause is *organizational coupling* manifested as technical coupling. The frontend becomes a deployment monolith.

### 2. Independent Deployment Velocity

The checkout team shouldn't need to coordinate with the product catalog team to deploy. Micro-frontends let each team deploy their slice independently at their own cadence.

```
Monolith deployment:
  Team A change → wait for Team B, C, D → release → QA → production

Micro-frontend deployment:
  Team A change → Team A CI → Team A canary → production (independently)
```

### What They Don't Solve

Micro-frontends don't solve:
- Poor code quality within a team
- Performance problems introduced by framework bloat
- Design inconsistency (that's a design system problem)
- Lack of shared component library (that's still needed)

---

## Architecture Patterns

There are four main approaches to composing micro-frontends. Each has different trade-offs on autonomy vs. consistency.

```
Composition strategies:

Build-time:    [App Shell] bundles [MFE A] + [MFE B] together
               ↓ tight coupling, simple setup

Run-time:      [App Shell] loads [MFE A] and [MFE B] dynamically
  ├── Module Federation (webpack/Rspack)
  ├── single-spa framework
  └── Web Components

Server-side:   [CDN/Nginx] composes HTML fragments from multiple services
  ├── Edge Side Includes (ESI)
  └── Tailor (Node.js server-side composition)
```

---

## Module Federation (Webpack 5 + Rspack)

Module Federation lets one application dynamically import modules from another application at runtime. It's the most widely adopted approach for JavaScript micro-frontends.

### How It Works

```
Host App                    Remote App (checkout)
  |                              |
  |-- loads at runtime ----------|
  |   checkout/remoteEntry.js    |
  |                              |
  |   uses exposed:              |
  |   - CheckoutWidget           |
  |   - CartStore                |
```

### Configuration

**Remote (the app that exposes modules):**

```javascript
// webpack.config.js — checkout team's app
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: {
        './CheckoutWidget': './src/CheckoutWidget',
        './CartStore': './src/store/cart',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

**Host (the shell that consumes remotes):**

```javascript
// webpack.config.js — app shell
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        // Can be static or loaded dynamically from a manifest
        checkout: 'checkout@https://checkout.yourapp.com/remoteEntry.js',
        catalog: 'catalog@https://catalog.yourapp.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

**Consuming in the host:**

```tsx
// Shell app component
import React, { Suspense } from 'react';

// TypeScript: declare the module for the remote
declare module 'checkout/CheckoutWidget' {
  const CheckoutWidget: React.ComponentType<{ userId: string }>;
  export default CheckoutWidget;
}

const CheckoutWidget = React.lazy(() => import('checkout/CheckoutWidget'));

export function App() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutWidget userId="u123" />
    </Suspense>
  );
}
```

### Rspack: Faster Module Federation

Rspack is a Rust-based webpack-compatible bundler. It supports Module Federation with near-identical configuration but significantly faster build times:

```javascript
// rspack.config.js
const { ModuleFederationPlugin } = require('@rspack/core').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      // Same configuration as webpack
      name: 'checkout',
      filename: 'remoteEntry.js',
      exposes: {
        './CheckoutWidget': './src/CheckoutWidget',
      },
      shared: { react: { singleton: true } },
    }),
  ],
};
```

### Dynamic Remote Loading

Hard-coding remote URLs in webpack config is inflexible. Load them from a manifest instead:

```typescript
// Manifest-driven remote loading
interface RemoteManifest {
  [name: string]: { url: string; scope: string; module: string };
}

async function loadRemote(manifest: RemoteManifest, name: string) {
  const { url, scope, module } = manifest[name];

  // Load the remote entry script
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // Initialize the container
  await (window as any)[scope].init(__webpack_share_scopes__.default);

  // Get the factory
  const factory = await (window as any)[scope].get(module);
  return factory();
}
```

---

## single-spa Framework

single-spa is a framework for orchestrating multiple frontend frameworks on the same page. It's framework-agnostic—you can mix React, Vue, Angular, and Svelte apps on a single page.

### Core Concepts

```
single-spa root config (orchestrator)
  ├── registers applications by URL patterns
  ├── React app → /catalog/**
  ├── Vue app   → /checkout/**
  └── Angular   → /account/**
```

### Root Config

```javascript
// root-config.js
import { registerApplication, start } from 'single-spa';

registerApplication({
  name: '@yourorg/catalog',
  app: () => System.import('@yourorg/catalog'),
  activeWhen: ['/catalog'],
});

registerApplication({
  name: '@yourorg/checkout',
  app: () => System.import('@yourorg/checkout'),
  activeWhen: ['/checkout'],
});

start();
```

### Application Lifecycle

Each registered app exports lifecycle functions:

```tsx
// React app with single-spa lifecycle
import React from 'react';
import ReactDOM from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import App from './App';

const lifecycles = singleSpaReact({
  React,
  ReactDOM,
  rootComponent: App,
  errorBoundary(err, info, props) {
    return <div>Catalog failed to load</div>;
  },
});

export const { bootstrap, mount, unmount } = lifecycles;
```

single-spa is mature and battle-tested but has higher conceptual overhead than Module Federation. It's particularly useful when you have multiple frontend frameworks in the same product.

---

## Web Components Approach

Web Components (Custom Elements + Shadow DOM) provide browser-native encapsulation. Any framework can consume them; they're just HTML elements.

```typescript
// Define a micro-frontend as a Web Component
class CheckoutWidget extends HTMLElement {
  private root: ShadowRoot;

  connectedCallback() {
    this.root = this.attachShadow({ mode: 'open' });
    this.render();
  }

  attributeChangedCallback(name: string, _old: string, newValue: string) {
    if (name === 'user-id') this.render();
  }

  static get observedAttributes() {
    return ['user-id'];
  }

  private render() {
    const userId = this.getAttribute('user-id') ?? '';
    // Mount React/Vue/Svelte component into shadow root
    const container = document.createElement('div');
    this.root.innerHTML = '';
    this.root.appendChild(container);

    // e.g., React 18
    ReactDOM.createRoot(container).render(<CheckoutApp userId={userId} />);
  }
}

customElements.define('checkout-widget', CheckoutWidget);
```

```html
<!-- Usage in any framework or plain HTML -->
<checkout-widget user-id="u123"></checkout-widget>
```

**Trade-offs:**
- CSS is fully isolated via Shadow DOM — no leakage between micro-frontends
- Framework-agnostic consumption
- Event communication requires CustomEvents (verbose compared to props)
- SSR support is improving but still limited compared to regular frameworks

---

## Server-Side Composition

Client-side composition loads JavaScript bundles and assembles the page in the browser. Server-side composition assembles HTML on the server before delivery — better for initial page load and SEO.

### Edge Side Includes (ESI)

ESI is a markup language for instructing CDN or reverse proxy to stitch HTML fragments:

```html
<!-- Assembled by CDN/Varnish/Fastly -->
<html>
<body>
  <esi:include src="https://header.internal/fragment" />

  <main>
    <esi:include src="https://catalog.internal/product-grid?category=shoes" />
  </main>

  <esi:include src="https://checkout.internal/cart-widget" />
</body>
</html>
```

Each fragment is served by a separate service, cached independently. ESI is supported by Varnish, Fastly, and Akamai.

### Tailor (Zalando)

Tailor is a Node.js server that does server-side composition with streaming:

```javascript
const Tailor = require('node-tailor');
const tailor = new Tailor({
  templatesPath: './templates',
});

app.get('/product', (req, res) => {
  tailor.requestHandler(req, res);
});
```

```html
<!-- templates/product.html -->
<html>
<body>
  <fragment src="http://header-service/header" primary />
  <fragment src="http://catalog-service/product-detail?id={{params.id}}" primary />
  <fragment src="http://recommendation-service/recommendations" async />
</body>
</html>
```

Tailor streams fragments concurrently — non-critical fragments (`async`) don't block the primary content.

---

## Shared State and Routing

### The Problem

Each micro-frontend is isolated. How does the checkout widget know the current user? How does a filter action in the catalog update the URL?

### Options

**1. URL as shared state.** The most reliable approach. Use query parameters and URL segments as the source of truth. Each MFE reads from and writes to the URL.

```typescript
// Publish state via URL
function navigateWithState(filters: FilterState) {
  const params = new URLSearchParams(filters as any);
  history.pushState(null, '', `?${params}`);
}

// Read state from URL (works in any MFE)
function getFilters(): FilterState {
  return Object.fromEntries(new URLSearchParams(location.search));
}
```

**2. Custom events on window.** Loosely coupled communication between MFEs:

```typescript
// Publisher (catalog MFE)
window.dispatchEvent(new CustomEvent('cart:item-added', {
  detail: { productId: 'p123', quantity: 1 },
  bubbles: true,
}));

// Subscriber (checkout MFE)
window.addEventListener('cart:item-added', (e: CustomEvent) => {
  updateCartCount(e.detail.quantity);
});
```

**3. Shared state via Module Federation.** Expose a store from a dedicated `shared` remote:

```typescript
// shared remote exposes
// ./UserStore, ./CartStore

// Both catalog and checkout import from the same instance
import { userStore } from 'shared/UserStore';
```

This works but creates implicit coupling between MFEs through the shared module.

### Routing

Each MFE typically handles its own routes but needs to respect the shell's routing:

```typescript
// Shell app — delegates routing to MFEs
const routes = [
  { path: '/catalog/*', component: lazy(() => import('catalog/App')) },
  { path: '/checkout/*', component: lazy(() => import('checkout/App')) },
  { path: '/account/*', component: lazy(() => import('account/App')) },
];

// Within each MFE — use relative routing
// catalog MFE handles /catalog/shoes, /catalog/bags, etc.
```

---

## CSS Isolation

CSS in a monolith leaks. In a micro-frontend architecture, styles from one team's component can override another's. There are several isolation strategies:

### CSS Modules (Build-Time)

```css
/* checkout.module.css */
.button { background: blue; }
```

```tsx
import styles from './checkout.module.css';
// Compiled to: .button_abc123 { background: blue; }
// No collision possible
```

### Shadow DOM (Runtime)

As shown in the Web Components section, Shadow DOM provides hard CSS isolation. Styles inside a shadow root don't leak out; global styles don't leak in.

```javascript
const shadow = element.attachShadow({ mode: 'open' });
shadow.innerHTML = `
  <style>
    /* Completely isolated — won't affect the rest of the page */
    .button { background: blue; }
  </style>
  <button class="button">Pay Now</button>
`;
```

### CSS-in-JS with Namespacing

```typescript
// Each MFE adds a namespace prefix
const CheckoutButton = styled.button`
  /* checkout-team-specific styles */
  background: blue;
  &:hover { background: darkblue; }
`;
// Generates unique class names — no collision
```

### BEM with Team Prefixes (Low-Tech)

```css
/* Naming convention: [team]-[component]-[element] */
.checkout-cart-button { }
.checkout-cart-button--disabled { }
.catalog-filter-panel { }
```

---

## Performance Trade-offs

Micro-frontends have real performance costs. Know them before you commit.

### Bundle Duplication

Without shared dependencies, each MFE ships its own copy of React, React-DOM, and shared utilities:

```
Without sharing:
  shell bundle:    React (45KB) + shell code
  catalog bundle:  React (45KB) + catalog code
  checkout bundle: React (45KB) + checkout code
  Total React: 135KB

With Module Federation shared:
  One React instance: 45KB
  Total: 45KB
```

**Always configure `shared` in Module Federation for major dependencies.** Especially `react`, `react-dom`, and your design system library.

### Network Waterfalls

```
Without lazy loading:
  Browser → shell → loads all MFE bundles in parallel ✓

With dynamic loading:
  Browser → shell → user navigates → loads MFE bundle → render
             ↑ extra network round-trip per navigation
```

Preload critical path MFEs:

```html
<!-- Preload bundles likely to be used soon -->
<link rel="prefetch" href="https://checkout.yourapp.com/remoteEntry.js" />
```

### Overhead Summary

| Approach | Initial Load | Nav Speed | Complexity |
|----------|-------------|-----------|------------|
| Module Federation | Medium | Fast (with prefetch) | Medium |
| single-spa | Low | Medium | High |
| Web Components | Low–Medium | Fast | Medium |
| SSR composition | Low (streamed) | Full page load | High |

---

## When NOT to Use Micro-Frontends

Micro-frontends are not always the right answer. Avoid them when:

**Your team is small (< 5 frontend engineers).** The operational overhead isn't justified. A well-organized monolith with clear module boundaries achieves the same separation without the complexity.

**You don't have independent deployment requirements.** If all teams release together anyway, you don't get the key benefit. You just get the complexity.

**Your product has high design consistency requirements.** Micro-frontends make it harder to ensure pixel-perfect consistency. You need a strong design system and component library to compensate.

**You're starting from scratch.** Begin with a modular monolith. Extract micro-frontends when you actually hit the team-coupling problem, not before.

**Your application is performance-sensitive and serves mobile users.** Extra JavaScript bundles, network round-trips, and hydration complexity hurt performance on constrained devices. SSR composition mitigates this, but adds backend complexity.

---

## Real-World Patterns

**Strangler Fig Pattern:** Incrementally replace a monolith by routing specific URLs to new micro-frontends while the old app handles the rest. The monolith shrinks over time.

```nginx
# nginx routes new paths to new MFEs, legacy to old app
location /checkout/ {
  proxy_pass https://checkout-mfe.internal;
}

location / {
  proxy_pass https://legacy-app.internal;
}
```

**Shell + Route-Based Split:** One shell app owns routing and loads MFE apps based on the active route. The most common pattern—each team owns a URL namespace.

**Widget-Based Split:** Multiple MFEs on the same page (header, main content, sidebar, footer owned by different teams). More complex—requires careful CSS isolation and shared state handling.

---

## Getting Started Checklist

Before splitting your frontend:

- [ ] You have at least 2–3 teams that step on each other in the monolith
- [ ] Teams have clear ownership of URL namespaces or domain areas
- [ ] You have a shared design system or component library
- [ ] CI/CD pipelines can be set up per team
- [ ] You've chosen a composition strategy (Module Federation recommended for most)
- [ ] You have a plan for shared dependencies (react, design system)
- [ ] You have a cross-MFE communication contract (custom events, URL)
- [ ] You have a monitoring strategy that covers multiple deployment units

Use the [DevPlaybook Architecture Tools](https://devplaybook.cc/tools) to diagram your micro-frontend topology and validate JSON configuration for Module Federation manifests with the [JSON Formatter](https://devplaybook.cc/tools/json-formatter).

---

Micro-frontends solve the team-scaling problem that a well-organized monolith can't. Module Federation is the right default choice for most teams—it integrates with existing webpack/Rspack builds and provides the best balance of power and simplicity. Start with route-based splitting, add the Redis pub/sub shared state pattern as you grow, and only introduce server-side composition when SEO and initial load performance demand it.
