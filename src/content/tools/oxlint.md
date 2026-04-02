---
title: "Oxlint"
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
