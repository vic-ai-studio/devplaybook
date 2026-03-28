---
title: "Micro-Frontends in 2026: Patterns, Module Federation, and When to Use Them"
description: "A comprehensive guide to micro-frontend architecture in 2026 — Module Federation 2.0, single-spa, Nx monorepos, runtime integration patterns, team autonomy tradeoffs, performance costs, and practical examples for when micro-frontends make sense."
date: "2026-03-28"
tags: [micro-frontends, architecture, react, module-federation, javascript]
readingTime: "14 min read"
---

# Micro-Frontends in 2026: Patterns, Module Federation, and When to Use Them

Micro-frontends promised what microservices delivered for backends: team autonomy, independent deployments, and the ability to scale frontend development across large organizations. Six years into mainstream adoption, the pattern has proven itself — but also accumulated enough scars to be more careful about when and how to use it.

This guide covers what micro-frontends actually look like in practice in 2026: the dominant patterns, the tooling that's matured, the performance considerations you can't ignore, and an honest framework for deciding whether micro-frontends are the right architectural choice.

---

## What Are Micro-Frontends?

Micro-frontends apply microservice principles to the frontend. Instead of one large frontend application, you have multiple independent applications — each owned by a different team — that compose into a single user experience.

The core characteristics:
- **Independent deployability** — each frontend can be deployed without coordinating with other teams
- **Technology autonomy** — different teams can use different frameworks (React, Vue, Svelte) in theory
- **Team ownership** — a team owns an end-to-end vertical slice (backend + frontend)
- **Runtime or build-time composition** — pieces are assembled either at runtime in the browser or at build time

The appeal is clear for large organizations. The Netflix checkout team doesn't need to coordinate a release with the Netflix browse team. Amazon's product page team can ship independently of the cart team.

The cost is also real: more infrastructure complexity, performance overhead at integration boundaries, and shared state management that becomes genuinely hard.

---

## Integration Patterns

There are four main ways to integrate micro-frontends:

### 1. Build-Time Integration (npm packages)

Each micro-frontend is published as an npm package and imported as a dependency:

```json
// shell/package.json
{
  "dependencies": {
    "@myorg/checkout": "2.1.0",
    "@myorg/product-catalog": "5.0.3",
    "@myorg/user-profile": "1.8.1"
  }
}
```

**Tradeoff:** Simple to implement, but you lose independent deployability — you have to rebuild the shell app to update any micro-frontend. Not really micro-frontends in the truest sense, just a monorepo with good code separation.

**When to use:** Small to medium teams that want code organization benefits without deployment complexity.

### 2. iFrame Integration

Each micro-frontend renders in an iframe:

```html
<!-- Shell application -->
<div id="checkout">
  <iframe src="https://checkout.myapp.com/checkout-widget"
          width="100%"
          height="600px"
          sandbox="allow-scripts allow-forms allow-same-origin">
  </iframe>
</div>
```

**Tradeoff:** Perfect isolation and true independent deployment. But poor UX: separate scroll bars, separate browser history, hard to share state across iframes, accessibility issues.

**When to use:** Embedding genuinely third-party content (payment widgets, analytics dashboards from external vendors). Avoid for internal app composition.

### 3. JavaScript Runtime Integration

Each micro-frontend is a JavaScript bundle loaded at runtime. The shell app coordinates loading:

```javascript
// Shell application — dynamic script loading
async function loadMicroFrontend(name, containerId) {
  // Load the micro-frontend bundle
  await loadScript(`https://cdn.myapp.com/${name}/bundle.js`);

  // Mount it
  const container = document.getElementById(containerId);
  window[name].mount(container, { userId: getCurrentUser().id });
}

// When user navigates to checkout
await loadMicroFrontend("checkout", "app-container");

