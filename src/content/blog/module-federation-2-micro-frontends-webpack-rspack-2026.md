---
title: "Module Federation 2.0: Micro-Frontends with Webpack 5 and Rspack 2026"
description: "Build scalable micro-frontend architectures with Module Federation 2.0. Setup host/remote apps with Webpack 5, Rspack, Next.js 15, and Vite for fast independent deployments."
pubDate: 2026-03-28
tags: ["module-federation", "micro-frontends", "webpack", "rspack", "architecture"]
---

Micro-frontends solve a real problem: large frontend codebases become slow to build, hard to coordinate across teams, and painful to deploy independently. Module Federation, introduced in Webpack 5 and now at version 2.0, is the most mature solution for sharing code between independently deployed frontend applications at runtime — without npm packages, without monorepos forcing lockstep releases.

This article covers everything you need to ship a production micro-frontend architecture in 2026.

## The Problem Module Federation Solves

Traditional frontend architecture puts everything in one repository. One team's change can break another team's feature. The build gets slower as the codebase grows. Deploying a small fix to a nav component means redeploying the entire app.

The naive alternative — separate apps with shared npm packages — creates a different problem: version drift. Team A is on `design-system@2.1`, Team B is on `2.3`, and now you have two versions of React running in production. Updates require coordination across every consumer before you can release.

Module Federation takes a different approach. It lets one JavaScript application expose modules, and another application consume them **at runtime**. The host app loads the remote's JavaScript bundle dynamically, with negotiated shared dependencies. No rebuild required. No version pinning across repos. Deploy the remote independently and the host picks it up immediately.

The tradeoffs are real: runtime loading adds complexity, debugging across app boundaries is harder, and you need a deployment infrastructure that can serve each remote from its own URL. But for teams above a certain size, the coordination cost of a monolith outweighs the operational overhead.

## Module Federation 2.0 vs 1.0

Module Federation 1.0 (Webpack 5) worked but had rough edges: TypeScript types weren't automatically shared, the manifest format was opaque, and Vite/Rspack support required third-party plugins with inconsistent behavior.

Module Federation 2.0 (the `@module-federation/core` package ecosystem) standardizes the protocol:

- **Manifest-based discovery** — each remote exposes a `mf-manifest.json` describing its exposed modules, shared dependencies, and entry points
- **First-class TypeScript** — `@module-federation/typescript` generates and fetches type declarations automatically
- **Runtime SDK** — programmatic control over federation at runtime (preloading, error handling, dynamic registration)
- **Framework agnostic** — Webpack 5, Rspack, Vite, and Rollup all supported through the same plugin API

## Setting Up Host and Remote Apps with Webpack 5

Install the updated plugin:

```bash
npm install @module-federation/enhanced
```

### Remote App (webpack.config.js)

The remote exposes components that the host can consume:

```js
// apps/product-detail/webpack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index',
  output: {
    publicPath: 'auto', // critical: lets webpack infer the remote's base URL
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'productDetail',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductCard': './src/components/ProductCard',
        './ProductGallery': './src/components/ProductGallery',
        './useProduct': './src/hooks/useProduct',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.0.0',
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.0.0',
        },
      },
    }),
  ],
};
```

### Host App (webpack.config.js)

The host declares where to find remotes and consumes their exposed modules:

```js
// apps/shell/webpack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

module.exports = {
  mode: 'production',
  entry: './src/index',
  output: {
    publicPath: 'auto',
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        productDetail: 'productDetail@https://products.example.com/remoteEntry.js',
        userProfile: 'userProfile@https://profile.example.com/remoteEntry.js',
        checkout: 'checkout@https://checkout.example.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

Consuming a remote component in the host:

```tsx
// apps/shell/src/pages/ProductPage.tsx
import React, { Suspense, lazy } from 'react';

const ProductCard = lazy(() => import('productDetail/ProductCard'));
const ProductGallery = lazy(() => import('productDetail/ProductGallery'));

