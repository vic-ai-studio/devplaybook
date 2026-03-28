---
title: "Bun 1.x Production Guide 2026"
description: "Complete guide to using Bun 1.x in production: runtime performance vs Node.js, built-in bundler, package manager speed, test runner, compatibility layer, and Docker deployment."
date: "2026-03-28"
tags: [bun, nodejs, javascript, runtime, performance]
readingTime: "13 min read"
---

# Bun 1.x Production Guide 2026

JavaScript runtimes have never been more competitive. While Node.js still dominates production deployments, Bun has matured from a curiosity into a credible production choice. With Bun 1.x shipping a stable API surface, improved Node.js compatibility, and consistent benchmark wins, 2026 is the year many teams are seriously evaluating whether to migrate.

This guide covers everything you need to know to run Bun in production — from benchmarks and package management to Docker deployment and known gotchas.

---

## What Is Bun and Why Does It Matter in 2026

Bun is a JavaScript runtime, package manager, bundler, and test runner — all in one binary. Built on JavaScriptCore (the engine powering Safari) instead of V8, it was designed from scratch for speed. The project reached 1.0 in September 2023 and has shipped dozens of stability and compatibility improvements since.

What makes Bun compelling in 2026:

- **Single binary** — one install covers runtime, bundler, test runner, and package manager
- **JavaScriptCore engine** — lower memory footprint and faster cold starts than V8 in many scenarios
- **Node.js compatibility layer** — most npm packages work out of the box
- **Native TypeScript support** — no transpile step needed to run `.ts` files
- **Built-in SQLite, WebSocket, S3, and password hashing APIs** — less dependency sprawl
- **Drop-in replacement posture** — `bun run` respects your existing `package.json` scripts

Teams migrating from Node.js often find that the day-one switch requires minimal code changes, while delivering measurable throughput improvements on I/O-heavy workloads.

---

## Performance Benchmarks: Bun vs Node.js vs Deno

Raw numbers shift with every release, but the general pattern in 2026 is consistent.

### HTTP Server Throughput

A minimal HTTP server returning `"Hello World"` under `wrk` load testing (8 threads, 400 connections, 30 seconds):

| Runtime | Requests/sec | Latency (avg) |
|---------|-------------|---------------|
| Bun 1.x | ~210,000 | ~1.9 ms |
| Node.js 22 | ~115,000 | ~3.4 ms |
| Deno 2.x | ~130,000 | ~3.0 ms |

Bun consistently delivers roughly 1.7–2x the throughput of Node.js on pure HTTP benchmarks. Real-world applications with database I/O will see smaller gaps, but the advantage holds.

### Cold Start Time

| Runtime | Cold start (simple script) |
|---------|--------------------------|
| Bun 1.x | ~8 ms |
| Node.js 22 | ~55 ms |
| Deno 2.x | ~35 ms |

The cold start difference is significant for serverless workloads where containers spin up per request. Bun's 8 ms cold start can eliminate the "cold start penalty" that plagues Lambda and Cloud Run deployments.

### Memory Usage (idle server)

| Runtime | RSS at idle |
|---------|------------|
| Bun 1.x | ~35 MB |
| Node.js 22 | ~65 MB |

Lower baseline memory means more instances per host and cheaper cloud bills at scale.

---

## Package Manager Speed

`bun install` is dramatically faster than `npm install` and meaningfully faster than `pnpm`. It achieves this through a global binary package cache and parallelized downloads.

```bash
# Install all dependencies from scratch
time npm install        # ~45s (cold cache)
time pnpm install       # ~18s (cold cache)
time bun install        # ~4s  (cold cache)

# With warm cache
time npm install        # ~12s
time pnpm install       # ~5s
time bun install        # ~0.8s
```

Bun stores packages in `~/.bun/install/cache` and hard-links into `node_modules`, avoiding redundant copies. The lockfile (`bun.lockb`) is a binary format — faster to read and write, but not human-readable (use `bun pm ls` to inspect).

### Switching an Existing Project

```bash
# Remove existing lockfiles
rm package-lock.json yarn.lock pnpm-lock.yaml

# Install with Bun
bun install

# Commit the new lockfile
git add bun.lockb
```

CI systems should install Bun via the official shell script or the `oven-sh/setup-bun` GitHub Action:

```yaml
# .github/workflows/ci.yml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: latest

- run: bun install --frozen-lockfile
- run: bun test
- run: bun run build
```

---

## Built-in Bundler: Bun.build

Bun ships a bundler that handles TypeScript, JSX, tree-shaking, and code splitting with zero configuration.

```typescript
// build.ts
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "bun",          // "node" | "browser" | "bun"
  format: "esm",          // "cjs" | "esm" | "iife"
  splitting: true,        // code splitting for dynamic imports
  minify: true,
  sourcemap: "external",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  external: ["pg", "redis"],  // keep these as requires, not bundled
});

if (!result.success) {
  console.error("Build failed:");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

console.log(`Built ${result.outputs.length} files`);
```

### package.json Scripts for Bun

```json
{
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "build": "bun run build.ts",
    "start": "bun dist/index.js",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "typecheck": "tsc --noEmit",
    "lint": "bunx biome check src/"
  }
}
```

The `--watch` flag gives hot-reload during development without needing nodemon or ts-node-dev.

### Bun.build vs esbuild

Bun's bundler is built on top of a Zig-native implementation and is consistently 1.5–2x faster than esbuild for large projects. For browser targets, both produce compatible output. The main advantage of staying with esbuild or Rollup is plugin ecosystem maturity — Bun's plugin API is usable but has fewer third-party plugins.

---

## Built-in Test Runner: bun:test

Bun ships a Jest-compatible test runner. No configuration needed.

```typescript
// src/utils.test.ts
import { describe, it, expect, mock } from "bun:test";
import { formatCurrency, calculateDiscount } from "./utils";

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("handles zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });
});

describe("calculateDiscount", () => {
  it("applies percentage discount", () => {
    expect(calculateDiscount(100, 0.2)).toBe(80);
  });
});

// Mocking
describe("fetchUser", () => {
  it("calls the API with correct ID", async () => {
    const fetchMock = mock(() =>
      Promise.resolve({ id: 1, name: "Alice" })
    );
    global.fetch = fetchMock as any;

    const user = await fetchUser(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(user.name).toBe("Alice");
  });
});
```

Run tests:

```bash
bun test                          # all tests
bun test src/utils.test.ts        # single file
bun test --coverage               # with coverage report
bun test --watch                  # re-run on file changes
bun test --bail 1                 # stop on first failure
```

Coverage output goes to `coverage/` and supports lcov format for CI integration. The test runner is typically 3–4x faster than Jest on the same suite due to lower bootstrap cost.

---

## Node.js Compatibility Layer

Bun implements the Node.js API surface incrementally. In 2026 with Bun 1.x, compatibility is high enough for most real-world packages.

### What Works

- `fs`, `path`, `os`, `crypto`, `stream`, `buffer`, `util`, `events`
- `http` and `https` (though `Bun.serve()` is preferred)
- `child_process.spawn` and `exec`
- `worker_threads`
- CommonJS `require()` alongside ESM `import`
- Most npm packages including Express, Fastify, Prisma, Drizzle, pg, redis, zod

### What Needs Attention

- **Native Node addons (.node files)** — not supported. Packages using `node-gyp` binaries will fail unless a JS fallback exists.
- **`vm` module** — partially implemented; complex sandbox scenarios may break.
- **`cluster` module** — not implemented; use `Bun.spawn` or multiple processes via a process manager instead.
- **Some Jest-specific globals** — `jest.fn()` should be replaced with `mock()` from `bun:test`.
- **`__dirname` in ESM** — use `import.meta.dir` instead.

### Quick Compatibility Check

```bash
# Check if a specific package works with Bun
bunx is-my-node-compatible my-package

# Show which installed packages have native bindings
bun pm ls --native
```

---

## Bun.serve() for HTTP Servers

`Bun.serve()` is the preferred way to create HTTP servers in Bun. It is significantly faster than the `http` module because it operates at a lower level.

### Basic HTTP Server

```typescript
// src/index.ts
const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  hostname: "0.0.0.0",

  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", ts: Date.now() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/") {
      return new Response("Hello from Bun!", {
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  error(err) {
    console.error("Server error:", err);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
```

### With Router and Middleware Pattern

