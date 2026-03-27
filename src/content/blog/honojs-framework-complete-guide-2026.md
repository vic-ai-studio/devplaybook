---
title: "Hono.js Complete Guide 2026: Build Ultra-Fast APIs for Edge and Beyond"
description: "Master Hono.js in 2026 — routing, middleware, RPC, Zod validation, edge deployment on Cloudflare/Deno/Bun, and how it compares to Express and Fastify."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["hono", "javascript", "typescript", "edge", "cloudflare-workers", "api", "nodejs", "bun", "deno"]
readingTime: "11 min read"
---

Hono (炎, "flame" in Japanese) is a fast, lightweight web framework that runs everywhere: Cloudflare Workers, Deno, Bun, Node.js, and more. Unlike Express — which was designed for Node.js in 2010 — Hono was built for the modern web platform, using the standard `Request`/`Response` APIs that work natively in any JavaScript runtime.

This guide covers everything you need to build production-ready APIs with Hono in 2026.

---

## Why Hono?

The case for Hono is straightforward:

| Feature | Hono | Express | Fastify |
|---------|------|---------|---------|
| Web Standard APIs | ✅ | ❌ | ❌ |
| Edge runtime support | ✅ | ❌ | ❌ |
| TypeScript first | ✅ | Partial | Partial |
| Built-in RPC | ✅ | ❌ | ❌ |
| Bundle size | ~13KB | ~200KB | ~500KB |
| Requests/sec (Bun) | ~220k | ~85k | ~130k |

Hono doesn't reinvent routing or middleware — it refines it, using web standards that run everywhere without a compatibility shim.

---

## Installation

```bash
# Node.js
npm install hono

# Bun
bun add hono

# Deno (via npm)
import { Hono } from "npm:hono";
```

---

## Core Concepts

### Basic App

```typescript
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello, Hono!"));
app.get("/json", (c) => c.json({ message: "Hello, World!" }));
app.post("/echo", async (c) => {
  const body = await c.req.json();
  return c.json(body);
});

export default app;
```

The `c` (context) object is the heart of Hono. It wraps the request and provides response helpers.

### Context API

```typescript
app.get("/users/:id", async (c) => {
  // Route params
  const id = c.req.param("id");

  // Query string
  const page = c.req.query("page") ?? "1";

  // Headers
  const auth = c.req.header("Authorization");

  // Request body
  const body = await c.req.json();

  // Set response headers
  c.header("X-Custom", "value");

  // Set status
  c.status(200);

  // Response shortcuts
  return c.json({ id, page });
  // or c.text("hello")
  // or c.html("<h1>Hi</h1>")
  // or c.redirect("/other")
  // or c.notFound()
});
```

---

## Routing

Hono uses a trie-based router (RegExpRouter) — one of the fastest in the ecosystem.

### Basic Routes

```typescript
app.get("/users", getUsers);
app.post("/users", createUser);
app.put("/users/:id", updateUser);
app.delete("/users/:id", deleteUser);
app.patch("/users/:id", patchUser);

// Multiple methods
app.on(["GET", "POST"], "/form", handleForm);

// All methods
app.all("/any", handleAny);
```

### Route Parameters

```typescript
// Named param
app.get("/users/:id", (c) => {
  const id = c.req.param("id");
  return c.text(id);
});

// Multiple params
app.get("/orgs/:orgId/repos/:repoId", (c) => {
  const { orgId, repoId } = c.req.param();
  return c.json({ orgId, repoId });
});

// Optional param
app.get("/files/:name{.+}", (c) => {
  const name = c.req.param("name");
  return c.text(name); // catches /files/path/to/file.txt
});

// Wildcard
app.get("/static/*", serveStatic({ root: "./public" }));
```

### Route Grouping

```typescript
const api = new Hono();

// Users sub-router
const users = new Hono();
users.get("/", getUsers);
users.post("/", createUser);
users.get("/:id", getUser);
users.delete("/:id", deleteUser);

// Repos sub-router
const repos = new Hono();
repos.get("/", getRepos);
repos.post("/", createRepo);

// Mount
api.route("/users", users);
api.route("/repos", repos);

// Top-level app
const app = new Hono();
app.route("/api/v1", api);
```

---

## Middleware

Middleware in Hono is async and uses `await next()` — identical in concept to Koa.

### Built-in Middleware

```typescript
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { compress } from "hono/compress";
import { basicAuth } from "hono/basic-auth";
import { bearerAuth } from "hono/bearer-auth";
import { rateLimiter } from "hono/rate-limiter";
import { cache } from "hono/cache";
import { timeout } from "hono/timeout";

const app = new Hono();

// Logging
app.use(logger());

// CORS
app.use(
  cors({
    origin: ["https://example.com", "https://app.example.com"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ETag caching
app.use(etag());

// Gzip/Brotli compression
app.use(compress());

// Rate limiting (Cloudflare KV / in-memory)
app.use(
  rateLimiter({
    windowMs: 60 * 1000, // 1 minute
    limit: 100,
    keyGenerator: (c) => c.req.header("CF-Connecting-IP") ?? "anonymous",
  })
);

// Timeout
app.use(timeout(5000)); // 5s timeout on all routes
```

### Custom Middleware

```typescript
// Auth middleware
const auth = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = verifyJWT(token);
    c.set("user", payload); // pass data to handlers
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
};

// Request ID middleware
const requestId = async (c: Context, next: Next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
};

// Error timing middleware
const timing = async (c: Context, next: Next) => {
  const start = performance.now();
  await next();
  const ms = performance.now() - start;
  c.header("X-Response-Time", `${ms.toFixed(2)}ms`);
};

app.use(requestId);
app.use(timing);
app.use("/api/*", auth); // auth only on /api routes
```

