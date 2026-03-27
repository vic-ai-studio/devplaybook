---
title: "Bun 1.2 Complete Guide: Everything New in 2026"
description: "Deep dive into Bun 1.2 — new APIs, improved Node.js compatibility, built-in SQLite upgrades, Bun.serve() enhancements, package manager improvements, and real-world migration patterns."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["bun", "javascript", "runtime", "nodejs", "typescript", "performance", "sqlite", "bun-1.2"]
readingTime: "14 min read"
---

Bun 1.2 landed as one of the most significant releases since Bun hit 1.0. Where earlier versions focused on Node.js compatibility, 1.2 shifts gear: it's about maturity, new built-in APIs, and production readiness. This guide covers everything new, what changed, and how to migrate confidently.

---

## What's New in Bun 1.2

Bun 1.2 focuses on three major themes:

1. **Improved Node.js compatibility** — nearly all popular npm packages now work out-of-the-box
2. **Expanded built-in APIs** — more things you can do without installing dependencies
3. **Better package manager UX** — faster, smarter, and safer dependency management

Let's dig in.

---

## Installation and Upgrade

```bash
# Fresh install (Linux/macOS)
curl -fsSL https://bun.sh/install | bash

# Upgrade existing Bun
bun upgrade

# Check version
bun --version
# 1.2.x
```

On Windows, Bun 1.2 ships with significantly improved Windows support — most features that previously required WSL now work natively.

---

## Node.js Compatibility Wins

### `node:cluster` Support

Bun 1.2 adds initial support for Node's `cluster` module, which forks the main process to leverage multiple CPU cores:

```javascript
import cluster from "node:cluster";
import os from "node:os";
import { createServer } from "node:http";

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  console.log(`Primary ${process.pid} — forking ${numCPUs} workers`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker) => {
    console.log(`Worker ${worker.process.pid} died, restarting...`);
    cluster.fork();
  });
} else {
  createServer((req, res) => {
    res.writeHead(200);
    res.end("Hello from worker " + process.pid);
  }).listen(8080);
}
```

This unlocks a class of Node.js applications that previously couldn't run on Bun.

### `node:vm` Improvements

The `vm` module now supports `vm.Script` and sandboxed execution more completely:

```javascript
import vm from "node:vm";

const code = `x * 2`;
const script = new vm.Script(code);
const context = vm.createContext({ x: 21 });
const result = script.runInContext(context);
console.log(result); // 42
```

### `node:crypto` Completeness

Bun 1.2 fills in many missing `crypto` APIs including `crypto.generateKeyPairSync`, `KeyObject`, and X.509 certificate support:

```javascript
import { generateKeyPairSync, createSign, createVerify } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const sign = createSign("SHA256");
sign.update("hello world");
const signature = sign.sign(privateKey, "hex");

const verify = createVerify("SHA256");
verify.update("hello world");
console.log(verify.verify(publicKey, signature, "hex")); // true
```

---

## Built-in APIs: What's New

### `Bun.sql` — Native SQL Client (Major Addition)

Bun 1.2 introduces `Bun.sql`, a built-in PostgreSQL client that requires zero dependencies:

```typescript
import { sql } from "bun";

// Connect to Postgres — uses DATABASE_URL env by default
const users = await sql`SELECT * FROM users WHERE active = ${true}`;
console.log(users);

// Parameterized queries (SQL injection safe)
const userId = 42;
const user = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Transactions
const result = await sql.transaction(async (tx) => {
  const newUser = await tx`
    INSERT INTO users (name, email) VALUES (${"Alice"}, ${"alice@example.com"})
    RETURNING *
  `;
  await tx`
    INSERT INTO audit_log (action, user_id) VALUES (${"create"}, ${newUser[0].id})
  `;
  return newUser[0];
});
```

No `pg`, no `postgres.js`, no ORM needed for simple queries. The template literal syntax handles parameterization automatically — no SQL injection risk.

Configuration:

```typescript
import { SQL } from "bun";

const db = new SQL({
  host: "localhost",
  port: 5432,
  database: "myapp",
  username: "postgres",
  password: process.env.DB_PASSWORD,
  tls: true,
  // Connection pooling built-in
  max: 10,
  idleTimeout: 30,
});
```

### `Bun.sqlite` Upgrades

The built-in SQLite API (available since Bun 0.x) gets significant improvements in 1.2:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("app.db");

// WAL mode for better concurrent reads
db.exec("PRAGMA journal_mode = WAL");

// Prepared statements with typed results
const stmt = db.prepare<{ id: number; name: string }, [number]>(
  "SELECT id, name FROM users WHERE id = ?"
);
const user = stmt.get(1);

// Batch operations (much faster than individual inserts)
const insertMany = db.prepare("INSERT INTO logs (message, ts) VALUES ($1, $2)");
db.transaction(() => {
  for (const log of logsArray) {
    insertMany.run(log.message, Date.now());
  }
})();

