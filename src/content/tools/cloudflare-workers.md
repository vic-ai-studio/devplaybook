---
title: "Cloudflare Workers"
description: "Edge serverless platform running JavaScript/TypeScript and WebAssembly at 300+ global PoPs — sub-millisecond cold starts, KV storage, D1 database, R2 object storage, and Durable Objects."
category: "WebAssembly & Edge Computing"
pricing: "Freemium"
pricingDetail: "Free: 100K requests/day; Paid $5/month for 10M requests + compute time"
website: "https://workers.cloudflare.com"
github: "https://github.com/cloudflare/workers-sdk"
tags: [edge-computing, serverless, cloudflare, javascript, typescript, wasm, api]
pros:
  - "300+ edge locations — near-zero latency globally"
  - "Sub-1ms cold starts (V8 isolates, not containers)"
  - "Integrated storage: KV, D1 (SQLite), R2 (S3-compatible), Durable Objects"
  - "Full Fetch API and Web Platform APIs available"
  - "Free tier is generous for most side projects"
cons:
  - "30ms CPU time limit per request (paid: 30s)"
  - "Node.js APIs not available (though compatibility layer is improving)"
  - "D1 and Durable Objects add vendor lock-in"
  - "Debugging requires Wrangler CLI or live tail logs"
date: "2026-04-02"
---

## Overview

Cloudflare Workers run JavaScript/TypeScript code at Cloudflare's global network edge, near your users. The V8 isolate model (not containers) enables ~1ms cold starts and dense multi-tenancy. With D1 (SQLite at edge), KV, and Durable Objects, you can build complete applications on Workers.

## Hello World

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/hello') {
      return Response.json({ message: 'Hello from the edge!', region: request.cf?.colo });
    }

    return new Response('Not Found', { status: 404 });
  },
};

interface Env {
  MY_KV: KVNamespace;
  DB: D1Database;
  MY_SECRET: string;
}
```

## Wrangler CLI

```bash
npm install -D wrangler
npx wrangler login

# Create new worker
npx wrangler init my-worker

# Local dev (runs Workers runtime locally)
npx wrangler dev

# Deploy
npx wrangler deploy

# Tail live logs
npx wrangler tail
```

## KV Storage

```typescript
// KV: globally replicated key-value store
async fetch(request: Request, env: Env) {
  const key = 'user:123';

  // Write
  await env.MY_KV.put(key, JSON.stringify({ name: 'Alice' }), {
    expirationTtl: 3600,  // Optional TTL in seconds
  });

  // Read
  const value = await env.MY_KV.get(key, { type: 'json' });

  // List
  const { keys } = await env.MY_KV.list({ prefix: 'user:' });

  return Response.json(value);
}
```

## D1 Database (SQLite at Edge)

```typescript
async fetch(request: Request, env: Env) {
  // Query D1 (SQLite running at the edge)
  const { results } = await env.DB.prepare(
    'SELECT * FROM products WHERE category = ? AND price < ? LIMIT 20'
  ).bind('electronics', 500).all();

  // Batch operations
  await env.DB.batch([
    env.DB.prepare('INSERT INTO orders (user_id, product_id) VALUES (?, ?)').bind(userId, productId),
    env.DB.prepare('UPDATE inventory SET stock = stock - 1 WHERE id = ?').bind(productId),
  ]);

  return Response.json(results);
}
```

## wrangler.toml Configuration

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2026-04-01"

[[kv_namespaces]]
binding = "MY_KV"
id = "abc123"

[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xyz789"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"

[vars]
ENVIRONMENT = "production"
```
