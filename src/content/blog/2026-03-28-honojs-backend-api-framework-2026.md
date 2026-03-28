---
title: "Hono.js: Build Blazing-Fast APIs for Edge and Serverless (2026 Guide)"
description: "Complete guide to Hono.js covering routing, middleware, RPC client, Cloudflare Workers, Bun, Deno, and Node.js runtimes, OpenAPI integration, and comparison with Express and Fastify for edge workloads."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["hono", "backend", "api", "cloudflare-workers", "edge", "typescript", "javascript"]
readingTime: "13 min read"
---

Edge computing was supposed to be the future, but most Node.js frameworks couldn't run there. Express uses `req`/`res` from Node.js's `http` module — not the Web Standard `Request`/`Response`. Fastify is Node-specific. When Cloudflare Workers became production-ready, the backend ecosystem had a compatibility problem.

Hono solved it. Built entirely on Web Standard APIs (`Request`, `Response`, `Headers`, `URL`), Hono runs everywhere: Cloudflare Workers, Bun, Deno, Node.js, AWS Lambda, and the browser. Same code, different runtimes. By 2026, Hono is the go-to framework for edge APIs and the fastest option for serverless backends.

---

## Why Hono?

**Runtime-agnostic**: Web Standard APIs work everywhere. Write once, deploy to any JavaScript runtime.

**Blazing fast**: Hono's router uses a RegExp-based trie structure. Benchmarks show it outperforming Express by 10–100× and matching or beating Fastify in cold-start scenarios.

**TypeScript-first**: Full type inference for route params, query strings, and request bodies. The RPC client generates a fully-typed client from your API definition automatically.

**Small**: ~13KB gzipped. No dependencies. Works on edge runtimes with strict bundle limits.

---

## Installation

```bash
# For Node.js
npm create hono@latest my-app
# Choose: nodejs

# For Cloudflare Workers
npm create hono@latest my-worker
# Choose: cloudflare-workers

# For Bun
npm create hono@latest my-app
# Choose: bun

# Manual setup
npm install hono
```

---

## Core Routing

```typescript
import { Hono } from "hono";

const app = new Hono();

// Basic routes
app.get("/", (c) => c.text("Hello Hono!"));
app.post("/users", (c) => c.json({ created: true }));
app.put("/users/:id", (c) => c.json({ updated: true }));
app.delete("/users/:id", (c) => c.json({ deleted: true }));

// Route params
app.get("/users/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ id });
});

// Multiple params
app.get("/repos/:owner/:repo", (c) => {
  const { owner, repo } = c.req.param();
  return c.json({ owner, repo });
});

// Query strings
app.get("/search", (c) => {
  const q = c.req.query("q");
  const limit = c.req.query("limit") ?? "20";
  return c.json({ q, limit: parseInt(limit) });
});

// Wildcards
app.get("/static/*", (c) => c.text("static file"));
```

### Route Groups

```typescript
// Route grouping with base path
const api = new Hono().basePath("/api");

const users = new Hono();
users.get("/", (c) => c.json({ users: [] }));
users.post("/", (c) => c.json({ created: true }));
users.get("/:id", (c) => c.json({ id: c.req.param("id") }));

// Mount routes
api.route("/users", users);
// GET /api/users, POST /api/users, GET /api/users/:id

export default api;
```

---

## Middleware

Hono middleware is just a function that calls `next()`:

```typescript
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { rateLimit } from "hono/rate-limiter";

const app = new Hono();

// Built-in middleware
app.use(logger());

app.use(
  "/api/*",
  cors({
    origin: ["https://myapp.com", "https://www.myapp.com"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Custom middleware
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const elapsed = Date.now() - start;
  c.header("X-Response-Time", `${elapsed}ms`);
});

// Route-scoped middleware
app.use("/admin/*", async (c, next) => {
  const user = c.get("user"); // Set by JWT middleware
  if (user?.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});
```

### JWT Authentication

