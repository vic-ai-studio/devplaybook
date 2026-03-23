# Server-Side Performance Checklist

> Server-side performance directly determines Time to First Byte (TTFB). If the server takes 2 seconds to respond, your LCP cannot possibly be under 2.5 seconds. This checklist covers SSR, edge rendering, database optimization, and API response times.

---

## Rendering Strategy

- [ ] **[CRITICAL] Choose the right rendering strategy for each page type**
  | Page Type | Strategy | TTFB | When to Use |
  |-----------|----------|------|-------------|
  | Marketing/blog | Static (SSG) | < 50ms | Content changes infrequently |
  | Product pages | ISR (revalidate) | < 100ms | Changes periodically, many pages |
  | Dashboard | SSR | 200-500ms | User-specific, always fresh |
  | Search results | SSR + streaming | 100-300ms | Dynamic but needs fast FCP |
  | Settings/admin | CSR (SPA) | N/A | Behind auth, interactivity-first |

  ```javascript
  // Next.js examples:
  // SSG — generated at build time
  export async function getStaticProps() {
    const posts = await getPosts();
    return { props: { posts } };
  }

  // ISR — regenerates every 60 seconds
  export async function getStaticProps() {
    const products = await getProducts();
    return { props: { products }, revalidate: 60 };
  }

  // SSR — runs on every request
  export async function getServerSideProps(ctx) {
    const user = await getUser(ctx.req);
    return { props: { user } };
  }
  ```
  - Verify: Check response headers — static pages should be served from CDN cache
  - Impact: SSG/ISR pages have 10-50ms TTFB vs 200-1000ms for SSR

- [ ] **[CRITICAL] Use streaming SSR for large pages**
  ```javascript
  // Next.js 13+ (App Router) — streaming by default with Suspense
  export default function Page() {
    return (
      <div>
        <Header /> {/* Sent immediately */}
        <Suspense fallback={<Skeleton />}>
          <SlowDataSection /> {/* Streamed when ready */}
        </Suspense>
        <Suspense fallback={<Skeleton />}>
          <AnotherSlowSection /> {/* Streamed independently */}
        </Suspense>
      </div>
    );
  }

  // React 18 — renderToPipeableStream
  const { pipe } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/client.js'],
    onShellReady() { pipe(response); },
  });
  ```
  - Streaming sends HTML as it becomes available instead of waiting for everything
  - Verify: DevTools > Network > check TTFB vs full response time (TTFB should be much less)
  - Impact: 200-2000ms improvement in FCP for data-heavy pages

- [ ] **[HIGH] Pre-render critical pages at build time**
  ```bash
  # Generate a list of pages to pre-render
  # Next.js
  export async function getStaticPaths() {
    const products = await getTop1000Products();
    return {
      paths: products.map(p => ({ params: { slug: p.slug } })),
      fallback: 'blocking', // SSR for pages not pre-rendered
    };
  }

  # Astro — all pages are static by default
  # Nuxt — npx nuxi generate
  ```
  - Pre-render the top 80% of traffic pages; use fallback SSR for the rest
  - Impact: Eliminates server computation for most page views

---

## Edge Computing

- [ ] **[HIGH] Move SSR to edge functions for global audiences**
  ```javascript
  // Next.js — Edge Runtime
  export const config = { runtime: 'edge' };

  export default function handler(req) {
    return new Response(JSON.stringify({ data: 'fast' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cloudflare Workers
  export default {
    async fetch(request) {
      const html = renderPage(request);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  };
  ```
  - Edge functions run in 200+ locations worldwide vs 1-3 server regions
  - Limitation: No Node.js APIs (file system, native modules) in edge runtime
  - Verify: Check response headers for edge location (e.g., `cf-ray`, `x-vercel-id`)
  - Impact: 50-200ms TTFB improvement for users far from origin server

