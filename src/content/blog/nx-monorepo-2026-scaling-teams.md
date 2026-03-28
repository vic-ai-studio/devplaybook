---
title: "Nx Monorepo 2026: Scaling Teams with Smart Builds and Affected Graph"
description: "Master Nx monorepo tooling in 2026. Learn affected commands, remote caching with Nx Cloud, module federation, plugin ecosystem for Next.js and NestJS, and how to migrate from Turborepo."
date: "2026-03-28"
tags: ["nx", "monorepo", "devtools", "typescript", "build-tools"]
readingTime: "7 min read"
category: "devtools"
---

## Why Monorepos — and Why Nx

As engineering teams grow, managing dozens of repositories becomes a coordination nightmare. Dependency updates ripple across repos, CI pipelines duplicate effort, and sharing code requires publishing packages to a registry just to use them internally. Monorepos solve this by housing all your projects in a single repository — but without proper tooling they create a different problem: **everything rebuilds on every change**.

Nx is the answer to that problem. It is a smart build system built specifically for monorepos, giving you:

- **Affected commands** that only run tasks on code that changed
- **Computation caching** that skips redundant work locally and across CI machines
- **First-class plugins** for Next.js, NestJS, Vite, React, and more
- **Module Federation** support for micro-frontend architectures
- **Incremental adoption** — works with existing repos without a big-bang migration

In 2026, Nx has become the default choice for teams at scale, overtaking older tools on raw performance and developer experience. This guide covers everything you need to go from zero to production-ready Nx workspace.

---

## Setting Up an Nx Workspace

Create a new workspace with a single command:

```bash
npx create-nx-workspace@latest my-org --preset=ts
```

For a full-stack setup with Next.js and NestJS:

```bash
npx create-nx-workspace@latest my-org \
  --preset=next \
  --appName=web \
  --style=tailwind \
  --nxCloud=yes
```

The generated workspace structure looks like this:

```
my-org/
├── apps/
│   ├── web/                  # Next.js app
│   └── api/                  # NestJS app
├── libs/
│   ├── shared/ui/            # Shared React components
│   ├── shared/utils/         # Shared utilities
│   └── shared/types/         # Shared TypeScript types
├── nx.json                   # Nx configuration
├── package.json
└── tsconfig.base.json        # Path aliases for libs
```

Each project has a `project.json` that defines its targets:

```json
{
  "name": "web",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/web/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/web"
      },
      "configurations": {
        "production": {
          "fileReplacements": []
        }
      }
    },
    "serve": {
      "executor": "@nx/next:server",
      "options": {
        "buildTarget": "web:build",
        "dev": true
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "outputs": ["{options.outputFile}"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "apps/web/jest.config.ts"
      }
    }
  },
  "tags": ["scope:web", "type:app"]
}
```

The `nx.json` file controls workspace-wide defaults:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "nxCloudAccessToken": "YOUR_TOKEN_HERE",
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/jest.config.ts"
    ],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production"],
      "cache": true
    },
    "lint": {
      "inputs": ["default"],
      "cache": true
    }
  },
  "plugins": [
    {
      "plugin": "@nx/next/plugin",
      "options": {
        "buildTargetName": "build",
        "serveTargetName": "serve"
      }
    }
  ]
}
```

---

## The Affected Graph

The affected graph is Nx's killer feature. Nx builds a dependency graph of every project in your workspace by analyzing imports and `project.json` dependencies. When you make a change, it computes exactly which projects are **affected** by that change — and only runs tasks on those.

Visualize your workspace graph:

```bash
npx nx graph
```

This opens an interactive browser UI showing which projects depend on which libraries. If `shared/utils` is imported by `web`, `api`, and `mobile`, then changing `shared/utils` marks all three as affected.

Run affected commands:

```bash
# Test only affected projects (compared to main branch)
npx nx affected -t test

# Build only affected projects
npx nx affected -t build

# Lint only affected projects
npx nx affected -t lint

# Run multiple targets at once
npx nx affected -t build,test,lint

# Specify a custom base
npx nx affected -t test --base=HEAD~3

