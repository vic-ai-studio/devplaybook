---
title: "Turborepo vs Nx vs Lerna vs Bazel: Monorepo Tools Comparison 2026"
description: "Deep comparison of Turborepo, Nx, Lerna, and Bazel for monorepo management in 2026. Build caching, task pipelines, migration guides, and practical recommendations by team size."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["monorepo", "turborepo", "nx", "lerna", "bazel", "build-tools", "developer-tools"]
readingTime: "14 min read"
---

Managing a monorepo without the right tooling is painful. Shared code changes break downstream packages silently. Running `npm test` in the root rebuilds everything — the 2-second unit test that lives next to the 15-minute integration suite. CI times balloon. Developers start avoiding cross-package refactors because the blast radius is too hard to predict.

The four tools that dominate monorepo management in 2026 — Turborepo, Nx, Lerna, and Bazel — each solve these problems differently. Choosing the wrong one costs months of migration work. This guide helps you choose the right one the first time.

---

## What a Monorepo Tool Actually Does

Before comparing tools, it's worth being precise about the problem. A monorepo tool needs to answer four questions:

1. **What changed?** — Detect which packages are affected by a given commit
2. **What needs to run?** — Determine which tasks (build, test, lint) are necessary given those changes
3. **In what order?** — Respect dependency ordering to avoid building a package before its dependencies are ready
4. **Can we skip it?** — Cache task outputs so unchanged packages don't re-run

Every tool in this guide handles these four concerns. The differences are in scope, performance, ecosystem integration, and how much you have to configure.

---

## Turborepo

Turborepo (acquired by Vercel in 2021) is the newest entrant and the fastest-growing. It's built in Rust and Go, focuses exclusively on JavaScript/TypeScript monorepos, and prioritizes simplicity over configurability.

### Core concepts

Turborepo works with any package manager (npm, yarn, pnpm) and your existing `package.json` scripts. You define a pipeline in `turbo.json` that describes how tasks relate to each other and what outputs to cache.

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
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

The `^build` syntax means "build all dependencies before building this package." That's the entire dependency graph configuration.

### Remote caching

Turborepo's headline feature is remote caching. When a task runs, Turborepo hashes the inputs (source files, env vars, task config) and stores the outputs in a cache. On subsequent runs — locally or in CI — if the hash matches, outputs are restored from cache instead of re-running.

With Vercel Remote Cache, this is zero-config if you're already on Vercel. Self-hosted options (Ducktape, custom S3 implementations) work but require setup.

```bash
# Link to Vercel Remote Cache
npx turbo login
npx turbo link

# Run with caching
npx turbo run build test
```

### What Turborepo is good at

- **Zero-to-working in 30 minutes** for existing JS/TS monorepos
- **Incremental adoption** — add `turbo.json` to an existing workspace, keep existing scripts
- **Excellent Vercel/Next.js integration**
- **Fast** — the Rust core means scheduling and cache checks are genuinely quick

### What Turborepo lacks

- No code generation or scaffolding
- No built-in project graph visualization
- Limited support for polyglot monorepos
- No built-in migration tooling between configurations

**Best for:** JS/TS monorepos, teams already on Vercel, projects that want fast setup with minimal config.

---

## Nx

Nx (by Nrwl) is the most feature-complete tool in this comparison. It started as an Angular-focused tool, expanded to React and Node, and now supports any language through plugins. Where Turborepo focuses on task execution, Nx is a full development platform.

### Core concepts

Nx builds an explicit dependency graph of your workspace. It understands not just which packages depend on each other, but which files within packages are affected by specific changes.

```json
// nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "remoteCache": {
          "encryption": true,
          "container": "my-nx-cache"
        }
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"]
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/src/test-setup.[jt]s"
    ],
    "sharedGlobals": []
  }
}
```

### Affected commands

Nx's most powerful feature is `nx affected`:

```bash
# Only test projects affected by changes since main
nx affected --target=test --base=main --head=HEAD

# Build all affected projects in parallel (up to 3 concurrent)
nx affected --target=build --parallel=3
```

This works because Nx maintains a full project graph. It knows that changing a utility library affects every app that imports from it — and only those apps.

### Generators and executors

Nx has a rich code generation system. Plugins provide generators for scaffolding new apps, libraries, and components:

```bash
# Generate a new React app
nx g @nx/react:app my-app

# Generate a shared library
nx g @nx/js:lib shared-utils

# Generate a component in an existing app
nx g @nx/react:component Button --project=my-app
```

This is a major differentiator. Turborepo has no equivalent.

### Nx Cloud

Nx Cloud provides distributed task execution (DTE) — tasks are sharded across multiple CI agents automatically. This is a paid feature but can cut CI times by 50–80% on large monorepos by parallelizing across machines, not just CPU cores.

### What Nx is good at