export function ProductPage({ productId }: { productId: string }) {
  return (
    <Suspense fallback={<div>Loading product...</div>}>
      <ProductGallery productId={productId} />
      <ProductCard productId={productId} />
    </Suspense>
  );
}
```

Always wrap federated imports in `Suspense`. The module is loaded over the network — it is never synchronously available.

## Using Module Federation with Rspack

Rspack is a Rust-based bundler with Webpack-compatible configuration. Build times drop dramatically — often 5–10x faster than Webpack 5 for large applications. Module Federation 2.0 supports Rspack natively.

Install:

```bash
npm install @rspack/core @module-federation/enhanced
```

The Rspack config mirrors the Webpack config almost exactly:

```js
// apps/product-detail/rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  context: __dirname,
  entry: './src/index',
  output: {
    publicPath: 'auto',
  },
  builtins: {
    // Rspack handles React transform natively
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'productDetail',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductCard': './src/components/ProductCard',
        './ProductGallery': './src/components/ProductGallery',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
      // MF2 manifest support
      manifest: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
      },
    ],
  },
};
```

The `manifest: true` option generates `mf-manifest.json` alongside `remoteEntry.js`. This manifest enables Module Federation 2.0 features like automatic type fetching and preloading.

For the host with Rspack:

```js
// apps/shell/rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        productDetail: {
          type: 'module',
          name: 'productDetail',
          entry: 'https://products.example.com/remoteEntry.js',
          // MF2: use manifest for better type and preload support
          manifest: 'https://products.example.com/mf-manifest.json',
        },
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
};
```

## Dynamic Remotes — Loading at Runtime

Static remotes in config work well when remote URLs are known at build time. Real architectures often need runtime registration: feature flags, A/B testing, or environment-based routing.

Use the Module Federation 2.0 runtime SDK:

```ts
// apps/shell/src/federation-runtime.ts
import { init, loadRemote } from '@module-federation/runtime';

init({
  name: 'shell',
  remotes: [],
  shared: {
    react: {
      version: '18.3.0',
      lib: () => require('react'),
      shareConfig: { singleton: true, requiredVersion: '^18.0.0' },
    },
    'react-dom': {
      version: '18.3.0',
      lib: () => require('react-dom'),
      shareConfig: { singleton: true, requiredVersion: '^18.0.0' },
    },
  },
});

// Register a remote after init — from an API response, feature flag, etc.
export async function registerRemote(name: string, entry: string) {
  const { registerRemotes } = await import('@module-federation/runtime');
  registerRemotes([{ name, entry }], { force: true });
}

// Load a specific module from a dynamically registered remote
export async function loadModule<T>(remoteName: string, modulePath: string): Promise<T> {
  const module = await loadRemote<T>(`${remoteName}/${modulePath}`);
  if (!module) throw new Error(`Failed to load ${remoteName}/${modulePath}`);
  return module;
}
```

Calling this in a React component:

```tsx
// apps/shell/src/components/DynamicRemoteLoader.tsx
import React, { useEffect, useState } from 'react';
import { registerRemote, loadModule } from '../federation-runtime';

interface Props {
  remoteUrl: string;
  remoteName: string;
  moduleName: string;
  fallback: React.ReactNode;
}

