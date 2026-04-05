---
title: "Oxlint — Blazingly Fast JavaScript & TypeScript Linter"
description: "Ultra-fast JavaScript/TypeScript linter written in Rust — 50-100x faster than ESLint, with 500+ rules and zero configuration required to get started."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://oxc.rs/docs/guide/usage/linter.html"
github: "https://github.com/oxc-project/oxc"
tags: [linting, javascript, typescript, rust, developer-tools, open-source, performance]
pros:
  - "50-100x faster than ESLint — lints large codebases in milliseconds"
  - "500+ rules built-in, zero config needed to start"
  - "Part of the Oxc toolchain (parser, transformer, bundler — all Rust)"
  - "Drop-in alongside ESLint — catch fast wins while ESLint handles complex rules"
  - "Helpful error messages with precise source locations"
cons:
  - "Cannot use ESLint plugins — custom rules not supported"
  - "Newer tool — not all ESLint rules have been ported yet"
  - "No autofix for all rules (subset have `--fix` support)"
  - "Less configurable than ESLint for advanced rule customization"
date: "2026-04-02"
---

## Overview

Oxlint is the linting component of the Oxc (Oxidation Compiler) project — a Rust-based JavaScript toolchain. On a typical 500k-line codebase, ESLint takes ~60 seconds; Oxlint takes ~0.5 seconds. In 2026, many teams run Oxlint as a fast first-pass linter in CI while keeping ESLint for project-specific rules.

## Installation and Quick Start

```bash
npm install oxlint --save-dev

# Lint current directory (zero config)
npx oxlint .

# Or run immediately without installing
npx oxlint@latest .
```

Output:
```
⚓ oxlint found 3 errors and 1 warning in 127 files in 89ms

  × no-unused-vars: 'foo' is defined but never used
    ╭─[src/utils.ts:42:5]
    │
  42│     const foo = getConfig();
    │           ^^^
```

## Configuration

```json
// .oxlintrc.json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/crates/oxc_linter/schemas/oxlintrc.json",
  "plugins": ["react", "typescript", "unicorn"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "react/jsx-key": "error",
    "typescript/no-explicit-any": "warn"
  },
  "ignorePatterns": ["dist/", "node_modules/", "*.generated.ts"]
}
```

## Package.json Scripts

```json
{
  "scripts": {
    "lint:fast": "oxlint .",
    "lint:fix": "oxlint . --fix",
    "lint": "oxlint . && eslint ."
  }
}
```

## CI Integration

```yaml
# GitHub Actions
- name: Oxlint (fast lint)
  run: npx oxlint@latest --deny-warnings .
  # Runs in ~1s — fail fast before slower ESLint check
```

## Available Rule Plugins

```bash
# Enable specific rule sets
npx oxlint --plugin react --plugin typescript --plugin jsx-a11y .

# Available plugins:
# - react        (React hooks, JSX rules)
# - typescript   (TS-specific rules)
# - jsx-a11y     (Accessibility)
# - unicorn      (Modern JS best practices)
# - import       (Import/export rules)
# - jest         (Test file rules)
# - node         (Node.js rules)
```

## Oxlint vs Biome vs ESLint

| | Oxlint | Biome | ESLint |
|--|--------|-------|--------|
| Speed | 50-100x faster | 25x faster | Baseline |
| Rules | 500+ | 200+ | Unlimited (plugins) |
| Formatting | ❌ | ✅ | ❌ |
| Custom rules | ❌ | ❌ | ✅ |
| Autofix | Partial | ✅ | ✅ |
| Config | Simple JSON | One file | Complex |

**Recommended strategy**: Use Oxlint for fast CI pre-check, ESLint for comprehensive project-specific rules. Oxlint + Biome together replace the ESLint + Prettier stack with a 50x speed improvement for many teams.

---

## Concrete Use-Case: Migrating a 500k-Line TypeScript Monorepo from ESLint to Oxlint

This example walks through migrating a large TypeScript monorepo to Oxlint while keeping ESLint for project-specific custom rules. The codebase has 500,000 lines across 1,200 TypeScript files, 80+ custom ESLint rules, and a CI pipeline that spent 8 minutes running ESLint on every pull request.

**Migration steps:**

**Step 1 — Install Oxlint alongside ESLint (no removal yet):**

```bash
npm install oxlint --save-dev
```

**Step 2 — Add a fast pre-check to package.json scripts:**

```json
{
  "scripts": {
    "lint:fast": "oxlint .",
    "lint:full": "eslint . --max-warnings=0",
    "lint": "npm run lint:fast && npm run lint:full"
  }
}
```

**Step 3 — Add to CI (GitHub Actions) before the slower ESLint step:**

```yaml
# .github/workflows/lint.yml
jobs:
  lint-fast:
    name: Oxlint (fast pre-check)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run Oxlint
        run: npx oxlint@latest --deny-warnings .

  lint-full:
    name: ESLint (custom rules)
    runs-on: ubuntu-latest
    needs: lint-fast
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Run ESLint
        run: npx eslint . --max-warnings=0
```

**Step 4 — Configure .oxlintrc.json:**

```json
// .oxlintrc.json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/crates/oxc_linter/schemas/oxlintrc.json",
  "plugins": ["react", "typescript", "jsx-a11y", "unicorn"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "react/jsx-key": "error",
    "typescript/no-explicit-any": "warn"
  },
  "ignorePatterns": [
    "dist/",
    "node_modules/",
    "build/",
    "*.generated.ts"
  ]
}
```

**Step 5 — Gradually port custom rules (optional):**