# Run affected in parallel (default: 3 agents)
npx nx affected -t build --parallel=5
```

When a PR only touches `apps/web`, Nx ensures that `apps/api` tests are never run — saving significant CI time in large repos with 50+ projects.

---

## Smart Caching

Nx caches task outputs by hashing every input: source files, environment variables, executor config, and dependency outputs. If the hash matches a previous run, Nx replays the cached output instantly.

**Local cache** is stored in `.nx/cache` (or the legacy `node_modules/.cache/nx`). Run the same build twice:

```bash
npx nx build web
# First run: BUILD completes in 45s

npx nx build web
# Second run: [local cache] BUILD replayed in 0.3s
```

**Nx Cloud remote cache** extends this to your entire team and all CI machines. Once one machine builds a target, every other machine gets a cache hit — even on a fresh clone.

Configure Nx Cloud in `nx.json`:

```json
{
  "nxCloudAccessToken": "your-read-write-token",
  "nxCloudUrl": "https://cloud.nx.app"
}
```

Cache hit example in CI output:

```
> nx run web:build

  ✔  nx run web:build  [remote cache]

  Successfully ran target build for project web (342ms)
  Nx read the output from the cache instead of running the command for 1 out of 1 tasks.
```

You can control what is and isn't cached per target using `inputs` and `outputs` in `targetDefaults`. Mark non-deterministic targets as uncacheable:

```json
{
  "targetDefaults": {
    "e2e": {
      "cache": false
    }
  }
}
```

---

## Plugin Ecosystem

Nx's plugin ecosystem in 2026 covers virtually every major framework and tool:

| Plugin | Supports |
|---|---|
| `@nx/next` | Next.js 14+ apps with App Router |
| `@nx/nest` | NestJS applications and libraries |
| `@nx/react` | React libraries with Vite or Webpack |
| `@nx/vite` | Vite-based builds and tests |
| `@nx/node` | Node.js apps and libraries |
| `@nx/angular` | Angular apps (official support) |
| `@nx/storybook` | Storybook integration |
| `@nx/cypress` | Cypress E2E tests |
| `@nx/playwright` | Playwright E2E tests |
| `@nx/docker` | Docker image builds |

**Code generators** are one of Nx's most productive features. Scaffold a new component library in seconds:

```bash
# Add a new React library
npx nx generate @nx/react:library shared/ui \
  --bundler=vite \
  --unitTestRunner=vitest \
  --style=tailwind \
  --publishable \
  --importPath=@my-org/shared/ui

# Add a NestJS microservice
npx nx generate @nx/nest:application services/payments \
  --frontendProject=web

# Add a component to an existing library
npx nx generate @nx/react:component Button \
  --project=shared-ui \
  --export
```

Generators enforce consistent structure across your monorepo and update `tsconfig.base.json` path aliases automatically, so `import { Button } from '@my-org/shared/ui'` works immediately after generation.

---

## Module Federation with Nx

Nx has first-class support for **Module Federation** — the Webpack/Rspack feature that lets you split a frontend into independently deployable micro-frontends.

Scaffold a Module Federation setup:

```bash
# Create the shell (host) app
npx nx generate @nx/react:host shell \
  --remotes=checkout,search,account

# Add another remote later
npx nx generate @nx/react:remote dashboard \
  --host=shell
```

Nx generates the correct `module-federation.config.ts` for each app:

```typescript
// apps/shell/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'shell',
  remotes: ['checkout', 'search', 'account'],
};

export default config;
```

```typescript
// apps/checkout/module-federation.config.ts
import { ModuleFederationConfig } from '@nx/webpack';

const config: ModuleFederationConfig = {
  name: 'checkout',
  exposes: {
    './CheckoutFlow': './src/app/checkout/CheckoutFlow.tsx',
  },
};

export default config;
```

**Dynamic Module Federation** loads remotes at runtime from a manifest — useful when remote URLs are environment-specific:

```typescript
// apps/shell/src/app/app.tsx
import { loadRemoteModule } from '@nx/react/mfe';

