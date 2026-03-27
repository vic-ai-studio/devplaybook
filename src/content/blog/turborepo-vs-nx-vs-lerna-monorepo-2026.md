---
title: "Turborepo vs Nx vs Lerna: Monorepo Tools Guide 2026"
description: "Turborepo vs Nx vs Lerna: a complete 2026 comparison of the top monorepo tools. Compare remote caching, task pipelines, DX, and CI performance to choose the right tool for your team."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["turborepo", "nx", "lerna", "monorepo", "build-tools", "ci-cd", "devops", "nodejs"]
readingTime: "15 min read"
---

The monorepo pattern has won. In 2026, most engineering teams working with multiple related packages—whether it's a design system, a set of microservices, or a full-stack app with shared utilities—are running a monorepo.

But which tool should orchestrate it?

Lerna created the category. Nx reinvented it. Turborepo simplified it. All three are actively maintained, all three are used in production at scale, and the choice between them isn't obvious—until you understand what each one actually does.

This guide cuts through the marketing and gives you a practical framework for choosing between Turborepo, Nx, and Lerna in 2026.

---

## Why Monorepo Tooling Matters

A monorepo without proper tooling is just a folder with multiple packages. Without a build orchestrator, you get:

- **Redundant work**: rebuilding packages that haven't changed
- **Slow CI**: every package runs every task every time
- **Dependency chaos**: no guaranteed build order
- **Developer friction**: manual coordination across packages

The job of a monorepo tool is to solve these problems through:
1. **Task orchestration**: run tasks in the correct order based on dependencies
2. **Caching**: skip tasks whose inputs haven't changed
3. **Parallelization**: run independent tasks simultaneously
4. **Change detection**: know which packages were affected by a commit

---

## Quick Comparison Table

| Feature | Turborepo | Nx | Lerna |
|---------|-----------|-----|-------|
| Remote caching | Vercel Remote Cache (free tier) | Nx Cloud (free tier) | No (needs external) |
| Local caching | Yes | Yes | No |
| Task pipeline | `turbo.json` | `project.json` / `nx.json` | `nx.json` (Nx-powered) |
| Code generators | No | Yes (powerful) | No |
| Affected commands | Yes | Yes (more granular) | Yes (via Nx) |
| Bundle analysis | No | Yes | No |
| Plugin ecosystem | Small | Large | Inherited from Nx |
| Config complexity | Low | Medium-High | Low-Medium |
| Language support | Any | Any | JavaScript/TypeScript |
| Package manager | pnpm, npm, yarn, bun | All | All |
| Vercel integration | Native | Third-party | Third-party |
| Learning curve | Low | Medium-High | Low-Medium |
| Maintained by | Vercel | Nrwl / Nx | Nrwl (uses Nx) |

---

## Turborepo

Vercel acquired Turborepo in late 2021 and has been aggressively developing it since. Its design philosophy is deliberate minimalism: **do one thing well**, which is incremental build orchestration.

### Setting Up Turborepo

```bash
# New monorepo from scratch
npx create-turbo@latest

# Add to existing workspace
npx turbo@latest init
```

### Pipeline Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "build/**"]
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

The `^build` syntax means "run `build` in all dependencies before running `build` in this package." That's the entire build graph, expressed in one config file.

### Running Tasks

```bash
# Build all packages
turbo run build

# Build only affected packages (since main branch)
turbo run build --filter=...[origin/main]

# Build specific package and its dependencies
turbo run build --filter=@acme/web...

# Run in parallel with no caching
turbo run lint test --parallel --no-cache
```

### Remote Caching with Vercel

```bash
# Link to Vercel Remote Cache
npx turbo login
npx turbo link
```

After linking, Turborepo uploads cache artifacts to Vercel's CDN. On CI, cache hits are restored in seconds instead of minutes. The free tier is generous for most teams.

### Workspace Structure

```
my-monorepo/
├── apps/
│   ├── web/          # Next.js app
│   └── docs/         # Documentation site
├── packages/
│   ├── ui/           # Shared component library
│   ├── config/       # Shared TypeScript/ESLint config
│   └── utils/        # Shared utilities
├── turbo.json
└── package.json
```

### Turborepo Strengths

- **Fastest onboarding**: the config is minimal, the mental model is simple
- **Vercel-native**: zero-config cache sharing when deployed to Vercel
- **Zero magic**: no code generation, no framework opinions, runs any shell command
- **Excellent pnpm support**: works natively with pnpm workspaces (the recommended setup in 2026)
- **Bun support**: Turborepo 2.x added first-class Bun support

### Turborepo Weaknesses

- **No code generators**: no `generate component` commands—you're on your own for scaffolding
- **No bundle analysis**: no built-in visibility into what's in your builds
- **Remote cache vendor lock-in**: free cache requires Vercel account (self-hosted option available but complex)
- **Less granular affected detection**: Nx's affected detection understands TypeScript import graphs more deeply