```typescript
import { jwt } from "hono/jwt";

app.use(
  "/api/*",
  jwt({
    secret: process.env.JWT_SECRET!,
  })
);

app.get("/api/me", (c) => {
  const payload = c.get("jwtPayload");
  return c.json({ userId: payload.sub, email: payload.email });
});
```

### Custom Auth Middleware

```typescript
const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);
  const user = await verifyToken(token);
  if (!user) {
    return c.json({ error: "Invalid token" }, 401);
  }

  c.set("user", user);
  await next();
});

// Apply to routes
app.use("/protected/*", authMiddleware);
```

---

## Input Validation with Zod

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "user"]).default("user"),
});

app.post(
  "/users",
  zValidator("json", createUserSchema),
  async (c) => {
    const body = c.req.valid("json");
    // body is fully typed: { email: string, name: string, role: "admin" | "user" }

    const user = await createUser(body);
    return c.json(user, 201);
  }
);

// Validate query params
const searchSchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

app.get(
  "/search",
  zValidator("query", searchSchema),
  async (c) => {
    const { q, limit, page } = c.req.valid("query");
    const results = await search(q, { limit, page });
    return c.json(results);
  }
);
```

---

## The RPC Client — Type-Safe API Calls

Hono's killer feature for full-stack TypeScript apps: **generate a fully-typed client from your API routes automatically**.

```typescript
// server.ts — define typed routes
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono()
  .get("/posts", async (c) => {
    const posts = await db.select().from(postsTable);
    return c.json(posts);
  })
  .post(
    "/posts",
    zValidator("json", z.object({ title: z.string(), content: z.string() })),
    async (c) => {
      const body = c.req.valid("json");
      const [post] = await db.insert(postsTable).values(body).returning();
      return c.json(post, 201);
    }
  )
  .get("/posts/:id", async (c) => {
    const id = c.req.param("id");
    const post = await db.query.postsTable.findFirst({
      where: eq(postsTable.id, id),
    });
    if (!post) return c.notFound();
    return c.json(post);
  });

export type AppType = typeof app;
export default app;
```

```typescript
// client.ts — use hc() to create a typed client
import { hc } from "hono/client";
import type { AppType } from "./server";

const client = hc<AppType>("http://localhost:3000");

// Fully typed — TypeScript knows the response shape
const posts = await client.posts.$get();
const postsData = await posts.json(); // Post[]

const newPost = await client.posts.$post({
  json: { title: "Hello", content: "World" }, // typed
});
const created = await newPost.json(); // Post

const post = await client["posts/:id"].$get({ param: { id: "123" } });
```

No codegen step, no separate schema file. The types flow from server to client through TypeScript's type system.

---

## OpenAPI Integration

```bash
pnpm add @hono/zod-openapi
```

```typescript
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const app = new OpenAPIHono();

const UserSchema = z.object({
  id: z.string().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
  email: z.string().email().openapi({ example: "user@example.com" }),
  name: z.string().openapi({ example: "Alice" }),
});

const getUser = createRoute({
  method: "get",
  path: "/users/{id}",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: UserSchema } },
      description: "User found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "User not found",
    },
  },
});

app.openapi(getUser, async (c) => {
  const { id } = c.req.valid("param");
  const user = await getUser(id);
  if (!user) return c.json({ error: "Not found" }, 404);
  return c.json(user);
});

// Auto-generate OpenAPI docs at /doc
app.doc("/doc", {
  openapi: "3.0.0",
  info: { title: "My API", version: "1.0.0" },
});

// Swagger UI at /ui
app.get("/ui", swaggerUI({ url: "/doc" }));
```

---

## Deployment Targets

### Cloudflare Workers

```typescript
// src/index.ts
import { Hono } from "hono";

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    KV: KVNamespace;
    R2: R2Bucket;
    API_KEY: string;  // environment variable
  };
}>();

app.get("/data", async (c) => {
  // Access Cloudflare bindings via c.env
  const result = await c.env.DB.prepare("SELECT * FROM users LIMIT 10").all();
  return c.json(result.results);
});

