---
title: "Cloudflare Workers & Serverless Edge Computing: Complete Guide for 2026"
description: "Learn how to build and deploy serverless APIs with Cloudflare Workers. Covers Worker syntax, KV storage, D1 database, Durable Objects, and R2 — with TypeScript examples you can use today."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["cloudflare", "serverless", "edge-computing", "workers", "typescript"]
readingTime: "12 min read"
---

Edge computing has moved from buzzword to production reality. Today, Cloudflare Workers lets you deploy TypeScript or JavaScript that runs in 300+ cities worldwide — with no servers to manage, no region selection, and startup times measured in microseconds rather than seconds.

This guide covers everything you need to build real serverless APIs on Cloudflare Workers in 2026: the Worker runtime model, TypeScript syntax, and all the integrated storage primitives (KV, D1, Durable Objects, R2). By the end, you'll have the mental model to ship production-grade edge applications.

---

## What Is Cloudflare Workers?

Cloudflare Workers is a serverless execution environment built on V8 isolates — the same engine that powers Chrome and Node.js. Unlike Lambda or Cloud Functions, Workers don't use containers or virtual machines. Instead, each Worker runs in a V8 isolate that spins up in under a millisecond.

This architecture has two major practical consequences:

**No cold starts.** Traditional serverless functions (AWS Lambda, Google Cloud Functions) suffer from cold starts of 100ms–2 seconds when a container is provisioned on demand. V8 isolates start in ~1ms. Your first request is as fast as your 100,000th.

**Global by default.** Deploy once and your code runs at the Cloudflare data center closest to each user. A user in Tokyo hits a Tokyo data center. A user in São Paulo hits a local PoP. You don't choose regions — Cloudflare handles it automatically.

### The Workers Runtime Model

Workers uses a subset of the Web Platform APIs. You write request handlers using the `fetch` event model or the newer `export default` module syntax:

```typescript
// Module syntax (recommended)
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/hello') {
      return Response.json({ message: 'Hello from the edge!' });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

The `Env` interface holds your bindings — KV namespaces, D1 databases, R2 buckets, secrets, and environment variables. You define it to get TypeScript type checking:

```typescript
interface Env {
  KV_STORE: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
  API_SECRET: string;
}
```

### Routing Without a Framework

For simple APIs, you can route requests using URL patterns directly:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Route matching
    if (request.method === 'GET' && pathname === '/users') {
      return handleGetUsers(env);
    }

    if (request.method === 'POST' && pathname === '/users') {
      return handleCreateUser(request, env);
    }

    // Pattern matching for dynamic segments
    const userMatch = pathname.match(/^\/users\/([a-z0-9-]+)$/);
    if (userMatch) {
      const userId = userMatch[1];
      return handleGetUser(userId, env);
    }

    return new Response('Not found', { status: 404 });
  },
};
```

For more complex routing, consider [Hono](https://hono.dev/) — a minimal framework designed for Workers that adds route parameters, middleware, and a clean API without bloating your bundle.

### Handling Request Bodies

Workers supports all standard `Request` methods for reading bodies:

```typescript
async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  // Validate Content-Type
  if (!request.headers.get('Content-Type')?.includes('application/json')) {
    return Response.json({ error: 'Expected JSON body' }, { status: 415 });
  }

  let body: { name: string; email: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name || !body.email) {
    return Response.json({ error: 'name and email are required' }, { status: 400 });
  }

  // Process the user...
  return Response.json({ id: crypto.randomUUID(), ...body }, { status: 201 });
}
```

---

## KV Storage: Eventually Consistent Key-Value at the Edge

Workers KV is a globally distributed key-value store. Writes propagate to all regions within ~60 seconds. Reads are served from the nearest cache, making them extremely fast — typically under 5ms.

**When to use KV:**
- Session tokens and authentication state
- Feature flags and configuration
- Cached API responses
- Rate limiting counters (approximate)
- Static content metadata

**When NOT to use KV:**
- Data requiring strong consistency (use D1 instead)
- Data that changes more often than once per second
- Relational or queryable data

### Basic KV Operations

```typescript
// Read a value
const value = await env.KV_STORE.get('user:abc123');
if (value === null) {
  return Response.json({ error: 'User not found' }, { status: 404 });
}

// Write with optional TTL (seconds)
await env.KV_STORE.put('user:abc123', JSON.stringify({ name: 'Alice' }), {
  expirationTtl: 3600, // expires in 1 hour
});

// Delete
await env.KV_STORE.delete('user:abc123');

// List keys with a prefix
const keys = await env.KV_STORE.list({ prefix: 'user:' });
for (const key of keys.keys) {
  console.log(key.name); // 'user:abc123', 'user:def456', etc.
}
```

### Storing JSON Objects

KV stores strings, but you'll almost always store JSON. A small helper keeps this clean:

```typescript
async function kvGet<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (raw === null) return null;
  return JSON.parse(raw) as T;
}

async function kvSet<T>(kv: KVNamespace, key: string, value: T, ttl?: number): Promise<void> {
  await kv.put(key, JSON.stringify(value), ttl ? { expirationTtl: ttl } : undefined);
}
```

---

## D1 Database: SQLite at the Edge

D1 is Cloudflare's serverless SQL database, built on SQLite. Unlike KV, D1 provides full SQL semantics: transactions, foreign keys, indexes, and complex queries. In 2026, D1 is production-ready with low read latencies and support for databases up to 10GB.

**When to use D1:**
- Any structured relational data
- User accounts, content, orders
- Data with complex query requirements
- Situations where consistency matters

### Creating Your Schema

D1 uses standard SQLite SQL. Define your schema and apply it with `wrangler d1 execute`:

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
```

```bash
wrangler d1 execute MY_DB --file=./schema.sql
```

### Querying D1 from a Worker

D1's API uses prepared statements with positional parameters:

```typescript
// Fetch a user by email
async function getUserByEmail(db: D1Database, email: string) {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; name: string; email: string; created_at: string }>();

  return result; // null if not found
}