// SQLite in memory for tests
const testDb = new Database(":memory:");
```

New in 1.2: **session extensions** and **user-defined functions**:

```typescript
// Define custom SQL functions
db.function("double", (x: number) => x * 2);
const result = db.query("SELECT double(21)").get();
// { "double(21)": 42 }
```

### `Bun.serve()` — HTTP/2 and WebSocket Improvements

```typescript
import { serve } from "bun";

const server = serve({
  port: 3000,

  // HTTP/2 support (new in 1.2)
  tls: {
    cert: Bun.file("./cert.pem"),
    key: Bun.file("./key.pem"),
  },

  // Route-based handler
  routes: {
    "/api/users": async (req) => {
      const users = await fetchUsers();
      return Response.json(users);
    },
    "/ws": {
      upgrade: true,
    },
  },

  // Fallback handler
  fetch(req) {
    return new Response("Not found", { status: 404 });
  },

  // WebSocket handlers
  websocket: {
    open(ws) {
      ws.subscribe("chat");
    },
    message(ws, msg) {
      server.publish("chat", msg);
    },
    close(ws) {
      ws.unsubscribe("chat");
    },
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

**Route-based handlers** are new in 1.2 and enable trie-based routing without a framework:

```typescript
serve({
  routes: {
    "/": () => new Response("Home"),
    "/api/health": () => Response.json({ ok: true }),
    "/api/users/:id": (req, params) => {
      return Response.json({ id: params.id });
    },
    // Wildcard
    "/static/*": async (req) => {
      const url = new URL(req.url);
      return new Response(Bun.file(`./public${url.pathname}`));
    },
  },
});
```

### `Bun.file()` Streaming Improvements

```typescript
// Stream large files without buffering
const file = Bun.file("large-video.mp4");

// Range requests (great for video streaming)
serve({
  fetch(req) {
    const rangeHeader = req.headers.get("range");
    if (rangeHeader) {
      const [start, end] = rangeHeader
        .replace("bytes=", "")
        .split("-")
        .map(Number);
      return new Response(file.slice(start, end + 1), {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${file.size}`,
          "Content-Type": file.type,
        },
      });
    }
    return new Response(file);
  },
});
```

---

## Package Manager Improvements

### `bun install` — Lockfile v3

Bun 1.2 introduces a new binary lockfile format (v3) that's smaller and faster to read. Migration is automatic on first install.

```bash
# Upgrade lockfile
bun install
# Bun generates/upgrades bun.lockb automatically
```

New flags:

```bash
# Install exact versions (no range resolution)
bun install --exact

# Trust all scripts (skip interactive prompts in CI)
bun install --trust

# Dry run (show what would change)
bun install --dry-run

# Filter workspaces
bun install --filter "./packages/ui"
```

### Workspace Improvements

```json
// package.json (root)
{
  "name": "my-monorepo",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "bun run --filter '*' build",
    "test": "bun run --filter './packages/*' test"
  }
}
```

```bash
# Run script in all workspaces in parallel
bun run --filter '*' build

# Run in topological order (respecting dependencies)
bun run --filter '*' --sequential build

# Only packages that changed since main
bun run --filter '[main]' test
```

### `bun patch` — Like npm Patch

```bash
# Patch a dependency
bun patch react

# Apply patches automatically on install
# patches/ directory, same as npm patch workflow
```

---

## Bun Test Runner Updates

Bun's built-in test runner gets closer to Jest feature parity:

```typescript
import { test, expect, mock, beforeAll, afterAll } from "bun:test";

// Mock modules (new in 1.2)
mock.module("./db", () => ({
  query: mock(() => Promise.resolve([{ id: 1 }])),
}));

// Snapshot testing
test("renders correctly", () => {
  const output = render(<Button label="Click" />);
  expect(output).toMatchSnapshot();
});

// Parameterized tests
test.each([
  [1, 2, 3],
  [2, 3, 5],
  [5, 5, 10],
])("add(%i, %i) = %i", (a, b, expected) => {
  expect(a + b).toBe(expected);
});

// Fake timers
test("delay resolves after 1s", async () => {
  using clock = mock.timers.enableFake();
  const spy = mock();
  setTimeout(spy, 1000);
  clock.tick(1000);
  expect(spy).toHaveBeenCalledOnce();
});
```

Coverage with V8 (zero instrumentation overhead):

```bash
bun test --coverage

