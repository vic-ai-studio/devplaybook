---
title: "Node.js ESM vs CommonJS: Migration Guide for 2026"
description: "Complete guide to migrating from CommonJS to ES Modules in Node.js. Covers interop rules, package.json configuration, TypeScript settings, dual package publishing, and common migration pitfalls."
date: "2026-04-02"
tags: [nodejs, esm, commonjs, javascript, modules, typescript]
readingTime: "11 min read"
---

# Node.js ESM vs CommonJS: Migration Guide for 2026

The Node.js module ecosystem has fully embraced ES Modules (ESM), but most production applications still use CommonJS (CJS). Migrating isn't always necessary — but understanding the differences, knowing when to migrate, and how to do it without breaking things is essential for every Node.js developer in 2026.

---

## The State of Node.js Modules in 2026

Node.js supports both module systems natively. ESM is the standard; CJS is legacy but fully maintained. Key stats:

- **npm packages**: ~60% still ship CJS-only; ~35% ship dual (CJS+ESM); ~5% ESM-only
- **New packages**: Increasingly ESM-first, especially in the ecosystem (Unified, ESLint plugins, Sindre Sorhus packages)
- **Frameworks**: Express (CJS), Fastify (dual), Hapi (ESM), Koa (dual)
- **Node.js**: CJS is default; ESM requires opt-in

---

## Module Format Quick Reference

```javascript
// CommonJS (CJS) — Node.js default
const path = require('path');
const { readFile } = require('fs/promises');
const utils = require('./utils');     // extension optional
module.exports = { myFunction };
module.exports.helper = function() {};

// ES Modules (ESM)
import path from 'path';
import { readFile } from 'fs/promises';
import { helper } from './utils.js';  // extension REQUIRED
export function myFunction() {}
export default class MyClass {}
```

---

## How Node.js Decides: CJS or ESM?

Node.js uses a resolution algorithm to determine the module format:

```
Is the file extension .mjs?  → ESM
Is the file extension .cjs?  → CJS
Is the file extension .js?
  → Check nearest package.json
    → "type": "module"?   → ESM
    → "type": "commonjs"? → CJS (or if absent) → CJS
```

```json
// package.json — make ALL .js files ESM
{
  "name": "my-package",
  "type": "module"
}
```

```json
// package.json — explicit CJS (the default)
{
  "name": "my-package",
  "type": "commonjs"
}
```

---

## Interop: The Tricky Part

### ESM can import CJS

ESM can import CJS modules — the CJS module's `module.exports` becomes the default export:

```javascript
// cjs-module.js (CommonJS)
module.exports = { add, subtract };
module.exports.multiply = function(a, b) { return a * b; };

// esm-file.mjs (ES Module)
import cjsModule from './cjs-module.js';  // module.exports becomes default
const { add } = cjsModule;               // destructure from default

// Named imports from CJS require static analysis (not always reliable)
// Better to use default import and destructure
```

### CJS CANNOT synchronously require() ESM

This is the most common pain point:

```javascript
// esm-module.mjs
export const value = 42;
export default function hello() { return "Hello!"; }

// cjs-file.js — BROKEN
const mod = require('./esm-module.mjs');  // ❌ ERR_REQUIRE_ESM

// WORKAROUND: Dynamic import (async)
async function loadEsm() {
  const mod = await import('./esm-module.mjs');  // ✅ Works
  console.log(mod.value);          // 42
  console.log(mod.default());      // "Hello!"
}
```

### Top-Level Await (ESM Only)

```javascript
// Only works in ESM files
const config = await fetch('/config.json').then(r => r.json());

// CJS equivalent — must wrap in async function
async function init() {
  const config = await fetch('/config.json').then(r => r.json());
  // ...
}
init();
```

---

## Node.js Built-in Modules: ESM Import Syntax

```javascript
// CJS style
const { readFile, writeFile } = require('fs/promises');
const path = require('path');
const { createServer } = require('http');

// ESM style — use 'node:' prefix (recommended, avoids npm package conflicts)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

---

## Step-by-Step Migration

### Option 1: Gradual Migration (Recommended)

Migrate one file at a time by renaming to `.mjs`:

```bash
# Rename a single file
mv utils.js utils.mjs

# Update imports in other files to use .mjs extension
# src/app.js (still CJS) — use dynamic import for the ESM file
const { helper } = await import('./utils.mjs');
```

### Option 2: Full Migration (All at Once)

```bash
# 1. Add "type": "module" to package.json
# 2. Run a codemod to fix require() → import
npx codemod-esm .

# 3. Manually fix the hard parts:
#    - __dirname/__filename → import.meta.url
#    - module.exports → export
#    - require.resolve() → import.meta.resolve() (Node.js 20.6+)
#    - JSON imports → import data from './data.json' assert { type: 'json' }
```

### Common Migration Patterns

```javascript
// BEFORE (CJS)
const express = require('express');
const path = require('path');
const pkg = require('./package.json');
const __dirname = __dirname;