### Best for

Teams using Vercel for deployment, projects that want to add monorepo tooling without restructuring their existing build setup, teams prioritizing setup speed over advanced features.

---

## Nx

Nx has been in the monorepo space longer than Turborepo, and it shows. Where Turborepo is minimal, Nx is comprehensive. It's a build system, a project scaffolder, a code analyzer, and an architecture visualizer all in one.

### Setting Up Nx

```bash
# New integrated monorepo
npx create-nx-workspace@latest my-org

# Add to existing monorepo
npx nx@latest init

# Add Nx to a package-based (npm workspaces) repo
npx nx@latest init --package-based
```

Nx supports two repo styles:
- **Integrated**: Nx manages everything; packages use `project.json` configs
- **Package-based**: npm/yarn/pnpm workspaces; Nx adds caching and task runner on top

### Task Configuration

```json
// apps/web/project.json
{
  "name": "web",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/web"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "apps/web/jest.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/web/**/*.{ts,tsx}"]
      }
    }
  }
}
```

### Running Tasks

```bash
# Build everything
nx run-many -t build

# Build only affected (uses TypeScript import graph)
nx affected -t build

# Build specific project and dependencies
nx build web --with-deps

# Visualize the dependency graph
nx graph

# Generate a new React component
nx g @nx/react:component MyButton --project=ui
```

### The Nx Dependency Graph

The `nx graph` command opens a browser visualization of your project's dependency graph. This is genuinely useful for large repos—you can see which packages affect which, and understand why a change in `packages/utils` triggers a rebuild in `apps/web`.

### Code Generators

This is where Nx differentiates itself most clearly:

```bash
# Generate a new Next.js app
nx g @nx/next:app dashboard

# Generate a React component with stories and tests
nx g @nx/react:component ProductCard --project=ui --with-stories --with-tests

# Generate a NestJS module
nx g @nx/nest:module auth --project=api

# Generate a shared library
nx g @nx/js:lib utils --publishable
```

In a large organization with dozens of developers, consistent code generation is a force multiplier. It enforces patterns, creates tests automatically, and reduces "how do I start a new feature?" friction.

### Nx Cloud

```bash
# Connect to Nx Cloud for remote caching and CI insights
npx nx connect
```

Nx Cloud provides remote caching, CI run analytics, and distributed task execution (running tasks across multiple CI machines). The free tier covers most small-to-medium teams.

### Nx Strengths

