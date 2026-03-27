---
title: "pnpm Workspaces Monorepo Guide 2026: Complete Setup with Examples"
description: "Master pnpm workspaces for monorepo development in 2026. Step-by-step setup guide with code examples, comparison with npm and Yarn workspaces, filtering, and CI best practices."
author: "DevPlaybook Team"
date: "2026-03-27"
readingTime: "10 min read"
tags: [pnpm, monorepo, nodejs]
---

# pnpm Workspaces Monorepo Guide 2026: Complete Setup with Examples

Managing multiple packages in a single repository used to mean juggling symlinks, fighting with `node_modules` duplication, and debugging workspace resolution issues. **pnpm workspaces** solve all of this — and in 2026, they remain the gold standard for lean, fast, and reliable monorepo setups.

This guide covers everything from first `pnpm-workspace.yaml` to production-ready CI pipelines.

## Why pnpm Workspaces?

Before diving into setup, let's answer the key question: why pnpm over npm or Yarn workspaces?

pnpm uses a **content-addressable store** and **hard links** instead of copying packages. In a monorepo with 10 packages that all depend on React 18, npm and Yarn install 10 copies. pnpm installs one — globally stored — and hard-links it everywhere.

| Feature | npm workspaces | Yarn workspaces | pnpm workspaces |
|---|---|---|---|
| Disk usage | High (copies) | Medium | Low (hard links) |
| Install speed | Slow | Fast | Fastest |
| Phantom deps | Yes | Yes | Blocked by default |
| Strict mode | No | No | Yes |
| `--filter` support | Limited | Limited | Full |
| Catalog support | No | No | Yes (pnpm 9+) |

The biggest architectural win: pnpm **prevents phantom dependencies** — packages that work in development because they happen to be hoisted, but fail in isolation or production.

## Prerequisites

```bash
# Install pnpm globally
npm install -g pnpm

# Or with corepack (Node 16.13+)
corepack enable
corepack prepare pnpm@latest --activate

# Verify
pnpm --version  # 9.x in 2026
```

## Project Structure

A well-organized pnpm monorepo typically looks like this:

```
my-monorepo/
├── pnpm-workspace.yaml     # workspace definition
├── package.json            # root package (private)
├── .npmrc                  # pnpm config
├── packages/
│   ├── ui/                 # shared component library
│   │   ├── package.json
│   │   └── src/
│   ├── utils/              # shared utilities
│   │   ├── package.json
│   │   └── src/
│   └── config/             # shared configs (eslint, tsconfig)
│       └── package.json
├── apps/
│   ├── web/                # Next.js app
│   │   ├── package.json
│   │   └── src/
│   └── api/                # Express/Fastify API
│       ├── package.json
│       └── src/
└── tools/
    └── scripts/            # internal tooling
        └── package.json
```

## Step 1: Initialize the Root

```bash
mkdir my-monorepo && cd my-monorepo
pnpm init
```

Edit `package.json` — the root package must be private:

```json
{
  "name": "my-monorepo",
  "version": "0.0.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "dev": "pnpm --parallel -r dev"
  }
}
```

## Step 2: Define the Workspace

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
  # Exclude test directories
  - '!**/test/**'
  - '!**/fixtures/**'
```

This tells pnpm which directories contain workspace packages. Glob patterns are supported.

## Step 3: Configure pnpm

Create `.npmrc` in the root:

```ini
# Use shamefully-hoist only if needed for legacy tools
# shamefully-hoist=true

# Strict mode: prevent phantom dependencies
node-linker=isolated

# Use workspace protocol for local packages
link-workspace-packages=true

# Auto-install peers
auto-install-peers=true

