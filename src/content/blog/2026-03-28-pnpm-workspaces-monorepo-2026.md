---
title: "pnpm Workspaces & Monorepo Best Practices 2026"
description: "Master pnpm workspaces for monorepo management: setup, filtering, shared packages, changesets versioning, catalog feature, and comparison with npm/yarn workspaces."
readingTime: "8 min read"
date: "2026-03-28"
tags: ["pnpm", "monorepo", "workspace", "package-manager"]
author: "DevPlaybook Team"
---

Monorepos have become the standard architecture for teams managing multiple related packages. In 2026, **pnpm Workspaces** is the go-to solution — combining strict dependency management, fast installs via content-addressable storage, and a workspace protocol that makes cross-package development seamless. This guide covers everything from initial setup to advanced versioning with Changesets and the new Catalog feature.

---

## Why pnpm for Monorepos

Before the setup, a quick justification. pnpm differentiates itself from npm and yarn in three ways that matter for monorepos:

1. **Hard links + content-addressable store**: Packages are stored once globally, hard-linked into `node_modules`. A 10-package monorepo shares one copy of React on disk.
2. **Strict dependency isolation**: pnpm's `node_modules` layout means packages can only access what they explicitly declare — no phantom dependency bugs.
3. **Native workspace protocol**: `workspace:*` references resolve at install time without publishing, unlike npm which requires published versions or file: hacks.

---

## Setting Up a pnpm Workspace

### Initialize the Monorepo

```bash
mkdir my-monorepo && cd my-monorepo
pnpm init
```

Create `pnpm-workspace.yaml` in the root:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

### Directory Structure

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json           # root — dev tooling only
├── apps/
│   ├── web/               # Next.js app
│   └── api/               # Fastify API
├── packages/
│   ├── ui/                # Shared component library
│   ├── utils/             # Shared utilities
│   └── config/            # ESLint/TS configs
└── tools/
    └── scripts/           # Monorepo maintenance scripts
```

### Root `package.json`

```json
{
  "name": "my-monorepo",
  "private": true,
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm --filter web dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "prettier": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Cross-Package Dependencies

Use `workspace:*` to reference local packages:

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@my-monorepo/ui": "workspace:*",
    "@my-monorepo/utils": "workspace:*"
  }
}
```

pnpm resolves `workspace:*` to the current local version at install and rewrites it to the actual version on publish.

---

## Filtering: Target Specific Packages

pnpm's `--filter` flag is one of its killer features for monorepos.

### Basic Filtering

```bash
# Run build in a specific package
pnpm --filter web build

# Run in all packages matching glob
pnpm --filter '@my-monorepo/*' build

# Run in all packages with a specific script
pnpm -r --if-present test
```

### Dependency-Aware Filtering

```bash
# Build the ui package and everything that depends on it
pnpm --filter '...@my-monorepo/ui' build

# Build ui and all its dependencies first
pnpm --filter '@my-monorepo/ui...' build

# Since a file changed (git-based)
pnpm --filter '[origin/main]' build
```

The `[origin/main]` filter is especially useful in CI — it only runs tasks for packages affected by changes since the last merge.

### Parallel Execution

```bash
# Build all packages in parallel (respects dependency graph)
pnpm -r --parallel build

# Stream output for easier debugging
pnpm -r --stream build
```

---

## Shared Packages

### Shared UI Components

```bash
# packages/ui/
pnpm init
```

```json
// packages/ui/package.json
{
  "name": "@my-monorepo/ui",
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
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --watch"
  }
}
```

### Shared ESLint Config

```js
// packages/config/eslint-base.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
  },
}
```

```json
// apps/web/.eslintrc.json
{
  "extends": ["@my-monorepo/config/eslint-base"]
}
```

### TypeScript Project References

For cross-package type checking without building:

```json
// tsconfig.json (root)
{
  "references": [
    { "path": "./packages/ui" },
    { "path": "./packages/utils" },
    { "path": "./apps/web" }
  ]
}
```

```json
// packages/ui/tsconfig.json
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

---

## Versioning with Changesets

[Changesets](https://github.com/changesets/changesets) is the standard versioning tool for pnpm monorepos.

### Setup

```bash
pnpm add -D @changesets/cli -w
pnpm changeset init
```

### Workflow

```bash
# Developer: add a changeset after making changes
pnpm changeset

# Select packages affected and bump type (major/minor/patch)
# Write a human-readable changelog entry
# Commit the .changeset/*.md file
```

```bash
# Release manager: version all packages
pnpm changeset version

# This updates package.json versions and CHANGELOG.md files
# Commit the version bumps

# Publish all changed packages
pnpm changeset publish
```

### Automated Releases via CI

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## The Catalog Feature (pnpm 9+)

The **Catalog** feature (introduced in pnpm 9) lets you define shared dependency versions in `pnpm-workspace.yaml`, eliminating version drift across packages.

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
  typescript: ^5.4.0
  zod: ^3.22.0
  '@tanstack/react-query': ^5.0.0
```

Reference catalog versions in any package:

```json
// apps/web/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "@tanstack/react-query": "catalog:"
  }
}
```

When you run `pnpm catalog update react`, it bumps the version in `pnpm-workspace.yaml` and all packages that reference it simultaneously — no more hunting for version mismatches.

### Named Catalogs

For projects with multiple React versions (e.g., legacy and modern):

```yaml
catalogs:
  react18:
    react: ^18.3.0
    react-dom: ^18.3.0
  react19:
    react: ^19.0.0
    react-dom: ^19.0.0
```

```json
{
  "dependencies": {
    "react": "catalog:react19"
  }
}
```

---

## pnpm vs npm vs Yarn Workspaces

| Feature | pnpm | npm | Yarn (Berry) |
|---|---|---|---|
| Disk usage | Best (hard links) | High | Medium (PnP) |
| Install speed | Fastest | Slowest | Fast (cache) |
| `--filter` support | Excellent | Basic | Good |
| Catalog feature | Yes (v9+) | No | No |
| Plug'n'Play | No | No | Yes (Berry) |
| Phantom deps | Blocked | Allowed | Blocked (PnP) |
| Ecosystem compat | Excellent | Excellent | Mixed (PnP) |

**npm workspaces** work fine for small monorepos but lack filtering power and allow phantom dependencies.

**Yarn Berry with PnP** eliminates `node_modules` entirely but suffers ecosystem compatibility issues — many tools still assume the `node_modules` structure.

**pnpm** hits the sweet spot: strict isolation without PnP compatibility headaches, the fastest installs, and the most powerful workspace tooling.

---

## Practical Tips

### Lock Node and pnpm Versions

```json
// package.json
{
  "engines": {
    "node": ">=20.11.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.1.0"
}
```

### Pre-install Hook

Prevent accidental npm/yarn installs:

```bash
# .npmrc
engine-strict=true
```

```js
// scripts/preinstall.js
if (!/pnpm/.test(process.env.npm_execpath || '')) {
  console.error('Use pnpm to install dependencies.')
  process.exit(1)
}
```

### turbo for Task Orchestration

For large monorepos, combine pnpm workspaces with **Turborepo** for task caching:

```bash
pnpm add -D turbo -w
```

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

---

## Key Takeaways

- **pnpm workspaces** with `pnpm-workspace.yaml` is the fastest monorepo setup in 2026
- `workspace:*` protocol handles cross-package references without publishing
- `--filter` with dependency-awareness (`...package` / `package...`) makes CI surgical
- **Changesets** is the standard for versioning and changelog management
- **Catalog** (pnpm 9+) solves version drift across packages declaratively
- pnpm beats npm and Yarn workspaces on speed, strictness, and tooling maturity
