---
title: "Nx Monorepo Guide 2026: Scale Your Codebase with Smart Build Caching"
description: "A complete guide to Nx monorepo: setup, generators, smart build caching, CI integration, and how it compares to Turborepo. Learn to scale your codebase with Nx."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["nx", "monorepo", "build-tools", "turborepo", "ci-cd", "architecture"]
readingTime: "14 min read"
---

Monorepos solve a real problem: when you have multiple apps and libraries that need to share code, the alternative is dependency hell. But monorepos introduce their own problems — slow builds, complex CI pipelines, inconsistent tooling. Nx was built to solve exactly those problems.

Nx is a build system and monorepo tool that brings intelligent task scheduling, caching, and generators to any JavaScript/TypeScript codebase. In 2026, it's used by thousands of teams including Google, Microsoft, and Shopify for codebases with hundreds of projects.

This guide covers everything you need to set up, configure, and scale a monorepo with Nx.

---

## Why Nx?

### The Monorepo Problem It Solves

Without Nx, a monorepo build system typically means:

- Running tests for everything on every CI run (even when only one package changed)
- Long build times because there's no coordination between tools
- Inconsistent project configuration spread across dozens of `package.json` files
- Manual dependency tracking (which projects depend on which?)

Nx solves these with:

1. **Dependency graph** — Nx knows which projects depend on which
2. **Affected detection** — run only what changed and its dependents
3. **Caching** — never rebuild something that already built with the same inputs
4. **Generators** — create consistent project scaffolding in seconds

### Nx vs Turborepo

Both Nx and Turborepo are monorepo build tools with caching. Key differences:

| Feature | Nx | Turborepo |
|---------|----|-----------|
| Task dependency model | Project graph + task graph | Pipeline configuration |
| Generators/scaffolding | Built-in, extensive | Not included |
| Framework support | React, Angular, Node, .NET | Framework-agnostic |
| Remote cache | Nx Cloud (free tier) | Vercel Remote Cache |
| Plugin ecosystem | Large (official + community) | Smaller |
| Visualization | `nx graph` with full UI | `turbo run --graph` (Mermaid) |
| Learning curve | Steeper | Simpler |

Choose Turborepo for: simple multi-package repos where you want minimal tool surface area.
Choose Nx for: large monorepos with diverse projects, teams that want generators, or projects using Angular/React where Nx's framework integration adds value.

---

## Setting Up Nx

### Creating a New Workspace

```bash
npx create-nx-workspace@latest my-workspace
```

The interactive setup asks:
- Preset (apps, npm, ts, react, angular, node, etc.)
- Whether to use Nx Cloud

For a React + Node monorepo:

```bash
npx create-nx-workspace@latest my-workspace \
  --preset=ts \
  --nxCloud=yes
```

### Adding Nx to an Existing Monorepo

If you already have a monorepo (yarn/npm/pnpm workspaces):

```bash
npx nx@latest init
```

Nx analyzes your existing setup and configures itself minimally. You don't need to restructure anything.

### Workspace Structure

```
my-workspace/
├── apps/
│   ├── web/          # React app
│   ├── api/          # Express API
│   └── mobile/       # React Native app
├── libs/
│   ├── ui/           # Shared UI components
│   ├── data-access/  # Shared data layer
│   └── utils/        # Shared utilities
├── nx.json           # Nx configuration
├── package.json      # Root package.json
└── tsconfig.base.json  # Shared TypeScript config
```

The `apps/` vs `libs/` convention is standard Nx practice:
- **apps**: deployable applications, consume libraries
- **libs**: shared code, consumed by apps and other libs

---

## nx.json Configuration

The core configuration file:

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
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s"
    ],
    "sharedGlobals": ["{workspaceRoot}/babel.config.json"]
  }
}
```

Key concepts:

- **targetDefaults**: default configuration applied to all projects' targets of that name
- **dependsOn**: `"^build"` means "run build in all dependencies first"
- **inputs**: which files affect this target's cache
- **cache**: whether to cache outputs

---

## Running Tasks

### Basic Commands

```bash
# Run a target in a specific project
nx build web
nx test ui
nx lint api

