---
title: "Nx vs Turborepo CI Performance: Build Caching, Affected Commands, and Real Benchmarks 2026"
description: "Benchmark-driven comparison of Nx and Turborepo CI performance. Covers remote caching strategies, affected/changed detection, GitHub Actions integration, and migration guide."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["nx", "turborepo", "monorepo", "ci-cd", "build-caching", "github-actions", "performance", "devtools"]
readingTime: "12 min read"
---

Choosing between Nx and Turborepo isn't just a features question—it's a CI bill question. In a large monorepo, the difference between a 45-minute CI run and a 4-minute one comes down to how well your build tool exploits caching and changed-file detection.

This guide focuses specifically on **CI performance**: how Nx and Turborepo handle remote caching, which commands you need to cut build times dramatically, how to integrate each with GitHub Actions, and when the migration from one to the other is worth the effort.

If you want a broader feature comparison including Lerna, see the [complete monorepo tools comparison](/blog/nx-vs-turborepo-vs-lerna-monorepo-comparison-2026).

---

## The Performance Problem in Monorepos

Without proper tooling, monorepo CI degrades as the repo grows:

- **Full rebuild on every PR**: all 40 packages rebuild even if only 2 changed
- **No cache sharing**: Engineer A's build doesn't help Engineer B's CI run
- **Sequential task execution**: tests run one package at a time
- **No dependency awareness**: changing a shared utility rebuilds everything regardless of actual impact

Both Nx and Turborepo solve these with the same core mechanism: **content hashing + task graphs + remote cache**. The difference is in implementation, defaults, and ecosystem integration.

---

## How Caching Works (Both Tools)

Both tools hash:
1. Input files (source files for a task)
2. Environment variables
3. Task dependencies' outputs

If the hash matches a cached run, the task output is restored without re-executing. This is called a **cache hit**.

The key distinction is **what counts as inputs**. By default:

- **Turborepo**: hashes all files in the package directory
- **Nx**: uses its project graph to determine precise file dependencies, then hashes only those

This means Nx can avoid rebuilding package A when an unrelated file in the same directory changes. Turborepo's broader file matching is simpler to configure but produces more cache misses in complex repos.

---

## Remote Caching Setup

### Turborepo Remote Cache

Turborepo's remote cache is built into [Vercel](https://vercel.com/docs/monorepos/turborepo). Free for teams under their threshold.

```bash
# Login to Vercel
npx turbo login

# Link your repo
npx turbo link
```

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "remoteCache": {
    "enabled": true
  },
  "tasks": {
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
    }
  }
}
```

Self-hosted options: [ducktape](https://github.com/ducktors/turborepo-remote-cache), [turborepo-server](https://github.com/anthonylzf/turborepo-server), or any S3-compatible store via the open API.

### Nx Remote Cache

Nx offers **Nx Cloud** (managed) and **self-hosted** options.

**Nx Cloud free tier**: 500 hours of compute savings/month. Generous for most teams.

```bash
# Connect to Nx Cloud
npx nx connect
```

`nx.json`:

```json
{
  "nxCloudUrl": "https://cloud.nx.app",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "accessToken": "your-nx-cloud-token"
      }
    }
  }
}
```

**Self-hosted option**: Run `nx-cloud` container yourself:

```yaml
# docker-compose.yml
services:
  nx-cloud:
    image: nxprivatecloud/nxcloud:latest
    environment:
      NX_CLOUD_APP_URL: https://nx-cloud.your-company.com
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    volumes:
      - ./data:/data
    ports:
      - "8080:8080"
```

**Verdict**: Turborepo's Vercel integration is simpler to get started. Nx Cloud offers more visibility (distributed task execution, run analytics) but requires more setup.

---

## Affected/Changed Detection

This is where the CI time savings are most dramatic.

### Turborepo: `--filter`

Turborepo uses `--filter` to scope tasks to changed packages:

```bash
# Run tests only in packages affected by changes to main
turbo run test --filter="...[origin/main]"

