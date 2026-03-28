---
title: "Hono + Cloudflare Workers: Building a Production REST API in 2026"
description: "Deploy a type-safe REST API to Cloudflare's global edge network using Hono. Covers routing, middleware, D1 database, KV storage, authentication, and deployment — with production patterns you can copy today."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["hono", "cloudflare-workers", "edge-computing", "typescript", "api", "d1", "kv", "rest-api", "serverless"]
readingTime: "13 min read"
---

Hono is a small, fast web framework designed for the edge. It runs natively on Cloudflare Workers, Deno Deploy, Bun, and Node.js — but where it shines most is Cloudflare's global network, where your API handler executes within milliseconds of every user on the planet. No cold starts. No region selection. Just code that runs everywhere at once.

This guide walks through building a production-quality REST API using Hono on Cloudflare Workers, with D1 for the database, KV for caching, and proper authentication. All patterns here are production-tested, not toy examples.

---

## Why Hono for Cloudflare Workers?

Before choosing a framework, understand what Workers gives you:

- **Zero cold starts** — Workers use V8 isolates, not containers. Startup is sub-millisecond.
- **Global deployment** — Your code runs in 300+ cities automatically.
- **Integrated storage** — D1 (SQLite at the edge), KV (eventually consistent key-value), R2 (object storage), Queues (async processing).
- **Cost model** — Priced per request (first 100k/day free), not per running instance.

Hono fits this environment because it's designed for it. The entire framework plus your application typically compiles to under 50KB — well within Workers' 1MB script limit. TypeScript support is first-class, and the middleware system maps cleanly to Workers' request/response model.

Alternatives like Express or Fastify don't run on Workers at all. Itty-router is simpler but has no middleware ecosystem. Hono hits the right balance.

---

## Project Setup

```bash
npm create cloudflare@latest my-api
# Choose: Hello World Worker → TypeScript → No (deploy later)

cd my-api
npm install hono
```

Replace `src/index.ts` with a Hono app:

```typescript
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  CACHE: KVNamespace
  API_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.json({ status: 'ok', version: '1.0.0' }))

export default app
```

The `Bindings` type gives you full TypeScript autocompletion for every Worker binding you configure. This is one of Hono's strongest features — the context object `c` carries your bindings with correct types throughout your entire route tree.

---

## Wrangler Configuration

Update `wrangler.toml` to declare your bindings:

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "my-api-db"
database_id = "your-database-id-here"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id-here"

[vars]
ENVIRONMENT = "production"

# Secrets set via `wrangler secret put API_SECRET`
```

Create resources:

```bash
npx wrangler d1 create my-api-db
npx wrangler kv:namespace create CACHE
npx wrangler secret put API_SECRET
```

---

## Routing and Controllers

Hono's routing API is Express-like but more structured. Use `app.route()` to compose sub-applications:

```typescript
// src/routes/users.ts
import { Hono } from 'hono'
import type { Bindings } from '../types'

const users = new Hono<{ Bindings: Bindings }>()

users.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 50'
  ).all()

  return c.json({ users: results })
})

users.get('/:id', async (c) => {
  const id = c.req.param('id')

  const user = await c.env.DB.prepare(
    'SELECT id, email, name, created_at FROM users WHERE id = ?'
  ).bind(id).first()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user })
})

users.post('/', async (c) => {
  const body = await c.req.json<{ email: string; name: string }>()

  if (!body.email || !body.name) {
    return c.json({ error: 'email and name are required' }, 400)
  }

  const id = crypto.randomUUID()

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, body.email, body.name, new Date().toISOString()).run()

  return c.json({ user: { id, email: body.email, name: body.name } }, 201)
})