export function DynamicRemoteLoader({ remoteUrl, remoteName, moduleName, fallback }: Props) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    registerRemote(remoteName, remoteUrl)
      .then(() => loadModule<{ default: React.ComponentType }>(remoteName, moduleName))
      .then((mod) => setComponent(() => mod.default))
      .catch(setError);
  }, [remoteUrl, remoteName, moduleName]);

  if (error) return <div>Failed to load remote: {error.message}</div>;
  if (!Component) return <>{fallback}</>;
  return <Component />;
}
```

This pattern supports canary deployments: serve a new remote URL to 5% of users while the rest get the stable version, with no host redeployment required.

## Shared Dependencies — Version Negotiation and Singleton Mode

Shared dependencies are the most important thing to get right. Getting them wrong results in multiple copies of React loading, which causes hook errors and subtle bugs that are hard to diagnose.

Key options for the `shared` config:

```js
shared: {
  react: {
    singleton: true,        // Only one instance allowed — throws if versions incompatible
    requiredVersion: '^18.0.0',  // Semver range this app requires
    eager: false,           // Don't include in initial chunk (load on demand)
    strictVersion: false,   // Warn instead of throw on version mismatch
  },
  lodash: {
    singleton: false,       // Multiple versions OK — each app gets its own
    requiredVersion: '^4.0.0',
  },
  '@company/design-system': {
    singleton: true,
    requiredVersion: '^3.0.0',
    // If version mismatch, force use of the highest version found
    eager: true,
  },
}
```

**Singleton mode** is mandatory for React, React DOM, and any context-based library (routing, state management). Without singleton mode, each federated app loads its own React — `useContext` breaks across boundaries because both apps are talking to different React instances.

**Version negotiation**: When multiple remotes share the same package, Module Federation selects the highest compatible version. If the host requires `react@^18.0.0` and a remote provides `react@18.3.0`, the runtime loads `18.3.0` and shares it. If a remote requires `react@^19.0.0` and it's incompatible, webpack throws a runtime error (with `strictVersion: true`) or warns and loads separately.

Diagnose shared dependency issues with:

```bash
# Check what's actually being loaded
WEBPACK_FEDERATION_DEBUG=1 node your-dev-server.js
```

Or in browser devtools: network tab, filter by `remoteEntry.js` and `chunk` files — duplicate React chunks appearing is a red flag.

## TypeScript Support with @module-federation/typescript

Without type support, consuming `import('productDetail/ProductCard')` gives you `any`. The `@module-federation/typescript` package fixes this.

In the **remote** app:

```js
// webpack.config.js or rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const { FederationTypesPlugin } = require('@module-federation/typescript');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({ /* ... */ }),
    new FederationTypesPlugin({
      // Generates types and serves them at /__federation_expose_types__
      exposeTypeScriptDeclaration: true,
    }),
  ],
};
```

In the **host** app:

```js
const { FederationTypesPlugin } = require('@module-federation/typescript');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({ /* ... */ }),
    new FederationTypesPlugin({
      // Downloads types from each remote's type endpoint
      downloadTypesPlugin: {
        remoteManifestUrls: {
          productDetail: 'https://products.example.com/mf-manifest.json',
        },
      },
    }),
  ],
};
```

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "productDetail/*": ["./@mf-types/productDetail/*"]
    }
  }
}
```

After running the dev server, type declarations appear in `./@mf-types/`. `import('productDetail/ProductCard')` now resolves to the actual exported types from the remote. Run `npx @module-federation/typescript fetch-types` in CI to keep types in sync.

## Federation with Next.js 15

Next.js 15 uses Turbopack by default, but falls back to Webpack for production builds. Module Federation works with the Webpack build path.

```bash
npm install @module-federation/nextjs-mf
```

In `next.config.ts`:

```ts
import type { NextConfig } from 'next';
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    if (!options.isServer) {
      config.plugins.push(
        new NextFederationPlugin({
          name: 'nextShell',
          remotes: {
            productDetail: `productDetail@https://products.example.com/remoteEntry.js`,
          },
          filename: 'static/chunks/remoteEntry.js',
          shared: {},
          extraOptions: {
            exposePages: true, // Expose Next.js pages as federated modules
            enableImageLoaderFix: true,
            enableUrlLoaderFix: true,
          },
        })
      );
    }
    return config;
  },
};

export default nextConfig;
```

Important: Next.js server components cannot consume federated modules directly — federation runs in the browser. Keep your remote consumption in client components (`'use client'`).

## Federation with Vite

Vite's native ES module architecture requires a different plugin. `@originjs/vite-plugin-federation` is the most stable option:

```bash
npm install @originjs/vite-plugin-federation --save-dev
```

Remote `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'productDetail',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductCard': './src/components/ProductCard',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext', // Required for top-level await in federation runtime
    minify: false,    // Easier debugging; enable in production
  },
});
```

Host `vite.config.ts`:

```ts
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        productDetail: 'https://products.example.com/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
  },
});
```

One caveat: `@originjs/vite-plugin-federation` and `@module-federation/enhanced` use different runtime protocols. A Vite remote and a Webpack host can interoperate, but you must use the classic `remoteEntry.js` format, not the MF2 manifest format. Stick to one bundler ecosystem per federation boundary when possible.

## Real-World Architecture Patterns

### Team Boundary Mapping

The most important architectural decision is where to draw boundaries. Module Federation enables independent deployment, but independent deployment requires clear ownership.

A practical pattern for an e-commerce platform:

```
shell (platform team)
├── Navigation (header, nav, footer)
├── Auth state (user context)
└── Routing skeleton

product-detail (catalog team)
├── ProductCard
├── ProductGallery
├── ProductReviews
└── useProduct hook

checkout (payments team)
├── CartSummary
├── CheckoutFlow
└── OrderConfirmation