// When user navigates to profile
window.checkout?.unmount();
await loadMicroFrontend("profile", "app-container");
```

**Tradeoff:** True independent deployability, but requires careful coordination of global namespace, shared libraries (you don't want React loaded 4 times), and lifecycle management.

### 4. Module Federation (Webpack/Rspack)

Module Federation is the most sophisticated approach. It allows one JavaScript application to dynamically load code from another application at runtime, while sharing dependencies.

---

## Module Federation 2.0

**Webpack 5 Module Federation** (2020) was the first mature implementation. **Module Federation 2.0** (2023–2024) added significant improvements and is now the standard approach.

Key features of Module Federation 2.0:
- **Type-safe remote imports** — TypeScript types are shared across remote boundaries
- **Runtime plugins** — customize loading, error handling, and sharing behavior
- **Dynamic remotes** — resolve remote URLs at runtime (enable A/B testing of different versions)
- **Manifest-based discovery** — shell apps discover available remotes via a manifest
- **Rspack support** — works with the Rust-based Rspack bundler for faster builds

### Basic Module Federation Setup

**Remote application (product catalog team):**

```javascript
// webpack.config.js (remote app)
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "productCatalog",
      filename: "remoteEntry.js",
      exposes: {
        "./ProductGrid": "./src/components/ProductGrid",
        "./ProductDetail": "./src/components/ProductDetail",
        "./useProducts": "./src/hooks/useProducts",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
      },
    }),
  ],
};
```

**Shell application:**

```javascript
// webpack.config.js (shell app)
const { ModuleFederationPlugin } = require("webpack").container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        productCatalog: "productCatalog@https://catalog.myapp.com/remoteEntry.js",
        checkout: "checkout@https://checkout.myapp.com/remoteEntry.js",
        userProfile: "userProfile@https://profile.myapp.com/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, requiredVersion: "^18.0.0" },
        "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
      },
    }),
  ],
};
```

**Using remote components in the shell:**

```tsx
// src/App.tsx (shell app)
import React, { Suspense, lazy } from "react";

// These components live in separate deployable applications
const ProductGrid = lazy(() => import("productCatalog/ProductGrid"));
const Checkout = lazy(() => import("checkout/CheckoutFlow"));
const UserProfile = lazy(() => import("userProfile/ProfilePage"));

export function App() {
  const [currentView, setCurrentView] = React.useState<"catalog" | "checkout" | "profile">("catalog");

  return (
    <div className="app">
      <nav>
        <button onClick={() => setCurrentView("catalog")}>Catalog</button>
        <button onClick={() => setCurrentView("checkout")}>Checkout</button>
        <button onClick={() => setCurrentView("profile")}>Profile</button>
      </nav>

      <main>
        <Suspense fallback={<div>Loading...</div>}>
          {currentView === "catalog" && <ProductGrid />}
          {currentView === "checkout" && <Checkout />}
          {currentView === "profile" && <UserProfile />}
        </Suspense>
      </main>
    </div>
  );
}
```

The key insight: `ProductGrid` is loaded from `https://catalog.myapp.com` at runtime. The catalog team can deploy a new version without touching the shell app. React is shared — only one copy loaded.

### Module Federation with TypeScript

Module Federation 2.0 provides type-safe remote imports:

```bash
# Generate types from remote
npx @module-federation/dts-plugin generate-types --remote productCatalog

# This creates type definitions for all exposed modules
```

```typescript
// Shell app can now use remote components with full TypeScript support
import type { ProductGridProps } from "productCatalog/ProductGrid";
// Type errors surface at compile time across remote boundaries
```

---

## Single-SPA: The Framework-Agnostic Approach

**single-spa** is a router/orchestrator for micro-frontends that predates Module Federation. It registers applications and mounts/unmounts them based on URL.

```javascript
// root-config.js (single-spa setup)
import { registerApplication, start } from "single-spa";

registerApplication({
  name: "@myorg/navbar",
  app: () => import("@myorg/navbar"),
  activeWhen: ["/"],  // Always active
});

registerApplication({
  name: "@myorg/product-catalog",
  app: () => System.import("@myorg/product-catalog"),
  activeWhen: ["/catalog", "/product"],
});

registerApplication({
  name: "@myorg/checkout",
  app: () => System.import("@myorg/checkout"),
  activeWhen: "/checkout",
});

start({
  urlRerouteOnly: true,
});
```

single-spa uses SystemJS for module loading by default, though it can work with other loaders. Each registered application implements lifecycle hooks:

```javascript
// @myorg/product-catalog — React app as single-spa application
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

let root: ReactDOM.Root;

export async function bootstrap() {
  // Called once when app is first loaded
}

export async function mount(props: { domElement: HTMLElement }) {
  root = ReactDOM.createRoot(props.domElement);
  root.render(<App />);
}

export async function unmount() {
  root.unmount();
}
```

**single-spa vs Module Federation:**

