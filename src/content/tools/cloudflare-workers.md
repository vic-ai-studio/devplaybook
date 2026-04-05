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

## Concrete Use Case: Geolocation-Aware A/B Testing Edge Function

Imagine you run an e-commerce site with three backend variants (control, variant-A, variant-B). You want users from the US to see variant-A, users from the EU to see variant-B, and everyone else to see the control. You also need to: (1) store experiment assignments in D1 so they're persistent across requests, and (2) use KV as a feature flag store to toggle experiments on/off without redeploying.

**Architecture at a glance:**

- **Edge function** inspects `request.cf.country` (Cloudflare-injected), looks up the experiment config from KV, assigns the user to a bucket, stores that assignment in D1, and redirects to the appropriate backend.
- **KV** holds feature flags and experiment definitions (e.g., which countries get which variants, experiment weights).
- **D1** records which user got which variant for analytics.

```typescript
// src/index.ts

interface Env {
  EXPERIMENTS_KV: KVNamespace;      // Feature flags & experiment config
  EXPERIMENTS_DB: D1Database;        // Persistent assignment storage
  BACKEND_CONTROL: string;            // Origin URL for control
  BACKEND_VARIANT_A: string;          // Origin URL for variant A
  BACKEND_VARIANT_B: string;          // Origin URL for variant B
}

interface Experiment {
  id: string;
  name: string;
  enabled: boolean;
  countryRules: Record<string, string>; // country code → variant name
  defaultVariant: string;
}

interface Assignment {
  experimentId: string;
visitorId: string;
  variant: string;
  assignedAt: number;
}

// Deterministic bucket assignment (consistent per visitor)
function assignToBucket(visitorId: string, experimentId: string): string {
  const input = `${visitorId}:${experimentId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const bucket = Math.abs(hash) % 100;
  // US → A (buckets 0-49), EU → B (buckets 50-89), default → control (90-99)
  return bucket < 50 ? 'A' : bucket < 90 ? 'B' : 'control';
}

async function fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const visitorId = request.headers.get('CF-RAY')?.split('-')[0] || 'anonymous';

  // --- 1. Check feature flag from KV ---
  const experimentConfigRaw = await env.EXPERIMENTS_KV.get('experiment:checkout-v2');
  if (!experimentConfigRaw) {
    // Feature flag not found — fall through to control
    return fetchFromOrigin(request, env.BACKEND_CONTROL);
  }

  const experiment: Experiment = JSON.parse(experimentConfigRaw);
  if (!experiment.enabled) {
    return fetchFromOrigin(request, env.BACKEND_CONTROL);
  }

  // --- 2. Look up country from CF edge metadata ---
  const country = request.cf?.country ?? 'XX';
  const resolvedVariant = experiment.countryRules[country] ?? experiment.defaultVariant;

  // --- 3. Get or create persistent assignment from D1 ---
  const existingRow = await env.EXPERIMENTS_DB
    .prepare('SELECT * FROM assignments WHERE visitor_id = ? AND experiment_id = ?')
    .bind(visitorId, experiment.id)
    .first();

  let assignedVariant: string;
  if (existingRow) {
    assignedVariant = (existingRow as unknown as Assignment).variant;
  } else {
    // New visitor — assign a bucket and persist to D1
    assignedVariant = assignToBucket(visitorId, experiment.id);
    await env.EXPERIMENTS_DB
      .prepare(
        'INSERT INTO assignments (visitor_id, experiment_id, variant, assigned_at) VALUES (?, ?, ?, ?)'
      )
      .bind(visitorId, experiment.id, assignedVariant, Date.now())
      .run();
  }

  // --- 4. Route to the appropriate backend origin ---
  const backendMap: Record<string, string> = {
    control: env.BACKEND_CONTROL,
    A: env.BACKEND_VARIANT_A,
    B: env.BACKEND_VARIANT_B,
  };
  const targetOrigin = backendMap[assignedVariant] ?? env.BACKEND_CONTROL;

  // Clone request to target origin, preserving method and body
  const modifiedRequest = new Request(targetOrigin + url.pathname + url.search, request);
  return fetch(modifiedRequest);
}

