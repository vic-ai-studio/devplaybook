---
title: "pnpm Workspaces: The Complete Monorepo Guide (2026)"
description: "Master pnpm workspaces for monorepo development. Covers workspace protocol, catalogs feature, filtering, recursive scripts, comparison with npm workspaces and Yarn Berry, and migrating from Lerna."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["pnpm", "monorepo", "nodejs", "package-manager", "javascript", "tooling"]
readingTime: "12 min read"
---

The monorepo pattern has won. Whether you're maintaining a component library alongside an application, sharing utilities across multiple services, or running a full-stack project where frontend and backend live together — the monorepo approach reduces duplication and makes refactoring dramatically easier.

pnpm workspaces have emerged as the go-to solution: faster than npm workspaces, more pragmatic than Yarn Berry, and with a disk efficiency advantage that compounds at scale. This guide covers everything you need to build a production monorepo with pnpm in 2026.

---

## Why pnpm for Monorepos?

**Content-addressable storage**: pnpm stores packages in a global store (`~/.pnpm-store`) and hardlinks them into `node_modules`. A package used in 10 workspaces only occupies disk space once.

**Strict dependency isolation**: by default, packages can only import what they explicitly list in their `package.json`. No phantom dependencies leaking from parent `node_modules`.

**Speed**: pnpm install is typically 2–3× faster than npm and comparable to Yarn Berry with zero-installs.

**Standards-compliant**: pnpm uses Node.js module resolution properly. No `.pnp.cjs` magic.

---

## Setting Up a pnpm Workspace

### 1. Create the workspace root

```bash
mkdir my-monorepo && cd my-monorepo
pnpm init
```

### 2. Configure `pnpm-workspace.yaml`

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
  - "tools/*"
```

This tells pnpm to treat every directory under `packages/`, `apps/`, and `tools/` as a workspace package.

### 3. Project structure

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json              # Root package — workspace-level scripts/deps
├── .npmrc                    # pnpm configuration
├── packages/
│   ├── ui/                   # Shared component library
│   │   └── package.json      # name: "@myorg/ui"
│   ├── utils/                # Shared utilities
│   │   └── package.json      # name: "@myorg/utils"
│   └── config/               # Shared configs (eslint, tsconfig)
│       └── package.json      # name: "@myorg/config"
├── apps/
│   ├── web/                  # Next.js app
│   │   └── package.json
│   └── docs/                 # Docusaurus site
│       └── package.json
└── tools/
    └── scripts/              # Build/deploy scripts
        └── package.json
```

### 4. Root `.npmrc`

```ini
# .npmrc
link-workspace-packages=true
prefer-workspace-packages=true
```

---

## The Workspace Protocol

When one workspace package depends on another, use the `workspace:` protocol instead of a version number:

```json
{
  "name": "@myorg/web",
  "dependencies": {
    "@myorg/ui": "workspace:*",
    "@myorg/utils": "workspace:^",
    "@myorg/config": "workspace:~"
  }
}
```

- `workspace:*` — use the local version exactly (most common)
- `workspace:^` — use local, but when publishing resolve to a semver range
- `workspace:~` — use local, resolve to patch-level semver range on publish

The workspace protocol ensures that during development you always use the local version, never accidentally pulling from the npm registry.

---

## Installing Dependencies

```bash
# Install a dep in a specific workspace
pnpm --filter @myorg/web add react react-dom

# Install a dev dep in a specific workspace
pnpm --filter @myorg/ui add -D typescript

# Install in ALL workspaces
pnpm -r add lodash

# Install at the root (workspace-level tooling)
pnpm add -D -w turbo typescript
```

The `-w` flag installs to the workspace root.

---

## The Catalogs Feature (pnpm 9+)

**Catalogs** are pnpm's killer feature for monorepos in 2026. They let you define canonical package versions in one place and reference them across all workspaces — solving the "dependency version drift" problem.

### Defining a catalog

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"

catalog:
  react: ^19.0.0
  react-dom: ^19.0.0
  typescript: ^5.5.0
  zod: ^4.0.0
  vitest: ^2.0.0
  eslint: ^9.0.0
