---
title: "Monorepo Tools Compared: Turborepo vs Nx vs Moon 2026"
description: "In-depth comparison of the top monorepo tools for 2026: Turborepo, Nx, Moon, and Rush. Compare setup, caching, task orchestration, CI integration, and benchmarks to pick the right tool for your team."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["monorepo", "turborepo", "nx", "developer-tools", "ci-cd", "build-tools"]
category: "developer-tools"
readingTime: "18 min read"
---

Managing a monorepo without the right tooling is a study in frustration: slow builds, flaky caches, cryptic task graphs, and CI pipelines that take twenty minutes to tell you something already broken locally. The right monorepo tool turns that mess into a 30-second incremental build with remote caching and automatic dependency tracking.

In 2026, four tools dominate the space: **Turborepo**, **Nx**, **Moon**, and **Rush**. Each takes a fundamentally different philosophy to the problem. This guide breaks down every dimension that matters — setup, caching, task orchestration, CI integration, migration paths, and real-world benchmarks — so you can make an informed choice before you commit.

Whether you're starting a greenfield monorepo or wrestling with an existing multi-package repo that's outgrown basic Yarn workspaces, this comparison has you covered. If you want to scaffold a new project instantly, try our [Project Scaffolder](/tools/project-scaffolder).

---

## Why Monorepo Tooling Matters in 2026

Plain package managers (npm, Yarn, pnpm) give you workspaces — but workspaces alone don't solve:

- **Incremental builds**: without a task graph and hash-based caching, every CI run rebuilds everything.
- **Affected-only testing**: running all tests on every PR is noise; you need to run only the tests affected by changed packages.
- **Task ordering**: if `api` depends on `shared`, you need `shared` built before `api` — and that ordering needs to be computed, not hardcoded.
- **Remote caching**: sharing build artifacts across machines and CI workers cuts pipeline time by 60–80%.

In 2024, Turborepo was the clear default choice. In 2026, the landscape is more nuanced: Nx has closed the ergonomics gap, Moon has carved out a performance niche, and Rush remains the choice for large-scale enterprise.

---

## Quick Comparison Matrix

| Feature | Turborepo | Nx | Moon | Rush |
|---|---|---|---|---|
| **Language** | Go (runner), TS (config) | TypeScript | Rust | TypeScript |
| **Config format** | `turbo.json` | `project.json` / `nx.json` | `moon.yml` | `rush.json` |
| **Remote cache** | Vercel (free tier) | Nx Cloud (free tier) | Moonrepo Cloud | Custom only |
| **Affected detection** | File hash | Git diff + graph | File hash + VCS | Git diff |
| **Code generation** | No | Yes (generators) | No | Partial |
| **Plugin ecosystem** | Minimal | Extensive | Growing | Minimal |
| **Learning curve** | Low | Medium-High | Medium | High |
| **Best for** | JS/TS teams, fast setup | Large orgs, full-stack | Performance-critical | Enterprise/banking |

---

## Turborepo

### Overview

Turborepo (acquired by Vercel in 2021, rewritten in Go in 2023) is the lowest-friction entry point into monorepo tooling. The core philosophy: define your task pipeline in one JSON file, and Turborepo figures out the rest.

### Setup

```bash
# New monorepo from scratch
npx create-turbo@latest my-monorepo

# Add to existing workspace
npx @turbo/codemod add-turbo
```

The `turbo.json` at the root declares your pipeline:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
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

The `^build` syntax means "run the `build` task in all upstream dependencies first." That's the entire dependency declaration model — it's deliberately simple.

### Caching

Turborepo's cache key combines:
1. All source files in the package
2. Environment variables listed in `globalEnv` / `env`
3. The task configuration hash

Hits are logged clearly:

```
Tasks:    3 successful, 3 cached, 0 failures
Cached:   3 cached, replay in 180ms
Time:     15.702s → 180ms >>> FULL TURBO
```

**Remote caching** requires a Vercel account (free tier: unlimited for open source, paid for private). You can self-host with the open `@turbo/remote-cache` package against S3, R2, or any HTTP store.

### Task Orchestration

Turborepo runs tasks in parallel by default, respecting the `dependsOn` graph. You can target specific workspaces:

```bash
turbo run build --filter=@myorg/api
turbo run build --filter=...[origin/main]   # only affected packages
turbo run build --filter=./apps/*           # glob
```

### CI Integration

GitHub Actions example with remote cache:

```yaml
- name: Install
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm turbo run build --cache-dir=.turbo
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### Strengths & Limitations

**Strengths:**
- Fastest time-to-productive for small/medium teams
- Zero-config defaults that work out of the box
- Excellent Vercel integration for Next.js shops
- Go-based runner is fast and has no Node version dependency

**Limitations:**
- No code generation or scaffolding
- Plugin ecosystem is thin
- No native support for non-JS languages
- Remote cache vendor lock-in to Vercel unless self-hosted

---

## Nx

### Overview

Nx (maintained by Nrwl) is the most feature-complete monorepo framework in the JS ecosystem. Where Turborepo focuses on task running, Nx is a full developer platform: task running, code generation, project graph visualization, IDE integration, and a plugin system that covers React, Angular, Next.js, NestJS, Fastify, Remix, and more.

### Setup

```bash
# Create new Nx workspace
npx create-nx-workspace@latest my-org --preset=ts

# Add Nx to existing repo
npx nx@latest init
```

Nx uses two config files:

**`nx.json`** — workspace-level settings:
```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

**`project.json`** per package (or `package.json` scripts for simpler configs):
```json
{
  "name": "api",
  "targets": {
    "build": {
      "executor": "@nx/webpack:webpack",
      "options": {
        "main": "src/main.ts",
        "outputPath": "dist/api"
      }
    },
    "test": {
      "executor": "@nx/jest:jest"
    }
  }
}
```

### Project Graph & Affected Detection

Nx's killer feature is its **project graph** — a static analysis of your codebase that maps import relationships, not just declared `package.json` dependencies. This means if `apps/web` imports from `libs/auth` via a TypeScript path alias (not a declared dep), Nx still knows about that edge.

```bash
nx graph          # Opens interactive browser visualization
nx affected:graph # Shows only affected subgraph
```

Affected detection uses `git diff` against a base commit:

```bash
nx affected --target=build --base=main --head=HEAD
nx affected --target=test --base=origin/main
```

### Code Generation

Nx generators are its most distinctive feature. Every official plugin ships generators for common patterns:

```bash
nx g @nx/react:app my-new-app
nx g @nx/react:lib shared-ui --publishable
nx g @nx/node:lib api-interfaces
```

You can write custom generators in TypeScript:

```typescript
import { Tree, formatFiles, generateFiles } from '@nx/devkit';

export default async function(tree: Tree, options: MyOptions) {
  generateFiles(tree, path.join(__dirname, 'files'), options.projectRoot, options);
  await formatFiles(tree);
}
```

### Nx Cloud (Remote Caching + DTE)

Nx Cloud provides:
- **Remote caching**: cache hits shared across all CI agents and developer machines
- **Distributed Task Execution (DTE)**: splits tasks across multiple CI agents automatically
- **AI task scheduling**: optimizes agent assignment based on historical run times

Free tier covers 500 hours/month. The DTE feature alone can cut a 20-minute CI run to 4 minutes by parallelizing across 5 agents.

### CI Integration

```yaml
- uses: nrwl/nx-set-shas@v3  # Sets NX_BASE and NX_HEAD env vars

- name: Run affected builds
  run: npx nx affected --target=build --base=$NX_BASE --head=$NX_HEAD

- name: Run affected tests
  run: npx nx affected --target=test --base=$NX_BASE --head=$NX_HEAD
```

### Strengths & Limitations

**Strengths:**
- Most complete feature set: generators, graph viz, IDE extension, DTE
- Plugin ecosystem covers virtually every JS framework
- Static analysis affected detection (import-based, not just dep-based)
- Nx Cloud DTE is genuinely transformative for large repos

**Limitations:**
- Steeper learning curve — many config concepts to internalize
- Large repos with `project.json` files can feel config-heavy
- Nx Cloud pricing scales with team size
- Heavy on TypeScript toolchain; non-TS stacks get less benefit

---

## Moon

### Overview

Moon (by moonrepo) is a newer entrant written in Rust, targeting teams that need maximum performance and polyglot support. Moon manages not just task running but the **entire toolchain** — Node.js version, package manager, even language runtimes — per workspace or per project.

### Setup

```bash
# Install moon
npm install --save-dev @moonrepo/cli

# Initialize
moon init
```

Moon uses YAML configuration:

**`.moon/workspace.yml`**:
```yaml
projects:
  - 'apps/*'
  - 'packages/*'

node:
  version: '20.11.0'
  packageManager: pnpm
  addEnginesConstraint: true
  syncVersionManagerConfig: true

vcs:
  manager: git
  defaultBranch: main
```