const CheckoutFlow = React.lazy(() =>
  loadRemoteModule({
    remoteName: 'checkout',
    exposedModule: './CheckoutFlow',
  })
);
```

Nx also supports **Module Federation with SSR** using Next.js, enabling independently deployable pages with shared layouts.

---

## Nx vs Turborepo: 2026 Comparison

| Feature | Nx | Turborepo |
|---|---|---|
| **Affected builds** | Yes — full dependency graph | Limited (package-level only) |
| **Remote caching** | Nx Cloud (free tier + paid) | Vercel Remote Cache |
| **Local caching** | Yes | Yes |
| **Code generators** | Rich plugin generators | None (manual) |
| **Module Federation** | First-class support | No |
| **Plugin ecosystem** | 30+ official plugins | 0 official plugins |
| **Task graph UI** | Interactive browser UI | Basic terminal output |
| **Incremental adoption** | Yes (add to existing repo) | Yes |
| **TypeScript project refs** | Auto-managed | Manual |
| **Language support** | TS, JS, Go, Rust, Python | JS/TS only |
| **Community** | Large, growing fast | Smaller |
| **License** | MIT | MIT |

Turborepo is simpler to learn for small JS/TS repos. Nx wins for teams that need code generation, framework-specific tooling, cross-language support, or micro-frontend architectures.

---

## Migrating from Turborepo to Nx

Migration is incremental — you don't need to switch everything at once.

**Step 1: Install Nx**

```bash
npx nx@latest init
```

This command analyzes your existing `package.json` scripts and `turbo.json`, and generates an equivalent `nx.json` automatically.

**Step 2: Verify the generated configuration**

Nx will infer your existing scripts as cacheable targets. Review `nx.json` and adjust `targetDefaults` if needed:

```json
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "cache": true
    }
  }
}
```

**Step 3: Remove Turborepo**

```bash
npm uninstall turbo
rm turbo.json
```

**Step 4: Replace turbo commands**

```bash
# Before (Turborepo)
npx turbo run build --filter=web...

# After (Nx)
npx nx build web
npx nx affected -t build
```

**Step 5: Add Nx Cloud for remote caching**

```bash
npx nx connect
```

Follow the prompts to create an Nx Cloud workspace. Paste the access token into `nx.json`.

**Step 6: Adopt plugins gradually**

Once on Nx, install plugins to replace custom scripts:

```bash
npm install -D @nx/next @nx/nest @nx/vite
npx nx generate @nx/next:init
```

---

## CI/CD Integration with GitHub Actions

The recommended pattern uses Nx Agents — distributed task execution that splits affected tasks across multiple CI machines automatically.

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
          fetch-depth: 0  # Required for affected to compare against base

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Set up Nx SHAs
        uses: nrwl/nx-set-shas@v4
        # Sets NX_BASE and NX_HEAD env vars for affected commands

      - name: Run affected lint
        run: npx nx affected -t lint --parallel=3

      - name: Run affected test
        run: npx nx affected -t test --parallel=3 --coverage

      - name: Run affected build
        run: npx nx affected -t build --parallel=3

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()
```

For larger teams, use **Nx Agents** to parallelize across machines:

```yaml
      - name: Start Nx Agents
        run: npx nx-cloud start-ci-run --distribute-on="3 linux-medium-js"

      - name: Run CI tasks
        run: |
          npx nx affected -t lint,test,build \
            --parallel=5 \
            --base=$NX_BASE \
            --head=$NX_HEAD

      - name: Stop Nx Agents
        if: always()
        run: npx nx-cloud complete-ci-run
```

With Nx Agents, a build that took 20 minutes on a single machine can finish in under 5 minutes by distributing across 3–10 agents — with no manual task splitting required.

---

## Conclusion: When to Use Nx

Nx is the right choice when:

- **Your team is growing** and you want to standardize how projects are scaffolded and built
- **You have shared code** (UI components, utilities, types) that multiple apps consume
- **CI is slow** and you want affected-based execution and remote caching to cut it down
- **You're building micro-frontends** and need Module Federation support out of the box
- **You work across frameworks** — mixing Next.js, NestJS, React libraries, and Node scripts in one repo
- **You want to reduce boilerplate** with code generators that enforce consistent patterns

For a solo developer with one or two apps, Nx may be overkill — a simpler setup works fine. But for teams of 3+ working on interconnected projects, the productivity gains from affected builds, remote caching, and code generation pay for the learning curve within the first week.

Start with `npx nx init` in your existing repo. You'll have local caching working in minutes — and you can adopt the rest incrementally.
