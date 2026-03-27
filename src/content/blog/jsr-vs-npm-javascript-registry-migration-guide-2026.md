---
title: "JSR vs npm: The New JavaScript Package Registry - Complete Migration Guide 2026"
description: "JSR is redefining JavaScript package distribution with TypeScript-first design, native Deno/Bun/Node support, and a built-in scoring system. Learn how it compares to npm and how to migrate your packages in 2026."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["jsr", "npm", "javascript", "typescript", "deno", "package-registry", "migration"]
readingTime: "14 min read"
---

JavaScript package management has a new contender in 2026. JSR — the JavaScript Registry — launched by the Deno team has grown beyond its Deno roots to become a serious alternative to npm for publishing TypeScript-first packages across Node.js, Deno, and Bun. If you've been ignoring JSR, this guide is your wake-up call.

This is a complete breakdown: what JSR is, how it compares to npm feature by feature, practical migration steps, and when you should (and shouldn't) switch.

---

## What Is JSR?

JSR (JavaScript Registry, found at `jsr.io`) is an open-source package registry built for the modern JavaScript ecosystem. It was created by the Deno team but explicitly supports all major runtimes: Node.js, Deno, Bun, browsers, and Cloudflare Workers.

The core design goals of JSR are:

- **TypeScript-first**: Publish TypeScript source directly — no build step required
- **ESM-only**: No CommonJS, no dual-package hazard
- **Cross-runtime**: One package works everywhere
- **Security-focused**: Provenance tracking, author verification
- **Auto-documented**: Documentation generated from JSDoc + TypeScript types

Unlike npm, JSR doesn't just host JavaScript files. It hosts TypeScript source and transpiles on demand for consumers. This means you can publish a `.ts` file and the registry serves the right format for each runtime.

---

## JSR vs npm: Feature-by-Feature Comparison

| Feature | JSR | npm |
|---------|-----|-----|
| TypeScript support | Native — publish `.ts` directly | Requires build step + type declaration files |
| Module system | ESM only | CommonJS + ESM (dual-package hazard) |
| Runtime support | Node, Deno, Bun, browsers | Node-focused; others need extra config |
| Package scoring | Built-in quality score | No scoring |
| Provenance | Required, auditable | Optional (introduced 2023) |
| Documentation | Auto-generated from source | Manual (external tools like TypeDoc) |
| Package namespacing | Scoped by default (`@author/pkg`) | Optional scoping (`@scope/pkg`) |
| CLI tooling | `npx jsr`, `deno add`, `bunx jsr` | `npm`, `pnpm`, `yarn` |
| Registry size | Growing (tens of thousands) | Massive (millions of packages) |
| Private packages | Paid tier | Paid (npm Pro/Teams) |

### Where JSR Wins

**TypeScript workflow**: With npm, publishing a TypeScript library means running `tsc`, maintaining declaration maps, potentially shipping both `.js` and `.d.ts`, and dealing with `"exports"` field complexity. With JSR, you push your `.ts` files and the registry handles the rest. Consumers get types automatically.

**Security posture**: JSR requires package publishers to verify their identity. All packages have auditable provenance — you can see exactly what commit triggered a publish. This matters significantly in a post-supply-chain-attack world.

**Package quality scoring**: JSR's built-in scoring (covered below) gives you immediate feedback on your package quality before users even install it.

### Where npm Wins

**Ecosystem size**: npm has over 2 million packages. JSR has a fraction of that. For anything beyond core utilities, npm is where the ecosystem lives.

**Tooling maturity**: npm, pnpm, and yarn have years of lockfile tooling, workspace support, and CI integration. JSR is newer and some workflows (monorepos, complex lockfile scenarios) are less battle-tested.

**CommonJS compatibility**: Large portions of the Node.js ecosystem still use `require()`. JSR's ESM-only stance means wrapping legacy CJS dependencies requires extra work.

---

## How JSR Packages Are Structured

A JSR package needs a `jsr.json` (or `deno.json` for Deno-first packages):

```json
{
  "name": "@yourname/my-package",
  "version": "1.0.0",
  "exports": "./mod.ts"
}
```

That's it. Your main export points to a TypeScript file. No `tsconfig.json` required for publishing (though you'll want one for local development). No `package.json` is needed for JSR-native publishing, though you can include one for npm compatibility.

