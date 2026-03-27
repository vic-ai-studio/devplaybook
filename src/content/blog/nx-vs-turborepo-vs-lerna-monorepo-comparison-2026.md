---
title: "Nx vs Turborepo vs Lerna: Monorepo Tool Comparison 2026"
description: "In-depth comparison of the three leading JavaScript monorepo tools: Nx, Turborepo, and Lerna. Covers task orchestration, caching, plugin ecosystems, migration paths, and developer experience to help you choose the right tool in 2026."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["monorepo", "nx", "turborepo", "lerna", "javascript", "typescript", "devtools", "build-tools"]
readingTime: "14 min read"
---

Managing a JavaScript monorepo in 2026 means choosing between mature, powerful tools that have diverged significantly in philosophy and capability. Nx, Turborepo, and Lerna each solve the same core problem — running tasks efficiently across many packages — but they do it very differently.

This guide compares all three on the dimensions that matter most: task orchestration, caching, plugin ecosystem, migration complexity, and day-to-day developer experience.

---

## The Monorepo Problem (And Why These Tools Exist)

A plain monorepo with workspaces (`npm`, `pnpm`, `yarn`) gets you shared dependencies. What it doesn't give you is:

- **Incremental builds**: only rebuild what changed
- **Task parallelism**: run 12 test suites simultaneously
- **Dependency graph awareness**: don't test package A if package B (which A depends on) hasn't changed
- **Remote caching**: never rebuild what a teammate already built

This is the gap all three tools fill — just with different approaches.

---

## Lerna

Lerna was the original JavaScript monorepo tool, created in 2015. It nearly died in 2022 when its maintainer stepped back, but was revived by Nrwl (the company behind Nx) and has since been modernized significantly.

### What Lerna Does Well

- **Simplest migration path**: drop into an existing workspace with minimal config
- **Publishing workflow**: `lerna publish` and `lerna version` are still the best-in-class for versioning and publishing packages to npm
- **Familiar**: most existing JS monorepos already have Lerna knowledge

### Setup

```bash
npx lerna init
```

`lerna.json`:

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "independent",
  "npmClient": "pnpm",
  "useWorkspaces": true
}
```

### Task Running

```bash
# Run build across all packages
npx lerna run build

# Run in parallel, 4 at a time
npx lerna run test --concurrency 4

# Only run for changed packages since last git tag
npx lerna run test --since main
```

### Caching (via Nx Task Runner)

Lerna delegates caching to Nx's task runner. Add it to `lerna.json`:

```json
{
  "taskRunner": "nx/tasks-runners/default",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"]
      }
    }
  }
}
```

Once configured, you get local caching. For remote caching, you need Nx Cloud.

### Limitations

- No project graph visualization
- Plugin ecosystem is minimal compared to Nx
- Build orchestration is less powerful than Turborepo or Nx for complex dependency chains

### Best For

Teams that primarily need **versioning and publishing**, have an existing Lerna setup, or want the lightest-touch monorepo tooling.

---

## Turborepo

Turborepo (acquired by Vercel in 2021) is built around one idea: **pipeline-based task orchestration with aggressive caching**. It's written in Rust/Go, which makes it extremely fast.

### Setup

```bash
npx create-turbo@latest
# or add to existing repo:
npm install turbo --save-dev
```

`turbo.json`:

```json
{
  "$schema": "https://turborepo.org/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"]
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

The `^` prefix in `"^build"` means: "run `build` in all dependencies first." This is Turborepo's key concept.

### Running Tasks

```bash
# Run build for all packages, respecting dependency order
npx turbo run build

# Only packages affected by changes on current branch
npx turbo run test --filter=...[origin/main]

# Specific package and its dependencies
npx turbo run build --filter=@myapp/web...

# Watch mode
npx turbo run dev --filter=@myapp/web
```

### Caching

Turborepo's cache key combines:
- Input files (glob patterns you define)
- Environment variables
- Task definition hash

Hit a cache? The task is skipped and outputs are restored from `.turbo/cache`. This is local by default; remote cache requires Vercel's service or a self-hosted alternative.

```json
{
  "tasks": {
    "build": {
      "inputs": ["src/**", "tsconfig.json", "package.json"],
      "outputs": ["dist/**"],
      "env": ["NODE_ENV", "API_URL"]
    }
  }
}
```

### Remote Caching

```bash
# Authenticate with Vercel (free tier available)
npx turbo login
npx turbo link

# Use a self-hosted cache server (ducktape, turborepo-remote-cache)
TURBO_TEAM=my-team TURBO_TOKEN=xxx TURBO_API=https://cache.mycompany.com npx turbo run build
```

### Limitations

- No code generation
- No plugin system (intentionally)
- No built-in monorepo project graph beyond task deps
- Migration assistance is minimal — you write `turbo.json` by hand

### Best For

Teams that want **maximum build speed with minimum config**. If your main pain point is slow CI pipelines and you don't need generators or scaffolding, Turborepo is the right choice.

---

## Nx

Nx is the most comprehensive of the three — more of a full platform than a build tool. It understands your codebase at a deep level, knows about Angular, React, Node, Python (and more) through plugins, and can generate code, enforce architecture rules, and visualize your entire project graph.

### Setup

```bash
# New repo
npx create-nx-workspace@latest my-workspace

# Add to existing repo
npx nx@latest init
```

`nx.json`:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts"]
  },
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "test": {
      "cache": true,
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"]
    },
    "lint": {
      "cache": true,
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"]
    }
  }
}
```

### Task Orchestration

```bash
# Run for all projects
nx run-many -t build