- **Large monorepos** with complex dependency graphs
- **Polyglot support** — official plugins for React, Angular, Node, Next.js, Nest.js, Storybook, and more
- **Affected-based CI** — only test what changed
- **Code generation and scaffolding**
- **Project graph visualization** (`nx graph` opens an interactive dependency map)

### What Nx requires

- Steeper initial learning curve
- More configuration than Turborepo
- Some features (DTE, analytics) require Nx Cloud (paid)

**Best for:** Large teams, enterprise monorepos, projects that benefit from scaffolding and code generation, polyglot workspaces.

---

## Lerna

Lerna is the oldest tool in this comparison — it's been around since 2015 and was the de facto monorepo tool before Turborepo and Nx existed. After a period of low maintenance, it was adopted by Nrwl (the Nx team) in 2022 and received a major update.

Modern Lerna (v6+) delegates task running to Nx under the hood and focuses on what it originally did well: **package publishing and versioning**.

### Modern Lerna with Nx

```json
// lerna.json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "independent",
  "npmClient": "pnpm",
  "useWorkspaces": true
}
```

```bash
# Install and configure Nx integration
npx lerna add-caching
```

After this, Lerna uses Nx for task execution and caching. The `lerna run` commands still work but are powered by Nx's task runner.

### Package publishing

Where Lerna genuinely shines is managing package versions and publishing:

```bash
# Bump versions based on conventional commits
lerna version --conventional-commits

# Publish changed packages
lerna publish from-git

# Publish with independent versioning
lerna publish --independent
```

Lerna handles changelogs, git tags, npm publishing, and inter-package version bumps. Neither Turborepo nor Nx does this out of the box.

### When to use Lerna

Lerna makes most sense when:
- You're **publishing npm packages** from a monorepo (component libraries, SDK packages)
- You need **conventional changelog** generation
- Your team is already familiar with Lerna and the migration cost isn't worth it

Lerna is not the right choice if you're not publishing packages and you're starting fresh — Turborepo or Nx will serve you better.

**Best for:** Open-source monorepos publishing multiple npm packages, teams with existing Lerna setups.

---

## Bazel

Bazel is Google's open-source build system. It's the only tool in this comparison that is genuinely language-agnostic — it works equally well for Java, Go, Python, C++, and JavaScript. It's also the only one with hermetic, reproducible builds as a core guarantee.

### How Bazel works

Bazel uses `BUILD` files (similar to Makefiles) to define targets:

```python
# packages/my-lib/BUILD.bazel
load("@npm//@bazel/typescript:index.bzl", "ts_library")

ts_library(
    name = "my-lib",
    srcs = glob(["src/**/*.ts"]),
    deps = [
        "//packages/shared-utils",
        "@npm//lodash",
    ],
)

load("@npm//@bazel/jest:index.bzl", "jest_test")

jest_test(
    name = "my-lib-test",
    srcs = ["src/**/*.spec.ts"],
    deps = [":my-lib"],
)
```

Every build input is declared explicitly. Bazel sandboxes each action — a test can only access files it explicitly declares as inputs. This makes builds truly hermetic and reproducible.

### Remote execution

Bazel's remote execution (RBE) is the most powerful caching and distribution system in this comparison. Actions are content-addressed. If your team builds the same thing across 10 machines simultaneously, only one machine does the actual work — the rest hit the cache.

This is what Google uses internally to build Android, Chrome, and Google Search from a single monorepo.

### The cost of Bazel

Bazel has a steep learning curve. Migration from a standard npm workspace to Bazel can take weeks to months. BUILD files must be maintained as dependencies change. The JavaScript/TypeScript story improved with rules_js but still requires significant investment.

Tools like Gazelle can auto-generate BUILD files, but you still need to understand Bazel's execution model.

**Best for:** Large polyglot monorepos, organizations with dedicated build infrastructure teams, projects requiring truly hermetic builds (compliance, reproducibility).

---

## Head-to-Head Comparison

| Feature | Turborepo | Nx | Lerna | Bazel |
|---|---|---|---|---|
| **Setup time** | 30 min | 1–2 hrs | 1–2 hrs | Days–weeks |
| **JS/TS focus** | Yes | Yes | Yes | Partial |
| **Polyglot** | No | Partial | No | Yes |
| **Remote cache** | Yes (Vercel/self-hosted) | Yes (Nx Cloud/self-hosted) | Via Nx | Yes (RBE) |
| **Affected builds** | Yes | Yes (advanced) | Via Nx | Yes |
| **Code generation** | No | Yes | No | No |
| **Package publishing** | No | No | Yes | No |
| **Distributed execution** | No | Yes (paid) | Via Nx | Yes |
| **Learning curve** | Low | Medium | Low–Medium | High |
| **Hermetic builds** | No | No | No | Yes |

---

## Build Caching Deep Dive

Caching is the most important feature for CI time. Here's how each tool approaches it:

### Turborepo caching

