---
title: "Bun 2.0: Complete Developer Guide for 2026"
description: "Everything you need to know about Bun 2.0 — the all-in-one JavaScript runtime, package manager, bundler, and test runner. Benchmarks vs Node.js, built-in SQLite, TypeScript support, and a full migration guide."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["bun", "javascript", "runtime", "package-manager", "performance"]
readingTime: "11 min read"
---

Bun started as a fast alternative to Node.js. Bun 2.0 is something more: a complete JavaScript development platform that replaces Node.js, npm, webpack, Jest, and your shell scripts — all with a single binary.

This guide covers what Bun 2.0 actually does, how it compares to Node.js in practice, and how to migrate an existing project. Everything here is based on Bun 2.x behavior, not promotional benchmarks.

---

## What Bun Is (and Isn't)

Bun is a JavaScript runtime built on JavaScriptCore (Safari's JS engine, not V8) with a native layer written in Zig. It ships as a single binary that includes:

- **Runtime** — execute JavaScript and TypeScript
- **Package manager** — install packages from npm
- **Bundler** — bundle for browser or server
- **Test runner** — Jest-compatible test API
- **Shell** — `Bun.sh` and the `$` template literal for scripting

The critical distinction: Bun is not a drop-in replacement for everything Node.js does. It aims for Node.js API compatibility, but the coverage is high (~95%) rather than perfect. Some native Node.js addons don't work. Some platform-specific behaviors differ. Test before migrating production systems.

---

## Bun vs. Node.js: Realistic Benchmarks

The official Bun benchmarks show impressive numbers. Real-world performance is more nuanced:

### Startup Time

Bun's startup time is genuinely faster:

```bash
# Node.js: ~50-100ms for hello world
time node -e "console.log('hello')"
# real 0m0.074s

# Bun: ~5-15ms
time bun -e "console.log('hello')"
# real 0m0.012s
```

This matters for CLI tools and scripts that run frequently. It doesn't matter for long-running servers.

### HTTP Server Throughput

Bun's native HTTP server outperforms Node.js in raw throughput, but the gap narrows with real middleware:

| Setup | Req/sec (simple) | Req/sec (with DB query) |
|-------|-----------------|-------------------------|
| Bun.serve | ~120,000 | ~8,000 |
| Node.js http | ~65,000 | ~7,500 |
| Node.js + Fastify | ~55,000 | ~7,200 |
| Node.js + Express | ~25,000 | ~6,800 |

For CPU-bound workloads, the runtime differences shrink. For I/O-bound workloads (which most web applications are), Bun's advantage is modest after your real business logic runs.

### Package Installation

Package installation is where Bun's performance advantage is most consistent:

```bash
# Installing 847 packages (React + Next.js project)
npm install:  45.3s
yarn:         38.1s
pnpm:         18.7s
bun install:   3.2s  ← ~14x faster than npm
```

This improvement is real and consistent. Bun uses a binary lockfile format and parallel downloads with aggressive caching. For monorepos and CI pipelines, this compounds significantly.

---

## TypeScript: Zero-Config Execution

Bun runs TypeScript natively without a build step:

```bash
# No tsc, no ts-node needed
bun run server.ts
```

This works because Bun transpiles TypeScript to JavaScript internally before executing. There's no type checking at runtime — Bun strips types. For type checking, you still use `tsc --noEmit` or an editor integration.

A complete TypeScript HTTP server:

```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: Date.now() });
    }

    if (url.pathname === '/echo' && req.method === 'POST') {
      const body = await req.json();
      return Response.json({ echoed: body });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`Server running at http://localhost:${server.port}`);
```

Run it:

```bash
bun run server.ts
```

---

## Bun.serve: The HTTP Server

`Bun.serve` is lower-level than Express but has less overhead. Key features:

**Request/Response model** — uses the same Web API `Request` and `Response` objects as Cloudflare Workers and the browser fetch API. Code written for one environment is largely portable.

**WebSocket support** — built into `Bun.serve`, no separate package needed:

```typescript
const server = Bun.serve({
  port: 3000,

  fetch(req, server) {
    // Upgrade HTTP requests to WebSocket
    if (server.upgrade(req)) {
      return; // returns undefined on successful upgrade
    }
    return new Response('Expected WebSocket', { status: 400 });
  },

  websocket: {
    open(ws) {
      ws.subscribe('broadcast');
      console.log('Client connected');
    },
    message(ws, message) {
      // Broadcast to all subscribers
      server.publish('broadcast', message);
    },
    close(ws) {
      console.log('Client disconnected');
    },
  },
});
```

**TLS support** — pass `tls` options to serve HTTPS without a reverse proxy:

```typescript
const server = Bun.serve({
  port: 443,
  tls: {
    cert: Bun.file('./cert.pem'),
    key: Bun.file('./key.pem'),
  },
  fetch(req) {
    return new Response('Hello over HTTPS');
  },
});
```

---

## Built-in SQLite: No ORM Required for Simple Cases

Bun ships with a native SQLite binding. No `better-sqlite3`, no `sqlite3` package needed:

```typescript
import { Database } from 'bun:sqlite';

// Open or create a database
const db = new Database('app.db');

// Create schema
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Prepared statements (reuse for performance)
const insertUser = db.prepare('INSERT INTO users (name, email) VALUES ($name, $email)');
const getUserById = db.prepare('SELECT * FROM users WHERE id = $id');
const getAllUsers = db.prepare('SELECT * FROM users ORDER BY created_at DESC');

// Insert
const { lastInsertRowid } = insertUser.run({ $name: 'Alice', $email: 'alice@example.com' });

// Query single row
const user = getUserById.get({ $id: lastInsertRowid });
// { id: 1, name: 'Alice', email: 'alice@example.com', created_at: '...' }

// Query multiple rows
const users = getAllUsers.all();
// [{ id: 1, ... }, ...]

// Transactions
const transferCredits = db.transaction((from: number, to: number, amount: number) => {
  db.prepare('UPDATE accounts SET credits = credits - ? WHERE id = ?').run(amount, from);
  db.prepare('UPDATE accounts SET credits = credits + ? WHERE id = ?').run(amount, to);
});

transferCredits(1, 2, 100); // atomic
```

The `bun:sqlite` API uses synchronous I/O, which matches how SQLite works best. For simple data needs in scripts, CLI tools, or small services, this removes an entire dependency tier.

---

## Bun Test Runner

Bun's test runner uses the Jest API. Existing Jest tests usually run without modification:

```typescript
// user.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';

interface User {
  id: number;
  name: string;
  email: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

describe('User validation', () => {
  test('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  test('rejects invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });

  test('handles edge cases', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('a@b.c')).toBe(true);
  });
});
```

Run tests:

```bash
bun test                    # run all test files
bun test --watch            # re-run on file changes
bun test user.test.ts       # run specific file
bun test --timeout 5000     # 5s timeout per test
```

Bun test is significantly faster than Jest for the same test suite. A project with 200 tests that takes 8 seconds in Jest typically runs in under 1 second in Bun. The Jest-compatible API means migrating is straightforward.

---

## Bun Bundler

Bun can bundle your application for browser or server deployment:

```bash
# Bundle for browser
bun build ./src/index.ts --outdir ./dist --target browser

