---
title: "Turborepo: Tame Your Monorepo Complexity"
description: "A complete guide to Turborepo for JavaScript and TypeScript monorepos. Covers what Turborepo is, how remote caching works, workspace setup, pipeline configuration, and CI/CD integration to dramatically speed up your builds."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["turborepo", "monorepo", "build-tools", "nx-alternative"]
readingTime: "11 min read"
draft: false
---

Modern applications rarely live in a single repository anymore. A frontend app, a shared component library, a backend API, and a set of CLI tools—these projects share code, types, and configuration. Managing them as separate repositories creates coordination overhead. Smashing them into a single application creates coupling problems.

Monorepos solve the coordination problem. Turborepo solves the monorepo performance problem.

This guide covers everything you need to use Turborepo effectively: workspace setup, pipeline configuration, caching strategies, and CI integration.

---

## What Is Turborepo?

Turborepo is a high-performance build system for JavaScript and TypeScript monorepos. It sits on top of your existing package manager (npm, pnpm, or Yarn workspaces) and adds:

- **Incremental builds**: Only rebuild packages that changed
- **Parallel execution**: Run tasks across packages simultaneously
- **Local caching**: Cache task outputs and skip re-running unchanged work
- **Remote caching**: Share cache across team members and CI machines
- **Task pipelines**: Define dependency order between tasks

The result is a monorepo where `npm run build` completes in seconds instead of minutes—because Turborepo knows what changed and what it can safely skip.

---

## Setting Up a Turborepo Workspace

### Installation

```bash
# Create a new Turborepo from scratch
npx create-turbo@latest

# Or add Turborepo to an existing monorepo
npm install turbo --save-dev
```

### Project Structure

A typical Turborepo layout looks like this:

```
my-monorepo/
├── apps/
│   ├── web/           # Next.js frontend
│   ├── api/           # Express API
│   └── admin/         # Admin dashboard
├── packages/
│   ├── ui/            # Shared React components
│   ├── config/        # Shared configs (ESLint, TypeScript)
│   └── utils/         # Shared utilities
├── turbo.json         # Turborepo config
├── package.json       # Root workspace config
└── pnpm-workspace.yaml  # (if using pnpm)
```

### Workspace Configuration

**Root `package.json`:**

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "latest"
  }
}
```

**pnpm workspace (`pnpm-workspace.yaml`):**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## Configuring `turbo.json`

The `turbo.json` file is where you define your pipeline—the tasks Turborepo manages and their relationships.

### Basic Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Key pipeline concepts:**

- `dependsOn: ["^build"]` — Run this package's `build` only after all its dependencies have built. The `^` means "topological dependency."
- `dependsOn: ["build"]` — Run after `build` in the same package (task-level dependency).
- `outputs` — What files to cache. Turborepo stores these and restores them on cache hit.
- `cache: false` — Never cache this task (useful for dev servers).
- `persistent: true` — Long-running process (won't block other tasks).

### Advanced Pipeline with Environment Variables

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV", "NEXT_PUBLIC_API_URL"]
    },
    "test:unit": {
      "outputs": ["coverage/**"],
      "env": ["CI"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    },
    "deploy": {
      "dependsOn": ["build", "test:unit"],
      "cache": false
    }
  }
}
```

Including environment variables in the pipeline config means cache keys incorporate env values—so a production build and development build are cached separately.

---

## Local Caching in Action

Local caching is Turborepo's most immediately impactful feature. Here's what happens:

**First run (no cache):**
```bash
$ turbo run build
• Packages in scope: web, api, admin, ui, utils
• Running build in 5 packages

utils:build: cache miss, executing
ui:build: cache miss, executing
api:build: cache miss, executing
web:build: cache miss, executing
admin:build: cache miss, executing

Tasks: 5 successful, 5 total
Cached: 0 cached, 5 total
Time: 45.2s
```

**Second run (full cache hit):**
```bash
$ turbo run build
• Packages in scope: web, api, admin, ui, utils

utils:build: cache hit, replaying logs
ui:build: cache hit, replaying logs
api:build: cache hit, replaying logs
web:build: cache hit, replaying logs
admin:build: cache hit, replaying logs

Tasks: 5 successful, 5 total
Cached: 5 cached, 5 total
Time: 0.8s  ← from 45s to under 1 second
```

**After changing only `ui` package:**
```bash
$ turbo run build
utils:build: cache hit, replaying logs    ← unchanged
ui:build: cache miss, executing           ← changed
api:build: cache hit, replaying logs      ← unchanged
web:build: cache miss, executing          ← depends on ui
admin:build: cache miss, executing        ← depends on ui

Tasks: 5 successful, 5 total
Cached: 2 cached, 5 total
Time: 12.1s  ← only rebuilt what changed
```

