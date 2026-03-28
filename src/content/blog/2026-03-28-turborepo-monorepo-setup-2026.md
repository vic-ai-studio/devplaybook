---
title: "Turborepo Monorepo Setup 2026: Complete Guide"
description: "Learn how to set up a production-ready Turborepo monorepo in 2026. Covers turbo.json pipelines, remote caching, shared packages, CI/CD with GitHub Actions, and real-world project structure."
pubDate: 2026-03-28
tags: [turborepo, monorepo, build-tools, nx, javascript]
category: build-tools
---

# Turborepo Monorepo Setup 2026: Complete Guide

Managing multiple related packages in separate repos is painful. You end up copy-pasting configs, fighting version mismatches, and spending more time on tooling than shipping features. Monorepos solve this — and Turborepo makes monorepos fast.

This guide walks through everything you need to set up a production-ready Turborepo monorepo in 2026: from initial scaffolding to remote caching, shared packages, and CI/CD pipelines.

---

## What Is Turborepo — and Why Monorepos in 2026?

**Turborepo** is a high-performance build system for JavaScript and TypeScript monorepos, built by Vercel. It uses intelligent caching and parallelization to dramatically speed up builds, tests, and linting across large workspaces.

A **monorepo** is a single Git repository containing multiple packages or applications. Instead of maintaining separate repos for your frontend, backend, and shared UI library, you keep everything together. Code sharing is trivial. Refactoring is atomic. CI visibility is unified.

In 2026, monorepos are the default choice for:
- **Full-stack TypeScript teams** shipping web apps + APIs + shared types
- **Design systems** where a shared component library feeds multiple products
- **Microservices** that share auth utilities, logging, and config
- **Multi-platform products** (web + mobile + CLI) with a shared business logic layer

Turborepo's key advantages in 2026:
- **Remote caching** — share build artifacts across machines and CI runners
- **Task pipelines** — declare dependencies between tasks so nothing runs out of order
- **Incremental computation** — only rebuild what changed
- **Native package manager support** — works with npm, yarn, pnpm, and bun workspaces
- **First-class TypeScript support** — no configuration overhead

---

## Turborepo vs Nx vs Lerna: 2026 Comparison

All three tools manage JavaScript monorepos, but they take different approaches.

| Feature | Turborepo | Nx | Lerna |
|---|---|---|---|
| **Primary focus** | Build speed / caching | Full monorepo platform | Package publishing |
| **Configuration complexity** | Low | Medium–High | Low |
| **Remote caching** | Vercel Remote Cache (free tier) | Nx Cloud (paid) | No built-in |
| **Task graph** | turbo.json pipeline | project.json / nx.json | lerna.json |
| **Code generation** | Via templates | Nx generators (powerful) | No |
| **Affected detection** | Built-in | Built-in | Via Nx plugin |
| **Language support** | JS/TS only | Polyglot (Go, Java, etc.) | JS/TS only |
| **Learning curve** | Gentle | Steep | Gentle |
| **Best for** | Speed-focused JS/TS teams | Large enterprise, polyglot | Mostly publishing packages |

**Bottom line:** Use Turborepo if you want speed and simplicity. Use Nx if you need scaffolding, generators, and polyglot support. Use Lerna only if your main goal is publishing versioned npm packages (and even then, combine it with Turborepo for builds).

---

## Setting Up a New Turborepo Project from Scratch

The fastest way to start is with `create-turbo`:

```bash
npx create-turbo@latest my-monorepo
cd my-monorepo
```

It prompts you for a package manager (npm, yarn, pnpm, or bun). For 2026 projects, **pnpm** is the recommended choice — fastest installs, best workspace support, and efficient disk usage via hard links.

After scaffolding, the structure looks like this:

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js app
│   └── docs/         # Another app
├── packages/
│   ├── ui/           # Shared component library
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

The root `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

The `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

To install and verify everything works:

```bash
pnpm install
pnpm build
```

---

## turbo.json Pipeline Configuration

The `turbo.json` file is the heart of Turborepo. It defines the task graph — which tasks exist, how they depend on each other, and what inputs/outputs to cache.

Here is a production-ready `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

Key concepts:

- **`"dependsOn": ["^build"]`** — The `^` prefix means "run this task in all dependencies first." Your app's `build` only runs after all its package dependencies are built.
- **`outputs`** — Files Turborepo should cache. If inputs haven't changed, it restores outputs from cache instead of rebuilding.
- **`inputs`** — Controls what triggers a cache miss. By default Turborepo hashes all files tracked by git. `$TURBO_DEFAULT$` preserves the default while letting you add extras.
- **`cache: false`** — Disable caching for tasks like `dev` that are stateful or long-running.
- **`persistent: true`** — Marks long-running tasks (dev servers) so Turbo doesn't wait for them to finish.

For a more advanced pipeline with environment variable tracking:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "env": ["NODE_ENV", "NEXT_PUBLIC_API_URL", "VERCEL_URL"],
      "outputs": [".next/**", "!.next/cache/**"]
    }
  }
}
```