# Bundle for Bun (server-side, ESM)
bun build ./src/server.ts --outdir ./dist --target bun

# Bundle with minification
bun build ./src/index.ts --outdir ./dist --minify

# Watch mode
bun build ./src/index.ts --outdir ./dist --watch
```

The bundler handles:
- TypeScript and JSX/TSX transpilation
- npm package resolution and tree-shaking
- CSS and static asset handling
- Source maps
- Code splitting (multiple entry points)

For complex builds with advanced plugin requirements (Sass, custom loaders, complex aliasing), webpack or Vite may still be preferable. For standard TypeScript applications, Bun's bundler covers most needs.

---

## Package Manager

Bun's package manager is a drop-in replacement for npm:

```bash
# Install all dependencies (reads package.json)
bun install

# Add a package
bun add express
bun add -d typescript         # dev dependency
bun add -g typescript         # global

# Remove a package
bun remove express

# Run a script
bun run build
bun run test

# Run any binary from node_modules
bunx tsc --init              # like npx, but faster
```

Bun generates a `bun.lockb` binary lockfile. This is faster to read/write than `package-lock.json` but isn't human-readable. Commit it to version control — it locks dependencies exactly as `package-lock.json` does.

**Compatibility note:** Bun reads `package.json` and installs from the npm registry. All npm packages work, including packages with native bindings, as long as they're compiled for your platform. Bun can't run packages that require Node.js-specific internal APIs not yet implemented in Bun.

---

## Migrating from Node.js to Bun

### Step 1: Check Compatibility

Before migrating, audit your dependencies:

```bash
# Install Bun: https://bun.sh/docs/installation
curl -fsSL https://bun.sh/install | bash

