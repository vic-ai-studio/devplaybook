---
title: "Biome vs ESLint vs Prettier: Zero-Config JavaScript Tooling in 2026"
description: "A comprehensive 2026 comparison of Biome, ESLint, and Prettier — covering setup complexity, performance benchmarks, rule coverage, IDE integration, and a complete migration guide from ESLint+Prettier to Biome."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["biome", "eslint", "prettier", "javascript", "typescript", "tooling", "linting", "formatting"]
readingTime: "12 min read"
draft: false
---

JavaScript tooling has a complexity problem. The classic setup — ESLint for linting, Prettier for formatting, plus config files for each — routinely requires dozens of npm packages, sprawling config files, and painful version conflicts. For years, this was simply the cost of entry.

In 2026, **Biome** offers a compelling alternative: a single tool, written in Rust, that handles both linting and formatting at speeds that make ESLint look like it's running in slow motion. This guide gives you the full comparison so you can make an informed choice.

---

## The Three Tools Explained

**ESLint** is the gold standard JavaScript linter. Created in 2013, it has thousands of rules, an enormous plugin ecosystem, and virtually universal adoption. ESLint 9 introduced a flat config system that simplified configuration significantly.

**Prettier** is an opinionated code formatter. It takes your code and reprints it according to a fixed style — no debates, no configuration bikeshedding. It works by parsing your code into an AST and reprinting it from scratch.

**Biome** (formerly Rome) is a unified toolchain for JavaScript/TypeScript built in Rust. It handles both formatting and linting in a single binary. No plugins, no peer dependencies, just one tool.

---

## Setup Complexity

This is where the difference is most stark.

### ESLint + Prettier Setup (Classic)

```bash
npm install --save-dev eslint prettier \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-config-prettier eslint-plugin-prettier \
  eslint-plugin-import eslint-plugin-react \
  eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

That is 10+ packages before you have written a single line of config. Then:

```javascript
// eslint.config.js (flat config - ESLint 9)
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Total: 2 config files, 10+ dev dependencies, and you still need to configure your editor to use both tools separately.

### Biome Setup

```bash
npm install --save-dev @biomejs/biome
npx biome init
```

That is it. The `biome init` command creates:

```json
// biome.json
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
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "es5"
    }
  }
}
```

One file, zero peer dependencies, handles both linting and formatting.

---

## Performance Benchmarks

Biome's Rust foundation makes a dramatic difference at scale.

**Benchmark: Lint + format a large TypeScript monorepo (500 files, ~100k lines)**

```
ESLint (with TypeScript plugin):
  Lint only:           ~18.4s
  With type-aware rules: ~34.2s (requires TSC)

Prettier:
  Format 500 files:    ~4.1s

ESLint + Prettier combined: ~22.5s

Biome (lint + format):
  Same 500 files:      ~0.8s
```

| Tool | Time (500 TS files) |
|------|-------------------|
| ESLint only | 18.4s |
| Prettier only | 4.1s |
| ESLint + Prettier | 22.5s |
| Biome (lint + format) | 0.8s |

**Biome is ~28x faster than ESLint+Prettier on this benchmark.**

This gap matters most in CI/CD pipelines and pre-commit hooks. A lint step that takes 20 seconds on every commit slows your entire team's workflow.

**Single-file performance (typical for editor integrations):**

```
ESLint on save:    ~80-200ms (varies by rule count)
Prettier on save:  ~50-150ms
Biome on save:     ~5-20ms
```

The editor experience with Biome is noticeably snappier.

---

## Rule Coverage

ESLint has a 10-year head start in rule coverage. Here is the honest state in 2026:

**ESLint rule coverage:**
- 300+ core rules
- 1,000+ rules via @typescript-eslint
- Thousands more via plugins (import, jsx-a11y, react, react-hooks, unicorn, sonarjs...)
- Plugin ecosystem is unmatched

**Biome rule coverage (as of 2026):**
- 250+ implemented rules from ESLint core
- Strong TypeScript-aware rules without plugin configuration
- React hooks rules built-in
- Accessibility rules built-in (a11y)
- Security rules built-in
- Import organization built-in (replaces eslint-plugin-import)

