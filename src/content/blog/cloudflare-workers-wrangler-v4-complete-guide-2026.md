---
title: "Cloudflare Workers & Wrangler v4 Complete Guide 2026"
description: "Complete guide to Cloudflare Workers and Wrangler v4 in 2026. Learn wrangler.toml configuration, Workers vs Pages, KV/R2/D1 bindings, environment management, local development with miniflare, and production deployment pipelines."
date: "2026-04-01"
tags: [cloudflare, workers, wrangler, devops, edge-computing]
readingTime: "15 min read"
---

# Cloudflare Workers & Wrangler v4 Complete Guide 2026

Cloudflare Workers has matured from a clever edge caching hack into a full application platform. In 2026, you can run TypeScript on 300+ global edge nodes, connect to databases via D1, store objects in R2, cache with KV, and run scheduled crons — all without provisioning a single server.

This guide covers everything you need to build and deploy production Workers with Wrangler v4, including the changes that tripped up developers migrating from Wrangler v2.

## The Workers Architecture in 2026

Before diving into configuration, here's the platform topology:

**Workers** run JavaScript/TypeScript on V8 isolates (not containers, not VMs). Cold starts are microseconds, not seconds. They run at the edge, close to users.

**Pages** is the static hosting + edge functions platform. Best for websites with server-side rendering.

**Durable Objects** provide stateful, consistent storage with strong consistency. Think: real-time collaboration, game state, rate limiters.

**KV** is a globally distributed key-value store. Eventually consistent. Best for configuration, session storage, content.

**R2** is S3-compatible object storage. No egress fees. Best for user uploads, media, large files.

**D1** is SQLite at the edge. Surprisingly capable for read-heavy workloads. Best for content databases, catalogs.

**Queues** are message queues for async processing. Best for background jobs, webhooks, decoupled pipelines.

---

## Installing Wrangler v4

```bash
npm install -g wrangler@latest
# or as dev dependency (recommended)
npm install --save-dev wrangler

# Verify version
npx wrangler --version
# 4.x.x

# Login
npx wrangler login
```

Wrangler v4 requires Node.js 18+. The login command opens a browser OAuth flow.

---

## wrangler.toml Structure

The `wrangler.toml` file is the single source of truth for your Worker's configuration.

### Minimal Worker

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

# Use latest compatibility flags
compatibility_flags = ["nodejs_compat"]
```

`compatibility_date` pins the runtime behavior. Cloudflare uses this to roll out breaking changes without breaking existing workers. Always set this to a recent date for new projects.

### Full Production Configuration

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"
compatibility_flags = ["nodejs_compat"]

# Account settings
account_id = "your-account-id"  # from Cloudflare dashboard
workers_dev = false  # don't publish to *.workers.dev
route = { pattern = "api.example.com/*", zone_name = "example.com" }

# Build settings
[build]
command = "npm run build"

# Environment variables (non-secret)
[vars]
ENVIRONMENT = "production"
API_VERSION = "v2"
LOG_LEVEL = "info"

# KV bindings
[[kv_namespaces]]
binding = "CACHE"
id = "abc123def456"
preview_id = "preview_abc123"  # for local dev / staging

# R2 bindings
[[r2_buckets]]
binding = "ASSETS"
bucket_name = "my-api-assets"
preview_bucket_name = "my-api-assets-preview"

# D1 bindings
[[d1_databases]]
binding = "DB"
database_name = "my-production-db"
database_id = "db-uuid-here"
preview_database_id = "local"  # uses local SQLite for dev

# Queue bindings
[[queues.producers]]
queue = "background-jobs"
binding = "JOB_QUEUE"

[[queues.consumers]]
queue = "background-jobs"
max_batch_size = 10
max_batch_timeout = 30

# Cron triggers
[triggers]
crons = ["0 */6 * * *"]  # every 6 hours

# Limits
[limits]
cpu_ms = 50  # default is 10ms for free, 50ms for paid
```