# Try installing in your project
cd your-project
bun install

# Run your entry point
bun run src/index.ts
```

Most errors at this stage are:
- Native addons that don't have Bun binaries (check `bun.sh/roadmap`)
- Use of unimplemented Node.js APIs (`vm`, `cluster`, some `crypto` methods)
- CommonJS modules with complex circular dependencies

### Step 2: Replace Test Runner

If you're using Jest, replace it:

```json
// package.json — before
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0"
  }
}
```

```json
// package.json — after
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch"
  }
}
```

Remove `jest.config.js` or `jest.config.ts`. Bun discovers test files matching `*.test.ts`, `*.spec.ts`, `test/*.ts`, etc. automatically.

### Step 3: Update TypeScript Config

Bun's TypeScript needs `types` set to include Bun's globals:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true
  }
}
```

Install `bun-types`:

```bash
bun add -d bun-types
```

### Step 4: Migrate HTTP Server (Optional)

If you want to use `Bun.serve` instead of Express:

```typescript
// Before (Express)
import express from 'express';
const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users');
  res.json(users);
});

app.listen(3000);
```

```typescript
// After (Bun.serve)
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/users') {
      const users = db.prepare('SELECT * FROM users').all();
      return Response.json(users);
    }

    return new Response('Not found', { status: 404 });
  },
});
```

This migration is optional. Express runs fine on Bun — you get Bun's faster startup and package installation without rewriting your HTTP layer.

---

## Bun Shell: Script Replacement

Bun includes a cross-platform shell for replacing bash scripts:

```typescript
// scripts/build.ts
import { $ } from 'bun';

// Run commands (throws on non-zero exit)
await $`npm run typecheck`;
await $`bun build ./src/index.ts --outdir ./dist --minify`;

// Capture output
const version = await $`git describe --tags`.text();
console.log(`Building version: ${version.trim()}`);

// Environment variables
const result = await $`NODE_ENV=production bun run start`.env({
  NODE_ENV: 'production',
  PORT: '8080',
});

// Conditional execution
if (process.env.CI) {
  await $`bun test --bail`;
} else {
  await $`bun test`;
}
```

The `$` template literal runs commands using a built-in shell that works on Windows, macOS, and Linux. This is useful for replacing `package.json` scripts that get complex or platform-specific.

---

## When to Use Bun vs. Stay on Node.js

**Use Bun for:**
- New projects with no legacy constraints
- CLI tools where startup time matters
- Scripts that currently use `ts-node` or `tsx`
- Projects where install speed is a bottleneck (CI pipelines, monorepos)
- Applications where you want to reduce the toolchain (no separate test runner, bundler, type-runner)

**Stay on Node.js when:**
- You depend on native addons not yet ported to Bun
- You need specific Node.js APIs not yet implemented
- You're on a platform Bun doesn't support (some embedded Linux, Alpine without glibc)
- Your team is large and change carries high coordination cost
- You need long-term stability guarantees (Node.js LTS policy is more established)

The practical answer for most 2026 projects: use Bun for new TypeScript services, scripts, and tools. Keep Node.js for existing production systems that work well until a natural migration opportunity presents itself.

---

## Getting Started in 5 Minutes

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Create a new project
mkdir my-bun-app && cd my-bun-app
bun init  # generates package.json, tsconfig.json, index.ts

# Add a dependency
bun add hono  # or express, fastify, etc.

# Run your app
bun run index.ts

# Run tests
bun test
```

Bun 2.0 represents a mature, production-viable alternative to the Node.js toolchain. The performance advantages are real — especially for startup time and package installation. The compatibility story is strong enough for most TypeScript applications. Start by migrating scripts and CLI tools, prove the benefits, then expand from there.
