---
title: "pnpm Workspaces Monorepo 2026: Complete Setup, Scripts, and CI Guide"
description: "Build a production-ready monorepo with pnpm workspaces in 2026. Learn workspace setup, package sharing, filtering, versioning, and GitHub Actions CI from scratch with real examples."
author: "DevPlaybook Team"
date: "2026-03-28"
readingTime: "13 min read"
tags: ["pnpm", "monorepo", "nodejs", "typescript", "ci", "workspace"]
---

# pnpm Workspaces Monorepo 2026: Complete Setup, Scripts, and CI Guide

A monorepo puts multiple packages in one repository — shared code, apps, and tools all together. pnpm workspaces make this approach practical: faster installs than npm, strict dependency isolation, and first-class workspace filtering that npm and Yarn lack.

This guide covers building a production-ready monorepo from scratch: workspace config, TypeScript setup, cross-package imports, versioning, and CI pipelines.

## Why pnpm for Monorepos?

The core advantage is pnpm's **content-addressable storage**: packages are stored once on disk and hard-linked into each workspace. A monorepo with 5 apps that all depend on React 18 stores React once — not five times.

| Feature | npm workspaces | Yarn Berry | pnpm workspaces |
|---|---|---|---|
| Disk usage | High (copies) | PnP (complex) | Low (hard links) |
| Install speed | Slow | Fast | Fastest |
| Phantom deps | Allowed | Depends on mode | Blocked |
| `--filter` | Basic | Good | Full |
| Catalog support | No | No | Yes (v9+) |
| Zero-install | No | Yes | No |
| Strict by default | No | No | Yes |

**Phantom dependencies** are the hidden risk in non-pnpm setups. If `app-a` installs `lodash`, and `app-b` imports lodash without declaring it, everything works in development — because lodash is hoisted. But if `app-a` removes lodash, `app-b` silently breaks. pnpm blocks this at the install stage.

## Project Structure

A typical pnpm monorepo:

```
my-monorepo/
├── pnpm-workspace.yaml    # workspace definition
├── package.json           # root manifest
├── tsconfig.base.json     # shared TypeScript config
├── .npmrc                 # pnpm settings
├── packages/
│   ├── ui/                # shared React component library
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   ├── utils/             # shared utility functions
│   │   ├── package.json
│   │   └── src/
│   └── config/            # shared ESLint/TypeScript configs
│       └── package.json
├── apps/
│   ├── web/               # Next.js web app
│   │   ├── package.json
│   │   └── src/
│   └── docs/              # documentation site
│       ├── package.json
│       └── src/
└── tools/
    └── scripts/           # build/release automation
```

## Initial Setup

### 1. Install pnpm

```bash
# Via npm (one-time)
npm install -g pnpm

# Or via corepack (recommended — node-version-aware)
corepack enable
corepack prepare pnpm@latest --activate
```

### 2. Create Root Package

```bash
mkdir my-monorepo && cd my-monorepo
pnpm init
```

Edit `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r exec -- rm -rf dist .turbo node_modules/.cache"
  }
}
```

### 3. Workspace Configuration

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
```

Glob patterns support nested structures:

```yaml
packages:
  - 'apps/**'     # all apps, including subdirectories
  - 'packages/*'
  - '!**/test/**' # exclude test directories
```

### 4. pnpm Settings

Create `.npmrc` at the root:

```ini
# Link workspace packages
link-workspace-packages=true

# Strict mode — fail if packages have dependency issues
strict-peer-dependencies=false
auto-install-peers=true

# Hoist only specific packages (keep node_modules clean)
public-hoist-pattern[]=*types*
public-hoist-pattern[]=eslint*
public-hoist-pattern[]=prettier

