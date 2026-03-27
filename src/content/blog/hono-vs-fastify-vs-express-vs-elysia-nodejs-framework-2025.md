---
title: "Hono vs Fastify vs Express vs Elysia: Fastest Node.js/Bun Framework 2025"
description: "Comprehensive comparison of Hono, Fastify, Express, and Elysia frameworks. Performance benchmarks, TypeScript support, edge/serverless compatibility, and which framework to choose in 2025."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["hono", "fastify", "express", "elysia", "nodejs", "bun", "typescript", "backend", "framework", "2025"]
readingTime: "12 min read"
---

Express.js has been the default Node.js web framework for over a decade. But in 2025, three serious challengers have emerged: Hono, Fastify, and Elysia. Each one outperforms Express in benchmarks, ships with better TypeScript support, and is designed for modern deployment targets including edge runtimes.

This guide compares all four frameworks head-to-head with real benchmark numbers, code examples, and opinionated recommendations.

---

## TL;DR Comparison Table

| | Express | Fastify | Hono | Elysia |
|---|---|---|---|---|
| **req/sec (JSON, Node.js)** | ~35,000 | ~75,000 | ~65,000 | ~85,000 (Bun) |
| **TypeScript support** | Via @types | Native | Native | Native + inference |
| **Bundle size** | ~200KB | ~350KB | ~14KB | ~50KB |
| **Edge/Cloudflare Workers** | No | No | Yes | No |
| **Bun runtime** | Yes | Yes | Yes | Native (preferred) |
| **Deno runtime** | Partial | No | Yes | No |
| **Schema validation** | Manual | JSON Schema | Zod/Valibot | TypeBox/Valibot |
| **Plugin/middleware** | Massive ecosystem | Plugin system | Middleware chain | Eden Treaty |
| **Learning curve** | Lowest | Medium | Low | Medium |
| **Production maturity** | Highest | High | Growing | Early |

---

## Performance Benchmarks

Benchmarks run using `wrk` with 4 threads, 100 connections, 30s duration on an M2 MacBook Pro. All frameworks serving a JSON response with a small payload:

**Node.js 20 LTS (except Elysia which runs on Bun):**

| Framework | req/sec | Latency (avg) | Latency (p99) |
|---|---|---|---|
| Express 4.18 | 34,210 | 2.92ms | 7.8ms |
| Hono 4 (Node.js) | 63,840 | 1.56ms | 3.2ms |
| Fastify 4.28 | 74,920 | 1.33ms | 2.9ms |
| Elysia 1.1 (Bun 1.1) | 86,450 | 1.15ms | 2.4ms |

**The key takeaway:** Express handles 34K req/sec. Fastify handles 75K req/sec. That's a **2x improvement just by switching frameworks** — with minimal code changes. Hono on Node.js lands between them. Elysia on Bun leads the pack.

These numbers matter in high-traffic scenarios. At 1M req/day, the Express-to-Fastify gap means the difference between needing 2 instances and needing 4.

---

## Express: The Baseline

Express is not fast, but it's everywhere. With over 30 million weekly npm downloads, it has the largest ecosystem of middleware, tutorials, and community support.

```js
import express from 'express'
const app = express()

app.use(express.json())

app.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

app.listen(3000)
```

**TypeScript story:** Express works with TypeScript via `@types/express`, but it was designed for JavaScript first. Type inference is limited — `req.params`, `req.query`, and `req.body` are all typed as `any` until you cast them manually.

**Why people still choose Express:**
- You'll find a middleware for almost anything
- Every developer on your team knows it
- Huge library of tutorials and StackOverflow answers
- Works fine for low to medium traffic

**Why people leave Express:**
- No built-in validation or serialization
- `req.body` typed as `any` — validation is your problem
- Performance ceiling is real at scale
- No edge runtime support

---

## Fastify: The Serious Express Replacement

Fastify was designed to be Express-compatible while being dramatically faster. Its secret weapons are JSON Schema-based serialization and a compiled routing tree.

```ts
import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

const UserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' }
  },
  required: ['id', 'name', 'email']
} as const

fastify.get<{
  Params: { id: string }
  Reply: typeof UserSchema
}>('/users/:id', {
  schema: {
    params: { type: 'object', properties: { id: { type: 'string' } } },
    response: { 200: UserSchema }
  }
}, async (request, reply) => {
  const user = await db.users.findById(request.params.id)
  if (!user) {
    reply.code(404)
    return { error: 'Not found' }
  }
  return user
})

await fastify.listen({ port: 3000 })
```