### Environment-Specific Configuration

Wrangler v4 improved environment inheritance. Child environments inherit all parent settings and override only what they specify:

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2026-01-01"

# Default (dev) settings
[vars]
ENVIRONMENT = "development"
LOG_LEVEL = "debug"

[[kv_namespaces]]
binding = "CACHE"
id = "dev-kv-id"

# Staging environment
[env.staging]
route = { pattern = "staging-api.example.com/*", zone_name = "example.com" }
[env.staging.vars]
ENVIRONMENT = "staging"
LOG_LEVEL = "info"
[[env.staging.kv_namespaces]]
binding = "CACHE"
id = "staging-kv-id"

# Production environment
[env.production]
route = { pattern = "api.example.com/*", zone_name = "example.com" }
[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "warn"
[[env.production.kv_namespaces]]
binding = "CACHE"
id = "production-kv-id"
```

Deploy to specific environments:
```bash
npx wrangler deploy --env staging
npx wrangler deploy --env production
```

---

## Writing Your First Worker

Modern Workers use the module syntax with ES modules:

```typescript
// src/index.ts

interface Env {
  // Type-safe binding access
  CACHE: KVNamespace;
  ASSETS: R2Bucket;
  DB: D1Database;
  JOB_QUEUE: Queue;
  // Environment variables
  ENVIRONMENT: string;
  API_KEY: string; // from secrets
}

export default {
  // Handle HTTP requests
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', env: env.ENVIRONMENT });
    }

    if (url.pathname.startsWith('/api/cache/')) {
      return handleCache(request, url, env);
    }

    return new Response('Not Found', { status: 404 });
  },

  // Handle scheduled cron
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered at: ${event.scheduledTime}`);
    await runDailyJob(env);
  },

  // Handle Queue messages
  async queue(batch: MessageBatch<JobMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processJob(message.body, env);
        message.ack();
      } catch (err) {
        message.retry({ delaySeconds: 60 });
      }
    }
  },
};

async function handleCache(request: Request, url: URL, env: Env): Promise<Response> {
  const key = url.pathname.replace('/api/cache/', '');

  if (request.method === 'GET') {
    const value = await env.CACHE.get(key, { type: 'json' });
    if (!value) return new Response('Not Found', { status: 404 });
    return Response.json(value);
  }

  if (request.method === 'PUT') {
    const body = await request.json();
    await env.CACHE.put(key, JSON.stringify(body), { expirationTtl: 3600 });
    return new Response('OK');
  }

  return new Response('Method Not Allowed', { status: 405 });
}
```

---

## D1 Database Usage

D1 is SQLite at the edge. Here's the typical pattern:

```typescript
// Database helper
async function getUser(db: D1Database, userId: string) {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userId)
    .first<User>();

  return result;
}

async function createUser(db: D1Database, user: CreateUserInput) {
  const result = await db
    .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(crypto.randomUUID(), user.email, user.name, new Date().toISOString())
    .run();

  return result.meta.last_row_id;
}

// Batch operations
async function createBatch(db: D1Database, items: Item[]) {
  const statements = items.map(item =>
    db.prepare('INSERT INTO items (id, name) VALUES (?, ?)').bind(item.id, item.name)
  );

  await db.batch(statements);
}
```

Migrations with Wrangler:
```bash
# Create migration
npx wrangler d1 migrations create my-db add-users-table

# Apply locally
npx wrangler d1 migrations apply my-db --local

# Apply to production
npx wrangler d1 migrations apply my-db --env production
```

---

## Secrets Management

Never put secrets in `wrangler.toml`. Use Wrangler's secrets:

```bash
# Set secret (prompts for value)
npx wrangler secret put API_KEY

# For specific environment
npx wrangler secret put API_KEY --env production

# List secrets (shows names only, not values)
npx wrangler secret list

# Delete secret
npx wrangler secret delete API_KEY
```

