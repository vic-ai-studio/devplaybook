---
title: "Nx vs Turborepo vs Lerna vs Rush: Best Monorepo Tools in 2026"
description: "A comprehensive comparison of Nx, Turborepo, Lerna, and Rush for managing JavaScript/TypeScript monorepos in 2026 — covering build performance, caching, DX, and when to use each tool."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["nx", "turborepo", "lerna", "rush", "monorepo", "javascript", "typescript", "build-tools"]
readingTime: "14 min read"
---

Monorepos have gone mainstream. Teams at Google, Meta, and Microsoft have used them for years — and now the JavaScript ecosystem has caught up with tooling that makes the approach practical at every scale. But with Nx, Turborepo, Lerna, and Rush all competing for your stack, the choice can feel overwhelming.

This guide cuts through the noise. We'll compare these four tools on the metrics that matter: build performance, remote caching, developer experience, and the situations where each one genuinely wins.

---

## Quick Comparison Table

| Feature | Nx | Turborepo | Lerna | Rush |
|---|---|---|---|---|
| **Maintainer** | Nrwl | Vercel | Community/Nrwl | Microsoft |
| **Remote caching** | Built-in (Nx Cloud) | Built-in (Vercel) | Via Nx | Built-in (RUSH_BUILD_CACHE) |
| **Task orchestration** | Yes (sophisticated) | Yes (simple) | Yes (basic) | Yes (strict) |
| **Code generators** | Yes (Nx plugins) | No | No | Limited |
| **Affected builds** | Yes | Yes | Yes | Yes |
| **IDE integration** | VS Code + IntelliJ | VS Code | Basic | VS Code |
| **Learning curve** | Steep | Low | Low | Steep |
| **Best for** | Large enterprise apps | Frontend/Vercel stacks | npm package publishing | Enterprise npm ecosystems |
| **License** | MIT + Nx Cloud (paid) | MIT + Vercel (paid) | MIT | MIT |

---

## What Is a Monorepo (and Why Does Tooling Matter)?

A monorepo stores multiple projects — apps, libraries, packages — in a single repository. Instead of juggling dozens of separate repos with their own dependency trees and CI pipelines, you get shared code, coordinated releases, and atomic commits across projects.

The problem: vanilla npm workspaces or Yarn workspaces don't scale. Running `npm run build` across 50 packages serially is slow. Running all 50 in parallel without understanding dependencies causes random failures. You need a tool that understands your dependency graph.

That's what Nx, Turborepo, Lerna, and Rush provide — each with different trade-offs.

---

## Nx: The Enterprise Monorepo Platform

Nx (from Nrwl) is the most feature-complete option. It's not just a build tool — it's an opinionated development platform with code generators, project graph visualization, affected change detection, and a plugin ecosystem that spans React, Angular, Node, Nest, Next.js, and more.

### Key Nx Concepts

- **Project graph**: Nx understands the relationships between all your apps and libraries. It knows that `my-app` depends on `ui-lib`, which depends on `utils`.
- **Affected**: Only run tasks for projects actually changed by your PR. On a 100-package monorepo, this can cut CI time from 30 minutes to 2.
- **Nx Cloud**: Distributed caching and distributed task execution. Task results are cached remotely — if a CI run already built `utils` with the same input hash, every subsequent run skips it.
- **Generators**: Scaffold new apps, libraries, components with `nx generate @nx/react:app my-app`.

### Sample `nx.json`

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint", "e2e"],
        "parallel": 4
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
      "!{projectRoot}/tsconfig.spec.json"
    ],
    "sharedGlobals": ["{workspaceRoot}/babel.config.json"]
  }
}
```

### Running Tasks with Nx

```bash
# Build everything
nx run-many --target=build --all

# Build only affected by changes
nx affected --target=build

# Build a specific app
nx build my-app

# Visualize the project graph
nx graph

# Run tests in parallel (up to 4 processes)
nx run-many --target=test --all --parallel=4
```

### When Nx Wins

- Large teams with many apps and shared libraries
- Angular or React workspaces needing generators and scaffolding
- Enterprise setups wanting integrated CI/CD with Nx Cloud
- Teams that want a full framework, not just a build runner

### Nx Drawbacks

- High learning curve — the mental model takes time
- Opinionated project structure (especially Nx-native workspaces)
- Nx Cloud is paid for teams beyond the free tier
- Can feel like overkill for small projects

---

## Turborepo: Fast and Simple

Turborepo (acquired by Vercel in 2021) optimizes for one thing: fast builds with minimal configuration. It's a task runner that understands your pipeline — not a full framework. That simplicity is its biggest strength.

Turborepo uses content-hashed caching aggressively. If the inputs to a task (source files + dependencies) haven't changed, the output is served from cache instantly. It supports both local and remote caching (via Vercel's infrastructure or self-hosted).

### Sample `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": [],
      "cache": false
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

### Running Tasks with Turborepo