**`moon.yml`** per project:
```yaml
language: typescript
type: application

tasks:
  build:
    command: tsc
    inputs:
      - 'src/**/*'
      - 'tsconfig.json'
    outputs:
      - 'dist'

  test:
    command: vitest run
    deps:
      - build
    inputs:
      - 'src/**/*'
      - 'tests/**/*'
```

### Toolchain Management

Moon's most unique feature: it manages the entire toolchain, not just tasks. Define Node.js version once in `.moon/workspace.yml` and Moon ensures every developer and CI agent uses the same version. No more `.nvmrc` vs `.tool-versions` confusion.

```yaml
# .moon/toolchain.yml
node:
  version: '20.11.0'
bun:
  version: '1.1.0'
rust:
  version: '1.76.0'
```

This works for Node, Bun, Deno, Python, Rust, and Go — making Moon a genuine polyglot monorepo solution.

### Caching

Moon's cache is hash-based (like Turborepo) but computed in Rust for speed. The cache key includes:
- Input file contents (via SHA256)
- Environment variable values
- Task configuration
- Toolchain version

Remote caching via Moonrepo Cloud uses the same API surface as other tools but is notably fast due to the Rust client.

### Performance Benchmarks

In the moonrepo team's published benchmarks (10,000-file monorepo, warm cache):

| Tool | Cold build | Warm build (cache hit) |
|------|-----------|------------------------|
| Moon | 8.2s | 0.9s |
| Turborepo | 9.1s | 1.1s |
| Nx | 12.4s | 1.4s |

These numbers vary by repo size and task complexity — take vendor benchmarks with appropriate skepticism — but Moon's Rust foundation does show up in large repos.

### Strengths & Limitations

**Strengths:**
- Fastest task runner in real-world benchmarks
- Polyglot toolchain management (Node, Rust, Go, Python, Bun)
- Clean YAML config that's easy to read and diff
- Enforced toolchain versioning across team/CI

**Limitations:**
- Younger project — smaller community, fewer integrations
- No code generation
- IDE integration (VS Code extension) is less polished than Nx
- Remote cache service is newer and less battle-tested

---

## Rush

### Overview

Rush (by Microsoft, open source) is built for large enterprise monorepos — think hundreds of packages, multiple teams, strict versioning policies, and audit requirements. It's the most opinionated of the four and requires the most setup, but it solves problems the others don't address at scale.

### Setup

```bash
npm install -g @microsoft/rush
rush init
```

Rush generates a `rush.json` at the root that lists every project explicitly:

```json
{
  "rushVersion": "5.120.0",
  "pnpmVersion": "8.15.0",
  "nodeSupportedVersionRange": ">=20.0.0 <21.0.0",
  "projects": [
    {
      "packageName": "@myorg/api",
      "projectFolder": "apps/api",
      "reviewCategory": "production"
    },
    {
      "packageName": "@myorg/shared",
      "projectFolder": "packages/shared",
      "reviewCategory": "production"
    }
  ]
}
```

### Key Features

**Consistent installs**: Rush uses a single `pnpm-lock.yaml` across the entire repo, ensuring reproducible installs.

**Change files**: Rush's versioning system requires developers to commit "change files" describing bumps:

```bash
rush change  # Interactive prompt to describe changes
rush publish # Bumps versions and publishes in correct order
```

**Build cache**: Rush has a local and remote build cache similar to Turborepo, using a pluggable cache provider (Azure Blob, S3, or custom).

**Policies**: Rush can enforce policies like "no phantom dependencies" (all imports must be declared), "no cyclic dependencies," and "approved packages only" — critical for regulated industries.

### When to Choose Rush

Rush is not the default choice — it's the right choice when you have:
- 50+ packages and multiple independent teams
- Strict versioning and publishing requirements
- A need for dependency policy enforcement
- An existing Microsoft ecosystem (Azure DevOps, Azure Blob)

For teams below that scale, the setup overhead isn't worth it.

---

## Migration Guides

### Migrating from Plain Workspaces to Turborepo

1. Install Turborepo: `npm install turbo --save-dev`
2. Add `turbo.json` to the root with your pipeline
3. Replace `npm run build --workspaces` with `turbo run build`
4. Add `.turbo` to `.gitignore`
5. Set up remote cache (optional but recommended)

The migration is low-risk — Turborepo wraps your existing scripts, so nothing breaks.

### Migrating from Turborepo to Nx

```bash
npx nx@latest init  # Auto-detects Turborepo config and migrates
```

