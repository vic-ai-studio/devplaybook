---
title: "Bun Runtime: The All-in-One JavaScript Toolkit - Complete Guide 2026"
description: "Everything you need to know about Bun runtime in 2026: installation, package manager, bundler, test runner, and how it compares to Node.js and Deno on speed benchmarks."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["bun", "javascript", "runtime", "nodejs", "performance", "bundler", "package-manager"]
readingTime: "12 min read"
---

JavaScript tooling has a reputation for being slow. Slow installs, slow builds, slow test runs. Bun was built to fix that. Created by Jarred Sumner and first released in 2022, Bun is an all-in-one JavaScript runtime, package manager, bundler, and test runner that runs on JavaScriptCore (the same engine that powers Safari) rather than V8.

The result? Dramatically faster startup times, faster package installs, and a unified toolchain that eliminates the need to juggle separate tools like npm, webpack, and Jest.

This guide covers everything you need to know about Bun in 2026: how it works, what makes it fast, how to use its core features, and how it compares to Node.js and Deno in real benchmarks.

---

## What Is Bun?

Bun is a JavaScript runtime that aims to be a drop-in replacement for Node.js. But unlike Node.js—which requires separate tools for bundling (webpack/Rollup/esbuild), testing (Jest/Vitest), and package management (npm/yarn/pnpm)—Bun ships all of these capabilities in a single binary.

**Core components:**
- **Runtime**: Runs `.js`, `.ts`, `.jsx`, `.tsx` files natively
- **Package manager**: `bun install`, `bun add`, `bun remove`
- **Bundler**: `bun build` for browser and Node-compatible output
- **Test runner**: `bun test` with Jest-compatible API
- **Shell scripting**: Cross-platform shell with `Bun.sh`

The binary is written in Zig, a systems programming language designed for performance and safety, which contributes to its speed.

---

## Installing Bun

Installing Bun is straightforward across all major platforms.

**macOS and Linux:**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (via PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**npm (if you prefer):**

```bash
npm install -g bun
```

Verify installation:

```bash
bun --version
# 1.1.x or later
```

Upgrading Bun is a single command:

```bash
bun upgrade
```

### Using Bun in a Project

Initialize a new project:

```bash
mkdir my-app
cd my-app
bun init
```

This creates a `package.json`, `tsconfig.json`, and a starter `index.ts` file. To run it:

```bash
bun run index.ts
```

Bun executes TypeScript natively without a compilation step. No `tsc`, no `ts-node`.

---

## Bun as a Package Manager

Bun's package manager is often cited as its most immediately useful feature. It can install packages 10–30x faster than npm and 5–10x faster than pnpm.

**Basic commands:**

```bash
# Install all dependencies
bun install

# Add a package
bun add express
bun add -d typescript

# Remove a package
bun remove express

# Run a script
bun run build
bun run dev

# Execute a package binary
bunx create-next-app
```

### How Bun Installs Packages So Fast

Bun uses several techniques to speed up installs:

1. **Global cache**: Packages are stored in a global cache (`~/.bun/install/cache`). Second installs skip the network entirely.
2. **Parallel downloads**: Multiple packages are fetched simultaneously.
3. **Binary format**: Bun uses a binary lockfile (`bun.lockb`) instead of JSON, which is faster to read and write.
4. **Cloning instead of copying**: Bun hard-links or clones files from the global cache, avoiding redundant I/O.

**Benchmark comparison (installing a medium-sized project):**

| Tool | Time |
|------|------|
| npm  | ~15s |
| yarn | ~8s  |
| pnpm | ~5s  |
| bun  | ~0.6s (cached) |

The difference is most dramatic on repeated installs (CI caches, developer re-installs).

### Compatibility with npm

Bun reads `package.json`, `node_modules`, and existing lockfiles. Switching a project from npm to Bun typically requires just replacing the `npm install` call:

```bash
# Before
npm install

# After
bun install
```

Bun also supports workspaces (monorepos) using the same syntax as npm/yarn workspaces.

---

## Bun as a Bundler

Bun includes a fast bundler that outputs JavaScript for browsers, Node.js, or Bun itself.

**Basic bundling:**

```bash
bun build ./src/index.ts --outdir ./dist
```

**Common options:**

```bash
# Target browser
bun build ./src/index.ts --outdir ./dist --target browser

# Minify output
bun build ./src/index.ts --outdir ./dist --minify

# Bundle as a library (no tree-shaking of exports)
bun build ./src/index.ts --outdir ./dist --format esm

# Watch mode
bun build ./src/index.ts --outdir ./dist --watch
```

### Bundler Configuration

For more complex setups, use the JavaScript API:

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "browser",
  format: "esm",
  minify: true,
  splitting: true,  // Code splitting
  plugins: [
    // Custom plugins supported
  ],
});
```

### Bun vs esbuild

Bun's bundler is built on top of esbuild's approach but integrates tightly with the Bun runtime. For pure bundling performance, esbuild is slightly faster, but Bun's bundler is more convenient when you're already using Bun for everything else. You don't need to install esbuild separately.

---

## Bun as a Test Runner

`bun test` is a Jest-compatible test runner that runs significantly faster than Jest for most projects.

**Setup:**

No configuration required. Create a file ending in `.test.ts`, `.spec.ts`, or `_test.ts`:

```typescript
// math.test.ts
import { describe, test, expect } from "bun:test";
import { add, multiply } from "./math";