# Run a target in all projects
nx run-many -t build
nx run-many -t test lint

# Run affected projects only (changed since main branch)
nx affected -t build
nx affected -t test
```

### The Affected Command

`nx affected` is the most powerful feature for CI:

```bash
# Compared to main branch
nx affected -t build --base=main

# Compared to last commit
nx affected -t test --base=HEAD~1

# Compared to a specific commit
nx affected -t build --base=abc123
```

Nx analyzes the dependency graph and determines which projects are affected by the changed files. If you change a shared utility library, all projects that depend on it are marked as affected.

### Parallel Execution

```bash
# Run up to 4 tasks in parallel
nx run-many -t build --parallel=4

# Nx automatically sequences tasks based on dependencies
# (builds dependencies before dependents)
```

---

## Caching

### How Nx Cache Works

For each task, Nx computes a cache key based on:

1. The task's inputs (defined in `nx.json`)
2. The project's configuration
3. Environment variables you specify

If a matching cache entry exists, Nx restores the outputs without re-running the task. This works both locally (file system cache) and remotely (Nx Cloud).

### Cache Configuration

```json
// project.json (per-project config)
{
  "name": "web",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/web"
      },
      "cache": true
    }
  }
}
```

The `outputs` field tells Nx what to cache. Set it precisely — caching too much wastes space, too little misses cache hits.

### Nx Cloud Remote Cache

With Nx Cloud, cache is shared across your entire team and CI:

```bash
# Connect to Nx Cloud
npx nx connect
```

This generates a token and updates `nx.json`. Now when one developer or CI run builds `web`, every other developer gets the cached output — no rebuild needed.

Nx Cloud's free tier covers most small-to-medium teams (unlimited contributors, 500 GB cache space).

### Verifying Cache Works

```bash
nx build web  # First run: builds
nx build web  # Second run: should say "cache hit"
```

You'll see output like:

```
> nx run web:build  [local cache]

   ✔  1/1 dependent project tasks succeeded

 ——————————————————————————————————————————

 >  NX   Successfully ran target build for project web

   Nx read the output from the cache instead of running the command for 1 out of 1 tasks.
```

---

## Generators

Generators create code consistently — project scaffolding, components, services, and anything else that follows a pattern.

### Using Built-in Generators

```bash
# Generate a new React application
nx g @nx/react:app my-app

# Generate a new library
nx g @nx/js:lib my-lib

# Generate a React component in a library
nx g @nx/react:component my-component --project=my-lib

# Generate a React hook
nx g @nx/react:hook useMyHook --project=my-lib
```

### Dry Run

Always preview what a generator will do:

```bash
nx g @nx/react:app my-app --dry-run
```

Shows all files that would be created/modified without touching anything.

### Writing Custom Generators

```ts
// tools/generators/my-generator/index.ts
import { Tree, formatFiles, generateFiles, names } from '@nx/devkit'
import * as path from 'path'

interface MyGeneratorSchema {
  name: string
  directory?: string
}

