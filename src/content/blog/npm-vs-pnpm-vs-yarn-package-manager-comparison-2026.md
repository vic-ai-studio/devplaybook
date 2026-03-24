---
title: "npm vs pnpm vs yarn: Which Package Manager Should You Use in 2026?"
description: "A practical comparison of npm, pnpm, and yarn for JavaScript developers. Covers install speed, disk space, monorepo support, lockfiles, and when to pick each one."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["npm", "pnpm", "yarn", "package-manager", "javascript", "nodejs", "comparison"]
readingTime: "9 min read"
---

JavaScript has three major package managers and each one has a strong argument for being the right choice. npm ships with Node.js and works everywhere. pnpm uses hard links to save gigabytes of disk space and runs faster. yarn introduced workspaces to the ecosystem and has a loyal following.

Choosing the wrong one isn't catastrophic — you can switch later — but the decision touches your CI pipeline, your team's workflow, and your monorepo setup. Getting it right early saves headaches.

This comparison focuses on what actually matters day to day: install speed, disk usage, lockfile behavior, monorepo support, and real-world gotchas.

---

## TL;DR

| | npm | pnpm | yarn (v1/berry) |
|---|---|---|---|
| **Ships with Node.js** | Yes | No | No |
| **Install speed** | Medium | Fastest | Fast |
| **Disk space** | High | Lowest | Medium |
| **Lockfile** | package-lock.json | pnpm-lock.yaml | yarn.lock |
| **Monorepo (workspaces)** | Good | Excellent | Excellent |
| **Phantom deps** | Yes | No (strict) | Yes |
| **Plug'n'Play** | No | Optional | Yes (Berry) |
| **Adoption** | Largest | Growing fast | Strong |

**Short answer:** Start with **npm** if you want zero setup friction. Switch to **pnpm** if disk space or install speed matters (monorepos, CI). Use **yarn** if your team already has it configured or you need Plug'n'Play.

---

## npm: The Default That's Actually Good Now

npm used to be slow and broken. The npm v3 era of flat `node_modules` and non-deterministic installs was genuinely painful. It's 2026, and npm is now fast, reliable, and ships with Node.js.

```bash
# Install
npm install

# Add a package
npm install lodash

# Add dev dependency
npm install --save-dev typescript

# Run scripts
npm run build
npm run test
```

npm's lockfile (`package-lock.json`) has been reliable since npm v5. Installs are deterministic. The CLI is familiar to every JavaScript developer.

**What npm does well:**
- Zero installation required — it's already there
- Largest registry, best compatibility
- Workspaces work fine for small monorepos
- `npx` for running packages without installing globally

**Where npm falls short:**
- Each project gets its own copy of every package in `node_modules` — if you have 10 projects that all use React 18, you have 10 copies on disk
- Slower installs compared to pnpm on large projects
- "phantom dependencies" — packages you didn't list in `package.json` are still accessible because they got hoisted

---

## pnpm: The Performance Choice

pnpm (performant npm) solves the disk space problem with a content-addressable store. Every version of every package is stored once on your machine, and projects reference those packages via hard links. If 10 projects use React 18.2.0, there's one copy on disk.

```bash
# Install pnpm
npm install -g pnpm

# Or with corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate

# Install
pnpm install

# Add a package
pnpm add lodash

# Add dev dependency
pnpm add -D typescript

# Run scripts
pnpm run build
pnpm test
```

The disk savings are real. On a machine with many JavaScript projects, pnpm can save tens of gigabytes compared to npm.

### The Phantom Dependency Problem

pnpm's most important feature is also its most disruptive: it enforces strict access to only the packages you explicitly list in `package.json`.

With npm and yarn, this works even though `express` is a dependency of your dependency, not yours:

```js
// package.json only lists "my-framework" which depends on express
// npm/yarn: this works (phantom dependency)
const express = require('express');
```

pnpm breaks this. If you didn't declare `express`, you can't use it. This forces you to be explicit about your dependencies, which is the right behavior — but it can break existing projects that relied on phantom deps.

**What pnpm does well:**
- Fastest installs, especially on CI where the global cache is warm
- Lowest disk usage by a significant margin
- Strict dependency isolation — no phantom deps
- Excellent monorepo/workspace support with filters
- `pnpm -r` to run commands across all packages in a monorepo

**Where pnpm falls short:**
- Requires installation (not bundled with Node.js)
- Some tools assume a flat `node_modules` and break with pnpm's symlink approach
- The strict phantom dep enforcement requires fixing projects that relied on hoisting

### pnpm Monorepo Example

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```bash
# Install everything
pnpm install

# Run build in all packages
pnpm -r run build

# Run build only in packages affected by changes
pnpm --filter "...[origin/main]" run build

# Add a package to a specific workspace
pnpm --filter my-app add react
```

---

## yarn: The Workspaces Pioneer

yarn v1 (Classic) was released in 2016 by Facebook when npm was unreliable and slow. It introduced the lockfile, parallel installs, and workspaces — features npm later adopted. yarn Classic is still widely used and has a familiar API.

yarn Berry (v2+) is a full rewrite with a new architecture, Plug'n'Play (PnP), and zero-installs support.

```bash
# Install yarn
npm install -g yarn

# Or with corepack
corepack enable
corepack prepare yarn@stable --activate

# Install
yarn install
yarn  # shorthand

# Add a package
yarn add lodash

# Add dev dependency
yarn add --dev typescript

# Run scripts
yarn build
yarn test
```