describe("math utilities", () => {
  test("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  test("multiplies two numbers", () => {
    expect(multiply(4, 5)).toBe(20);
  });
});
```

Run all tests:

```bash
bun test
```

Run a specific file:

```bash
bun test math.test.ts
```

Watch mode:

```bash
bun test --watch
```

### Supported Jest APIs

Bun supports the most commonly used Jest APIs out of the box:

- `describe`, `test`, `it`
- `expect` with matchers: `toBe`, `toEqual`, `toContain`, `toThrow`, `toBeNull`, `toMatchSnapshot`, etc.
- `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
- `mock`, `spyOn`, `fn`
- `jest.mock()` (via `mock()` in `bun:test`)

**Mocking example:**

```typescript
import { test, expect, mock } from "bun:test";
import { fetchUser } from "./api";

mock.module("./api", () => ({
  fetchUser: mock(() => Promise.resolve({ id: 1, name: "Alice" })),
}));

test("fetches a user", async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe("Alice");
});
```

### Code Coverage

```bash
bun test --coverage
```

Generates a coverage report in the terminal. Combine with `--coverage-reporter lcov` to output to a file for CI integration.

---

## Bun Runtime Features

### Native TypeScript Support

Bun runs TypeScript natively. No compilation step, no `ts-node`:

```bash
bun run server.ts
```

Type errors are not caught at runtime—Bun strips types without checking them. For type checking, run `tsc --noEmit` separately.

### JSX Support

JSX works out of the box for React and other frameworks:

```bash
bun run app.tsx
```

### Web APIs Built-In

Bun ships with web-standard APIs including `fetch`, `Request`, `Response`, `ReadableStream`, `WritableStream`, `WebSocket`, `crypto`, and more. Many Node.js projects that use these APIs will work with Bun without modification.

### Bun.serve() — Built-In HTTP Server

Bun includes a high-performance HTTP server:

```typescript
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response("Hello from Bun!");
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

Bun's HTTP server consistently benchmarks 2–4x faster than Node.js's `http` module and Express.

### File I/O

```typescript
// Read a file
const text = await Bun.file("data.txt").text();
const json = await Bun.file("config.json").json();
const bytes = await Bun.file("image.png").arrayBuffer();