| Aspect | single-spa | Module Federation |
|--------|------------|-------------------|
| Primary concern | Routing / lifecycle | Code sharing / loading |
| Framework support | Any (React, Vue, Angular, Svelte) | Any |
| Shared dependencies | Via import maps or SystemJS | Built-in `shared` config |
| Type safety | Manual | MF 2.0 automated |
| Maturity | Very mature (2018) | Mature (2020/2024) |
| Complexity | Higher orchestration complexity | Higher build config complexity |
| Best for | Large teams, multiple frameworks | Teams standardized on one bundler |

In practice, many large implementations use both: Module Federation for code sharing and single-spa (or a custom shell) for routing and lifecycle management.

---

## Nx Monorepos for Micro-Frontend Development

**Nx** has become the dominant monorepo tool for micro-frontend development. It provides:

- **Code sharing** — shared UI libraries, utilities, and types across applications
- **Affected builds** — only rebuild what changed
- **Module Federation generators** — scaffolding for MF host/remote setup
- **Remote caching** — Nx Cloud caches builds across CI runs and developer machines
- **Dependency graph** — visualize relationships between applications and libraries

```bash
# Create Nx workspace with micro-frontend setup
npx create-nx-workspace@latest myorg --preset=react

cd myorg

# Generate host (shell) application
nx generate @nx/react:host shell --remotes=catalog,checkout,profile

# Generate remote applications
nx generate @nx/react:remote catalog --host=shell
nx generate @nx/react:remote checkout --host=shell
nx generate @nx/react:remote profile --host=shell

# Nx auto-configures Module Federation for each app
```

The generated `module-federation.config.ts` for each remote:

```typescript
// apps/catalog/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'catalog',
  exposes: {
    './Module': './src/app/remote-entry.ts',
  },
};

export default config;
```

```bash
# Run all micro-frontends in development (one command)
nx run-many --target=serve --all

# Only rebuild affected apps
nx affected --target=build

# Visualize the dependency graph
nx graph
```

Nx's `affected` commands are where the productivity gain becomes concrete in a large monorepo: if you change the checkout application, Nx only rebuilds and retests checkout — not catalog, profile, or any unrelated libraries.

---

## Performance Tradeoffs

Micro-frontends have real performance costs that need to be understood and managed.

### The Duplication Problem

Without careful dependency sharing, each micro-frontend bundles its own copy of shared libraries:

```
Shell app:   react (45KB) + react-dom (130KB)
Catalog MF:  react (45KB) + react-dom (130KB)  ← duplicate
Checkout MF: react (45KB) + react-dom (130KB)  ← duplicate
Profile MF:  react (45KB) + react-dom (130KB)  ← duplicate

Total: 700KB of React (vs 175KB in a monolith)
```

Module Federation's `shared` configuration solves this:

```javascript
shared: {
  react: {
    singleton: true,    // Only one copy in memory
    eager: false,       // Lazy load when first needed
    requiredVersion: "^18.0.0"
  },
  "react-dom": { singleton: true, requiredVersion: "^18.0.0" },
  // Shared design system
  "@myorg/ui": { singleton: true }
}
```

With proper sharing configured, React loads once regardless of how many remotes are active.

### Network Waterfall

Each remote requires a network request to load. Without preloading, this creates waterfalls:

```
1. Load shell app (50ms)
2. Load remote entry manifests (3 × 20ms = 60ms serial)
3. Load remote chunks on demand (30ms each)
Total: ~170ms of extra latency
```

Mitigation strategies:

```html
<!-- Preload remote manifests in shell's index.html -->
<link rel="preload" href="https://catalog.myapp.com/remoteEntry.js" as="script">
<link rel="preload" href="https://checkout.myapp.com/remoteEntry.js" as="script">
<link rel="preload" href="https://profile.myapp.com/remoteEntry.js" as="script">
```

```javascript
// Shell app — eagerly fetch likely-needed remotes
import("productCatalog/ProductGrid"); // Start loading before user navigates
```

### Bundle Size Benchmarks

Typical size impact of micro-frontend architecture vs a well-optimized monolith:

| Metric | Monolith (optimized) | Micro-frontends (unoptimized) | Micro-frontends (optimized) |
|--------|---------------------|------------------------------|----------------------------|
| Initial JS load | 180KB | 450KB+ | 200KB |
| Time to interactive | 1.2s | 2.5s+ | 1.4s |
| Route transition | 50ms | 300ms+ | 80ms |
| Memory usage | 35MB | 80MB+ | 45MB |

