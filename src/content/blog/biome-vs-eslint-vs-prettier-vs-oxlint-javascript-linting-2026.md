---
title: "Biome vs ESLint vs Prettier vs oxlint: JavaScript Linting & Formatting 2026"
description: "Compare Biome, ESLint, Prettier, and oxlint for JavaScript/TypeScript linting and formatting. Speed benchmarks, config complexity, ecosystem support, and migration guide."
author: "DevPlaybook Team"
date: "2026-03-27"
readingTime: "9 min read"
tags: ["javascript", "linting", "biome", "eslint", "prettier", "tools"]
---

JavaScript tooling has quietly undergone a revolution. For years, the standard answer to "how do I lint my project?" was "ESLint + Prettier, configure them not to fight each other, add a few plugins, and good luck." That setup works — but it's slow, complex, and fragile.

In 2026, you have better options. **Biome** and **oxlint** are Rust-based tools that can replace large parts of your linting stack and run 10–100x faster. But "faster" isn't always the whole story. ESLint's plugin ecosystem is unmatched, and Prettier remains the most battle-tested formatter for teams.

This guide breaks down all four tools: what they do, where they excel, and how to decide which combination is right for your project.

---

## The Four Contenders at a Glance

| Tool | Language | Role | First Release |
|------|----------|------|---------------|
| **ESLint** | JavaScript | Linter (logic + style) | 2013 |
| **Prettier** | JavaScript | Formatter only | 2017 |
| **Biome** | Rust | Linter + Formatter (all-in-one) | 2023 |
| **oxlint** | Rust | Linter (ESLint-compatible) | 2023 |

---

## ESLint: The Ecosystem King

ESLint is the most widely used JavaScript linter in the world — and for good reason. It analyzes your code statically, flags logical bugs, enforces conventions, and can auto-fix many issues.

```js
// ESLint catches this: variable used before declaration
console.log(name);
var name = "Alice";

// ESLint catches this: useless return value
const arr = [1, 2, 3];
arr.forEach(item => {
  return item * 2; // no effect in forEach
});
```

The real power of ESLint is its **plugin ecosystem**. Plugins exist for React, Vue, Angular, TypeScript, accessibility, security, testing libraries, import sorting, performance, and more. When you adopt ESLint, you're adopting that entire ecosystem.

**ESLint strengths:**
- Unmatched plugin ecosystem (thousands of rules)
- Deep TypeScript integration via `@typescript-eslint`
- Custom rule authoring
- Fine-grained per-rule configuration
- Well-understood by all JS/TS developers

**ESLint weaknesses:**
- Slow on large codebases (JavaScript runtime)
- Config complexity — flat config (v9) is better but still verbose
- Requires Prettier to handle formatting (or careful rule overlap avoidance)
- Cold start time can be painful in pre-commit hooks

### ESLint Performance Reality

On a typical monorepo with 300k+ lines of TypeScript, ESLint can take 45–90 seconds. With caching (`--cache`), repeat runs drop to 5–15 seconds. Still not fast enough for tight feedback loops.

---

## Prettier: The Formatting Standard

Prettier is opinionated by design. It reformats your code with almost no configuration options — and that's the point. You stop arguing about formatting and just let the tool decide.

```js
// Input (inconsistent formatting)
const obj = {foo: "bar",   baz: 42,
  qux:   true}

// Prettier output (consistent)
const obj = {
  foo: "bar",
  baz: 42,
  qux: true,
};
```

Prettier doesn't lint — it only formats. It doesn't care whether your variable is unused or whether you have a potential null dereference. It just makes code look consistent.

**Prettier strengths:**
- Zero-debate formatting for teams
- Supports JS, TS, CSS, HTML, JSON, Markdown, and more
- Excellent editor integration
- Mature and stable

**Prettier weaknesses:**
- Formatting-only (must be paired with a linter)
- Performance has improved but still slower than Rust tools
- Opinionated — if you dislike its style choices, you can't do much
- Requires coordination with ESLint to avoid rule conflicts (use `eslint-config-prettier`)

---

## Biome: The All-in-One Rust Challenger

