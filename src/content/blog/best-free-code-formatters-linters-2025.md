---
title: "Best Free Code Formatters and Linters 2025: The Complete Guide"
description: "A practical guide to the best free code formatters and linters in 2025: Prettier, ESLint, Biome, Black, gofmt, rustfmt — with setup instructions, VS Code integration, pre-commit hooks, and GitHub Actions CI."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: [linters, formatters, prettier, eslint, code-quality, developer-tools]
readingTime: "11 min read"
---

# Best Free Code Formatters and Linters 2025: The Complete Guide

Code formatting is one of those things teams argue about endlessly until they stop arguing about it entirely — because a formatter has taken the decision off the table. Linting is what catches the bugs that a formatter can't see. Together, they're the lowest-effort, highest-ROI investment in code quality a team can make.

This guide covers the best free tools in 2025 across languages, how to configure them, how to integrate them into VS Code and CI, and how to share configs across a team.

---

## Why Formatting and Linting Matter

**Formatting** is about consistency: tabs vs. spaces, single vs. double quotes, trailing commas, line length. None of these choices matter — what matters is that the whole codebase makes the same choice consistently. When every developer's editor formats code differently, every pull request has noise from formatting changes mixed in with actual logic changes.

**Linting** goes further: it catches potential bugs, enforces best practices, and flags patterns that are technically valid but commonly lead to mistakes. A linter won't catch every bug, but it catches the ones that are always wrong — and it does it in milliseconds.

**The compounding benefits:**
- Code reviews focus on logic and design, not whitespace debates
- New team members immediately write code that matches the existing style
- Entire categories of bugs are prevented before code is written
- Git diffs are clean and meaningful
- Onboarding time drops because the codebase is visually uniform

The question isn't whether to use formatters and linters. The question is which ones.

---

## Prettier: The Opinionated Formatter