export default async function (tree: Tree, options: MyGeneratorSchema) {
  const normalizedOptions = {
    ...options,
    ...names(options.name),  // camelCase, PascalCase, etc.
  }

  // Generate files from templates
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    `libs/${options.directory || options.name}`,
    normalizedOptions
  )

  await formatFiles(tree)
}
```

Template files use EJS-style substitution:

```tsx
// tools/generators/my-generator/files/__name__.tsx.template
export function <%= className %>() {
  return <div><%= name %></div>
}
```

Run your custom generator:

```bash
nx g my-generator my-component --dry-run
```

---

## Project Graph Visualization

One of Nx's best features — visualize your dependency graph:

```bash
nx graph
```

Opens a browser with an interactive visualization showing:
- All projects and their relationships
- Which projects are affected by a change
- Dependency paths between projects

For CI, generate a static image:

```bash
nx graph --file=graph.html
```

### Enforcing Module Boundaries

Nx can enforce rules about which projects can import from which:

```json
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "enforceBuildableLibDependency": true,
        "depConstraints": [
          {
            "sourceTag": "type:app",
            "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"]
          },
          {
            "sourceTag": "type:feature",
            "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"]
          },
          {
            "sourceTag": "type:ui",
            "onlyDependOnLibsWithTags": ["type:ui", "type:util"]
          }
        ]
      }
    ]
  }
}
```

Tag your projects in `project.json`:

```json
{
  "name": "ui",
  "tags": ["type:ui", "scope:shared"]
}
```

Now `nx lint` will fail if a `ui` library tries to import a `feature` library. This enforces clean architecture at the tooling level.

---

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for nx affected

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Set NX base and head for PR
        uses: nrwl/nx-set-shas@v4

      - name: Run affected builds
        run: npx nx affected -t build --parallel=3

      - name: Run affected tests
        run: npx nx affected -t test --parallel=3

      - name: Run affected lint
        run: npx nx affected -t lint --parallel=3
```

The `nrwl/nx-set-shas@v4` action sets `NX_BASE` and `NX_HEAD` environment variables so `nx affected` knows what to compare against.

### Distributed Task Execution (Nx Cloud)

For large teams, Nx Cloud can distribute tasks across multiple CI agents:

```yaml
- name: Start Nx agents
  run: npx nx-cloud start-ci-run --distribute-on="3 linux-medium-js" --stop-agents-after="build,test,lint"

- name: Run affected
  run: npx nx affected -t build test lint
```

Each CI agent picks up tasks from the queue. Your total CI time approaches the time of the longest single task, regardless of total task count.

---

## Nx Plugins for Common Stacks

Nx has official plugins for the most common frameworks:

```bash
# React
npm install @nx/react

# Next.js
npm install @nx/next

# Node/Express
npm install @nx/node

# NestJS
npm install @nx/nest

# Angular
npm install @nx/angular

# Expo/React Native
npm install @nx/expo

# Storybook
npm install @nx/storybook

# Cypress
npm install @nx/cypress

# Playwright
npm install @nx/playwright
```

Install the plugins, then use their generators:

```bash
nx g @nx/next:app my-next-app
nx g @nx/nest:app my-api
nx g @nx/storybook:configuration my-lib
```

---

## Real-World Workspace Example

Here's how a mature monorepo might be organized:

```
my-workspace/
├── apps/
│   ├── web/              # Next.js consumer app
│   ├── admin/            # React admin dashboard
│   ├── api/              # NestJS API
│   └── mobile/           # Expo app
├── libs/
│   ├── ui/               # Shared React components (type:ui)
│   │   ├── button/
│   │   └── forms/
│   ├── feature/          # Feature modules (type:feature)
│   │   ├── auth/
│   │   └── payments/
│   ├── data-access/      # API clients, stores (type:data-access)
│   │   ├── user/
│   │   └── products/
│   └── utils/            # Pure utilities (type:util)
│       ├── date/
│       └── validation/
├── tools/
│   └── generators/       # Custom generators
└── nx.json
```

In this structure:
- `ui` libraries can import from other `ui` and `utils`
- `feature` libraries can import from `ui`, `data-access`, and `utils`
- `apps` can import from any library
- `utils` can only import from other `utils`

This creates a directed acyclic dependency graph with clean layer separation.

---

## Key Takeaways

- `nx affected -t build` runs only what changed — the single most impactful CI optimization
- Caching is automatic for cached targets — zero rebuilds of unchanged code
- Nx Cloud shares cache across developers and CI agents for free
- Generators enforce consistent project structure at scale
- `nx graph` visualizes the dependency graph for debugging and planning
- Module boundary rules enforce architecture constraints at lint time
- Distributed task execution scales CI to handle hundreds of projects
- Turborepo is simpler; Nx is more powerful — choose based on your scale and needs

Start with `npx create-nx-workspace` and `nx affected` in CI. Add Nx Cloud for remote caching. Introduce module boundaries as your team grows. The investment pays off when your monorepo scales beyond a handful of projects.
