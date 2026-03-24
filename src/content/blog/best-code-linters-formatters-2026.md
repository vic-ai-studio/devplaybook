---
title: "Best Code Linters and Formatters in 2026: The Practical Guide"
description: "A hands-on guide to code linters and formatters in 2026. Covers Biome, ESLint, Prettier, Ruff, golangci-lint, and more — with real configuration examples and CI integration patterns."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["linters", "formatters", "biome", "eslint", "prettier", "ruff", "code-quality", "developer-tools"]
readingTime: "12 min read"
---

Code quality tooling has consolidated significantly in the past two years. The most important development: **Biome** has emerged as a serious challenger to the ESLint + Prettier dual-tool setup, and **Ruff** has essentially replaced most Python linting tools entirely. The tooling landscape in 2026 is faster, more opinionated, and considerably more integrated than it was even 18 months ago.

This guide cuts through the noise: which linters and formatters to use for each language, how to configure them effectively, and how to wire them into your CI pipeline.

---

## Why Both Linting and Formatting Matter

**Formatting** eliminates style debates. Tabs vs. spaces, semicolons or not, single vs. double quotes — these decisions are made once and enforced automatically. Every PR diff shows only meaningful changes.

**Linting** catches problems formatting can't. Unused variables, suspicious type coercions, missing await, potential null pointer accesses — these are bugs, not style preferences. A linter surfaces them before code review.

Together, they remove two entire categories of feedback from code reviews so reviewers can focus on logic, architecture, and correctness.

---

## JavaScript / TypeScript

### Biome: The New Unified Option

[Biome](https://biomejs.dev) is the most significant development in the JS/TS tooling space in years. It's a single tool that handles both formatting (replacing Prettier) and linting (replacing ESLint) — written in Rust, which makes it dramatically faster than both.

**Why Biome is worth considering in 2026:**
- 10-100x faster than ESLint + Prettier combined
- Single dependency instead of two tools + plugins
- Compatible with most Prettier formatting decisions
- Actively maintained with a growing rule set

```bash
# Install
npm install --save-dev --save-exact @biomejs/biome

# Initialize config
npx @biomejs/biome init
```

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.6.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

```bash
# Run
npx @biomejs/biome check --write src/  # lint + format
npx @biomejs/biome format --write src/ # format only
npx @biomejs/biome lint src/           # lint only
```

**When to stick with ESLint + Prettier:** If you rely on ESLint plugins that Biome doesn't replicate (complex custom rules, tailwind-class-order, etc.) or if you need Prettier's exact formatting behavior for legacy codebases. Otherwise, the migration to Biome is generally worth it.

---

### ESLint: Still the Standard for Complex Rules

ESLint remains the most configurable JavaScript linter with the largest ecosystem of plugins. For TypeScript, `@typescript-eslint` is the industry standard.

```bash
# Modern flat config setup (ESLint 9+)
npm install --save-dev eslint @eslint/js typescript-eslint
```

```javascript
// eslint.config.js (flat config)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  }
);
```

**Must-have ESLint plugins for TypeScript projects:**
- `@typescript-eslint/eslint-plugin` — TypeScript-aware rules
- `eslint-plugin-import` — module import order and validation
- `eslint-plugin-react` — React-specific rules (if applicable)
- `eslint-plugin-jsx-a11y` — accessibility checks

---

### Prettier: The Formatting Standard

Prettier is still the most popular formatter for JS/TS. If you're not using Biome, use Prettier.

```bash
npm install --save-dev --save-exact prettier
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

```json
// package.json scripts
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

**Tip:** Run ESLint and Prettier independently rather than combining them with `eslint-plugin-prettier`. The combined approach slows ESLint down and conflates two different concerns.

---

## Python

### Ruff: The Clear Winner

[Ruff](https://docs.astral.sh/ruff/) has essentially consolidated Python linting. Written in Rust, it's 10-100x faster than flake8, supports most pyflakes, pycodestyle, isort, pydocstyle, and hundreds of other rules, and includes a formatter that matches Black's output.

```bash
pip install ruff
# Or with uv (recommended)
uv add --dev ruff
```

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
    "N",   # pep8-naming
]
ignore = ["E501"]  # line length handled by formatter

[tool.ruff.format]
quote-style = "double"
```

```bash
# Commands
ruff check .           # lint
ruff check --fix .     # lint and auto-fix
ruff format .          # format
ruff format --check .  # format check (CI mode)
```

**Migration from existing tools:** Ruff replaces flake8, isort, pyupgrade, and Black in most projects. The format output is intentionally Black-compatible, so diffs are minimal when migrating.

---

### mypy: Type Checking (Not a Linter, But Essential)

Ruff doesn't do type checking. For Python type safety, add mypy or pyright.

```bash
pip install mypy
```

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
```

```bash
mypy src/
```

For larger projects, **pyright** (from Microsoft, powers Pylance in VS Code) is faster and has better inference in many cases.

---

## Go

### gofmt and goimports: Non-Negotiable

Go ships with its own formatter — `gofmt` — and there's no debate about using it. Every Go codebase uses gofmt. It's mandatory.

```bash
# Format
gofmt -w .

# Or use goimports (formats + manages imports)
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .
```

### golangci-lint: The Linter Aggregator

`golangci-lint` runs many Go linters simultaneously with good performance and a unified config format.

```bash
# Install
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

```yaml
# .golangci.yml
linters:
  enable:
    - errcheck      # check for unchecked errors
    - gosimple      # suggest simpler code
    - govet         # report suspicious constructs
    - ineffassign   # detect ineffectual assignments
    - staticcheck   # static analysis
    - unused        # check for unused code
    - gocyclo       # cyclomatic complexity
    - misspell      # spell checker

linters-settings:
  gocyclo:
    min-complexity: 15

issues:
  exclude-rules:
    - path: _test.go
      linters:
        - errcheck
```

```bash
golangci-lint run ./...
```

---

## Rust

### rustfmt and Clippy: Built-In Excellence

Rust has the best built-in tooling of any language. `rustfmt` is the official formatter; `clippy` is the official linter. Both ship with the standard toolchain via `rustup`.

```bash
# Format
cargo fmt

# Lint
cargo clippy -- -D warnings  # treat warnings as errors
```

```toml
# rustfmt.toml
max_width = 100
edition = "2021"
```

For CI, use:
```bash
cargo fmt --check          # fails if formatting is wrong
cargo clippy -- -D warnings  # fails on any warning
```

---

## CSS / SCSS

### Stylelint

```bash
npm install --save-dev stylelint stylelint-config-standard
```

```json
// .stylelintrc.json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "color-no-invalid-hex": true,
    "unit-no-unknown": true,
    "selector-class-pattern": "^[a-z][a-z0-9-]*$"
  }
}
```

For Tailwind CSS projects, add `stylelint-config-tailwindcss` to avoid false positives on Tailwind directives.

---

## CI Integration

### GitHub Actions: Universal Pattern

```yaml
# .github/workflows/lint.yml
name: Lint & Format

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      # Biome (if using)
      - run: npx @biomejs/biome ci .

      # OR ESLint + Prettier (if using)
      # - run: npm run lint
      # - run: npm run format:check

  python-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install ruff mypy
      - run: ruff check .
      - run: ruff format --check .
      - run: mypy src/

  go-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v6