export default users
```

Register routes in your main app:

```typescript
// src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import users from './routes/users'
import posts from './routes/posts'
import type { Bindings } from './types'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('/api/*', cors({
  origin: ['https://yourapp.com', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.route('/api/users', users)
app.route('/api/posts', posts)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
```

---

## Authentication Middleware

JWT authentication on the edge is trivial with Hono's built-in JWT middleware:

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

type JWTPayload = {
  sub: string
  role: 'user' | 'admin'
  exp: number
}

export const requireAuth = createMiddleware<{
  Bindings: Bindings
  Variables: { user: JWTPayload }
}>(async (c, next) => {
  const auth = c.req.header('Authorization')

  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = auth.slice(7)

  try {
    const payload = await verify(token, c.env.API_SECRET) as JWTPayload
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

export const requireAdmin = createMiddleware<{
  Variables: { user: JWTPayload }
}>(async (c, next) => {
  const user = c.get('user')

  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await next()
})
```

Apply to routes:

```typescript
// Protected routes
app.use('/api/admin/*', requireAuth, requireAdmin)
app.use('/api/users/*', requireAuth)

// Public routes
app.get('/api/health', (c) => c.json({ ok: true }))
```

The `Variables` type on the context means `c.get('user')` is fully typed — no casting required.

---

## Caching with KV

Workers KV is eventually consistent (changes propagate to all edges within 60 seconds) but reads are fast from any location. Use it for responses that can tolerate slight staleness:

```typescript
// src/lib/cache.ts
export async function withCache<T>(
  kv: KVNamespace,
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await kv.get(key, 'json') as T | null

  if (cached !== null) {
    return cached
  }

  const result = await fn()

  // Don't await — fire and forget to avoid adding latency
  kv.put(key, JSON.stringify(result), { expirationTtl: ttl })

  return result
}
```

Use in a route:

```typescript
users.get('/popular', async (c) => {
  const data = await withCache(
    c.env.CACHE,
    'popular-users',
    300, // 5 minute TTL
    async () => {
      const { results } = await c.env.DB.prepare(
        'SELECT id, name FROM users ORDER BY post_count DESC LIMIT 10'
      ).all()
      return results
    }
  )

  return c.json({ users: data })
})
```

For cache invalidation, delete by key:

```typescript
await c.env.CACHE.delete('popular-users')
```

---

## Database Schema with D1

D1 is SQLite running at the edge. Create migrations:

```sql
-- migrations/0001_initial.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
```

Apply migrations:

```bash
# Local development
npx wrangler d1 execute my-api-db --local --file migrations/0001_initial.sql

# Production
npx wrangler d1 execute my-api-db --remote --file migrations/0001_initial.sql
```

D1 supports batch writes which you should use for multi-step operations:

```typescript
// Atomic user creation with default profile
const id = crypto.randomUUID()
const now = new Date().toISOString()

await c.env.DB.batch([
  c.env.DB.prepare(
    'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, email, name, now),
  c.env.DB.prepare(
    'INSERT INTO user_profiles (user_id, bio, avatar_url) VALUES (?, ?, ?)'
  ).bind(id, '', null),
])
```

D1 does not support real transactions across statements in v1 — batch is the closest approximation. Proper transactions are on the roadmap.

---

## Request Validation

Don't trust request bodies. Use Zod for runtime validation:

```bash
npm install zod
```

```typescript
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['user', 'admin']).default('user'),
})

users.post(
  '/',
  zValidator('json', createUserSchema),
  async (c) => {
    // body is typed as { email: string; name: string; role: 'user' | 'admin' }
    const body = c.req.valid('json')

    // ... create user
  }
)
```

Install the validator package:

```bash
npm install @hono/zod-validator
```

Validation errors automatically return a 400 response with field-level error messages — no custom error handling needed.

---

## Rate Limiting

Workers don't have a built-in rate limiter, but you can build one with KV:

```typescript
// src/middleware/ratelimit.ts
export function rateLimit(limit: number, windowSeconds: number) {
  return createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
    const key = `rl:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`

    const current = parseInt(await c.env.CACHE.get(key) ?? '0')

    if (current >= limit) {
      return c.json({ error: 'Too many requests' }, 429, {
        'Retry-After': String(windowSeconds),
      })
    }

    // Increment counter
    c.env.CACHE.put(key, String(current + 1), {
      expirationTtl: windowSeconds * 2,
    })

    await next()
  })
}
```

Apply globally or per-route:

```typescript
// 100 requests per minute globally
app.use('/api/*', rateLimit(100, 60))

// Tighter limit on auth endpoints
app.use('/api/auth/*', rateLimit(10, 60))
```

Cloudflare also offers a [Rate Limiting rule](https://developers.cloudflare.com/waf/rate-limiting-rules/) at the WAF layer if you're on a paid plan, which is more robust.

---

## Local Development

```bash
# Start local dev server with simulated D1 and KV
npx wrangler dev

# Run with local D1 persistence
npx wrangler dev --local --persist
```

The `--persist` flag keeps your local D1 and KV data between restarts, so you don't have to re-seed on every change.

Test with curl:

```bash
# Create user
curl -X POST http://localhost:8787/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'

# Get users
curl http://localhost:8787/api/users \
  -H "Authorization: Bearer your-jwt-token"
```

---

## Deployment

```bash
# Deploy to production
npx wrangler deploy

# Deploy with environment tag
npx wrangler deploy --env staging
```

Your API is immediately live on Cloudflare's global network. No Dockerfile, no cluster configuration, no load balancer. Check the Workers dashboard for real-time logs, request metrics, and error rates.

For CI/CD with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Error Handling and Observability

Structure your error responses consistently:

```typescript
// src/lib/errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

// In index.ts
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: err.message, code: err.code }, err.status)
  }

  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500)
})
```

Use Workers Logpush or the built-in `console.log` (visible in `wrangler tail`) for observability:

```bash
# Stream live logs
npx wrangler tail

# Filter to errors only
npx wrangler tail --status error
```

For production observability, integrate with Baselime or Axiom via their Workers integrations — both have free tiers adequate for early-stage products.

---

## Performance Considerations

Workers isolates are fast, but a few patterns matter:

**Don't do sequential awaits when parallel is possible:**

```typescript
// Slow: sequential
const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
const posts = await c.env.DB.prepare('SELECT * FROM posts WHERE user_id = ?').bind(id).all()

// Fast: parallel
const [user, postsResult] = await Promise.all([
  c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first(),
  c.env.DB.prepare('SELECT * FROM posts WHERE user_id = ?').bind(id).all(),
])
```

**Use `waitUntil` for non-critical async work:**

```typescript
// Don't block the response on analytics
c.executionCtx.waitUntil(
  logAnalyticsEvent(c.env, { event: 'user.created', userId: id })
)

return c.json({ user }, 201)
```

`waitUntil` lets the response return immediately while the background task completes after the response is sent.

---

## What to Build Next

Once your base API is working:

- **Queues** — Use Workers Queues for async job processing (email sends, webhook delivery, image processing)
- **Durable Objects** — For stateful edge logic (WebSocket rooms, rate limiters with consistency guarantees)
- **R2** — Object storage for file uploads, served from the edge with no egress fees
- **Pages Functions** — If you want to co-locate your frontend and API under the same domain

Hono on Cloudflare Workers is one of the fastest paths from idea to globally distributed API in 2026. The combination of zero cold starts, integrated storage, and Hono's developer experience makes it worth considering for any new project that doesn't require a long-running process.