app.get("/cache/:key", async (c) => {
  const key = c.req.param("key");
  const value = await c.env.KV.get(key);
  return c.json({ value });
});

export default app;
```

```toml
# wrangler.toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "..."
```

### Bun

```typescript
// index.ts
import { Hono } from "hono";

const app = new Hono();
app.get("/", (c) => c.text("Running on Bun!"));

export default {
  port: 3000,
  fetch: app.fetch,
};
```

```bash
bun run index.ts
# Bun handles the server automatically — no need to set up HTTP server
```

### Node.js

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();
app.get("/", (c) => c.text("Hello from Node.js!"));

serve({
  fetch: app.fetch,
  port: 3000,
});
```

### Deno

```typescript
import { Hono } from "npm:hono";

const app = new Hono();
app.get("/", (c) => c.text("Hello from Deno!"));

Deno.serve(app.fetch);
```

---

## Hono vs Express vs Fastify

### Express

Express's strengths: enormous ecosystem, millions of tutorials, universal familiarity.

Express's weaknesses in 2026:
- Node.js `req`/`res` objects — can't run on edge
- No built-in TypeScript support
- No input validation
- No Web Standard compatibility

**Choose Express when**: you need maximum npm ecosystem compatibility, you're maintaining a legacy codebase, or your team's institutional knowledge is all Express.

### Fastify

Fastify's strengths: extremely fast on Node.js, JSON Schema validation built-in, excellent plugin system.

Fastify's weaknesses:
- Node.js only (no edge runtimes)
- JSON Schema (not Zod) as the primary validation system
- No built-in RPC client generation

**Choose Fastify when**: you're deploying to Node.js only and need maximum performance with a mature plugin ecosystem.

### Hono

**Choose Hono when**:
- Deploying to Cloudflare Workers, Deno Deploy, or other edge runtimes
- Building full-stack TypeScript with the RPC client
- Bundle size matters (serverless cold starts)
- You want to use the same framework across different runtimes

Performance comparison (requests/second, Node.js):

| Framework | req/s |
|-----------|-------|
| Hono      | ~210,000 |
| Fastify   | ~175,000 |
| Express   | ~15,000 |

On Cloudflare Workers (where Express doesn't run), Hono is the only option.

---

## Real-World Example: REST API

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, posts } from "./schema";
import { eq, desc } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const app = new Hono().basePath("/api");

app.use(logger());
app.use(cors());

// Users
const usersRoute = new Hono()
  .get("/", async (c) => {
    const allUsers = await db.select().from(users).orderBy(users.name);
    return c.json(allUsers);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { posts: true },
    });
    if (!user) return c.json({ error: "Not found" }, 404);
    return c.json(user);
  })
  .post(
    "/",
    zValidator("json", z.object({ email: z.string().email(), name: z.string().min(1) })),
    async (c) => {
      const body = c.req.valid("json");
      const [user] = await db.insert(users).values(body).returning();
      return c.json(user, 201);
    }
  );

app.route("/users", usersRoute);

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.notFound((c) => c.json({ error: "Not Found" }, 404));

export type AppType = typeof app;
export default app;
```

---

## Conclusion

Hono is the right answer to a real question: what do you use when you need a backend framework that runs at the edge? Its Web Standard foundation means the same code that runs on Cloudflare Workers runs on Bun, Deno, and Node.js. The TypeScript RPC client eliminates a whole class of API contract bugs.

For greenfield projects in 2026 deploying to edge or serverless: Hono is the default. For teams with heavy Node.js investment and no edge requirements, Fastify remains excellent. For legacy codebases: Express still works, but the migration path to Hono is worth evaluating when you need edge deployment.

**Related tools on DevPlaybook:**
- [HTTP Request Builder](/tools/http-request-builder) — test API endpoints interactively
- [JWT Decoder](/tools/jwt-decoder) — decode and inspect JWT tokens
- [API Rate Limiter Calculator](/tools/rate-limiter-calculator) — calculate rate limiting parameters
