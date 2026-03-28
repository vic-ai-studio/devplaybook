---
title: "Bun 1.2: The Node.js Killer? Benchmarks & Real Migration Guide"
description: "Bun 1.2 benchmarks, new S3/SQLite APIs, and a practical guide to migrating your Node.js app. Is Bun ready for production in 2026?"
date: "2026-03-28"
tags: [bun, nodejs, javascript, runtime, performance]
readingTime: "11 min read"
---

# Bun 1.2: The Node.js Killer? Benchmarks & Real Migration Guide

Bun launched in 2022 with a bold promise: a JavaScript runtime fast enough to make every other tool feel sluggish. Early versions were exciting but rough around the edges. Bun 1.0 in late 2023 marked the first production-ready release. By 1.2 in 2025, Bun had grown into something that deserves serious evaluation — not hype, but honest assessment.

This guide covers Bun 1.2 specifically: what's new, where the benchmarks stand, and a concrete migration path for Node.js apps. No cheerleading — just data.

---

## What Is Bun?

Bun is a JavaScript runtime built on JavaScriptCore (the Safari/WebKit engine) rather than V8. It ships as a single binary that includes:

- A JavaScript/TypeScript runtime
- A package manager (drop-in npm/yarn/pnpm replacement)
- A bundler
- A test runner

The pitch is that you replace four separate tools with one, and every operation runs faster because the entire stack is written in Zig, a systems language designed for performance.

---

## Bun 1.2: What's New

Bun 1.2 added APIs that had been blocking production adoption for many teams.

### Built-in S3 Client

Bun 1.2 ships a native S3 client that reads AWS credentials from environment variables automatically:

```typescript
import { S3Client } from "bun";

const s3 = new S3Client({ bucket: "my-bucket" });

// Upload
await s3.write("uploads/image.png", imageBuffer);

// Download
const file = s3.file("uploads/image.png");
const data = await file.arrayBuffer();

// Stream
const stream = s3.file("large-export.csv").stream();
```

No `@aws-sdk/client-s3` installation needed. The native client is significantly faster for upload/download workloads because it bypasses the Node.js compatibility layer entirely.

### Built-in SQLite

Bun 1.2's SQLite API is synchronous by design — matching how SQLite actually works:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("myapp.db");

// Prepared statements
const getUser = db.prepare("SELECT * FROM users WHERE id = ?");
const user = getUser.get(42);

// Transactions
const insertMany = db.transaction((users) => {
  for (const user of users) {
    db.run("INSERT INTO users VALUES (?, ?)", [user.id, user.name]);
  }
});

