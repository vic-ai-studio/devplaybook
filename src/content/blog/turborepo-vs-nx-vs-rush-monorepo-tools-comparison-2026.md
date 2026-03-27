---
title: "Turborepo vs Nx vs Rush: Monorepo Tools Comparison 2026"
description: "A deep comparison of Turborepo, Nx, and Rush for monorepo management in 2026 — build caching, task orchestration, migration paths, learning curve, remote caching, and when to choose each tool for your JavaScript/TypeScript monorepo."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["turborepo", "nx", "rush", "monorepo", "build-tools", "typescript", "javascript", "performance", "ci"]
readingTime: "15 min read"
---

Managing a monorepo without the right tooling is a nightmare. Slow builds. Broken dependency graphs. Developers waiting 20 minutes for a CI check that should take 2. The right monorepo tool transforms that experience — turning a sprawling codebase into a well-oiled machine where you only rebuild what changed.

In 2026, three tools dominate JavaScript/TypeScript monorepo management: **Turborepo**, **Nx**, and **Rush**. Each solves the core problem (intelligent build orchestration) but makes very different decisions about how, and for whom.

This guide digs into the technical specifics so you can make an informed choice rather than following the latest Twitter hype.

---

## Why Monorepo Tooling Matters

Before comparing tools, understand the problem they solve. In a monorepo without intelligent tooling:

- **Every CI run rebuilds everything** — even when only one package changed
- **Task ordering is manual** — developers must remember that package-a must build before package-b
- **No caching** — identical code inputs produce fresh builds every time
- **Circular dependency detection** is non-existent until runtime errors

The three tools below solve all of these with different philosophies on configuration, extensibility, and organizational scale.

---

## The Three Tools at a Glance

| Feature | Turborepo | Nx | Rush |
|---------|-----------|----|----|
| **Creator** | Vercel (acquired from Jared Palmer) | Nrwl/Nx Inc. | Microsoft |
| **Language** | Go (CLI), TypeScript (config) | TypeScript | TypeScript/Node.js |
| **Config format** | `turbo.json` | `nx.json` + `project.json` | `rush.json` + `package.json` |
| **Package manager** | Any (npm/yarn/pnpm) | Any | pnpm (enforced) |
| **Remote caching** | Vercel Remote Cache / self-host | Nx Cloud / self-host | Custom build cache |
| **Code generation** | No (minimal) | Yes (extensive) | No |
| **Plugin ecosystem** | Small | Large | Small |
| **Ideal org size** | Small–medium | Medium–large | Large enterprise |
| **Learning curve** | Low | Medium | High |
| **License** | MIT | MIT (core) | MIT |

---

## Build Caching: The Core Feature

All three tools implement content-addressed caching — the idea that if your inputs (source files, environment variables, dependencies) haven't changed, the output (build artifacts, test results) is the same. Skip the computation; restore from cache.

### Turborepo Caching

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "inputs": ["src/**", "package.json", "tsconfig.json"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "inputs": ["src/**", "tests/**"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

Turborepo's caching is file-content-based. The cache key is a hash of all inputs. Miss the cache? Execute and save. Hit the cache? Restore and skip.

**Local cache:** Stored in `node_modules/.cache/turbo` by default.
**Remote cache:** Vercel Remote Cache (free for personal use, paid for teams) or self-hosted with open-source compatible implementations.

Cache hit rates of 80–95% are common in active monorepos.

### Nx Caching

```json
// nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "remoteCache": {
          "enabled": true
        }
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"]
    }
  }
}
```

Nx caching is more fine-grained than Turborepo. You can define **named inputs** that reuse input patterns across multiple targets:

```json
// nx.json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/jest.config.ts"
    ]
  }
}
```

This lets `test` targets exclude test files from the production build cache key — a subtle but meaningful optimization.

**Remote cache:** Nx Cloud (generous free tier) or self-hosted via nx-remotecache plugins.

### Rush Caching

Rush's build cache integrates at the project level:

```json
// rush.json (simplified)
{
  "buildCacheEnabled": true,
  "cacheProvider": "azure-blob-storage",
  "azureBlobStorageConfiguration": {
    "storageContainerName": "rush-build-cache",
    "storageAccountName": "mycompanybuildcache"
  }
}
```

Rush's cache is enterprise-oriented — Azure Blob Storage and Amazon S3 are first-class providers. It also supports a local file system cache for developer workstations.

Rush's incrementality goes deeper: its **phased builds** feature splits each project into phases (e.g., compile, test, publish) with independent caching, enabling very granular cache hits across a large project graph.

---

## Task Orchestration

Beyond caching, orchestration determines *when* tasks run relative to each other.

### Turborepo: Pipeline-Based

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]  // ^ means: run deps' build first
    },
    "test": {
      "dependsOn": ["build"]  // Run after THIS package's build
    },
    "dev": {
      "persistent": true,    // Long-running task
      "dependsOn": ["^build"]
    }
  }
}
```

Turborepo's pipeline is declarative and simple. `^` prefix means "topological dependency" (build all dependencies first). Tasks without `^` are package-local.

Running `turbo run build` automatically:
1. Determines the dependency graph from `package.json` workspaces
2. Builds a topological sort
3. Runs tasks in parallel where possible
4. Caches results

### Nx: Project Graph + Inferred Tasks

Nx builds an explicit project graph and can automatically infer task dependencies from your code:

```bash
# Visualize the project graph
nx graph