```typescript
// src/server.ts
type Handler = (req: Request) => Response | Promise<Response>;

const routes = new Map<string, Handler>();

routes.set("GET /api/users", async (req) => {
  const users = await db.query("SELECT id, name FROM users LIMIT 50");
  return Response.json(users);
});

routes.set("POST /api/users", async (req) => {
  const body = await req.json();
  const user = await db.query(
    "INSERT INTO users (name, email) VALUES (?, ?) RETURNING *",
    [body.name, body.email]
  );
  return Response.json(user, { status: 201 });
});

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const key = `${req.method} ${url.pathname}`;
    const handler = routes.get(key);

    if (!handler) return new Response("Not Found", { status: 404 });

    try {
      return await handler(req);
    } catch (err) {
      console.error(err);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});
```

### WebSocket Support

```typescript
Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return; // WebSocket upgrade handled
    }
    return new Response("Upgrade required", { status: 426 });
  },
  websocket: {
    open(ws) {
      console.log("Client connected");
      ws.subscribe("broadcast");
    },
    message(ws, message) {
      ws.publish("broadcast", message); // broadcast to all subscribers
    },
    close(ws) {
      console.log("Client disconnected");
    },
  },
});
```

---

## SQLite Built-in: bun:sqlite

One of Bun's most convenient features is first-class SQLite support. No `better-sqlite3` or `sqlite3` package needed.

```typescript
import { Database } from "bun:sqlite";

// Open (or create) a database
const db = new Database("app.db", { create: true });

// Enable WAL mode for better write performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");
db.run("PRAGMA foreign_keys = ON");

// Create a table
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Prepare and run queries (prepared statements are cached)
const insertTask = db.prepare(
  "INSERT INTO tasks (title) VALUES ($title) RETURNING *"
);
const listTasks = db.prepare("SELECT * FROM tasks WHERE done = $done");

// Insert a record
const newTask = insertTask.get({ $title: "Ship Bun in production" });
console.log(newTask); // { id: 1, title: "...", done: 0, created_at: "..." }

// Fetch records
const pending = listTasks.all({ $done: 0 });
console.log(`${pending.length} pending tasks`);

// Transaction example
const markDone = db.transaction((ids: number[]) => {
  const stmt = db.prepare("UPDATE tasks SET done = 1 WHERE id = ?");
  for (const id of ids) {
    stmt.run(id);
  }
  return ids.length;
});

const updated = markDone([1, 2, 3]);
console.log(`Marked ${updated} tasks as done`);

db.close();
```

`bun:sqlite` is synchronous (like `better-sqlite3`) and suitable for embedded use cases. For high-concurrency production workloads, PostgreSQL via `pg` or `postgres.js` remains the right choice.

---

## Docker Deployment

Bun's single binary makes Dockerfiles clean and minimal.

### Multi-Stage Production Dockerfile

```dockerfile
# Dockerfile

# Stage 1: Install production dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Stage 2: Build TypeScript
FROM oven/bun:1 AS builder
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
RUN bun run build

# Stage 3: Minimal production image
FROM oven/bun:1-slim AS production
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 bungroup && \
    adduser --system --uid 1001 --ingroup bungroup bunuser

COPY --from=builder --chown=bunuser:bungroup /app/dist ./dist
COPY --from=deps --chown=bunuser:bungroup /app/node_modules ./node_modules
COPY --chown=bunuser:bungroup package.json ./

USER bunuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "dist/index.js"]
```

### docker-compose for Local Development

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:secret@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

Build and run:

```bash
docker build -t my-bun-app .
docker run -p 3000:3000 --env-file .env my-bun-app
```

The final image using `oven/bun:1-slim` is approximately 100 MB — smaller than a comparable Node.js Alpine image with dependencies.

---

## Environment Variables and Secrets

Bun reads `.env` files automatically in development — no `dotenv` package required.

```bash
# .env
PORT=3000
DATABASE_URL=postgresql://localhost:5432/myapp
JWT_SECRET=change-me-in-production
API_KEY=abc123
```

```typescript
// Access environment variables
const port = parseInt(Bun.env.PORT ?? "3000");
const dbUrl = Bun.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}
```

### Env File Priority

Bun loads env files in this order (later files override earlier ones):

1. `.env`
2. `.env.local`
3. `.env.{NODE_ENV}` (e.g., `.env.production`)
4. `.env.{NODE_ENV}.local`