Nx's `init` command reads your `turbo.json` and generates equivalent `nx.json` and `project.json` files. The migration is well-supported with a guided CLI.

### Migrating from Lerna to Any Modern Tool

Lerna v6+ delegates task running to Nx by default. If you're on Lerna for version management only, you can keep it and add Turborepo or Nx for task running:

```bash
npx nx@latest init  # Works alongside Lerna
```

---

## CI Integration Deep Dive

### GitHub Actions with Turborepo

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo run build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

      - name: Test
        run: pnpm turbo run test
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### GitHub Actions with Nx (Affected)

```yaml
name: CI
on: [push, pull_request]

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: nrwl/nx-set-shas@v3

      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: npx nx affected -t lint --base=$NX_BASE
      - run: npx nx affected -t test --base=$NX_BASE --parallel=3
      - run: npx nx affected -t build --base=$NX_BASE
        env:
          NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}
```

### Remote Cache on Self-Hosted Infrastructure

For teams that can't use vendor cloud services:

**Turborepo + S3:**
```bash
npm install --save-dev @turborepo/remote-cache
```

```typescript
// turbo-cache-server.ts
import { createServer } from '@turborepo/remote-cache';
import { s3 } from '@turborepo/remote-cache/providers/s3';

const server = createServer({
  provider: s3({
    bucket: process.env.S3_BUCKET!,
    region: process.env.AWS_REGION!,
  }),
  token: process.env.TURBO_TOKEN!,
});

server.listen(3000);
```

**Nx + custom cache:**
```typescript
// nx-remote-cache.ts
import { RemoteCacheImplementation } from '@nrwl/workspace/src/utilities/nx-cache';

export const RemoteCache: RemoteCacheImplementation = {
  store: async (hash, cacheResult) => { /* write to your store */ },
  retrieve: async (hash) => { /* read from your store */ },
};
```

---

## Decision Framework: Which Tool Should You Choose?

### Choose Turborepo if:

- You're a small/medium team (2–30 engineers) starting fresh
- Your stack is primarily Next.js / Vercel
- You want to be productive in under an hour
- You don't need code generation

### Choose Nx if:

- You have complex, multi-framework requirements (React + Angular + Node)
- You want generated scaffolding for new packages/apps
- You need the project graph for documentation and onboarding
- Your team will invest time in learning the platform
- You want DTE on CI

### Choose Moon if:

- You have a polyglot repo (Node + Rust, Node + Go, etc.)
- Toolchain version consistency is a recurring pain point
- You care deeply about raw performance
- Your team is comfortable with YAML-heavy config

### Choose Rush if:

- You have 50+ packages managed by multiple teams
- You need strict versioning and publishing workflows
- You operate in a regulated industry with audit requirements
- Your infra is Azure-based

---

## Real-World Configuration Tips

### Handling Environment Variables

All four tools hash environment variables into cache keys. Be explicit:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "env": ["NODE_ENV", "DATABASE_URL", "API_BASE_URL"],
      "passThroughEnv": ["CI", "GITHUB_SHA"]
    }
  }
}
```

`env` variables affect the cache hash. `passThroughEnv` variables are forwarded to the task but don't bust the cache.

### Managing `node_modules` Across Packages

Use `pnpm` workspaces with `shamefully-hoist: false` (default) for the strictest isolation. This forces packages to declare all dependencies explicitly and prevents phantom dependency bugs.

```yaml
# .npmrc for pnpm
shamefully-hoist=false
strict-peer-dependencies=false
```

### Versioning and Publishing

None of the task runners handle versioning natively (except Rush). For the others, use:
- **Changesets** (`@changesets/cli`) — GitHub-native, works with any monorepo tool
- **Semantic Release** — fully automated based on commit messages
- **Lerna** (version management only) — pair with Turborepo or Nx for task running

---

## Summary

The monorepo tooling landscape in 2026 offers genuinely excellent options at every complexity level. **Turborepo** wins on simplicity; **Nx** wins on features; **Moon** wins on performance and polyglot support; **Rush** wins on enterprise governance.

The good news: migrating between most of these tools is feasible if your needs change. Start with Turborepo for simplicity. Move to Nx when you need generators and DTE. Adopt Moon if Rust performance starts mattering. Reserve Rush for true enterprise scale.

Whatever you choose, the single biggest leverage point is the same: **set up remote caching on day one**. That alone — more than any other feature — is what separates a pleasant monorepo from a painful one.

---

*Explore more developer tooling at [DevPlaybook](/tools). For project setup help, try our [Project Scaffolder](/tools/project-scaffolder).*
