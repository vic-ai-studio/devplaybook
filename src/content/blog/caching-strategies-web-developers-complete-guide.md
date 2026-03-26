---
title: "Caching Strategies for Web Developers: Browser, CDN, Server-Side, and Database"
description: "Complete guide to web caching strategies. Covers HTTP cache headers, CDN configuration, Redis/Memcached patterns, service workers, and database query caching with practical code examples and performance benchmarks."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["caching", "performance", "redis", "cdn", "service-worker", "http-headers", "web-performance", "database", "2026"]
readingTime: "16 min read"
---

Caching is the single most effective performance optimization available to web developers. A well-cached page can serve responses in under 1ms versus 200–500ms for an uncached database-backed request. Yet most developers treat caching as an afterthought—slapping on a CDN and hoping for the best.

This guide covers every layer of the caching stack: browser HTTP caches, CDN edge caches, server-side in-memory stores (Redis, Memcached), and database query caches. You'll get practical code examples, comparison tables, and the mental model to choose the right strategy for each situation.

## TL;DR

- Browser caching: use `Cache-Control` headers to control client-side freshness
- CDN caching: offload origin traffic with edge caches; vary by query string and headers
- Redis/Memcached: fast in-memory stores for computed results and session data
- Service workers: offline-first caching for PWAs with fine-grained control
- Database caching: query result caching, materialized views, and connection pooling
- The golden rule: cache as close to the user as possible, invalidate as rarely as needed

---

## Why Caching Matters: Real Numbers

Before diving into implementation, here's what caching actually delivers in production:

| Scenario | Without Cache | With Cache | Improvement |
|---|---|---|---|
| Static asset (image) | 150ms (CDN miss + origin) | 2ms (CDN hit) | 75× faster |
| API response (Redis) | 80ms (DB query) | 0.5ms (cache hit) | 160× faster |
| SSR page (full-page cache) | 300ms (render + DB) | 5ms (cache hit) | 60× faster |
| Database query (indexed) | 40ms | 0.3ms (query cache) | 133× faster |

These numbers come from real applications. Cache hit rates above 90% are achievable for most read-heavy workloads, which means the average response time approaches cache speed rather than origin speed.

---

## Layer 1: Browser Caching with HTTP Cache Headers

The browser has a built-in cache. Every HTTP response can instruct the browser on how long to keep a cached copy, whether to revalidate before use, and who else can cache it.

### Cache-Control Header Anatomy

`Cache-Control` is the primary caching directive. It replaces the older `Expires` header and should be on every response you serve.

```http
Cache-Control: max-age=31536000, immutable
Cache-Control: no-cache
Cache-Control: no-store
Cache-Control: public, max-age=3600, stale-while-revalidate=60
```

Key directives:

| Directive | Meaning |
|---|---|
| `max-age=N` | Cache for N seconds from the response date |
| `s-maxage=N` | Override for shared caches (CDNs); takes priority over `max-age` |
| `no-cache` | Must revalidate with origin before using cached copy |
| `no-store` | Never cache — not in browser, not in CDN |
| `public` | Response is cacheable by any cache (CDN, proxy) |
| `private` | Only the browser can cache it (not CDNs) |
| `immutable` | Content will never change; skip revalidation even on reload |
| `stale-while-revalidate=N` | Serve stale cache while revalidating in background |
| `stale-if-error=N` | Serve stale cache if origin returns 5xx |

### Practical Cache-Control Recipes

**Long-lived static assets (CSS, JS, images with hash in filename):**
```http
Cache-Control: public, max-age=31536000, immutable
```
One year. Safe because the filename includes a content hash (`app.a3f9b2.js`). When content changes, the filename changes.

**HTML pages (frequently updated, SEO-sensitive):**
```http
Cache-Control: public, max-age=0, must-revalidate
```
Forces revalidation on every request. Pairs with ETag or Last-Modified for efficient conditional requests.

**API responses (read-heavy, acceptable staleness):**
```http
Cache-Control: public, max-age=60, stale-while-revalidate=300
```
Serve cached for 60 seconds. If stale, serve the old version while fetching a fresh copy in the background (up to 5 minutes).

**User-specific data (authentication, personal dashboards):**
```http
Cache-Control: private, max-age=300
```
Only the user's browser caches it. CDNs will not store it.

**Sensitive data (payment pages, health records):**
```http
Cache-Control: no-store
```
Never persisted anywhere.

### ETag and Conditional Requests

`ETag` is a fingerprint of the response content. Browsers send it back on subsequent requests; the server returns `304 Not Modified` if the content hasn't changed—saving bandwidth without re-downloading.