module.exports = async function startServer() {
  // ...
};

// AFTER (ESM)
import express from 'express';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// __dirname equivalent
const __dirname = dirname(fileURLToPath(import.meta.url));

// JSON import (stable in Node.js 22)
import pkg from './package.json' with { type: 'json' };
// OR use fs:
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default async function startServer() {
  // ...
}
```

---

## TypeScript Configuration for ESM

TypeScript's ESM support requires specific compiler options:

```json
// tsconfig.json for Node.js ESM application
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",        // Enables Node.js ESM resolution
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Critical:** With `NodeNext`, TypeScript requires `.js` extensions in import paths (TypeScript resolves `.ts` files but emits `.js`):

```typescript
// WRONG — TS error with NodeNext resolution
import { helper } from './utils';

// CORRECT
import { helper } from './utils.js';  // TypeScript maps this to utils.ts
```

### Build Scripts (package.json)

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "node --watch dist/index.js",
    "dev:ts": "tsx src/index.ts"    // tsx for direct TS execution
  }
}
```

---

## Publishing npm Packages: Dual CJS + ESM

The gold standard for npm packages in 2026 is to support both CJS and ESM consumers via the `exports` field:

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "./dist/cjs/index.js",    // Legacy CJS entry (for old tooling)
  "module": "./dist/esm/index.js",  // ESM entry (Rollup/bundlers)
  "exports": {
    ".": {
      "import": {
        "types": "./dist/esm/index.d.ts",
        "default": "./dist/esm/index.js"
      },
      "require": {
        "types": "./dist/cjs/index.d.ts",
        "default": "./dist/cjs/index.js"
      }
    },
    "./utils": {
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.js"
    }
  },
  "types": "./dist/cjs/index.d.ts",
  "files": ["dist"]
}
```

Build both formats:

```json
{
  "scripts": {
    "build:esm": "tsc -p tsconfig.esm.json",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build": "npm run build:esm && npm run build:cjs && node scripts/fix-cjs.js"
  }
}
```

```json
// tsconfig.esm.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "./dist/esm"
  }
}
```

```json
// tsconfig.cjs.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/cjs",
    "declaration": false
  }
}
```

### The "Dual Package Hazard"

When a package has both CJS and ESM versions, consumers might accidentally load both — creating two separate instances of a singleton (like a database connection or store):

```javascript
// This is a problem if "my-lib" exports a singleton
import { store } from 'my-lib';        // ESM version
const { store: cjsStore } = require('my-lib');  // CJS version (different instance!)

store === cjsStore;  // false — two different objects!
```

For libraries with singletons, use a wrapper pattern or export a factory function instead of a singleton.

---

## When to Migrate (and When Not To)

### Migrate to ESM when:

- Starting a new Node.js project
- You want top-level `await`
- You're consuming increasingly ESM-only packages
- You want full tree-shaking support in bundled applications
- Building a modern npm library that should support ESM consumers

### Stay on CJS when:

- Working in a large legacy codebase (migration risk > benefit)
- Using packages with native addons that haven't been updated
- Your team isn't familiar with ESM interop rules
- You use tooling that doesn't support ESM well yet (some Jest setups, some webpack configs)

---

## Debugging ESM Errors

### ERR_REQUIRE_ESM

```
Error [ERR_REQUIRE_ESM]: require() of ES Module ./node_modules/some-package/index.js not supported.
```

**Solutions:**
1. Use dynamic `await import()` instead of `require()`
2. Check if the package has a CJS version (check `exports.require` in package.json)
3. Pin to an older version that still ships CJS (short-term fix only)
4. Convert your entire project to ESM

### ERR_MODULE_NOT_FOUND (missing extension)

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module './utils'
```

**Solution:** Add the `.js` extension to the import path.

### Dynamic require() in ESM

```javascript
// Need require() in an ESM file (for legacy code)?
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const legacyLib = require('./legacy-lib.js');  // Now works
```

---

## Key Takeaways

1. **`"type": "module"` in package.json** makes all `.js` files ESM — the simplest path for new projects.

2. **ESM can import CJS; CJS cannot synchronously require ESM** — this asymmetry causes most migration headaches.

3. **Extensions are required in ESM** — `import './utils.js'` not `import './utils'`.

4. **`__dirname` and `__filename` don't exist in ESM** — use `fileURLToPath(import.meta.url)`.

5. **For npm libraries, ship dual packages** with the `exports` field mapping `import` and `require` conditions.

6. **Don't migrate large production codebases just to follow trends** — the Node.js team has committed to long-term CJS support.

---

Use the [package.json Validator](/tools/package-json-validator) to check your `exports` field syntax, and the [Node.js Module Checker](/tools/nodejs-module-checker) to diagnose common ESM/CJS interop errors.