The `env` array tells Turbo to include specific environment variables in the cache key. If `NODE_ENV` changes from `development` to `production`, a new build runs.

---

## Remote Caching Setup with Vercel Remote Cache

Local caching speeds up your machine. Remote caching shares that cache across your whole team and CI.

When developer A builds the `web` app, the output is uploaded to Vercel Remote Cache. When developer B runs the same build with the same inputs, they get an instant cache hit — no build needed.

### Linking to Vercel Remote Cache

```bash
npx turbo login
npx turbo link
```

This authenticates with your Vercel account and links the repo. Cache artifacts are stored and served by Vercel's CDN.

### Self-hosted remote cache

If you prefer not to use Vercel, you can run your own remote cache server. The open-source `ducktape` or `turborepo-remote-cache` project implements the Turborepo cache API:

```bash
# Self-hosted cache server (example with turborepo-remote-cache)
npx turborepo-remote-cache
```

Then in your `turbo.json` or via env vars:

```bash
TURBO_API="https://your-cache-server.com"
TURBO_TOKEN="your-token"
TURBO_TEAM="your-team"
```

### Verifying cache hits

Run a build twice and look for the `>>> FULL TURBO` indicator:

```
Tasks:    5 successful, 5 total
Cached:   5 cached, 5 total
Time:     312ms >>> FULL TURBO
```

That 312ms is just the time to check the cache and restore outputs. Your actual build was 0ms.

---

## Shared Packages: UI Components, Configs, Utilities

The real value of a monorepo is code reuse. Here are the three most common shared package types and how to set them up properly.

### Shared UI Component Library

`packages/ui/package.json`:

```json
{
  "name": "@repo/ui",
  "version": "0.0.1",
  "private": true,
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./button": {
      "types": "./src/components/Button.tsx",
      "default": "./src/components/Button.tsx"
    }
  },
  "devDependencies": {
    "@repo/typescript-config": "*",
    "typescript": "^5.4.0"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

`packages/ui/src/index.ts`:

```typescript
export { Button } from "./components/Button";
export { Card } from "./components/Card";
export { Input } from "./components/Input";
```

In your consuming app's `package.json`:

```json
{
  "dependencies": {
    "@repo/ui": "*"
  }
}
```

Usage in the app:

```typescript
import { Button, Card } from "@repo/ui";
```

### Shared TypeScript Config

`packages/typescript-config/package.json`:

```json
{
  "name": "@repo/typescript-config",
  "version": "0.0.1",
  "private": true,
  "exports": {
    "./base.json": "./base.json",
    "./nextjs.json": "./nextjs.json",
    "./react-library.json": "./react-library.json"
  }
}
```

`packages/typescript-config/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "incremental": false,
    "isolatedModules": true,
    "lib": ["es2022"],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  }
}
```

Consume in an app's `tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### Shared ESLint Config

`packages/eslint-config/package.json`:

```json
{
  "name": "@repo/eslint-config",
  "version": "0.0.1",
  "private": true,
  "main": "index.js",
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint-config-prettier": "^9.1.0"
  }
}
```

`packages/eslint-config/index.js`:

```javascript
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
};
```

---

## CI/CD Integration with GitHub Actions

