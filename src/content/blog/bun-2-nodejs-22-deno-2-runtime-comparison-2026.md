---
title: "Bun 2.0 vs Node.js 22 vs Deno 2: Which JavaScript Runtime in 2026?"
description: "Compare Bun 2.0, Node.js 22, and Deno 2 across performance, compatibility, ecosystem, and developer experience. Find out which JavaScript runtime is right for your project in 2026."
date: "2026-03-28"
tags: [bun, nodejs, deno, javascript, runtime]
readingTime: "8 min read"
---

# Bun 2.0 vs Node.js 22 vs Deno 2: Which JavaScript Runtime in 2026?

The JavaScript runtime landscape looks nothing like it did five years ago. Node.js still dominates production, but Bun's performance claims rattled the community, and Deno 2's compatibility shift made it a serious option again. In 2026, all three runtimes are mature enough to run real workloads — the question is which one fits your situation.

This guide compares Bun 2.0, Node.js 22, and Deno 2 across performance, Node.js compatibility, ecosystem maturity, developer experience, and migration difficulty. No hype — just facts and code.

---

## The Short Answer

| Use case | Recommendation |
|---|---|
| Existing Node.js production app | Stay on **Node.js 22** |
| New project, fast startup/scripts | **Bun 2.0** |
| Security-first, TypeScript-native | **Deno 2** |
| Backend API (greenfield) | Bun or Node.js |
| Serverless edge functions | Deno or Bun |

---

## Overview

### Node.js 22 (LTS 2026)

Node.js 22 is in Active LTS. After two decades, it remains the safe default: massive ecosystem, proven at scale, and deep tooling integration. V8 19 brings major performance improvements, and the built-in `--experimental-strip-types` flag for TypeScript is now stable.

### Bun 2.0

Bun is a fast all-in-one runtime: JavaScript engine (JavaScriptCore), package manager, bundler, and test runner. Version 2.0 (2025) added Node.js API compatibility at ~98%, making the "drop-in replacement" promise mostly real. It's built in Zig and consistently benchmarks 2–4× faster than Node.js on I/O-heavy workloads.

### Deno 2

Deno 2 (released late 2024) reversed its original anti-Node.js stance: it now fully supports `npm:` imports, `package.json`, and Node.js built-in APIs. The security model (explicit permissions), built-in TypeScript, and Web API alignment remain its differentiators.

---

## Performance Benchmarks

Performance numbers vary widely depending on workload. Here are representative figures from independent benchmarks (2026):

### HTTP Server Throughput (requests/sec, simple "Hello World")

| Runtime | req/sec |
|---|---|
| Bun 2.0 (native HTTP) | ~135,000 |
| Node.js 22 (uWebSockets.js) | ~120,000 |
| Node.js 22 (native http) | ~72,000 |
| Deno 2 (Deno.serve) | ~95,000 |

### Script Startup Time

```bash
# Cold start, print "hello" and exit
time bun run hello.ts      # ~6ms
time node --input-type=module < hello.js  # ~45ms
time deno run hello.ts     # ~60ms (first run, no cache)
time deno run hello.ts     # ~20ms (cached)
```

Bun's startup speed is transformative for CLI tools and scripts that run frequently.

### Package Install (next.js project, cold cache)

```bash
bun install    # ~1.2s
npm install    # ~18s
pnpm install   # ~7s
deno install   # N/A (uses npm: imports; no lockfile install step)
```

### Key takeaway

Bun wins on raw benchmarks. But in real applications, database and external API latency dominates — the runtime gap shrinks considerably. For scripts and CLI tools, Bun's startup advantage is genuinely useful.

---

## Node.js Compatibility

### Node.js 22

100% compatible. It *is* Node.js.

### Bun 2.0

~98% Node.js compatibility. Most npm packages work out of the box.

```bash
# Check compatibility
bun run --bun server.js  # runs in Bun's engine
```

What still doesn't work in Bun 2.0:
- Some native addons (`.node` files) — depends on N-API surface used
- `vm` module edge cases
- Worker threads have some API gaps
- `cluster` module has partial support

```js
// This works in Bun 2.0
const { createServer } = require('http');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hello from Express on Bun'));
createServer(app).listen(3000);
```

