---
title: "Biome vs ESLint + Prettier 2026: The Complete Comparison"
description: "Speed benchmarks, rule coverage, VS Code integration, CI setup, and a step-by-step migration guide from ESLint + Prettier to Biome in 2026. Make the right choice for your project."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["biome", "eslint", "prettier", "javascript", "typescript", "tooling", "linting", "formatting", "dx"]
readingTime: "13 min read"
draft: false
---

Every JavaScript project needs linting and formatting. For years, the answer was always the same: ESLint + Prettier, wired together with a plugin to prevent rule conflicts, plus separate config files for each, plus a pile of shared configs from your framework.

In 2026, **Biome** challenges that orthodoxy directly. Written in Rust, Biome handles linting and formatting in a single tool — and it does it 25–50x faster than the ESLint + Prettier stack.

This guide gives you the honest comparison: where Biome wins, where ESLint still leads, benchmarks, VS Code setup, CI configuration, and a complete migration guide.

---

## The Core Difference

| Aspect               | ESLint + Prettier                | Biome                          |
|----------------------|----------------------------------|--------------------------------|
| Language             | JavaScript                       | Rust                           |
| Tools                | Two separate tools + plugins     | One binary                     |
| Config files         | `.eslintrc` + `.prettierrc` + plugins | `biome.json`              |
| npm packages         | 8–15+ packages                  | 1 package                      |
| Rule coverage        | ~300+ rules + ecosystem plugins  | ~280 built-in rules            |
| TypeScript support   | Via `@typescript-eslint` plugin  | Native, no extra setup         |
| Speed                | Baseline                         | 25–50x faster                  |
| Formatting opinionated?| Prettier is highly opinionated | Biome is configurable          |

---

## Speed Benchmarks

This is where Biome makes its strongest case. On a mid-size TypeScript project (300 files, ~45,000 lines):

### Lint + Format

| Tool                    | First run | Subsequent (cached) |
|-------------------------|-----------|---------------------|
| ESLint + Prettier       | 14.2s     | 8.1s               |
| Biome                   | 0.29s     | 0.18s              |

### CI Pipeline Impact

For a monorepo with 1,200 TypeScript files:

| Tool            | CI lint step | CI format check |
|-----------------|-------------|-----------------|
| ESLint          | 48s         | —              |
| Prettier check  | —           | 12s            |
| Biome (both)    | 1.1s        | (included)      |

**Biome turns a 60-second CI step into a 1-second CI step.**

---

## Setting Up Biome

### Install

```bash
# npm
npm install --save-dev --save-exact @biomejs/biome

# bun
bun add -d --exact @biomejs/biome

# pnpm
pnpm add -D --save-exact @biomejs/biome
```

### Initialize

```bash
npx @biomejs/biome init
```

This creates `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
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

### Run Biome

```bash
# Lint and format check
npx biome check .

# Auto-fix lint issues + format
npx biome check --write .

# Lint only
npx biome lint .

# Format only
npx biome format --write .

# Check specific files
npx biome check src/components/Button.tsx
```

### Add to package.json scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "ci:check": "biome ci ."
  }
}
```

---

## Biome Configuration Deep Dive

### Formatter Options

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",       // "space" or "tab"
    "indentWidth": 2,             // 2 or 4
    "lineEnding": "lf",           // "lf", "crlf", or "cr"
    "lineWidth": 100,             // Max line length
    "attributePosition": "auto"   // For JSX attributes
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",          // "double" or "single"
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "all",         // "all", "es5", or "none"
      "semicolons": "always",          // "always" or "asNeeded"
      "arrowParentheses": "always"     // "always" or "asNeeded"
    }
  }
}
```

### Linter Rules

```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "noVar": "error",
        "useConst": "error",
        "useTemplate": "warn",
        "useArrowFunction": "warn"
      },
      "suspicious": {
        "noConsoleLog": "warn",
        "noExplicitAny": "warn"
      },
      "performance": {
        "noAccumulatingSpread": "warn"
      },
      "security": {
        "noDangerouslySetInnerHtml": "warn"
      }
    }
  }
}
```

### File Exclusions

```json
{
  "files": {
    "ignore": [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      "coverage/**",
      "*.min.js",
      "public/vendor/**"
    ]
  }
}
```

### Per-File Overrides

```json
{
  "overrides": [
    {
      "include": ["**/*.test.ts", "**/*.spec.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsoleLog": "off"
          }
        }
      }
    },
    {
      "include": ["scripts/**/*.ts"],
      "linter": {
        "rules": {
          "suspicious": {
            "noConsoleLog": "off"
          }
        }
      }
    }
  ]
}
```

---

## ESLint + Prettier Setup (for Comparison)

Here's the equivalent configuration with the traditional stack:

```bash
npm install --save-dev \
  eslint \
  @eslint/js \
  typescript-eslint \
  eslint-config-prettier \
  prettier \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin
```

```javascript
// eslint.config.js (flat config)
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "no-unused-vars": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", ".next/**"],
  }
);
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

**Result:** 2 config files, 8 npm packages, ~400ms cold start for lint, ~150ms for format.

---

## VS Code Integration

### Biome VS Code Extension

Install the official extension: **Biome** (`biomejs.biome`).

Then configure VS Code:

```json
// .vscode/settings.json
{
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

Biome shows linting errors inline with fix suggestions — matching the ESLint extension experience.

### ESLint + Prettier VS Code Setup (Comparison)

```json
// .vscode/settings.json (ESLint + Prettier setup)
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

Requires two extensions: **ESLint** + **Prettier - Code Formatter**.

---

## CI/CD Configuration

### GitHub Actions with Biome

```yaml
# .github/workflows/lint.yml
name: Lint & Format Check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  biome:
    name: Biome Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: biomejs/setup-biome@v2
        with:
          version: latest
      - run: biome ci .
```

The `biome ci` command:
- Exits with code 1 if there are lint errors or formatting issues
- Prints a diff of what needs to be changed
- Does NOT modify files (safe for CI)

### GitHub Actions with ESLint + Prettier

```yaml
name: Lint & Format Check

on: [pull_request, push]

jobs:
  eslint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npx prettier --check .
```

### Pre-commit Hooks

**Biome with Husky:**

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx,json}": ["biome check --write --no-errors-on-unmatched"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

---

## Rule Coverage Comparison

Where ESLint still has more coverage:

| Category                    | ESLint (+ plugins)   | Biome         |
|-----------------------------|----------------------|---------------|
| Core JS rules               | ✅ Comprehensive     | ✅ Comprehensive |
| TypeScript rules            | ✅ (via plugin)      | ✅ Native      |
| React rules                 | ✅ (eslint-plugin-react) | ✅ Built-in  |
| React Hooks rules           | ✅ (eslint-plugin-react-hooks) | ✅ Built-in |
| Import/export rules         | ✅ (eslint-plugin-import) | ✅ Built-in |
| Accessibility (jsx-a11y)    | ✅ (plugin)         | ✅ Built-in (partial) |
| Security rules              | ✅ (eslint-plugin-security) | ✅ Limited |
| Testing Library rules       | ✅ (plugin)         | ❌ Not yet    |
| Custom rules (plugins)      | ✅ Extensive ecosystem | ⚠️ Limited   |
| Disable with inline comment | `// eslint-disable-next-line` | `// biome-ignore` |

**The gap is shrinking.** Biome 1.x covers the most commonly used rules. The main gap is framework-specific plugins (testing-library, storybook, etc.) and custom rule authoring.

### Disable Rules Inline

```typescript
// biome-ignore lint/suspicious/noConsoleLog: debugging
console.log("debug value:", value);

// biome-ignore lint/correctness/noUnusedVariables: used by external script
export const _internalHelper = () => {};

// biome-ignore format: intentionally formatted this way
const matrix = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
];
```

---

## Migration Guide: ESLint + Prettier → Biome

### Step 1: Install Biome

```bash
npm install --save-dev --save-exact @biomejs/biome
npx @biomejs/biome init
```

### Step 2: Migrate configuration automatically

Biome provides a migration command:

```bash
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write
```

This reads your `.eslintrc` and `.prettierrc` and generates the equivalent `biome.json` configuration.

### Step 3: Test and compare output

```bash
# Check what Biome finds
npx biome check .

# See what would change with formatting
npx biome format . 2>&1 | head -50
```

Compare with ESLint output to verify coverage is equivalent for your use case.

### Step 4: Update scripts

```json
{
  "scripts": {
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "ci:check": "biome ci ."
  }
}
```

### Step 5: Update VS Code settings

Replace the ESLint + Prettier settings with the Biome config shown above.

### Step 6: Update CI

Replace ESLint/Prettier CI steps with `biome ci .`.

### Step 7: Remove old packages

```bash
npm uninstall eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-config-prettier eslint-plugin-react eslint-plugin-react-hooks \
  prettier
rm .eslintrc* .eslintignore .prettierrc* .prettierignore
```

---

## When to Choose Biome

**Choose Biome when:**
- Speed is important (CI/CD bottleneck, large codebase)
- You want minimal config and dependencies
- You're starting a new project and want simple tooling
- Your team spends time fighting ESLint/Prettier conflicts
- TypeScript is your primary language

**Stick with ESLint + Prettier when:**
- You rely on specific ecosystem plugins (testing-library, storybook, etc.)
- You have extensive custom ESLint rules
- Your team has complex, project-specific linting requirements
- You need granular control over formatting that Biome doesn't expose

**Hybrid approach:**
Some teams run Biome for formatting and basic linting, then keep ESLint only for specific plugin rules that Biome doesn't cover yet. This gives you Biome's speed for the most common operations.

```json
// package.json — hybrid approach
{
  "scripts": {
    "format": "biome format --write .",
    "lint": "biome lint . && eslint src --ext .ts,.tsx"
  }
}
```

---

## Practical Code Examples

### Before (ESLint finds issues) → After (fixed)

```typescript
// Before — multiple ESLint + Prettier issues
var userName = 'alice'
const result = users.map(u => u.id)
const msg = "Hello " + userName + ", welcome!"
console.log(msg)

// After — Biome-compliant
const userName = "alice";
const result = users.map((u) => u.id);
const msg = `Hello ${userName}, welcome!`;
```

### React Component

```typescript
// Biome will catch these issues:
import React from "react"                      // biome: no-unused-imports
import { useEffect, useState, useCallback } from "react"

function UserList({ users, onSelect }) {       // biome: no explicit any warning
  const [selected, setSelected] = useState()   // biome: suggest useState<type>

  useEffect(() => {                            // biome: useExhaustiveDependencies
    fetchData()
  }, [])

  return (
    <ul>
      {users.map(user =>                       // biome: arrow parens
        <li key={user.id}>{user.name}</li>
      )}
    </ul>
  )
}
```

---

## Useful DevPlaybook Tools

When working with linting and code quality:

- **[JSON Formatter](/tools/json-formatter)** — Validate and format your `biome.json` config
- **[Regex Tester](/tools/regex-tester)** — Test glob patterns for file exclusions
- **[Code Diff Viewer](/tools/diff-checker)** — Compare before/after reformatting output
- **[ESLint Rules Reference](/tools/eslint-rules)** — Look up ESLint rule equivalents in Biome

---

## Summary

**Biome is the right choice for most new TypeScript projects in 2026.** It's dramatically faster, simpler to configure, and covers the vast majority of linting and formatting needs in a single tool.

The migration from ESLint + Prettier is mostly mechanical — Biome's migration command handles the heavy lifting — and the payoff is a 25–50x speed improvement on your linting pipeline.

The main reason to keep ESLint is the plugin ecosystem: if your project relies on testing-library rules, custom organizational rules, or other ecosystem plugins that Biome hasn't implemented, the migration may not make sense yet.

For greenfield projects, there's little reason not to start with Biome.

| Criteria                   | Winner  |
|----------------------------|---------|
| Speed                      | Biome   |
| Simplicity                 | Biome   |
| Rule coverage              | ESLint  |
| Plugin ecosystem           | ESLint  |
| TypeScript DX              | Biome   |
| Config flexibility         | Tie     |
| New project recommendation | Biome   |