```bash
# Build all packages (respecting dependency order)
turbo run build

# Run build + test for affected packages only
turbo run build test --filter=...[HEAD^1]

# Run for a specific package and its dependencies
turbo run build --filter=my-app...

# Dry run to see what would execute
turbo run build --dry-run

# With remote caching (Vercel)
turbo run build --token=$TURBO_TOKEN --team=$TURBO_TEAM
```

### Workspace Structure Example

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js app
│   └── docs/         # Astro docs site
├── packages/
│   ├── ui/           # Shared React components
│   ├── config/       # Shared configs (ESLint, TS)
│   └── utils/        # Shared utilities
├── turbo.json
└── package.json
```

`package.json` at root:

```json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "latest"
  }
}
```

### When Turborepo Wins

- Frontend-heavy monorepos (Next.js, React, SvelteKit)
- Teams already on Vercel wanting seamless remote caching
- Smaller to medium teams wanting fast setup without much configuration
- Projects that don't need code generators or Nx's plugin ecosystem

### Turborepo Drawbacks

- No code generators — you scaffold manually
- Less sophisticated task orchestration than Nx
- Remote caching ties you to Vercel (or you self-host)
- No built-in project graph visualization (Nx has a better story here)

---

## Lerna: The Original Monorepo Tool

Lerna is the OG JavaScript monorepo tool. It predates both Nx and Turborepo, and for years was the only serious option. It fell into maintenance mode around 2020, but Nrwl adopted it in 2022 and gave it new life — particularly for **npm package publishing workflows**.

Modern Lerna (v6+) uses Nx under the hood for task scheduling and caching. Think of it as a thin publishing layer on top of Nx.

### Sample `lerna.json`

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "independent",
  "npmClient": "npm",
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish",
      "registry": "https://registry.npmjs.org"
    },
    "bootstrap": {
      "npmClientArgs": ["--no-package-lock"]
    }
  }
}
```

### Core Lerna Commands

```bash
# Bootstrap all packages (install + link local deps)
lerna bootstrap

# Run a script in all packages
lerna run build --stream

# Run only in packages changed since last tag
lerna run test --since

# Bump versions using conventional commits
lerna version --conventional-commits

# Publish all changed packages to npm
lerna publish from-git

# Publish with independent versioning
lerna publish --no-git-tag-version
```

### Versioning Modes

Lerna offers two approaches:

**Fixed mode** — all packages share the same version. A change to one package bumps all of them.

```json
{ "version": "1.2.0" }
```

**Independent mode** — each package versions independently. Better for libraries with separate release cadences.

```json
{ "version": "independent" }
```

### When Lerna Wins

- Publishing multiple npm packages from a single repo
- Teams that need conventional commits-driven changelogs and versioning
- Projects migrating from old Lerna that don't want to switch tools
- Simpler setups that want Nx's task scheduling without full Nx adoption

### Lerna Drawbacks

- Its primary value is publishing — for just running builds/tests, use Nx or Turborepo directly
- Historically had dependency bootstrap issues (largely fixed with modern npm workspaces)
- Learning curve for version management strategies

---

## Rush: Microsoft's Enterprise Solution

Rush is Microsoft's answer to monorepos at massive scale — think 100+ packages, strict dependency policies, and reproducible builds as non-negotiable requirements. It's used internally at Microsoft and designed for complex npm package ecosystems.

Rush has strong opinions. It enforces consistent versioning policies, phantom dependency detection, and has its own package manager abstraction (pnpm by default).

### Sample `rush.json` (abridged)

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/rush/v5/rush.schema.json",
  "rushVersion": "5.120.0",
  "pnpmVersion": "8.15.6",
  "nodeSupportedVersionRange": ">=18.0.0 <22.0.0",
  "ensureConsistentVersions": true,
  "projects": [
    {
      "packageName": "@mycompany/ui-components",
      "projectFolder": "packages/ui-components",
      "reviewCategory": "production"
    },
    {
      "packageName": "@mycompany/web-app",
      "projectFolder": "apps/web",
      "reviewCategory": "production"
    }
  ]
}
```

### Core Rush Commands

```bash
# Install all dependencies
rush install

# Build everything in dependency order
rush build

# Build only changed packages
rush build --changed-projects-only

# Add a package dependency
rush add --package lodash

# Check for version policy violations
rush check

# Publish to npm
rush publish --publish --include-all
```

### When Rush Wins

- Very large monorepos with 50–500+ packages
- Strict governance around dependency versions (phantom dep detection)
- Teams comfortable with pnpm and Microsoft tooling
- Enterprise environments where reproducibility and policy enforcement matter more than DX speed

### Rush Drawbacks

- Steepest learning curve of the four
- Tightly opinionated — fights you if you deviate from its model
- Smaller community than Nx/Turborepo
- Not ideal for frontend app monorepos (better for library/package ecosystems)

---

## Migration Guides

### From Lerna to Turborepo

1. Remove Lerna: `npm uninstall lerna`
2. Install Turborepo: `npm install turbo --save-dev`
3. Create `turbo.json` with your pipeline
4. Update `package.json` scripts to use `turbo run`
5. Add `.turbo` to `.gitignore`

If you still need Lerna for publishing, keep it and use Turborepo only for task running:

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "release": "lerna publish"
  }
}
```