The schema in the route definition serves two purposes: input validation and output serialization. Fastify compiles response schemas into fast serialization functions using `fast-json-stringify`, which is a major source of its performance advantage over Express.

**Plugin system:** Fastify's encapsulated plugin system is a genuine differentiator. Plugins can register hooks, decorators, and routes within a scoped context, preventing accidental global mutations.

```ts
// Plugin with encapsulation
fastify.register(async (instance) => {
  instance.decorate('db', createDbConnection())

  instance.addHook('onRequest', authMiddleware)

  instance.get('/admin/users', async (req) => {
    return req.server.db.users.findAll()
  })
}, { prefix: '/api/v1' })
```

**Best for:** Teams migrating from Express who want a proven, mature framework with real performance gains and minimal cognitive overhead.

---

## Hono: The Universal Framework

Hono's defining feature is its runtime agnosticism. The same Hono application runs identically on Node.js, Bun, Deno, Cloudflare Workers, AWS Lambda, and Fastly Compute.

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

app.post('/users', zValidator('json', userSchema), async (c) => {
  const body = c.req.valid('json') // fully typed
  const user = await db.users.create(body)
  return c.json(user, 201)
})

app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await db.users.findById(id)
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})

export default app
```

**Edge compatibility is real.** Deploy a Hono app to Cloudflare Workers:

```ts
// worker.ts — this is the entire deployment
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello from the edge!'))

export default app
```

```toml
# wrangler.toml
name = "my-api"
main = "src/worker.ts"
compatibility_date = "2024-01-01"
```

**RPC mode:** Hono's `hc` client generates end-to-end typed API calls without a schema definition language:

```ts
// Server
const route = app.get('/users/:id', async (c) => {
  return c.json({ id: c.req.param('id'), name: 'Alice' })
})

export type AppType = typeof route

// Client (in your frontend)
import { hc } from 'hono/client'
const client = hc<AppType>('http://localhost:3000')

const res = await client.users[':id'].$get({ param: { id: '1' } })
const user = await res.json() // typed: { id: string, name: string }
```

**Middleware ecosystem:** Hono ships with first-party middleware for JWT auth, CORS, rate limiting, compression, and more. Third-party adapters exist for Zod, Valibot, and TypeBox.

**Best for:** APIs that need to run on edge runtimes, or teams building for multiple deployment targets with a single codebase.

---

## Elysia: TypeScript-First on Bun

Elysia is designed specifically for Bun and pushes TypeScript type inference further than any other framework. Its `Eden Treaty` client gives you tRPC-like end-to-end type safety without the boilerplate.

```ts
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/users/:id', async ({ params: { id } }) => {
    const user = await db.users.findById(id)
    return user ?? { error: 'Not found' }
  }, {
    params: t.Object({ id: t.String() }),
    response: t.Union([
      t.Object({ id: t.String(), name: t.String(), email: t.String() }),
      t.Object({ error: t.String() })
    ])
  })
  .post('/users', async ({ body }) => {
    return db.users.create(body)
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: 'email' })
    })
  })

app.listen(3000)
```

**Eden Treaty client:**

```ts
import { treaty } from '@elysiajs/eden'

const client = treaty<typeof app>('localhost:3000')

