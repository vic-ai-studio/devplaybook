---
title: 'Hono vs Fastify vs Elysia: Modern JavaScript Backend Frameworks 2026'
description: 'Compare Hono, Fastify, and Elysia — the fastest JavaScript/TypeScript backend frameworks in 2026. Benchmarks, DX, edge compatibility, and which to choose.'
pubDate: '2026-03-27'
date: '2026-03-27'
readingTime: '12 min read'
tags: ['hono', 'fastify', 'elysia', 'nodejs', 'bun', 'backend', 'typescript']
---

# Hono vs Fastify vs Elysia: Modern JavaScript Backend Frameworks 2026

Express.js held the Node.js backend crown for over a decade. But in 2026, a new generation of JavaScript backend frameworks has arrived — faster, leaner, and built for the TypeScript era. **Hono**, **Fastify**, and **Elysia** represent three distinct philosophies for building high-performance HTTP servers. Choosing between them can dramatically affect your app's performance, developer experience, and deployment options.

This guide breaks down all three frameworks with benchmarks, code examples, edge runtime support, and a practical recommendation matrix.

---

## Why Move Beyond Express?

Express was designed in 2010 for a simpler web. It lacks native TypeScript support, has no built-in schema validation, and its middleware chain adds overhead that newer frameworks have eliminated. In the latest TechEmpower benchmarks, Express consistently performs 3–10x slower than the frameworks in this guide for JSON serialization workloads.

The new generation fixes these gaps:

- **Hono** — ultra-lightweight, runs anywhere (Node, Bun, Deno, Cloudflare Workers)
- **Fastify** — mature, plugin-driven, Node.js-native with schema-based serialization
- **Elysia** — Bun-native, end-to-end TypeScript safety, declarative DX

---

## Hono: The Multi-Runtime Chameleon

Hono (炎, Japanese for "flame") was created by Yusuke Wada in 2021 with one goal: run on every JavaScript runtime. It achieves this by abstracting away runtime-specific APIs behind a single interface.

### Key Features

- **~14KB bundle size** (zero dependencies)
- Runs on Node.js, Bun, Deno, Cloudflare Workers, Vercel Edge, AWS Lambda, and more
- Built-in middleware: CORS, JWT, compress, etag, logger
- RPC client (`hono/client`) for type-safe API calls
- JSX support for server-side rendering

### Basic Route Example

```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'Alice' })
})

app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ created: true, ...body }, 201)
})

export default app
```

Deploying to Cloudflare Workers is a one-line change — just export the app. No adapter required.

### Middleware Chain

```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'

const app = new Hono()
  .use('*', logger())
  .use('/api/*', cors())
  .use('/api/admin/*', bearerAuth({ token: process.env.ADMIN_TOKEN! }))

app.get('/api/health', (c) => c.json({ status: 'ok' }))
```

### Performance

In Node.js mode, Hono processes approximately **~120k req/sec** for JSON responses (TechEmpower plain-text equivalent). In Bun mode, this climbs to **~200k+ req/sec** due to Bun's faster I/O.

### Best For

- Projects targeting **multiple runtimes** or planning edge deployment
- Lightweight microservices and API gateways
- Teams wanting a minimal, zero-magic framework

---

## Fastify: The Battle-Tested Workhorse

Fastify was built by the Node.js core team contributors (Matteo Collina, Tomas Della Vedova) with performance as the primary directive. It uses JSON Schema for request/response validation and serialization, which is the secret to its speed.

### Key Features

- **Schema-driven**: JSON Schema validation + ajv for requests, fast-json-stringify for responses
- Mature plugin ecosystem (700+ official/community plugins)
- Built-in Pino logger (the fastest Node.js logger)
- TypeScript-first since v4
- Encapsulation via plugin scopes

### Basic Route Example

```typescript
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'

const fastify = Fastify({ logger: true })

const getUserSchema = {
  params: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
}

fastify.get(
  '/users/:id',
  { schema: getUserSchema },
  async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return { id: request.params.id, name: 'Alice' }
  }
)

await fastify.listen({ port: 3000 })
```

The schema is optional but unlocks the performance gains — fast-json-stringify skips runtime type-checking during serialization.

### Plugin Architecture

Fastify's plugin system uses encapsulation: plugins registered in a scope don't leak to other scopes, preventing configuration pollution in large apps.

