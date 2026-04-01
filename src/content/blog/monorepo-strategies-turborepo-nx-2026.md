---
title: "Monorepo Strategies 2026: Turborepo vs Nx vs pnpm Workspaces"
description: "Compare Turborepo, Nx, and pnpm workspaces for JavaScript monorepos in 2026. Learn when to use each tool, remote caching, CI/CD integration, and migration strategies."
date: "2026-04-01"
tags: [monorepo, turborepo, nx, pnpm, javascript, build-tools]
readingTime: "14 min read"
author: "DevPlaybook Team"
---

# Monorepo Strategies 2026: Turborepo vs Nx vs pnpm Workspaces

Managing multiple related packages or applications in a single repository has shifted from a niche strategy used by companies like Google and Meta to a mainstream practice across teams of all sizes. In 2026, the JavaScript ecosystem offers three dominant tools for monorepo management: Turborepo, Nx, and pnpm Workspaces. Each comes with distinct trade-offs around performance, complexity, and team scalability.

This guide walks through each tool in depth — what they do best, where they fall short, how their remote caching compares, and how to decide which one fits your team.

---

## What Is a Monorepo and When Should You Use One?

A monorepo is a single version-controlled repository that contains multiple distinct projects, packages, or applications. The key word is "distinct" — a monorepo is not just a big codebase. It has clearly separated packages with their own `package.json`, often publishable independently and with explicit dependency graphs between them.

**Good reasons to adopt a monorepo:**

- You have multiple packages that share code (UI component library, utility functions, shared types)
- You want atomic commits that span multiple packages (a feature that changes the API and the frontend simultaneously)
- You want a unified CI/CD pipeline with smart change detection
- You want consistent linting, formatting, and tooling versions across all packages

**Reasons to stay with a polyrepo:**

- Your projects are entirely independent with no shared code
- Teams work autonomously and ownership is strictly separate
- Your CI/CD infrastructure does not handle monorepos well
- You want the simplest possible setup with no coordination overhead

There is no universal answer. A monorepo adds tooling complexity upfront in exchange for long-term development velocity for interdependent projects. If your packages truly have nothing to do with each other, a polyrepo is often simpler.

---

## Turborepo: Speed-First Task Orchestration

Turborepo, acquired by Vercel in 2021 and now maintained as an open-source project, is built around a single goal: make running tasks in a JavaScript monorepo as fast as possible. It achieves this through content-aware caching, parallel task execution, and a minimal configuration surface.

### Core Concepts

Turborepo models your monorepo as a task graph, not just a package graph. Each package defines which tasks it supports (`build`, `test`, `lint`, etc.) and Turborepo figures out the optimal execution order based on task dependencies.

**`turbo.json` — the central config file:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!dist/**/*.map"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "inputs": ["src/**/*.ts", "src/**/*.tsx", ".eslintrc.js"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

The `^` prefix in `dependsOn` means "run the same task in all dependencies first." So `"dependsOn": ["^build"]` means: build all packages this package depends on before building this one.

### Workspace Structure with pnpm

```
my-monorepo/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── web/         # Next.js app
│   └── docs/        # Documentation site
└── packages/
    ├── ui/          # Shared React components
    ├── config/      # Shared ESLint/TS configs
    └── utils/       # Shared utilities
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (root)
{
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### Remote Caching with Vercel

The standout feature of Turborepo is remote caching. When a task completes, Turborepo stores the outputs (and a fingerprint of the inputs) in a cache. On subsequent runs — whether locally or in CI — if the inputs haven't changed, the cached outputs are replayed instantly.

Vercel Remote Cache is the default cloud backend:

```bash
# Link your repo to Vercel Remote Cache
npx turbo login
npx turbo link

# Now any CI run that shares the same TURBO_TOKEN and TURBO_TEAM will reuse cache
```

In CI (GitHub Actions):

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build test lint
```

With remote caching enabled, a developer who already ran `build` on their machine can push to CI and the CI runner will restore cached build artifacts without re-running the build — often reducing CI times from minutes to seconds.

### When Turborepo Is the Right Choice

- **Small to medium teams** (1–30 engineers) who want fast CI without complex setup
- Teams already using **Vercel** for deployment
- Projects where the main pain point is **slow builds and tests**, not complex task orchestration
- Teams that want a **low-configuration** tool that "just works"