The performance gap between "unoptimized MF" and "optimized MF" is large. Getting to the optimized state requires: proper dependency sharing, preloading, code splitting within each remote, and CDN caching of remote entries.

---

## Shared State and Communication

Cross-micro-frontend communication is one of the hardest parts of the architecture.

### Option 1: URL / Browser State

```javascript
// Most reliable: use URL for navigation state
window.history.pushState({}, "", "/checkout?product=abc123");

// Listen in receiving micro-frontend
window.addEventListener("popstate", handleNavigation);
```

### Option 2: Custom Events

```javascript
// Catalog MF — emit event when product added to cart
window.dispatchEvent(new CustomEvent("product:added-to-cart", {
  detail: { productId: "abc123", quantity: 1 }
}));

// Cart MF — listen for the event
window.addEventListener("product:added-to-cart", (event) => {
  updateCart(event.detail);
});
```

### Option 3: Shared State Store

```javascript
// shared-state/index.ts — published as shared library
import { createStore } from "zustand/vanilla";

export const cartStore = createStore<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
}));
```

```javascript
// Configured as singleton in Module Federation shared
shared: {
  "@myorg/shared-state": { singleton: true }
}
```

The singleton constraint ensures all micro-frontends see the same store instance.

---

## When to Use Micro-Frontends

### Good Fit

- **Large organizations with multiple teams** — when coordination cost between teams is higher than the infrastructure cost of micro-frontends
- **Independent deployment requirements** — compliance, reliability, or release cadence differences between features
- **Legacy migration** — strangler-fig pattern to incrementally replace a monolith
- **Different scaling requirements** — checkout needs 99.99% uptime, admin panel doesn't
- **Acquired products** — integrating a startup's frontend into an existing product

### Poor Fit

- **Small teams (< 4 engineers)** — the infrastructure cost is rarely worth it
- **Performance-critical applications** — the network overhead hurts; a well-optimized monolith wins
- **Highly interconnected UIs** — micro-frontends with complex shared state are harder to manage than a monolith
- **Startups or early-stage products** — the architecture optimizes for independent team velocity, which doesn't apply when there's one team

### The Decision Framework

Ask these questions:
1. Do you have multiple teams that would benefit from independent deployments? (If not, use a monorepo)
2. Is the coordination overhead between teams the actual bottleneck? (If not, fix the process)
3. Can you accept 1–3 months of infrastructure investment before seeing team velocity gains? (If not, wait)
4. Do you have the DevOps maturity to operate multiple deployed frontend services? (If not, build it first)

If all four answers are yes, micro-frontends will likely help. If any answer is no, start with a well-structured monorepo (Nx or Turborepo) and revisit later.

---

## State of the Ecosystem in 2026

| Tool | Status | Best For |
|------|--------|----------|
| Webpack 5 Module Federation | Stable, mature | Teams already on Webpack |
| Rspack + Module Federation | Production ready | Teams wanting faster builds |
| single-spa | Stable, widely deployed | Multi-framework environments |
| Nx | Industry standard for monorepos | Enterprise teams |
| Vite Module Federation | Maturing (vite-plugin-federation) | Teams on Vite |
| Turborepo | Strong alternative to Nx | Simpler monorepo needs |
| Qiankun | Popular in China | Vue + React mixed teams |

**The dominant production pattern in 2026:** Nx monorepo + Rspack Module Federation + custom shell router. Teams get monorepo DX benefits (shared code, affected builds) with runtime independence (teams deploy their remotes independently).

---

## Summary

Micro-frontends solve a real problem — independent team deployments at scale — but they're not a silver bullet and they're not cheap to implement well.

The pattern has matured significantly since 2020:
- Module Federation 2.0 provides type-safe remote imports and dynamic module loading
- Nx makes monorepo + micro-frontend development dramatically more ergonomic
- Rspack brings Module Federation builds from minutes to seconds
- The ecosystem has settled on clear patterns for shared state, performance optimization, and cross-app communication

The risk in 2026 is premature adoption: teams reaching for micro-frontends because the architecture is cool, before they've hit the actual organizational scaling problems it solves. For most projects, a well-structured Nx monorepo gives you 80% of the benefit at 20% of the cost.

When you do need micro-frontends — multiple teams, independent deployments, different release cadences — the tools are now mature enough to do it without writing framework infrastructure from scratch.