**Rules Biome supports that ESLint needs plugins for:**
- Import sorting/organization (no plugin needed)
- React hooks exhaustive-deps
- No unused imports (stricter than ESLint's no-unused-vars)
- Prefer optional chaining
- No floating promises
- Complexity metrics

**Rules only ESLint supports (with plugins):**
- Highly domain-specific rules (GraphQL, Storybook, Jest, Cypress, etc.)
- Custom rules for your codebase's specific patterns
- Some advanced TypeScript project-reference rules

For a typical TypeScript React or Node.js project, Biome's built-in rules cover the vast majority of what teams actually enable.

---

## Formatting Comparison

### Prettier Philosophy

Prettier reprints your entire code from scratch. It is intentionally opinionated — very few configuration options. The idea: once you adopt Prettier, formatting debates end entirely.

```javascript
// Before Prettier
const obj = {foo: 'bar', baz: 'qux', quux: 'corge', grault: 'garply', waldo: 'fred', plugh: 'xyzzy'};

// After Prettier (with printWidth: 80)
const obj = {
  foo: 'bar',
  baz: 'qux',
  quux: 'corge',
  grault: 'garply',
  waldo: 'fred',
  plugh: 'xyzzy',
};
```

### Biome Formatter Philosophy

Biome's formatter is Prettier-compatible — it produces nearly identical output for the same configuration. The goal was to replace Prettier, not to invent a new style.

```json
// biome.json - Prettier-compatible config
{
  "formatter": {
    "printWidth": 80,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  }
}
```

Biome's formatter passes ~96% of Prettier's test suite. The differences are in edge cases that most teams never encounter.

---

## IDE Integration

### VS Code

**ESLint + Prettier:**
- ESLint extension (separate)
- Prettier extension (separate)
- Configure format-on-save to use Prettier
- Configure ESLint to run on save

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

**Biome:**
- One Biome extension
- One config entry

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

### JetBrains IDEs (IntelliJ, WebStorm)

Both ESLint and Biome have official JetBrains plugins. Biome's plugin integrates format-on-save similarly to Prettier's built-in support.

### Neovim / LSP

Biome ships a full Language Server Protocol (LSP) implementation. Configure it like any LSP:

```lua
-- nvim-lspconfig
require('lspconfig').biome.setup({
  root_dir = require('lspconfig.util').root_pattern('biome.json'),
})
```

---

## When to Choose Each Tool

### Choose Biome if:

- You are starting a new TypeScript/JavaScript project
- Your team spends time debugging ESLint config conflicts
- CI lint times are a pain point
- You want one tool and one config file
- Your rule requirements are covered by Biome's built-in rules (check the compatibility table)

### Choose ESLint + Prettier if:

- You need highly specific plugin rules (Jest, Storybook, GraphQL schemas, etc.)
- You have custom rules written for your codebase
- Your team has an existing ESLint config you do not want to migrate
- You need rules from plugins that Biome has not yet implemented
- You use tools that require ESLint integration

### Use Both (Hybrid Approach)

Some teams run Biome for fast formatting and basic linting, plus ESLint for domain-specific rules:

```json
// package.json
{
  "scripts": {
    "lint": "biome check . && eslint . --ext .ts,.tsx",
    "format": "biome format --write ."
  }
}
```

This gives you Biome's speed for formatting and basic lint, while keeping specialized ESLint plugins.

---

## Migration Guide: ESLint + Prettier to Biome

### Step 1: Install Biome

```bash
npm install --save-dev @biomejs/biome
npx biome init
```

### Step 2: Map Your ESLint Rules

Biome provides a migration command:

```bash
npx @biomejs/biome migrate eslint --write
```

This reads your ESLint config and generates the equivalent `biome.json`. Rules without a Biome equivalent are listed so you can decide whether to keep ESLint for those rules.

### Step 3: Map Your Prettier Config

```bash
npx @biomejs/biome migrate prettier --write
```

This reads `.prettierrc` and maps settings to `biome.json` formatter options.

### Step 4: Update Scripts

```json
// package.json - before
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write ."
  }
}

// package.json - after
{
  "scripts": {
    "lint": "biome lint --write .",
    "format": "biome format --write .",
    "check": "biome check --write ."
  }
}
```

`biome check` runs both linting and formatting in one pass — use this in CI.

### Step 5: Update CI

```yaml
# .github/workflows/ci.yml - before
- name: Lint
  run: npx eslint . --ext .ts,.tsx
- name: Format check
  run: npx prettier --check .

# .github/workflows/ci.yml - after
- name: Biome check
  run: npx @biomejs/biome ci .
```

`biome ci` is like `biome check` but exits with a non-zero code on any issue (no auto-fix).

### Step 6: Clean Up

```bash
npm uninstall eslint prettier \
  @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-config-prettier eslint-plugin-prettier \
  eslint-plugin-import eslint-plugin-react \
  eslint-plugin-react-hooks eslint-plugin-jsx-a11y

rm .eslintrc.* .prettierrc .prettierignore
```

---

## Feature Comparison Summary

| Feature | ESLint | Prettier | Biome |
|---------|--------|----------|-------|
| Linting | Full | None | Full (250+ rules) |
| Formatting | Via plugin | Full | Full (Prettier-compatible) |
| TypeScript | Via plugin | Native | Native |
| JSX/React | Via plugin | Native | Native |
| Import sorting | Via plugin | None | Built-in |
| Speed | Slow | Medium | Very fast (Rust) |
| Config complexity | High | Low | Low |
| Plugin ecosystem | Massive | Limited | None (all built-in) |
| Custom rules | Yes | No | Not yet |
| LSP server | Yes | Yes | Yes |
| Migration tools | N/A | N/A | ESLint + Prettier migrators |

---

## Conclusion

In 2026, Biome is the right default for new JavaScript and TypeScript projects. The performance advantage is real (25-30x faster), the configuration is dramatically simpler, and the rule coverage handles the vast majority of what teams actually need.

ESLint remains the better choice when you need its plugin ecosystem — particularly for domain-specific rules around testing frameworks, UI component libraries, or custom codebase rules. ESLint's 10-year head start in the rules space is not something Biome can replicate overnight.

The pragmatic path: try Biome first. Use the migration command to see what rules you would lose. If the gap is small, migrate. If you depend on critical ESLint plugins, keep ESLint for those rules while using Biome for formatting.

The direction of the ecosystem is clear — fast, unified, zero-config tooling wins long-term.

---

*Benchmarks run on a 2026 MacBook Pro M4, Node.js 22, Biome 1.9.x, ESLint 9.x, Prettier 3.x.*