# Run affected tasks (only what changed since main)
nx affected --target=build
nx affected --target=test --base=main
```

Nx's **affected** command is particularly powerful in CI: it computes the minimal set of projects affected by your change and only runs tasks for those projects and their dependents.

```bash
# In CI: only test what a PR actually changed
nx affected --target=test --base=origin/main --head=HEAD
```

This can cut CI times dramatically in large monorepos where most PRs touch only a few packages.

### Rush: Phased Builds

Rush introduces "phases" — ordered build stages that can run across all projects simultaneously:

```json
// rush.json
{
  "phases": [
    {
      "name": "_phase:build",
      "dependencies": { "upstream": ["_phase:build"] }
    },
    {
      "name": "_phase:test",
      "dependencies": { "self": ["_phase:build"] }
    }
  ]
}
```

This enables scenarios like: "compile ALL packages in the repo before running tests on ANY package." For very large repos with complex interdependencies, phased builds can improve CPU utilization significantly.

---

## Setup Examples

### Turborepo Setup

```bash
# Create new monorepo with Turborepo
npx create-turbo@latest my-monorepo

# Add to existing monorepo
npx turbo@latest init
```

Structure:
```
my-monorepo/
├── apps/
│   ├── web/          # Next.js app
│   └── api/          # Express API
├── packages/
│   ├── ui/           # Shared components
│   ├── config/       # Shared configs
│   └── utils/        # Shared utilities
├── turbo.json
└── package.json      # Workspace root
```

`package.json` workspaces config:
```json
{
  "name": "my-monorepo",
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

### Nx Setup

```bash
# Create new Nx workspace
npx create-nx-workspace@latest my-workspace

# Add Nx to existing monorepo
npx nx@latest init
```

Nx offers more opinionated scaffolding with "presets" for different project types:

```bash
# Full-stack Next.js + NestJS workspace
npx create-nx-workspace@latest --preset=next

# Generate a new app
nx g @nx/next:app my-app

# Generate a shared library
nx g @nx/js:lib my-lib --publishable
```

```json
// project.json (per-project config)
{
  "name": "my-app",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "options": {
        "outputPath": "dist/apps/my-app"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/my-app/jest.config.ts"
      }
    }
  }
}
```

### Rush Setup

```bash
# Install Rush globally
npm install -g @microsoft/rush

# Initialize Rush in a new repo
rush init

# Install all dependencies
rush install

# Build the entire repo
rush build
```

Rush enforces pnpm and manages a single lockfile for the entire monorepo:

```json
// rush.json (excerpt)
{
  "rushVersion": "5.120.0",
  "pnpmVersion": "8.15.0",
  "nodeSupportedVersionRange": ">=18.0.0 <20.0.0",
  "projects": [
    {
      "packageName": "@my-org/web-app",
      "projectFolder": "apps/web-app",
      "shouldPublish": false
    },
    {
      "packageName": "@my-org/shared-utils",
      "projectFolder": "packages/shared-utils",
      "shouldPublish": true
    }
  ]
}
```

---

## Remote Caching

Remote caching lets CI and developers share build artifacts — your PR's build reuses work from main branch runs, and vice versa.

### Turborepo Remote Cache

```bash
# Authenticate with Vercel Remote Cache
npx turbo login
npx turbo link  # Link to Vercel team

# Or use self-hosted cache server
# TURBO_API=https://your-cache.example.com
# TURBO_TOKEN=your-token
# TURBO_TEAM=your-team
```

Vercel's remote cache is free for personal accounts. Team plans start at Vercel Pro pricing. The open-source `turborepo-remote-cache` project lets you self-host on any S3-compatible storage.

### Nx Cloud Remote Cache

```bash
# Connect to Nx Cloud
npx nx connect-to-nx-cloud

# Or self-host
# nx-remotecache-s3, nx-remotecache-azure, nx-remotecache-gcs
```

Nx Cloud's free tier is generous (500 saved computation hours/month). It also provides CI analytics, distributed task execution, and build insights dashboards.

### Rush Remote Cache

Rush's cache integrates directly with enterprise storage:

```json
// common/config/rush/build-cache.json
{
  "buildCacheEnabled": true,
  "cacheProvider": "amazon-s3",
  "amazonS3Configuration": {
    "s3Region": "us-east-1",
    "s3Bucket": "my-company-rush-cache"
  }
}
```

This approach fits large enterprises with existing Azure or AWS infrastructure — no new vendor, just another bucket.

---

## Learning Curve

### Turborepo: Lowest Barrier

Turborepo is designed to be added to an existing monorepo in minutes:

```bash
npx turbo@latest init
# Answer a few questions
# Done — turbo.json created, scripts updated
```

The mental model is simple: define your tasks and their dependencies in `turbo.json`. Turborepo handles the rest. For most teams, the entire configuration fits in 50–100 lines.

**Time to productive:** 1–2 hours.

### Nx: Medium Investment, High Return

Nx requires more upfront learning but provides more power:

- Understand the project graph model
- Learn project.json configuration
- Optionally adopt Nx generators and executors
- Configure named inputs for optimal caching

The payoff is significant for larger teams: code generation, consistency enforcement, plugin ecosystem, and superior affected computation.

**Time to productive:** 1–3 days.

### Rush: Steep Curve, Enterprise Payoff

Rush has the highest learning curve:

- Rush-specific commands replace npm/yarn (`rush install`, `rush build`, `rush add`)
- Developers must use `rush` instead of directly running `npm install`
- Separate config files for multiple concerns
- pnpm is required (not optional)

However, Rush's opinionated approach is a feature at scale — it enforces consistent practices across hundreds of packages and dozens of teams.

**Time to productive:** 1–2 weeks.

---

## Feature Comparison Deep Dive

| Feature | Turborepo | Nx | Rush |
|---------|-----------|----|----|
| **Local caching** | ✅ File system | ✅ File system | ✅ File system |
| **Remote caching** | ✅ Vercel / self-host | ✅ Nx Cloud / self-host | ✅ Azure S3 / custom |
| **Affected computation** | ✅ Basic | ✅ Advanced (git diff) | ✅ Incremental |
| **Parallel execution** | ✅ Auto | ✅ Auto | ✅ Configurable |
| **Code generation** | ❌ Minimal | ✅ Extensive | ❌ Minimal |
| **Plugin ecosystem** | ⚠️ Small but growing | ✅ Large (official + community) | ⚠️ Small |
| **Project constraints** | ❌ | ✅ Enforce boundaries | ✅ Dependency policies |
| **Distributed execution** | ❌ | ✅ Nx Cloud DTE | ❌ |
| **Versioning/publishing** | ✅ (via changesets) | ✅ (built-in) | ✅ (Rush change/publish) |
| **Workspace validation** | ❌ | ✅ | ✅ |
| **pnpm workspaces** | ✅ | ✅ | ✅ (required) |
| **Yarn workspaces** | ✅ | ✅ | ❌ |
| **npm workspaces** | ✅ | ✅ | ❌ |

---

## Migration Path

### Migrating to Turborepo

From an existing npm/yarn/pnpm workspace:

```bash
# 1. Install turbo
npm install turbo --save-dev

# 2. Create turbo.json
npx turbo@latest init

# 3. Update package.json scripts
# "build": "turbo run build"

# 4. Run and verify
npx turbo run build
```

Turborepo reads your existing workspace configuration — no restructuring required.

### Migrating to Nx

From plain workspace:
```bash
npx nx@latest init
# Nx analyzes your repo and generates nx.json
# Adds nx.json and project.json files
```

From Turborepo:
```bash
# Nx has a migration guide and codemods
nx g @nx/js:convert-to-nx-project
```

Nx migration is incremental — you can adopt features gradually.

### Migrating to Rush

Rush migration is the most significant investment:

1. Install Rush and run `rush init`
2. Populate `rush.json` with all projects
3. Replace `npm install` with `rush install` in all docs and CI
4. Migrate CI pipelines to use `rush build`/`rush test`
5. Train team on Rush-specific workflow

For large organizations, Microsoft provides consulting resources. The investment is substantial but the governance benefits at scale are real.

---

## When to Choose Each Tool

### Choose Turborepo When:

- **Small to medium teams** (2–30 engineers)
- **Speed over features** — you want faster builds with minimal configuration
- **Existing workspaces** you don't want to restructure
- **Vercel deployment** — native Vercel integration speeds up deployment pipelines
- **Package manager flexibility** — your team has a preferred package manager
- **Quick wins** — you need results this week, not after a month-long migration

### Choose Nx When:

- **Medium to large teams** (10–100+ engineers)
- **Code generation matters** — scaffolding new apps and libs consistently
- **Full-stack monorepos** with React, Angular, Node.js, and more
- **Affected analysis** is critical for CI efficiency
- **Strong plugin needs** — React, Angular, Next.js, NestJS, Storybook integrations
- **Visualization** — the `nx graph` command is genuinely useful for large repos
- **Distributed task execution** — Nx Cloud DTE can split work across multiple CI agents

### Choose Rush When:

- **Large enterprise** (50+ engineers, 100+ packages)
- **Microsoft ecosystem** — Azure, TypeScript, existing Microsoft tooling
- **Strict dependency governance** — you need to enforce which packages can depend on which
- **Versioning pipelines** — complex publishing workflows for many packages
- **Compliance requirements** — full audit trails on all dependency changes
- **pnpm-only** — your organization standardized on pnpm

---

## Real-World Performance

In a representative mid-sized monorepo (20 apps, 50 shared packages, 5,000 tests):

**Cold build (no cache, CI):**
- Without monorepo tooling: ~45 min
- Turborepo: ~12 min (parallel execution)
- Nx: ~8 min (better parallel + affected)
- Rush: ~10 min (parallel, phased)

**Warm build (with remote cache, CI):**
- Turborepo: ~2 min (mostly cache hits)
- Nx: ~1.5 min (slightly better cache granularity)
- Rush: ~2 min

**Local development (incremental, one package changed):**
- All tools: ~10–30 seconds for affected packages

The differences matter more at scale. A 200-package monorepo with Nx's affected computation running only 5% of tests on a typical PR is genuinely transformative.

---

## Ecosystem Support

### Turborepo

- Active Vercel development
- Next.js monorepo starters use Turborepo by default
- Smaller plugin ecosystem, but core functionality is solid
- GitHub Actions integration through `@turbo/workspaces` action

### Nx

- Largest ecosystem of the three
- Official plugins: `@nx/react`, `@nx/angular`, `@nx/next`, `@nx/nest`, `@nx/node`, `@nx/storybook`, `@nx/cypress`, `@nx/jest`, `@nx/playwright`, `@nx/expo`, and more
- Community plugins extend to Rust, Go, Java, .NET
- Nx Console VS Code extension provides GUI for generators

### Rush

- Microsoft internal teams use Rush at scale (Azure SDK, TypeScript compiler)
- `@rushstack` packages: ESLint config, heft (alternative to webpack), api-extractor
- Less community content but very active core team
- Rush "rig packages" enable sharing tool configurations across packages

---

## Making the Final Decision

```
"We have an existing workspace and want 2× faster CI this week"
→ Turborepo

"We're building a design system and multiple apps in one repo,
 need code generation and strict boundaries"
→ Nx

"We're a 200-person org with 150 npm packages, need audit trails,
 complex publishing, and enterprise-grade governance"
→ Rush

"We use Next.js and deploy to Vercel"
→ Turborepo (native integration)

"We're a Microsoft shop on Azure"
→ Rush

"We want the best 'affected' computation in CI"
→ Nx
```

There's no wrong answer among these three. Turborepo is the lowest-friction option and will satisfy most teams. Nx adds power for larger organizations. Rush handles governance requirements that Turborepo and Nx don't even try to address.

---

## Getting Started

Whichever tool you choose, use these DevPlaybook tools to set up and validate your project:

- [Package.json Validator](/tools/packagejson-validator) — validate your workspace root before adding monorepo tooling
- [npm Package Compare](/tools/npm-package-compare) — compare Turborepo vs Nx package stats
- [Semantic Version Bumper](/tools/semantic-version-bumper) — manage versioning across monorepo packages
- [Package Lock Analyzer](/tools/package-lock-analyzer) — inspect your lockfile before migrating package managers

---

## Further Reading

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Nx Documentation](https://nx.dev)
- [Rush Documentation](https://rushjs.io)
- [Monorepo.tools Comparison](https://monorepo.tools)
