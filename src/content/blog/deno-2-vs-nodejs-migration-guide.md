---
title: "Deno 2.0: What's New and Should You Migrate from Node.js?"
description: "A practical guide to Deno 2.0's new features, npm compatibility, and what you need to know before migrating your Node.js projects. Honest migration advice with real code examples."
date: "2024-11-15"
readingTime: "10 min read"
tags: [deno, nodejs, javascript, runtime]
---

Deno 2.0 landed in late 2024 with a bold claim: it now runs Node.js code. After years of being the security-first runtime that developers admired but couldn't adopt at scale, Deno made the pragmatic pivot — full npm compatibility, `node_modules` support, and a compatibility layer that lets you import existing Node.js packages without rewriting your code.

So, should you migrate? This guide covers what actually changed in Deno 2.0, the real differences from Node.js, and a step-by-step migration path if you decide to move.

---

## What's New in Deno 2.0

### Full npm and Node.js Compatibility

This is the headline feature. Deno 2.0 supports `npm:` specifiers and creates a local `node_modules` folder when needed.

```typescript
// Works in Deno 2.0 — no config needed
import express from "npm:express@4";
import { readFileSync } from "node:fs";
import path from "node:path";

const app = express();
app.get("/", (req, res) => {
  res.send("Running on Deno 2.0 with Express");
});
app.listen(3000);
```

Previously, you had to find Deno-compatible alternatives for every npm package. That's no longer required.

### `deno.json` as a First-Class Project Config

Deno 2.0 standardizes project configuration in `deno.json`. This replaces the scattered approach of inline import maps and CLI flags.

```json
{
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read src/main.ts",
    "build": "deno compile --output dist/app src/main.ts",
    "test": "deno test"
  },
  "imports": {
    "@std/http": "jsr:@std/http@^1.0",
    "express": "npm:express@^4.18"
  },
  "compilerOptions": {
    "strict": true
  }
}
```

You can define task scripts directly in `deno.json`, replacing the need for a `package.json` scripts section.

### JSR: The New Package Registry