[Prettier](https://prettier.io) is the dominant code formatter for JavaScript, TypeScript, CSS, HTML, JSON, Markdown, and more. Its defining characteristic is that it's **opinionated** — it has minimal configuration, and it overrides your choices with its own. This is a feature, not a bug. The whole point is to end formatting debates by removing the decision entirely.

### Installation

```bash
npm install --save-dev prettier
```

### Basic Config

Create `.prettierrc` in your project root:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

Create `.prettierignore`:
```
node_modules
dist
build
coverage
*.min.js
```

### Running Prettier

```bash
# Check files without modifying (useful for CI)
npx prettier --check .

# Format all files in place
npx prettier --write .

# Format a specific file
npx prettier --write src/app.js
```

### VS Code Integration

Install the **Prettier - Code formatter** extension (esbenp.prettier-vscode). Then add to your VS Code settings (`settings.json`):

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

With `formatOnSave: true`, every file is formatted the moment you hit save. No manual formatting steps.

---

## ESLint: Catching Bugs Before Runtime

[ESLint](https://eslint.org) is the linting standard for JavaScript and TypeScript. Unlike Prettier, it's not opinionated — it's highly configurable. You choose which rules to enable, what severity level to apply, and which plugins to use.

### Installation and Setup

```bash
npm install --save-dev eslint
npx eslint --init
```

The `--init` wizard walks you through setup and creates your config. For TypeScript support:

```bash
npm install --save-dev @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Modern Flat Config (ESLint v9+)

ESLint v9 introduced a new "flat config" format using `eslint.config.js` (replacing `.eslintrc`). The new format is cleaner and more explicit:

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  }
];
```

### Severity Levels

- `"error"` — fails the lint check, blocks CI
- `"warn"` — shows a warning but doesn't fail
- `"off"` — disables the rule

### Key Plugins Worth Installing

| Plugin | Purpose |
|---|---|
| `eslint-plugin-react` | React-specific rules |
| `eslint-plugin-react-hooks` | Rules of Hooks enforcement |
| `eslint-plugin-jsx-a11y` | Accessibility rules for JSX |
| `eslint-plugin-import` | Import/export validation |
| `eslint-plugin-security` | Catches common security patterns |
| `eslint-plugin-unicorn` | Enforces modern JavaScript best practices |

### Integrating ESLint with Prettier

ESLint and Prettier can conflict — both may have opinions about the same code. The solution is `eslint-config-prettier`, which disables all ESLint rules that might conflict with Prettier:

```bash
npm install --save-dev eslint-config-prettier
```

Add `"prettier"` as the last item in your extends array:

```js
// eslint.config.js
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,  // Must be last — disables conflicting rules
  {
    rules: {
      // Your custom rules here (non-formatting only)
    }
  }
];
```

Rule of thumb: **Prettier handles formatting, ESLint handles code quality.** Don't overlap.

---

## Biome: The All-in-One Newcomer

[Biome](https://biomejs.dev) is the new challenger that combines formatting and linting into a single tool. It's written in Rust, which makes it dramatically faster than both Prettier and ESLint. For large codebases, this matters.

### Why Biome Is Worth Watching

- **Speed**: Biome formats code 25-35x faster than Prettier on large files
- **Single config**: One `biome.json` replaces `.prettierrc` + `.eslintrc`
- **Zero dependencies**: No plugin ecosystem to manage (yet)
- **Opinionated but flexible**: Good defaults, reasonable escape hatches

### Installation

```bash
npm install --save-dev --save-exact @biomejs/biome
npx biome init
```

### Configuration (`biome.json`)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.6.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
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
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```

### Running Biome

```bash
npx biome check .          # Lint + format check (no writes)
npx biome check --apply .  # Lint + format and apply safe fixes
npx biome format --write . # Format only, apply writes
```

**When to use Biome vs. Prettier + ESLint:**
- New project with no existing config: start with Biome
- Existing project with extensive ESLint rules and plugins: stay with Prettier + ESLint
- Large monorepo where lint speed is a pain point: migrate to Biome

Biome doesn't yet have the full plugin ecosystem of ESLint, but it covers the most important rules out of the box.

---

## Language-Specific Tools

### Python: Black + Ruff

**Black** is Python's answer to Prettier — opinionated, fast, and uncompromising. It formats your Python code with almost no configuration.

```bash
pip install black
black .                    # Format all Python files
black --check .            # Check without modifying (CI)
black --diff .             # Show what would change
```

Black's only meaningful config option is line length (default 88):

```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py311']
```

**Ruff** is the linter equivalent — extremely fast (written in Rust), replaces Flake8, isort, and many other Python tools:

```bash
pip install ruff
ruff check .
ruff check --fix .
```

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "UP"]
ignore = ["E501"]
```

### Go: gofmt and golangci-lint

Go ships with `gofmt` built in — no installation required, no configuration. Run it and your code is formatted to the Go standard. There is no debate about Go formatting.

```bash
gofmt -w .                 # Format all .go files in place
gofmt -d .                 # Show diff without modifying
```

For linting, `golangci-lint` aggregates many Go linters into one fast runner:

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
golangci-lint run
```

### Rust: rustfmt and Clippy

Rust ships with both formatters and linters as part of the official toolchain:

```bash
rustup component add rustfmt clippy

cargo fmt              # Format all Rust code
cargo fmt --check      # Check only (CI)
cargo clippy           # Run the Clippy linter
cargo clippy -- -D warnings   # Treat warnings as errors (strict CI)
```

`rustfmt` is configured via `rustfmt.toml`:

```toml
max_width = 100
edition = "2021"
imports_granularity = "Module"
```

---

## CI Integration

### Pre-Commit Hooks

[pre-commit](https://pre-commit.com) runs checks before every `git commit`. If a check fails, the commit is blocked.

```bash
pip install pre-commit
```

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-merge-conflict

  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/biomejs/pre-commit
    rev: v0.1.0
    hooks:
      - id: biome-check
        additional_dependencies: ["@biomejs/biome@1.6.0"]
```

```bash
pre-commit install          # Install hooks (run once per repo)
pre-commit run --all-files  # Run manually on all files
```

### GitHub Actions

```yaml
# .github/workflows/lint.yml
name: Lint and Format Check

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check formatting (Prettier)
        run: npx prettier --check .

      - name: Lint (ESLint)
        run: npx eslint . --max-warnings 0

  lint-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install tools
        run: pip install black ruff

      - name: Check formatting (Black)
        run: black --check .

      - name: Lint (Ruff)
        run: ruff check .
```

---

## Online Formatters

Sometimes you just need to quickly format a snippet without setting up a local tool. DevPlaybook provides free browser-based formatters at [devplaybook.cc](https://devplaybook.cc):

- **JSON Formatter** — validate and pretty-print JSON instantly
- **CSS Minifier** — minify CSS for production
- **Base64 Encoder/Decoder** — encode and decode without a terminal

These tools are useful for one-off formatting tasks, validating API responses, or quickly cleaning up a snippet before pasting it into documentation.

---

## Team Setup Guide: Sharing Configs

### The Problem

Individual developers can have formatters installed, but if everyone's config differs, the formatting still varies. The solution: commit your config files to the repository so everyone uses the same settings.

### Files to Commit

```
.prettierrc             # Prettier config
.prettierignore         # Prettier exclusions
eslint.config.js        # ESLint config
biome.json              # Biome config (if using Biome)
.editorconfig           # Universal editor settings
.pre-commit-config.yaml # Pre-commit hooks
```

### .editorconfig

`.editorconfig` is supported by almost every editor natively and defines basic formatting rules across all languages:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.py]
indent_size = 4

[Makefile]
indent_style = tab
```

### VS Code Workspace Settings

Add a `.vscode/settings.json` file to the repository:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript", "jsx", "tsx"]
}
```

And recommend extensions via `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "biomejs.biome"
  ]
}
```

When a developer opens the project, VS Code prompts them to install the recommended extensions. Combined with committed config files, this means any developer who clones the repo is fully set up in minutes.

### npm Scripts

Add standard lint/format scripts to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "npm run format:check && npm run lint"
  }
}
```

The `check` script runs both format and lint checks — useful in CI pipelines.

---

## Choosing Your Stack in 2025

| Scenario | Recommended Stack |
|---|---|
| New JS/TS project | Biome (all-in-one, fast) |
| Existing JS/TS project | Prettier + ESLint |
| Python project | Black + Ruff |
| Go project | gofmt + golangci-lint |
| Rust project | rustfmt + Clippy |
| Multi-language monorepo | pre-commit with per-language tools |

The most important thing isn't which tool you pick — it's that you **automate it**. A formatter you have to run manually is a formatter you'll forget to run. Hook it into your editor save action and your CI pipeline, and code quality becomes a property of the system, not a personal discipline.