// Write a file
await Bun.write("output.txt", "Hello, world!");
await Bun.write("data.json", JSON.stringify({ key: "value" }));
```

---

## Bun vs Node.js: Performance Benchmarks

These benchmarks represent typical results in 2025–2026 across common use cases.

### Startup Time

```
Node.js:  ~50ms
Bun:      ~6ms
```

This matters for short-lived scripts, serverless functions, and CLI tools.

### HTTP Server Throughput (requests/second, simple "Hello World")

```
Node.js (http): ~30,000 req/s
Express:        ~20,000 req/s
Bun.serve():    ~90,000 req/s
```

### Package Install (medium project, cold cache)

```
npm:  15.2s
pnpm: 4.8s
bun:  1.1s
```

### Test Suite Run (500 tests, simple unit tests)

```
Jest:     18s
Vitest:   4s
bun test: 1.5s
```

*Actual benchmarks vary based on machine, project size, and test complexity.*

---

## Bun vs Deno

Bun and Deno are both "next-generation" JavaScript runtimes competing with Node.js, but they have different philosophies.

| Feature | Bun | Deno |
|---------|-----|------|
| Engine | JavaScriptCore | V8 |
| TypeScript | Native (no typecheck) | Native (no typecheck) |
| npm compatibility | Full | Full (since Deno 2.0) |
| Package manager | Built-in (`bun install`) | `deno install` |
| Test runner | `bun test` (Jest-compatible) | `deno test` |
| Bundler | Built-in | `deno bundle` |
| Security | Node.js-style (no sandbox) | Explicit permission flags |
| Web APIs | ✅ | ✅ |
| Startup speed | Very fast | Fast |

**Choose Bun if:**
- You want maximum performance
- You're migrating an existing Node.js project
- You want a drop-in replacement with minimal changes

**Choose Deno if:**
- Security isolation is a priority
- You want first-class TypeScript type checking
- You prefer the permission-based security model

---

## Migrating a Node.js Project to Bun

Most Node.js projects migrate to Bun in minutes:

1. **Install Bun** and remove `node_modules`
2. **Replace `npm install`** with `bun install`
3. **Replace `node index.js`** with `bun run index.js`
4. **Replace `npx`** with `bunx`
5. **Replace `npm test`** with `bun test` (if using Jest)

**Check compatibility:**

```bash
bun run --bun index.ts
```

The `--bun` flag forces all imports to resolve through Bun's module system.

Common incompatibilities:
- Some native Node addons (`.node` files) may not work
- Modules that rely on Node internals not yet implemented by Bun
- Check [bun.sh/guides](https://bun.sh/guides) for the compatibility tracker

---

## Using Bun with Frameworks

### Next.js

```bash
bunx create-next-app@latest my-app
cd my-app
bun install
bun dev
```

Note: Next.js still uses Node.js under the hood for production builds.

### Hono (Bun-first framework)

```bash
bun create hono my-app
cd my-app
bun dev
```

Hono is designed for Bun and other edge runtimes, and is an excellent choice for new API projects.

### Elysia (Bun-native framework)

```typescript
import { Elysia } from "elysia";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .get("/user/:id", ({ params: { id } }) => `User ${id}`)
  .listen(3000);
```

Elysia is purpose-built for Bun and achieves the highest HTTP throughput of any Node-compatible framework.

---

## Summary

Bun in 2026 is production-ready for most use cases. Its package manager alone is worth adopting even if you continue using Node.js for your runtime—just replace `npm install` with `bun install` in your CI scripts and watch your build times shrink.

For new projects, Bun's all-in-one approach eliminates configuration overhead. No separate Jest config, no webpack config, no `.babelrc`. You get fast installs, fast tests, fast builds, and fast runtime performance in a single binary.

**Quick start checklist:**
- Install: `curl -fsSL https://bun.sh/install | bash`
- New project: `bun init`
- Replace npm: `bun install` / `bun add` / `bun remove`
- Run TypeScript: `bun run index.ts`
- Run tests: `bun test`
- Bundle: `bun build ./src/index.ts --outdir ./dist`

Explore more developer tools at [DevPlaybook](/tools) — including our [JavaScript runtime comparison tool](/tools/runtime-comparison) and [package.json validator](/tools/package-json-validator).