```

### Using catalog entries in workspace packages

```json
{
  "name": "@myorg/web",
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

The `catalog:` specifier tells pnpm "use the version defined in the workspace catalog." Every package using `react: "catalog:"` is guaranteed to resolve the same version.

### Multiple catalogs

For projects with different version tiers (stable vs. experimental):

```yaml
catalog:
  react: ^19.0.0

catalogs:
  react18:
    react: ^18.3.0
    react-dom: ^18.3.0
  react19:
    react: ^19.0.0
    react-dom: ^19.0.0
```

```json
{
  "dependencies": {
    "react": "catalog:react19"
  }
}
```

Catalogs make upgrades trivial: change one version in `pnpm-workspace.yaml`, run `pnpm install`, and every package is updated simultaneously.

---

## Filtering and Recursive Commands

pnpm's `--filter` flag lets you target specific workspaces:

```bash
# Run a script in one package
pnpm --filter @myorg/ui build

# Run in all packages matching a glob
pnpm --filter "./packages/*" build

# Run in a package and everything that depends on it
pnpm --filter "@myorg/utils..." build

# Run in a package and all its dependencies
pnpm --filter "...@myorg/utils" build

# Run in packages changed since main branch
pnpm --filter "[origin/main]" test
```

The `...` syntax is powerful for CI: only rebuild what actually changed and its dependents.

### Recursive commands

```bash
# Run "build" in all workspaces (respects dependency order)
pnpm -r build

# Run "test" in parallel across all workspaces
pnpm -r --parallel test

# Run in specific workspaces
pnpm -r --filter "./apps/*" dev
```

---

## Root-Level Scripts

Your root `package.json` is the control center:

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "dev:web": "pnpm --filter @myorg/web dev",
    "dev:docs": "pnpm --filter @myorg/docs dev",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r --parallel exec -- rm -rf dist node_modules/.cache"
  }
}
```

---

## Shared TypeScript Configuration

```json
// packages/config/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@myorg/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "baseUrl": "src"
  },
  "include": ["src"]
}
```

---

## pnpm Workspaces vs npm Workspaces vs Yarn Berry

### npm Workspaces

npm workspaces work but lack polish. No equivalent to catalogs, `--filter` is less expressive, and the hoisting behavior can lead to phantom dependency bugs:

```bash
# npm equivalent of pnpm's --filter with dependents
npm run build --workspace=@myorg/ui  # no transitive dependent support
```

**Choose npm workspaces when**: you want zero additional tooling and your monorepo is simple.

### Yarn Berry (Yarn 4)

Yarn Berry is feature-rich with Plug'n'Play, zero-installs, and constraints (a Prolog-based dependency policy engine). It's powerful but complex:

- Zero-installs require committing `.yarn/cache` to git (can be gigabytes)
- PnP breaks tools that expect a traditional `node_modules` structure
- Patching upstream packages via `yarn patch` is genuinely useful

**Choose Yarn Berry when**: you need Yarn Constraints or PnP's strict isolation model.

### pnpm Workspaces

The pragmatic middle ground: fast, disk-efficient, with excellent filtering support and the catalogs feature. Works with all Node.js tooling out of the box.

**Choose pnpm when**: you want the best balance of speed, features, and compatibility.

---

## Migrating from Lerna

Lerna's original purpose (linking local packages and versioning) is now handled natively by pnpm workspaces + changesets:

### Step 1: Add pnpm-workspace.yaml

Convert your `lerna.json` packages array to `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

### Step 2: Replace `lerna bootstrap`

```bash
# Old
lerna bootstrap

# New
pnpm install
```

### Step 3: Replace `lerna run`

```bash
# Old
lerna run build

# New
pnpm -r build
```

### Step 4: Replace `lerna add`

```bash
# Old
lerna add react --scope=@myorg/web

# New
pnpm --filter @myorg/web add react
```

### Step 5: Replace versioning with Changesets

```bash
pnpm add -D -w @changesets/cli
pnpm changeset init
```

Changesets handles versioning and changelog generation — it's what Lerna's `version` command did but better.

---

## CI/CD with pnpm Workspaces

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # needed for --filter "[origin/main]"

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      # Only test what changed
      - run: pnpm --filter "[origin/main]..." test

      # Build everything
      - run: pnpm -r build
```

### Caching the pnpm store

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

---

## Common Gotchas

**1. Phantom dependencies**

pnpm's strict mode prevents phantom dependencies. If you get "Cannot find module 'X'" even though X is installed in a sibling workspace, you need to add it to that package's `package.json`:

```bash
pnpm --filter @myorg/web add X
```

**2. Build order matters**

If `@myorg/web` depends on `@myorg/ui`, you must build `@myorg/ui` first. Either use a build tool like Turborepo (which understands your dependency graph), or manually order your `-r` scripts:

```bash
pnpm --filter @myorg/ui build && pnpm --filter @myorg/web build
```

**3. Circular dependencies**

pnpm will detect circular workspace dependencies and error out. Restructure your packages to avoid cycles.

**4. Lockfile conflicts**

`pnpm-lock.yaml` is a single file at the workspace root. In large teams, merge conflicts are common. The resolution: accept one version and run `pnpm install` again.

---

## Recommended Stack for pnpm Monorepos in 2026

- **Task runner**: Turborepo (understands dependency graph, caches builds)
- **Versioning**: Changesets (changelog generation, versioning)
- **TypeScript**: shared `tsconfig.base.json` via a `@myorg/config` package
- **Linting**: Flat config ESLint 9 shared from root
- **Testing**: Vitest (workspace-aware)
- **Build**: Vite 6 or tsup per package

```bash
# Full setup
pnpm add -D -w turbo @changesets/cli vitest typescript eslint
```

---

## Conclusion

pnpm workspaces in 2026 are the pragmatic monorepo choice: fast, disk-efficient, and with the catalogs feature solving the dependency versioning problem that plagued earlier monorepo setups. Combined with Turborepo for task caching and Changesets for versioning, you have a complete, production-grade monorepo system that scales from 2 packages to 200.

Start simple — two packages, a shared config, and a root-level build script. Add Turborepo when builds get slow. Add Changesets when you need to publish packages. The tools compose well and you only need what you use.

**Related tools on DevPlaybook:**
- [Package.json Generator](/tools/packagejson-generator) — scaffold package.json with best practices
- [npm to pnpm Migration Checker](/tools/npm-pnpm-migrator) — audit your project for pnpm compatibility
- [Monorepo Structure Visualizer](/tools/monorepo-visualizer) — visualize your workspace dependency graph