# Don't hoist everything (default npm/yarn behavior)
shamefully-hoist=false
```

`shamefully-hoist=false` is the key setting. It prevents phantom dependencies by not hoisting all packages to the root `node_modules`.

## Creating Workspace Packages

### Shared Utilities Package

```bash
mkdir -p packages/utils
cd packages/utils
pnpm init
```

`packages/utils/package.json`:

```json
{
  "name": "@myorg/utils",
  "version": "0.1.0",
  "private": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "dev": "tsup src/index.ts --watch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
```

### Shared UI Component Library

```bash
mkdir -p packages/ui
cd packages/ui
pnpm init
```

`packages/ui/package.json`:

```json
{
  "name": "@myorg/ui",
  "version": "0.1.0",
  "private": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "scripts": {
    "build": "tsup src/index.tsx --format esm,cjs --dts --external react",
    "dev": "tsup src/index.tsx --watch --external react",
    "test": "vitest run"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "react": "^18.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
```

### App Package

`apps/web/package.json`:

```json
{
  "name": "@myorg/web",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:*",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

The `workspace:*` protocol tells pnpm to link the local workspace version instead of fetching from npm.

## Installing Dependencies

```bash
# Install all workspace packages
pnpm install

# Add a dependency to a specific workspace
pnpm --filter @myorg/web add axios
pnpm --filter @myorg/utils add -D tsup

# Add a dependency to root (affects all packages)
pnpm add -w typescript

# Add a workspace package as a dependency
pnpm --filter @myorg/web add @myorg/utils
```

pnpm creates symlinks in `node_modules` pointing to the workspace packages — changes in `packages/utils/src` are immediately available in `apps/web` without rebuilding.

## TypeScript Configuration

Base config at `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

Package-level `tsconfig.json` in `packages/utils/`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

For TypeScript project references (enables incremental builds):

```json
// tsconfig.json at root
{
  "references": [
    { "path": "packages/utils" },
    { "path": "packages/ui" },
    { "path": "apps/web" }
  ],
  "files": []
}
```

Build all referenced projects in dependency order:

```bash
tsc --build
```

## Filtering Commands

pnpm's `--filter` flag is the most powerful feature for monorepo workflows.

```bash
# Run command in a specific package
pnpm --filter @myorg/utils build
pnpm --filter web dev

# Run command in all packages matching a pattern
pnpm --filter '@myorg/*' test

# Run in a package AND its dependencies
pnpm --filter @myorg/web... build

# Run in a package AND packages that depend on it
pnpm --filter ...@myorg/utils build

# Run in changed packages (since main branch)
pnpm --filter '[main]' test

# Combine: changed packages and their dependents
pnpm --filter '...[main]' test

# Exclude a package
pnpm --filter '!@myorg/docs' build
```

The `...[main]` pattern is especially useful in CI: only test packages that changed, plus anything that depends on them.

## pnpm Catalog (v9+)

Catalogs let you define dependency versions once at the root and reference them across packages:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^18.3.0
  typescript: ^5.4.0
  vitest: ^1.6.0
  tsup: ^8.0.0
```

Then in any package:

```json
{
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:",
    "tsup": "catalog:"
  }
}
```

Upgrade all packages to a new React version in one place:

```yaml
catalog:
  react: ^19.0.0  # Update here → applies everywhere
```

## Versioning and Publishing

### Independent Versioning with Changesets

```bash
npm install -D @changesets/cli -w
pnpm changeset init
```

Workflow:

```bash
# After making changes, describe them
pnpm changeset

# This prompts:
# 1. Which packages changed?
# 2. Is it a major/minor/patch change?
# 3. What changed? (for changelog)

# Bump versions based on changesets
pnpm changeset version

# Publish to npm
pnpm changeset publish
```

`package.json` scripts:

```json
{
  "scripts": {
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

## CI with GitHub Actions

### Efficient CI with Filtering

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for --filter '[main]'

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      # Build packages that changed (and their dependents)
      - run: pnpm --filter '...[origin/main]' build

      # Test packages that changed
      - run: pnpm --filter '[origin/main]' test

  # Separate job for type checking
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
```

### Publishing Workflow

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
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Common Patterns

### Shared ESLint Config

```bash
mkdir -p packages/eslint-config
```

`packages/eslint-config/package.json`:

```json
{
  "name": "@myorg/eslint-config",
  "version": "0.1.0",
  "main": "index.js",
  "devDependencies": {
    "eslint": "^9.0.0"
  }
}
```

`packages/eslint-config/index.js`:

```javascript
module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
  },
}
```

Then in any app:

```json
// apps/web/.eslintrc.json
{
  "extends": ["@myorg/eslint-config"]
}
```

### Dev Mode: Running All Packages in Parallel

```json
// root package.json
{
  "scripts": {
    "dev": "pnpm --parallel -r dev"
  }
}
```

`--parallel` runs all matching scripts simultaneously, streaming output with package name prefixes.

## Troubleshooting

**Packages not finding workspace dependencies:**

```bash
# Make sure link-workspace-packages is set in .npmrc
echo "link-workspace-packages=true" >> .npmrc
pnpm install
```

**TypeScript not resolving workspace imports:**

Ensure `paths` is configured or use `composite: true` with project references:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@myorg/*": ["./packages/*/src/index.ts"]
    }
  }
}
```

**`workspace:*` not resolving during publish:**

pnpm automatically replaces `workspace:*` with the actual version on publish. No manual step required.

**Circular dependency errors:**

Check with `pnpm why <package>` to trace the dependency chain. Circular deps between workspace packages are blocked at install time.

## Key Takeaways

- **`pnpm-workspace.yaml`** defines which directories are workspace packages
- **`workspace:*`** protocol links local packages without publishing
- **`--filter` flag** is pnpm's killer feature — run commands on subsets of packages
- **`.npmrc` with `shamefully-hoist=false`** prevents phantom dependencies
- **pnpm Catalog** (v9+) centralizes version management across the monorepo
- **Changesets** handles versioning and changelog generation automatically
- **`--filter '[main]'`** in CI limits work to changed packages — dramatically faster pipelines

pnpm workspaces give you the discipline of isolated packages with the convenience of a single repository. For teams shipping multiple apps that share significant code, it's the most practical monorepo setup available today.