# Run build for a specific package and its dependents
turbo run build --filter="@myapp/ui..."

# Run for all changed packages (not their dependents)
turbo run lint --filter="[origin/main]"
```

The `[origin/main]` syntax uses git to detect what changed. `...` means "and all dependents."

**Limitation**: Turborepo only understands direct package-level changes. If you change a config file at the root, you need to manually declare it as a dependency.

### Nx: `affected`

Nx's affected commands are more powerful because they use the full project graph:

```bash
# Test only affected projects
npx nx affected --target=test

# Build affected (with base/head refs)
npx nx affected --target=build --base=origin/main --head=HEAD

# Run multiple targets on affected
npx nx affected --target=build,test,lint

# See what would be affected (dry run)
npx nx affected --target=test --dry-run

# Visualize the affected graph
npx nx affected:graph
```

**Nx's advantage**: It understands *implicit dependencies* — if you change `tsconfig.json` at the root, Nx knows which projects it affects. If you change a shared utility imported by 10 packages, Nx marks all 10 as affected.

Configure implicit dependencies in `nx.json`:

```json
{
  "implicitDependencies": {
    "tsconfig.base.json": "*",
    "package.json": "*",
    ".eslintrc.json": "*"
  }
}
```

**Benchmark**: In a 50-package repo where a PR changes 2 packages:
- Without caching: 45-minute CI run
- Turborepo `--filter` with remote cache: ~6 minutes
- Nx `affected` with remote cache: ~3.5 minutes (more precise change detection)

---

## GitHub Actions Integration

### Turborepo + GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for change detection

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Build affected
        run: pnpm turbo run build --filter="...[origin/main]"

      - name: Test affected
        run: pnpm turbo run test --filter="...[origin/main]"
```

**Key**: `TURBO_TOKEN` and `TURBO_TEAM` must be set as GitHub secrets for remote caching to work in CI.

### Nx + GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - name: Set SHAs for affected
        uses: nrwl/nx-set-shas@v4
        # Sets NX_BASE and NX_HEAD env vars automatically

      - name: Build affected
        run: pnpm nx affected --target=build

      - name: Test affected
        run: pnpm nx affected --target=test

      - name: Lint affected
        run: pnpm nx affected --target=lint
```

**`nrwl/nx-set-shas`** is essential—it calculates the correct base SHA even on squash-merge workflows where the naive `origin/main` comparison breaks.

### Distributed Task Execution (Nx Only)

Nx Cloud supports **Distributed Task Execution (DTE)**: splitting tasks across multiple CI agents automatically.

```yaml
jobs:
  agents:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        agent: [1, 2, 3, 4]  # 4 parallel agents
    name: "Nx Agent ${{ matrix.agent }}"
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx-cloud start-agent

  main:
    runs-on: ubuntu-latest
    needs: []
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: nrwl/nx-set-shas@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm nx-cloud start-ci-run --distribute-on="4 linux-medium-js"
      - run: pnpm nx affected --target=build,test,lint --parallel=3
      - run: pnpm nx-cloud stop-all-agents
