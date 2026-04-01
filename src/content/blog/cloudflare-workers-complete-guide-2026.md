---
title: "Cloudflare Workers: Complete Guide to Building Edge APIs in 2026"
description: "Complete guide to Cloudflare Workers in 2026. Learn Workers architecture, KV, D1, R2, Durable Objects, Workers AI, and Hono framework with real code examples."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["cloudflare-workers", "edge-computing", "serverless", "cloudflare", "wrangler", "hono", "web-apis"]
readingTime: "12 min read"
---

Cloudflare Workers launched in 2017 as a curiosity — JavaScript at the edge, running in Cloudflare's CDN. Today it's a full application platform. With KV, D1, R2, Durable Objects, Queues, and Workers AI, you can build production applications that run globally without managing a single server.

This guide walks through every major piece of the Workers platform with real code you can use today.

---

## How Workers Actually Run

Workers run on Cloudflare's global network — over 300 Points of Presence (PoPs) in 2026. When a user in Singapore hits your Worker, it runs in Singapore. Not us-east-1, not your origin — in Singapore.

The execution model is V8 isolates, not containers or VMs. V8 is the JavaScript engine in Chrome. Cloudflare runs thousands of Workers on each machine by creating isolated V8 contexts per Worker. Startup time is microseconds, not the hundreds of milliseconds you pay with Lambda cold starts.

Each Worker has access to:
- The full Fetch API (make HTTP requests)
- Web Crypto API (crypto operations)
- Cache API (Cloudflare's cache layer)
- Request/Response Web APIs
- Cloudflare-specific bindings (KV, D1, R2, etc.)

What Workers do *not* have: Node.js APIs (`fs`, `net`, `child_process`), native binary modules, or persistent filesystem. This is by design — the constraints enable the speed.

---

## Project Setup with Wrangler CLI

Wrangler is the official CLI for Workers development. Install it globally:

```bash
npm install -g wrangler
wrangler login
```

Create a new Worker project:

```bash
wrangler init my-api --yes
cd my-api
```

Your `wrangler.toml` config file:

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-03-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

# KV namespace binding
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# D1 database binding
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

# R2 bucket binding
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"
```

Run locally:

```bash
wrangler dev     # Local dev server with hot reload
wrangler deploy  # Deploy to production (< 5 seconds)
```

---

## Basic Worker: Request Routing

A Worker is just a module that exports a default `fetch` handler:

```typescript
// src/index.ts
export interface Env {
  CACHE: KVNamespace;
  DB: D1Database;
  STORAGE: R2Bucket;
  API_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/api/health':
        return Response.json({ status: 'ok', region: request.cf?.colo });
      case '/api/users':
        return handleUsers(request, env);
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleUsers(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const users = await env.DB.prepare('SELECT id, name, email FROM users LIMIT 50').all();
  return Response.json(users.results);
}
```

---

## KV Storage: Globally Distributed Key-Value

Workers KV is a eventually-consistent global key-value store. Reads are fast (served from the nearest PoP), writes propagate globally in under 60 seconds.

**Best for:** Configuration, user sessions, feature flags, cached API responses.

**Not for:** Shopping carts, counters, or anything needing strong consistency.

```typescript
// Storing data in KV
await env.CACHE.put('user:1001', JSON.stringify({
  id: 1001,
  name: 'Alice',
  plan: 'pro'
}), {
  expirationTtl: 3600  // expire after 1 hour
});

// Reading from KV
const raw = await env.CACHE.get('user:1001');
const user = raw ? JSON.parse(raw) : null;

// Reading with metadata
const { value, metadata } = await env.CACHE.getWithMetadata('user:1001', { type: 'json' });

// Listing keys
const keys = await env.CACHE.list({ prefix: 'user:', limit: 100 });
keys.keys.forEach(key => console.log(key.name));

// Deleting
await env.CACHE.delete('user:1001');
```

**Pattern: Cache-aside with KV**

```typescript
async function getUserWithCache(userId: string, env: Env): Promise<User | null> {
  const cacheKey = `user:${userId}`;

  // Try cache first
  const cached = await env.CACHE.get(cacheKey, { type: 'json' }) as User | null;
  if (cached) return cached;

  // Cache miss — fetch from D1
  const result = await env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (result) {
    // Store in cache for 5 minutes
    await env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });
  }

  return result ?? null;
}
```

---

## D1: SQLite at the Edge

D1 is Cloudflare's edge relational database built on SQLite. In 2026, D1 supports read replication across all Cloudflare regions, meaning reads are served locally while writes go to the primary.

```typescript
// Schema migrations — create a migration file
// migrations/0001_init.sql
/*
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
*/
```

Apply migration:

```bash
wrangler d1 migrations apply my-database
```

**CRUD operations:**

```typescript
// INSERT
async function createUser(env: Env, user: { id: string; email: string; name: string }) {
  await env.DB
    .prepare('INSERT INTO users (id, email, name) VALUES (?, ?, ?)')
    .bind(user.id, user.email, user.name)
    .run();
}

