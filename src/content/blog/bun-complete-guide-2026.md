---
title: "Bun 1.x Complete Guide: Runtime, Package Manager, and Bundler 2026"
description: "Complete guide to Bun 1.x in 2026 — installation, bun run/install/build/test, performance vs Node.js, Bun.serve(), SQLite, and when to switch."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["bun", "javascript", "runtime", "nodejs", "performance", "bundler", "package-manager"]
readingTime: "12 min read"
---

Bun is no longer the new kid on the block. After shipping 1.0 in 2023 and spending 2024–2025 hardening compatibility and adding features, Bun 1.x in 2026 is a legitimate Node.js alternative for many workloads — and a near drop-in replacement for most. This guide covers everything: installation, the full CLI, performance numbers, built-in APIs, and when Bun is the right tool for your project.

---

## What Is Bun?

Bun is a JavaScript runtime, package manager, bundler, and test runner — all in one binary. It's written in Zig and uses JavaScriptCore (Safari's JS engine) instead of V8 (Chrome/Node.js).

The key goals:
- **Speed** — faster startup, faster installs, faster builds
- **Compatibility** — run existing Node.js code without modification
- **All-in-one** — replace Node.js, npm/pnpm/yarn, esbuild, and Jest with a single tool

```bash
# One binary handles everything
bun run server.ts    # Runtime
bun install          # Package manager
bun build ./app.ts   # Bundler
bun test             # Test runner
```

---

## Installation

### macOS / Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

This installs `~/.bun/bin/bun`. Add it to your PATH (the installer does this automatically for bash/zsh).

### Windows

Bun has native Windows support since 1.1:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Or via npm (slower, but works everywhere):

```bash
npm install -g bun
```

### Version Management

```bash
# Upgrade to latest
bun upgrade

# Install a specific version
curl -fsSL https://bun.sh/install | bash -s "bun-v1.1.0"
```

### Verify Installation

```bash
bun --version   # e.g., 1.1.29
bun --help
```

---

## Runtime: `bun run`

Bun runs JavaScript and TypeScript natively — no `ts-node`, no `tsx`, no transpilation step needed.

### Basic Usage

```bash
# Run a TypeScript file directly
bun run server.ts

# Run with watch mode (auto-restart on changes)
bun --watch run server.ts

# Hot reload (preserves state in supported frameworks)
bun --hot run server.ts
```

### Running npm Scripts

```bash
bun run dev        # Same as npm run dev
bun run build
bun run test
```

### Environment Variables

```bash
# .env files are loaded automatically
bun run server.ts

# Override specific vars
PORT=8080 bun run server.ts

# Load a specific .env file
bun run --env-file=.env.production server.ts
```

### TypeScript Without Config

Bun transpiles TypeScript out of the box. No `tsconfig.json` required to run `.ts` files, though you'll want one for type checking:

```typescript
// Works immediately with no setup
const greet = (name: string): string => `Hello, ${name}!`;
console.log(greet("Bun"));
```

```bash
bun run greet.ts
# Hello, Bun!
```

---

## Package Manager: `bun install`

Bun's package manager is consistently the fastest available. It installs packages 10–30x faster than npm and 3–5x faster than pnpm by using a global cache with hardlinks.

### Core Commands

```bash
# Install all dependencies from package.json
bun install

# Add a package
bun add express
bun add -d typescript          # devDependency
bun add -g typescript          # global
bun add react@18               # specific version

# Remove a package
bun remove lodash

# Update packages
bun update
bun update react               # specific package

# Run a binary from node_modules
bun x tsc --init               # like npx
bunx tsc --init                # shorthand
```

### Performance Comparison

On a typical medium-sized project (100 dependencies):

| Operation | npm | pnpm | Bun |
|-----------|-----|------|-----|
| Cold install | 45s | 20s | 4s |
| Warm install (cached) | 12s | 6s | 0.5s |
| Lock file generation | 8s | 5s | 0.8s |

These numbers vary by project, but Bun's advantage is real and consistent.

### bun.lockb

Bun uses a binary lockfile (`bun.lockb`) for speed. It's not human-readable, but you can print it:

```bash
bun bun.lockb
```

For teams that need a text lockfile (e.g., for GitHub dependency review), add this to `package.json`:

```json
{
  "bun": {
    "lockfile": {
      "print": "yarn"
    }
  }
}
```

### Workspaces

Bun supports npm workspaces:

```json
// package.json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

```bash
bun install                          # installs all workspaces
bun run --filter ./apps/web dev      # run script in specific workspace
```

---

## Bundler: `bun build`

Bun's bundler targets browsers and edge runtimes. It's fast (uses Bun's native parser) but less feature-rich than Vite or Rollup for complex setups.

### Basic Build

```bash
# Bundle for browser
bun build ./src/index.ts --outdir ./dist

# Single output file
bun build ./src/index.ts --outfile ./dist/bundle.js

# Minify
bun build ./src/index.ts --outdir ./dist --minify

# Target specific environment
bun build ./src/index.ts --outdir ./dist --target browser
bun build ./src/index.ts --outdir ./dist --target bun
bun build ./src/index.ts --outdir ./dist --target node
```

### Code Splitting

```bash
bun build ./src/index.ts --outdir ./dist --splitting
```

### Build API

For programmatic builds:

```typescript
const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true,
  splitting: true,
  target: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"',
    __API_URL__: '"https://api.example.com"',
  },
});

if (!result.success) {
  console.error('Build failed:', result.logs);
}
```

### Plugins

```typescript
import { plugin } from 'bun';

plugin({
  name: 'svg-loader',
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async ({ path }) => {
      const contents = await Bun.file(path).text();
      return { contents: `export default ${JSON.stringify(contents)}`, loader: 'js' };
    });
  },
});
```

---

## Test Runner: `bun test`

Bun's test runner is Jest-compatible. Most Jest tests run without modification.

### Writing Tests

```typescript
// math.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';

describe('add', () => {
  it('adds two numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('handles negative numbers', () => {
    expect(-1 + -1).toBe(-2);
  });
});
```

### Running Tests

```bash
bun test                     # all tests
bun test math.test.ts        # specific file
bun test --watch             # watch mode
bun test --coverage          # coverage report
bun test --timeout 5000      # 5s timeout per test
```

### Mocking

```typescript
import { mock, spyOn } from 'bun:test';

const fetchMock = mock(() => Promise.resolve({ json: () => ({ id: 1 }) }));
globalThis.fetch = fetchMock;

// Spy on object methods
const spy = spyOn(console, 'log');
```

### Performance vs Jest

Bun's test runner starts significantly faster than Jest because there's no compilation step:

| Scenario | Jest (ts-jest) | Vitest | Bun test |
|----------|---------------|--------|----------|
| Startup time | 2–4s | 0.5–1s | 0.1–0.3s |
| 100 unit tests | 8–12s | 2–4s | 0.5–1s |

---

## Built-in APIs

Bun ships built-in APIs that replace many common npm packages.

### Bun.serve() — HTTP Server

```typescript
const server = Bun.serve({
  port: 3000,
  hostname: '0.0.0.0',

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response('Hello from Bun!');
    }

    if (url.pathname === '/api/data') {
      return Response.json({ message: 'Hello', timestamp: Date.now() });
    }

    return new Response('Not Found', { status: 404 });
  },

  error(error: Error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

### WebSocket Server

```typescript
const server = Bun.serve<{ username: string }>({
  port: 3000,

  fetch(req, server) {
    const username = new URL(req.url).searchParams.get('name') ?? 'Anonymous';
    const upgraded = server.upgrade(req, { data: { username } });
    if (upgraded) return;
    return new Response('HTTP response');
  },

  websocket: {
    open(ws) {
      console.log(`${ws.data.username} connected`);
      ws.subscribe('chat');
    },
    message(ws, message) {
      ws.publish('chat', `${ws.data.username}: ${message}`);
    },
    close(ws) {
      console.log(`${ws.data.username} disconnected`);
    },
  },
});
```

### SQLite — Built-in Database

No `better-sqlite3` needed. Bun ships SQLite natively:

```typescript
import { Database } from 'bun:sqlite';

const db = new Database('myapp.sqlite');

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  )
`);

// Prepared statements
const insertUser = db.prepare('INSERT INTO users (name, email) VALUES ($name, $email)');
insertUser.run({ $name: 'Alice', $email: 'alice@example.com' });