```javascript
// Express.js — automatic ETag support
const express = require('express');
const app = express();

// ETags enabled by default in Express
app.get('/api/products', async (req, res) => {
  const products = await db.getProducts();

  // Express auto-generates ETag from the response body
  // Browser sends: If-None-Match: "abc123"
  // Express compares and returns 304 if match
  res.json(products);
});
```

For custom ETag logic (useful when you have a known version/timestamp):

```javascript
const crypto = require('crypto');

app.get('/api/config', async (req, res) => {
  const config = await getConfig();
  const etag = crypto
    .createHash('md5')
    .update(JSON.stringify(config))
    .digest('hex');

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(config);
});
```

### Vary Header

`Vary` tells caches to store separate versions based on request headers. Critical for content negotiation:

```http
Vary: Accept-Encoding
Vary: Accept-Language
Vary: Authorization
```

**Warning:** `Vary: Authorization` or `Vary: Cookie` effectively disables CDN caching for those responses—CDNs can't cache user-specific content safely without segment-level logic.

---

## Layer 2: CDN Caching

A Content Delivery Network sits between your users and your origin server, caching responses at edge locations worldwide. The cache hit happens 10–50ms from the user instead of 100–500ms across the internet.

### How CDN Caching Works

```
User (Tokyo)
  ↓ request
CDN Edge Node (Tokyo)
  ↓ cache HIT → return immediately (10ms)
  ↓ cache MISS → fetch from origin
Origin Server (US-East)
  ↓ response with Cache-Control headers
CDN Edge Node (Tokyo) — stores response
  ↓ return to user (150ms first request, 10ms after)
```

### CDN Cache Configuration

Most CDNs respect your `Cache-Control` headers. But you can also configure overrides at the CDN level.

**Cloudflare — Cache Rules (via Terraform/API):**
```hcl
resource "cloudflare_ruleset" "cache_rules" {
  zone_id = var.zone_id
  name    = "Cache Rules"
  kind    = "zone"
  phase   = "http_response_headers_transform"

  rules {
    action = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl {
        mode    = "override_origin"
        default = 3600
      }
      browser_ttl {
        mode    = "respect_origin"
      }
    }
    expression = "(http.request.uri.path matches \"^/api/public/\")"
  }
}
```

**Nginx as a reverse proxy cache:**
```nginx
http {
  proxy_cache_path /var/cache/nginx
    levels=1:2
    keys_zone=api_cache:10m
    max_size=1g
    inactive=60m
    use_temp_path=off;

  server {
    location /api/public/ {
      proxy_cache api_cache;
      proxy_cache_valid 200 1h;
      proxy_cache_valid 404 1m;
      proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
      proxy_cache_background_update on;
      proxy_cache_lock on;

      # Cache key includes query string by default
      proxy_cache_key "$scheme$request_method$host$request_uri";

      add_header X-Cache-Status $upstream_cache_status;
      proxy_pass http://app_upstream;
    }
  }
}
```

### CDN Cache Invalidation

Cache invalidation is one of the hardest problems in computer science. The two safe strategies:

**Strategy 1: Content-addressed URLs (recommended)**

Include a content hash in the URL. When content changes, the URL changes. Old cached URLs expire naturally.

```
/static/app.a3f9b2c1.js    → hash changes with every build
/static/logo.e8a1b2c3.png  → permanent, never expires
```

**Strategy 2: On-demand purge via API**

For HTML pages and API responses that must update immediately:

```javascript
// Cloudflare API purge
async function purgeCache(urls) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );
  return response.json();
}

// Call after content update
await purgeCache([
  'https://devplaybook.cc/blog/my-updated-post',
  'https://devplaybook.cc/sitemap.xml',
]);
```

### Cache Stampede Prevention

When a popular cache entry expires, many requests hit the origin simultaneously. Solutions:

1. **Probabilistic early expiration** — randomly revalidate before expiry
2. **Mutex/locking** — only one request rebuilds the cache (Nginx `proxy_cache_lock on`)
3. **Stale-while-revalidate** — serve stale while one request refreshes

---

## Layer 3: Server-Side Caching with Redis

Redis is the industry standard for application-level caching. It stores data in memory with microsecond read times. Memcached is an alternative—faster for simple string values, but Redis wins on features (data structures, persistence, Lua scripting, pub/sub).

### Redis vs Memcached

