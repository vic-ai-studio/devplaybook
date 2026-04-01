---
title: "Edge Databases 2026: Turso, PlanetScale, Neon, D1, Upstash Compared"
description: "Compare edge-compatible databases in 2026: Turso (libSQL), PlanetScale (MySQL serverless), Neon (Postgres serverless), Cloudflare D1, and Upstash Redis — latency, pricing, and use cases."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["edge database", "turso", "planetscale", "neon", "cloudflare d1", "upstash", "serverless database"]
readingTime: "9 min read"
---

Serverless and edge deployments have forced the database layer to evolve. A Cloudflare Worker that boots in 0ms is useless if the database query takes 200ms to reach a single-region Postgres instance. Edge databases solve this by distributing data closer to users, supporting HTTP-based connection protocols that work inside edge runtimes, and pricing on consumption rather than instance size. This guide compares the five leading options in 2026.

## The Edge Database Problem

Traditional databases have two issues in edge/serverless environments:

1. **TCP connection overhead.** Postgres and MySQL expect persistent TCP connections. Serverless functions boot fresh per request — establishing a new connection per request adds 50-150ms and exhausts connection pools.

2. **Geographic latency.** A database in `us-east-1` served from a Cloudflare Worker in Tokyo adds 150ms+ of round-trip latency on every query.

Edge databases address both: they use HTTP or WebSocket protocols (no TCP handshake per request), and they replicate data globally so reads happen from the nearest region.

## Comparison Table

| Feature | Turso | PlanetScale | Neon | Cloudflare D1 | Upstash |
|---|---|---|---|---|---|
| Database type | SQLite (libSQL) | MySQL | PostgreSQL | SQLite | Redis |
| Protocol | HTTP/WebSocket | HTTP (Vitess) | HTTP (pgwire) | HTTP bindings | HTTP/REST |
| Global replication | Yes (multi-region) | Yes | Yes (branching) | Yes (Cloudflare edge) | Yes |
| Branching / dev DBs | No | Yes | Yes | No | No |
| Cold start | ~5ms | ~10ms | ~100ms | ~0ms (Workers) | ~5ms |
| Free tier | 500 DBs, 9GB | 5GB, 1B rows/mo | 0.5 CU, 3GB | 100k rows/day | 10k req/day |
| Paid pricing | $29/mo base | $39/mo | $0.16/CU-hr | $0.001/100k reads | $0.2/100k req |
| ORM support | Drizzle, Prisma | Drizzle, Prisma | Drizzle, Prisma | Drizzle | ioredis, Upstash SDK |
| Best for | Read-heavy apps, edge | MySQL-compatible APIs | Postgres, branching | Cloudflare Workers | Caching, rate limiting |

## Turso (libSQL)

Turso is built on libSQL, an open-source fork of SQLite that adds replication and an HTTP API. It creates a primary database that replicates to read replicas in regions you choose. Writes go to the primary; reads are served from the nearest replica.

**Setup with Drizzle ORM:**

```bash
npm install @libsql/client drizzle-orm
npx turso db create my-app
npx turso db show my-app  # get URL
npx turso db tokens create my-app  # get auth token
```

```typescript
// lib/db.ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

```typescript
// schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

```typescript
// Query
const allUsers = await db.select().from(users).where(eq(users.active, true));
```

Turso's multi-tenancy feature lets you create per-user or per-tenant databases at scale (up to 500 databases on the free tier). This is powerful for SaaS applications where tenant isolation is a requirement.

**Best for:** Read-heavy apps, SaaS with per-tenant databases, Cloudflare Workers + Astro/Next edge deployments.

## PlanetScale

PlanetScale is MySQL-compatible, built on Vitess (the same sharding technology that powers YouTube and GitHub). Its standout feature is a branching workflow that treats database schema changes like code: create a branch, apply migrations, test, then merge via a non-blocking schema change.

```typescript
// PlanetScale with Drizzle (HTTP driver, no TCP)
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";

const connection = connect({
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
});

export const db = drizzle(connection);
```

**Schema branching workflow:**

```bash
# Create a feature branch
pscale branch create my-app add-user-roles

# Connect and apply migrations
pscale connect my-app add-user-roles --port 3309
npx drizzle-kit push:mysql

# Create a deploy request (like a PR for schema changes)
pscale deploy-request create my-app add-user-roles
```

PlanetScale's schema change system eliminates table-locking migrations. It's the safest MySQL option for teams that need to iterate on schema without downtime.

**Best for:** MySQL-native teams, applications that need schema branching, high-write-volume workloads where MySQL's write performance matters.

## Neon (Serverless Postgres)