- [ ] **[MEDIUM] Use edge middleware for fast redirects, auth checks, A/B tests**
  ```javascript
  // Next.js middleware.ts — runs at the edge before SSR
  import { NextResponse } from 'next/server';

  export function middleware(request) {
    // Geo-based redirect (no round-trip to origin)
    if (request.geo?.country === 'DE') {
      return NextResponse.redirect('/de');
    }

    // A/B test (no origin needed)
    const bucket = request.cookies.get('ab-bucket')?.value || (Math.random() > 0.5 ? 'a' : 'b');
    const response = NextResponse.next();
    response.cookies.set('ab-bucket', bucket);
    return response;
  }
  ```
  - Impact: Redirects and auth checks resolve in < 10ms instead of round-trip to origin

---

## Database Optimization

- [ ] **[CRITICAL] Add indexes for frequently queried columns**
  ```sql
  -- Find slow queries (PostgreSQL)
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 20;

  -- Add index for common queries
  CREATE INDEX idx_products_category ON products(category_id);
  CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC);

  -- Composite index for filtered + sorted queries
  CREATE INDEX idx_posts_published ON posts(status, published_at DESC)
  WHERE status = 'published';
  ```
  - Rule: Every column in a WHERE, JOIN, or ORDER BY clause should have an index
  - Verify: `EXPLAIN ANALYZE <your query>` — should show "Index Scan" not "Seq Scan"
  - Impact: 10x-1000x query speed improvement

- [ ] **[CRITICAL] Eliminate N+1 query problems**
  ```javascript
  // BAD — N+1: 1 query for posts + N queries for authors
  const posts = await db.query('SELECT * FROM posts LIMIT 20');
  for (const post of posts) {
    post.author = await db.query('SELECT * FROM users WHERE id = $1', [post.author_id]);
  }

  // GOOD — JOIN: 1 query total
  const posts = await db.query(`
    SELECT posts.*, users.name as author_name
    FROM posts
    JOIN users ON users.id = posts.author_id
    LIMIT 20
  `);

  // GOOD — Batch load: 2 queries total
  const posts = await db.query('SELECT * FROM posts LIMIT 20');
  const authorIds = [...new Set(posts.map(p => p.author_id))];
  const authors = await db.query('SELECT * FROM users WHERE id = ANY($1)', [authorIds]);
  ```
  - Detect: Enable query logging, look for repeated similar queries
  - ORM-specific:
    - Prisma: Use `include` for eager loading
    - Django: Use `select_related()` / `prefetch_related()`
    - Rails: Use `includes()` / `eager_load()`
  - Impact: Reduces 20+ queries to 1-2, saving 100-500ms

