---
title: "Biome — Fast Formatter & Linter for JavaScript & TypeScript"
description: "Blazing-fast JavaScript/TypeScript linter and formatter in one tool — written in Rust, replaces ESLint + Prettier with a single binary that runs 25x faster."
category: "API Testing & CI/CD"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://biomejs.dev"
github: "https://github.com/biomejs/biome"
tags: [linting, formatting, javascript, typescript, developer-tools, rust, open-source]
pros:
  - "Single tool replaces ESLint + Prettier — one config, one command, one dependency"
  - "25x faster than ESLint on large codebases — written in Rust"
  - "200+ lint rules, most auto-fixable with `biome check --apply`"
  - "Formatter with Prettier-compatible output (97%+ compatible)"
  - "Zero configuration needed — sensible defaults out of the box"
cons:
  - "Cannot use ESLint plugins — custom rules require migration or dual-tooling"
  - "Some ESLint rules not yet ported (coverage growing rapidly)"
  - "Less configurable than ESLint for highly customized rule sets"
  - "Smaller ecosystem — fewer IDE integrations than ESLint"
date: "2026-04-02"
---

## Overview

Biome is a Rust-based toolchain for JavaScript and TypeScript that combines linting and formatting into a single fast binary. It was born from the Rome project and has become a credible replacement for ESLint + Prettier in most projects. In 2026, many teams are dropping the ESLint/Prettier combination in favor of Biome for its speed and simplicity.

## Installation and Setup

```bash
npm install --save-dev --save-exact @biomejs/biome

# Initialize config
npx biome init
```

This creates `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  }
}
```

## Common Commands

```bash
# Check everything (lint + format check)
npx biome check .

# Auto-fix lint issues and format
npx biome check --apply .

# Format only
npx biome format --write .

# Lint only
npx biome lint .

# Check a single file
npx biome check src/app.ts

# CI mode (no writes, exit 1 on issues)
npx biome ci .
```

## package.json Scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write .",
    "ci:lint": "biome ci ."
  }
}
```

## GitHub Actions

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  biome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: biomejs/setup-biome@v2
        with:
          version: latest
      - run: biome ci .
```

## Migrating from ESLint + Prettier

```bash
# Biome provides an automated migration tool
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write

# This reads your existing .eslintrc + .prettierrc
# and generates equivalent biome.json rules
```

After migration:

```bash
# Remove old tools
npm uninstall eslint prettier eslint-config-prettier \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-react

# Remove old configs
rm .eslintrc.js .eslintignore .prettierrc .prettierignore
```

## Biome vs ESLint + Prettier

| | Biome | ESLint + Prettier |
|--|-------|------------------|
| Speed | ~25x faster | Baseline |
| Config files | 1 (`biome.json`) | 2+ configs + ignore files |
| Dependencies | 1 package | 10+ packages |
| Custom plugins | No | Rich ecosystem |
| Rule count | 200+ (growing) | Unlimited via plugins |
| Prettier compat | 97%+ | 100% |
| TypeScript rules | Built-in | Via `@typescript-eslint` |

Biome is the right choice for most greenfield TypeScript projects. Stick with ESLint if you depend on specific plugins (custom rules, framework-specific rules not yet in Biome).

## Concrete Use Case: Migrating a 500-File TypeScript Monorepo from ESLint + Prettier to Biome

A platform engineering team maintained a TypeScript monorepo with 12 packages and over 500 source files. Their CI pipeline ran ESLint and Prettier as separate steps, and the lint-plus-format check took 4 minutes and 20 seconds on every pull request. The ESLint configuration alone spanned three config files with 15 plugins (`@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, and others), and dependency conflicts between plugin versions had become a recurring maintenance burden — the last `@typescript-eslint` upgrade broke two other plugins and took a full day to resolve. The team decided to migrate to Biome to consolidate tooling, reduce dependencies, and cut CI time.

The migration started with Biome's built-in migration commands: `npx @biomejs/biome migrate eslint --write` read the existing `.eslintrc.js` across all packages and generated equivalent rules in a root `biome.json`. The team then ran `npx @biomejs/biome migrate prettier --write` to port the Prettier configuration (single quotes, trailing commas, 100-character line width). After reviewing the generated config, they ran `npx biome check --apply .` across the entire monorepo to auto-fix formatting differences. The resulting diff was large (Biome's formatter has minor whitespace differences from Prettier in edge cases), so they committed it as a single "chore: migrate to biome formatting" commit to keep `git blame` clean with a `.git-blame-ignore-revs` entry.

The results were immediate: `biome ci .` completed the full monorepo lint and format check in 10 seconds — down from 4 minutes 20 seconds, a 26x improvement. The `package.json` `devDependencies` shrank from 22 lint-related packages to one (`@biomejs/biome`). The team removed `.eslintrc.js`, `.eslintignore`, `.prettierrc`, and `.prettierignore` across all 12 packages. Two ESLint plugins had no Biome equivalent (`eslint-plugin-jsx-a11y` and a custom internal plugin), so the team kept those as a separate `eslint` step that runs only on changed files — but this takes under 5 seconds since it no longer handles formatting or TypeScript type-aware rules. CI feedback loops dropped from "push and wait 5 minutes" to "push and get results in under 30 seconds," which noticeably improved developer velocity across the team.

## When to Use Biome

**Use Biome when:**
- You want to replace both ESLint and Prettier with a single tool and a single configuration file, eliminating plugin version conflicts and config drift
- CI speed matters to your team and you need lint and format checks to complete in seconds rather than minutes, especially in monorepos with hundreds of files
- You are starting a new TypeScript or JavaScript project and want sensible defaults without configuring a dozen ESLint plugins
- You want auto-fixable lint rules and formatting applied in a single `biome check --apply` command rather than running two separate tools
- Your team values minimal dependencies — Biome is a single Rust binary with zero transitive JavaScript dependencies

**When NOT to use Biome:**
- You depend on specific ESLint plugins that have no Biome equivalent (e.g., `eslint-plugin-jsx-a11y`, `eslint-plugin-tailwindcss`, or custom internal plugins with complex AST rules)
- You need 100% Prettier formatting compatibility — Biome is 97%+ compatible, but the remaining edge cases in whitespace and line-breaking decisions may cause churn if your team has strict formatting requirements
- You are working in a language Biome does not yet support — as of 2026, Biome covers JavaScript, TypeScript, JSX, TSX, JSON, and CSS, but not Python, Go, or other languages
- Your organization has invested heavily in a custom ESLint rule set with dozens of project-specific rules that would need to be rewritten as Biome analyzer rules