[Biome](https://biomejs.dev) started as Rome (created by ex-Babel maintainer Sebastian McKenzie) and was restarted under new maintainership in late 2023. It's a **single Rust binary** that handles linting, formatting, and import organization.

```bash
# Install
npm install --save-dev @biomejs/biome

# Format + lint
npx biome check --write .
```

Biome's configuration is a single JSON file:

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
    "indentWidth": 2
  }
}
```

One config file. One tool. No plugin conflicts.

### Biome Speed Benchmarks

Biome's official benchmarks on the `rome` repository (450k lines):

| Tool | Time |
|------|------|
| ESLint | ~25s |
| Prettier | ~10s |
| Biome (lint + format) | ~0.2s |

Real-world results vary, but a **50–100x speedup** over ESLint is common on large codebases. Even on small projects, you feel the difference in pre-commit hooks.

**Biome strengths:**
- Blazing fast (Rust, single binary)
- Replaces both ESLint and Prettier
- Simple single-file configuration
- Growing rule set (~300 rules as of early 2026)
- Excellent TypeScript support out of the box
- Built-in import organization

**Biome weaknesses:**
- Limited plugin ecosystem (no community plugins yet)
- Doesn't support some ESLint plugins (React hooks rules, etc.)
- Formatting opinions differ from Prettier in some edge cases
- Not all ESLint rules are implemented

### When Biome Makes Sense

Biome is ideal for **greenfield projects** where you control the full stack and don't depend heavily on ESLint plugins. TypeScript projects with standard patterns work particularly well.

---

## oxlint: The Drop-in ESLint Replacement

[oxlint](https://oxc.rs/docs/guide/usage/linter) is part of the **Oxidation Compiler (OXC)** project — a suite of Rust-based JavaScript tools. Its goal is to be a drop-in, ESLint-compatible linter that requires zero configuration to run against existing ESLint rules.

```bash
# Install
npm install --save-dev oxlint

# Run (reads your ESLint config automatically)
npx oxlint .
```

oxlint doesn't replace ESLint entirely — it's designed to **run alongside ESLint**. The recommended workflow is:

1. Run oxlint first (fast, catches the obvious stuff)
2. Run ESLint for rules oxlint doesn't implement yet

This hybrid approach gives you speed for the common cases and full ecosystem coverage for the edge cases.

### oxlint Speed Benchmarks

On large codebases, oxlint typically runs **50–100x faster** than ESLint:

| Codebase | ESLint | oxlint |
|----------|--------|--------|
| 1,000 files (TS) | ~12s | ~0.3s |
| 5,000 files (TS) | ~60s | ~0.8s |
| 10,000 files | ~120s+ | ~1.5s |

**oxlint strengths:**
- Extreme speed (Rust)
- ESLint-compatible — reads existing config
- Drop-in: no config changes needed to try it
- ~500 rules implemented (including popular plugins)
- Can run in parallel with ESLint for gradual migration

**oxlint weaknesses:**
- Formatting: not included (still need Prettier or Biome formatter)
- Not a full ESLint replacement yet
- Some rules behave slightly differently
- Less opinionated than Biome (requires you to still configure things)

---

## Speed Comparison Summary

Benchmark on a 200k-line TypeScript project (lint only, no format):

| Tool | Cold Run | Warm Run (cache) |
|------|----------|-----------------|
| ESLint v9 | ~45s | ~8s |
| oxlint | ~0.5s | ~0.5s |
| Biome (lint only) | ~0.3s | ~0.3s |

For formatting (200k lines):

| Tool | Time |
|------|------|
| Prettier | ~8s |
| Biome (format only) | ~0.2s |

---

## Config Complexity Comparison

| Tool | Config Files | Plugin Setup | Learning Curve |
|------|-------------|--------------|----------------|
| ESLint v9 | `eslint.config.js` (flat) | Manual plugin install + extend | Medium–High |
| Prettier | `.prettierrc` | None needed | Low |
| Biome | `biome.json` | None | Low |
| oxlint | None (reads ESLint) | Inherits from ESLint | Very Low |

ESLint's flat config (v9+) is a significant improvement over the old `.eslintrc` system, but it's still the most complex to configure — especially when adding TypeScript, React, and import plugins.

Biome is the simplest fresh start. oxlint has the easiest migration path.

---

## Ecosystem and Plugin Support

| Feature | ESLint | Prettier | Biome | oxlint |
|---------|--------|----------|-------|--------|
| React hooks rules | ✅ | N/A | ✅ (built-in) | ✅ (built-in) |
| TypeScript-aware lint | ✅ | N/A | ✅ | ✅ |
| Import sorting | Via plugin | N/A | ✅ | Partial |
| Accessibility (jsx-a11y) | ✅ | N/A | ✅ (built-in) | ✅ (partial) |
| Security rules | Via plugin | N/A | Limited | Limited |
| Vue / Angular support | ✅ | ✅ | Limited | No |
| CSS / SCSS formatting | Via stylelint | ✅ | ✅ | No |
| Custom rules | ✅ | No | No (yet) | No (yet) |
| Monorepo config sharing | ✅ | ✅ | ✅ | ✅ |

For **non-React, TypeScript-only** projects, Biome and oxlint cover most real-world needs. For **Vue/Angular** or projects requiring **custom rules**, ESLint remains necessary.

---

## Migration Paths

### ESLint → Biome

Biome provides a migration command:

```bash
npx @biomejs/biome migrate eslint --write
```

This reads your ESLint config and generates a `biome.json` with equivalent rules where possible. It prints a list of rules it couldn't migrate (usually plugin-specific rules).

**Steps:**
1. Run the migration command
2. Review what rules couldn't be migrated
3. Decide: accept the gap, or keep ESLint for those specific rules
4. Remove ESLint packages (if going full Biome)
5. Update your CI and pre-commit hooks

**Best for:** Greenfield or TypeScript-heavy projects with minimal plugin dependencies.

### ESLint → oxlint (Gradual Migration)

oxlint is designed for gradual adoption:

```bash
# Add oxlint alongside ESLint
npm install --save-dev oxlint