# Run for affected projects only
nx affected -t test

# Specific project and its dependencies
nx run my-app:build --with-deps

# Visualize the project graph
nx graph
```

### Caching

Nx's caching is the most sophisticated of the three. It uses content hashing at the file level (not just modification time), so cache keys are precise:

```bash
# Local cache in .nx/cache
# Remote via Nx Cloud (free for small teams)
nx connect-to-nx-cloud

# View cache stats
nx show projects --affected --base=main
```

### Plugins and Generators

This is where Nx pulls far ahead. Plugins exist for virtually every framework and tool:

```bash
# Add React support
npm install @nx/react
nx g @nx/react:app my-web-app

# Add a Node API
npm install @nx/node
nx g @nx/node:app my-api

# Add a shared library
nx g @nx/js:lib shared-utils

# Generate a component in the right place
nx g @nx/react:component Button --project=ui-library
```

Official plugins: `@nx/angular`, `@nx/react`, `@nx/next`, `@nx/node`, `@nx/nest`, `@nx/express`, `@nx/vite`, `@nx/webpack`, `@nx/jest`, `@nx/playwright`, `@nx/storybook`, and more.

### Module Boundary Enforcement

Nx can enforce which packages are allowed to import from which:

```json
// .eslintrc.json
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "depConstraints": [
        {
          "sourceTag": "scope:frontend",
          "onlyDependOnLibsWithTags": ["scope:frontend", "scope:shared"]
        },
        {
          "sourceTag": "type:app",
          "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"]
        }
      ]
    }]
  }
}
```

This is invaluable for large teams to prevent accidental coupling.

### Limitations

- Steeper learning curve than Turborepo
- Config surface area is large
- Some plugin APIs change between major versions

### Best For

Large teams needing **generators, architectural enforcement, and a full platform**. Also best for polyglot monorepos (mixing React, Next.js, NestJS, etc.).

---

## Side-by-Side Comparison

| Feature | Lerna | Turborepo | Nx |
|---------|-------|-----------|-----|
| Task orchestration | ✓ Basic | ✓✓ Pipeline | ✓✓✓ Graph-aware |
| Local caching | Via Nx | ✓✓ Aggressive | ✓✓✓ Content hash |
| Remote caching | Nx Cloud | Vercel / self-host | Nx Cloud / self-host |
| Code generators | ✗ | ✗ | ✓✓✓ Plugin system |
| Affected detection | ✓ Git-based | ✓ Git-based | ✓✓ Project graph |
| Project graph UI | ✗ | ✗ | ✓✓✓ Interactive |
| Package publishing | ✓✓✓ Best | ✗ | ✓ Basic |
| Plugin ecosystem | Minimal | None (by design) | Extensive |
| Module boundaries | ✗ | ✗ | ✓ ESLint rule |
| Learning curve | Low | Low | Medium-High |
| Config complexity | Low | Low-Medium | Medium-High |
| Execution engine | Node | Rust/Go | Node (+ Rust daemon) |

---

## Migration Guides

### Existing Lerna → Turborepo

```bash
# 1. Install Turborepo
npm install turbo --save-dev

# 2. Create turbo.json with your tasks
# 3. Move build/test/lint scripts from lerna.json to turbo.json pipeline
# 4. Remove lerna from package.json scripts (keep for publishing)

# Keep lerna.json for versioning, use turbo for building:
npx turbo run build
npx lerna publish from-git
```

### Existing Lerna → Nx

```bash
# Nx can migrate automatically
npx nx@latest init

# It will:
# - Detect existing package structure
# - Generate nx.json and project.json files
# - Configure caching for detected tasks
# - Optionally connect to Nx Cloud
```

### Existing Turborepo → Nx

The Nx team provides a migration command:

```bash
npx nx@latest migrate turborepo
```

This converts `turbo.json` pipelines to Nx `targetDefaults`.

---

## Which Should You Choose?

**Choose Lerna if:**
- You need best-in-class npm package versioning and publishing
- You already have a Lerna setup that works and don't need generators
- Your team is small and "it just works" is more valuable than features

**Choose Turborepo if:**
- Your #1 pain point is slow CI builds
- You want minimal config — just a `turbo.json` and done
- You're on Vercel or want their remote cache integration
- Your stack is relatively homogeneous (e.g., all Next.js apps)

**Choose Nx if:**
- You have 5+ packages and need to enforce architecture
- You want generators to scaffold code consistently across the team
- You're building a polyglot system (React + NestJS + shared libs)
- You want the most powerful affected detection and project graph visualization
- Long-term maintainability matters more than initial simplicity

---

## Hybrid Approaches

It's common to use **Lerna + Nx** together (Lerna for publishing, Nx for tasks), or **Turborepo** for task orchestration with standard workspace tooling. You don't have to pick just one tool for every concern.

```json
// lerna.json — versioning only
{
  "version": "independent",
  "useWorkspaces": true,
  "command": {
    "publish": { "conventionalCommits": true }
  }
}

// turbo.json — task orchestration
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }
  }
}
```

---

## Takeaways

- **Lerna** is for teams that need publishing workflows; delegate task orchestration to Nx or Turborepo.
- **Turborepo** is the fastest path to cache-accelerated CI with the least config overhead.
- **Nx** is the right platform if you're building long-term and need generators, boundary enforcement, and deep framework integration.

All three have gotten significantly better in 2025-2026. The competition has pushed caching, affected detection, and performance forward across the board — so there's no bad choice, just different tradeoffs.

---

*Need help setting up your monorepo? Check out [DevPlaybook's complete developer tooling guides](https://devplaybook.cc).*