```bash
bun run server.js  # Works
```

### Deno 2

Deno 2 supports `npm:` prefixed imports and reads `package.json`:

```ts
// Deno 2 — import from npm
import express from "npm:express";
import { serve } from "https://deno.land/std/http/server.ts";

const app = express();
app.get("/", (req: any, res: any) => res.send("Hello from Express on Deno 2"));
app.listen(3000);
```

Node.js built-in compatibility via `node:` prefix:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = readFileSync(join(Deno.cwd(), "data.txt"), "utf8");
```

Remaining gaps: some Node.js core APIs with complex native bindings.

---

## Developer Experience

### TypeScript Support

All three runtimes run TypeScript without a build step:

```bash
# All three work
bun run app.ts
deno run app.ts
node --experimental-strip-types app.ts  # Node.js 22 (stable in 22.x)
```

Node.js's `--experimental-strip-types` strips type annotations at runtime — it doesn't type-check. Bun transpiles TypeScript via its own bundler. Deno has native TypeScript support with optional type checking via `deno check`.

```bash
deno check app.ts      # Full type check
deno run app.ts        # Runs without type checking (fast)
```

### Package Management

```bash
# Node.js: npm / pnpm / yarn
npm install lodash
pnpm add lodash

# Bun: built-in
bun add lodash
bun remove lodash
bun update

# Deno: URL imports or npm: prefix
import _ from "npm:lodash";
import _ from "https://esm.sh/lodash";
```

Bun's package manager is its most practically useful feature — 10–15× faster installs with a compatible `package.json` and `bun.lockb` lockfile.

### Testing

All three have built-in test runners:

```ts
// Node.js 22 (node:test)
import { test, describe } from "node:test";
import assert from "node:assert";

