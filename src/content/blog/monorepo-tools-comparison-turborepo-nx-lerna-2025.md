---
title: "Monorepo Tools Comparison: Turborepo vs Nx vs Lerna in 2025"
description: "A practical comparison of monorepo tools in 2025 — Turborepo, Nx, and Lerna — covering build caching, task orchestration, incremental builds, and which tool fits your team's needs."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["monorepo", "turborepo", "nx", "lerna", "build-tools", "javascript", "developer-tools"]
readingTime: "11 min read"
---

Monorepos contain multiple packages or applications in a single repository. When done well, they improve code sharing, dependency management, and cross-package refactoring. When done poorly, they're a build system nightmare where every change takes 10 minutes to verify.

The right monorepo tooling is what separates the two outcomes.

---

## What Monorepo Tools Actually Do

Before comparing tools, understand what problem they solve. A monorepo with 10 packages naively runs builds like this:

1. Change one utility package
2. Run build/test for all 10 packages (because you can't easily know what's affected)

With monorepo tools:

1. Change one utility package
2. Tool identifies which packages depend on the changed package (via dependency graph)
3. Only those packages are rebuilt/retested
4. Previous build results for unchanged packages are served from cache

This is the core value: **incremental computation** and **task orchestration based on the dependency graph**.

---

## Turborepo

Turborepo was acquired by Vercel in 2021 and has become the most popular monorepo build system for JavaScript/TypeScript projects. It's built in Rust, simple to configure, and fast.

### Core Concepts

**Pipeline**: Define which tasks exist and how they depend on each other:

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],  // Run after dependencies' build
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,           // Never cache dev servers
      "persistent": true        // Keep running
    }
  }
}
```

**`^build`** means "build all packages that this package depends on first." This ensures your dependency tree builds in the correct order automatically.

### Caching

Turborepo hashes all inputs to a task (source files, environment variables, lock file) and stores the output. On subsequent runs:

- If inputs are unchanged: serve output from cache instantly
- If inputs changed: re-run the task, update cache

```bash
# First run
turbo run build
# → Builds everything, caches results (30 seconds)

# Second run with no changes
turbo run build
# → Serves all results from cache (< 1 second)

# After changing one package
turbo run build
# → Rebuilds only the changed package and its dependents (5 seconds)
```

**Remote caching**: Share the cache across machines and CI:

```bash
# Login to Vercel for remote cache
turbo login

# Link to your Vercel account
turbo link

# Now CI and all team members share the same cache
```

### Basic Setup

```bash
# Create a new monorepo
npx create-turbo@latest

# Or add to existing workspace
npm install --save-dev turbo
```

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js app
│   └── api/          # Express API
├── packages/
│   ├── ui/           # Shared React components
│   ├── eslint-config/ # Shared ESLint config
│   └── tsconfig/     # Shared TypeScript config
├── turbo.json
└── package.json
```

```json
// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

### Running Specific Tasks

```bash
# Build everything
turbo run build

# Build only the web app and its dependencies
turbo run build --filter=web

# Run dev servers for all apps
turbo run dev

# Dry run: see what would run without running it
turbo run build --dry
```

### When Turborepo Wins

- **New monorepos**: Simple setup, great defaults
- **Vercel deployments**: Native integration, free remote cache through Vercel
- **TypeScript/JavaScript repos**: Purpose-built for this ecosystem
- **Teams that want minimal configuration**: Works well out of the box

---

## Nx

Nx (by Nrwl) has been around longer than Turborepo and is more feature-rich — sometimes to a fault. It's more opinionated and has a steeper learning curve, but provides more power.

### Core Concepts

Nx uses **plugins** for framework-specific integration. There are official plugins for React, Next.js, Angular, NestJS, Node, and more. Each plugin adds:

- Generators (scaffold new apps/libs)
- Executors (run build, test, serve with framework-specific defaults)
- Dependency graph integration

### Setup

```bash
# Create new Nx workspace
npx create-nx-workspace@latest my-monorepo

# Add to existing project
npx nx@latest init
```

```
my-monorepo/
├── apps/
│   ├── web/
│   └── api/
├── libs/
│   ├── ui/
│   ├── data-access/
│   └── utils/
├── nx.json
└── package.json
```

### Configuration

```json
// nx.json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    },
    "lint": {
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)",
      "!{projectRoot}/src/test-setup.[jt]s"
    ]
  }
}
```

### Nx Generators

This is where Nx differentiates from Turborepo. Generators scaffold code according to your workspace conventions:

```bash
# Generate a new React library
nx generate @nx/react:library ui

# Generate a new Next.js app
nx generate @nx/next:app dashboard

