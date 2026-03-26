---
title: "Turborepo Monorepo Complete Guide 2026: Setup, Caching, and CI/CD"
description: "Stop rebuilding everything on every commit. This complete Turborepo guide covers workspace setup, remote caching, pipeline configuration, Nx vs Turborepo comparison, and a full GitHub Actions CI integration — with real performance data showing 8-minute builds dropping to 2.3 minutes."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["turborepo", "monorepo", "pnpm", "ci-cd", "build-tools", "workspace", "devops", "javascript"]
readingTime: "12 min read"
---

# Turborepo Monorepo Complete Guide 2026: Setup, Caching, and CI/CD

You've hit the wall. Three repositories that share TypeScript types. One change to a shared utility package breaks two apps and you don't find out until CI fails 15 minutes later. Every pull request triggers a complete rebuild of everything, even when only one package changed.

This is the monorepo migration trigger point for most teams — not a philosophy decision, but concrete, daily pain:

1. **Cross-package TypeScript is a nightmare in polyrepos** — sharing types requires versioning, publishing, and updating across multiple repos
2. **CI rebuilds everything regardless of what changed** — no caching, no task awareness, no intelligence
3. **Version synchronization between repos is manual work** — library bumps cascade into 5 separate PRs

Turborepo solves all three. In 2026, it's the default choice for JavaScript/TypeScript monorepos. This guide covers everything from initial setup to production-grade CI optimization.

---

## What Is a Monorepo?

A monorepo is a single repository that contains multiple packages or applications. The alternative — a polyrepo — gives each package its own repository.

```
# Polyrepo (before)
github.com/yourorg/web-app
github.com/yourorg/mobile-app
github.com/yourorg/shared-ui
github.com/yourorg/shared-utils

# Monorepo (after)
github.com/yourorg/platform
  ├── apps/
  │   ├── web/
  │   └── mobile/
  └── packages/
      ├── ui/
      └── utils/
```

The monorepo doesn't just consolidate code — it enables intelligent build orchestration. Turborepo knows which packages depend on which, and only rebuilds what changed.

---

## Why Turborepo in 2026

The main alternatives are Nx, Lerna (now merged with Nx), and Bazel. Here's the decision matrix:

| Tool | Best For | Learning Curve | Remote Cache | Speed |
|------|---------|----------------|-------------|-------|
| **Turborepo** | JS/TS teams, fast adoption | Low | ✅ Built-in | ⚡ Excellent |
| **Nx** | Large enterprises, Angular/React | High | ✅ Nx Cloud | ⚡ Excellent |
| **Lerna** | Simple package management | Low | ❌ (deprecated solo) | 🔶 Moderate |
| **Bazel** | Polyglot (Go, Python, Java) | Very High | ✅ Remote | 🏎️ Maximum |

**Choose Turborepo when:**
- Your stack is JavaScript/TypeScript
- You want fast setup without learning a new paradigm
- Your team is small-to-medium (1-50 engineers)
- You use Vercel for deployment (Remote Cache integration is seamless)

**Choose Nx when:**
- You have 50+ engineers
- You need advanced code generation, affected-graph visualization, and enterprise support
- You're in a large Angular or React Native shop

---

## Installation and Initial Setup

### Prerequisites

- Node.js 18+
- pnpm 8+ (recommended) or npm/yarn

### Create a New Turborepo Project

```bash
npx create-turbo@latest my-platform
cd my-platform
```

This scaffolds the recommended structure. For an existing project, install manually:

```bash
pnpm add turbo --save-dev -w
```

### Project Structure

```
my-platform/
├── apps/
│   ├── web/                 # Next.js app
│   └── docs/                # Docusaurus or similar
├── packages/
│   ├── ui/                  # Shared React components
│   ├── typescript-config/   # Shared tsconfig
│   └── eslint-config/       # Shared ESLint config
├── turbo.json               # Turborepo configuration
├── package.json             # Root package.json
└── pnpm-workspace.yaml      # pnpm workspace declaration
```

---

## Workspace Configuration

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Root package.json

```json
{
  "name": "my-platform",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "engines": {
    "node": ">=18",
    "pnpm": ">=8"
  },
  "packageManager": "pnpm@9.0.0"
}
```

### Package package.json (shared UI example)

```json
{
  "name": "@myplatform/ui",
  "version": "0.0.1",
  "private": true,
  "exports": {
    ".": {
      "import": "./src/index.tsx",
      "types": "./src/index.tsx"
    }
  },
  "scripts": {
    "build": "tsc",
    "lint": "eslint . --max-warnings 0",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@myplatform/typescript-config": "*",
    "@myplatform/eslint-config": "*"
  }
}
```