Turborepo hashes inputs (source files + env vars + config) and stores task outputs. The hash is computed from:
- All files in the package
- Task configuration in `turbo.json`
- Declared environment variables

```bash
# See what's cached
turbo run build --dry=json

# Force re-run (ignore cache)
turbo run build --force
```

### Nx caching

Nx's caching is more granular. You can define `inputs` and `outputs` per target:

```json
{
  "targetDefaults": {
    "build": {
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"]
    }
  }
}
```

The `production` named input excludes test files from the hash — changing a spec file doesn't invalidate the build cache. This kind of fine-grained control meaningfully reduces unnecessary rebuilds.

---

## Migration Guide

### Migrating to Turborepo

1. Ensure you have a package manager workspace (`pnpm-workspace.yaml`, yarn `workspaces`, or npm `workspaces`)
2. Install: `npm install turbo --save-dev`
3. Create `turbo.json` with your pipeline
4. Replace `npm run build --workspaces` with `npx turbo run build`

The migration is incremental. Turborepo works alongside your existing scripts.

### Migrating to Nx

For existing repos, use `@nx/migrate`:

```bash
npx nx init
```

This analyzes your workspace and generates an initial `nx.json`. For React/Next.js apps, it installs the relevant plugin and configures executors.

### Migrating from Lerna

Modern Lerna v6+ handles this internally:

```bash
npx lerna add-caching
```

This adds Nx as the task runner while keeping your `lerna.json` and publishing workflows intact.

---

## Recommendations by Team Size

### Small teams (1–5 developers, <10 packages)

**Use Turborepo.** Setup is fast, configuration is minimal, and the build caching works immediately. The lack of scaffolding and code generation doesn't matter much at this scale — you're creating new packages infrequently.

### Mid-size teams (5–20 developers, 10–50 packages)

**Use Nx.** The affected-build feature becomes essential. Running all tests on every commit doesn't scale. Nx's project graph and generator ecosystem reduces the friction of expanding the monorepo and onboarding new contributors.

### Large teams (20+ developers, 50+ packages)

**Use Nx with Nx Cloud DTE, or evaluate Bazel.** At this scale, CI time is a critical productivity factor. Distributed task execution can cut 30-minute CI runs to 8 minutes. If you have polyglot requirements or strict reproducibility needs, Bazel's infrastructure investment starts paying off.

### Publishing npm packages

**Use Lerna (with Nx).** Nothing else handles conventional changelog generation, independent versioning, and npm publishing as well.

### Migrating an existing Lerna monorepo

**Update to Lerna v6+.** You get Nx task running and caching without changing your publishing workflow. Only migrate to pure Nx if you need the generator ecosystem.

---

## Practical turbo.json Patterns

### Environment variable handling

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "env": ["NODE_ENV", "API_URL"]
    }
  },
  "globalEnv": ["CI", "VERCEL_ENV"]
}
```

### Filtering tasks to specific packages

```bash
# Only build the web app and its dependencies
turbo run build --filter=web

# Build all packages that have changed
turbo run build --filter=[HEAD^1]

# Build specific package and its dependents
turbo run build --filter=...shared-utils...
```

### Parallel limits

```bash
# Limit to 4 concurrent tasks (useful for memory-intensive builds)
turbo run build --concurrency=4
```

---

## Practical nx.json Patterns

### Skipping cache for specific tasks

```json
{
  "targetDefaults": {
    "e2e": {
      "cache": false
    }
  }
}
```

### Running tasks in a specific order with topological sort

```bash
# Build all packages in dependency order
nx run-many --target=build --all --parallel=false
```

### Interactive project graph

```bash
nx graph
# Opens browser with interactive dependency visualization
```

This is genuinely useful for understanding why a change affects a distant package — you can trace the dependency path visually.

---

## Internal Tools on DevPlaybook

DevPlaybook has tools to help with monorepo workflows:

- **[JSON Formatter](/tools/json-formatter)** — Validate `turbo.json` and `nx.json` configurations
- **[Regex Tester](/tools/regex-tester)** — Build glob patterns for `inputs`/`outputs` configuration
- **[YAML/JSON Converter](/tools/yaml-json-converter)** — Convert between config formats

---

## Summary

The right monorepo tool depends on what you're optimizing for:

- **Speed of setup + Vercel integration** → Turborepo
- **Advanced affected builds + code generation + large teams** → Nx
- **npm package publishing + conventional changelogs** → Lerna (with Nx)
- **Polyglot + hermetic builds + massive scale** → Bazel

The good news: you're not locked in. Turborepo and Nx both support incremental adoption. Start with Turborepo if you want something working today, and migrate to Nx if you outgrow it. Both support the same npm workspace primitives underneath.

What you should avoid is ignoring the problem — running all tasks on every CI run doesn't scale past a dozen packages, and the time tax compounds as your team grows.