### From Lerna to Nx

```bash
# Nx can automatically migrate a Lerna workspace
npx nx@latest init

# Nx detects existing packages and creates project.json files
# It keeps your existing package.json scripts working
```

### Adding Turborepo to an Existing Workspace

```bash
npm install turbo --save-dev

# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
EOF

# Replace "npm run build -w packages/*" with:
npx turbo run build
```

---

## Performance: What Actually Matters

The real performance wins come from **caching**, not raw execution speed. All four tools support:

- **Local caching**: Skip tasks whose inputs haven't changed
- **Remote caching**: Share cache across CI machines and teammates

In practice, a well-configured Turborepo or Nx setup with remote caching turns a 20-minute CI pipeline into 2–3 minutes for typical PRs that touch 1–2 packages.

### Caching Setup Comparison

**Turborepo + Vercel Remote Cache:**
```bash
# Set env vars in CI
TURBO_TOKEN=<vercel-access-token>
TURBO_TEAM=<vercel-team-slug>

# That's it — Turborepo uses Vercel's cache automatically
turbo run build
```

**Nx + Nx Cloud:**
```bash
# Connect to Nx Cloud
nx connect-to-nx-cloud

# Generates nx-cloud.env with NX_CLOUD_ACCESS_TOKEN
# Subsequent runs share cache automatically
nx affected --target=build
```

**Self-hosted remote cache (Turborepo):**

Tools like `turborepo-remote-cache` (open source) let you run your own cache server:

```yaml
# docker-compose.yml
services:
  turbo-cache:
    image: ducktors/turborepo-remote-cache
    ports:
      - "3000:3000"
    environment:
      TURBO_TOKEN: your-secret-token
      STORAGE_PROVIDER: local
```

---

## Decision Framework

### Choose Nx if:
- You're building large Angular or React applications with many shared libraries
- Your team benefits from scaffolding generators and an opinionated project structure
- You want integrated visualization of your project dependency graph
- You're open to investing time in learning a full platform

### Choose Turborepo if:
- You primarily build frontend apps (Next.js, SvelteKit, Astro) in a monorepo
- You want fast setup with minimal configuration
- You're already on Vercel or want the simplest remote caching story
- Your team is small to medium and doesn't need code generators

### Choose Lerna if:
- You maintain multiple npm packages that need coordinated versioning and publishing
- You're already using it and don't want to migrate
- You want conventional commits-driven changelogs automatically

### Choose Rush if:
- Your monorepo has 50+ packages with complex inter-dependencies
- Strict dependency policy enforcement is a requirement
- You're in a large enterprise environment where reproducibility beats DX

### Use Both Lerna + Turborepo/Nx if:
- You need Lerna's publishing workflow AND fast builds
- This is actually a common production pattern

---

## 2026 Ecosystem Trends

**Turborepo is gaining ground fast.** Vercel's backing and its tight Next.js integration make it the default recommendation for new frontend monorepos. The `create-turbo` template is the starting point most teams use now.

**Nx continues to dominate enterprise.** Especially in Angular shops and large React applications. The Nx plugin ecosystem is unmatched — there are official plugins for Expo, Storybook, Playwright, Cypress, Fastify, and more.

**Lerna's role has narrowed to publishing.** Most teams use it alongside Nx (Nrwl maintains both) rather than standalone. If publishing isn't your concern, you probably don't need it.

**Rush is niche but excellent.** If you need what it does, nothing else comes close. For everyone else, the learning investment isn't worth it.

**Vite and esbuild have raised the baseline.** Modern build tools are so fast that the incremental gains from monorepo tooling are most visible at scale. If you have 5–10 packages, plain npm workspaces + a simple script might be enough.

---

## Getting Started

### Turborepo (fastest start)

```bash
npx create-turbo@latest my-monorepo
cd my-monorepo
npm install
npm run dev
```

### Nx (most features)

```bash
npx create-nx-workspace@latest my-workspace
# Choose preset: react, angular, node, next, etc.
cd my-workspace
npx nx serve my-app
```

### Add to existing repo

```bash
# Turborepo
npm install turbo --save-dev
# Create turbo.json and you're done

# Nx
npx nx@latest init
# Nx auto-detects your project structure
```

---

## Summary

The monorepo tooling landscape has matured significantly. There's no universally "best" tool — the right choice depends on your team size, tech stack, and how much complexity you're willing to manage:

- **Turborepo**: Best DX, minimal config, perfect for frontend monorepos and Vercel deployments
- **Nx**: Most powerful, best for large teams, enterprise apps, and Angular ecosystems
- **Lerna**: Best for npm package publishing workflows with conventional versioning
- **Rush**: Best for massive enterprise npm ecosystems with strict governance requirements

For most new projects starting in 2026, **Turborepo** is the pragmatic default. If you outgrow it — or if you're building an enterprise platform from day one — **Nx** is the upgrade path.