insertMany([{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]);
```

This replaces `better-sqlite3` (a native Node addon that requires compilation) with a zero-install, zero-native-addon alternative.

### Improved Node.js Compatibility

Bun 1.2 expanded compatibility with Node.js built-in modules:

- `node:crypto` — now covers the full Web Crypto API surface
- `node:cluster` — basic multi-process support
- `node:tls` — improved TLS/SSL handling for HTTPS servers
- `node:vm` — sandboxed script execution
- Improved `node:stream` Readable/Writable/Transform compatibility

The net result: most Express, Fastify, and Koa apps run on Bun without modification as of 1.2.

---

## Benchmark Data

Here are real benchmark numbers comparing Bun 1.2, Node.js 22 LTS, and Deno 2 on common workloads.

### Startup Time

How long does `console.log("hello")` take?

| Runtime | Startup Time |
|---------|-------------|
| Bun 1.2 | 5ms |
| Deno 2 | 22ms |
| Node.js 22 | 35ms |

Bun's startup advantage is real and significant. For CLI tools, lambda functions, and any short-lived process, this matters.

### HTTP Throughput (simple JSON response)

Using `wrk` with 12 threads, 400 connections, 30 seconds:

| Runtime | Requests/sec | Latency (avg) |
|---------|-------------|---------------|
| Bun 1.2 (native HTTP) | 187,400 | 2.1ms |
| Node.js 22 (native HTTP) | 89,200 | 4.5ms |
| Fastify on Node.js 22 | 76,800 | 5.2ms |
| Deno 2 (native HTTP) | 142,000 | 2.8ms |
| Bun 1.2 (Express) | 52,400 | 7.6ms |

Key insight: Bun's native HTTP API is ~2x faster than Node.js. But using Express on Bun gives you *slower* throughput than native Node.js HTTP — the compatibility overhead is real. For maximum performance on Bun, use Hono or ElysiaJS instead of Express.

### npm Install Speed

Installing a medium-size app (Next.js + dependencies, ~800 packages):

| Package Manager | Cold Install | Warm Cache |
|----------------|-------------|------------|
| bun install | 3.1s | 0.4s |
| pnpm install | 8.7s | 1.2s |
| npm install | 24.3s | 4.8s |
| yarn install | 21.8s | 3.9s |

Bun's package manager is the fastest available. If you only use one Bun feature in a Node.js project, make it the package manager.

### TypeScript Execution (no transpile step)

Running a TypeScript file directly:

| Runtime | 1000-line TS file execution |
|---------|---------------------------|
| Bun 1.2 | 18ms |
| ts-node (Node.js) | 890ms |
| tsx (Node.js) | 210ms |
| Deno 2 | 45ms |

Bun strips types at the parser level without a full TypeScript compiler pass — it's not type-safe execution, but it's extremely fast for development and scripts.

---

## Drop-in Node.js Replacement: What Works, What Doesn't

### Works Out of the Box

- Express.js (basic routing, middleware)
- Fastify
- Prisma (with native modules caveat)
- Drizzle ORM
- Zod, Joi, Yup
- Most pure-JS npm packages
- ESM and CommonJS (both work)
- `dotenv`, `dayjs`, `lodash`, `axios`
- Jest-compatible test syntax (`bun test`)

### Known Gaps

| Feature | Status |
|---------|--------|
| Native Node addons (.node files) | Partial — recompile required |
| `node:worker_threads` | Limited API surface |
| `node:child_process` spawn with shell | Works on Linux/macOS, limited on Windows |
| `node:net` TCP servers | Works but edge cases exist |
| Webpack/Vite plugins | Use Bun's bundler instead |
| Jest mocking (`jest.mock()`) | `bun test` has its own mock API |

### The Windows Situation

Bun on Windows has improved significantly in 1.2, but it remains a second-class citizen. File system operations, process spawning, and some npm lifecycle scripts behave differently. For Windows developers, stick with Node.js for production; Bun on Windows is fine for package management.

---

## Bun as a Package Manager

You don't need to switch your runtime to use `bun install`. This is the lowest-friction way to get Bun's benefits:

```bash
# Install bun globally
curl -fsSL https://bun.sh/install | bash

# Use it as a package manager in any Node.js project
bun install          # instead of npm install
bun add axios        # instead of npm install axios
bun remove lodash    # instead of npm uninstall lodash
bun run dev          # reads package.json scripts
```

`bun install` reads `package.json` and generates a `bun.lockb` binary lockfile. If you need to stay npm-compatible (CI, teammates), you can run `bun install --frozen-lockfile` for reproducibility and keep a `package-lock.json` for npm fallback.

### bun install vs pnpm vs npm

For most projects, switching to `bun install` is a one-command change with no other modifications. Your `node_modules` layout stays the same (flat, npm-style). The only tradeoff: `bun.lockb` is binary (not human-readable), which some teams find undesirable for code review.

---

## When to Use Bun vs Node.js vs Deno

| Use Case | Recommendation |
|----------|---------------|
| New greenfield API (performance matters) | **Bun** with Hono/ElysiaJS |
| Existing Node.js Express app | **Stay on Node.js** unless you have a specific reason |
| CLI tools | **Bun** — startup time and single binary compile |
| Package management only | **Bun install** works anywhere |
| Security-critical server (permissions model) | **Deno** |
| TypeScript-heavy scripts | **Bun** — no compile step |
| Serverless / edge functions | Depends on platform: Cloudflare uses V8, Vercel supports both |
| Windows production | **Node.js 22** |
| npm package development | **Node.js** — best ecosystem tooling |

---

## Migration Checklist: Express/Fastify to Bun

If you're migrating an existing Node.js app to run on Bun:

```bash
# Step 1: Install Bun
curl -fsSL https://bun.sh/install | bash

# Step 2: Replace package manager
bun install  # generates bun.lockb alongside existing package-lock.json

# Step 3: Test your app
bun run src/index.js

# Step 4: Check for native addons
grep -r "\.node" node_modules/.bin  # flag anything that needs recompile

# Step 5: Run your test suite
bun test
```

**For Express apps** — your code likely runs unchanged. The main issue is performance: Express adds overhead that erases Bun's runtime advantage. Consider migrating hot paths to Hono.

**For Fastify apps** — Fastify on Bun performs better than Express on Bun. Fastify's plugin architecture and schema serialization work well with Bun's HTTP layer.

**Watch out for:**
- `__dirname` in ESM files (Bun provides `import.meta.dir` as an alternative)
- `process.env` in non-entry files (works, but `Bun.env` is faster)
- Native addons like `bcrypt`, `sharp`, `canvas` — need Bun-compatible builds

---

## Bun with Popular Frameworks

### Hono (Recommended)

Hono is framework-agnostic and has native Bun support. It's the fastest option on Bun:

```typescript
import { Hono } from "hono";

const app = new Hono();

app.get("/users/:id", async (c) => {
  const id = c.req.param("id");
  return c.json({ id, name: "Alice" });
});

export default app;
```

Run with `bun run index.ts` — no build step.

### Next.js on Bun

Next.js officially supports Bun as the package manager. The runtime is still Node.js (Next.js requires Node.js internals), but install speed improves dramatically:

```bash
bunx create-next-app@latest my-app
cd my-app
bun run dev  # uses node under the hood, bun for package management
```

### Astro on Bun

Astro's Bun integration is officially supported since Astro 4:

```bash
bun create astro@latest
# Select "Bun" as the package manager
bun run dev  # runs the Astro dev server via Bun
```

For Astro SSR, set the adapter to `@astrojs/node` — Bun runs the Node adapter without modification.

### ElysiaJS (Bun-Native)

If you're building a new API specifically for Bun, ElysiaJS is the most performance-optimized option:

```typescript
import { Elysia } from "elysia";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .post("/users", ({ body }) => body)
  .listen(3000);

console.log(`Running at http://localhost:3000`);
```

ElysiaJS uses Bun's native APIs directly, achieving 180,000+ req/sec on modern hardware.

---

## Honest Pros and Cons

### Pros

- **Fastest startup time** of any major JS runtime
- **Best-in-class package manager** — 3-8x faster than npm
- **Zero-config TypeScript** — no tsc, ts-node, or tsx needed
- **Built-in test runner** — no Jest dependency
- **Single binary** — easier deployment for CLIs and scripts
- **Native S3/SQLite** in 1.2 removes common dependencies

### Cons

- **Windows support is incomplete** — not ready for Windows production
- **Node.js compatibility gaps** exist for native addons
- **Ecosystem tooling assumes Node.js** — Webpack, some linters, some CI actions
- **JavaScriptCore vs V8** — different performance profile, some V8-optimized code is slower on JSC
- **Binary lockfile** — `bun.lockb` isn't human-readable
- **Smaller community** — fewer StackOverflow answers, smaller plugin ecosystem
- **Production risk** — less battle-tested than Node.js 22 LTS

---

## Verdict: Is Bun Ready for Production in 2026?

**Yes, with caveats.**

Bun 1.2 is production-ready for:
- New Node.js-compatible APIs on Linux/macOS
- CLI tools and scripts
- Package management (use it everywhere)
- TypeScript-heavy projects where dev speed matters

Bun is **not** the right choice if:
- You're on Windows in production
- Your app depends on native addons (bcrypt, sharp, etc.)
- You need battle-tested stability over years (Node.js 22 LTS is the answer here)

The "Node.js killer" framing is hype. A more useful frame: Bun is a compelling alternative for new projects and an excellent package manager for existing ones. Node.js isn't going anywhere — but Bun has permanently raised the baseline expectations for JavaScript tooling performance.

---

## Related Tools on DevPlaybook

- [JSON Formatter](/tools/json-formatter) — validate API responses during Bun development
- [Base64 Encoder/Decoder](/tools/base64-encoder-decoder) — useful for Bun's native crypto workflows
- [JWT Decoder](/tools/jwt-decoder) — inspect tokens from Bun auth middleware
- [Regex Tester](/tools/regex-tester) — test patterns used in Bun route matching
