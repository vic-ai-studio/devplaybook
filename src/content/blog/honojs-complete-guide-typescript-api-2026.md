---
title: "Hono.js Complete Guide 2026: Build Ultra-Fast APIs with TypeScript"
description: "Learn Hono.js from scratch in 2026. Complete guide covering routing, middleware, Zod validation, and deploying to Cloudflare Workers and Bun. Includes Express.js performance comparison."
pubDate: 2026-03-28
tags: [hono, typescript, api, edge, bun, cloudflare-workers]
---

# Hono.js Complete Guide 2026: Build Ultra-Fast APIs with TypeScript

Hono.js has become the go-to framework for edge-first TypeScript APIs. If you're still reaching for Express.js for new projects, you're leaving serious performance on the table. This guide covers everything you need to build production-ready APIs with Hono in 2026.

## What is Hono.js?

Hono (炎 — "flame" in Japanese) is an ultrafast web framework designed for edge runtimes. It runs natively on:

- **Cloudflare Workers**
- **Bun**
- **Deno**
- **Node.js**
- **AWS Lambda**
- **Vercel Edge Functions**
- **Fastly Compute**

The same Hono code works across all these runtimes — a genuine write-once, deploy-anywhere experience.

## Performance: Hono vs Express.js vs Fastify

Real-world benchmarks on equivalent hardware (Node.js 22, simple JSON response endpoint):

| Framework | Requests/sec | Latency (p99) | Bundle Size |
|---|---|---|---|
| **Hono (Bun)** | ~210,000 | 0.8ms | 14 KB |
| **Hono (Node.js)** | ~95,000 | 1.2ms | 14 KB |
| Fastify | ~85,000 | 1.8ms | 78 KB |
| Express.js | ~22,000 | 6.5ms | 210 KB |
| Koa | ~28,000 | 5.1ms | 45 KB |

Hono on Cloudflare Workers is even faster — sub-millisecond cold starts because Workers run on V8 isolates, not containers.

The performance gap comes from Hono's design choices: no dependency, tree-shakable, uses the standard `Request`/`Response` Web API, and has a hyper-optimized router (RegExpRouter for dynamic routes, TrieRouter as fallback).

---

## Installation

```bash
# For Cloudflare Workers (recommended starting point)
npm create cloudflare@latest my-api -- --template hono

# For Bun
bun create hono my-api

# For Node.js
npm install hono @hono/node-server
```

For Node.js adapter, your entry point:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

serve({ fetch: app.fetch, port: 3000 })
```

---

## Core Concepts: Routing

Hono's routing API is familiar to Express developers, but typed end-to-end:

```typescript
import { Hono } from 'hono'

const app = new Hono()

// Basic routes
app.get('/users', (c) => c.json({ users: [] }))
app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ created: body }, 201)
})
app.put('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ updated: id })
})
app.delete('/users/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ deleted: id })
})

// Named parameters
app.get('/posts/:id/comments/:commentId', (c) => {
  const { id, commentId } = c.req.param()
  return c.json({ postId: id, commentId })
})

// Wildcard
app.get('/files/*', (c) => {
  const path = c.req.param('*')
  return c.text(`File: ${path}`)
})
```

### Route Groups with Hono Instances

```typescript
import { Hono } from 'hono'

const app = new Hono()

// Users sub-app
const users = new Hono()
users.get('/', (c) => c.json({ users: [] }))
users.get('/:id', (c) => c.json({ id: c.req.param('id') }))
users.post('/', async (c) => {
  const data = await c.req.json()
  return c.json(data, 201)
})

// Posts sub-app
const posts = new Hono()
posts.get('/', (c) => c.json({ posts: [] }))
posts.get('/:slug', (c) => c.json({ slug: c.req.param('slug') }))

// Mount under base paths
app.route('/api/users', users)
app.route('/api/posts', posts)

export default app
```

---

## Middleware

Hono middleware follows the same pattern as Express but uses async/await natively:

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'

const app = new Hono()

// Built-in middleware
app.use('*', logger())
app.use('*', timing())
app.use('*', secureHeaders())
app.use('/api/*', cors({
  origin: ['https://myapp.com', 'https://staging.myapp.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Only pretty JSON in development
if (process.env.NODE_ENV === 'development') {
  app.use('*', prettyJSON())
}
```

### Custom Middleware

```typescript
import { createMiddleware } from 'hono/factory'

// Rate limiting middleware
const rateLimit = createMiddleware(async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
  const key = `rate:${ip}`

  // Example with Cloudflare KV
  const current = parseInt(await c.env.KV.get(key) ?? '0')

  if (current >= 100) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  await c.env.KV.put(key, String(current + 1), { expirationTtl: 60 })
  await next()
})

// Auth middleware
const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Verify token (example with JWT)
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET)
    c.set('userId', payload.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Apply to specific routes
app.use('/api/protected/*', authMiddleware)
app.use('/api/*', rateLimit)
```

---

## Validation with Zod

Hono integrates with Zod through `@hono/zod-validator`:

```bash
npm install zod @hono/zod-validator
```

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// Schema definitions
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(13).max(120).optional(),
  role: z.enum(['admin', 'user', 'moderator']).default('user'),
})

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

// Validate request body
app.post(
  '/users',
  zValidator('json', CreateUserSchema),
  async (c) => {
    const data = c.req.valid('json') // Fully typed
    // data.name: string
    // data.email: string
    // data.role: 'admin' | 'user' | 'moderator'

    const user = await db.createUser(data)
    return c.json(user, 201)
  }
)

// Validate query params
app.get(
  '/users',
  zValidator('query', QuerySchema),
  async (c) => {
    const { page, limit, search } = c.req.valid('query')
    const users = await db.findUsers({ page, limit, search })
    return c.json({ users, page, limit })
  }
)

// Validate path params
app.get(
  '/users/:id',
  zValidator('param', z.object({ id: z.string().uuid() })),
  async (c) => {
    const { id } = c.req.valid('param')
    const user = await db.findUserById(id)
    if (!user) return c.json({ error: 'Not found' }, 404)
    return c.json(user)
  }
)
```

### Custom Error Handler for Validation

```typescript
import { HTTPException } from 'hono/http-exception'

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }

  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Custom Zod error response
app.post(
  '/users',
  zValidator('json', CreateUserSchema, (result, c) => {
    if (!result.success) {
      return c.json({
        error: 'Validation failed',
        issues: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      }, 422)
    }
  }),
  async (c) => {
    const data = c.req.valid('json')
    return c.json(await createUser(data), 201)
  }
)
```

---

## Deployment

### Cloudflare Workers

```bash
npm create cloudflare@latest -- --template hono
```

Your `wrangler.toml`:

```toml
name = "my-hono-api"
main = "src/index.ts"
compatibility_date = "2026-03-01"

[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-database-id"

[vars]
ENVIRONMENT = "production"
```

Your `src/index.ts`:

```typescript
import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  SESSIONS: KVNamespace
  JWT_SECRET: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/health', (c) => c.json({
  status: 'ok',
  env: c.env.ENVIRONMENT,
}))

// Access D1 database
app.get('/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users LIMIT 20').all()
  return c.json(results)
})

export default app
```

Deploy:

```bash
wrangler deploy
```

### Bun

```typescript
// src/index.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.text('Running on Bun!'))

export default {
  port: 3000,
  fetch: app.fetch,
}
```

```bash
bun run src/index.ts
# Or for production:
bun build src/index.ts --outfile dist/index.js
bun dist/index.js
```

Bun's native HTTP server handles the `fetch` interface directly — no adapter needed.

---

## Hono vs Express.js: When to Choose Which

**Choose Hono when:**
- Building a new API that will run on edge (Cloudflare Workers, Deno Deploy, Vercel Edge)
- Performance is critical (high-traffic APIs, serverless with cold start concerns)
- You want excellent TypeScript support out of the box
- Targeting Bun as your runtime

**Stick with Express.js when:**
- You have an existing Express codebase (migration rarely worth it)
- You depend on Express-specific middleware with no Hono equivalent
- Your team is deeply familiar with Express patterns and the project is internal/low-traffic
- You need mature session/cookie management libraries that aren't ported yet

The migration from Express to Hono is straightforward for simple apps, but the ecosystem difference matters for complex applications. Check the [Hono middleware directory](https://hono.dev/middleware) before migrating.

---

## Complete Example: REST API

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use('/api/*', cors())

// Public routes
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }))

// Protected API
const api = app.basePath('/api')

api.use('*', bearerAuth({ token: process.env.API_TOKEN! }))

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false),
})

const posts: Array<{ id: string } & z.infer<typeof PostSchema>> = []

api.get('/posts', (c) => {
  const { published } = c.req.query()
  const filtered = published !== undefined
    ? posts.filter(p => p.published === (published === 'true'))
    : posts
  return c.json(filtered)
})

api.post('/posts', zValidator('json', PostSchema), async (c) => {
  const data = c.req.valid('json')
  const post = { id: crypto.randomUUID(), ...data }
  posts.push(post)
  return c.json(post, 201)
})

api.get('/posts/:id', (c) => {
  const post = posts.find(p => p.id === c.req.param('id'))
  if (!post) return c.json({ error: 'Not found' }, 404)
  return c.json(post)
})

api.delete('/posts/:id', (c) => {
  const idx = posts.findIndex(p => p.id === c.req.param('id'))
  if (idx === -1) return c.json({ error: 'Not found' }, 404)
  posts.splice(idx, 1)
  return c.body(null, 204)
})

export default app
```

---

## Summary

Hono.js in 2026 is the clear choice for new edge-deployed TypeScript APIs. Its performance advantage over Express is not marginal — it's an order of magnitude. The framework is stable, the TypeScript support is excellent, and the multi-runtime story (Workers, Bun, Node, Deno) is genuinely useful.

If you're building something new and performance or edge deployment matters, use Hono. The learning curve for Express developers is roughly one afternoon.

---

*Want more developer tools and guides? Check out [DevPlaybook](https://devplaybook.cc) — 500+ curated tools and articles for developers.*