# Generate a React component in a specific library
nx generate @nx/react:component Button --project=ui
```

Generated code follows Nx workspace conventions automatically.

### Affected Commands

```bash
# Run tests only for changed packages and their dependents
nx affected --target=test

# Build affected packages (useful in CI)
nx affected --target=build --base=main --head=HEAD
```

The `affected` calculation is based on the dependency graph and git diff.

### Project Graph Visualization

```bash
# Open an interactive dependency graph in the browser
nx graph
```

This is genuinely useful for understanding what depends on what in a large monorepo.

### Nx Cloud (Remote Cache)

Nx Cloud provides remote caching and distributed task execution:

```bash
# Connect to Nx Cloud
npx nx connect-to-nx-cloud
```

Nx Cloud's distributed task execution (DTE) can split your CI across multiple machines, parallelizing unrelated tasks:

```yaml
# .github/workflows/ci.yml
- name: Run distributed CI
  run: nx affected --target=build --parallel=3
```

**Pricing**: Nx Cloud free tier includes limited compute. Paid plans for larger teams.

### When Nx Wins

- **Large, complex monorepos** with many packages and cross-dependencies
- **Mixed technology**: React, Angular, NestJS, and Node in the same repo
- **Teams that want scaffolding**: Generators prevent inconsistency across packages
- **Angular teams**: Nx is the standard tooling for Angular monorepos
- **Need advanced CI optimization**: Distributed task execution

---

## Lerna

Lerna is the original JavaScript monorepo tool, released in 2015. It had a period of declining maintenance (2020-2022) but was revived by Nrwl (the Nx team) and now integrates with Nx for task orchestration.

### Current State

Lerna v6+ delegates task running and caching to Nx. Lerna itself now focuses on:
- Package versioning (determining which packages changed and what their new versions should be)
- Publishing to npm (publishing multiple packages in the correct order)
- Changelog generation

In practice: if you need monorepo orchestration, use Turborepo or Nx. If you need a tool to publish multiple npm packages with coordinated versions, Lerna's versioning and publishing workflow is still relevant.

### Versioning Modes

**Fixed mode**: All packages share the same version number (like Babel, React)

**Independent mode**: Each package has its own version (like a design system with separate `@company/button`, `@company/input` packages)

```bash
# Version all changed packages
npx lerna version

# Publish all changed packages
npx lerna publish

# Publish with specific dist-tag
npx lerna publish --dist-tag beta
```

### When Lerna Wins

- You're publishing multiple npm packages that need coordinated versioning
- You have an existing Lerna setup that works
- You need conventional commits + changelog generation for a package library

---

## Comparison Table

| Feature | Turborepo | Nx | Lerna |
|---------|-----------|-----|-------|
| Build caching | Excellent | Excellent | Via Nx |
| Remote cache | Vercel (free) | Nx Cloud (paid tier) | Via Nx Cloud |
| Dependency graph | Yes | Yes (visual) | Via Nx |
| Code generators | No | Yes (extensive) | No |
| Distributed CI | No | Yes (Nx Cloud) | No |
| Package publishing | No | Plugin | Yes (built-in) |
| Configuration complexity | Low | Medium-High | Low-Medium |
| Learning curve | Low | High | Medium |
| Language support | JS/TS | Multi (plugins) | JS/TS |

---

## Migration: From No Tool to Turborepo

If you have an existing workspace using npm/yarn/pnpm workspaces with manual scripts, here's a minimal migration to Turborepo:

```bash
# Install Turborepo
npm install --save-dev turbo

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
EOF

# Update root package.json scripts
# "build": "turbo run build"
# "test": "turbo run test"
# "lint": "turbo run lint"
```

That's the minimal migration. You get caching and dependency-ordered task running immediately.

---

## Recommendation for 2025

**Starting a new monorepo?** → **Turborepo** for most teams. Low setup friction, fast, excellent Vercel integration, good defaults.

**Complex monorepo with mixed tech?** → **Nx** for the plugin ecosystem and code generation. Accept the complexity cost.

**Publishing npm packages?** → **Lerna** (with Nx for task running) for its versioning and publishing workflow.

**Already on Nx?** → Stay on Nx. The switching cost isn't worth it unless you have specific pain points.

The most important thing is having *any* proper monorepo tool. The difference between Turborepo and Nx is much smaller than the difference between either and doing nothing.

---

*Free developer tools at [DevPlaybook.cc](https://devplaybook.cc) — [JSON Formatter](https://devplaybook.cc/tools/json-formatter), [Regex Tester](https://devplaybook.cc/tools/regex-tester), and 15+ other utilities for daily development work.*