Turborepo's remote cache makes CI fast. Here is a production-ready GitHub Actions workflow:

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    name: Build and Test
    runs-on: ubuntu-latest
    timeout-minutes: 15

    env:
      TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
      TURBO_TEAM: ${{ vars.TURBO_TEAM }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test
```

Set `TURBO_TOKEN` as a GitHub Actions secret (your Vercel token) and `TURBO_TEAM` as a variable (your Vercel team slug or username). With these in place, every CI run benefits from the shared remote cache.

### Deploying specific apps

For deploying only changed apps, use Turborepo's `--filter` flag combined with affected detection:

```yaml
- name: Deploy web app
  run: pnpm turbo run deploy --filter=web
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## Workspace-Specific Scripts and Filtering

You don't always want to run tasks across every package. Turborepo's `--filter` flag gives precise control.

### Run tasks in a specific app

```bash
# Build only the web app and its dependencies
pnpm turbo run build --filter=web

# Run tests only in the UI package
pnpm turbo run test --filter=@repo/ui
```

### Run tasks in changed packages

```bash
# Only run builds for packages changed since the last commit
pnpm turbo run build --filter=[HEAD^1]

# Only run builds for packages changed in a specific branch
pnpm turbo run build --filter=[origin/main...HEAD]
```

This is especially powerful in CI for PRs — you only build and test what actually changed.

### Run tasks matching a glob

```bash
# Run lint in all apps
pnpm turbo run lint --filter="./apps/*"

# Run tests in all packages
pnpm turbo run test --filter="./packages/*"
```

### Run a task in a package and its dependents

```bash
# Rebuild everything that depends on @repo/ui
pnpm turbo run build --filter=...@repo/ui
```

This catches breakage immediately when you change a shared package.

---

## Real-World Monorepo Structure Example

Here is what a production monorepo looks like for a SaaS product with a web app, API, and docs site:

```
saas-monorepo/
├── apps/
│   ├── web/                    # Next.js 15 customer dashboard
│   │   ├── src/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api/                    # Hono API (runs on Cloudflare Workers)
│   │   ├── src/
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── docs/                   # Astro docs site
│       ├── src/
│       └── package.json
├── packages/
│   ├── ui/                     # Shared React component library
│   │   ├── src/components/
│   │   └── package.json
│   ├── database/               # Drizzle ORM schema + client
│   │   ├── src/schema.ts
│   │   ├── src/client.ts
│   │   └── package.json
│   ├── auth/                   # Shared auth utilities (JWT, sessions)
│   │   ├── src/
│   │   └── package.json
│   ├── validators/             # Zod schemas shared between web + api
│   │   ├── src/
│   │   └── package.json
│   ├── eslint-config/          # Shared ESLint config
│   └── typescript-config/      # Shared tsconfig bases
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .github/
    └── workflows/
        └── ci.yml
```

The `validators` package is the key insight here. Your Zod schemas for API request validation are the same ones used for client-side form validation. Define them once, use them everywhere, and TypeScript enforces consistency across the stack.

```typescript
// packages/validators/src/user.ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  plan: z.enum(["free", "pro", "enterprise"])
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

Both the Hono API handler and the Next.js form use `CreateUserSchema` — the only source of truth.

---

## Common Pitfalls and Performance Tips

### Pitfall 1: Forgetting to declare outputs

If you don't specify `outputs` in `turbo.json`, Turbo can't restore cached artifacts. Always declare build outputs:

```json
"build": {
  "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
}
```

### Pitfall 2: Caching tasks that read environment variables

Turbo hashes your source files but not environment variables by default. If your build behavior changes based on env vars, declare them:

```json
"build": {
  "env": ["DATABASE_URL", "NEXT_PUBLIC_API_URL"]
}
```

### Pitfall 3: Using `*` for internal package versions in production

`"@repo/ui": "*"` works locally, but use workspace protocol in pnpm for clarity:

```json
"@repo/ui": "workspace:*"
```

### Pitfall 4: Not using `--frozen-lockfile` in CI

Always install with `--frozen-lockfile` (pnpm) or `--ci` (npm) in CI. This prevents accidental lockfile mutations.

### Pitfall 5: Over-caching dev tasks

Never cache `dev` tasks. They are persistent and stateful. Set `"cache": false` in turbo.json for all dev/watch tasks.

### Performance tips

**Use pnpm over npm for large repos.** pnpm's hard-link approach drastically reduces `node_modules` disk usage. A monorepo with 10 apps does not duplicate shared deps 10 times.

**Prune before Docker builds.** Use `turbo prune` to create a minimal subset of the monorepo for a specific app before building a Docker image:

```bash
npx turbo prune web --docker
```

This outputs only the files needed to build `web`, dramatically reducing Docker build context size.

**Enable daemon mode.** Turbo runs a background daemon that maintains a file watcher across runs. It is enabled by default in Turbo 2.x and gives faster cache checking:

```bash
turbo daemon status
```

**Parallelize by default.** Turbo already parallelizes tasks with no dependencies between them. But be aware: if you run `pnpm turbo run dev` for multiple apps, each spawns a dev server. Use `--concurrency` to control how many run simultaneously:

```bash
pnpm turbo run dev --concurrency=3
```

**Profile slow builds.** Use `--profile` to generate a Chrome trace file:

```bash
pnpm turbo run build --profile=trace.json
```

Open `trace.json` in Chrome DevTools (`chrome://tracing`) to see exactly where time is spent.

---

## Summary

Turborepo is the practical choice for JavaScript and TypeScript monorepos in 2026. It is simple to set up, integrates with any package manager, and delivers real speed gains through local and remote caching.

Key takeaways:
- Scaffold with `create-turbo`, use pnpm workspaces
- Configure `turbo.json` with proper `dependsOn`, `outputs`, and `env` declarations
- Enable Vercel Remote Cache to share build artifacts across machines and CI
- Structure shared code into `packages/` — UI components, validators, configs, database schemas
- Use `--filter` for surgical task execution in CI and local development
- Prune with `turbo prune` before Docker builds to keep images lean
- Always declare environment variable dependencies to avoid incorrect cache hits

The initial setup takes an afternoon. The payoff is a codebase where every change is fast to build, easy to share, and impossible to leave inconsistent.
