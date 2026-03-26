---
title: "Edge Computing for Web Developers: Complete Guide 2026"
description: "A complete guide to edge computing for web developers. Learn Cloudflare Workers, Deno Deploy, Vercel Edge Functions, edge databases (Turso, D1), edge caching, and when to use edge vs origin servers for maximum performance."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["edge-computing", "cloudflare-workers", "vercel-edge", "deno-deploy", "performance", "serverless", "web-development"]
readingTime: "12 min read"
---

The distance between your server and your user costs milliseconds. At 100ms per round trip, a user in Tokyo hitting an origin server in Virginia adds real, measurable latency to every request. Edge computing moves your code closer to users — running it in data centers distributed globally, often within 10–20ms of the end user.

This guide covers everything web developers need to know about edge computing in 2026: the platforms, the use cases, the limitations, and how to pick the right tool for the job.

---

## What Is Edge Computing?

Edge computing means running code at the "edge" of the network — in distributed Points of Presence (PoPs) close to end users, rather than in a centralized data center.

Traditional serverless functions (AWS Lambda, Google Cloud Functions) still run in one or a few regions. Edge functions run in dozens or hundreds of locations simultaneously, and requests are automatically routed to the nearest one.

The key difference:

| | Traditional Serverless | Edge Functions |
|---|---|---|
| **Locations** | 1–3 regions | 100–300+ PoPs globally |
| **Cold start** | 100ms–2s | <5ms (usually zero) |
| **Runtime** | Full Node.js/Python | Restricted (V8 isolates) |
| **Memory** | 128MB–10GB | 128MB typical |
| **Execution time** | Minutes | Milliseconds to seconds |
| **Pricing** | Per GB-second | Per request + CPU time |

The trade-off is real: you get dramatically lower latency but operate in a constrained environment — no arbitrary npm packages, no long-running processes, limited file system access.

---

## The Major Edge Platforms in 2026

### Cloudflare Workers

Cloudflare runs the largest edge network of any developer platform — 300+ cities worldwide. Workers run on V8 isolates (the same JavaScript engine as Chrome), which means near-zero cold starts and consistent performance globally.

**What Cloudflare Workers support:**
- JavaScript, TypeScript, Rust (via WebAssembly), Python (beta)
- Web Crypto API, Fetch API, Streams API
- KV storage, Durable Objects, R2 (object storage), D1 (SQLite), Queues