| Feature | Redis | Memcached |
|---|---|---|
| Data types | Strings, lists, sets, hashes, sorted sets, streams | Strings only |
| Persistence | Yes (RDB snapshots, AOF log) | No |
| Replication | Yes (master-replica) | No |
| Transactions | Yes (MULTI/EXEC) | No |
| Lua scripting | Yes | No |
| Max value size | 512 MB | 1 MB |
| Threading | Single-threaded (v6+ multi-threaded I/O) | Multi-threaded |
| Typical use | Session store, job queues, leaderboards, caching | Simple key-value caching |

**Use Redis** for most new projects. Use Memcached only if you need maximum throughput for simple string lookups and can sacrifice features.

### Redis Caching Patterns

**Pattern 1: Cache-Aside (Lazy Loading)**

The application checks the cache first. On a miss, it loads from the database and populates the cache.

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

async function getProduct(productId) {
  const cacheKey = `product:${productId}`;

  // 1. Check cache
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — load from DB
  const product = await db.products.findById(productId);

  if (!product) return null;

  // 3. Populate cache with TTL
  await client.setEx(cacheKey, 3600, JSON.stringify(product)); // 1 hour TTL

  return product;
}

async function updateProduct(productId, data) {
  // Update DB first
  const updated = await db.products.update(productId, data);

  // Invalidate cache
  await client.del(`product:${productId}`);

  return updated;
}
```

**Pattern 2: Write-Through**

Write to cache and database simultaneously. Cache is always consistent.

```javascript
async function createProduct(data) {
  // Write to DB
  const product = await db.products.create(data);

  // Write to cache immediately
  const cacheKey = `product:${product.id}`;
  await client.setEx(cacheKey, 3600, JSON.stringify(product));

  return product;
}
```

**Pattern 3: Write-Behind (Write-Back)**

Write to cache immediately, flush to database asynchronously. Highest performance, risk of data loss on crash.

```javascript
const WRITE_BUFFER_KEY = 'write_buffer:products';

async function updateProductAsync(productId, data) {
  // Write to cache immediately (fast response)
  await client.setEx(`product:${productId}`, 3600, JSON.stringify(data));

  // Queue DB write
  await client.lPush(WRITE_BUFFER_KEY, JSON.stringify({ productId, data, timestamp: Date.now() }));

  return data;
}

// Background worker — flush buffer to DB
async function flushWriteBuffer() {
  while (true) {
    const item = await client.rPop(WRITE_BUFFER_KEY);
    if (!item) break;
    const { productId, data } = JSON.parse(item);
    await db.products.update(productId, data);
  }
}
```

**Pattern 4: Cache Stampede Prevention with Mutex**

```javascript
const LOCK_TTL = 10; // seconds

async function getProductWithLock(productId) {
  const cacheKey = `product:${productId}`;
  const lockKey = `lock:${cacheKey}`;

  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Try to acquire lock (NX = set if not exists)
  const locked = await client.set(lockKey, '1', { NX: true, EX: LOCK_TTL });

  if (!locked) {
    // Another request is rebuilding — wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getProductWithLock(productId);
  }

  try {
    const product = await db.products.findById(productId);
    await client.setEx(cacheKey, 3600, JSON.stringify(product));
    return product;
  } finally {
    await client.del(lockKey);
  }
}
```

### Redis Data Structure Use Cases

```javascript
// Sorted set — leaderboard
await client.zAdd('leaderboard', [{ score: 1500, value: 'user:123' }]);
const top10 = await client.zRangeWithScores('leaderboard', 0, 9, { REV: true });

// Hash — user session
await client.hSet('session:abc123', {
  userId: '456',
  role: 'admin',
  loginAt: Date.now().toString(),
});
const session = await client.hGetAll('session:abc123');