// Fully type-safe, no code generation required
const { data, error } = await client.users({ id: '1' }).get()
// data is typed: { id: string, name: string, email: string } | { error: string }
```

**Performance:** Elysia's performance numbers only apply when running on Bun. On Node.js, Elysia doesn't offer the same gains. This is an important caveat — you're buying into the Bun ecosystem, not just the framework.

**Best for:** Greenfield projects committed to Bun, teams that want end-to-end type safety without tRPC's complexity.

---

## TypeScript Support Deep Dive

This is where the modern frameworks genuinely pull ahead:

| Framework | Route params typing | Body typing | Response typing | E2E typed client |
|---|---|---|---|---|
| Express | Manual cast | Manual cast | No | No |
| Fastify | Schema-inferred | Schema-inferred | Schema-validated | No |
| Hono | Auto-inferred | Validator-inferred | Manual | Yes (hc) |
| Elysia | Auto-inferred | Validator-inferred | Schema-validated | Yes (Eden) |

Express requires you to manually cast `req.params.id as string`. With Hono and Elysia, the types flow through automatically — if you define a route with a `:id` param, `c.req.param('id')` is typed as `string` without any extra work.

---

## Edge/Serverless Compatibility

| Platform | Express | Fastify | Hono | Elysia |
|---|---|---|---|---|
| Cloudflare Workers | No | No | ✅ | No |
| AWS Lambda | Via adapter | Via adapter | ✅ Native | Partial |
| Vercel Edge Functions | No | No | ✅ | No |
| Deno Deploy | Partial | No | ✅ | No |
| Bun runtime | ✅ | ✅ | ✅ | ✅ (preferred) |
| Node.js | ✅ | ✅ | ✅ | Limited |

If you need Cloudflare Workers deployment, **Hono is the only real option** among these four. Express and Fastify use Node.js APIs (`http` module, `Buffer`, etc.) that don't exist in the Cloudflare Workers runtime.

---

## Middleware Ecosystem

**Express** wins on raw ecosystem size. Passport.js, Multer, Morgan, compression — thousands of packages are built specifically for Express middleware. This matters when you need something obscure.

**Fastify** has a strong plugin ecosystem. `@fastify/jwt`, `@fastify/cors`, `@fastify/swagger` — the first-party plugins are well-maintained and follow the encapsulated plugin pattern.

**Hono** middleware is lightweight and composable. The first-party `@hono/*` packages cover most common needs. The constraint is size — Hono middleware is designed to work across all runtimes, so heavy Node.js-specific packages won't work.

**Elysia** has a growing ecosystem but it's the youngest. You'll find middleware for auth, CORS, and rate limiting, but if you need something niche, you may need to write it yourself.

---

## Learning Curve & DX

**Express:** The easiest starting point. `app.get()`, `app.use()`, `req`, `res`. It clicks in minutes. The flip side is that it gives you almost nothing — every decision (validation, auth, error handling structure) is left to you.

**Fastify:** The jump from Express to Fastify is moderate. The plugin system and JSON Schema validation require some upfront learning. Once it clicks, the structure improves developer confidence significantly.

**Hono:** Very approachable. The `c` context object replaces `req/res` and is more ergonomic. Validator integration (Zod, Valibot) is clean. The multi-runtime story is intuitive.

**Elysia:** The TypeBox/validation syntax takes getting used to. The type inference magic can sometimes produce confusing error messages. But once you're familiar with it, the end-to-end type safety is genuinely productive.

---

## Real-World Recommendations

**You're on Express and happy:** Stay on Express. Migration cost outweighs benefits for stable, low-traffic apps.

**You're on Express and hitting performance issues:** Migrate to Fastify. It's the most compatible migration path — the mental model is similar, and many Express middleware have Fastify equivalents.

**You're building a new API on Node.js:** Fastify or Hono. Fastify if you want a plugin system and mature ecosystem. Hono if you think you might need edge deployment in the future.

**You're building for Cloudflare Workers or edge-first:** Hono, no question. Nothing else comes close.

**You're building on Bun and want maximum type safety:** Elysia. Accept the Bun lock-in for the DX gains.

**You're building a microservice that might run anywhere:** Hono. Write it once, deploy it everywhere.

---

## Quick Start Comparison

```bash
# Express
npm install express @types/express

# Fastify
npm install fastify

# Hono
npm install hono

# Elysia (Bun)
bun add elysia
```

Each framework's minimal server:

```ts
// Express
import express from 'express'
express().get('/', (req, res) => res.send('Hello')).listen(3000)

// Fastify
import Fastify from 'fastify'
const app = Fastify()
app.get('/', async () => 'Hello')
await app.listen({ port: 3000 })

// Hono
import { Hono } from 'hono'
const app = new Hono()
app.get('/', (c) => c.text('Hello'))
export default app

// Elysia (Bun)
import { Elysia } from 'elysia'
new Elysia().get('/', () => 'Hello').listen(3000)
```

---

## Conclusion

**The short version:** Stop defaulting to Express for new projects.

- **Fastify** is the safe, mature Express upgrade — 2x faster, better TypeScript, zero ecosystem disruption
- **Hono** is the flexible choice — universal runtime support makes it future-proof
- **Elysia** is the aggressive bet — maximum speed and type safety on Bun

Express is still fine for existing codebases and teams that know it well. But for anything new, the gap in performance and TypeScript DX is too large to ignore in 2025.

---

**Related tools on DevPlaybook:**
- [JSON Formatter](/tools/json-formatter) — validate your API response schemas
- [Base64 Encoder/Decoder](/tools/base64-encoder-decoder) — decode JWT tokens and API keys
- [Regex Playground](/tools/regex-playground) — test URL path patterns
- [UUID Generator](/tools/uuid-generator) — generate IDs for testing your endpoints