# Output:
# ✓ src/utils.test.ts [3 tests, 4ms]
#
# Coverage:
# src/utils.ts    | 92.3% | Stmts | 100% | Branch | 80%
```

---

## Performance Benchmarks: Bun 1.2 vs Node.js 22

### Startup Time

```
Node.js 22:  ~50ms for `console.log("hello")`
Bun 1.2:      ~5ms
```

### HTTP Throughput (requests/sec, `wrk` benchmark)

```
Node.js 22 (http):     ~85,000 req/s
Bun 1.2 (Bun.serve):  ~160,000 req/s
```

### Package Install (node_modules, cold)

```
npm install:   ~12s
yarn install:  ~8s
pnpm install:  ~5s
bun install:   ~0.8s
```

### SQLite Query (100k rows)

```
better-sqlite3 (Node.js):  ~42ms
bun:sqlite:                ~28ms
```

---

## Migration Guide: Node.js → Bun 1.2

### Step 1: Check Compatibility

```bash
# Run your test suite
bun test

# Run your app
bun run src/index.ts
```

Most apps work immediately. Common issues:

| Issue | Solution |
|-------|----------|
| `require()` in .ts files | Bun supports both — no change needed |
| `__dirname` / `__filename` | Bun supports these natively |
| `process.env` | Works the same |
| Native addons (.node files) | Check Bun compatibility list |
| Unsupported `node:` modules | See [Bun compatibility table](https://bun.sh/docs/runtime/nodejs-apis) |

### Step 2: Replace npm Scripts

```json
// Before
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "build": "tsc && node dist/index.js",
    "test": "jest"
  }
}

// After — Bun handles everything
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target node",
    "test": "bun test"
  }
}
```

### Step 3: Adopt Bun-Specific APIs (Optional)

You don't have to — Bun is drop-in compatible. But if you want the performance wins:

```typescript
// Instead of fs.readFile
const file = await Bun.file("data.json").json();

// Instead of fetch + json
const data = await Bun.fetch("https://api.example.com/data").then((r) =>
  r.json()
);

// Instead of pg/postgres.js
import { sql } from "bun";
const users = await sql`SELECT * FROM users`;
```

### Step 4: Docker

```dockerfile
FROM oven/bun:1.2 AS base

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

# Production image
FROM oven/bun:1.2-slim
WORKDIR /app
COPY --from=base /app .

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

---

## Real-World Usage Patterns

### API Server with Built-in Postgres

```typescript
// server.ts
import { serve, sql } from "bun";

serve({
  port: 3000,
  routes: {
    "GET /api/users": async () => {
      const users = await sql`SELECT id, name, email FROM users ORDER BY name`;
      return Response.json(users);
    },
    "POST /api/users": async (req) => {
      const body = await req.json();
      const [user] = await sql`
        INSERT INTO users (name, email) VALUES (${body.name}, ${body.email})
        RETURNING *
      `;
      return Response.json(user, { status: 201 });
    },
    "GET /api/users/:id": async (req, params) => {
      const [user] = await sql`SELECT * FROM users WHERE id = ${params.id}`;
      if (!user) return new Response("Not found", { status: 404 });
      return Response.json(user);
    },
  },
});
```

### File Processing Pipeline

```typescript
// process.ts
const files = new Bun.Glob("data/*.csv").scan(".");

for await (const path of files) {
  const content = await Bun.file(path).text();
  const rows = content.split("\n").map((r) => r.split(","));

  // Process and write output
  await Bun.write(
    path.replace("data/", "output/").replace(".csv", ".json"),
    JSON.stringify(rows)
  );
}
```

### Bun Shell for DevOps Scripts

```typescript
import { $ } from "bun";

// Replace bash scripts with type-safe Bun shell
const branch = await $`git branch --show-current`.text();
const status = await $`git status --porcelain`.text();

if (status.trim()) {
  console.log("Uncommitted changes detected:");
  console.log(status);
  process.exit(1);
}

await $`git push origin ${branch.trim()}`;
console.log(`Pushed ${branch.trim()} successfully`);
```

---

## When to Use Bun 1.2

**Use Bun when:**
- Starting a new project (no migration cost)
- Building CLI tools (fast startup wins)
- API servers with high throughput needs
- Projects that use TypeScript heavily (native support, no compilation step)
- Teams that want one tool instead of Node + npm + ts-node + jest

**Stick with Node.js when:**
- You depend on native addons (.node files) not yet supported
- Your team is risk-averse and the existing Node.js setup works
- You use niche `node:` APIs that Bun doesn't yet cover
- Enterprise environments with Node.js support SLAs

---

## Summary

Bun 1.2 is the release that makes Bun a serious production option:

- `Bun.sql` — zero-dependency Postgres client
- Route-based HTTP server with `Bun.serve()`
- `node:cluster` and more `node:crypto` APIs
- Improved package manager with lockfile v3
- Better test coverage and snapshot support
- Near-complete Windows support

The compatibility story is now strong enough that migration risk is low for most projects. Whether you migrate an existing app or start fresh, Bun 1.2 delivers on the promise of "Node.js but faster and simpler."