// Set — rate limiting
const key = `ratelimit:${ip}:${minute}`;
const count = await client.incr(key);
await client.expire(key, 60);
if (count > 100) throw new Error('Rate limit exceeded');
```

---

## Layer 4: Service Worker Caching

Service workers intercept network requests in the browser, enabling offline-first experiences and fine-grained caching control beyond what HTTP headers can provide.

### Service Worker Cache Strategies

**Strategy 1: Cache First (best for static assets)**

Serve from cache. Only hit network if not cached. Fastest response, stale risk.

```javascript
// service-worker.js
const CACHE_NAME = 'static-v1';
const STATIC_ASSETS = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/offline.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.destination === 'image' ||
      event.request.url.includes('/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
```

**Strategy 2: Network First (best for API data)**

Try network first. Fall back to cache if offline. Fresh data when connected.

```javascript
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open('api-cache').then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
```

**Strategy 3: Stale While Revalidate (best for frequently updated content)**

Return cache immediately, update in background.

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.open('content-cache').then(async cache => {
      const cached = await cache.match(event.request);

      // Fetch in background regardless
      const fetchPromise = fetch(event.request).then(response => {
        cache.put(event.request, response.clone());
        return response;
      });

      // Return cached immediately, or wait for fetch
      return cached || fetchPromise;
    })
  );
});
```

### Cache Versioning and Cleanup

```javascript
const CURRENT_CACHES = {
  static: 'static-v3',
  api: 'api-v2',
};

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      const validCaches = Object.values(CURRENT_CACHES);
      return Promise.all(
        cacheNames
          .filter(name => !validCaches.includes(name))
          .map(name => caches.delete(name))
      );
    })
  );
});
```

---

## Layer 5: Database Query Caching

The database is usually the bottleneck. Caching at this layer has the highest leverage.

### Application-Level Query Result Caching

```javascript
// Generic query cache wrapper
class QueryCache {
  constructor(redisClient, defaultTTL = 300) {
    this.redis = redisClient;
    this.ttl = defaultTTL;
  }

  async query(sql, params, options = {}) {
    const key = `query:${this.hash(sql + JSON.stringify(params))}`;
    const ttl = options.ttl || this.ttl;

    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const result = await db.query(sql, params);
    await this.redis.setEx(key, ttl, JSON.stringify(result));
    return result;
  }

  hash(str) {
    return require('crypto').createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  async invalidate(pattern) {
    // Use Redis SCAN to find and delete keys matching a pattern
    let cursor = 0;
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, { MATCH: `query:${pattern}*`, COUNT: 100 });
      cursor = nextCursor;
      if (keys.length) await this.redis.del(keys);
    } while (cursor !== 0);
  }
}

// Usage
const cache = new QueryCache(redisClient);

const products = await cache.query(
  'SELECT * FROM products WHERE category = ? AND active = true',
  ['electronics'],
  { ttl: 600 }
);
```

### PostgreSQL Query Optimization with pg_stat_statements

Identify slow queries before caching:

```sql
-- Enable query tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find the slowest queries
SELECT
  query,
  calls,
  total_exec_time / calls AS avg_time_ms,
  rows / calls AS avg_rows,
  100.0 * total_exec_time / sum(total_exec_time) OVER () AS percentage
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Materialized Views for Complex Aggregations

```sql
-- Create a materialized view for expensive dashboard queries
CREATE MATERIALIZED VIEW product_sales_summary AS
SELECT
  p.id,
  p.name,
  p.category,
  COUNT(o.id) AS order_count,
  SUM(o.total) AS revenue,
  AVG(o.total) AS avg_order_value
FROM products p
LEFT JOIN orders o ON o.product_id = p.id
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.name, p.category;

-- Index it for fast lookups
CREATE INDEX ON product_sales_summary (category, revenue DESC);

-- Refresh asynchronously (schedule with cron)
REFRESH MATERIALIZED VIEW CONCURRENTLY product_sales_summary;
```

### Connection Pool as Cache

Database connections are expensive (50–200ms to establish). A connection pool reuses them:

```javascript
// PostgreSQL with pg Pool
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: 20,                  // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail if no connection in 2s
});

// Pool reuses connections — no handshake overhead
const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
```

---

## Choosing the Right Caching Strategy

| Content Type | Recommended Strategy | TTL |
|---|---|---|
| Static assets (hashed filename) | CDN + browser (immutable) | 1 year |
| HTML pages | CDN + ETag revalidation | 0 + revalidate |
| Public API responses | CDN + Redis | 60–300s |
| User-specific API responses | Redis (private) | 300–3600s |
| Session data | Redis | 1–24h |
| Database aggregations | Redis + materialized view | 600–3600s |
| Infrequently changing config | Redis | 1–24h |
| Search results | Redis | 60–300s |
| PWA app shell | Service worker (cache first) | Until version change |
| PWA dynamic content | Service worker (network first) | Short TTL or event-driven |

---

## Cache Monitoring and Observability

Track these metrics in production:

```javascript
// Track cache hit rate with Prometheus
const { Counter, Histogram } = require('prom-client');

const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Number of cache hits',
  labelNames: ['cache_layer', 'resource_type'],
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Number of cache misses',
  labelNames: ['cache_layer', 'resource_type'],
});

const cacheLatency = new Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Time spent on cache operations',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});

