---
title: "Biome: Replace ESLint + Prettier with One Lightning-Fast Tool (2026)"
description: "Biome unifies linting and formatting into one blazing-fast tool. Learn how to set up Biome, migrate from ESLint + Prettier, integrate with CI, and use the VS Code extension."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["biome", "eslint", "prettier", "linting", "formatting", "javascript", "typescript", "tooling"]
readingTime: "11 min read"
---

Every JavaScript project eventually accumulates the same set of dev dependencies: ESLint for linting, Prettier for formatting, a pile of ESLint plugins, a shared config package, and a `lint-staged` setup that takes 10 seconds to run on pre-commit. It works. It's also slow, complex, and requires constant maintenance.

Biome offers a different approach: one tool, one config file, sub-millisecond performance, and zero plugin dependencies. In 2026, it's stable enough to replace ESLint + Prettier entirely in most TypeScript and JavaScript projects.

---

## What Is Biome?

Biome (formerly Rome) is a high-performance toolchain for JavaScript and TypeScript written in Rust. It provides:

- A **formatter** that produces Prettier-compatible output
- A **linter** with 200+ rules covering correctness, style, and performance
- An **import organizer** that sorts and deduplicates imports
- A **language server** for editor integration (VS Code, Neovim, etc.)

Everything runs in a single binary with no npm dependencies at runtime. A full lint + format pass on a 100,000-line codebase takes under 1 second.

---

## Installation

```bash
# npm
npm install --save-dev --save-exact @biomejs/biome

# pnpm
pnpm add --save-dev --save-exact @biomejs/biome

# yarn
yarn add --dev --exact @biomejs/biome
```

Using `--save-exact` pins the version—Biome treats its output as deterministic, so unexpected upgrades shouldn't change formatting.

Initialize a config file:

```bash
npx @biomejs/biome init
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
  }
}
```

---

## Running Biome

```bash
# Format files
npx biome format --write .

# Lint files
npx biome lint .

# Lint + format in one pass
npx biome check --apply .

# Check without writing (for CI)
npx biome check .
```

The `check` command runs the linter, formatter, and import organizer together—one command does everything.

---

## Configuration Reference

Biome's `biome.json` handles everything that previously required `.eslintrc`, `.prettierrc`, and `.editorconfig`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "attributePosition": "auto"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noVar": "error",
        "useConst": "error",
        "useTemplate": "error"
      },
      "suspicious": {
        "noConsoleLog": "warn",
        "noExplicitAny": "warn"
      },
      "performance": {
        "noAccumulatingSpread": "error"
      }
    }
  },
  "files": {
    "ignore": ["node_modules", "dist", ".next", "coverage"]
  }
}
```

### Formatter Options

| Option | Default | Description |
|--------|---------|-------------|
| `indentStyle` | `"tab"` | `"tab"` or `"space"` |
| `indentWidth` | `2` | Spaces per indent level |
| `lineWidth` | `80` | Max line length |
| `quoteStyle` | `"double"` | `"single"` or `"double"` |
| `trailingCommas` | `"all"` | `"all"`, `"es5"`, `"none"` |
| `semicolons` | `"always"` | `"always"` or `"asNeeded"` |

---

## Linting Rules

Biome ships with 200+ rules organized into categories. The `recommended` preset enables the most useful ones.

### Key rule categories

**Correctness** — catches bugs:
```json
{
  "correctness": {
    "noUnusedVariables": "error",
    "noUnusedImports": "error",
    "useExhaustiveDependencies": "warn",
    "noConstantCondition": "error",
    "noInvalidUseBeforeDeclaration": "error"
  }
}
```

**Style** — enforces patterns:
```json
{
  "style": {
    "noVar": "error",
    "useConst": "error",
    "useTemplate": "error",
    "useShorthandFunctionType": "error",
    "useSingleVarDeclarator": "error"
  }
}
```

**Suspicious** — flags potentially problematic code:
```json
{
  "suspicious": {
    "noExplicitAny": "warn",
    "noDoubleEquals": "error",
    "noConsoleLog": "warn",
    "noArrayIndexKey": "warn"
  }
}
```

**Performance** — prevents common performance anti-patterns:
```json
{
  "performance": {
    "noAccumulatingSpread": "error",
    "noDelete": "warn"
  }
}
```

### Inline rule suppression

```typescript
// biome-ignore lint/suspicious/noExplicitAny: legacy API response
function parseResponse(data: any) {
  return data;
}