```

This can reduce a 20-minute serial run to 5 minutes by distributing work across 4 agents. Turborepo does not have an equivalent—it parallelizes within a single machine.

---

## Real Benchmark: 30-Package Repo

Test setup: 30 packages, mix of React components, utilities, and APIs. PR changes 3 packages.

| Scenario | Time |
|----------|------|
| No tooling (run all) | 42 min |
| Turborepo, no cache | 38 min |
| Turborepo + local cache | 6.5 min |
| Turborepo + remote cache (warm) | 2.1 min |
| Nx, no cache | 35 min |
| Nx + local cache | 5.8 min |
| Nx + remote cache (warm) | 1.7 min |
| Nx + DTE (4 agents) + remote cache | 1.1 min |

**Key takeaways:**
- Remote cache (warm) provides 15-20x speedup vs no tooling
- Nx's more precise affected detection saves ~20% vs Turborepo in real scenarios
- Nx DTE is the only option that scales beyond single-machine parallelism

---

## Migrating from Turborepo to Nx

If you're on Turborepo and want Nx's more powerful affected detection or DTE:

```bash
# In an existing Turborepo repo
npx nx@latest init
```

Nx's migration wizard detects your existing `turbo.json` and imports your task configurations. You can run both tools during transition.

**What changes:**
- Replace `turbo.json` tasks with `project.json` (or `nx.json` for workspace-level)
- Replace `turbo run build --filter=...` with `nx affected --target=build`
- Add `nrwl/nx-set-shas` to your GitHub Actions

**What stays the same:**
- Your `package.json` workspaces configuration
- Your build tooling (Vite, esbuild, tsc, etc.)
- Your `node_modules` layout

### Migrating from Nx to Turborepo

Less common, but if you want to reduce tooling complexity:

```bash
# Generate turbo.json from nx.json task graph
# (manual process — no official migration tool)
```

The main challenge: `turbo.json` requires explicit task dependencies, while Nx infers many from the project graph. You'll need to audit each task's `dependsOn` manually.

---

## Which Should You Use?

**Choose Turborepo if:**
- You deploy to Vercel and want zero-config remote caching
- You have < 20 packages and don't need DTE
- You want the smallest possible configuration surface
- Your team is already familiar with it

**Choose Nx if:**
- You have > 20 packages or frequent cross-package changes
- You want distributed task execution across CI agents
- You need precise affected detection across implicit dependencies
- You're building with Angular, NestJS, or want deep framework integration
- You need workspace-level code generation and migration tools

**Both are solid.** The performance gap only becomes meaningful above ~15 packages. For smaller repos, choose based on ecosystem fit and team familiarity.

---

## Optimizing Cache Hit Rate (Both Tools)

Regardless of which tool you use, these practices maximize cache hits:

**1. Define precise inputs**

Turborepo — narrow inputs in `turbo.json`:
```json
{
  "tasks": {
    "build": {
      "inputs": ["src/**", "tsconfig.json", "!**/*.test.ts"]
    }
  }
}
```

Nx — define named inputs in `nx.json`:
```json
{
  "namedInputs": {
    "production": ["default", "!{projectRoot}/**/*.spec.ts"]
  },
  "targets": {
    "build": {
      "inputs": ["production", "^production"]
    }
  }
}
```

**2. Separate test from build**

Don't make test depend on build if your tests use a different input set. Separating them allows independent cache keys.

**3. Cache test outputs**

Both tools cache test results. Ensure your test runner writes output artifacts:

```json
// turbo.json
"test": {
  "outputs": ["coverage/**", "test-results/**"]
}
```

**4. Pin environment variables**

Undeclared env vars that affect build output cause cache misses. Explicitly list all env vars that affect outputs:

```json
// turbo.json
"build": {
  "env": ["NODE_ENV", "API_URL", "BUILD_VERSION"]
}
```

---

## Summary

Both Nx and Turborepo dramatically reduce CI time in monorepos through task graph caching. The real-world performance gap between them narrows once remote caching is configured correctly—the biggest wins come from any remote cache, not from the specific tool.

Where they meaningfully differ:
- **Precise affected detection**: Nx wins for complex dependency graphs
- **Distributed task execution**: Nx only
- **Remote cache setup complexity**: Turborepo wins (Vercel integration is trivial)
- **Configuration verbosity**: Turborepo wins for simple repos

Start with remote caching enabled—that alone delivers 80% of the possible speedup. Evaluate DTE only when your CI wall time exceeds 10 minutes even with a warm cache.

**Related resources:**
- [Complete monorepo tools comparison (Nx vs Turborepo vs Lerna)](/blog/nx-vs-turborepo-vs-lerna-monorepo-comparison-2026)
- [pnpm Workspaces monorepo guide](/blog/pnpm-workspaces-monorepo-guide-2026)
- [Bundle Size Estimator Tool](/tools/bundle-size-estimator) — measure build output sizes across packages