// Query
const getUser = db.prepare('SELECT * FROM users WHERE email = $email');
const user = getUser.get({ $email: 'alice@example.com' });
console.log(user); // { id: 1, name: 'Alice', email: 'alice@example.com' }

// All rows
const allUsers = db.prepare('SELECT * FROM users').all();
```

### File I/O

```typescript
// Read file (lazy)
const file = Bun.file('./data.json');
const data = await file.json();
const text = await file.text();
const buffer = await file.arrayBuffer();

// Write file
await Bun.write('./output.txt', 'Hello, Bun!');
await Bun.write('./data.json', JSON.stringify({ key: 'value' }));

// Streaming write
const writer = Bun.file('./large.log').writer();
writer.write('line 1\n');
writer.write('line 2\n');
await writer.flush();
```

### Hashing and Crypto

```typescript
// Fast hashing (no crypto import)
const hash = Bun.hash('hello world');           // numeric hash
const md5 = new Bun.CryptoHasher('md5').update('hello').digest('hex');
const sha256 = new Bun.CryptoHasher('sha256').update('data').digest('hex');

// Password hashing (bcrypt-compatible)
const hashed = await Bun.password.hash('my-password');
const valid = await Bun.password.verify('my-password', hashed);
```

---

## Node.js Compatibility

Bun targets 100% Node.js API compatibility. As of 2026, most Node.js code runs without modification. Compatibility highlights:

| Module | Status |
|--------|--------|
| `fs` / `fs/promises` | Full |
| `path` | Full |
| `http` / `https` | Full |
| `net` / `tls` | Full |
| `crypto` | Full |
| `stream` | Full |
| `worker_threads` | Full |
| `child_process` | Full |
| `cluster` | Full |
| `v8` | Partial |
| `inspector` | Partial |

The main incompatibilities are edge cases in `v8` internals and some `inspector` APIs. For most production applications, you won't hit them.

---

## Performance vs Node.js

Benchmark results vary by workload, but typical findings:

| Benchmark | Node.js 22 | Bun 1.x | Bun advantage |
|-----------|-----------|---------|---------------|
| HTTP requests/sec (hello world) | ~75k | ~180k | 2.4x |
| Startup time (empty script) | ~80ms | ~7ms | 11x |
| File read (1MB) | ~12ms | ~4ms | 3x |
| JSON parse (10MB) | ~45ms | ~18ms | 2.5x |
| SQLite queries/sec | N/A (library) | ~2.5M | N/A |

**Important caveat:** Real-world application performance depends more on your database queries, external API calls, and business logic than the runtime. Bun's advantages are most visible in startup time, I/O-heavy workloads, and scripting tasks.

---

## When to Use Bun

**Use Bun when:**
- You're starting a new project and want the fastest setup
- You're building CLI tools or scripts where startup time matters
- You want a simpler toolchain (one tool instead of node + npm + esbuild + jest)
- You're building an HTTP server with I/O-heavy workloads
- You want built-in SQLite without a native module dependency

**Stick with Node.js when:**
- Your project uses native C++ addons (`node-gyp`) — these often don't work in Bun
- Your team has deep Node.js expertise and existing tooling
- You rely on Node.js-specific features (`cluster`, `inspector`, `vm` module details)
- You need the absolute widest library compatibility for obscure packages

---

## Migrating from Node.js

For most projects, migration is straightforward:

```bash
# In your project root
bun install          # generates bun.lockb alongside package.json
bun run dev          # replace "npm run dev"
```

Replace npm scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build ./src/index.ts --outdir ./dist --minify",
    "test": "bun test",
    "start": "bun run dist/index.js"
  }
}
```

Check for incompatible packages:

```bash
# Run your test suite — failures reveal incompatibilities
bun test
```

---

## Summary

Bun 1.x in 2026 is mature, fast, and production-ready for most use cases. Its all-in-one nature simplifies toolchains dramatically, and the performance wins are real — especially for startup time and I/O.

For new projects without native addon dependencies, Bun is an excellent default choice. For existing Node.js projects, the migration is usually painless and the benefits are immediate.

The JavaScript ecosystem is embracing Bun: major frameworks like Hono, ElysiaJS, and frameworks like Next.js and SvelteKit all support it. It's no longer an experiment — it's a first-class runtime.