describe("add", () => {
  test("adds two numbers", () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

```ts
// Bun (Jest-compatible API)
import { expect, test, describe } from "bun:test";

describe("add", () => {
  test("adds two numbers", () => {
    expect(1 + 1).toBe(2);
  });
});
```

```ts
// Deno (built-in Deno.test)
import { assertEquals } from "jsr:@std/assert";

Deno.test("adds two numbers", () => {
  assertEquals(1 + 1, 2);
});
```

Bun's test runner is Jest-compatible, making migration from Jest trivial. Deno's testing integrates tightly with its permission model (you can assert that tests don't use network).

### Bundling

```bash
# Bun: built-in bundler
bun build ./src/index.ts --outdir ./dist --target browser
bun build ./src/server.ts --outdir ./dist --target bun --minify

# Deno: built-in bundler (deno bundle, or esbuild via npm:)
deno bundle app.ts bundle.js  # deprecated in favor of esbuild

# Node.js: needs external tool (esbuild, Rollup, webpack)
npx esbuild src/index.ts --bundle --outfile=dist/bundle.js
```

---

## Security Model

This is where Deno stands apart.

### Deno 2 Permissions

```bash
# Explicit permissions required
deno run --allow-net --allow-read=./data app.ts

# Grant all (development only)
deno run --allow-all app.ts

# Permission prompts in interactive mode
deno run app.ts  # Will prompt for each permission at runtime
```

```ts
// Programmatic permission check
const status = await Deno.permissions.query({ name: "net", host: "api.example.com" });
if (status.state !== "granted") {
  console.error("Network access to api.example.com not granted");
  Deno.exit(1);
}
```

Node.js 22 has an experimental `--permission` flag, but it's not production-ready and has a different design.

Bun has no permission system — it runs with full system access like traditional Node.js.

---

## Ecosystem and npm Compatibility

### npm Package Support

| Package | Node.js 22 | Bun 2.0 | Deno 2 |
|---|---|---|---|
| Express | ✅ | ✅ | ✅ (npm:) |
| Fastify | ✅ | ✅ | ✅ (npm:) |
| Prisma | ✅ | ✅ | ✅ (npm:) |
| Next.js | ✅ | ✅ | ⚠️ partial |
| Vite | ✅ | ✅ | ✅ |
| Jest | ✅ | ✅ (built-in replacement) | ⚠️ use Deno.test |
| Native addons (.node) | ✅ | ⚠️ partial | ❌ |

### Deno's JSR Registry

Deno introduced JSR (JavaScript Registry) as a TypeScript-first alternative to npm. Packages publish TypeScript source; JSR generates type declarations for npm consumers too.

```ts
// Use JSR packages in any runtime
import { parseArgs } from "jsr:@std/cli";    // Deno
import { parseArgs } from "@std/cli";         // npm (via JSR-to-npm bridge)
```

---

## Migration Guide

### Node.js → Bun (simplest migration)

```bash
# 1. Install Bun
curl -fsSL https://bun.sh/install | bash

# 2. Install dependencies with Bun
bun install  # reads existing package.json

# 3. Run your app
bun run src/index.ts

# 4. Replace npm scripts
# package.json: "scripts": { "start": "bun run src/index.ts" }
```

Most Express/Fastify/Hapi apps work unchanged. Watch for:
- Native addon dependencies
- `__dirname` / `__filename` (both work in Bun 2.0)
- `process.env` (works)

### Node.js → Deno 2 (moderate migration)

```bash
# 1. Install Deno
curl -fsSL https://deno.land/install.sh | sh

# 2. Add deno.json config
cat > deno.json << 'EOF'
{
  "nodeModulesDir": "auto",
  "tasks": {
    "dev": "deno run --allow-all src/index.ts",
    "start": "deno run --allow-net --allow-read --allow-env src/index.ts"
  }
}
EOF

# 3. Run (Deno 2 reads package.json automatically)
deno task dev
```

Changes required:
- Replace `require()` with `import` (or use `createRequire`)
- Add `node:` prefix to built-in imports: `import fs from "node:fs"`
- Add permissions to `deno.json` or CLI flags
- Replace `__dirname`: `import.meta.dirname` (Deno 2 supports this)

---

## When to Use Each Runtime

### Choose Node.js 22 when:
- You have an existing production app
- Your team knows Node.js well
- You use native addons or complex C++ bindings
- You need the widest possible npm compatibility
- Your deployment target expects Node.js specifically (some PaaS providers)

### Choose Bun 2.0 when:
- Starting a new backend project and want speed + simplicity
- Building CLI tools where startup time matters
- You want one tool for runtime + package manager + bundler + test runner
- Your app is I/O-heavy and you want to extract every last millisecond
- You're tired of slow npm installs in CI

### Choose Deno 2 when:
- Security boundaries are a first-class concern (fintech, healthcare)
- You want TypeScript as a first-class citizen without config
- You're building edge functions (Deno Deploy, Cloudflare Workers)
- You prefer URL-based imports and don't want `node_modules`
- You're building utilities or scripts you want to publish to JSR

---

## Real-World Benchmarks: A Simple API Server

```ts
// server.ts — same code, three runtimes
import { serve } from "bun";  // Bun
// import { serve } from "https://deno.land/std/http/server.ts";  // Deno
// import { createServer } from "node:http";  // Node.js

const PORT = 3000;

// Bun version
Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
});
```

```ts
// Deno version — identical Web API
Deno.serve({ port: PORT }, (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response("Not Found", { status: 404 });
});
```

```js
// Node.js version
import { createServer } from "node:http";

createServer((req, res) => {
  if (req.url === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.statusCode = 404;
  res.end("Not Found");
}).listen(PORT);
```

Bun and Deno both use the Web `Request`/`Response` API — more portable, more aligned with browser and edge environments.

---

## Summary

In 2026, there's no wrong choice among these three runtimes — they all run real production workloads. The decision comes down to priorities:

- **Node.js 22**: stability, ecosystem breadth, zero migration cost for existing apps
- **Bun 2.0**: performance, developer experience, all-in-one tooling
- **Deno 2**: security, TypeScript-first, edge deployment

The most interesting trend: all three are converging on Web APIs (`Request`, `Response`, `fetch`, `URL`). Code written against these standard APIs will increasingly run on any runtime — which is exactly where the ecosystem is heading.

---

*Related tools on DevPlaybook: [JavaScript REPL](/tools/js-repl) · [JSON Formatter](/tools/json-formatter) · [Regex Tester](/tools/regex-tester)*