```typescript
import fastify from 'fastify'
import fp from 'fastify-plugin'

// Decorate fastify instance (shared across scopes)
const dbPlugin = fp(async (app) => {
  app.decorate('db', { query: async (sql: string) => [] })
})

fastify.register(dbPlugin)

// Route plugin (encapsulated scope)
fastify.register(async (app) => {
  app.get('/products', async (req, reply) => {
    return app.db.query('SELECT * FROM products')
  })
}, { prefix: '/api' })
```

### Performance

Fastify achieves **~85k–100k req/sec** on JSON benchmarks in Node.js. Schema-less routes are slower; always define response schemas for maximum throughput. Fastify dominates the TechEmpower Node.js category for JSON serialization.

### Best For

- Production APIs requiring **Node.js stability** and a large plugin ecosystem
- Teams with existing Express experience (migration path is straightforward)
- Apps that need mature auth, DB, and observability plugins out-of-the-box

---

## Elysia: The Bun-Native TypeScript Powerhouse

Elysia was created by Saltyaom for Bun, taking full advantage of Bun's native APIs to achieve extreme performance. Its standout feature is **Eden**, a type-safe RPC client that eliminates the need for code generation tools like tRPC's schema definitions.

### Key Features

- **Bun-native**: leverages Bun's fast HTTP server, file I/O, and SQLite
- End-to-end type safety without code generation (Eden treaty client)
- Declarative schema with TypeBox (compile-time + runtime validation)
- Lifecycle hooks: `onRequest`, `onParse`, `onTransform`, `onBeforeHandle`, `onAfterHandle`
- Built-in OpenAPI/Swagger documentation

### Basic Route Example

```typescript
import { Elysia, t } from 'elysia'

const app = new Elysia()
  .get('/users/:id', ({ params: { id } }) => ({
    id,
    name: 'Alice',
  }), {
    params: t.Object({ id: t.String() }),
  })
  .post('/users', ({ body }) => ({
    created: true,
    ...body,
  }), {
    body: t.Object({
      name: t.String(),
      email: t.String({ format: 'email' }),
    }),
    response: t.Object({
      created: t.Boolean(),
      name: t.String(),
      email: t.String(),
    }),
  })

app.listen(3000)
```

### Eden Type-Safe Client

This is Elysia's killer feature — the server's route types are automatically available to the client:

```typescript
// server.ts
export type App = typeof app

// client.ts
import { treaty } from '@elysiajs/eden'
import type { App } from './server'

const api = treaty<App>('http://localhost:3000')

// Fully typed — id and name are inferred
const { data } = await api.users({ id: '123' }).get()
console.log(data?.name) // TypeScript knows this is string
```

No separate schema file, no code generation step. The type flows from server to client automatically.

### Performance

Elysia is the fastest of the three on Bun: **~250k–350k req/sec** for JSON responses in TechEmpower-style benchmarks. This reflects Bun's underlying HTTP performance rather than Elysia overhead, but Elysia's minimal design ensures almost no overhead is added.

> **Note**: Elysia can run on Node.js via a compatibility layer, but loses most of its performance advantages. It's designed for Bun.

### Best For

- Teams **already using Bun** or willing to adopt it
- Full-stack TypeScript apps wanting end-to-end type safety without tRPC boilerplate
- Greenfield projects prioritizing maximum throughput

---

## Performance Benchmarks

Benchmark results vary by hardware and workload. These numbers reflect community benchmarks and the TechEmpower Framework Benchmarks (Round 22):

| Framework | Runtime | Approx. req/sec (JSON) | Latency (p99) |
|-----------|---------|------------------------|---------------|
| Elysia    | Bun     | ~250,000–350,000       | <2ms          |
| Hono      | Bun     | ~200,000–250,000       | <3ms          |
| Hono      | Node.js | ~110,000–130,000       | <5ms          |
| Fastify   | Node.js | ~85,000–100,000        | <6ms          |
| Express   | Node.js | ~15,000–25,000         | <20ms         |

**Key insight**: All three modern frameworks are dramatically faster than Express. The Elysia/Bun combination wins on raw throughput, but Fastify on Node.js is still 4–6x faster than Express and runs on the most battle-tested runtime.

---

## TypeScript Experience Comparison

| Feature | Hono | Fastify | Elysia |
|---------|------|---------|--------|
| First-class TS support | ✅ | ✅ | ✅ |
| Inferred route types | ✅ (RPC client) | ⚠️ (manual generics) | ✅ (Eden) |
| Schema validation | ✅ (zod/valibot via middleware) | ✅ (JSON Schema + TypeBox) | ✅ (TypeBox built-in) |
| Auto-generated docs | ✅ (via plugin) | ✅ (fastify-swagger) | ✅ (built-in Swagger) |
| Learning curve | Low | Medium | Low-Medium |

