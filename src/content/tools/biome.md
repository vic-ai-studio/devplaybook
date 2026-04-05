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