- **Code generators**: the most powerful scaffolding in the monorepo tool space
- **Project graph visualization**: essential for large repos
- **Affected detection using TypeScript graph**: more precise than file-based detection
- **Distributed task execution**: split a large CI job across N machines automatically
- **Extensive plugin ecosystem**: official plugins for Next.js, React, Angular, NestJS, Vite, Stencil, and more
- **Module boundaries**: enforce architectural constraints (e.g., feature libraries can't import from other feature libraries)

### Nx Weaknesses

- **Steep learning curve**: the full Nx integrated setup has many concepts to learn
- **Config sprawl**: `project.json` files in every package add maintenance burden
- **Vendor tie-in**: the best features (distributed execution, CI analytics) require Nx Cloud
- **Heavy for small repos**: Nx is overkill for a monorepo with 3–5 packages

### Best for

Large teams (10+ engineers), organizations with many interconnected packages, teams that benefit from scaffolding and enforced architecture, companies using Angular (Nx has the best Angular tooling in the ecosystem).

---

## Lerna

Lerna is the original monorepo tool, released by Babel in 2015. In 2022, it was adopted by Nrwl (the team behind Nx) and given new life. In 2026, Lerna v8+ is essentially a user-friendly wrapper around Nx's task runner with a focus on **package publishing workflows**.

### Setting Up Lerna

```bash
npx lerna init
```

### Modern Lerna Configuration

```json
// lerna.json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "useNx": true,
  "useWorkspaces": true,
  "version": "independent"
}
```

### The Publish Workflow

This is where Lerna remains unique:

```bash
# Determine which packages changed and bump versions
npx lerna version

# Publish changed packages to npm
npx lerna publish from-git

# Publish with independent versioning
npx lerna publish --conventional-commits
```

Lerna automates the process of:
1. Detecting which packages changed since the last release
2. Bumping versions according to conventional commits
3. Updating cross-package dependencies
4. Publishing to npm

No other tool in this comparison does this as cleanly.

### v7+ Improvements

Lerna v7 switched from its own task runner to using Nx under the hood. This means:
- Local caching works out of the box
- Nx Cloud remote caching is available
- `lerna run build` benefits from Nx's build graph

### Lerna Strengths

- **Best publishing workflow**: version bumping + npm publish is the most automated
- **Familiar API**: teams migrating from old Lerna setups have a clear upgrade path
- **Conventional commits integration**: automatic changelog generation
- **Simpler than full Nx**: you get the Nx task runner benefits without managing `project.json` files

### Lerna Weaknesses

- **No unique build features**: for task orchestration, it's just Nx with extra steps
- **No code generators**: same gap as Turborepo
- **Weaker cache story**: depends on Nx Cloud for remote caching; not Vercel-native
- **Declining mindshare**: most new projects choose either Turborepo or Nx directly

### Best for

Teams publishing multiple npm packages (component libraries, utilities), projects migrating off old Lerna v4/v5, situations where npm publishing automation is the primary requirement.

---

## Migration Guide

### Moving from Lerna to Turborepo

1. Install Turborepo: `npm install turbo --save-dev`
2. Create `turbo.json` with your pipeline
3. Remove `lerna.json` and uninstall Lerna
4. Replace `lerna run build` with `turbo run build` in CI scripts
5. If you need publishing: keep Lerna just for `lerna publish`, use Turborepo for everything else

### Moving from Lerna to Nx

```bash
# Nx can migrate an existing Lerna repo
npx nx@latest init
```

Nx's migration wizard detects your workspace structure and sets up initial configuration automatically. Expect to spend a day tuning the `project.json` files.

### Moving from Turborepo to Nx

This migration is more work—Nx's integrated mode requires restructuring your task configs. Use Nx's package-based mode to ease the transition:

```bash
npx nx@latest init --package-based
```

This gives you Nx's affected detection and caching while keeping your existing `package.json` scripts.

---

## Performance and Caching Comparison

All three tools implement the same fundamental caching mechanism: hash the inputs (source files + config + env vars), check if there's a cached output for that hash, and restore it if so.

In practice, cache hit rates depend more on your pipeline configuration than the tool itself. With well-configured pipelines:

- **First run** (cold cache): all three are similar—sequential bottlenecks are eliminated by parallelism
- **Subsequent runs with no changes**: all three restore from cache in seconds
- **Partial changes**: Nx has the edge here because it understands TypeScript import graphs, not just file hashes

On a real-world project (Next.js app + component library + 5 utility packages), you can expect **60–80% CI time reduction** from any of these tools. The tool choice matters less than actually setting up caching.

---

## CI Integration

### Turborepo + GitHub Actions

```yaml
# .github/workflows/ci.yml
- name: Setup Turborepo Cache
  uses: actions/cache@v3
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-

- name: Build and Test
  run: turbo run build test lint --filter=...[origin/main]
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

### Nx + GitHub Actions

```yaml
- name: Check affected projects
  run: npx nx affected -t build test lint --base=origin/main
  env:
    NX_CLOUD_AUTH_TOKEN: ${{ secrets.NX_CLOUD_AUTH_TOKEN }}
```

---

## When to Choose Which

**Choose Turborepo when:**
- You're deploying to Vercel and want zero-config remote caching
- Your team wants the simplest possible monorepo config
- You have an existing pnpm/npm/yarn workspace you want to accelerate
- Setup time matters more than advanced features
- You're building with Bun

**Choose Nx when:**
- You have a large team (10+ developers) who need scaffolding consistency
- You need to enforce architectural boundaries between packages
- You want distributed CI execution across multiple machines
- You're building with Angular (best-in-class Angular support)
- You want a dependency graph visualizer for architectural oversight

**Choose Lerna when:**
- You maintain open-source libraries that need automated npm publishing
- You're migrating off Lerna v4/v5 and want the smoothest upgrade path
- You want conventional commits-based versioning and changelogs
- Publishing automation is your primary requirement

---

## Conclusion

In 2026, **Turborepo** is the default choice for most new monorepos. Its minimal config, Vercel integration, and excellent pnpm support make it the fastest path from "I have multiple packages" to "I have a well-orchestrated monorepo."

**Nx** is the right choice when you're building something large and want the monorepo tooling to enforce architecture, not just accelerate builds. If you have a platform team managing multiple product teams' codebases, Nx pays for its complexity.

**Lerna** fills a specific niche: npm package publishing automation. If that's your primary concern, keep using it. Otherwise, it's a wrapper around Nx that adds little beyond what Turborepo or Nx provide directly.

The overlap between all three has increased significantly. Remote caching, affected detection, and parallel execution are now table stakes. The differentiators are Nx's generators and graph visualization, Turborepo's minimal config and Vercel integration, and Lerna's publishing workflow.

Pick the one that solves your current pain point. Your CI pipeline will thank you.

---

*Building your monorepo pipeline? Check out DevPlaybook's [JSON Formatter](/tools/json-formatter), [environment variable tools](/tools), and [developer utilities](/) for quick tools to support your build workflow.*
