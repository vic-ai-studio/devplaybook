---
title: "Cloudflare Workers + D1: Build a Full-Stack Edge App in 2026"
description: "Complete guide to Cloudflare Workers with D1 SQLite database. Learn Worker setup, D1 schema migrations, SQL queries, REST API patterns, and deployment — all running at the edge with zero cold starts."
author: "DevPlaybook Team"
date: "2026-03-28"
readingTime: "13 min read"
tags: ["cloudflare", "workers", "d1", "edge", "serverless", "sqlite"]
---

# Cloudflare Workers + D1: Build a Full-Stack Edge App in 2026

Cloudflare Workers run JavaScript at the edge — in over 300 data centers worldwide — with sub-millisecond cold starts and no server management. D1 is Cloudflare's serverless SQLite database, designed to work natively with Workers.

Together they form a full-stack edge platform: compute and data storage distributed globally, billed per request, and deployable from a single CLI command.

This guide builds a complete REST API with Workers and D1 — from zero to production.

## What Makes Workers + D1 Different

Traditional serverless (AWS Lambda, Vercel Functions) runs in a handful of regions. Your user in Tokyo hits a function running in us-east-1.

Workers run in the data center nearest to the user. D1 reads are served from a regional replica close to the Worker. The result: consistent single-digit millisecond response times worldwide.

| Feature | Lambda + RDS | Workers + D1 |
|---|---|---|
| Cold starts | 100ms–3s | ~0ms (V8 isolates) |
| Global distribution | Multi-region setup required | Automatic |
| Database | Managed PostgreSQL/MySQL | SQLite at edge |
| Pricing | Invocation + GB-hours | Requests + rows read/written |
| Local dev | Docker/LocalStack | `wrangler dev` |
| SQL dialect | PostgreSQL/MySQL | SQLite |

## Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login
```

## Project Setup

```bash
# Create a new Worker project
npm create cloudflare@latest my-api

# Choose: "Hello World" Worker (TypeScript)
cd my-api
```

Project structure:

```
my-api/
├── src/
│   └── index.ts       # Worker entry point
├── wrangler.toml      # Cloudflare config
├── package.json
└── tsconfig.json
```

## Creating a D1 Database

```bash
# Create the database
wrangler d1 create my-api-db

# Output:
# ✅ Successfully created DB 'my-api-db' in region EEUR
# [[d1_databases]]
# binding = "DB" # i.e. available in your Worker on env.DB
# database_name = "my-api-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the output to `wrangler.toml`:

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "my-api-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Schema Migrations

D1 uses SQL migration files. Create `schema/0001_initial.sql`:

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  price      REAL    NOT NULL,
  category   TEXT    NOT NULL DEFAULT 'general',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    UNIQUE NOT NULL,
  name       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  total      REAL    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'pending',
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Seed data
INSERT INTO products (name, price, category) VALUES
  ('Widget A', 9.99, 'widgets'),
  ('Widget B', 19.99, 'widgets'),
  ('Gadget X', 49.99, 'gadgets');
```

Apply the migration:

```bash
# Apply locally (for dev)
wrangler d1 execute my-api-db --local --file=schema/0001_initial.sql

# Apply to production
wrangler d1 execute my-api-db --file=schema/0001_initial.sql
```

## Building the Worker API

The Worker entry point handles routing. D1 is available on `env.DB`:

```typescript
// src/index.ts
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      // Route: GET /products
      if (pathname === '/products' && request.method === 'GET') {
        return handleGetProducts(env, url);
      }

      // Route: GET /products/:id
      const productMatch = pathname.match(/^\/products\/(\d+)$/);
      if (productMatch) {
        const id = parseInt(productMatch[1]);
        if (request.method === 'GET') return handleGetProduct(env, id);
        if (request.method === 'PUT') return handleUpdateProduct(env, id, request);
        if (request.method === 'DELETE') return handleDeleteProduct(env, id);
      }

      // Route: POST /products
      if (pathname === '/products' && request.method === 'POST') {
        return handleCreateProduct(env, request);
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: 'Internal server error' }, 500);
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

### GET Handler with Filtering