// Wrap Redis calls with instrumentation
async function cachedGet(key, resourceType = 'generic') {
  const end = cacheLatency.startTimer({ operation: 'get' });
  const value = await redis.get(key);
  end();

  if (value) {
    cacheHits.inc({ cache_layer: 'redis', resource_type: resourceType });
  } else {
    cacheMisses.inc({ cache_layer: 'redis', resource_type: resourceType });
  }

  return value;
}
```

**Key metrics to track:**

- **Hit rate**: target > 90% for read-heavy workloads
- **Eviction rate**: high eviction = cache too small or TTLs too long
- **Memory usage**: Redis `INFO memory` command
- **Miss latency**: how long cache misses take (should match DB baseline)
- **Error rate**: cache unavailability should not crash the app (implement fallbacks)

---

## Common Caching Mistakes

**Mistake 1: Caching mutable data without invalidation**

If you cache a user's profile for 1 hour, updates won't reflect for up to an hour. Always pair caching with a deletion/invalidation strategy on writes.

**Mistake 2: Caching errors**

```javascript
// BAD — caches 404 or 500 responses
const result = await fetch('/api/data');
await redis.setEx(key, 3600, await result.text());

// GOOD — only cache success responses
const result = await fetch('/api/data');
if (result.ok) {
  await redis.setEx(key, 3600, await result.text());
}
```

**Mistake 3: Using `no-cache` when you mean `no-store`**

`no-cache` means "revalidate before use"—the browser still stores it. `no-store` means "never cache." Use `no-store` for truly sensitive data.

**Mistake 4: Not handling cache unavailability**

Redis goes down. Your app must still work:

```javascript
async function getFromCache(key) {
  try {
    return await redis.get(key);
  } catch (err) {
    // Log but don't crash — fall through to DB
    logger.warn('Redis unavailable, bypassing cache', { key, err: err.message });
    return null;
  }
}
```

**Mistake 5: Caching too aggressively on the first load**

Populate caches lazily or via a warming strategy, not on every startup. Cold-start cache warming can overload your database.

---

## Cache Warming Strategies

For critical paths where a cold cache causes unacceptable latency:

```javascript
// Warm cache on deployment
async function warmCache() {
  console.log('Warming cache...');

  const popularProductIds = await db.query(
    'SELECT id FROM products ORDER BY view_count DESC LIMIT 100'
  );

  await Promise.all(
    popularProductIds.map(({ id }) => getProduct(id)) // Uses cache-aside pattern
  );

  console.log(`Warmed ${popularProductIds.length} products`);
}

// Run on deploy (not during request handling)
if (process.env.WARM_CACHE === 'true') {
  warmCache().catch(console.error);
}
```

---

## Caching with Next.js and React

Next.js 14+ has built-in caching at multiple levels:

```javascript
// App Router — fetch with cache control
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: {
      revalidate: 3600,    // ISR: revalidate every hour
      tags: ['products'],  // Tag for on-demand revalidation
    },
  });
  return res.json();
}

// On-demand revalidation (in a Server Action or Route Handler)
import { revalidateTag } from 'next/cache';

export async function updateProduct(id, data) {
  await db.products.update(id, data);
  revalidateTag('products'); // Invalidates all fetches tagged 'products'
}
```

```javascript
// Route Handler with cache headers
export async function GET() {
  const data = await getPublicData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
```

---

## Summary: The Caching Decision Tree

```
Is the content user-specific?
  ├── YES → Redis (private cache) + private Cache-Control
  └── NO  → Is it static/unchanging?
              ├── YES → Content hash URL + CDN + immutable Cache-Control
              └── NO  → How often does it change?
                          ├── Rarely (hours/days) → CDN + long TTL + on-demand purge
                          ├── Frequently (seconds/minutes) → Redis + short TTL + stale-while-revalidate
                          └── Real-time → Skip cache, use WebSocket/SSE
```

The best caching strategy is the simplest one that meets your performance and consistency requirements. Start with HTTP headers—they're free and require no infrastructure. Add Redis when you have expensive computations or database bottlenecks. Use a CDN for global traffic. Service workers for offline-first requirements.

Measure your cache hit rate. If it's below 80%, your keys are too granular, your TTLs too short, or your invalidation too aggressive. Tune until the cache is doing most of the work.

---

## Explore More on DevPlaybook

DevPlaybook has free online tools for developers who work with caching and performance:

- **[HTTP Headers Reference](https://devplaybook.cc/tools/http-headers)** — look up any Cache-Control directive
- **[JSON Formatter](https://devplaybook.cc/tools/json-formatter)** — format Redis JSON payloads during debugging
- **[Base64 Encoder/Decoder](https://devplaybook.cc/tools/base64)** — encode cache keys that contain special characters
- **[Regex Tester](https://devplaybook.cc/tools/regex)** — test patterns for cache key matching and URL routing

Build faster applications by caching strategically at every layer—from the CDN edge to the database query planner.