### App package.json (Next.js app consuming shared package)

```json
{
  "name": "web",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "@myplatform/ui": "*",
    "next": "^14.0.0",
    "react": "^18.0.0"
  }
}
```

The `"*"` workspace protocol means pnpm resolves the dependency from the local workspace, not npm.

---

## Pipeline Configuration (turbo.json)

This is Turborepo's core config — where you define task dependencies and caching behavior.

### Basic turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**", "*.json"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": [],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "*.json"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Understanding `dependsOn`

The `^build` notation means "run `build` in all dependencies first":

```
@myplatform/ui builds first
  → web builds after (it depends on @myplatform/ui)
  → docs builds after
```

Without `^build`, tasks run in any order and you'll get import errors when the dependent package hasn't compiled yet.

### Configuring Outputs for Caching

Correct output configuration is critical for cache hits:

```json
{
  "tasks": {
    "build": {
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "dist/**",
        "build/**"
      ]
    }
  }
}
```

Turborepo hashes inputs and stores outputs. Next time the same inputs are detected, it restores outputs from cache — skipping the build entirely.

---

## Remote Caching

Local cache saves time for individual developers. Remote cache saves time across your entire team and CI.

### Enable Vercel Remote Cache

```bash
# Login to Vercel
npx turbo login

# Link to your Vercel account
npx turbo link
```

From this point, every developer and every CI run shares the same cache. If engineer A builds a package with the same inputs as engineer B, B gets the cached output — instantly.

### Performance Reality Check

Real-world data from a medium-sized Next.js + React Native monorepo:

| Scenario | Before Turborepo | After Remote Cache |
|---------|-----------------|-------------------|
| Full CI build (no cache) | 8 min 12 sec | 8 min 12 sec |
| PR with 1 package changed | 8 min 12 sec | 2 min 18 sec |
| PR with no package changed | 8 min 12 sec | 47 sec |
| Local dev after colleague built | 3 min 40 sec | 12 sec |

**The 8min → 2.3min reduction comes from skipping unchanged packages.** When only the web app changed, Turborepo skips rebuilding `@myplatform/ui` and `@myplatform/utils` — because their inputs haven't changed and their outputs are cached.

### Self-Hosted Remote Cache (Turborepo 2.x)

In Turborepo 2.x, you can use any S3-compatible storage as a remote cache:

```bash
TURBO_REMOTE_CACHE_SIGNATURE_KEY=<your-key> \
TURBO_API=https://your-cache-server.com \
turbo build --remote-cache-timeout 60
```

Open-source options: [ducktape](https://github.com/ducktape-dev/ducktape), [turborepo-remote-cache](https://github.com/fox1t/turborepo-remote-cache).

---

## Turborepo 2.x New Features (2025-2026)

### Watch Mode Improvements

```bash
# Turborepo 2.x — significantly improved watch mode
turbo watch build lint

# Processes only affected packages on file change
# Previously required --filter flags and manual management
```

### Dry Run Output (Better CI Visibility)

```bash
turbo build --dry-run

# Output:
# • Packages in scope: web, @myplatform/ui
# • Running build in 2 packages
# • web#build: cache miss, executing
# • @myplatform/ui#build: cache hit, replaying
```

### Filter Syntax Improvements

```bash
# Build only changed packages since last commit
turbo build --filter='[HEAD^1]'

# Build a specific package and its dependencies
turbo build --filter=web...

# Build everything that depends on ui package
turbo build --filter=...@myplatform/ui
```

---

## CI/CD Integration (GitHub Actions)

### Complete GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-test:
    name: Build & Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Required for Turborepo affected detection

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Test
        run: pnpm turbo test
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Lint
        run: pnpm turbo lint
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

### Setting Up CI Secrets

In your Vercel dashboard:
1. Go to your team → Settings → Remote Cache
2. Copy your Team ID and Token
3. Add to GitHub repository secrets: `TURBO_TOKEN` and `TURBO_TEAM`

---

## Shared TypeScript Configuration

One of the biggest wins in a monorepo is centralizing TypeScript config.

### packages/typescript-config/package.json

```json
{
  "name": "@myplatform/typescript-config",
  "version": "0.0.1",
  "private": true,
  "license": "MIT",
  "files": ["base.json", "nextjs.json", "react-library.json"]
}
```

### packages/typescript-config/base.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "incremental": false,
    "isolatedModules": true,
    "lib": ["es2022", "DOM", "DOM.Iterable"],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  }
}
```

### packages/typescript-config/nextjs.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./base.json",
  "compilerOptions": {
    "allowJs": true,
    "jsx": "preserve",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "target": "ES2017"
  }
}
```