user-profile (identity team)
├── ProfilePage
├── OrderHistory
└── AddressBook
```

Each team owns their remote end-to-end: the code, the CI/CD pipeline, and the deployment URL. The shell team owns the routing layer and the shared dependency versions.

### Shared Dependency Governance

Create a dedicated `federation-config` package that all apps import:

```js
// packages/federation-config/shared.js
module.exports = {
  react: { singleton: true, requiredVersion: '^18.3.0' },
  'react-dom': { singleton: true, requiredVersion: '^18.3.0' },
  'react-router-dom': { singleton: true, requiredVersion: '^6.20.0' },
  '@company/design-system': { singleton: true, requiredVersion: '^4.0.0' },
};
```

All webpack/rspack configs import from this package. Version bumps go through a single PR, enforcing coordinated upgrades for singleton dependencies.

### Deployment Strategy

Each remote deploys to a versioned path with an immutable URL, plus a `latest` alias:

```
https://cdn.example.com/remotes/product-detail/v2.4.1/remoteEntry.js  (immutable)
https://cdn.example.com/remotes/product-detail/latest/remoteEntry.js   (mutable)
```

The shell app points to `latest` in staging and to a specific pinned version in production. Production version pinning goes through a deployment manifest — a JSON file the shell reads at startup:

```json
{
  "remotes": {
    "productDetail": "https://cdn.example.com/remotes/product-detail/v2.4.1/remoteEntry.js",
    "checkout": "https://cdn.example.com/remotes/checkout/v1.9.3/remoteEntry.js"
  }
}
```

Updating a remote in production is now a manifest update — no shell redeployment needed. Combined with the dynamic runtime SDK shown earlier, the shell fetches this manifest on startup and registers remotes programmatically.

### Error Boundaries for Federation

Network failures happen. Wrap every federated import in an error boundary:

```tsx
import React from 'react';

interface State { hasError: boolean; error?: Error }

export class FederationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; remoteName: string },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[Federation] Remote "${this.props.remoteName}" failed:`, error);
    // Send to your error tracking (Sentry, Datadog, etc.)
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
```

Usage:

```tsx
<FederationErrorBoundary remoteName="checkout" fallback={<CheckoutUnavailable />}>
  <Suspense fallback={<Spinner />}>
    <CheckoutFlow />
  </Suspense>
</FederationErrorBoundary>
```

The fallback renders if the remote's CDN is down, the bundle has a parse error, or a shared dependency version is incompatible. Without this, one bad remote deploy takes down the entire shell.

## Performance Considerations

Module Federation adds a waterfall: the shell loads, fetches `remoteEntry.js` for each remote, then fetches the actual component chunks. Mitigate this with preloading:

```ts
import { init } from '@module-federation/runtime';

const mf = init({
  name: 'shell',
  remotes: [{ name: 'productDetail', entry: '...' }],
  shared: { /* ... */ },
});

// Preload remotes on idle, before the user navigates
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    mf.preloadRemote([
      { nameOrAlias: 'productDetail', exposes: [{ moduleInfo: { name: './ProductCard' } }] },
    ]);
  });
}
```

Also enable HTTP/2 Push or `<link rel="preload">` headers for `remoteEntry.js` files from your CDN. A 50ms preload can eliminate the perceived loading delay entirely on fast connections.

## When Not to Use Module Federation

Module Federation adds meaningful complexity. It is not the right choice for:

- Teams smaller than ~5 engineers per domain
- Applications where all features deploy together anyway
- Situations where a shared npm component library covers the sharing need
- Server-side rendering heavy architectures (Next.js App Router with RSC)

The sweet spot is medium-to-large organizations where independent deployment genuinely speeds up release cadence, and where team boundaries are stable enough to map onto remote boundaries.

For smaller teams, a well-structured monorepo with Turborepo or Nx, shared component packages, and a single deployment pipeline delivers most of the organizational benefit without the runtime complexity.

## Summary

Module Federation 2.0 with Webpack 5 or Rspack is production-ready in 2026. The MF2 ecosystem addresses the pain points of v1: TypeScript types are automatic, the manifest format enables better tooling, and the runtime SDK gives you programmatic control for dynamic registration and preloading.

The core setup — `ModuleFederationPlugin` on both host and remote, `singleton: true` for React, `publicPath: 'auto'` on remotes — handles 80% of use cases. The advanced patterns (dynamic remotes, deployment manifests, error boundaries) are what separate a working proof-of-concept from a production architecture you can operate at scale.