For the 80+ custom ESLint rules the team maintained, they adopted a hybrid approach:
- Rules that detect business logic bugs → kept in ESLint (no Oxlint equivalent)
- Rules that catch style/naming/import issues → moved to Oxlint config

```javascript
// .eslintrc.js — now only contains custom project rules
module.exports = {
  rules: {
    // Custom business-logic rules kept here
    'our-team/no-direct-db-access': 'error',
    'our-team/require-api-version-header': 'error',
    // ... other custom rules
  },
  plugins: ['our-team']
};
```

**Results after migration:**

| Metric | Before (ESLint only) | After (Oxlint + ESLint) |
|--------|---------------------|------------------------|
| CI lint time | ~8 minutes | ~90 seconds (Oxlint) + 6 minutes (ESLint) = **6.5 min total** |
| Oxlint coverage | N/A | 500+ built-in rules |
| Custom ESLint rules | 80+ | 35 (rest migrated to Oxlint or removed) |
| Developer feedback loop | 8 min wait on PR | **90 sec fast fail** for most issues |

The key win: developers see fast failures from Oxlint within 90 seconds of pushing a commit, catching the majority of issues before the slower ESLint job even starts. The 6-minute ESLint job now only runs after Oxlint passes, handling the remaining project-specific custom rules.

---

## Comparison: Oxlint vs Biome vs ESLint for Team Scenarios

| | **Oxlint** | **Biome** | **ESLint** |
|--|--|--|--|
| **Speed (500k LOC)** | ~0.5–1s | ~2–4s | ~60–90s |
| **Language** | Rust | Rust | JavaScript/TypeScript |
| **Linting rules** | 500+ | 200+ | Unlimited (via plugins) |
| **Formatting** | ❌ No | ✅ Yes | ❌ No (use Prettier) |
| **Custom rules** | ❌ No | ❌ No | ✅ Yes |
| **Autofix coverage** | Partial (~60%) | ✅ Full | ✅ Full |
| **Plugin ecosystem** | Built-in only | Built-in only | Massive (eslint-plugins ecosystem) |
| **Config complexity** | Simple JSON | Simple JSON | Verbose (`.eslintrc` with plugins) |
| **Best for monorepo size** | Any (scales well) | Small–medium | Large (with custom rules needed) |
| **Migration ease from ESLint** | Easy — drop-in as pre-check | Moderate | Baseline |
| **TypeScript deep analysis** | ✅ Strong | ✅ Strong | ✅ (with `@typescript-eslint`) |
| **React rules** | ✅ via plugin | ✅ | ✅ |
| **CI wins** | Highest — sub-second fast fail | Good | Baseline |
| **Team size** | Any | Small–medium | 1–500+ |

**Scenario-based recommendations:**

- **Startup with 3–10 engineers**: Use Oxlint as your primary linter with zero config. If you need formatting too, add Biome for a two-tool stack that replaces ESLint + Prettier at 50x the speed.
- **Enterprise with custom lint rules**: Keep ESLint for project-specific rules; add Oxlint as a fast pre-check in CI. You get speed on common issues and flexibility for business logic rules.
- **Large TypeScript monorepo (500k+ LOC)**: Oxlint for CI speed (90s vs 8 min); ESLint for custom rules; consider Biome if you also need formatting in the same tool.
- **Open source project**: Oxlint + Biome covers 95% of issues for contributors with minimal setup; keep ESLint only if your project has unusual conventions that require custom rules.
- **Mixed JS/TS codebase**: Oxlint handles both with its TypeScript plugin. No need to run separate TS compilers or ESLint instances.

---

## When to Use / When Not to Use

**When to use Oxlint:**

- Your CI pipeline is **slow due to ESLint** — even small PRs wait 5+ minutes for lint results, and developers are shipping without lint checks to work around the wait.
- You want **zero-config linting** for a new project or a new team. Oxlint's built-in rules catch most issues immediately without writing a single line of ESLint configuration.
- You are working in a **monorepo with multiple packages** and need fast feedback across the entire codebase on every PR.
- You want a **fast first-pass in CI** before running ESLint for custom rules — Oxlint catches 80–90% of issues in under 2 seconds, letting ESLint handle the remaining project-specific rules.
- You are **evaluating a full rewrite** of your linting stack and want to compare speed and rule coverage before committing.

**When NOT to use Oxlint:**

- You rely on **custom ESLint rules** that encode your team's specific conventions. Oxlint cannot load ESLint plugins and has no custom rule authoring story yet. If you remove ESLint entirely, those rules are gone.
- You need **formatting** bundled with linting. Oxlint is a linter only; use Biome (which also includes a formatter) if you want a combined lint + format tool.
- You are on a **mature project with specific ESLint plugin dependencies** (e.g., `eslint-plugin-import`, `eslint-plugin-graphql`) that have no Oxlint equivalent. Check the [Oxc rule list](https://oxc.rs/docs/guide/usage/linter.html) before migrating.
- Your codebase uses **very new or experimental TypeScript patterns** that the Oxlint TypeScript plugin hasn't caught up with yet. Test thoroughly before relying on Oxlint exclusively.
- You want **maximum autofix coverage** for all rules. Oxlint's `--fix` support is growing but doesn't yet cover every rule; Biome has more complete autofix.

**Bottom line:** Oxlint is the right choice when speed is the primary bottleneck and your linting needs are covered by its 500+ built-in rules. Pair it with ESLint for custom rules, or migrate fully to it if your project fits within its rule coverage. For teams that need formatting alongside linting, Biome is a compelling alternative — and for teams with extensive custom ESLint rule suites, keeping ESLint while adding Oxlint as a CI pre-check delivers the best of both worlds.