// SELECT single row
async function getUser(env: Env, id: string) {
  return env.DB
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(id)
    .first<User>();
}

// SELECT multiple rows with JOIN
async function getUserPosts(env: Env, userId: string) {
  const { results } = await env.DB
    .prepare(`
      SELECT p.*, u.name as author_name
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ? AND p.published = 1
      ORDER BY p.created_at DESC
      LIMIT 20
    `)
    .bind(userId)
    .all<PostWithAuthor>();
  return results;
}

// Batch operations (runs in a transaction)
async function batchInsertPosts(env: Env, posts: Post[]) {
  const stmts = posts.map(post =>
    env.DB
      .prepare('INSERT INTO posts (id, user_id, title, body) VALUES (?, ?, ?, ?)')
      .bind(post.id, post.userId, post.title, post.body)
  );
  await env.DB.batch(stmts);
}
```

D1 limitations to know: Not suited for high-concurrency writes (SQLite's writer lock applies). Great for read-heavy workloads with moderate writes.

---

## R2: Object Storage Without Egress Fees

R2 is Cloudflare's S3-compatible object storage with **zero egress fees**. This alone can save significant costs versus S3 at scale.

```typescript
// Upload a file
async function uploadFile(env: Env, key: string, file: File): Promise<void> {
  await env.STORAGE.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=86400'
    },
    customMetadata: {
      uploadedAt: new Date().toISOString(),
      originalName: file.name
    }
  });
}

// Download a file
async function getFile(env: Env, key: string): Promise<Response> {
  const object = await env.STORAGE.get(key);

  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
}

// Generate a presigned URL (requires R2 public bucket or signed URL worker)
async function listFiles(env: Env, prefix: string) {
  const objects = await env.STORAGE.list({ prefix, limit: 100 });
  return objects.objects.map(obj => ({
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded
  }));
}
```

---

## Durable Objects: Stateful Edge Logic

Durable Objects are the killer feature for stateful applications. Each Durable Object is a single-threaded actor with its own storage, running in a specific Cloudflare datacenter. Perfect for: WebSocket rooms, rate limiters, collaborative editing, game state.

```typescript
// durable-objects/chat-room.ts
export class ChatRoom {
  private state: DurableObjectState;
  private sessions: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server);
    this.sessions.add(server);

    server.addEventListener('message', (event) => {
      // Broadcast to all connected clients
      const message = JSON.stringify({
        timestamp: Date.now(),
        data: event.data
      });
      this.sessions.forEach(ws => {
        if (ws.readyState === WebSocket.READY_STATE_OPEN) {
          ws.send(message);
        }
      });
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}

// In your main worker:
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('room') ?? 'default';

    // Get or create the Durable Object for this room
    const id = env.CHAT_ROOM.idFromName(roomId);
    const room = env.CHAT_ROOM.get(id);

    return room.fetch(request);
  }
};
```

---

## Workers AI: LLM Inference at the Edge

Workers AI lets you run inference on models (Llama, Mistral, Whisper, image models) directly at the edge — no separate API key for OpenAI required.

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const { prompt } = await request.json<{ prompt: string }>();

    // Text generation with Llama 3.1 8B
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 512,
      stream: false
    });

    // Text embedding
    const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: ['Hello, world!', 'Goodbye, world!']
    });

    // Image classification
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const classification = await env.AI.run('@cf/microsoft/resnet-50', {
      image: [...new Uint8Array(await imageFile.arrayBuffer())]
    });

    return Response.json({ response, embeddings, classification });
  }
};
```