Secrets are available in `env.API_KEY` like any other binding, but stored encrypted and never visible in the dashboard.

For CI/CD, use Wrangler's `--secret` flag or the Cloudflare API:
```bash
# In GitHub Actions
echo "$API_KEY" | npx wrangler secret put API_KEY --env production
```

---

## Local Development with Wrangler Dev

```bash
# Start local dev server
npx wrangler dev

# With remote resources (uses actual KV/D1 in Cloudflare)
npx wrangler dev --remote

# Specific environment
npx wrangler dev --env staging
```

`wrangler dev` uses Miniflare under the hood — a full local emulator of the Workers runtime including KV, D1, R2, and Queues. Most resources work locally; only some features like Durable Objects require remote mode.

### Local Environment Variables

Create a `.dev.vars` file (never commit this):
```
# .dev.vars
API_KEY=your-local-dev-api-key
DATABASE_URL=sqlite://./local.db
```

These override `[vars]` values during local development.

---

## Workers vs Pages: When to Use Which

| Scenario | Use Workers | Use Pages |
|----------|-------------|-----------|
| Pure API / backend | ✓ | |
| Static site + edge functions | | ✓ |
| Full-stack app (Next.js, Remix) | | ✓ (Pages Functions) |
| Scheduled jobs | ✓ | |
| Queue consumers | ✓ | |
| WebSocket connections | ✓ (Durable Objects) | |
| Preview deployments | | ✓ (automatic) |

For Next.js, use `@cloudflare/next-on-pages` with Pages. For pure APIs, Workers is simpler and has fewer constraints.

---

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

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
          cache: 'npm'

      - run: npm ci

      - run: npm test

      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

The `CLOUDFLARE_API_TOKEN` needs the following permissions: `Workers Scripts:Edit`, `Workers KV Storage:Edit`, `Workers R2 Storage:Edit`.

---

## Performance Considerations

**CPU Time Limits:** Workers have a CPU time limit (10ms free, 50ms paid per request). This is CPU time, not wall clock time. Waiting for I/O (KV, D1, R2 fetches) doesn't count against your CPU budget.

**Subrequest Limits:** Each Worker invocation can make up to 50 subrequests (fetch() calls). Batch KV/D1 operations where possible.

**Memory:** 128MB per Worker invocation. For large data processing, consider streaming or batch-processing via Queues.

**Cold starts:** Sub-millisecond for small Workers. Larger Workers (more imports) can take 5-50ms. Use the `compatibility_flags = ["nodejs_compat"]` flag cautiously — the Node.js polyfills add size.

---

## Common Wrangler v4 Migration Issues

**From v2/v3:**

1. `compatibility_date` is now required (no longer defaulted)
2. ES modules syntax is now default — service worker syntax is deprecated
3. `wrangler.toml` environment inheritance changed — child envs now inherit all parent bindings
4. `--local` flag behavior changed — now defaults to full local emulation

**TypeScript:**

Add `@cloudflare/workers-types` for full type support:
```bash
npm install --save-dev @cloudflare/workers-types
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"]
  }
}
```

Generate types from your `wrangler.toml`:
```bash
npx wrangler types
```

This generates a `worker-configuration.d.ts` file with typed bindings matching your exact configuration — the cleanest way to get type safety across all your bindings.

Use the [Wrangler Config Generator](/tools/wrangler-config-generator) to generate a complete `wrangler.toml` for your specific binding combination without memorizing the exact syntax.

---

## Conclusion

Cloudflare Workers with Wrangler v4 is one of the most productive deployment targets available in 2026. The zero-ops story is real: write TypeScript, deploy with one command, and your code runs on 300+ nodes globally with sub-millisecond cold starts.

The key to success: understand the platform constraints (CPU limits, subrequest limits, no long-running processes), use the right storage primitive for each use case (KV for config, D1 for relational, R2 for blobs), and leverage Wrangler's environment system to maintain clean staging/production separation.