Deno 2.0 ships with deep integration for [JSR](https://jsr.io) — the JavaScript Registry. Unlike npm, JSR is TypeScript-first and validates packages against their type signatures. Packages are published with source TypeScript, not compiled JavaScript.

```typescript
// Import from JSR
import { encodeHex } from "jsr:@std/encoding/hex";
import { delay } from "jsr:@std/async";

// Or configure in deno.json imports for cleaner imports
import { encodeHex } from "@std/encoding/hex";
```

JSR packages work in both Deno and Node.js — JSR can generate an npm-compatible build automatically.

### Stabilized Deno KV

Deno's built-in key-value store (`Deno.openKv()`) graduated to stable in 2.0. It provides atomic transactions, consistent reads, and optional cloud sync with Deno Deploy — without any external database.

```typescript
const kv = await Deno.openKv();

// Set a value
await kv.set(["users", "alice"], { name: "Alice", role: "admin" });

// Get a value
const result = await kv.get<{ name: string; role: string }>(["users", "alice"]);
console.log(result.value?.name); // "Alice"

// Atomic update
const res = await kv.atomic()
  .check({ key: ["counter"], versionstamp: null })
  .set(["counter"], 0)
  .commit();

console.log(res.ok); // true if atomic operation succeeded
```

### Workspaces (Monorepo Support)

Deno 2.0 adds workspace support at the config level:

```json
// root deno.json
{
  "workspace": ["./packages/api", "./packages/shared", "./packages/cli"]
}
```

Each member has its own `deno.json`. This enables monorepo patterns without third-party tools like Lerna or Turborepo.

---

## Key Differences from Node.js

### Security Model

Deno still requires explicit permission flags for I/O operations. Node.js has experimental permission flags (since v20), but they're opt-in and rarely used in practice.

| Action              | Node.js        | Deno              |
| ------------------- | -------------- | ----------------- |
| Read files          | Allowed by default | `--allow-read` required |
| Write files         | Allowed by default | `--allow-write` required |
| Network access      | Allowed by default | `--allow-net` required |
| Environment vars    | Allowed by default | `--allow-env` required |
| Run subprocesses    | Allowed by default | `--allow-run` required |

In production, Deno's permission model is genuinely useful — you can restrict what a script can do at the process level, without runtime enforcement in application code.

```bash
# Deno — only allow reading from /data and HTTP calls to api.example.com
deno run \
  --allow-read=/data \
  --allow-net=api.example.com \
  src/fetch-and-process.ts
```

### TypeScript Out of the Box

Deno runs TypeScript natively without any build step or config. Node.js v23 added experimental native TypeScript stripping (`--experimental-strip-types`), but you still need `tsc` for type-checking and anything beyond basic type stripping.

```typescript
// deno run main.ts — no tsconfig, no tsc, no ts-node needed
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<User>;
}

const user = await fetchUser(1);
console.log(`Hello, ${user.name}`);
```

### Standard Library

Deno ships a curated standard library (`@std`) maintained by the Deno team. Node.js relies on npm for most utility functions.

```typescript
// Deno — batteries included
import { walk } from "jsr:@std/fs/walk";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { encodeBase64 } from "jsr:@std/encoding/base64";

// Node.js — you need: fast-glob, minimist/yargs, and a buffer utility
```

The `@std` library is type-safe, well-tested, and versioned independently of the runtime.

### Import Maps vs package.json

Deno uses import maps for dependency aliasing. Node.js uses `package.json` with `node_modules`.

```json
// deno.json — import map
{
  "imports": {
    "lodash": "npm:lodash@4",
    "@/utils": "./src/utils/index.ts"
  }
}
```

There's no `node_modules` resolution algorithm to debug, no hoisting surprises, and no phantom dependencies. The dependency graph is explicit.

---

## When to Migrate

**Migrate to Deno 2.0 if:**

- You're starting a new TypeScript project and want zero build tooling overhead
- You're building CLI tools that benefit from `deno compile` (single-binary output)
- You want the security permission model for running untrusted scripts
- You're deploying to Deno Deploy and want the edge-first architecture
- You're building a project that benefits from Deno KV (stateful edge functions)

**Stick with Node.js if:**

- Your project has deep native module dependencies (`.node` bindings) — compatibility is improving but not perfect
- Your team has significant Node.js expertise and no runtime pain points
- You use tools with Node.js-specific internals (some bundlers, test runners, ORMs)
- You're in a regulated environment where the Node.js LTS support cycle matters

**Deno 2.0 is production-ready for:** REST APIs, CLIs, serverless functions, script automation, data pipelines, and web servers built on Hono, Oak, or Express.

---

## Step-by-Step Migration

### Step 1 — Install Deno

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows (PowerShell)
irm https://deno.land/install.ps1 | iex

# Verify
deno --version
# deno 2.x.x
```

### Step 2 — Create deno.json

Start with a minimal config at your project root:

```json
{
  "tasks": {
    "dev": "deno run --allow-net --allow-read --allow-env src/index.ts",
    "test": "deno test --allow-net --allow-read"
  },
  "nodeModulesDir": "auto"
}
```

Setting `"nodeModulesDir": "auto"` tells Deno to create a local `node_modules` folder when npm packages are imported — important for packages that use `require.resolve` internally.

### Step 3 — Update Import Statements

Deno uses `node:` prefix for built-in Node modules:

```typescript
// Before (Node.js style — still works in Deno 2.0)
import fs from "fs";
import path from "path";

// After (explicit node: prefix — recommended)
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
```

For npm packages, add the `npm:` specifier:

```typescript
// Before (Node.js)
import express from "express";
import { z } from "zod";

// After (Deno 2.0) — or configure in deno.json imports
import express from "npm:express@4";
import { z } from "npm:zod@3";
```

Better: add them to `deno.json` imports so your source files stay clean:

```json
{
  "imports": {
    "express": "npm:express@^4.18",
    "zod": "npm:zod@^3.22"
  }
}
```

### Step 4 — Handle __dirname and __filename

These CommonJS globals don't exist in Deno's ES module environment:

```typescript
// Node.js CommonJS
const dir = __dirname;
const file = __filename;

// Deno 2.0 equivalent
const dir = import.meta.dirname;
const file = import.meta.filename;

// Or use URL-based approach
const dir = new URL(".", import.meta.url).pathname;
```

### Step 5 — Replace process.env with Deno.env

```typescript
// Node.js
const apiKey = process.env.API_KEY;
const port = parseInt(process.env.PORT || "3000");

// Deno 2.0
const apiKey = Deno.env.get("API_KEY");
const port = parseInt(Deno.env.get("PORT") ?? "3000");
```

Note: Deno requires `--allow-env` permission flag (or `--allow-env=API_KEY,PORT` to restrict to specific vars).

### Step 6 — Run and Fix

```bash
# First run — will show permission errors and import issues
deno run src/index.ts

# Add permissions as needed
deno run --allow-net --allow-read --allow-env src/index.ts

# Check for type errors
deno check src/index.ts
```

Most Node.js code migrates with just the import changes above. The remaining issues are usually:
- Missing `node:` prefix on built-in imports
- `__dirname`/`__filename` usage
- CommonJS `require()` calls (replace with `import`)
- Native `.node` addons (no workaround — these don't work in Deno)

### Step 7 — Migrate Tests

Deno has a built-in test runner. If you're on Jest:

```typescript
// Jest
describe("add function", () => {
  test("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});

// Deno test runner
import { assertEquals } from "jsr:@std/assert";

Deno.test("add function - adds two numbers", () => {
  assertEquals(add(2, 3), 5);
});
```

Run with:

```bash
deno test
# or with permissions
deno test --allow-read --allow-net
```

---

## Performance Comparison

Raw benchmark numbers between Deno and Node.js are close enough that they rarely determine the right choice. Both use V8 and handle similar request volumes. What matters more in practice:

**Startup time:** Deno's startup is marginally faster for small scripts because it doesn't scan `node_modules`. For long-running servers, this difference is irrelevant.

**TypeScript compilation:** Deno caches compiled TypeScript, so the first run is slower but subsequent runs are near-instant. Node.js with `ts-node` or `tsx` has similar behavior.

**HTTP throughput:** In HTTP benchmarks (using Hono or Oak on Deno vs Express/Fastify on Node.js), the numbers are competitive. Deno's built-in HTTP server performs well for simple handlers. Fastify on Node.js edges ahead in highly optimized configurations.

```typescript
// Deno HTTP server — minimal overhead
Deno.serve({ port: 8080 }, (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "content-type": "application/json" },
    });
  }
  return new Response("Not Found", { status: 404 });
});
```

**Bottom line on performance:** Choose your runtime based on DX and ecosystem fit. The performance delta between well-configured Deno and Node.js apps is negligible for most real-world workloads.

---

## Tooling Ecosystem

One area where Node.js still leads is third-party tooling. Webpack, Vite, Rollup, Prisma, and many ORM/framework integrations are Node.js-first. They work in Deno (often via the npm compatibility layer), but edge cases arise.

Deno's own tooling is genuinely excellent:

```bash
# Built-in formatter (like Prettier, no config needed)
deno fmt

# Built-in linter
deno lint

# Built-in type checker
deno check src/**/*.ts

# Single-binary compiler
deno compile --output dist/myapp src/main.ts

# Documentation generator
deno doc src/utils.ts

# Dependency inspector
deno info src/main.ts
```

This replaces Prettier + ESLint + tsc + pkg + jsdoc with a single `deno` command. For greenfield projects, the reduced toolchain complexity is a significant quality-of-life improvement.

---

## Conclusion

Deno 2.0 removed the biggest adoption barrier: ecosystem incompatibility. You no longer need to find Deno-compatible versions of every dependency. If it's on npm, it likely works.

The runtime still has genuine advantages over Node.js: TypeScript without config, a real security model, a curated standard library, and `deno compile` for single-binary distribution. If you're starting a new project today, Deno 2.0 deserves serious consideration.

For existing Node.js projects, the migration path is cleaner than it's ever been. Simple scripts and REST APIs typically migrate in hours. Large applications with native module dependencies or complex build pipelines warrant more evaluation before committing.

The JavaScript runtime landscape is healthier for having Deno push it forward — and Deno 2.0 is the version that finally makes the switch practical.