A minimal package structure:

```
my-package/
├── jsr.json
├── mod.ts          # main export
├── utils.ts        # internal module
└── README.md
```

---

## Publishing Your First JSR Package

### Step 1: Create a JSR Account

Visit `jsr.io`, sign in with GitHub, and create a scope (your `@username` or `@org`). Scopes on JSR are free for individuals.

### Step 2: Initialize Your Package

```bash
# For a new package
mkdir my-util && cd my-util

# Create jsr.json
cat > jsr.json << 'EOF'
{
  "name": "@yourscope/my-util",
  "version": "0.1.0",
  "exports": "./mod.ts"
}
EOF
```

### Step 3: Write TypeScript Source

```typescript
// mod.ts
/**
 * Formats a date to ISO 8601 string.
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Clamps a number between min and max values.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

### Step 4: Publish

```bash
# Using npx (works in any Node.js environment)
npx jsr publish

# Using Deno
deno publish

# Dry run first (recommended)
npx jsr publish --dry-run
```

The CLI will prompt you to authenticate with JSR, then upload your TypeScript files directly.

---

## Consuming JSR Packages

JSR packages are consumed differently depending on your runtime.

### In Deno

```bash
deno add jsr:@std/path
```

```typescript
import { join, dirname } from "@std/path";

const fullPath = join(dirname(import.meta.url), "assets");
```

### In Node.js (via npm CLI)

```bash
npx jsr add @std/path
```

This creates an entry in your `node_modules` and updates `package.json`. Under the hood, `npx jsr` creates a shim that maps JSR imports to the correct Node.js-compatible module.

```typescript
import { join } from "@std/path";
```

### In Bun

```bash
bunx jsr add @std/path
```

```typescript
import { join } from "@std/path";
```

### Direct URL Import (Deno / browsers)

```typescript
import { join } from "jsr:@std/path@^1.0.0";
```

The `jsr:` specifier is supported natively in Deno 1.37+ and can be polyfilled for browsers with import maps.

---

## The JSR Quality Scoring System

One of JSR's most distinctive features is its automatic package quality score. Every package gets a score from 0–100% based on:

| Criteria | Weight |
|----------|--------|
| Has a description | Required |
| Has a README | ~20% |
| All exports have JSDoc | ~30% |
| No slow types (TypeScript performance) | ~20% |
| Has examples in docs | ~10% |
| Runtime compatibility declared | ~20% |

You can check your score locally before publishing:

```bash
npx jsr publish --dry-run
# Output includes score and what's missing
```

**"Slow types"** is JSR's term for TypeScript patterns that hurt type-checking performance: inline object types in exports, complex conditional types at the public API surface, etc. JSR analyzes your exported types and warns if they'd cause slow downstream compilation.

Example of what to avoid:

```typescript
// Slow type — complex inline conditional
export function process<T>(input: T): T extends string ? string[] : number[] {
  // ...
}

// Better — named type alias
type ProcessResult<T> = T extends string ? string[] : number[];
export function process<T>(input: T): ProcessResult<T> {
  // ...
}
```

---

## JSR Standard Library: @std Packages

The Deno standard library is now published to JSR under the `@std` scope and fully supports Node.js. These are production-quality, well-tested utilities:

```bash
# Path manipulation
npx jsr add @std/path

# File system utilities
npx jsr add @std/fs

# HTTP utilities
npx jsr add @std/http

# Testing
npx jsr add @std/assert

# Date formatting
npx jsr add @std/datetime