# Run both — oxlint first for speed, ESLint for coverage
npx oxlint . && npx eslint .
```

Over time, as oxlint implements more rules, you can disable them in ESLint to avoid duplication:

```js
// eslint.config.js — disable rules covered by oxlint
import { RULES_TO_DISABLE_FOR_OXLINT } from 'eslint-plugin-oxlint';

export default [
  {
    rules: {
      ...RULES_TO_DISABLE_FOR_OXLINT,
    }
  }
];
```

**Best for:** Large existing projects where a full migration is risky. Immediate speed wins without breaking changes.

### Adding Biome Formatter to an Existing Prettier Setup

If you want to keep ESLint but replace Prettier with Biome's formatter:

```json
// biome.json
{
  "linter": { "enabled": false },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

Then remove Prettier from your toolchain and update your editor config to use Biome for formatting.

---

## Use Case Recommendations

### Solo Developer / Small Project

**Recommendation: Biome**

Biome's single config file and zero plugin management overhead make it perfect for individuals. You get lint + format in one fast tool. The limited plugin ecosystem doesn't matter when you're moving fast.

```bash
npm create biome@latest
```

### Growing Team (5–20 devs)

**Recommendation: ESLint + Prettier (established) or Biome (greenfield)**

For existing projects, ESLint + Prettier with `eslint-config-prettier` remains reliable. For new projects, Biome is increasingly the better default — simpler onboarding and faster CI.

Consider adding oxlint to your existing ESLint setup for immediate speed improvements in pre-commit hooks.

### Large Team / Monorepo (20+ devs)

**Recommendation: oxlint + ESLint hybrid**

Large teams typically have deeply customized ESLint configs, security rules, and internal plugins. A full migration is risky. The oxlint hybrid approach gives you 80% of the speed improvement with near-zero migration risk.

```bash
# Add to lint-staged config
"*.{ts,tsx}": ["oxlint --fix", "eslint --fix --cache"]
```

### React/Next.js Project

**Recommendation: Biome or ESLint + Prettier**

Biome now implements React hooks rules natively (as of Biome 1.8+). For most React projects, Biome covers everything you need. If you rely on `eslint-plugin-react-query`, `eslint-plugin-testing-library`, or other ecosystem plugins, stick with ESLint.

### Vue / Angular / Svelte Project

**Recommendation: ESLint + Prettier**

Framework-specific ESLint plugins (`eslint-plugin-vue`, `@angular-eslint`) have no equivalent in Biome or oxlint yet. ESLint is the only viable option here.

---

## Conclusion: The Decision Matrix

| Situation | Best Choice |
|-----------|-------------|
| New TypeScript project | Biome |
| Existing large codebase, need speed now | oxlint + ESLint hybrid |
| Vue / Angular project | ESLint + Prettier |
| React project (modern) | Biome or ESLint + Prettier |
| Need custom lint rules | ESLint (required) |
| Team hates config complexity | Biome |
| Solo developer | Biome |
| Enterprise with internal plugins | ESLint + oxlint hybrid |

**The honest take for 2026:** Biome is the future for new TypeScript/React projects. It's fast, simple, and converging on ESLint's rule coverage. oxlint is the practical choice for existing projects that can't do a full migration. ESLint + Prettier remains the safe default for teams with complex requirements or framework-specific plugins.

There's no single winner — but the era of "just use ESLint" being the default answer is over.

---

## Related Tools on DevPlaybook

Looking to speed up your JS toolchain further? Check out these related tools:

- **[Regex Tester](/tools/regex-tester)** — Test and debug regex patterns used in lint rules
- **[JSON Formatter](/tools/json-formatter)** — Validate and format your `biome.json` or `.eslintrc.json`
- **[Diff Checker](/tools/diff-checker)** — Compare before/after output when migrating lint configs

---

*Last updated: March 2026. Biome 1.9, ESLint 9.x, oxlint 0.10.x.*