In production Docker containers, inject secrets via the container orchestrator (Kubernetes Secrets, AWS Secrets Manager, Fly.io secrets) rather than committing `.env` files.

---

## Production Checklist

Before shipping a Bun application to production, verify the following:

### Runtime and Compatibility
- [ ] All critical npm packages confirmed working with Bun (no native `.node` addons)
- [ ] TypeScript `strict` mode enabled and `tsc --noEmit` passes
- [ ] No use of `cluster` module — replaced with process manager or horizontal scaling
- [ ] `__dirname`/`__filename` usages updated to `import.meta.dir`/`import.meta.path` where needed

### Performance
- [ ] `Bun.serve()` used instead of `http` module for primary HTTP handling
- [ ] SQLite WAL mode enabled if using `bun:sqlite`
- [ ] Response compression enabled (gzip/brotli via middleware or reverse proxy)
- [ ] Static assets served via CDN, not Bun directly

### Security
- [ ] Running as non-root user in Docker
- [ ] Secrets injected via environment, not baked into the image
- [ ] `--frozen-lockfile` used in CI/CD installs
- [ ] Dependency audit: `bun audit` run regularly

### Observability
- [ ] Structured JSON logging (avoid `console.log` in production, use `pino` or `winston`)
- [ ] `/health` endpoint returning 200 for load balancer checks
- [ ] Error tracking (Sentry SDK works with Bun)
- [ ] Process restarts on crash via PM2, Docker restart policy, or systemd

### Deployment
- [ ] Multi-stage Dockerfile reduces image size
- [ ] `NODE_ENV=production` set
- [ ] Build artifacts committed or built in CI — never run `bun run build` inside the production container start command

---

## Known Limitations and Caveats

No runtime is perfect. Here is what to watch for with Bun in production as of 2026:

**Native addons**: Any npm package that compiles native code (`bcrypt`, `sharp` in some configurations, `canvas`) will not work unless it provides a pure-JS fallback. Use `bcryptjs` instead of `bcrypt`, and `@napi-rs/canvas` has experimental Bun support.

**`cluster` module**: Not implemented. Horizontal scaling via multiple Docker replicas or a process manager like PM2 with `fork` mode is the alternative.

**Long-term stability**: Bun's semver guarantees are respected in 1.x, but the ecosystem is younger than Node.js. Critical patches ship frequently — pin to a minor version in production and update deliberately.

**Debugging tools**: V8-based profiling tools (Chrome DevTools, `--inspect`, `clinic.js`) do not work with Bun's JavaScriptCore engine. Bun has a built-in `--inspect` flag since 1.1 that supports WebKit Inspector Protocol, but tooling coverage is thinner.

**Some Framework Compatibility**: Next.js requires Node.js and does not run on Bun directly (though `bun install` can manage a Next.js project). Frameworks designed for the WinterCG standard — like Hono, Elysia, and Nitro — work excellently on Bun.

**Windows support**: Bun has shipped Windows support since 1.1, but Linux containers remain the recommended production target. The Windows build is primarily for local development.

---

## Conclusion

Bun 1.x in 2026 is a mature, production-ready runtime for the right workloads. If you are running I/O-heavy API servers, background job processors, or CLI tools written in TypeScript, Bun can deliver meaningful throughput improvements with minimal migration effort.

The sweet spot for Bun adoption today:

- **New projects** starting fresh — use Bun from day one, pair it with Hono or Elysia for HTTP, Drizzle for the ORM layer, and `bun:test` for testing
- **API services** without native addon dependencies — a near drop-in replacement that runs faster
- **Serverless functions** where cold start time matters — Bun's 8 ms cold start is a genuine differentiator
- **Internal tooling and scripts** — replacing Node.js scripts with Bun scripts requires almost no changes and runs noticeably faster

For existing monolithic Node.js applications with deep dependency trees that include native addons, a complete migration may not be worth the friction today. Adopt Bun at the service boundary — new microservices, new Lambda functions — and let the migration happen organically.

The JavaScript runtime landscape is richer than it has ever been. Bun is not a replacement for Node.js, but it is a compelling first choice for new projects in 2026.

---

*Tested with Bun 1.x, Node.js 22 LTS, and Deno 2.x. Benchmark numbers are approximate and will vary by hardware and workload.*