# Save exact versions
save-exact=true
```

> **Important**: Avoid `shamefully-hoist=true` unless you're migrating a legacy codebase. It disables pnpm's phantom-dependency protection.

## Step 4: Create Package Manifests

Each workspace package needs its own `package.json`. Here's the shared UI package:

```json
// packages/ui/package.json
{
  "name": "@my-org/ui",
  "version": "0.1.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

And the consuming app:

```json
// apps/web/package.json
{
  "name": "@my-org/web",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@my-org/ui": "workspace:*",
    "@my-org/utils": "workspace:*",
    "next": "14.x",
    "react": "^18.0.0"
  }
}
```

The `workspace:*` protocol is key — it tells pnpm to resolve this from the workspace, not from npm.

## Step 5: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Add a dependency to a specific package
pnpm --filter @my-org/web add react-query

# Add a dependency to all packages
pnpm -r add typescript --save-dev

# Add a local workspace package as a dependency
pnpm --filter @my-org/web add @my-org/ui
```

## The `--filter` Flag: Your Most Important Tool

`--filter` (shorthand `-F`) lets you scope commands to specific packages:

```bash
# Run build in one package
pnpm --filter @my-org/ui build

# Run tests in all packages matching pattern
pnpm --filter "@my-org/*" test

# Run in a package and its dependencies
pnpm --filter @my-org/web... build

# Run in a package and its dependents (reverse)
pnpm --filter ...@my-org/ui build

# Run in packages changed since main branch
pnpm --filter "[main]" build
```

The `...` syntax is powerful for dependency-aware execution — critical for CI pipelines where you only want to rebuild what actually changed.

## pnpm Catalogs (pnpm 9+)

Catalogs let you define shared dependency versions in `pnpm-workspace.yaml` and reference them across packages:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^18.3.0
  typescript: ^5.4.0
  vite: ^5.0.0

catalogs:
  react18:
    react: ^18.0.0
    react-dom: ^18.0.0
  react19:
    react: ^19.0.0
    react-dom: ^19.0.0
```

Reference in `package.json`:

```json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

This solves the version drift problem — one place to update React, all packages stay in sync.

## Shared TypeScript Configuration

Create `packages/config/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "bundler",
    "module": "ESNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Each package extends it:

```json
// packages/ui/tsconfig.json
{
  "extends": "@my-org/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

## Comparison: pnpm vs npm vs Yarn Workspaces

### npm workspaces

```json
// package.json (root)
{
  "workspaces": ["apps/*", "packages/*"]
}
```

npm workspaces hoist everything to the root `node_modules`. This is simple but causes phantom dependency issues — any package at the root is available to all packages whether declared or not.

**Best for**: Small teams, simple setups, when pnpm learning curve isn't worth it.

### Yarn workspaces (Classic v1)

```json
// package.json (root)
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

Similar to npm with slightly better tooling and `yarn workspace <name> <command>` syntax. Yarn Classic is deprecated.

### Yarn Berry (v2+)

Uses Plug'n'Play (PnP) — no `node_modules` at all. Files are stored in a `.yarn/cache` zip archive. Fast, zero-install compatible, but requires tool compatibility (some tools don't support PnP).

### pnpm workspaces

The winner for most teams in 2026:
- Fastest installs (content-addressable store)
- Smallest disk footprint (hard links, not copies)
- Strictest dependency isolation (no phantom deps)
- Best `--filter` implementation for selective builds

## CI/CD Setup

GitHub Actions example with pnpm caching:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for --filter "[main]"

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build changed packages
        run: pnpm --filter "[main]..." build

      - name: Test changed packages
        run: pnpm --filter "[main]..." test
```

The `--frozen-lockfile` flag ensures CI uses exactly the versions in `pnpm-lock.yaml` — no surprises from version ranges.

## Common Patterns

### Parallel Development

```bash
# Start all dev servers in parallel
pnpm --parallel -r dev

# Or with concurrently for nicer output
pnpm add -D concurrently -w
```

### Version Publishing

```json
// root package.json scripts
{
  "scripts": {
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

Using [Changesets](https://github.com/changesets/changesets) with pnpm workspaces is the standard for versioning and publishing packages.

### Internal Package Linking During Build

When `apps/web` imports from `packages/ui`, during development you want live changes to reflect immediately. Configure `tsconfig.json` paths:

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@my-org/ui": ["../../packages/ui/src/index.ts"]
    }
  }
}
```

This bypasses the built `dist/` folder during development and imports TypeScript source directly.

## Troubleshooting

**Issue: `Cannot find module '@my-org/ui'`**
- Run `pnpm install` from root to regenerate symlinks
- Check `package.json` exports field points to the right file
- Verify the package name in `pnpm-workspace.yaml` glob matches

**Issue: Peer dependency warnings flood the output**
```ini
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
```

**Issue: `shamefully-hoist` is needed for a legacy tool**
- Prefer `public-hoist-pattern[]` to hoist only what you need:
```ini
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

**Issue: Lockfile conflicts in PRs**
- Always commit `pnpm-lock.yaml`
- Use `pnpm install --merge-lockfile` after resolving merge conflicts

## Summary

pnpm workspaces in 2026 are mature, fast, and production-proven. The key advantages over alternatives:

1. **Hard links** = near-zero duplicate disk usage
2. **Strict isolation** = no phantom dependencies sneaking into builds
3. **`--filter` syntax** = precise control over which packages to build/test
4. **Catalogs** = centralized version management across packages
5. **Frozen lockfile** = reproducible CI builds

Start with the structure shown here, add Changesets for versioning, and wire up `--filter "[main]..."` in CI for fast, incremental builds. Your monorepo will scale from 5 packages to 50 without the chaos.

---

*Looking for a comparison of monorepo build tools? See our [Turborepo vs Nx guide](/blog/turborepo-vs-nx-monorepo-2026) for a deep dive into caching and task orchestration.*