function fetchFromOrigin(origin: string): Promise<Response> {
  // Fallback when experiment is disabled
  return fetch(origin);
}
```

**KV feature flag data (stored as JSON under key `experiment:checkout-v2`):**

```json
{
  "id": "checkout-v2",
  "name": "Checkout Redesign Experiment",
  "enabled": true,
  "countryRules": {
    "US": "A",
    "CA": "A",
    "GB": "B",
    "DE": "B",
    "FR": "B",
    "IT": "B",
    "ES": "B"
  },
  "defaultVariant": "control"
}
```

**D1 schema:**

```sql
CREATE TABLE IF NOT EXISTS assignments (
  visitor_id TEXT NOT NULL,
  experiment_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (visitor_id, experiment_id)
);
```

**Why this works at the edge:**

- The function runs in the datacenter closest to the user (Cloudflare's 300+ PoPs). A user in Frankfurt hits the Frankfurt datacenter, not a US-region server.
- `request.cf.country` is injected by Cloudflare's network — no need to call a GeoIP API, it's already available at request time.
- KV reads are globally consistent and sub-millisecond. D1 writes are asynchronous within the request — the response isn't held up waiting for the database commit.
- Assignment is deterministic per visitor ID, so the same user always gets the same variant on return visits.

**Toggling experiments without redeploying:**

```typescript
// To disable an experiment, just update the KV flag
await env.EXPERIMENTS_KV.put('experiment:checkout-v2', JSON.stringify({
  ...experiment,
  enabled: false,
}));
// Next request will route everyone to control — no code deployment needed
```

## Comparison: Cloudflare Workers vs AWS Lambda vs Fastly Compute@Edge

| | Cloudflare Workers | AWS Lambda | Fastly Compute@Edge |
|---|---|---|---|
| **Runtime** | V8 isolates (JavaScript/TypeScript/WASM) | Firecracker microVMs (any language via custom runtime) | Wasm (Rust, JS, Go, C) |
| **Cold start** | <1ms (isolate) | 100ms–1s (microVM) | <1ms (Wasm instance) |
| **Global edge PoPs** | 300+ | 35+ (Region-optimized) | 60+ |
| **Storage built-in** | KV, D1 (SQLite), R2 (S3-compatible), Durable Objects | S3, DynamoDB, ElastiCache, RDS (via VPC) | KV Store, Fasly Object Store |
| **Free tier** | 100K requests/day | 400K GB-s compute / month | 50K requests/day |
| **CPU time limit** | 30ms (free) / 30s (paid) | 15min max | 50ms (Compute@Edge Standard) |
| **Egress pricing** | Free | $0.09/GB (internet) | $0.20/GB (origin fetches) |
| **Native Node.js** | ❌ (compatibility layer) | ✅ (full Node.js) | ❌ (Wasm-only) |
| **WebAssembly** | ✅ WASI, WASM modules | ❌ (Lambda via custom runtime) | ✅ (first-class) |
| **Durable Objects** | ✅ (strongly consistent single-instance) | ❌ | ❌ |
| **Ease of use** | High (Wrangler CLI, simple) | Medium (SAM/CDK, IAM, VPC config) | Medium (FCLI, more ops overhead) |
| **Vendor lock-in** | High (Workers-specific APIs) | Medium (AWS-specific, portable with layers) | Medium (Fastly-specific) |
| **Observability** | Wrangler tail, Metrics dashboard, Logpush | CloudWatch, X-Ray, CloudWatch Logs | Fastly Fiddle, Log streaming |
| **Best for** | Low-latency global APIs, edge A/B testing, static + dynamic hybrid | Event-driven backends, complex async workloads, AWS ecosystem integration | High-throughput request manipulation, edge logic in Rust/Wasm |

**Key takeaways from the comparison:**

- **Cold start** is Cloudflare Workers' biggest advantage over Lambda — V8 isolates avoid the microVM boot penalty entirely.
- **Storage** is where Workers shine for stateful edge logic: Durable Objects give you a strongly consistent, single-instance primitive that Lambda has no equivalent for.
- **CPU time limits** are the Workers constraint that matters most — 30ms on the free plan won't handle CPU-heavy tasks like image processing or ML inference. Lambda's 15-minute limit is effectively unlimited for most use cases.
- **WASM** is native to both Workers and Compute@Edge, but Workers also supports JavaScript/TypeScript natively, making it more accessible for web developers.

## When to Use Cloudflare Workers / When Not to Use

**When to use Cloudflare Workers:**

- **You need globally consistent, low-latency routing logic.** A/B tests, feature flags, geolocation-based redirects, bot detection — run this logic at the edge rather than proxying to a regional origin.
- **Your application is API-first with lightweight per-request computation.** REST or GraphQL APIs that do KV reads, D1 queries, or simple transformations are ideal. Sub-millisecond cold starts mean you don't pay the Lambda "warm container" penalty.
- **You want to build a full-stack app with integrated storage.** D1 (SQLite at edge), KV, R2, and Durable Objects cover most storage needs without spinning up a separate database provider.
- **You're building a developer tool or SaaS with a generous free tier.** 100K requests/day handles most side projects and MVPs at zero cost.
- **You need WebAssembly at the edge.** Running Rust or C compiled to Wasm at 300+ PoPs is straightforward with Workers and doesn't require the operational complexity of Fastly's Compute@Edge.

**When NOT to use Cloudflare Workers:**

- **You need long-running computation.** The 30ms CPU limit (free tier) is a hard constraint. CPU-intensive tasks — video transcoding, large dataset processing, ML model inference — will hit the wall quickly. Use AWS Lambda (15-minute limit) or a dedicated compute service instead.
- **You're heavily invested in the Node.js ecosystem with native modules.** Workers run in a V8 isolate, not Node.js. While a Node.js compatibility layer exists, native modules (`.node` binaries) don't work. If your codebase depends on `bcrypt`, `sharp`, or similar, you'll need to rewrite or find WebAssembly equivalents.
- **You need a relational database with complex joins.** D1 is SQLite — it works well for per-request queries but lacks the full feature set of PostgreSQL or MySQL. If your workload needs complex multi-statement transactions, CDC pipelines, or row-level security, use a dedicated managed database (PlanetScale, Neon, Supabase) and call it from Workers.
- **Vendor lock-in is a hard constraint.** Workers-specific APIs (Durable Objects, KV, D1 bindings) are not portable. If you need to run the same code on AWS, GCP, or self-hosted, use a framework like Remix or Next.js with edge-compatible runtimes and keep storage abstractions at the application layer.
- **You need persistent background processing.** Workers are request-driven — there's no built-in equivalent to Lambda's SQS-triggered async invocations or S3 event processing. For event-driven workflows, AWS Lambda + SQS/SNS is a stronger fit.
- **You need the Node.js compatibility layer for AWS SDK calls.** Workers don't support AWS SDK v2/v3 natively in the standard runtime. While `@aws-sdk/client-s3` has partial support, AWS service integrations are easier and more complete on Lambda.