### yarn v1 vs yarn Berry

Most teams using yarn are on v1 (Classic). Berry is powerful but requires migration:

| | yarn v1 | yarn Berry |
|---|---|---|
| **node_modules** | Traditional hoisted | Optional (PnP by default) |
| **Plug'n'Play** | No | Yes (default) |
| **Zero installs** | No | Yes (via .yarn/cache) |
| **Migration effort** | — | Medium-High |
| **IDE support** | Full | Requires SDK setup |

**yarn Plug'n'Play** eliminates `node_modules` entirely. Instead, yarn generates a `.pnp.cjs` file that tells Node.js exactly where each package lives. The result: instant installs after the first one, and you can commit the cache for zero-install CI.

The downside: many tools don't support PnP, and getting your IDE (VSCode, etc.) to work with PnP requires running `yarn dlx @yarnpkg/sdks vscode`.

**What yarn does well:**
- Fastest adoption — many teams already use it
- Stable, well-documented API
- Good monorepo workspaces
- Berry's PnP is genuinely innovative for the right setup

**Where yarn falls short:**
- yarn v1 is in maintenance mode (security fixes only)
- Berry migration can be disruptive
- PnP requires significant toolchain changes

---

## Speed Comparison

Install times vary by machine, project size, and cache state. These are representative numbers for a medium-sized project (~500 packages):

| Scenario | npm | pnpm | yarn |
|---|---|---|---|
| First install (cold) | ~45s | ~30s | ~35s |
| Repeat install (warm cache) | ~15s | ~5s | ~8s |
| CI (warm cache) | ~20s | ~8s | ~12s |

pnpm wins consistently, especially on repeated installs. The global content-addressable store means packages downloaded once are shared across all projects.

---

## Monorepo Support

For monorepos, all three work — but pnpm has the best DX:

```bash
# npm workspaces
npm install --workspace=packages/my-lib

# pnpm with filters
pnpm --filter my-lib add typescript
pnpm --filter "my-app..." run build  # build my-app + its deps

# yarn workspaces
yarn workspace my-lib add typescript
```

pnpm's `--filter` syntax is the most powerful. You can filter by:
- Package name: `--filter my-app`
- Directory: `--filter ./apps/my-app`
- All packages with uncommitted changes: `--filter "[HEAD~1]"`
- All dependents of a package: `--filter "...my-lib"`

For large monorepos with 50+ packages, pnpm is the clear winner.

---

## Which One Should You Choose?

**Choose npm if:**
- You're building a small project or learning Node.js
- You want zero setup friction
- Your team isn't comfortable with new tooling
- You're publishing a package and want maximum compatibility

**Choose pnpm if:**
- You work on a monorepo or have many JavaScript projects on your machine
- CI speed and disk usage matter (they almost always do)
- You want strict dependency isolation
- You're starting a new project and can deal with any phantom dep fixes upfront

**Choose yarn if:**
- Your team already uses it and the migration cost isn't worth the switch
- You want yarn Berry's PnP for zero-install CI
- You're on a framework/starter that defaults to yarn (some Next.js starters, for example)

---

## Migration Paths

### npm → pnpm

```bash
# Delete node_modules and npm lockfile
rm -rf node_modules package-lock.json

# Import from package.json (preserves versions)
pnpm import  # creates pnpm-lock.yaml from package-lock.json

# Install
pnpm install
```

Watch for phantom dependency errors. `pnpm install` will list them. Add missing packages to `package.json`.

### npm → yarn v1

```bash
rm -rf node_modules package-lock.json
yarn install  # creates yarn.lock
```

Usually seamless for simple projects.

---

## Practical Recommendation for 2026

For new projects: **pnpm**. The disk space savings and strict dependency isolation are worth the small setup cost. CI pipelines are faster. The tooling has matured significantly.

For existing projects with npm: stay on npm unless you have a specific pain point. The cost of migrating an established project isn't always justified.

For existing projects with yarn: stay on yarn v1 unless you want to invest in yarn Berry's zero-install setup, or you want to switch to pnpm for performance.

The JavaScript ecosystem broadly moved toward pnpm between 2023–2025. Vue, Nuxt, Vite, and many other major projects now use pnpm for their own development. That's a strong signal.

---

## Quick Commands Reference

```bash
# ---- INSTALL ALL ----
npm install
pnpm install
yarn install

# ---- ADD PACKAGE ----
npm install lodash
pnpm add lodash
yarn add lodash

# ---- ADD DEV DEP ----
npm install -D typescript
pnpm add -D typescript
yarn add -D typescript

# ---- REMOVE ----
npm uninstall lodash
pnpm remove lodash
yarn remove lodash

# ---- RUN SCRIPT ----
npm run build
pnpm run build  # or: pnpm build
yarn build

# ---- LIST OUTDATED ----
npm outdated
pnpm outdated
yarn outdated

# ---- UPDATE ALL ----
npm update
pnpm update
yarn upgrade
```

---

## Related Tools on DevPlaybook

- **[JSON Formatter](/tools/json-formatter)** — format package.json cleanly
- **[Base64 Encoder](/tools/base64)** — encode tokens and credentials
- **[Diff Checker](/tools/diff)** — compare lockfile changes between branches