---

## Hono: The Best Framework for Workers

[Hono](https://hono.dev) is a lightweight, ultra-fast web framework built for edge runtimes. It works on Workers, Deno, Bun, and Node.js — and gives you Express-like ergonomics with zero overhead.

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({ origin: ['https://example.com'] }));
app.use('/api/protected/*', jwt({ secret: (c) => c.env.JWT_SECRET }));

// Request validation with Zod
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8)
});

app.post('/api/users', zValidator('json', createUserSchema), async (c) => {
  const { email, name, password } = c.req.valid('json');

  // Hash password
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  );
  const hashHex = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const id = crypto.randomUUID();
  await c.env.DB
    .prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)')
    .bind(id, email, name, hashHex)
    .run();

  return c.json({ id, email, name }, 201);
});

app.get('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB
    .prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
    .bind(id)
    .first();

  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json(user);
});

app.get('/api/protected/profile', async (c) => {
  const payload = c.get('jwtPayload');
  const user = await c.env.DB
    .prepare('SELECT id, email, name FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();
  return c.json(user);
});

export default app;
```

---

## Cron Triggers: Scheduled Workers

Run Workers on a schedule without EventBridge or cron VMs:

```toml
# wrangler.toml
[triggers]
crons = ["0 */6 * * *"]  # Every 6 hours
```

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log(`Cron triggered: ${event.cron} at ${new Date(event.scheduledTime)}`);

    // Clean up expired cache entries
    const list = await env.CACHE.list({ prefix: 'session:' });
    for (const key of list.keys) {
      if (key.expiration && key.expiration < Date.now() / 1000) {
        await env.CACHE.delete(key.name);
      }
    }

    // Sync data to external API
    const { results } = await env.DB
      .prepare('SELECT * FROM events WHERE synced = 0 LIMIT 100')
      .all();

    if (results.length > 0) {
      await fetch('https://analytics.example.com/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
      });

      const ids = results.map((r: any) => r.id);
      await env.DB.prepare(`UPDATE events SET synced = 1 WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .run();
    }
  }
};
```

---

## Deployment and Environments

```bash
# Local development
wrangler dev

# Deploy to production
wrangler deploy

# Deploy to a named environment (staging)
wrangler deploy --env staging

# Tail live logs
wrangler tail

# Set a secret (never put secrets in wrangler.toml)
wrangler secret put JWT_SECRET

# Create a KV namespace
wrangler kv namespace create CACHE
wrangler kv namespace create CACHE --preview  # for local dev

# Create a D1 database
wrangler d1 create my-database

# Apply D1 migrations
wrangler d1 migrations apply my-database --remote
```

---

## Production Checklist

Before you ship a Workers-based API to production:

- Set `compatibility_date` to a recent date and test with it
- Use `wrangler secret put` for all sensitive values — never commit them to `wrangler.toml`
- Enable `nodejs_compat` flag if you use any npm packages expecting Node globals
- Add request validation (Zod + Hono's `zValidator`) on all POST/PUT endpoints
- Set appropriate `Cache-Control` headers on GET responses served from KV or D1
- Monitor with `wrangler tail` and set up Cloudflare's Workers Analytics
- Use D1's batch API for multi-row writes to avoid partial failures
- Test Durable Objects locally with `wrangler dev` before deploying — behavior is consistent

Cloudflare Workers in 2026 is one of the most compelling platforms for building APIs. Sub-5ms cold starts, global distribution by default, and a growing storage ecosystem make it the right choice for latency-sensitive, globally-distributed applications.