- [ ] **[HIGH] Implement database query result caching**
  ```javascript
  // Redis caching layer
  async function getProducts(categoryId) {
    const cacheKey = `products:${categoryId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const products = await db.query(
      'SELECT * FROM products WHERE category_id = $1', [categoryId]
    );
    await redis.setex(cacheKey, 300, JSON.stringify(products)); // 5 min TTL
    return products;
  }

  // Invalidate on write
  async function updateProduct(id, data) {
    await db.query('UPDATE products SET ... WHERE id = $1', [id]);
    const product = await db.query('SELECT category_id FROM products WHERE id = $1', [id]);
    await redis.del(`products:${product.category_id}`);
  }
  ```
  - Cache: Frequently read, infrequently written data
  - Do not cache: User-specific or rapidly changing data (unless TTL is very short)
  - Impact: 1-50ms cache read vs 10-500ms database query

- [ ] **[HIGH] Use connection pooling**
  ```javascript
  // Node.js with pg (PostgreSQL)
  const pool = new Pool({
    max: 20,              // Max concurrent connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Prisma — configure in schema.prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
    // Connection pool size = (CPU cores * 2) + 1
  }
  ```
  - Without pooling: Each request creates a new TCP + TLS connection (50-200ms)
  - With pooling: Connections are reused (< 1ms)
  - Impact: 50-200ms saved per database query

- [ ] **[MEDIUM] Paginate large result sets**
  ```javascript
  // Cursor-based pagination (preferred for large datasets)
  const products = await db.query(`
    SELECT * FROM products
    WHERE id > $1
    ORDER BY id
    LIMIT 20
  `, [lastSeenId]);

  // Offset pagination (simpler but slower for deep pages)
  const products = await db.query(`
    SELECT * FROM products
    ORDER BY id
    LIMIT 20 OFFSET $1
  `, [page * 20]);
  ```
  - Never `SELECT *` without a LIMIT
  - Cursor-based is O(1) for any page; offset is O(n) for deep pages
  - Impact: Prevents timeouts on large tables

---

## API Response Optimization

- [ ] **[CRITICAL] Set a response time budget for APIs**
  | API Type | Target Response Time |
  |----------|---------------------|
  | Page data (SSR) | < 200ms |
  | Search / autocomplete | < 100ms |
  | CRUD operations | < 300ms |
  | Report generation | < 2000ms (with streaming) |
  | File upload | Depends on size |

  - Measure: Add response timing middleware
  ```javascript
  // Express middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 200) {
        console.warn(`Slow API: ${req.method} ${req.path} took ${duration}ms`);
      }
    });
    next();
  });
  ```
  - Impact: Identifies slow endpoints before users notice

- [ ] **[HIGH] Return only the data the client needs**
  ```javascript
  // BAD — returns entire user object (50+ fields)
  app.get('/api/user/:id', async (req, res) => {
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    res.json(user);
  });

  // GOOD — return only needed fields
  app.get('/api/user/:id', async (req, res) => {
    const user = await db.query(
      'SELECT id, name, avatar_url FROM users WHERE id = $1',
      [req.params.id]
    );
    res.json(user);
  });

  // Consider GraphQL for complex data requirements
  ```
  - Impact: Reduces response size by 50-90% for over-fetched APIs

- [ ] **[HIGH] Implement API response compression**
  ```javascript
  // Express
  const compression = require('compression');
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses > 1KB
  }));
  ```
  - Impact: 60-80% reduction in API response transfer size

- [ ] **[MEDIUM] Use HTTP 304 for conditional API responses**
  ```javascript
  // Express — ETag-based conditional responses
  app.get('/api/products', async (req, res) => {
    const products = await getProducts();
    const etag = generateETag(products);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.set('ETag', etag);
    res.json(products);
  });
  ```
  - Impact: Eliminates redundant data transfer on polling/refresh

- [ ] **[MEDIUM] Parallelize independent data fetching**
  ```javascript
  // BAD — sequential: total time = sum of all queries
  const user = await getUser(id);
  const posts = await getPosts(id);
  const notifications = await getNotifications(id);

  // GOOD — parallel: total time = max of all queries
  const [user, posts, notifications] = await Promise.all([
    getUser(id),
    getPosts(id),
    getNotifications(id),
  ]);
  ```
  - Impact: 2-5x faster for pages with multiple independent data sources

---

## Server Configuration

- [ ] **[HIGH] Enable HTTP keep-alive**
  ```nginx
  # Nginx
  keepalive_timeout 65;
  keepalive_requests 1000;

  # Upstream keep-alive (for reverse proxy to app server)
  upstream app {
    server 127.0.0.1:3000;
    keepalive 32;
  }
  ```
  - Reuses TCP connections instead of establishing new ones per request
  - Impact: 50-100ms saved per request after the first

- [ ] **[HIGH] Set appropriate timeouts**
  ```nginx
  # Nginx
  proxy_connect_timeout 5s;     # Time to connect to upstream
  proxy_read_timeout 30s;       # Time to wait for response
  proxy_send_timeout 10s;       # Time to send request to upstream
  client_body_timeout 10s;      # Time to receive request body

  # Node.js
  server.setTimeout(30000);     # 30 seconds
  server.keepAliveTimeout = 65000; # Must be > Nginx keepalive_timeout
  ```
  - Impact: Prevents hung connections from consuming server resources

- [ ] **[MEDIUM] Configure worker processes appropriately**
  ```nginx
  # Nginx
  worker_processes auto;  # One per CPU core
  worker_connections 1024;

  # Node.js — use cluster module
  const cluster = require('cluster');
  const numCPUs = require('os').cpus().length;

  if (cluster.isPrimary) {
    for (let i = 0; i < numCPUs; i++) cluster.fork();
  } else {
    startServer();
  }

  # PM2
  pm2 start app.js -i max  # One instance per CPU core
  ```
  - Impact: Utilizes all CPU cores, handles more concurrent requests

- [ ] **[MEDIUM] Implement graceful degradation and circuit breakers**
  ```javascript
  // Simple circuit breaker
  class CircuitBreaker {
    constructor(fn, { threshold = 5, timeout = 30000 } = {}) {
      this.fn = fn;
      this.failures = 0;
      this.threshold = threshold;
      this.timeout = timeout;
      this.state = 'CLOSED'; // CLOSED (normal), OPEN (failing), HALF-OPEN (testing)
      this.nextAttempt = 0;
    }

    async call(...args) {
      if (this.state === 'OPEN') {
        if (Date.now() < this.nextAttempt) {
          throw new Error('Circuit breaker is OPEN');
        }
        this.state = 'HALF-OPEN';
      }

      try {
        const result = await this.fn(...args);
        this.failures = 0;
        this.state = 'CLOSED';
        return result;
      } catch (err) {
        this.failures++;
        if (this.failures >= this.threshold) {
          this.state = 'OPEN';
          this.nextAttempt = Date.now() + this.timeout;
        }
        throw err;
      }
    }
  }
  ```
  - Prevents cascading failures when a dependency is down
  - Impact: Faster failure responses, prevents server overload

---

## Monitoring

- [ ] **[HIGH] Set up server-side performance monitoring**
  ```javascript
  // Simple response time tracking
  const histogram = {};

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const route = req.route?.path || req.path;
      if (!histogram[route]) histogram[route] = [];
      histogram[route].push(ms);
    });
    next();
  });

  // Log p50/p95/p99 every minute
  setInterval(() => {
    for (const [route, times] of Object.entries(histogram)) {
      times.sort((a, b) => a - b);
      console.log(`${route}: p50=${times[Math.floor(times.length * 0.5)]}ms p95=${times[Math.floor(times.length * 0.95)]}ms`);
    }
  }, 60000);
  ```
  - Tools: Datadog, New Relic, Grafana, or the simple approach above
  - Impact: Identifies slow endpoints and regressions

- [ ] **[MEDIUM] Monitor error rates and set alerts**
  - Target: < 0.1% 5xx error rate
  - Alert thresholds: > 1% 5xx for 5 minutes = page on-call
  - Track: Response time p95, error rate, request rate, CPU/memory usage
  - Impact: Catches performance regressions before users report them

---

## Audit Commands

```bash
# Measure TTFB from multiple locations
npx autocannon -c 10 -d 10 https://your-api.com/endpoint

# Check server response headers
curl -sI https://your-site.com | grep -i -E "server|x-powered-by|x-cache"

# Remove x-powered-by header (security + tiny perf gain)
# Express: app.disable('x-powered-by');

# Load test your API
npx autocannon -c 100 -d 30 -p 10 https://your-api.com/endpoint
# -c: connections, -d: duration (seconds), -p: pipelining

# Check database slow queries (PostgreSQL)
psql -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Monitor Node.js event loop lag
node -e "
  setInterval(() => {
    const start = Date.now();
    setImmediate(() => console.log('Event loop lag:', Date.now() - start, 'ms'));
  }, 1000);
"
```