```typescript
async function handleGetProducts(env: Env, url: URL): Promise<Response> {
  const category = url.searchParams.get('category');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  let query: string;
  let params: (string | number)[];

  if (category) {
    query = `
      SELECT id, name, price, category, created_at
      FROM products
      WHERE category = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    params = [category, limit, offset];
  } else {
    query = `
      SELECT id, name, price, category, created_at
      FROM products
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    params = [limit, offset];
  }

  const { results } = await env.DB.prepare(query).bind(...params).all();

  // Get total count for pagination
  const countQuery = category
    ? env.DB.prepare('SELECT COUNT(*) as total FROM products WHERE category = ?').bind(category)
    : env.DB.prepare('SELECT COUNT(*) as total FROM products');

  const { results: countResults } = await countQuery.all();
  const total = (countResults[0] as { total: number }).total;

  return json({ products: results, total, limit, offset });
}
```

### POST Handler with Validation

```typescript
async function handleCreateProduct(env: Env, request: Request): Promise<Response> {
  const body = await request.json() as { name?: string; price?: number; category?: string };

  // Validation
  if (!body.name || typeof body.name !== 'string') {
    return json({ error: 'name is required and must be a string' }, 400);
  }
  if (body.price === undefined || typeof body.price !== 'number' || body.price < 0) {
    return json({ error: 'price is required and must be a non-negative number' }, 400);
  }

  const { meta } = await env.DB.prepare(`
    INSERT INTO products (name, price, category)
    VALUES (?, ?, ?)
  `).bind(
    body.name.trim(),
    body.price,
    body.category ?? 'general'
  ).run();

  const product = await env.DB.prepare(
    'SELECT * FROM products WHERE id = ?'
  ).bind(meta.last_row_id).first();

  return json(product, 201);
}
```

### Batch Queries for Performance

Use `batch()` to run multiple queries in a single round-trip:

```typescript
async function handleGetProductWithStats(env: Env, id: number): Promise<Response> {
  const [productResult, orderCountResult] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id),
    env.DB.prepare(
      'SELECT COUNT(*) as order_count FROM order_items WHERE product_id = ?'
    ).bind(id),
  ]);

  if (!productResult.results.length) {
    return json({ error: 'Product not found' }, 404);
  }

  return json({
    ...productResult.results[0],
    order_count: (orderCountResult.results[0] as { order_count: number }).order_count,
  });
}
```

## Local Development

```bash
# Start local dev server with D1
wrangler dev

# The local D1 database is stored at .wrangler/state/v3/d1/
# It resets on each wrangler dev start unless you use --persist
wrangler dev --persist
```

Test your API:

```bash
# Create a product
curl -X POST http://localhost:8787/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Widget","price":14.99,"category":"widgets"}'

# Get products
curl "http://localhost:8787/products?category=widgets&limit=10"
```

## D1 Query Patterns

### Prepared Statements (Always Use These)

D1 uses prepared statements exclusively — never string interpolation:

```typescript
// ✅ Safe — parameterized
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE email = ?'
).bind(email).first();

// ❌ Never do this — SQL injection risk
const result = await env.DB.prepare(
  `SELECT * FROM users WHERE email = '${email}'`
).first();
```

### Transactions

```typescript
const orderResult = await env.DB.batch([
  env.DB.prepare(
    'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)'
  ).bind(userId, total, 'pending'),
  env.DB.prepare(
    'UPDATE users SET order_count = order_count + 1 WHERE id = ?'
  ).bind(userId),
]);

// If either statement fails, both roll back
```

### Full-Text Search (FTS5)

```sql
-- In migration
CREATE VIRTUAL TABLE products_fts USING fts5(
  name,
  description,
  content='products',
  content_rowid='id'
);

CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, name, description)
  VALUES (new.id, new.name, new.description);
END;
```

```typescript
// Search query
const { results } = await env.DB.prepare(`
  SELECT p.*, rank
  FROM products p
  JOIN products_fts ON products_fts.rowid = p.id
  WHERE products_fts MATCH ?
  ORDER BY rank
  LIMIT 20
`).bind(searchTerm).all();
```

## Authentication with Workers

Add JWT verification middleware:

```typescript
async function authenticate(request: Request): Promise<{ userId: number } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Verify JWT using Web Crypto API (built into Workers)
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [headerB64, payloadB64, sigB64] = token.split('.');
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64url.decode(sigB64),
      encoder.encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now() / 1000) return null;

    return { userId: payload.sub };
  } catch {
    return null;
  }
}
```

## Deployment

```bash
# Deploy to production
wrangler deploy

# Output:
# ✅ Deployed my-api
# https://my-api.your-account.workers.dev
```

### Custom Domain

In `wrangler.toml`:

```toml
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]
```

### Environment Variables

```toml
# wrangler.toml
[vars]
ENVIRONMENT = "production"

# Secrets (never in wrangler.toml)
# Set via: wrangler secret put JWT_SECRET
```

```typescript
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  JWT_SECRET: string; // Set as secret
}
```

## D1 Limits and Pricing (2026)

| Metric | Free tier | Paid |
|---|---|---|
| Rows read/day | 5 million | $0.001/100K |
| Rows written/day | 100,000 | $0.001/100K |
| Storage | 5 GB | $0.75/GB-month |
| Databases | 10 | Unlimited |
| Database size | 500 MB | 10 GB |

The free tier is generous for development and small apps.

## Key Takeaways

- **D1 is SQLite** — use `INTEGER PRIMARY KEY AUTOINCREMENT`, not `SERIAL` or `BIGINT`
- **Always use prepared statements** with `?` placeholders and `.bind()`
- **`batch()`** reduces round-trips for related queries
- **`wrangler dev --persist`** preserves your local D1 data between restarts
- **Workers have no cold starts** — V8 isolates start in microseconds
- **Secrets via `wrangler secret`** — never commit API keys to wrangler.toml
- **D1 replicas** serve reads from the nearest region automatically

Workers + D1 is the most complete serverless edge stack available today. For APIs, background jobs, or full-stack apps where latency and global scale matter, it eliminates the infrastructure complexity without sacrificing SQL power.