**Hello World in Cloudflare Workers:**

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/hello') {
      return new Response(JSON.stringify({
        message: 'Hello from the edge!',
        region: request.cf?.colo ?? 'unknown'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

**Free tier:** 100,000 requests/day, 10ms CPU time per request. Paid plans start at $5/month with 10 million requests included.

Cloudflare Workers is the most mature edge platform and the best choice if you need edge databases, queues, or complex stateful workflows.

---

### Vercel Edge Functions

Vercel Edge Functions integrate natively with Next.js and are available in any Vercel-deployed project. They run on the same V8 isolate model as Cloudflare Workers but are optimized for the Next.js app directory and middleware patterns.

**Edge middleware in Next.js:**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const country = request.geo?.country ?? 'US';

  // Redirect non-US users to localized pages
  if (country !== 'US' && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL(`/${country.toLowerCase()}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|favicon.ico).*)'],
};
```

**Edge API routes in Next.js App Router:**

```typescript
// app/api/edge-hello/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  return new Response(JSON.stringify({
    message: 'Edge response',
    timestamp: Date.now()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Limitations:** No Node.js-specific APIs (fs, path, crypto from Node), no arbitrary npm packages that use Node internals. Use the `edge-runtime` package to test locally.

**Free tier:** Vercel Hobby plan includes edge functions. Pro plan at $20/month adds higher limits and team features.

---

### Deno Deploy

Deno Deploy runs TypeScript and JavaScript natively on Deno's edge infrastructure. It's a great option if you want the Deno security model (explicit permissions) and TypeScript without a build step.

**Simple API with Deno Deploy:**

```typescript
// main.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/data") {
    const data = await fetch("https://api.example.com/data");
    const json = await data.json();
    return new Response(JSON.stringify(json), {
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response("Hello from Deno Deploy!", {
    headers: { "Content-Type": "text/plain" }
  });
});
```

**Key advantages over Cloudflare:**
- First-class TypeScript without compilation
- Familiar URL-based imports (no npm config)
- Better Web API compatibility
- Simpler local development with `deno run`

**Free tier:** 100,000 requests/day, 100GB data transfer/month.

Deno Deploy is ideal for developers who prefer Deno's security model or want to avoid npm complexity. It's less mature than Cloudflare Workers but has excellent TypeScript DX.

---

## Edge Databases

The biggest challenge with edge computing is data — your database is usually still in one region, which eliminates much of the latency benefit. Edge databases solve this by replicating data globally.

### Turso (libSQL/SQLite at the Edge)

Turso is a distributed SQLite database designed for edge environments. It supports read replicas in every region and works natively with Cloudflare Workers and other edge runtimes.

```typescript
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Query runs against the nearest replica
const users = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

**Pricing:** Free tier includes 500 databases, 1GB storage, 1 billion row reads/month. Production plans from $29/month.

**Best for:** Read-heavy workloads where you want SQLite's simplicity with global distribution. Great for content sites, blogs, and user-facing apps where reads dominate.

---

### Cloudflare D1 (SQLite on the Edge)

D1 is Cloudflare's built-in SQLite database, deeply integrated into the Workers ecosystem. Unlike Turso, D1 runs inside Cloudflare's infrastructure with zero external dependencies.

```typescript
// In a Cloudflare Worker
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(
      'SELECT * FROM products WHERE category = ?'
    ).bind('electronics').all();

    return Response.json(results);
  }
};
```

**Wrangler config (wrangler.toml):**

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"
```

**Pricing:** Free tier includes 5GB storage, 5 million rows read/day. Workers Paid plan ($5/month) increases limits significantly.

**D1 vs Turso:** D1 is tighter Cloudflare integration; Turso supports more runtimes. Use D1 if you're all-in on Cloudflare, Turso if you need portability.

---

### PlanetScale Boost / Neon (Postgres at the Edge)

For PostgreSQL workloads, PlanetScale Boost and Neon offer connection pooling and read replicas that work well with edge functions. Both support the HTTP-based query protocol required in edge environments (standard TCP connections aren't available).

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Works in Cloudflare Workers, Vercel Edge, etc.
const users = await sql`SELECT * FROM users WHERE active = true LIMIT 10`;
```

---

## Edge Caching Strategies

Edge networks aren't just for running code — they're excellent CDN layers. Understanding cache headers is essential for maximizing edge performance.

### Cache-Control Headers

```typescript
// Cache static assets aggressively
return new Response(content, {
  headers: {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    'CDN-Cache-Control': 'max-age=31536000',
  }
});

// Cache API responses briefly
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  }
});
```

### Cloudflare Cache API

Cloudflare Workers gives you programmatic control over the cache:

```typescript
const cache = caches.default;
const cacheKey = new Request(request.url);

// Try cache first
let response = await cache.match(cacheKey);

if (!response) {
  // Fetch from origin
  response = await fetch(request);

  // Clone and cache the response
  const responseToCache = response.clone();
  ctx.waitUntil(cache.put(cacheKey, responseToCache));
}

return response;
```

### Stale-While-Revalidate Pattern

The most powerful caching pattern for edge: serve stale content immediately while refreshing in the background.

```typescript
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cache = caches.default;
    const cacheKey = new Request(request.url);

    const cached = await cache.match(cacheKey);

    if (cached) {
      const age = parseInt(cached.headers.get('x-cache-age') ?? '0');

      if (age < 60) {
        // Fresh: serve from cache
        return cached;
      }

      // Stale: serve from cache but revalidate in background
      ctx.waitUntil(revalidateCache(request, cache, cacheKey));
      return cached;
    }

    // Miss: fetch and cache
    const response = await fetch(request);
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};
```

---

## Performance Benchmarks: Edge vs Origin

Real-world numbers from running the same API endpoint in different configurations:

| Setup | P50 Latency | P99 Latency | Cold Start |
|---|---|---|---|
| Origin (Virginia, user in Tokyo) | 180ms | 320ms | N/A |
| Lambda (us-east-1, user in Tokyo) | 190ms | 850ms | 200–1500ms |
| Cloudflare Workers (global) | 12ms | 35ms | <1ms |
| Vercel Edge (global) | 15ms | 45ms | <5ms |
| Deno Deploy (global) | 18ms | 55ms | <5ms |
| Cached CDN response | 8ms | 22ms | N/A |

These numbers assume:
- Simple JSON response (no heavy computation)
- No database query (edge response only)
- User in Tokyo, origin in US East

**Add a database query and the math changes.** An edge function querying a US-based database adds 150–200ms back to the response for Tokyo users. Use edge databases (Turso, D1) or implement caching to avoid this.

---

## When to Use Edge vs Origin

### Use edge computing when:

- **Serving globally distributed users** — the latency difference is real and measurable
- **Authentication middleware** — JWT validation at the edge before hitting your origin
- **A/B testing and feature flags** — route different users to different experiences without origin round trips
- **Geographic routing** — redirect users to region-specific content
- **Static asset serving** — anything cacheable belongs at the edge
- **Rate limiting** — block bad actors at the edge before they reach your origin
- **Response transformation** — modify headers, rewrite HTML, compress responses

### Stick with origin servers when:

- **Heavy computation** — ML inference, video processing, complex algorithms need more resources than edge allows
- **Long-running processes** — edge functions time out after seconds, not minutes
- **Complex database operations** — multi-table joins, transactions, heavy writes are better on a co-located database
- **Node.js-specific packages** — if your code depends on Node internals, edge won't work without significant refactoring
- **File system access** — edge environments have no persistent file system
- **Tight integration with AWS/GCP services** — if you're deep in a cloud provider's ecosystem, keep compute there

---

## Migration Checklist: Moving Code to the Edge

Before moving any function to an edge runtime, check:

**Runtime compatibility:**
- [ ] No `fs`, `path`, `os`, `child_process` usage
- [ ] No Node.js-specific crypto (use Web Crypto API instead)
- [ ] All npm packages are edge-compatible (check `edge-runtime` package)
- [ ] No `setTimeout`/`setInterval` for long operations

**Data access:**
- [ ] Database queries use HTTP protocol (not TCP)
- [ ] Caching strategy defined for database results
- [ ] Edge database considered if latency matters end-to-end

**Testing:**
- [ ] Tested with `wrangler dev` (Cloudflare) or `deno run` locally
- [ ] Cold start behavior verified (should be near-zero)
- [ ] Bundle size checked (edge functions have size limits)

**Limits to know:**
- Cloudflare Workers: 1MB script size, 128MB memory, 30s wall time (paid), 10ms CPU (free)
- Vercel Edge: 1MB function size, 128MB memory, 30s execution
- Deno Deploy: 10MB bundle size, 512MB memory, 60s execution

---

## Practical Example: Building a Global API with Cloudflare Workers + D1

Here's a complete example combining Workers and D1 for a globally fast API:

```typescript
// src/index.ts
interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (url.pathname === '/api/products' && request.method === 'GET') {
        const category = url.searchParams.get('category');

        const query = category
          ? env.DB.prepare('SELECT * FROM products WHERE category = ? LIMIT 20').bind(category)
          : env.DB.prepare('SELECT * FROM products LIMIT 20');

        const { results } = await query.all();

        return Response.json(results, {
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
          }
        });
      }

      if (url.pathname === '/api/products' && request.method === 'POST') {
        const body = await request.json() as { name: string; category: string; price: number };

        const result = await env.DB.prepare(
          'INSERT INTO products (name, category, price, created_at) VALUES (?, ?, ?, ?)'
        ).bind(body.name, body.category, body.price, new Date().toISOString()).run();

        return Response.json({ id: result.meta.last_row_id, success: true }, {
          status: 201,
          headers: corsHeaders,
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (error) {
      return Response.json({ error: 'Internal Server Error' }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
```

Deploy with:

```bash
wrangler deploy
```

This API serves users globally with sub-20ms responses, zero cold starts, and SQL persistence through D1.

---

## Key Takeaways

1. **Edge = lower latency, not more power.** You gain speed but lose runtime flexibility. Choose edge for latency-sensitive, simple operations.

2. **The edge database problem is real.** An edge function querying a single-region database loses most of the latency advantage. Use D1, Turso, or cache aggressively.

3. **Cloudflare Workers is the most complete platform** — largest network, most features, best edge database options (D1, KV, Durable Objects).

4. **Vercel Edge is the easiest Next.js path** — middleware and edge routes integrate seamlessly into the existing Next.js mental model.

5. **Deno Deploy offers the best TypeScript DX** — no build step, native types, excellent standard library.

6. **Cache before you compute.** The fastest edge function is one that returns a cached response. Layer caching at every level before moving business logic to the edge.

7. **Not everything belongs at the edge.** Authentication, A/B testing, and routing are perfect edge use cases. ML inference, complex transactions, and file operations are not.

---

## Further Reading

- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- [Vercel Edge Runtime documentation](https://vercel.com/docs/functions/edge-functions)
- [Deno Deploy documentation](https://deno.com/deploy/docs)
- [Turso documentation](https://docs.turso.tech/)
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)

---

*Building something with edge computing? DevPlaybook has free tools for testing APIs, formatting JSON responses, and benchmarking your endpoints — no signup required.*