Fastify's TypeScript experience requires more manual type annotation. You must pass generic parameters to `FastifyRequest<{ Body: ..., Params: ..., Querystring: ... }>`. It works well but is more verbose than Hono's `c.req.valid()` or Elysia's automatic type inference.

---

## Edge Runtime Support

| Runtime | Hono | Fastify | Elysia |
|---------|------|---------|--------|
| Node.js | ✅ | ✅ (primary) | ⚠️ (compat layer) |
| Bun | ✅ | ⚠️ | ✅ (primary) |
| Deno | ✅ | ❌ | ❌ |
| Cloudflare Workers | ✅ | ❌ | ❌ |
| Vercel Edge | ✅ | ❌ | ❌ |
| AWS Lambda | ✅ | ✅ (via plugin) | ✅ (via plugin) |
| Deno Deploy | ✅ | ❌ | ❌ |

**Hono is the clear winner for edge deployments.** If you're building for Cloudflare Workers or Vercel Edge Functions, Hono is effectively the only mature choice. It handles the runtime abstraction layer so you write once and deploy anywhere.

---

## Ecosystem and Community

**Hono** has grown rapidly since 2022. As of early 2026, it has ~18k GitHub stars and an active middleware registry. The core team responds quickly to issues and the multi-runtime approach has attracted a broad contributor base.

**Fastify** is the most mature, with ~31k GitHub stars and over 700 plugins in the official ecosystem. It has production deployments at companies like Netlify, Microsoft, and NearForm. The project is governed by the OpenJS Foundation.

**Elysia** is newer (~12k stars) but growing fast, especially in the Bun community. Its Eden client is a genuinely innovative solution to the type-safety problem. The ecosystem is smaller but focused — most commonly needed middleware (CORS, auth, rate limiting, Swagger) already exists.

---

## Recommendation Matrix

Choose based on your actual constraints:

| Scenario | Recommended |
|----------|-------------|
| Edge/Cloudflare Workers deployment | **Hono** |
| Multiple runtimes in one codebase | **Hono** |
| Largest plugin ecosystem, mature team | **Fastify** |
| Migrating from Express on Node.js | **Fastify** |
| Maximum throughput, using Bun | **Elysia** |
| End-to-end TypeScript without tRPC | **Elysia** |
| Greenfield on Bun stack | **Elysia** |
| Production API with auth/db plugins ready | **Fastify** |

### Quick Decision Guide

```
Do you need to run on Cloudflare Workers / edge?
  → Hono (no competition here)

Are you using Bun as your primary runtime?
  → Elysia (best DX + performance on Bun)
  → Hono is a solid alternative if you value multi-runtime

Are you staying on Node.js?
  → Fastify (mature, plugin-rich, proven in production)
  → Hono if you want a lighter footprint
```

---

## Migration Paths

### From Express to Fastify

Fastify's API is the most Express-like. Route handlers (`req`, `reply`), middleware via plugins, and similar project structure. Key differences: no `res.send()` — return values directly, and JSON Schema replaces manual validation.

### From Express to Hono

Hono's `c` (context) object replaces `req/res`. The `c.json()`, `c.text()`, `c.html()` return pattern is clean and intuitive. Most Express middleware has a Hono equivalent or can be adapted.

### Starting Fresh with Elysia

Elysia is best started fresh with Bun. Run `bun create elysia my-app` and you have a type-safe, documented API server in minutes.

---

## Conclusion

The "best" framework depends entirely on your deployment target and team constraints:

- **Hono** wins on versatility. Build once, deploy to Node, Bun, Deno, or the edge.
- **Fastify** wins on maturity and ecosystem. If you need a battle-tested Node.js API server with hundreds of ready-made plugins, Fastify is the choice.
- **Elysia** wins on raw performance and TypeScript DX when using Bun. The Eden client is a genuinely innovative developer experience that makes API clients feel like local function calls.

All three are dramatically better than Express for new projects in 2026. The days of building a new Node.js API with Express are over — pick any of these three and you'll ship faster, scale further, and write cleaner TypeScript.

---

*Related: [Top Developer Tools 2026](/blog/best-free-developer-tools-2026) | [JWT Token Guide](/blog/jwt-token-explained) | [Bun vs Node.js Performance](/blog/bun-runtime-guide)*