---

## Nx: The Full-Featured Monorepo Platform

Nx, maintained by Nrwl, takes a more comprehensive approach. Where Turborepo focuses on task caching, Nx provides an entire developer platform: project graph visualization, code generation, editor plugins, affected command detection, and a rich plugin ecosystem for frameworks like React, Angular, Next.js, Nest.js, and more.

### Project Graph and Affected Commands

Nx builds a precise graph of your entire repository — which packages depend on which, what files each package owns, and how tasks relate across packages. This graph powers the `affected` command, which is Nx's most powerful feature for large teams.

```bash
# Only run tests for packages affected by changes since main
nx affected -t test

# Only build affected packages
nx affected -t build

# See the project graph visually
nx graph
```

When you open a PR that changes `packages/ui`, Nx knows exactly which apps and packages depend on `packages/ui` and only runs tasks for those. This is especially valuable in large repos with 50+ packages where running everything on every PR would be prohibitively slow.

### `nx.json` Configuration

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json"
    ],
    "sharedGlobals": ["{workspaceRoot}/babel.config.json"]
  }
}
```

### Code Generators

One of Nx's most underrated features is its generator system. Rather than manually creating boilerplate for every new component, library, or application, Nx generators scaffold everything consistently:

```bash
# Generate a new React library
nx g @nx/react:library ui-components --directory=packages/ui-components --bundler=vite

# Generate a new Next.js app
nx g @nx/next:app dashboard --directory=apps/dashboard

# Generate a new React component inside an existing library
nx g @nx/react:component button --project=ui-components --export
```

You can also write your own workspace generators to enforce your team's patterns:

```typescript
// tools/generators/feature/index.ts
import { Tree, formatFiles, generateFiles, names } from "@nx/devkit";
import * as path from "path";

export default async function (tree: Tree, options: { name: string; project: string }) {
  const normalizedNames = names(options.name);

  generateFiles(
    tree,
    path.join(__dirname, "files"),
    `apps/${options.project}/src/features/${normalizedNames.fileName}`,
    { ...normalizedNames, tmpl: "" }
  );

  await formatFiles(tree);
}
```

### Distributed Task Execution with Nx Cloud

Nx Cloud takes remote caching further with Distributed Task Execution (DTE). Instead of running all affected tasks on a single CI machine, Nx Cloud can distribute tasks across multiple agents in parallel:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: nrwl/nx-set-shas@v4
      - run: npm ci
      - run: npx nx-cloud start-ci-run --distribute-on="3 linux-medium-js"
      - run: npx nx affected -t lint test build
      - run: npx nx-cloud stop-all-agents
```

With DTE, a repo with 100 packages that would take 20 minutes on one machine can finish in 4 minutes spread across 5 agents — all with shared cache so no work is duplicated.

### When Nx Is the Right Choice

- **Large teams** (30+ engineers) or **enterprise** organizations
- Projects needing **code generation and scaffolding** consistency
- Repos with **Angular, Nest.js, or complex React** setups (Nx has best-in-class plugins for these)
- Teams that want a **visual project graph** and deep workspace tooling
- Organizations willing to invest in learning Nx's conventions in exchange for long-term developer experience

---

## pnpm Workspaces: The Lean Approach

pnpm Workspaces is not a monorepo build tool — it's a package manager feature that handles the dependency installation and linking side of monorepos. It's significantly leaner than Turborepo or Nx, with no task orchestration built in. But for many teams, that's exactly what they want.