# Encoding (base64, hex, etc.)
npx jsr add @std/encoding
```

These packages are a compelling reason to try JSR even if you're a Node.js-only developer. They're consistently typed, tree-shakeable, and avoid the CommonJS/ESM dual-package issues that plague many npm utilities.

---

## Migration Checklist: npm Package → JSR

If you have an existing npm package and want to publish it on JSR (you can publish to both simultaneously):

### Pre-Migration Checklist

- [ ] Convert all exports to ESM (`export` instead of `module.exports`)
- [ ] Remove CommonJS-specific code (`require()`, `__dirname`, `__filename`)
- [ ] Add `"type": "module"` to `package.json`
- [ ] Ensure all TypeScript types are exported (no implicit `any` in public API)
- [ ] Add JSDoc comments to all exported functions, classes, and types
- [ ] Write a `jsr.json` with correct `name`, `version`, and `exports`
- [ ] Run `npx jsr publish --dry-run` and fix all score issues

### package.json → jsr.json Field Mapping

| package.json | jsr.json | Notes |
|-------------|---------|-------|
| `name` | `name` | Must be scoped: `@scope/name` |
| `version` | `version` | Same semver |
| `exports` | `exports` | Point to `.ts` files, not `.js` |
| `dependencies` | — | No direct mapping; use import URLs or npm deps |
| `devDependencies` | — | Not needed for JSR publishing |

### Publishing to Both npm and JSR

Many packages publish to both registries to reach maximum audience:

```bash
# Build for npm (TypeScript → JavaScript)
tsc --outDir dist

# Publish to npm
npm publish

# Publish TypeScript source to JSR
npx jsr publish
```

With this approach, npm consumers get the compiled JavaScript with type declarations, while JSR consumers get the TypeScript source directly.

---

## When to Use JSR vs npm

### Use JSR when:

- Building a new TypeScript utility library from scratch
- Targeting multiple runtimes (Node + Deno + Bun)
- Prioritizing type safety and documentation quality
- Contributing to the Deno/modern JS ecosystem
- Your package is ESM-only with no CJS requirements

### Use npm when:

- Building for a Node.js-only ecosystem
- Shipping CommonJS modules (legacy codebase requirements)
- Depending on packages that only exist on npm
- Needing the full npm ecosystem (millions of packages)
- Your team is deeply invested in existing npm tooling

### Use both when:

- Publishing open-source TypeScript utilities
- Wanting maximum reach across all JavaScript runtimes
- Building packages intended to become "standard" utilities

---

## JSR in CI/CD Pipelines

Publishing JSR packages in CI is straightforward with OIDC-based authentication (no stored secrets):

```yaml
# GitHub Actions example
name: Publish to JSR
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for JSR OIDC auth

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Publish to JSR
        run: npx jsr publish
```

The `id-token: write` permission enables JSR's OIDC integration — no `JSR_TOKEN` secret needed. This is significantly cleaner than npm's token-based publishing.

---

## Practical Example: Migrating a Utility Package

Let's migrate a simple npm package to JSR.

**Before (npm package):**

```javascript
// index.js (CommonJS)
const { format } = require('date-fns');

function formatTimestamp(date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

module.exports = { formatTimestamp };
```

**After (JSR package):**

```typescript
// mod.ts (TypeScript ESM)

/**
 * Formats a Date object as a human-readable timestamp.
 *
 * @example
 * ```ts
 * import { formatTimestamp } from "@yourscope/time-utils";
 *
 * formatTimestamp(new Date()); // "2026-03-28 14:30:00"
 * ```
 */
export function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}
```

Key changes:
1. TypeScript instead of JavaScript
2. ESM exports instead of `module.exports`
3. No external dependency (`date-fns` → self-contained)
4. Full JSDoc with `@example` block (improves JSR score)

---

## Conclusion: Should You Adopt JSR?

JSR isn't trying to replace npm. The npm ecosystem is too large to replace. Instead, JSR is carving out the TypeScript-first, cross-runtime niche — and it's doing it well.

**Adopt JSR if you're starting a new TypeScript utility library.** The publishing experience is genuinely better: no build step, auto-generated docs, provenance by default, and the quality scoring catches issues before users do.

**Evaluate the @std packages even if you stay on npm.** They're Node.js-compatible, well-tested, and save you from adding heavyweight dependencies for common operations.

**Don't abandon npm.** For applications and frameworks, npm's ecosystem size is irreplaceable. For consuming packages, you'll be on npm for years to come.

The two registries are complementary. The best TypeScript library authors in 2026 publish to both.

---

## Resources

- [JSR Documentation](https://jsr.io/docs) — Official docs covering publishing, scoring, and CLI
- [Deno Standard Library on JSR](https://jsr.io/@std) — High-quality, cross-runtime utilities
- [JSR GitHub](https://github.com/jsr-io/jsr) — Open-source registry codebase
- [@std/path migration guide](https://jsr.io/@std/path) — Replacing Node.js `path` with cross-runtime alternative
