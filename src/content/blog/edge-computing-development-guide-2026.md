---
title: "Edge Computing for Developers 2026: Cloudflare Workers, Deno Deploy & Fastly"
description: "Complete edge computing guide for 2026: Cloudflare Workers, Deno Deploy, Fastly Compute, edge databases, Durable Objects, latency benefits, and when to choose edge vs serverless vs containers."
date: "2026-04-01"
tags: [edge-computing, cloudflare-workers, deno-deploy, serverless, performance]
readingTime: "14 min read"
---

# Edge Computing for Developers 2026: Cloudflare Workers, Deno Deploy & Fastly

Edge computing has matured from a CDN feature into a primary deployment target for APIs, authentication, personalization, and real-time applications. Running code at hundreds of locations worldwide—5–50ms from every user—enables experiences that centralized servers simply can't match.

In 2026, the edge ecosystem is rich and production-ready. Cloudflare Workers handles billions of requests daily. Deno Deploy offers native TypeScript execution at the edge. Fastly Compute runs WASM modules with 1ms cold starts. This guide covers the practical side of edge development: what it's good for, how each platform works, and patterns for building reliable edge applications.

## What Is Edge Computing?

Traditional serverless runs in a single region (us-east-1, eu-west-1). When a user in Tokyo hits your API in Virginia, the round trip adds 150–200ms of network latency — before your code even runs.

Edge computing runs your code at the network edge: in data centers close to users, distributed across 100+ locations worldwide.

```
Traditional serverless:
User (Tokyo) ──── 150ms ────► Server (Virginia) ──── 150ms ────► User
Total: 300ms round trip

Edge computing:
User (Tokyo) ──── 5ms ────► Edge Node (Tokyo) ──── 5ms ────► User
Total: 10ms round trip
```

**The numbers matter**: a 150ms latency reduction increases conversion rates by 5–10% for e-commerce and dramatically improves real-time application quality.

## Cloudflare Workers

Cloudflare Workers is the most mature and feature-rich edge platform. Workers run in Cloudflare's V8 isolates—not containers, not Node.js—which enables sub-millisecond cold starts at 300+ locations.

### Basic Worker

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route handling
    if (url.pathname === "/api/hello") {
      return Response.json({
        message: "Hello from the edge!",
        location: request.cf?.city ?? "unknown",
        country: request.cf?.country ?? "unknown",
        colo: request.cf?.colo ?? "unknown",   // Which Cloudflare datacenter
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleApi(request: Request, env: Env): Promise<Response> {
  // Access KV, R2, D1, etc. via env bindings
  const data = await env.MY_KV.get("some-key");
  return Response.json({ data });
}
```

```toml
# wrangler.toml
name = "my-api"
main = "worker.ts"
compatibility_date = "2026-01-01"

# KV namespace binding
[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-namespace-id"

# D1 database binding
[[d1_databases]]
binding = "MY_DB"
database_name = "my-database"
database_id = "your-database-id"

# R2 storage binding
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

### Edge Caching with Cache API

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cacheKey = new Request(request.url, request);
    const cache = caches.default;

    // Check cache first
    let response = await cache.match(cacheKey);
    if (response) {
      return new Response(response.body, {
        ...response,
        headers: { ...response.headers, "X-Cache": "HIT" },
      });
    }

    // Fetch from origin
    response = await fetch(request);

    // Cache successful responses for 60 seconds
    if (response.ok) {
      const cachedResponse = new Response(response.clone().body, {
        ...response,
        headers: {
          ...response.headers,
          "Cache-Control": "public, max-age=60",
          "X-Cache": "MISS",
        },
      });

      // Store in cache without blocking response
      ctx.waitUntil(cache.put(cacheKey, cachedResponse));
    }

    return response;
  },
};
```

### Cloudflare KV: Edge Key-Value Storage

```typescript
// KV: globally distributed, eventually consistent
// Best for: config, sessions, rate limiting, feature flags

export default {
  async fetch(request: Request, env: Env) {
    const userId = getUserId(request);

    // Rate limiting with KV
    const rateLimitKey = `rate:${userId}:${Math.floor(Date.now() / 60000)}`; // Per minute
    const current = parseInt((await env.RATE_LIMIT.get(rateLimitKey)) ?? "0");

    if (current >= 100) {
      return new Response("Rate limit exceeded", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }

    // Increment counter
    await env.RATE_LIMIT.put(rateLimitKey, String(current + 1), {
      expirationTtl: 120, // Auto-expire after 2 minutes
    });

    return handleRequest(request, env);
  },
};
```

### Durable Objects: Stateful Edge

Durable Objects are single-instance stateful classes that run at the edge. Each instance has a guaranteed single location, making them ideal for real-time collaboration, rate limiting, and game state.

```typescript
// src/chat-room.ts — Durable Object
export class ChatRoom implements DurableObject {
  private connections: Map<string, WebSocket> = new Map();
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    // Restore connections after hibernation
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong")
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleWebSocket(server, request);
      return new Response(null, { status: 101, webSocket: client });
    }

    const { count } = await this.state.storage.get("count") ?? { count: 0 };
    return Response.json({ connections: this.connections.size, messages: count });
  }

  async handleWebSocket(ws: WebSocket, request: Request) {
    this.state.acceptWebSocket(ws);
    const clientId = crypto.randomUUID();
    this.connections.set(clientId, ws);

    ws.addEventListener("message", async (event) => {
      const message = typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data);

      // Broadcast to all connected clients
      for (const [id, conn] of this.connections) {
        if (id !== clientId) {
          conn.send(JSON.stringify({
            from: clientId,
            message,
            timestamp: Date.now(),
          }));
        }
      }

      // Persist message count
      const { count = 0 } = await this.state.storage.get("count") ?? {};
      await this.state.storage.put("count", { count: count + 1 });
    });

    ws.addEventListener("close", () => {
      this.connections.delete(clientId);
    });
  }
}
```

```typescript
// Worker that routes to Durable Object
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const roomName = url.pathname.split("/")[2]; // /chat/room-name

    // Each room name gets its own Durable Object instance
    const id = env.CHAT_ROOMS.idFromName(roomName);
    const room = env.CHAT_ROOMS.get(id);

    return room.fetch(request);
  },
};
```

### Cloudflare D1: Edge SQL Database

```typescript
// D1: SQLite at the edge, replicated globally
async function getUser(env: Env, userId: string) {
  const user = await env.MY_DB
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(userId)
    .first();

  return user;
}