### Typed Context Variables

```typescript
// Define your variable types
type Variables = {
  user: { id: string; email: string; role: string };
  requestId: string;
};

const app = new Hono<{ Variables: Variables }>();

app.use(auth); // sets c.set("user", ...)

app.get("/profile", (c) => {
  const user = c.get("user"); // fully typed
  return c.json(user);
});
```

---

## Validation with Zod

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
});

app.post("/users", zValidator("json", createUserSchema), async (c) => {
  const data = c.req.valid("json"); // typed as CreateUser
  const user = await createUser(data);
  return c.json(user, 201);
});

// Validate query params
const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});

app.get("/users", zValidator("query", listQuerySchema), async (c) => {
  const { page, per_page, q } = c.req.valid("query");
  const users = await listUsers({ page, per_page, search: q });
  return c.json(users);
});
```

---

## RPC — End-to-End Type Safety

Hono's RPC feature is its killer feature for TypeScript monorepos. Define your API once, use it on both server and client with full type safety.

### Server

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const api = new Hono()
  .get("/users", async (c) => {
    const users = await db.users.findMany();
    return c.json(users);
  })
  .post(
    "/users",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        email: z.string().email(),
      })
    ),
    async (c) => {
      const input = c.req.valid("json");
      const user = await db.users.create({ data: input });
      return c.json(user, 201);
    }
  )
  .get("/users/:id", async (c) => {
    const id = c.req.param("id");
    const user = await db.users.findUnique({ where: { id } });
    if (!user) return c.notFound();
    return c.json(user);
  });

export type AppType = typeof api;
export default api;
```

### Client

```typescript
import { hc } from "hono/client";
import type { AppType } from "./server";

// Type-safe client — no codegen needed
const client = hc<AppType>("https://api.example.com");

// Fully typed calls
const res = await client.users.$get();
const users = await res.json(); // typed as User[]

const newUser = await client.users.$post({
  json: { name: "Alice", email: "alice@example.com" },
});
const created = await newUser.json(); // typed as User

// Even params are typed
const userRes = await client.users[":id"].$get({ param: { id: "123" } });
```

This is tRPC-style type safety without the tRPC overhead — and it works over standard HTTP.

---

## Edge Deployment

### Cloudflare Workers

```typescript
// src/index.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Running on Cloudflare!"));

app.get("/kv/:key", async (c) => {
  const key = c.req.param("key");
  const value = await c.env.KV.get(key); // Cloudflare KV binding
  return c.text(value ?? "not found");
});

export default app;
```

```toml
# wrangler.toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"
```

```bash
wrangler deploy
```

### Deno Deploy

```typescript
import { Hono } from "npm:hono";
import { serve } from "https://deno.land/std/http/server.ts";

const app = new Hono();
app.get("/", (c) => c.text("Running on Deno Deploy!"));

serve(app.fetch);
```

### Bun

```typescript
import { Hono } from "hono";

const app = new Hono();
app.get("/", (c) => c.text("Running on Bun!"));

export default {
  port: 3000,
  fetch: app.fetch,
};
```

### Node.js (with `@hono/node-server`)

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();
app.get("/", (c) => c.text("Running on Node.js!"));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`);
});
```

---

## Error Handling

```typescript
import { HTTPException } from "hono/http-exception";

// Throw HTTP errors from anywhere
app.get("/users/:id", async (c) => {
  const user = await db.findUser(c.req.param("id"));
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }
  return c.json(user);
});

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  // Log unexpected errors
  console.error(err);
  return c.json(
    {
      error: "Internal server error",
      requestId: c.get("requestId"),
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found", path: c.req.path }, 404);
});
```

---

## Hono vs Express vs Fastify

### When to use Hono

- **Edge/serverless**: Only Hono works on Cloudflare Workers, Deno Deploy, etc.
- **TypeScript-first projects**: RPC + typed context is unmatched
- **New projects**: No reason to start with Express in 2026
- **Monorepos with shared types**: Hono RPC eliminates API contract duplication

### When to use Express

- **Legacy codebase**: Huge ecosystem of Express middleware
- **Team familiarity**: If your team knows Express and the app isn't performance-critical

### When to use Fastify

- **Plugin-heavy architectures**: Fastify's plugin system is excellent for large apps
- **Schema-first validation**: Fastify's JSON Schema integration is mature
- **Node.js-only**: Fastify doesn't need to run on edge

---

## Production Checklist

```typescript
const app = new Hono();

// 1. Security headers
app.use(secureHeaders());

// 2. CORS configured for your domains
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? [] }));

// 3. Request logging
app.use(logger());

// 4. Request IDs for tracing
app.use(async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});

// 5. Compression
app.use(compress());

// 6. Rate limiting
app.use("/api/*", rateLimiter({ limit: 100, windowMs: 60_000 }));

// 7. Validation on all POST/PUT/PATCH routes
// (use zValidator per-route)

// 8. Global error handler
app.onError((err, c) => { /* ... */ });

// 9. 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));
```

---

## Summary

Hono has matured into the go-to web framework for TypeScript developers in 2026:

- **Universal**: Same code runs on Cloudflare, Deno, Bun, and Node.js
- **Fast**: Trie-based router, minimal overhead, ~220k req/s on Bun
- **Type-safe**: RPC gives you end-to-end types without codegen
- **Small**: ~13KB, no bloat
- **Batteries included**: Built-in middleware for CORS, auth, rate limiting, compression

If you're starting a new API project in 2026, Hono should be your first choice — unless you have a specific reason to reach for something else.