```

---

## Pre-commit Hooks

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["biome check --write --no-errors-on-unmatched"],
    "*.py": ["ruff check --fix", "ruff format"],
    "*.go": ["gofmt -w", "goimports -w"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

---

## Quick Reference: Tool by Language

| Language | Formatter | Linter |
|---|---|---|
| JavaScript/TypeScript | Biome or Prettier | Biome or ESLint |
| Python | Ruff | Ruff + mypy |
| Go | gofmt / goimports | golangci-lint |
| Rust | rustfmt | Clippy |
| CSS/SCSS | Prettier | Stylelint |
| JSON | Prettier or Biome | — |
| Markdown | Prettier | markdownlint |

---

## The 10-Minute Setup for a New JS/TS Project

```bash
# 1. Install Biome
npm install --save-dev --save-exact @biomejs/biome

# 2. Initialize config
npx @biomejs/biome init

# 3. Add package.json scripts
# "check": "biome check ."
# "check:fix": "biome check --write ."

# 4. Install Husky for pre-commit hooks
npm install --save-dev husky lint-staged
npx husky init

# 5. Configure lint-staged in package.json
# "lint-staged": {
#   "*.{ts,tsx,js,jsx,json}": ["biome check --write --no-errors-on-unmatched"]
# }

# 6. Set up pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

That's a complete linting and formatting setup in under 10 minutes that will catch issues on every commit and in CI.

---

## Related DevPlaybook Resources

- **[Code Diff Tool](/tools/diff)** — Compare code changes visually before committing
- **[JSON Formatter](/tools/json-formatter)** — Validate and format JSON configuration files
- **[Prettier vs ESLint Guide](/blog/prettier-vs-eslint)** — Deep dive into when to use each