async function createUser(env: Env, name: string, email: string) {
  const id = crypto.randomUUID();
  await env.MY_DB
    .prepare("INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, name, email, new Date().toISOString())
    .run();

  return { id, name, email };
}

// Batch operations
async function getUsersWithPosts(env: Env) {
  const [users, posts] = await env.MY_DB.batch([
    env.MY_DB.prepare("SELECT * FROM users LIMIT 10"),
    env.MY_DB.prepare("SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC LIMIT 20"),
  ]);

  return {
    users: users.results,
    posts: posts.results,
  };
}
```

## Deno Deploy

Deno Deploy runs TypeScript and JavaScript at the edge natively — no compilation step, no transpilation. Built on V8 like Cloudflare Workers, but with Deno's web-standard APIs and ecosystem.

```typescript
// main.ts — runs on Deno Deploy
import { Hono } from "jsr:@hono/hono@4";

const app = new Hono();

// Geolocation from request headers (Deno Deploy injects these)
app.get("/api/location", (c) => {
  const country = c.req.header("x-deno-region") ?? "unknown";
  return c.json({
    region: Deno.env.get("DENO_REGION") ?? "unknown",
    country,
  });
});

// Deno KV — globally replicated key-value store
const kv = await Deno.openKv();

app.get("/api/counter", async (c) => {
  const key = ["counters", "global"];
  const entry = await kv.get(key);
  return c.json({ count: Number(entry.value ?? 0) });
});

app.post("/api/counter/increment", async (c) => {
  const key = ["counters", "global"];

  // Atomic increment
  const result = await kv.atomic()
    .sum(key, 1n)
    .commit();

  const current = await kv.get(key);
  return c.json({ count: Number(current.value) });
});

Deno.serve(app.fetch);
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to Deno Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/deployctl@v1
        with:
          project: my-api
          entrypoint: main.ts
```

## Fastly Compute

Fastly Compute runs WebAssembly, enabling near-zero cold starts and any language that compiles to WASM.

```rust
// src/main.rs — Fastly Compute with Rust
use fastly::http::{header, Method, StatusCode};
use fastly::{Error, Request, Response};

#[fastly::main]
fn main(req: Request) -> Result<Response, Error> {
    // Route based on path
    match (req.get_method(), req.get_path()) {
        (&Method::GET, "/api/hello") => {
            Ok(Response::from_body(r#"{"message": "Hello from Fastly edge!"}"#)
                .with_content_type(mime::APPLICATION_JSON)
                .with_status(StatusCode::OK))
        }

        (&Method::GET, path) if path.starts_with("/api/") => {
            handle_api(req)
        }

        _ => Ok(Response::from_status(StatusCode::NOT_FOUND)),
    }
}

fn handle_api(req: Request) -> Result<Response, Error> {
    // Forward to origin with custom header
    let bereq = req.clone_without_body()
        .with_header("X-Edge-Node", "fastly");

    let beresp = bereq.send("origin_backend")?;
    Ok(beresp)
}
```

## Edge Databases in 2026

Running code at the edge without data access is limited. Edge databases solve this:

| Database | Type | Best for |
|----------|------|---------|
| Cloudflare D1 | SQLite (read replicas) | SQL queries, small-medium datasets |
| Cloudflare KV | Key-value | Sessions, config, rate limiting |
| Durable Objects | Stateful KV | Real-time, collaborative state |
| PlanetScale (Boost) | MySQL (edge cache) | Large MySQL workloads |
| Turso | SQLite (libSQL) | Embedded SQLite at edge |
| Upstash Redis | Redis | Pub/sub, leaderboards, caching |

### Turso: SQLite at the Edge

```typescript
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Full SQL at the edge
const users = await client.execute({
  sql: "SELECT * FROM users WHERE active = ? ORDER BY created_at DESC LIMIT 10",
  args: [1],
});

// Transactions
const tx = await client.transaction("write");
try {
  await tx.execute({
    sql: "INSERT INTO orders (id, user_id, total) VALUES (?, ?, ?)",
    args: [orderId, userId, total],
  });
  await tx.execute({
    sql: "UPDATE users SET order_count = order_count + 1 WHERE id = ?",
    args: [userId],
  });
  await tx.commit();
} catch (error) {
  await tx.rollback();
  throw error;
}
```

## Edge Middleware Patterns

One of the most valuable edge use cases: middleware that runs before your app handles the request.

### Authentication at the Edge

```typescript
// Cloudflare Worker middleware — validates JWT before request reaches origin
import { verify } from "@tsndr/cloudflare-worker-jwt";

export default {
  async fetch(request: Request, env: Env) {
    // Public routes bypass auth
    const url = new URL(request.url);
    if (url.pathname.startsWith("/public/") || url.pathname === "/login") {
      return fetch(request);
    }

    // Extract and verify JWT
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.slice(7);
    const isValid = await verify(token, env.JWT_SECRET);

    if (!isValid) {
      return new Response("Invalid token", { status: 401 });
    }

    // Forward to origin with verified user info
    const payload = JSON.parse(atob(token.split(".")[1]));
    const modifiedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        "X-User-Id": payload.sub,
        "X-User-Role": payload.role,
      },
    });

    return fetch(modifiedRequest);
  },
};
```

### A/B Testing at the Edge

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      // Assign variant based on cookie or random
      let variant = request.headers.get("Cookie")
        ?.match(/ab_variant=([a-z])/)?.[1];

      if (!variant) {
        variant = Math.random() < 0.5 ? "a" : "b";
      }

      // Route to different origin paths
      const targetUrl = variant === "b"
        ? new URL("/variants/homepage-v2", url)
        : url;

      const response = await fetch(new Request(targetUrl, request));

      // Set variant cookie
      const modifiedResponse = new Response(response.body, response);
      if (!request.headers.get("Cookie")?.includes("ab_variant")) {
        modifiedResponse.headers.set(
          "Set-Cookie",
          `ab_variant=${variant}; Max-Age=2592000; Path=/; HttpOnly`
        );
      }

      return modifiedResponse;
    }

    return fetch(request);
  },
};
```