Each app then extends this centralized config:

```json
// apps/web/tsconfig.json
{
  "extends": "@myplatform/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

---

## Migrating an Existing Multi-Repo Setup

### Step-by-Step Migration

**1. Create the monorepo structure**
```bash
npx create-turbo@latest my-platform --example with-tailwind
```

**2. Move existing repositories**
```bash
# Copy each repo into apps/ or packages/
cp -r ../old-web-repo apps/web
cp -r ../old-shared-ui packages/ui

# Remove old .git directories from moved repos
rm -rf apps/web/.git packages/ui/.git
```

**3. Update package names and internal dependencies**
```bash
# In packages/ui/package.json
{ "name": "@myplatform/ui" }  # was: "shared-ui"

# In apps/web/package.json — replace external dependency with workspace reference
{ "dependencies": { "@myplatform/ui": "*" } }  # was: "^1.4.2" from npm
```

**4. Merge lock files**
```bash
# Delete all existing lock files
find . -name "package-lock.json" -not -path "*/node_modules/*" -delete
find . -name "yarn.lock" -not -path "*/node_modules/*" -delete

# Install fresh from root
pnpm install
```

**5. Add turbo.json and verify**
```bash
pnpm turbo build --dry-run
```

---

## Common Issues and Solutions

### Issue: TypeScript can't find types from a workspace package

```
Error: Cannot find module '@myplatform/ui'
```

**Fix:** Make sure the package has a correct `exports` field and the consuming app's TypeScript config includes the workspace package path.

```json
// packages/ui/package.json
{
  "exports": {
    ".": {
      "types": "./src/index.tsx",
      "import": "./src/index.tsx"
    }
  }
}
```

### Issue: Cache isn't being hit

**Fix:** Check that your `outputs` array in `turbo.json` matches the actual build output paths. A mismatch means outputs aren't stored/restored correctly.

```bash
# Debug cache behavior
turbo build --verbosity=2
```

### Issue: `turbo dev` exits immediately

**Fix:** Add `"persistent": true` to the dev task in `turbo.json`. Persistent tasks run until killed (servers, watchers) — without this flag, Turborepo treats them as completed when the process starts.

---

## FAQ

**Q: Should I use pnpm, npm, or yarn workspaces?**
A: pnpm is the recommended choice. It's faster, uses less disk space due to content-addressable storage, and has the best workspace protocol support. npm workspaces work but are slower. Yarn Classic (v1) workspaces are legacy and not recommended for new projects.

**Q: Can Turborepo handle monorepos with non-JavaScript packages?**
A: Turborepo is JavaScript/TypeScript-first. For polyglot monorepos (Go + TypeScript, Python + JS), look at Bazel or Nx which have first-class support for multiple languages.

**Q: How does Turborepo compare to just using `--workspace` flags in npm/pnpm?**
A: Workspace flags handle *dependency management* (sharing node_modules). Turborepo handles *task orchestration* (intelligent build ordering, caching, parallel execution). They solve different problems and work together.

**Q: Is Remote Cache secure? Can anyone access my build outputs?**
A: Turborepo Remote Cache artifacts are signed with your team token. The cache content is tied to your Vercel team and requires authentication. For enterprise security requirements, use a self-hosted remote cache server.

**Q: What's the performance ceiling of Turborepo caching?**
A: Once a task's inputs haven't changed, the cache hit approaches 0ms task time (just the restoration time). In practice, large projects see 70-90% cache hit rates in CI after the first run, turning multi-minute builds into sub-minute operations.

---

## Summary

Turborepo in 2026 is the straightforward answer to the most common JavaScript monorepo problems:

| Pain Point | Turborepo Solution |
|-----------|-------------------|
| Cross-package TypeScript | Workspace protocol + shared tsconfig package |
| Slow CI (rebuilding everything) | Intelligent pipeline + Remote Cache |
| Version synchronization | Single repo, single `pnpm install` |
| Developer experience | Parallel tasks, watch mode, dry-run visibility |

The setup investment (2-4 hours for a medium project migration) pays off on the first PR where CI runs in 2 minutes instead of 8.

---

*Building something with Turborepo? Check out our [pnpm Workspaces guide](/blog/pnpm-vs-npm-vs-yarn-package-manager-guide-2026) and [CI/CD best practices](/blog/github-actions-complete-guide-2026) for the full picture.*