// Insert a new user
async function createUser(db: D1Database, name: string, email: string) {
  const result = await db
    .prepare('INSERT INTO users (name, email) VALUES (?, ?) RETURNING *')
    .bind(name, email)
    .first<{ id: string; name: string; email: string }>();

  return result;
}

// Fetch multiple rows
async function getUserPosts(db: D1Database, userId: string) {
  const result = await db
    .prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .bind(userId)
    .all<{ id: string; title: string; content: string; created_at: string }>();

  return result.results;
}
```

### Transactions

D1 supports transactions via `batch()`, which executes multiple statements atomically:

```typescript
async function createPostWithTag(
  db: D1Database,
  userId: string,
  title: string,
  content: string,
  tagName: string
) {
  const postId = crypto.randomUUID();

  const results = await db.batch([
    db.prepare('INSERT INTO posts (id, user_id, title, content) VALUES (?, ?, ?, ?)')
      .bind(postId, userId, title, content),
    db.prepare('INSERT INTO tags (post_id, name) VALUES (?, ?)')
      .bind(postId, tagName),
  ]);

  // If either statement fails, both are rolled back
  return results;
}
```

---

## Durable Objects: Stateful Edge Coordination

Durable Objects are the most powerful and most misunderstood primitive in the Workers ecosystem. Each Durable Object is a single-threaded actor that:

1. Has a **unique ID** derived from a name or random generation
2. Runs in a **single location** globally (not replicated)
3. Has **persistent key-value storage** local to that object
4. Receives messages **sequentially** — no concurrency issues within one object

**The key insight:** Durable Objects solve the coordination problem. When you need global consistency — a shared counter, a chat room, a collaborative document — you route all relevant requests to the same Durable Object. That object processes them one at a time, so there's no race condition.

### Implementing a Rate Limiter

A classic Durable Objects use case: a rate limiter that works globally, not per-region:

```typescript
export class RateLimiter implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const now = Date.now();
    const windowMs = 60_000; // 1 minute window
    const maxRequests = 100;

    // Get current count and window start
    const windowStart = (await this.state.storage.get<number>('windowStart')) ?? now;
    let count = (await this.state.storage.get<number>('count')) ?? 0;

    // Reset if window has expired
    if (now - windowStart > windowMs) {
      count = 0;
      await this.state.storage.put('windowStart', now);
    }

    count++;
    await this.state.storage.put('count', count);

    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    return Response.json({ allowed, remaining, count });
  }
}
```

### Using a Durable Object from a Worker

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Derive a stable ID from the client IP
    const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const rateLimiterId = env.RATE_LIMITER.idFromName(clientIp);
    const rateLimiter = env.RATE_LIMITER.get(rateLimiterId);

    // Forward the request to the Durable Object
    const limitResponse = await rateLimiter.fetch(request);
    const { allowed } = await limitResponse.json<{ allowed: boolean }>();

    if (!allowed) {
      return new Response('Too many requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    // Handle the actual request
    return handleRequest(request, env);
  },
};
```

---

## R2: Object Storage Without Egress Fees

R2 is Cloudflare's S3-compatible object storage. The headline feature: **zero egress fees**. On AWS S3, serving data to users costs $0.09/GB. On R2, egress is free. For any workload that serves large files to users, this difference is significant.

R2 is accessible from Workers via a simple API:

```typescript
// Upload a file
async function uploadFile(bucket: R2Bucket, key: string, body: ArrayBuffer, contentType: string) {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: { uploadedAt: new Date().toISOString() },
  });
}

// Download a file
async function serveFile(bucket: R2Bucket, key: string): Promise<Response> {
  const object = await bucket.get(key);

  if (object === null) {
    return new Response('Object not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}

// Delete a file
async function deleteFile(bucket: R2Bucket, key: string) {
  await bucket.delete(key);
}

// List objects with a prefix
async function listFiles(bucket: R2Bucket, prefix: string) {
  const listed = await bucket.list({ prefix, limit: 100 });
  return listed.objects.map((obj) => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
  }));
}
```

### Building a File Upload Endpoint

A practical example — accepting file uploads from clients and storing them in R2:

```typescript
async function handleUpload(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get('Content-Type') ?? '';

  if (!contentType.startsWith('multipart/form-data')) {
    return Response.json({ error: 'Expected multipart/form-data' }, { status: 415 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Enforce size limit (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 10MB)' }, { status: 413 });
  }

  const key = `uploads/${crypto.randomUUID()}-${file.name}`;
  const buffer = await file.arrayBuffer();

  await env.BUCKET.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ key, size: file.size, url: `/files/${key}` }, { status: 201 });
}
```

---

## Wrangler: Local Development and Deployment

Wrangler is the Cloudflare CLI for Workers. A minimal `wrangler.toml` for a project using all the storage primitives looks like:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[[kv_namespaces]]
binding = "KV_STORE"
id = "your-kv-id"
preview_id = "your-preview-kv-id"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-db-id"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "my-bucket"

[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"
```

Key commands:

```bash
# Start local development server
wrangler dev

# Run D1 migrations
wrangler d1 execute MY_DB --file=./schema.sql

# Deploy to production
wrangler deploy

# Tail production logs
wrangler tail
```

Local development with `wrangler dev` emulates KV, D1, R2, and Durable Objects locally using SQLite under the hood — no Cloudflare account needed for development.

---

## Production Patterns

### CORS Middleware

```typescript
function withCors(response: Response, origin: string): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, { status: response.status, headers });
}
```

### Error Boundaries

Wrap your handlers to ensure errors return clean JSON responses rather than 500 HTML:

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await router(request, env, ctx);
    } catch (err) {
      console.error('Unhandled error:', err);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
};
```

### Authentication with JWT

Workers includes the Web Crypto API for verifying JWT tokens without external dependencies:

```typescript
async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  if (!valid) return null;

  return JSON.parse(atob(payloadB64));
}
```

---

## Pricing Overview

Cloudflare Workers pricing (as of 2026):

| Tier | Cost | Includes |
|------|------|----------|
| Free | $0/month | 100k requests/day, 10ms CPU/request |
| Workers Paid | $5/month | 10M requests/month, 30ms CPU/request |
| Additional requests | $0.30/million | — |
| D1 reads | $0.001/million | First 5M/day free |
| D1 writes | $1/million | First 100k/day free |
| KV reads | $0.50/million | First 10M/day free |
| R2 storage | $0.015/GB/month | 10GB free |
| R2 egress | **$0** | Always free |

For most applications, the free tier handles development and low-traffic production. The $5/month Workers Paid plan covers the majority of production workloads.

---

## When to Choose Workers vs. Other Options

**Choose Cloudflare Workers when:**
- You need global low-latency APIs (< 50ms worldwide)
- You're building a new project and want zero infrastructure management
- You need close integration with Cloudflare's CDN, WAF, or DNS
- You're cost-sensitive about egress (especially with R2)

**Consider alternatives when:**
- You need long-running computations (Workers CPU limit is 30ms on free, 30s+ on paid)
- You need specific runtime features not available in V8 (filesystem access, native modules)
- Your team is deeply invested in existing Node.js tooling
- You need database options beyond SQLite (e.g., Postgres with complex extensions)

---

## Getting Started Checklist

1. **Install Wrangler:** `npm install -g wrangler`
2. **Authenticate:** `wrangler login`
3. **Create a project:** `wrangler init my-worker`
4. **Add storage bindings** to `wrangler.toml` as needed
5. **Run locally:** `wrangler dev`
6. **Deploy:** `wrangler deploy`

Cloudflare Workers is one of the most mature edge platforms available in 2026. The combination of zero cold starts, global deployment, and integrated storage primitives (KV, D1, R2, Durable Objects) makes it a compelling choice for API-heavy applications where latency and reliability matter.

Start with a simple Worker, add D1 when you need structured data, KV for caching and sessions, and reach for Durable Objects only when you genuinely need global consistency. That progression covers the vast majority of production use cases.