### Setting Up pnpm Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "!**/node_modules/**"
```

```json
// packages/ui/package.json
{
  "name": "@myorg/ui",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```json
// apps/web/package.json
{
  "name": "web",
  "dependencies": {
    "@myorg/ui": "workspace:*"
  }
}
```

The `workspace:*` protocol tells pnpm to link the local package directly rather than downloading from npm.

### The Catalog Feature (pnpm 9+)

pnpm 9 introduced the `catalog` feature, which solves one of the oldest monorepo headaches: keeping dependency versions in sync across packages.

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  react: "^19.0.0"
  react-dom: "^19.0.0"
  typescript: "^5.4.0"
  vite: "^6.0.0"
  vitest: "^3.0.0"
```

```json
// apps/web/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

Every package that uses `catalog:` will always get the same version, defined in one place. No more "which package is using React 18 vs 19?" questions.

### Running Scripts Across Workspaces

Without Turborepo or Nx, you use pnpm's built-in `--filter` and `--recursive` flags:

```bash
# Run build in all packages
pnpm --recursive run build

# Run test only in packages matching a filter
pnpm --filter "@myorg/*" run test

# Run dev only in the web app
pnpm --filter web run dev

# Run build in a package and all its dependencies
pnpm --filter web... run build
```

For basic task ordering, you can use `pnpm --recursive run build --if-present` with the packages correctly ordered, or add a simple shell script:

```bash
#!/bin/bash
# scripts/build.sh
set -e

echo "Building packages..."
pnpm --filter "./packages/**" run build

echo "Building apps..."
pnpm --filter "./apps/**" run build

echo "Done."
```

### When pnpm Workspaces Alone Is the Right Choice

- **Solo developers** or small teams (1–5 people) who want zero tooling overhead
- Projects where CI speed is not yet a bottleneck
- Teams who want to **add Turborepo later** but start minimal
- Repos that are mostly an app with one or two shared packages

---

## Remote Caching Comparison

| Feature | Turborepo + Vercel Cache | Nx Cloud | Self-hosted |
|---|---|---|---|
| Free tier | Generous (Vercel account) | Free up to 500 hours/month | Unlimited (your infra) |
| Setup complexity | Low | Medium | High |
| DTE (distributed execution) | Limited | Yes (Nx Cloud) | DIY |
| Cache hit analytics | Basic | Detailed | DIY |
| Works with any CI | Yes | Yes | Yes |
| Vendor lock-in | Vercel | Nrwl | None |

Both Turborepo and Nx support self-hosted caching. Turborepo supports any S3-compatible storage via open-source cache servers like `ducktape` or `turborepo-remote-cache`. Nx supports custom remote cache implementations.

```bash
# Self-hosted Turborepo cache (e.g., using turborepo-remote-cache on Fly.io)
# Set in your CI environment:
TURBO_API="https://your-cache-server.fly.dev"
TURBO_TOKEN="your-secret-token"
TURBO_TEAM="your-team-name"
```

---

## Migrating from a Single Repository

Moving an existing project into a monorepo requires careful planning. The safest approach is incremental.

### Step 1: Extract the first shared package

Start by identifying something genuinely shared — often a utility library or a set of TypeScript types.

```bash
# Initialize pnpm workspaces
echo 'packages:\n  - "apps/*"\n  - "packages/*"' > pnpm-workspace.yaml

# Move your app into apps/
mkdir -p apps/web
# (move files)

# Create the first shared package
mkdir -p packages/utils
cd packages/utils
pnpm init
```

### Step 2: Add Turborepo

```bash
pnpm add -D turbo -w

# Initialize turbo.json
npx turbo init
```

### Step 3: Set up CI with caching

Start with local caching (no remote setup needed), then add remote caching once the team is using the monorepo day-to-day.

### Step 4: Gradually migrate more packages

Resist the urge to migrate everything at once. Move packages one at a time, validating that CI stays green.

---

## Team Size Recommendations Summary

**Solo / 1–3 developers:**
Use pnpm Workspaces with simple `--recursive` scripts. Add Turborepo if CI becomes slow. No need for Nx.

**Small team (4–15 developers):**
Turborepo + pnpm Workspaces. The `turbo.json` config is minimal and the caching pays off quickly. Add Vercel Remote Cache for free.

**Medium team (15–50 developers):**
Either Turborepo (if you just need fast builds) or Nx (if you want generators, project graph, and deeper tooling). Both are valid. The decision often comes down to whether your stack has good Nx plugins.

**Large team / Enterprise (50+ developers):**
Nx with Nx Cloud DTE. The affected command detection, distributed execution, and generator consistency at this scale are hard to replicate with simpler tools.

---

## Conclusion

The right monorepo tool depends heavily on your team size and what problem you're actually solving. If your pain is slow builds, Turborepo's caching fixes it with minimal configuration. If your pain is inconsistency, duplication, and lack of tooling across a large engineering org, Nx's full platform is worth the investment. And if you simply need packages to share code without complex orchestration, pnpm Workspaces alone may be entirely sufficient.

Start with the simplest option that solves your actual problem. You can always migrate up — it's much harder to justify removing complexity than it is to add it when you need it.