Neon separates Postgres storage from compute, allowing compute nodes to scale to zero and spin up quickly. The branching feature creates instant, copy-on-write database branches for development and preview environments — no data copying required.

```typescript
// Neon with Drizzle
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

```typescript
// Full Postgres power: CTEs, window functions, JSON operators
const topUsers = await db.execute(sql`
  WITH ranked AS (
    SELECT
      id,
      email,
      SUM(amount) OVER (PARTITION BY user_id) as total_spent,
      RANK() OVER (ORDER BY SUM(amount) DESC) as rank
    FROM orders
    GROUP BY user_id
  )
  SELECT * FROM ranked WHERE rank <= 10
`);
```

**Branch-per-PR workflow with Neon:**

```yaml
# .github/workflows/preview.yml
- name: Create Neon branch for PR
  uses: neondatabase/create-branch-action@v5
  with:
    project_id: ${{ secrets.NEON_PROJECT_ID }}
    branch_name: preview/${{ github.event.pull_request.number }}
    api_key: ${{ secrets.NEON_API_KEY }}
  id: create-branch

- name: Run migrations on preview branch
  env:
    DATABASE_URL: ${{ steps.create-branch.outputs.db_url }}
  run: npx drizzle-kit migrate
```

Each PR gets its own isolated Postgres database. Zero cost during idle, zero coordination between developers working on different features.

**Best for:** Teams that want full Postgres (JSON operators, window functions, extensions like pgvector), preview environment databases, Vercel deployments.

## Cloudflare D1

D1 is SQLite running inside Cloudflare's infrastructure, accessible from Workers via a binding — no HTTP round-trip, the query runs in the same datacenter as your Worker code.

```typescript
// wrangler.toml
// [[d1_databases]]
// binding = "DB"
// database_name = "my-app"
// database_id = "xxxx-xxxx-xxxx"

// Worker code (TypeScript)
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(
      "SELECT * FROM users WHERE active = ? LIMIT 20"
    )
      .bind(1)
      .all();

    return Response.json(results);
  },
};
```

```bash
# Create table via Wrangler
npx wrangler d1 execute my-app --command "
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
"
```

D1 is unique in that it runs in the same V8 isolate as your Worker — latency for local reads is sub-millisecond. The limitation is that writes are synchronous globally (single primary), so high-write-volume applications may hit contention.

**Best for:** Cloudflare Workers applications, read-heavy workloads, metadata storage, applications already committed to the Cloudflare ecosystem.

## Upstash Redis

Upstash is not a relational database — it's Redis with an HTTP API and per-request pricing. In an edge context, it's the standard choice for caching, rate limiting, session storage, and pub/sub.

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiting
async function rateLimit(ip: string): Promise<boolean> {
  const key = `rate:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // 60-second window
  }
  return count <= 100; // 100 requests per minute
}

// Caching with automatic expiry
await redis.set("homepage:data", JSON.stringify(data), { ex: 300 });
const cached = await redis.get<HomepageData>("homepage:data");
```

Upstash also offers a **QStash** messaging service and **Vector** (vector database for RAG) under the same SDK, making it a useful multi-purpose edge data layer.

**Best for:** Caching, rate limiting, session storage, queues, pub/sub — anything where Redis semantics are the right fit.

## Multi-Region Data Strategies

For applications that need to minimize read latency globally:

1. **Read replicas (Turso, Neon, PlanetScale):** Configure replicas in regions close to your users. Reads route to the nearest replica; writes go to primary. Works well when reads dominate.

2. **Edge caching with Upstash:** Cache hot query results at the edge. A Turso/Neon query result cached in Upstash Redis serves subsequent requests in ~5ms globally.

3. **Data localization (Turso multi-tenancy):** For SaaS, store each tenant's data in a database located in their region. Turso's per-database model makes this cost-effective.

## How to Choose

- **Cloudflare Workers app**: D1 — zero latency binding, SQLite compatibility
- **Full Postgres needed**: Neon — serverless, branching, pgvector support
- **MySQL team, schema safety**: PlanetScale — branching deploys, Vitess scale
- **SaaS with many tenants**: Turso — 500 free databases, per-tenant isolation
- **Caching / rate limiting**: Upstash — the standard Redis-compatible edge cache
- **Multi-framework, Postgres, preview envs**: Neon + Upstash is the most common pairing in 2026

The edge database ecosystem is still evolving. Pricing models change, cold start performance improves with each quarter, and new replication strategies are being built. Lock in on the protocol and ORM layer (Drizzle is the safe choice for portability) and migrating between providers becomes manageable if your requirements change.