Turborepo computes a hash from the task inputs (source files, environment variables, dependencies) and uses it as the cache key.

---

## Remote Caching with Vercel

Local caching helps individual developers. Remote caching shares that cache across your entire team and CI environment—so a build cached on one developer's machine is instantly available to another, or to your CI server.

### Enable Remote Caching

```bash
# Login to Vercel (provides free remote caching for Turborepo)
npx turbo login

# Link your monorepo to Vercel remote cache
npx turbo link
```

### Self-Hosted Remote Cache

If you prefer not to use Vercel's infrastructure, you can run a self-hosted remote cache server:

```bash
# Using the ducktape remote cache server
npm install -g @ducktape/remote-cache

# Or configure your own S3-compatible backend
```

Configure in `turbo.json`:

```json
{
  "remoteCache": {
    "signature": true
  }
}
```

Set environment variables for CI:

```bash
TURBO_TOKEN=your-vercel-token
TURBO_TEAM=your-team-slug
```

With remote caching, a CI run after another CI run builds the same code will complete in seconds—cache artifacts are fetched from the remote store instead of rebuilt.

---

## Package Dependencies and Internal Linking

Packages within a Turborepo can depend on each other. Here's how that works:

**`packages/utils/package.json`:**
```json
{
  "name": "@myapp/utils",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  }
}
```

**`packages/ui/package.json`:**
```json
{
  "name": "@myapp/ui",
  "version": "0.0.1",
  "dependencies": {
    "@myapp/utils": "workspace:*"
  }
}
```

The `workspace:*` protocol (pnpm) or `*` (yarn/npm) tells the package manager to use the local workspace version. Turborepo understands this graph and ensures `@myapp/utils` builds before `@myapp/ui`.

---

## Running Tasks Selectively

You don't always want to run tasks across every package. Turborepo provides filtering options:

```bash
# Run build only in the web app and its dependencies
turbo run build --filter=web

# Run tests in packages that changed since main branch
turbo run test --filter=[main]

# Run build in a specific scope
turbo run build --filter=./apps/*

# Run a specific package
turbo run build --filter=@myapp/ui

# Run only packages that changed compared to origin/main
turbo run test --filter=[origin/main]
```

This is particularly useful in CI, where you want to test only the packages affected by a pull request:

```yaml
# .github/workflows/ci.yml
- name: Run affected tests
  run: turbo run test --filter=[origin/main]
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # needed for --filter=[HEAD^1]

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Build and Test
        run: turbo run build test lint
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

With `TURBO_TOKEN` and `TURBO_TEAM` set, every CI run benefits from remote caching—a massive time saver on large monorepos.

### Turborepo with Docker

For services deployed via Docker, use Turborepo's pruning feature to create lean Docker images:

```bash
# Generate a pruned subset of the monorepo for a specific app
turbo prune --scope=api --docker
```

This creates an `out/` directory with:
- `out/json/` — only the `package.json` files needed
- `out/full/` — full source for the pruned scope

**Dockerfile using pruning:**

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

# Prune the repo for the api app
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=api --docker

# Install dependencies
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
RUN turbo run build --filter=api

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
CMD ["node", "dist/index.js"]
```

This approach produces minimal Docker images that only include what the target application actually needs.

---

## Turborepo vs Alternatives

| Feature | Turborepo | Nx | Moon |
|---|---|---|---|
| Language | JavaScript/TypeScript | Any | Any |
| Remote caching | Vercel (free) or self-hosted | Nx Cloud | Moonbase |
| Setup complexity | Low | Medium-High | Medium |
| Plugin ecosystem | Limited | Extensive | Growing |
| Performance | Excellent | Excellent | Excellent |
| Learning curve | Gentle | Steeper | Moderate |

**Choose Turborepo if:** You have a JS/TS monorepo and want maximum speed with minimal configuration. The Vercel integration makes remote caching trivially easy to set up.

**Choose Nx if:** You need support for multiple languages, extensive plugin integrations, or built-in project generation tools.

---

## Summary

Turborepo solves the most painful problem in monorepo development: slow builds. Its combination of dependency graph awareness, aggressive caching (local and remote), and parallel execution means builds that once took minutes complete in seconds.

The setup is straightforward: add `turbo.json`, define your pipeline, specify what to cache, and let Turborepo handle the rest. Remote caching with Vercel requires minimal configuration and delivers immediate CI speedups.

For JavaScript and TypeScript teams managing multiple related packages, Turborepo is the clearest path from "builds are painfully slow" to "builds are genuinely fast."

---

*Explore more build tools and developer productivity resources at [DevPlaybook](https://devplaybook.cc).*