// biome-ignore format: intentional alignment
const matrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];
```

---

## Migration from ESLint + Prettier

### Step 1: Remove ESLint and Prettier

```bash
npm uninstall eslint prettier \
  eslint-config-prettier \
  eslint-plugin-prettier \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-import

# Remove config files
rm .eslintrc.js .eslintrc.json .prettierrc .eslintignore .prettierignore
```

### Step 2: Install Biome

```bash
npm install --save-dev --save-exact @biomejs/biome
npx biome init
```

### Step 3: Migrate your ESLint rules

Biome covers most common ESLint rules natively. Use the Biome migration tool:

```bash
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write
```

This reads your existing `.eslintrc` and `.prettierrc` and generates equivalent `biome.json` configuration automatically.

### Step 4: Update package.json scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write ."
  }
}
```

### Step 5: Update lint-staged (if using)

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json}": "biome check --apply --no-errors-on-unmatched"
  }
}
```

---

## CI Integration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx biome ci .
```

`biome ci` is identical to `biome check` but exits with a non-zero code if any issues are found and outputs JSON-compatible logs for CI systems.

---

## VS Code Extension

Install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome).

Configure VS Code to use Biome as the default formatter:

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

The extension supports:
- Format on save
- Inline diagnostics for lint errors
- Quick fixes and auto-fix on save
- Import organization
- Code actions for rule suppression

---

## Performance Comparison

The performance difference between Biome and ESLint + Prettier is significant:

| Task | ESLint + Prettier | Biome |
|------|------------------|-------|
| Lint 1,000 files | ~8s | ~0.2s |
| Format 1,000 files | ~5s | ~0.15s |
| Full check pass | ~13s | ~0.3s |
| Pre-commit hook (staged files) | 2–5s | <100ms |
| CI lint job | 30–60s | 3–8s |

Biome's Rust implementation processes files in parallel without spawning Node processes, which accounts for most of the speedup.

---

## What Biome Doesn't Replace

Biome is not a complete replacement for every ESLint use case:

**Still needs ESLint (or alternatives):**
- Framework-specific rules (Next.js, Astro, SvelteKit)
- Accessibility rules (`eslint-plugin-jsx-a11y`)
- Complex custom rules written in JavaScript
- Storybook-specific linting

**Biome's current gaps:**
- No support for `.vue` files (use ESLint for Vue projects)
- No CSS/SCSS linting (use Stylelint)
- No GraphQL linting
- Some TypeScript-specific ESLint rules aren't ported yet

For most TypeScript/React/Next.js projects, these gaps won't matter. For projects with heavy accessibility requirements, consider running both Biome (for performance) and `eslint-plugin-jsx-a11y` (for a11y rules).

---

## Real-World Example: Next.js Project

Complete setup for a Next.js 14 project:

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "useExhaustiveDependencies": "warn",
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      }
    }
  },
  "files": {
    "ignore": [
      ".next",
      "node_modules",
      "public",
      "*.config.js",
      "*.config.ts"
    ]
  }
}
```

```json
// package.json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4"
  }
}
```

---

## Summary

Biome is the best choice for most TypeScript and JavaScript projects in 2026:

- **Faster**: 10-50x faster than ESLint + Prettier
- **Simpler**: One tool, one config, zero plugin dependencies
- **Comprehensive**: Linting, formatting, import organization in one pass
- **Compatible**: Prettier-compatible formatting, supports most ESLint rules
- **Editor support**: First-class VS Code extension with format-on-save

The migration from ESLint + Prettier takes under an hour with `biome migrate`. The performance gain in local development and CI is immediate.

Use Biome as your primary tool. If you need framework-specific rules that Biome doesn't cover, keep a minimal ESLint config for just those rules.

Check out the [Biome documentation](https://biomejs.dev/) and explore related tools in the [DevPlaybook toolbox](/tools).