## Edge vs Serverless vs Containers

| Aspect | Edge | Serverless (Lambda) | Containers (Fargate) |
|--------|------|--------------------|--------------------|
| Cold start | <1ms | 100–500ms | 2–30s |
| Latency | 5–50ms | 50–200ms | 10–100ms |
| Global distribution | Automatic | Manual (multi-region) | Manual |
| State | Limited (KV, DO) | Stateless | Stateful |
| Max execution time | 30–300s | 15 minutes | Unlimited |
| Memory | 128MB–2GB | 128MB–10GB | Configurable |
| Cost | Per request | Per request + duration | Per container hour |
| Node.js compat | Partial | Full | Full |

**Use edge for:**
- Authentication/authorization middleware
- Rate limiting and bot protection
- Personalization and A/B testing
- API responses cacheable at edge
- Geolocation-based routing
- Real-time collaboration (Durable Objects)

**Use serverless for:**
- CPU-intensive operations (ML inference, image processing)
- Complex business logic needing full Node.js ecosystem
- Long-running operations
- Database migrations

**Use containers for:**
- Long-running services (WebSocket servers, background workers)
- Applications requiring full OS access
- Services with complex state management

## Pricing Comparison (2026)

| Platform | Free Tier | Paid (per million requests) |
|----------|-----------|---------------------------|
| Cloudflare Workers | 100k req/day | $0.30 |
| Deno Deploy | 100k req/day | $2.00 |
| Fastly Compute | 500k req/month | $0.50 |
| Vercel Edge | 500k req/month | Included in Pro |
| AWS Lambda@Edge | 1M req/month | $0.60 |

For most applications, Cloudflare Workers offers the best price-performance at scale.

## Conclusion

Edge computing in 2026 is ready for production workloads. Cloudflare Workers is the most feature-complete platform with KV, D1, R2, Durable Objects, and a massive global network. Deno Deploy offers the cleanest TypeScript-native developer experience. Fastly Compute's WASM runtime enables the absolute fastest cold starts.

The key insight: **edge is not a replacement for traditional backends, it's a complement**. Use edge for latency-sensitive operations (auth, routing, caching, personalization) and route complex operations to your regional servers. This hybrid approach gives you the best of both worlds: sub-10ms response times for most requests, full Node.js capabilities for complex logic.

Start with Cloudflare Workers — the free tier is generous, the DX is excellent, and the ecosystem is the most mature. Add Durable Objects when you need real-time stateful features.

---

*Related: [WebAssembly 2026](/blog/webassembly-2026-complete-guide), [Deno 2.0 Production Guide](/blog/deno-2-production-guide-2026), [Platform Engineering 2026](/blog/platform-engineering-idp-guide-2026)*
