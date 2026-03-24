# Backend Interview Vault

> 55 real-world backend questions across REST APIs, Node.js, Databases, Auth/Security, and System Design. Each answer is written to actually teach — not just list buzzwords.

---

## REST APIs & HTTP

### 1. What do HTTP status codes mean, and which ones matter most in APIs? `[Junior]`

**Answer:**
- **1xx Informational** — rarely used directly in APIs; `100 Continue` tells client to proceed with request body
- **2xx Success** — `200 OK` (general success), `201 Created` (resource created, include `Location` header), `204 No Content` (DELETE success, no body)
- **3xx Redirection** — `301 Moved Permanently` (update bookmarks), `302 Found` (temporary redirect), `304 Not Modified` (client cache is fresh, skip body)
- **4xx Client Error** — `400 Bad Request` (malformed input), `401 Unauthorized` (missing/invalid auth), `403 Forbidden` (authenticated but not allowed), `404 Not Found`, `409 Conflict` (duplicate resource), `422 Unprocessable Entity` (validation failed), `429 Too Many Requests`
- **5xx Server Error** — `500 Internal Server Error` (generic crash), `502 Bad Gateway` (upstream failure), `503 Service Unavailable` (overloaded/maintenance), `504 Gateway Timeout`
- A common mistake: returning `200` with `{ "error": "not found" }` in the body — this breaks clients and monitoring tools that rely on status codes

**Key points:** Know the difference between 401 vs 403, and 400 vs 422. Never return 200 for errors.

**Follow-up:** When would you use 202 instead of 200? → `202 Accepted` means the request was received and queued for async processing — the work hasn't completed yet. Include a polling URL or webhook callback in the response.

---

### 2. What are the HTTP methods and when should each be used? `[Junior]`

**Answer:**
- **GET** — retrieve a resource; must be safe (no side effects) and idempotent; no request body
- **POST** — create a resource or trigger an action; not idempotent (two identical POSTs may create two records)
- **PUT** — full replacement of a resource; idempotent — `PUT /users/1` twice produces same result; client sends complete representation
- **PATCH** — partial update; only send the fields that change (`{ "email": "new@example.com" }`)
- **DELETE** — remove a resource; idempotent (deleting a deleted resource still results in it being gone)
- **HEAD** — same as GET but server only returns headers; useful for checking if a resource exists or cache freshness without downloading the body
- **OPTIONS** — describes what methods are allowed; browsers send this as a CORS preflight

**Key points:** PUT vs PATCH is a common interview trap. PUT replaces entirely; PATCH merges. Idempotency matters for retry logic.

**Follow-up:** Can a GET request have a body? → Technically yes in HTTP/1.1, but it's strongly discouraged. Proxies and caches may strip it. Use query parameters instead.

---

### 3. Explain the core REST constraints and what makes an API truly RESTful. `[Mid]`

**Answer:**
- **Uniform Interface** — resources identified by URIs, manipulation through representations, self-descriptive messages, HATEOAS (hypermedia links in responses)
- **Stateless** — each request contains all information needed; no server-side session between requests; enables horizontal scaling
- **Client-Server separation** — UI concerns separated from data storage concerns; they evolve independently
- **Cacheable** — responses must declare themselves cacheable or not via headers (`Cache-Control`, `ETag`); reduces load
- **Layered System** — client can't tell if it's connected directly to the server or through a proxy/CDN/load balancer
- **Code on Demand (optional)** — server can send executable code (e.g., JavaScript) to client
- Most "REST APIs" are actually just HTTP+JSON APIs — true REST requires HATEOAS, which almost no one implements
- Practical REST: use nouns for resources (`/users`, not `/getUsers`), plural collections, HTTP methods for actions

**Key points:** Statelessness is the constraint that most directly enables scalability. HATEOAS is the most commonly skipped constraint.

**Follow-up:** What's the difference between REST and RPC? → REST is resource-centric (`POST /orders`); RPC is action-centric (`POST /createOrder`). gRPC and tRPC are popular RPC frameworks. Neither is universally better — RPC can be cleaner for complex operations.

---

### 4. How do you version a REST API? What are the trade-offs of each approach? `[Mid]`

**Answer:**
- **URI versioning** (`/api/v1/users`) — most common, explicit, easy to route in proxies, but "pollutes" the URL and violates the REST constraint that a URI identifies a resource (not a version of it)
- **Header versioning** (`Accept: application/vnd.myapi.v2+json`) — clean URLs, truly RESTful, but harder to test in a browser and less obvious to developers
- **Query parameter** (`/users?version=2`) — easy to implement and override, but caching becomes tricky (must include version in cache key)
- **Subdomain** (`v2.api.example.com`) — clean separation, easy to route, but DNS/SSL overhead and hard to manage many versions
- Trade-offs: URI versioning wins on developer experience and tooling support; header versioning wins on purity; both require maintaining multiple versions simultaneously
- Strategy: deprecate old versions with a `Sunset` header (`Sunset: Sat, 31 Dec 2026 23:59:59 GMT`), communicate timelines, log usage by version to know when it's safe to remove

**Key points:** No universally correct answer — pick one and be consistent. URI versioning is most pragmatic for public APIs.

**Follow-up:** How long should you support an old API version? → Typically 6–12 months after announcing deprecation, longer for enterprise clients. Monitor actual traffic to old versions before pulling the plug.

---

### 5. How does rate limiting work, and how would you implement it? `[Mid]`

**Answer:**
- Rate limiting caps how many requests a client can make in a time window to prevent abuse, ensure fairness, and protect backend resources
- **Fixed Window** — count requests per minute, reset at minute boundary; simple but vulnerable to burst at boundary (e.g., 100 at :59 and 100 at :01)
- **Sliding Window Log** — store timestamp of each request; count those within last N seconds; accurate but memory-intensive
- **Sliding Window Counter** — blend two fixed windows using weighted average; good balance of accuracy and efficiency
- **Token Bucket** — tokens added at fixed rate, consumed per request; allows bursts up to bucket size; most flexible
- **Leaky Bucket** — requests processed at fixed output rate; smooths bursts but adds latency
- Implementation with Redis:
  ```js
  // Token bucket with Redis
  const key = `rate:${userId}`;
  const now = Date.now();
  const WINDOW = 60000; // 1 minute
  const LIMIT = 100;

  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > LIMIT) {
    res.set('Retry-After', '60');
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  ```
- Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers so clients can self-throttle

**Key points:** Rate limit by API key or user ID, not IP (IPs can be shared via NAT). Use Redis for distributed rate limiting across multiple servers.

**Follow-up:** How do you handle rate limiting in a microservices architecture? → Use an API gateway (Kong, AWS API Gateway, nginx) to centralize rate limiting rather than implementing it in every service. Share state via Redis.

---

### 6. Explain HTTP caching headers and how they work together. `[Mid]`

**Answer:**
- **`Cache-Control`** — the primary directive; common values:
  - `max-age=3600` — cache for 3600 seconds
  - `no-cache` — must revalidate with server before using cached response (not the same as "don't cache")
  - `no-store` — never cache (sensitive data)
  - `public` — any cache (CDN, browser) can store it
  - `private` — only browser can cache (user-specific data)
  - `s-maxage=3600` — CDN-specific max age, overrides `max-age` for shared caches
- **`ETag`** — a fingerprint of the response body (usually a hash). Client sends `If-None-Match: "abc123"` on next request; server returns `304 Not Modified` if unchanged — saves bandwidth
- **`Last-Modified`** / **`If-Modified-Since`** — time-based equivalent of ETag; less precise (1-second granularity)
- **`Vary`** — tells caches which request headers change the response (`Vary: Accept-Encoding, Authorization`); crucial for content negotiation
- **`Expires`** — legacy header, absolute date; `Cache-Control: max-age` overrides it
- Flow: browser checks cache → if stale, sends conditional request → server either returns `304` (free!) or `200` with fresh data

**Key points:** `no-cache` does NOT mean "don't cache". ETags enable efficient revalidation. Always set `Cache-Control` explicitly on API responses.

**Follow-up:** How would you bust a CDN cache after a deployment? → Use versioned URLs (`/assets/app.v3.js`), or call the CDN's purge API, or use cache tags (Fastly/Cloudflare support tag-based purging).

---

### 7. How does CORS work and why does it exist? `[Junior]`

**Answer:**
- CORS (Cross-Origin Resource Sharing) is a browser security mechanism — servers cannot opt out of it; it's enforced by browsers, not servers
- **Same-origin policy**: browsers block JS from reading responses from a different origin (protocol + domain + port)
- CORS allows servers to declare which origins are allowed to read their responses
- **Simple requests** (GET/POST with simple headers) — browser attaches `Origin` header, server responds with `Access-Control-Allow-Origin`; if it matches, browser allows JS to read the response
- **Preflight requests** — for non-simple requests (PUT, DELETE, custom headers, JSON body), browser sends `OPTIONS` first:
  ```
  OPTIONS /api/data
  Origin: https://app.example.com
  Access-Control-Request-Method: DELETE
  Access-Control-Request-Headers: Content-Type, Authorization
  ```
  Server must respond with:
  ```
  Access-Control-Allow-Origin: https://app.example.com
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  Access-Control-Allow-Headers: Content-Type, Authorization
  Access-Control-Max-Age: 86400
  ```
- `Access-Control-Allow-Origin: *` cannot be combined with `Access-Control-Allow-Credentials: true` — you must specify exact origin for credentialed requests
- CORS does NOT protect server-to-server requests — it's purely a browser mechanism

**Key points:** CORS is enforced by browsers to protect users, not to protect APIs. Servers can still be called directly by curl or Postman regardless of CORS headers.

**Follow-up:** Why should you avoid `Access-Control-Allow-Origin: *` for authenticated APIs? → With wildcard, any website can make requests to your API from a user's browser — if they're logged in, their cookies/tokens go along. Whitelist specific origins instead.

---

### 8. What is idempotency and why does it matter for API design? `[Mid]`

**Answer:**
- An operation is idempotent if performing it multiple times produces the same result as performing it once
- HTTP method idempotency: GET ✓, HEAD ✓, PUT ✓, DELETE ✓, POST ✗, PATCH ✗ (usually)
- Why it matters: networks are unreliable; clients retry failed requests; if the operation isn't idempotent, retries cause duplicate charges, double-orders, etc.
- **Idempotency keys**: for non-idempotent operations (like `POST /payments`), accept a client-generated unique key:
  ```
  POST /payments
  Idempotency-Key: uuid-abc-123
  { "amount": 100, "currency": "USD" }
  ```
  Server stores key → result mapping. If same key arrives again, return the cached result without re-processing. Stripe uses this pattern.
- Implementation:
  ```js
  async function createPayment(req, res) {
    const key = req.headers['idempotency-key'];
    if (key) {
      const cached = await redis.get(`idempotency:${key}`);
      if (cached) return res.json(JSON.parse(cached));
    }
    const result = await processPayment(req.body);
    if (key) await redis.setex(`idempotency:${key}`, 86400, JSON.stringify(result));
    res.json(result);
  }
  ```

**Key points:** Idempotency keys are essential for payment APIs, order creation, and any mutation where retries are likely. Store keys with TTL to eventually reclaim memory.

**Follow-up:** Is DELETE truly idempotent? → The state is idempotent (resource is gone after first or fifth call), but the response may differ (404 on repeat calls). By REST convention this is still considered idempotent because the server state is consistent.

---

### 9. What pagination strategies exist for REST APIs? `[Mid]`

**Answer:**
- **Offset/Limit** (`?limit=20&offset=40`) — simple, supports random access, easy to implement with SQL `LIMIT/OFFSET`; problems: items shift if data changes between pages (user sees duplicate or skips item), slow on large offsets (DB scans all preceding rows)
- **Cursor-based / Keyset pagination** — encode the last seen record's unique field as an opaque cursor:
  ```
  GET /posts?limit=20&cursor=eyJpZCI6MTAwfQ==
  ```
  Server decodes cursor → `WHERE id > 100 ORDER BY id LIMIT 20`; fast (uses index), stable (inserts/deletes don't shift pages), but no random access and cursor expires
- **Page number** (`?page=3&per_page=20`) — user-friendly for display, same performance issues as offset
- **Time-based** (`?after=2024-01-15T10:00:00Z`) — natural for activity feeds; requires indexed timestamp column; duplicate timestamps can cause issues
- Response envelope best practice:
  ```json
  {
    "data": [],
    "pagination": {
      "next_cursor": "eyJpZCI6MTIwfQ==",
      "has_more": true,
      "total": 1500
    }
  }
  ```
- Avoid returning `total` count from cursor pagination — it requires an extra COUNT query and is often inaccurate by the time the client reads it

**Key points:** Cursor pagination is the correct choice for large datasets and real-time data. Offset pagination is fine for small, stable datasets.

**Follow-up:** How would you handle deep pagination in Elasticsearch? → Elasticsearch has a `max_result_window` limit (default 10,000). Use `search_after` (cursor-based) for deep pagination, or `scroll` API for full exports.

---

### 10. What are webhooks and how do you make them reliable? `[Mid]`

**Answer:**
- Webhooks are HTTP callbacks — instead of clients polling for updates, your server POSTs to a client-provided URL when an event occurs
- Flow: client registers a URL → event happens → you POST JSON payload to that URL → client responds 200 → you mark delivery successful
- **Reliability challenges and solutions:**
  - **Delivery failure**: retry with exponential backoff (1s → 2s → 4s → ... → 24h), typically for 24–72 hours
  - **Ordering**: don't guarantee order; clients must handle out-of-order delivery using event timestamps
  - **Duplicate delivery**: always retry on non-2xx responses, so clients must be idempotent; include event ID so clients can deduplicate
  - **Security**: sign the payload with HMAC-SHA256 using a shared secret; client verifies signature before processing:
    ```js
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    // Send as header: X-Webhook-Signature: sha256=<signature>
    ```
  - **Timeouts**: client must respond within ~30s; for slow processing, respond 200 immediately and process async
- **Queue-backed delivery**: instead of sending synchronously, push to a message queue (SQS, RabbitMQ) and have workers deliver — this decouples event production from delivery

**Key points:** Treat webhook delivery as an async, at-least-once system. Always sign payloads. Always retry with backoff. Document your retry schedule for clients.

**Follow-up:** How would you let clients test their webhook endpoint? → Provide a "resend" feature in the dashboard to replay past events, and a test event button that sends a sample payload. Log all delivery attempts with request/response for debugging.

---

## Node.js & Runtime

### 11. Explain the Node.js event loop in plain terms. `[Junior]`

**Answer:**
- Node.js is single-threaded but handles thousands of concurrent connections through an event loop — it never blocks waiting for I/O; it registers a callback and moves on
- **Event loop phases** (simplified, runs in order):
  1. **Timers** — execute `setTimeout` and `setInterval` callbacks whose delay has expired
  2. **Pending callbacks** — I/O callbacks deferred from previous iteration
  3. **Idle/Prepare** — internal use
  4. **Poll** — retrieve new I/O events; execute I/O callbacks; if none, wait here for incoming events
  5. **Check** — execute `setImmediate` callbacks
  6. **Close callbacks** — e.g., `socket.on('close', ...)`
- Between each phase, Node drains `process.nextTick` queue and microtask (Promise) queue
- Priority order within a tick: `process.nextTick` > Promise microtasks > `setImmediate` > `setTimeout`
- CPU-intensive work (encryption, image processing) blocks the event loop — this is why you offload to `worker_threads` or child processes

**Key points:** The event loop is why Node can be non-blocking with a single thread. Blocking the event loop (e.g., with a synchronous for loop over 10M items) freezes ALL requests.

**Follow-up:** What is the difference between `process.nextTick` and `setImmediate`? → `nextTick` fires before the next event loop phase (even before I/O callbacks this tick); `setImmediate` fires in the check phase after I/O. Use `setImmediate` for deferred non-urgent work; use `nextTick` carefully — you can starve the event loop if it recurses.

---

### 12. How does async/await work under the hood? `[Junior]`

**Answer:**
- `async/await` is syntactic sugar over Promises, which are built on callbacks
- An `async` function always returns a Promise — even `async function f() { return 1 }` returns `Promise.resolve(1)`
- `await` pauses execution of the async function and yields control back to the event loop; other code can run while waiting; execution resumes when the Promise resolves
- Under the hood, the transpiled code uses a state machine (generators + Promise chaining):
  ```js
  // This:
  async function fetchUser(id) {
    const user = await db.find(id);
    return user.name;
  }
  // Is roughly:
  function fetchUser(id) {
    return db.find(id).then(user => user.name);
  }
  ```
- Common mistake — making sequential what could be parallel:
  ```js
  // SLOW — sequential, total time = A + B
  const a = await fetchA();
  const b = await fetchB();

  // FAST — parallel, total time = max(A, B)
  const [a, b] = await Promise.all([fetchA(), fetchB()]);
  ```
- Unhandled Promise rejections crash Node.js (since v15) — always handle errors in async code

**Key points:** `await` doesn't block the thread — it just suspends the current async function. Use `Promise.all` for independent async operations.

**Follow-up:** What's the difference between `Promise.all` and `Promise.allSettled`? → `Promise.all` rejects immediately if any Promise rejects; `Promise.allSettled` waits for all Promises to complete (resolved or rejected) and returns an array of results with status. Use `allSettled` when you want partial results despite some failures.

---

### 13. What are Node.js streams and when should you use them? `[Mid]`

**Answer:**
- Streams process data in chunks rather than loading everything into memory — essential for large files, network data, and real-time processing
- **Four types:**
  - **Readable** — source of data (`fs.createReadStream`, `http.IncomingMessage`)
  - **Writable** — destination (`fs.createWriteStream`, `http.ServerResponse`)
  - **Duplex** — both readable and writable (`net.Socket`)
  - **Transform** — duplex that modifies data (`zlib.createGzip`, `crypto.createCipheriv`)
- Pipe streams together to create pipelines:
  ```js
  const { pipeline } = require('stream/promises');
  const fs = require('fs');
  const zlib = require('zlib');

  // Process 10GB file with constant ~50MB memory usage
  await pipeline(
    fs.createReadStream('large-file.csv'),
    zlib.createGzip(),
    fs.createWriteStream('large-file.csv.gz')
  );
  ```
- Use `pipeline` (not `.pipe()`) because it handles error propagation and cleanup automatically
- **Backpressure**: when a writable stream can't keep up, it signals the readable to pause — Node handles this automatically with `pipeline`
- Use streams for: file uploads/downloads, CSV/JSON imports, log processing, video streaming, HTTP response streaming

**Key points:** Streams solve the memory problem for large data. Always use `pipeline` for error handling. Without backpressure handling, you get buffer overflow and crashes.

**Follow-up:** How would you stream a large database result set in an HTTP response? → Use `cursor` from your DB driver (Mongoose `.cursor()`, Knex streams, Postgres `pg-query-stream`) piped through a Transform that serializes to JSON, piped to `res`. Never do `SELECT *` into memory and then send.

---

### 14. How does Node.js clustering work, and when should you use it? `[Mid]`

**Answer:**
- Node.js is single-threaded — one process only uses one CPU core. On an 8-core machine, 7 cores sit idle by default
- The `cluster` module lets you fork multiple worker processes that share the same port:
  ```js
  const cluster = require('cluster');
  const os = require('os');

  if (cluster.isPrimary) {
    const numCPUs = os.cpus().length;
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', (worker) => {
      console.log(`Worker ${worker.process.pid} died, restarting...`);
      cluster.fork(); // Auto-restart
    });
  } else {
    require('./server'); // Each worker runs the same server
  }
  ```
- The primary process distributes incoming connections to workers using round-robin (default on most OS)
- **PM2** is the production-grade way to do this: `pm2 start server.js -i max` forks one process per CPU automatically and handles restarts
- **When NOT to use clustering**: if your app is I/O-bound (DB queries, API calls), a single Node process can handle thousands of concurrent connections through the event loop — clustering only helps for CPU-bound workloads
- Alternative for CPU work: `worker_threads` for parallelism within a single process (shared memory, no IPC overhead)

**Key points:** Cluster for CPU-bound work on multi-core machines. PM2 makes cluster management production-ready. Worker threads for in-process parallelism.

**Follow-up:** What's the difference between cluster workers and worker_threads? → Cluster creates separate processes (separate memory, communicate via IPC messages); `worker_threads` creates threads within one process (can share memory via `SharedArrayBuffer`, lower overhead but more complex).

---

### 15. How do you manage memory leaks in Node.js? `[Senior]`

**Answer:**
- Common sources of memory leaks in Node.js:
  - **Event emitters with forgotten listeners**: `EventEmitter.setMaxListeners` warning at 11+ listeners is a sign
  - **Global variables accumulating data**: accidental global assignment (`x = {}` without `let/const`)
  - **Closures holding large data**: a long-lived function holds reference to a large scope variable
  - **Unbounded caches**: in-memory maps that grow forever; add TTL eviction or use `WeakMap` for object keys
  - **Promise chains never resolving**: hanging Promises keep their entire closure chain in memory
  - **Timer/interval callbacks not cleared**: `setInterval` keeps references alive
- Detection tools:
  - `--inspect` flag + Chrome DevTools heap snapshots
  - `node --max-old-space-size=512 app.js` to cap memory and trigger OOM early in testing
  - `process.memoryUsage()` for runtime metrics
  - Clinic.js (`npx clinic heapProfiler`) for production-safe profiling
  - Take two heap snapshots before and after a suspected leak; diff them to find objects that grew
- Fix patterns:
  ```js
  // Bad: listener accumulates on each request
  app.get('/data', (req, res) => {
    emitter.on('done', () => res.json(data)); // never removed!
  });
  // Good: use once()
  emitter.once('done', () => res.json(data));

  // Bad: unbounded cache
  const cache = new Map();
  function get(key) { cache.set(key, fetch(key)); }
  // Good: LRU cache with size limit (use 'lru-cache' package)
  const cache = new LRU({ max: 500, ttl: 1000 * 60 * 5 });
  ```

**Key points:** Memory leaks in Node are usually event listeners, closures, or unbounded caches. Heap snapshots are the primary diagnostic tool.

**Follow-up:** How do you detect a memory leak in production without downtime? → Run `node --inspect=0.0.0.0:9229` and use Chrome remote debugging, or use clinic.js in a staging environment that mirrors production traffic. Monitor `process.memoryUsage().heapUsed` over time with your APM tool (Datadog, New Relic).

---

### 16. How does error handling work in Express, and what are the best practices? `[Junior]`

**Answer:**
- Express has a special 4-parameter error handler: `(err, req, res, next)` — must be defined LAST after all routes
  ```js
  // Centralized error handler
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log with context
    logger.error({ err, method: req.method, url: req.url, status });

    // Don't leak stack traces to client in production
    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });
  ```
- For async route handlers, errors must be caught and passed to `next`:
  ```js
  // Bad: uncaught async error crashes the process
  app.get('/users/:id', async (req, res) => {
    const user = await db.findById(req.params.id); // throws!
    res.json(user);
  });

  // Good: wrap with try/catch and next(err)
  app.get('/users/:id', async (req, res, next) => {
    try {
      const user = await db.findById(req.params.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  });

  // Better: use a wrapper utility
  const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  app.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await db.findById(req.params.id);
    res.json(user);
  }));
  ```
- Create custom error classes for semantic errors:
  ```js
  class AppError extends Error {
    constructor(message, status = 500) {
      super(message);
      this.status = status;
    }
  }
  throw new AppError('User not found', 404);
  ```

**Key points:** Always have a centralized error handler. Never let async errors go unhandled. Use `next(err)` consistently.

**Follow-up:** What happens if you call `next()` inside an error handler? → It passes to the next error handler (if any) or Express's built-in error handler which sends a 500 with an HTML page — not ideal for APIs. Always send a response or call `next(err)` with a new error.

---

### 17. How does Express middleware work, and in what order does it execute? `[Junior]`

**Answer:**
- Middleware is a function with signature `(req, res, next)` — it can read/modify `req`/`res` and either end the request or call `next()` to pass to the next middleware
- Middleware executes in the **order it's defined** — this is critical
  ```js
  // Correct order for typical Express app
  app.use(helmet());          // 1. Security headers (first!)
  app.use(cors());            // 2. CORS
  app.use(express.json());    // 3. Body parsing
  app.use(morgan('combined'));// 4. Logging
  app.use(authMiddleware);    // 5. Auth
  app.use('/api', router);    // 6. Routes
  app.use(errorHandler);      // 7. Error handler (last!)
  ```
- **Route-specific middleware** — only runs for matching routes:
  ```js
  router.get('/admin', requireAdmin, (req, res) => { ... });
  ```
- Middleware that doesn't call `next()` or `res.send()` will hang the request forever
- `next('route')` skips to the next route handler (bypassing remaining middleware for current route)
- `next(new Error(...))` jumps directly to error handling middleware

**Key points:** Order matters enormously. Body parser must come before any middleware that reads `req.body`. Auth middleware must come before protected routes.

**Follow-up:** How would you add middleware only to a specific set of routes without using a router? → Provide it as an argument directly: `app.use('/api', authMiddleware, apiRouter)` — authMiddleware only runs for routes under `/api`.

---

### 18. What are common Node.js performance pitfalls and how do you fix them? `[Senior]`

**Answer:**
- **Blocking the event loop** — synchronous CPU-intensive operations (crypto, JSON parsing of huge objects, regex catastrophic backtracking) freeze all requests. Fix: use `worker_threads`, chunk work with `setImmediate`, or use async crypto APIs (`crypto.pbkdf2` not `pbkdf2Sync`)
- **N+1 queries in loops** — calling `await db.findUser(id)` inside a `for` loop makes one DB call per iteration. Fix: batch with `WHERE id IN (...)` or use dataloader pattern
- **Not reusing HTTP connections** — creating new HTTP clients per request doesn't reuse keep-alive connections. Fix: create one `http.Agent` or Axios instance with connection pool settings
- **JSON.parse/stringify on huge objects** — synchronous and blocks event loop. Fix: stream JSON parsing with `stream-json` library; avoid returning unbounded collections
- **Missing indexes** — slow queries that appear fine in dev with 100 rows destroy production with 10M rows. Fix: query profiling (`EXPLAIN ANALYZE`), add indexes, monitor slow query log
- **Memory leak from not destroying streams** — if a stream is abandoned (client disconnects), it keeps reading. Fix: listen for `req.on('close')` and destroy the stream
- **Starting too many concurrent async operations** — `await Promise.all(thousandsOfPromises)` can open thousands of DB connections. Fix: use `p-limit` to cap concurrency:
  ```js
  const pLimit = require('p-limit');
  const limit = pLimit(10); // max 10 concurrent
  const results = await Promise.all(items.map(item => limit(() => processItem(item))));
  ```

**Key points:** Profile before optimizing. The biggest wins are usually query optimization and avoiding event loop blocking.

**Follow-up:** How do you profile a slow Node.js application in production? → Use `--prof` flag to generate a V8 tick profiler log (process with `--prof-process`), or use `0x` for flamegraphs. In production, use APM tools (Datadog, New Relic) which instrument automatically without restart.

---

### 19. How does process.env work, and what are best practices for configuration management? `[Junior]`

**Answer:**
- `process.env` is a plain JS object populated from the OS environment — strings only (no types)
- Local development: use `.env` file with `dotenv` library (`require('dotenv').config()` at app entry point)
- **Never commit `.env` files** — add to `.gitignore`; commit `.env.example` with placeholder values
- Production: inject via deployment platform (AWS Secrets Manager, Kubernetes secrets, Railway/Render env vars, Docker `--env-file`)
- Parse and validate at startup — fail fast with clear errors rather than crashing at runtime:
  ```js
  const { z } = require('zod');

  const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    PORT: z.coerce.number().default(3000),
    REDIS_URL: z.string().url().optional(),
  });

  const env = EnvSchema.parse(process.env);
  module.exports = env; // Import this object, never process.env directly
  ```
- Secrets management: store truly sensitive values (DB passwords, API keys) in a secrets manager — not even encrypted env vars in source control
- `NODE_ENV` controls behavior: test, development, production — but don't gate on it for business logic, only for tooling

**Key points:** Validate env vars at startup. Create a typed config module. Never log `process.env` — it will expose secrets.

**Follow-up:** How do you handle different configurations for multiple environments (dev/staging/prod)? → Use environment-specific env var injection at deploy time (CI/CD injects staging values for staging deploys). Avoid per-environment config files checked into source control — they diverge and leak secrets.

---

### 20. What is libuv and what role does it play in Node.js? `[Senior]`

**Answer:**
- libuv is a C library that provides the event loop, async I/O, and thread pool for Node.js — it's the engine beneath the event loop
- **Thread pool**: libuv maintains a thread pool (default 4 threads, configurable with `UV_THREADPOOL_SIZE`) for operations that don't have native async OS support: file system ops (`fs.readFile`), DNS lookups (`dns.lookup`), some crypto operations
  - While these "appear async" in Node, they're actually blocking calls on threads in libuv's thread pool
  - On a busy server with 4 DNS lookups queued, the 5th blocks until a thread frees up
  - Fix: `UV_THREADPOOL_SIZE=16` or use `dns.resolve` (uses OS async DNS) instead of `dns.lookup`
- **Event loop implementation**: libuv implements the actual event loop with its phases (timers, I/O, check, etc.) — Node.js sits on top of it
- **Cross-platform async I/O**: libuv uses `epoll` (Linux), `kqueue` (macOS), `IOCP` (Windows) under the hood — Node.js doesn't care, libuv handles the OS differences
- Network I/O (TCP, UDP) goes through the OS async path (not thread pool) — this is why thousands of HTTP connections work without thousands of threads
- Monitoring thread pool saturation: if `UV_THREADPOOL_SIZE` is too small, your file I/O and DNS will queue up silently; use clinic.js to detect this

**Key points:** libuv's thread pool is the hidden bottleneck for file operations and DNS. Network I/O bypasses the thread pool (uses OS async). Tune `UV_THREADPOOL_SIZE` for file-heavy apps.

**Follow-up:** Why is `dns.lookup` slower than `dns.resolve` in some scenarios? → `dns.lookup` uses the OS resolver (getaddrinfo), which is synchronous and runs on libuv's thread pool. `dns.resolve` uses Node's async DNS client directly. Under load, `dns.lookup` competes for thread pool slots.

---

## Databases

### 21. When should you choose SQL vs NoSQL? `[Junior]`

**Answer:**
- **Choose SQL when:**
  - Data has complex relationships (orders → line items → products → inventory)
  - You need ACID transactions (financial data, reservations)
  - Schema is stable and well-defined
  - Complex queries, aggregations, and reporting are needed
  - Referential integrity matters
- **Choose NoSQL when:**
  - You need to scale writes horizontally across many nodes (MongoDB sharding, Cassandra)
  - Schema is dynamic or unknown upfront (user-generated metadata, document stores)
  - You're storing simple key-value pairs or time-series data
  - You need specialized access patterns: document (MongoDB), wide-column (Cassandra), graph (Neo4j), time-series (InfluxDB), search (Elasticsearch)
  - Eventual consistency is acceptable
- **Misconceptions:**
  - "NoSQL scales, SQL doesn't" — PostgreSQL handles millions of writes/sec with proper tuning; NoSQL just makes horizontal scaling easier to configure
  - "NoSQL doesn't have transactions" — MongoDB, DynamoDB, and Fauna now have multi-document transactions
  - "NoSQL is faster" — depends entirely on the access pattern; a Redis lookup is faster than a document scan in MongoDB

**Key points:** The choice depends on data model, consistency requirements, and scaling strategy — not popularity or what's newer.

**Follow-up:** Can you use both in the same application? → Absolutely — polyglot persistence is common. Use PostgreSQL for transactional data, Redis for caching and sessions, Elasticsearch for full-text search, S3 for binary blobs. Pick the right tool per data type.

---

### 22. How do database indexes work, and what are the trade-offs? `[Mid]`

**Answer:**
- An index is a separate data structure (usually a B-tree) that the DB maintains alongside a table, storing the indexed column's values sorted with pointers to the full row
- **How queries use indexes**: instead of scanning all 10M rows (full table scan), the DB traverses the B-tree in O(log n) to find matching rows
- **B-tree index** — the default; supports equality (`=`), range (`<`, `>`), and ordering; each node can have many children; self-balancing
- **Types of indexes:**
  - **Single column**: `CREATE INDEX idx_email ON users(email)` — speeds up `WHERE email = ?`
  - **Composite**: `CREATE INDEX idx_user_date ON orders(user_id, created_at)` — speeds up `WHERE user_id = ? ORDER BY created_at`; column order matters (leftmost prefix rule)
  - **Partial**: `CREATE INDEX idx_active ON users(email) WHERE is_active = true` — smaller, faster for filtered queries
  - **Unique**: enforces constraint + creates index
  - **Hash index**: O(1) equality lookups, doesn't support range queries (PostgreSQL has these)
  - **GIN/GiST**: for full-text search, JSONB, arrays (PostgreSQL)
- **Trade-offs:**
  - Reads get faster, writes get slower — every `INSERT`/`UPDATE`/`DELETE` must update all indexes
  - Indexes consume disk space and memory (buffer pool)
  - Too many indexes slow down write-heavy tables; wrong indexes waste space without helping queries
- Find missing indexes: `EXPLAIN ANALYZE` a slow query; look for "Seq Scan" on large tables

**Key points:** Index the columns you filter and sort on. Always use `EXPLAIN ANALYZE` to verify the index is being used. Composite index column order matters — most selective column first, or match query's WHERE clause order.

**Follow-up:** What is an index covering query, and why is it faster? → A covering index includes all columns needed by a query, so the DB never has to read the actual table rows (heap). `SELECT email, name FROM users WHERE email = ?` is fully covered by `INDEX ON users(email, name)`. This avoids the extra "heap fetch" for each matching row.

---

### 23. What are ACID properties and when do you need them? `[Mid]`

**Answer:**
- **Atomicity** — a transaction is all-or-nothing; if any step fails, all changes roll back. Example: transfer $100 from A to B: debit A AND credit B must both succeed or neither does
- **Consistency** — a transaction brings the DB from one valid state to another; all constraints, rules, and triggers are enforced
- **Isolation** — concurrent transactions don't see each other's intermediate states; one transaction's reads aren't affected by another's uncommitted writes
- **Durability** — once a transaction commits, it persists even if the server crashes immediately after; achieved via write-ahead logging (WAL)
- **Isolation levels** (from weakest to strongest):
  - **Read Uncommitted** — can read other transactions' uncommitted changes (dirty reads); almost never used
  - **Read Committed** — only read committed data; default in PostgreSQL, Oracle; prevents dirty reads but allows non-repeatable reads
  - **Repeatable Read** — same row read twice in one transaction returns same data; default in MySQL; prevents non-repeatable reads but allows phantom reads
  - **Serializable** — transactions appear to execute one after another; slowest but safest; prevents all anomalies
- Higher isolation = more locking = lower throughput; choose the minimum isolation level that prevents the anomalies you care about
- NoSQL trade-offs: many NoSQL systems relax isolation for performance; eventual consistency means reads may return stale data for a window of time

**Key points:** ACID is essential for financial transactions, inventory, reservations — anywhere data integrity matters. Understand which isolation level your DB defaults to.

**Follow-up:** What is a phantom read? → Within a transaction, you run the same query twice and get different rows the second time because another transaction inserted matching rows between your two reads. Serializable isolation prevents this; Repeatable Read does not (in standard SQL; MySQL's MVCC actually does prevent phantoms in RR).

---

### 24. What is the N+1 query problem and how do you solve it? `[Junior]`

**Answer:**
- N+1 occurs when you fetch a list of N records and then make one additional query per record to fetch related data:
  ```js
  // N+1 problem — 1 query for posts + 1 per post for author = N+1 total
  const posts = await Post.findAll(); // 1 query
  for (const post of posts) {
    post.author = await User.findById(post.userId); // N queries
  }
  ```
- With 100 posts, this makes 101 queries instead of 2 — and it gets worse with more records
- **Solutions:**
  - **SQL JOIN** — fetch everything in one query:
    ```sql
    SELECT posts.*, users.name AS author_name
    FROM posts JOIN users ON posts.user_id = users.id
    ```
  - **Eager loading in ORMs**:
    ```js
    // Sequelize
    const posts = await Post.findAll({ include: [{ model: User, as: 'author' }] });
    // Mongoose
    const posts = await Post.find().populate('author');
    ```
  - **DataLoader** (for GraphQL) — batches and deduplicates DB calls within a request:
    ```js
    const userLoader = new DataLoader(async (userIds) => {
      const users = await User.findAll({ where: { id: userIds } });
      return userIds.map(id => users.find(u => u.id === id));
    });
    // Each resolver calls userLoader.load(post.userId) — automatically batched
    ```
  - **IN clause batching** — `SELECT * FROM users WHERE id IN (1, 2, 3, ...)`

**Key points:** N+1 is one of the most common performance bugs. Always check total query count in development. ORMs hide N+1 behind clean code — use query logging.

**Follow-up:** How do you detect N+1 in production? → Enable slow query logging. Use APM tools that track query counts per request. In development, use query logging middleware (Sequelize `logging: console.log`, Django Debug Toolbar). Bullet-proof approach: write tests that assert maximum query count.

---

### 25. Explain SQL JOIN types with a practical example. `[Junior]`

**Answer:**
- Given: `users` table and `orders` table where `orders.user_id` references `users.id`
- **INNER JOIN** — rows that match in both tables:
  ```sql
  SELECT users.name, orders.total FROM users
  INNER JOIN orders ON users.id = orders.user_id;
  -- Only users who have orders
  ```
- **LEFT JOIN** (LEFT OUTER JOIN) — all rows from left table, matching rows from right (NULL if no match):
  ```sql
  SELECT users.name, orders.total FROM users
  LEFT JOIN orders ON users.id = orders.user_id;
  -- All users; orders.total = NULL for users with no orders
  ```
- **RIGHT JOIN** — all rows from right table, matching from left; rarely used (swap table order + use LEFT JOIN instead)
- **FULL OUTER JOIN** — all rows from both tables; NULLs on non-matching side:
  ```sql
  SELECT users.name, orders.total FROM users
  FULL OUTER JOIN orders ON users.id = orders.user_id;
  -- Users without orders + orders without valid user reference
  ```
- **CROSS JOIN** — every row combined with every other row (Cartesian product); rarely intentional; `N x M` rows result
- **SELF JOIN** — joining a table to itself:
  ```sql
  SELECT e.name, m.name AS manager FROM employees e
  LEFT JOIN employees m ON e.manager_id = m.id;
  ```

**Key points:** LEFT JOIN is the most used after INNER. `NULL` in a joined column means no match was found. Filter `WHERE right_table.col IS NULL` after LEFT JOIN to find records with no matches (anti-join).

**Follow-up:** When can a JOIN produce more rows than the original table? → When there are multiple matching rows on the right side — if a user has 5 orders, the user row appears 5 times in an INNER JOIN result. This is a common bug: `COUNT(*)` inflates, aggregations double-count. Fix with `GROUP BY` or use a subquery.

---

### 26. What is database normalization, and when should you denormalize? `[Mid]`

**Answer:**
- Normalization organizes data to reduce redundancy and improve integrity by splitting data into related tables
- **1NF** — each column holds atomic values; no repeating groups; each row is unique
- **2NF** — in 1NF + every non-key column depends on the entire primary key (no partial dependency — applies to composite PKs)
- **3NF** — in 2NF + no transitive dependencies (non-key columns depend only on the PK, not on other non-key columns)
- Example: storing `city` and `country` in an orders table is a transitive dependency if `city → country`; extract to a separate cities table
- **Benefits of normalization**: update anomalies prevented (change a customer's email in one place), storage efficiency, data integrity
- **When to denormalize:**
  - Read-heavy reporting/analytics where JOINs are expensive across billions of rows
  - Data warehouse/OLAP systems (star schema, fact tables) — intentionally denormalized for query performance
  - Caching computed values that are expensive to recalculate (store `order_total` on the order even though it could be derived from line items)
  - When normalization requires more than 5 JOINs to answer common queries
- Materialized views are a middle ground — store pre-computed JOIN results that refresh periodically

**Key points:** Normalize for OLTP (transactional) systems; denormalize strategically for OLAP (analytical) systems. Don't over-normalize — 3NF is usually sufficient for applications.

**Follow-up:** What is a materialized view and when would you use it? → A materialized view stores the result of a query physically on disk (unlike a regular view that's re-executed each time). Use it for expensive aggregation queries that run frequently but can tolerate slightly stale data. PostgreSQL supports `REFRESH MATERIALIZED VIEW CONCURRENTLY` to refresh without blocking reads.

---

### 27. What are Redis use cases and when shouldn't you use Redis? `[Mid]`

**Answer:**
- **Good Redis use cases:**
  - **Caching** — store DB query results, rendered HTML, expensive computation results; set TTL for automatic expiry
  - **Session storage** — store session data for stateless servers; all nodes read from same Redis
  - **Rate limiting** — atomic `INCR` + `EXPIRE` for fixed window; Lua scripts for more complex algorithms
  - **Pub/Sub messaging** — lightweight message broadcasting (real-time notifications, invalidation signals); not a full message queue
  - **Distributed locks** — `SET key value NX EX 30` for Redlock pattern
  - **Leaderboards** — sorted sets for real-time ranking (`ZADD`, `ZRANGE`, `ZRANK`)
  - **Job queues** — BullMQ uses Redis lists and sorted sets; reliable queue with retries
  - **Feature flags** — read once from DB, cache in Redis; feature flag checks hit Redis, not DB
- **When NOT to use Redis:**
  - Primary data store for critical data — Redis is in-memory; data loss on crash unless AOF/RDB persistence configured
  - Complex relational queries — it's a key-value store, not a relational DB
  - Large binary objects — Redis keeps everything in RAM; storing large files is expensive
  - When data must survive without a persistence strategy
- **Persistence options**: `RDB` (snapshot every N minutes), `AOF` (append-only log of every write), or both; each has performance trade-offs

**Key points:** Redis is exceptional for ephemeral, high-frequency access patterns. Always think about what happens when Redis is empty (cold cache) — your system must still work.

**Follow-up:** What is cache stampede and how do you prevent it? → Cache stampede (thundering herd) occurs when a popular cache key expires and thousands of requests simultaneously query the database before any of them can repopulate the cache. Prevent with: probabilistic early expiration (refresh before TTL expires), mutex locks (only one request fetches, others wait), or background refresh patterns.

---

### 28. What is connection pooling and why is it important? `[Mid]`

**Answer:**
- Opening a database connection is expensive: TCP handshake, auth negotiation, SSL, session setup — can take 50–200ms
- Connection pooling maintains a pool of already-established connections and reuses them for incoming requests
- Without pooling: each HTTP request opens a connection → query → closes connection (slow + connection limit exhaustion under load)
- With pooling: request borrows a connection from pool → query → returns to pool (fast, connection count bounded)
- **Pool configuration:**
  ```js
  const pool = new Pool({
    host: 'localhost',
    database: 'mydb',
    max: 20,          // Max connections in pool
    min: 2,           // Keep at least 2 connections alive
    idleTimeoutMillis: 30000,  // Release idle connections after 30s
    connectionTimeoutMillis: 2000, // Fail fast if can't get connection in 2s
  });
  ```
- **max connections**: set based on DB server limits (PostgreSQL default 100 connections total; multiply your app servers by pool size must stay under this)
- **Pool exhaustion** — if all connections are busy, new requests queue up; if wait exceeds timeout, requests fail; monitor `pool.waitingCount` and `pool.totalCount`
- **PgBouncer** / **ProxySQL** — dedicated connection poolers that sit between app and DB; enable transaction-mode pooling where one DB connection serves many app connections

**Key points:** Almost every production database interaction needs connection pooling. Size the pool based on DB connection limits, not app throughput desire. Monitor pool metrics.

**Follow-up:** What's the difference between connection pool modes in PgBouncer? → Session mode: one DB connection per client session (similar to no pooler). Transaction mode: DB connection held only during a transaction, then returned to pool (most efficient, but breaks some session-level features like prepared statements). Statement mode: most aggressive, but breaks multi-statement transactions.

---

### 29. How do database migrations work, and what are the best practices? `[Mid]`

**Answer:**
- Migrations are version-controlled scripts that evolve your database schema — each migration has an `up` (apply change) and `down` (rollback) function
- **Migration tools**: Flyway (Java), Liquibase, Knex migrations (Node.js), Alembic (Python), ActiveRecord (Rails), Prisma Migrate
- Example with Knex:
  ```js
  // migrations/20240115_add_index_to_orders.js
  exports.up = async (knex) => {
    await knex.schema.table('orders', (table) => {
      table.index('user_id', 'idx_orders_user_id');
    });
  };
  exports.down = async (knex) => {
    await knex.schema.table('orders', (table) => {
      table.dropIndex('user_id', 'idx_orders_user_id');
    });
  };
  ```
- **Best practices:**
  - Run migrations automatically at deploy time (or as a separate pre-deploy step)
  - Never edit a migration that's already been applied in production — write a new one
  - Make migrations backward compatible — the old code must still work while migration runs (for zero-downtime deploys)
  - Avoid adding NOT NULL columns without a default in one migration — add the column with a default first, backfill, then add the constraint
  - Test rollbacks — actually run the `down` migration before shipping
  - Large table migrations (millions of rows): add columns without constraints first, backfill in batches, then add constraints
- Lock concern: `ALTER TABLE` on large tables can lock for minutes — use tools like `pg_repack` or online schema change tools (pt-online-schema-change for MySQL)

**Key points:** Migrations must be idempotent and backward compatible for zero-downtime deploys. Never mutate a committed migration.

**Follow-up:** How do you safely rename a column in a table with live traffic? → Three-step process: (1) add the new column alongside the old one, (2) double-write to both old and new columns in application code, backfill historical data, (3) switch reads to new column, then in a separate release remove the old column. One-step renaming causes downtime.

---

### 30. What is database sharding and when would you use it? `[Senior]`

**Answer:**
- Sharding horizontally partitions data across multiple database instances (shards), each holding a subset of rows
- **Shard key** determines which shard a record goes to; the most important design decision:
  - **Hash-based**: `shard = hash(user_id) % num_shards` — even distribution; bad for range queries
  - **Range-based**: users A–M on shard 1, N–Z on shard 2 — good for range scans; risk of hotspots
  - **Directory-based**: separate lookup service maps keys to shards — flexible; lookup service is a bottleneck/SPOF
- **Problems sharding introduces:**
  - **Cross-shard queries** — JOINs across shards require scatter-gather (query all shards, merge results in app); expensive
  - **Cross-shard transactions** — no native ACID across shards; requires distributed transactions (2PC) which are complex and slow
  - **Resharding** — adding a new shard requires moving data; causes operational complexity
  - **Hotspots** — if your shard key isn't chosen carefully, one shard gets all the traffic
- **Alternatives to sharding** (try these first):
  - Read replicas — offload reads to replicas (handles 80% of use cases)
  - Vertical scaling — bigger machine with more RAM/CPU
  - Caching layer — Redis in front of DB
  - Partitioning — split one large table by range within the same DB instance (PostgreSQL table partitioning)
- Sharding is a last resort because of the operational complexity it introduces

**Key points:** Shard key choice is irreversible in practice. Exhaust vertical scaling and read replicas before sharding. Most apps never need sharding.

**Follow-up:** What is the difference between sharding and partitioning? → Partitioning splits a table into multiple physical pieces within the same database server (PostgreSQL `PARTITION BY RANGE`). Sharding splits data across multiple database servers. Partitioning is operationally simpler and handles many of the same query performance issues.

---

### 31. What is database replication and what are the consistency trade-offs? `[Senior]`

**Answer:**
- Replication copies data from a primary (write) node to one or more replicas (read nodes)
- **Synchronous replication**: primary waits for at least one replica to confirm write before acknowledging to client; no data loss if primary fails; adds write latency
- **Asynchronous replication**: primary acknowledges write immediately, replica catches up later; lower write latency; replica may be behind by seconds (replication lag); read from replica = potentially stale data
- **Replication lag** causes problems: user writes, then reads from replica and sees old data (write-your-reads inconsistency); fix by routing reads to primary for N seconds after a write, or using sticky sessions
- **Patterns:**
  - **Primary-Replica (Master-Slave)**: all writes to primary, reads from replicas; primary is SPOF for writes
  - **Primary-Primary (Multi-Master)**: writes accepted on multiple nodes; conflict resolution needed; rare
  - **Synchronous + Async combo**: one synchronous replica (for failover), rest async (for read scaling); PostgreSQL `synchronous_standby_names`
- **Automatic failover**: tools like Patroni (PostgreSQL), Orchestrator (MySQL) detect primary failure and promote a replica; replication lag matters here — a lagged replica may be promoted and lose some writes
- Use cases: read replicas for reporting queries (don't run OLAP on your OLTP primary), geographic distribution (replica in each region), hot standby for disaster recovery

**Key points:** Async replication means eventual consistency for reads. Always know your max acceptable replication lag. Replica reads are only safe for non-critical, non-write-after-read scenarios.

**Follow-up:** How do you handle the case where your primary DB fails and a replica is promoted with replication lag? → Some writes committed to primary are lost. Options: accept this loss (if lag was minimal), or use synchronous replication to zero-lag standbys for critical data. After failover, the old primary may come back with "extra" writes — these must be discarded (primary fences itself off) to prevent split-brain.

---

### 32. How do you optimize slow SQL queries? `[Mid]`

**Answer:**
- **Step 1: Identify slow queries** — enable slow query log (MySQL: `slow_query_log`, PostgreSQL: `log_min_duration_statement`); use `pg_stat_statements` extension; APM tools
- **Step 2: Understand the query plan** — `EXPLAIN ANALYZE` shows what the DB actually does:
  ```sql
  EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123 ORDER BY created_at DESC LIMIT 10;
  -- Look for: Seq Scan on large table, Hash Join on large result sets, Sort on unindexed column
  ```
- **Common fixes:**
  - **Missing index** — add index on filtered/sorted columns
  - **Wrong index** — check if the right index is being used; force with `USE INDEX` (MySQL) or hints
  - **SELECT star** — only select needed columns; reduces data transfer and prevents covering index misses
  - **N+1** — JOIN instead of loop
  - **Missing LIMIT** — unbounded queries load all rows
  - **Function on indexed column** — `WHERE YEAR(created_at) = 2024` prevents index use; use `WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'`
  - **`OR` across columns** — often causes full table scan; consider `UNION ALL` of two indexed queries
  - **Large offsets** — `LIMIT 20 OFFSET 100000` scans 100,020 rows; use keyset pagination instead
- **Rewrite joins as subqueries** (or vice versa) — sometimes the optimizer makes better decisions one way

**Key points:** Always start with `EXPLAIN ANALYZE`, not intuition. The most impactful fix is almost always a missing index or a query rewrite to use existing indexes.

**Follow-up:** What does "Using filesort" mean in MySQL's EXPLAIN output? → MySQL had to sort the result in a temporary buffer rather than reading rows in pre-sorted index order. Fix: add an index that matches the ORDER BY columns (and WHERE columns for composite). If sorting is unavoidable, ensure `sort_buffer_size` is large enough.

---

### 33. What are ORMs and what are their trade-offs? `[Junior]`

**Answer:**
- ORM (Object-Relational Mapper) maps database tables to objects in your code, so you write `User.find({ where: { email } })` instead of `SELECT * FROM users WHERE email = ?`
- **Popular Node.js ORMs**: Prisma (type-safe, schema-first), Sequelize (mature, feature-rich), TypeORM (TypeScript-focused), Knex (query builder — not full ORM)
- **Benefits:**
  - Auto-generates SQL from method calls — faster development
  - Type safety (Prisma generates TypeScript types from schema)
  - Handles connection pooling, escaping (prevents SQL injection)
  - Migrations included
  - Portable across databases (switch from PostgreSQL to MySQL with config change)
- **Trade-offs:**
  - **Performance overhead**: ORM-generated SQL is often suboptimal for complex queries; ORMs may generate N+1 without you realizing
  - **Abstraction leaks**: for complex queries, you end up writing raw SQL inside the ORM anyway
  - **Learning curve**: Prisma's schema language, Sequelize's associations model — you learn the ORM, not just SQL
  - **Magic**: hard to debug when ORM generates unexpected SQL
- **Best practice**: use ORM for 80% of CRUD; drop to raw SQL for complex analytics, bulk operations, or performance-critical paths:
  ```js
  // Prisma raw query
  const result = await prisma.$queryRaw`
    SELECT user_id, COUNT(*) as order_count, SUM(total) as revenue
    FROM orders WHERE created_at > ${cutoff}
    GROUP BY user_id HAVING revenue > 1000
  `;
  ```

**Key points:** ORMs accelerate development but can hide performance issues. Always log ORM-generated SQL in development. Know when to reach for raw SQL.

**Follow-up:** What is Prisma's advantage over Sequelize? → Prisma generates TypeScript types from your schema automatically, so your model types are always in sync with your DB schema. It has a cleaner API and better type safety. Sequelize has more features and a larger ecosystem but requires manual type maintenance.

---

### 34. How do you design a database schema for a multi-tenant SaaS application? `[Senior]`

**Answer:**
- **Three main approaches:**
- **Shared database, shared schema** — all tenants in same tables, every table has a `tenant_id` column:
  ```sql
  SELECT * FROM orders WHERE tenant_id = ? AND id = ?
  ```
  - Pros: simplest, cheapest, easy to deploy new tenants
  - Cons: must add `tenant_id` to every query (bugs if forgotten), tenants can see each other's data on bug, one bad migration affects all tenants, no tenant-level backup/restore
  - Mitigation: Row-Level Security (PostgreSQL RLS) enforces `tenant_id` automatically at the DB level
- **Shared database, separate schemas** — one schema (namespace) per tenant:
  - Pros: tenant data physically separated, easier per-tenant backup, no `tenant_id` bugs
  - Cons: migrations must run per schema (complex tooling), schema count can be very large
- **Separate database per tenant** — each tenant gets their own database instance:
  - Pros: complete isolation, independent scaling, easy compliance (GDPR data deletion)
  - Cons: operationally complex, expensive, slow to onboard new tenants
- **Hybrid**: shared schema for most tenants; dedicated DB for enterprise/high-volume customers
- PostgreSQL RLS example:
  ```sql
  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON orders
    USING (tenant_id = current_setting('app.tenant_id')::int);
  -- Now every query automatically filters by tenant_id
  SET app.tenant_id = 42; -- Set at connection time
  ```

**Key points:** Start with shared schema + RLS — it's the right trade-off for most SaaS. Move to per-schema or per-DB only for compliance requirements or very large tenants.

**Follow-up:** How does RLS affect performance? → RLS adds a predicate to every query, which has minimal overhead when `tenant_id` is indexed (and it always should be). The index lookup is fast; the RLS policy just adds `AND tenant_id = ?` automatically.

---

### 35. What is the difference between optimistic and pessimistic locking? `[Senior]`

**Answer:**
- Both strategies handle concurrent access to the same data — preventing lost updates
- **Pessimistic locking** — assume conflicts will happen; lock the row immediately when reading:
  ```sql
  BEGIN;
  SELECT * FROM accounts WHERE id = 1 FOR UPDATE; -- Locks the row
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  COMMIT;
  -- Other transactions wait until this one commits/rolls back
  ```
  - Good for high-contention data (popular product inventory during flash sale)
  - Risk: deadlocks if two transactions lock rows in opposite order; `NOWAIT` or `SKIP LOCKED` help
- **Optimistic locking** — assume conflicts are rare; read data, do work, only lock at write time; fail if someone else changed it:
  ```sql
  -- Read with version
  SELECT *, version FROM products WHERE id = 1; -- version = 5

  -- Application does work, then update
  UPDATE products SET stock = 99, version = 6
  WHERE id = 1 AND version = 5; -- Fails if version changed
  -- If 0 rows affected: conflict! Retry the whole operation.
  ```
  - ORM version with `@Version` annotation (TypeORM, Hibernate) automates this
  - Good for low-contention data; bad for high-contention (too many retries)
- **Application-level optimistic lock:**
  ```js
  const product = await Product.findById(1);
  // ... long operation ...
  const updated = await Product.findOneAndUpdate(
    { _id: 1, updatedAt: product.updatedAt }, // Check nothing changed
    { $inc: { stock: -1 } },
    { new: true }
  );
  if (!updated) throw new Error('Concurrent modification, please retry');
  ```

**Key points:** Pessimistic = lock early, safe but slow. Optimistic = lock late, fast but requires retry logic. Use pessimistic for high-contention writes; optimistic for most CRUD.

**Follow-up:** What is a deadlock and how do you prevent it? → A deadlock occurs when transaction A holds lock 1 and waits for lock 2, while transaction B holds lock 2 and waits for lock 1. Prevention: always acquire locks in the same consistent order, keep transactions short, use `NOWAIT` to fail fast instead of waiting indefinitely.

---

## Authentication & Security

### 36. What is the difference between JWT and session-based authentication? `[Junior]`

**Answer:**
- **Session-based authentication:**
  - Server creates a session, stores it in DB or Redis (`sessionId → {userId, roles, ...}`)
  - Client stores only the `sessionId` in a cookie (HttpOnly, Secure)
  - Every request: server looks up the session in storage → validates → allows
  - **Pros**: easy to invalidate (delete session from store), session data lives server-side
  - **Cons**: requires shared session storage across servers (sticky sessions or Redis); adds a DB lookup per request
- **JWT (JSON Web Token):**
  - Server issues a signed token containing claims (`{userId, roles, exp}`) — no server-side state
  - Client stores token (localStorage or HttpOnly cookie) and sends with every request
  - Server validates the signature cryptographically — no DB lookup needed
  - **Pros**: stateless, scales horizontally without shared storage
  - **Cons**: cannot be truly invalidated before expiry (compromised token works until it expires), token grows larger with more claims
- JWT structure: `base64(header).base64(payload).signature` — payload is readable by anyone (not encrypted), only the signature is verified
- Access token (short-lived, 15min) + refresh token (long-lived, 7 days, stored securely) is the standard pattern

**Key points:** JWT is not inherently more secure than sessions. Sessions are easier to invalidate. For most web apps, HttpOnly cookie sessions are simpler and safer. JWT shines for stateless microservices APIs.

**Follow-up:** How do you invalidate a JWT before it expires? → Maintain a "token blacklist" or "jti allowlist" in Redis; check on every request (negates statelessness benefit). Better approach: use short expiry (15min) access tokens + refresh token rotation with ability to revoke refresh tokens.

---

### 37. How does OAuth 2.0 work? `[Mid]`

**Answer:**
- OAuth 2.0 is an authorization framework — it lets a user grant a third-party application access to their resources on another service without sharing their password
- **Four roles**: Resource Owner (user), Client (your app), Authorization Server (e.g., Google's auth), Resource Server (Google's API)
- **Authorization Code Flow** (most secure, for server-side apps):
  1. Your app redirects user to Google: `https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&scope=email&response_type=code`
  2. User authenticates with Google and consents to scopes
  3. Google redirects back to your `redirect_uri` with an authorization code: `https://yourapp.com/callback?code=abc123`
  4. Your server POSTs the code to Google's token endpoint (with client secret): Google returns access token + refresh token
  5. Use access token to call Google APIs on behalf of user
- **PKCE (Proof Key for Code Exchange)** — extension for public clients (SPAs, mobile apps) that can't keep a client secret; replaces secret with a code verifier/challenge pair
- **Flows:**
  - **Authorization Code** — web apps with server side (most common)
  - **Authorization Code + PKCE** — SPAs and mobile apps
  - **Client Credentials** — machine-to-machine (no user involved)
  - **Device Code** — smart TVs, CLI tools
- **Scopes** — define what access is requested (`email`, `openid`, `read:repos`) — principle of least privilege
- **OpenID Connect (OIDC)** — OAuth 2.0 + identity layer; adds `id_token` (a JWT with user profile) on top of OAuth's access token

**Key points:** OAuth 2.0 is authorization (what can this app do), not authentication (who is this user) — OIDC adds authentication on top. Never use Implicit Flow (deprecated); always use Authorization Code + PKCE.

**Follow-up:** What is the difference between OAuth access tokens and ID tokens in OIDC? → Access token: opaque or JWT, used to call resource APIs, proves authorization. ID token: always a JWT, contains user identity claims (`sub`, `email`, `name`), used by your app to know who the user is — should not be sent to APIs.

---

### 38. How should you store passwords? `[Junior]`

**Answer:**
- **Never store passwords in plain text** — if your DB is breached, all accounts are compromised
- **Never use MD5 or SHA-1** — they're fast hash functions designed for speed; an attacker can brute-force billions of guesses per second using GPUs
- **Use bcrypt, Argon2id, or scrypt** — designed to be slow and memory-intensive; attacker must spend significant time per guess
- bcrypt in Node.js:
  ```js
  const bcrypt = require('bcrypt');

  // Hash password at registration
  const SALT_ROUNDS = 12; // 2^12 iterations — calibrate so it takes ~200-300ms
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  await db.users.update({ passwordHash: hash }, { where: { id: userId } });

  // Verify at login
  const isValid = await bcrypt.compare(enteredPassword, user.passwordHash);
  if (!isValid) throw new Error('Invalid credentials');
  ```
- bcrypt automatically generates and stores a unique salt — prevents rainbow table attacks
- **Argon2id** (winner of Password Hashing Competition) is now the recommended standard:
  ```js
  const argon2 = require('argon2');
  const hash = await argon2.hash(password); // Uses argon2id by default
  const valid = await argon2.verify(hash, password);
  ```
- Work factor/cost: increase `SALT_ROUNDS` as hardware gets faster — benchmark to keep hashing time at 200–300ms
- Store only the hash; never log passwords, even failed attempts

**Key points:** Use bcrypt (minimum cost 10, prefer 12) or Argon2id. Never roll your own crypto. The slow computation is a feature, not a bug.

**Follow-up:** What if a user forgets their password? → Generate a time-limited, single-use, random token (not the user's password); email a reset link with that token. Never email the actual password (you can't if you're hashing). Token should expire in 1 hour and be invalidated after first use. Store a hash of the token, not the token itself.

---

### 39. What is SQL injection and how do you prevent it? `[Junior]`

**Answer:**
- SQL injection occurs when user input is directly concatenated into a SQL query — attacker can change the query's meaning:
  ```js
  // VULNERABLE — do not do this
  const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
  // Attacker sends email: ' OR '1'='1
  // Query becomes: SELECT * FROM users WHERE email = '' OR '1'='1'
  // Returns all users!

  // Even worse:
  // email: '; DROP TABLE users; --
  // Query: SELECT * FROM users WHERE email = ''; DROP TABLE users; --'
  ```
- **Prevention — parameterized queries / prepared statements:**
  ```js
  // Safe with pg
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [req.body.email] // Passed separately, never interpolated
  );

  // Safe with mysql2
  const [rows] = await connection.execute(
    'SELECT * FROM users WHERE email = ?',
    [req.body.email]
  );
  ```
  - The database treats parameters as data values, never as SQL syntax — injection is structurally impossible
- **ORMs**: Sequelize, Prisma, TypeORM use parameterized queries internally — safe by default for standard operations; raw queries must still use parameterized form:
  ```js
  // Unsafe raw query in Sequelize
  await sequelize.query(`SELECT * FROM users WHERE name = '${name}'`); // DANGEROUS
  // Safe
  await sequelize.query('SELECT * FROM users WHERE name = ?', { replacements: [name] });
  ```
- Input validation is a defense-in-depth measure, not a replacement for parameterized queries
- Principle of least privilege: DB user used by app should not have `DROP TABLE` or admin privileges

**Key points:** Always use parameterized queries. There is no sanitization approach as reliable as parameterization. Even ORM users should understand this for raw query escapes.

**Follow-up:** What is second-order SQL injection? → The attacker stores malicious input in the database via one request (which is properly escaped on write), and the application later reads that data and uses it unsafely in another query. Prevention: use parameterized queries everywhere you use database-sourced data in queries — not just user input.

---

### 40. What is XSS and how do you prevent it in a backend API? `[Mid]`

**Answer:**
- XSS (Cross-Site Scripting) occurs when an attacker injects malicious JavaScript that executes in another user's browser
- **Three types:**
  - **Reflected** — malicious script in URL, server echoes it back in response; victim must click crafted link
  - **Stored (Persistent)** — attacker stores script in DB (comment, username); all users who view the content execute it
  - **DOM-based** — client-side JS writes attacker-controlled data to the DOM without server involvement
- **Backend API responsibilities:**
  - **Output encoding** — if your API serves HTML (not just JSON), escape `<`, `>`, `"`, `'`, `&` in user-controlled data before inserting into HTML
  - **Content Security Policy (CSP) header** — tells browsers which sources of scripts are trusted; even if XSS content is injected, CSP blocks execution of inline scripts:
    ```
    Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'
    ```
  - **HttpOnly cookies** — XSS can't steal HttpOnly cookies via `document.cookie` (mitigates session theft even if XSS succeeds)
  - **`X-Content-Type-Options: nosniff`** — prevents browser from executing a response as script if content type is wrong
  - **Sanitize HTML input** — if your API accepts rich text and stores it, sanitize with a whitelist library (DOMPurify on client, `sanitize-html` on server) before storage
  - **JSON APIs** — return `Content-Type: application/json`, not `text/html`; set `X-Content-Type-Options: nosniff`
- For JSON-only APIs, XSS risk is lower since browsers don't execute JSON — but CSRF and header injection are still concerns

**Key points:** Backend defenses: CSP headers, HttpOnly cookies, input sanitization, proper Content-Type headers. Frontend framework (React, Vue) auto-escapes by default — never use `dangerouslySetInnerHTML` with unsanitized content.

**Follow-up:** What is the difference between encoding and sanitization? → Encoding converts characters to their HTML entities (`<` becomes `&lt;`) so they display but don't execute — appropriate when you want to show the raw input. Sanitization removes or whitelists HTML tags — appropriate when you want to allow some HTML (bold, links) but not scripts. Use encoding for plain text display; sanitization for rich text.

---

### 41. How does CSRF work and how do you prevent it? `[Mid]`

**Answer:**
- CSRF (Cross-Site Request Forgery) tricks a logged-in user's browser into making unauthorized requests to your site:
  1. User is logged into `bank.com` (session cookie automatically sent)
  2. User visits `evil.com` which has: `<img src="https://bank.com/transfer?to=attacker&amount=1000">`
  3. Browser fetches the URL, automatically sending the bank's session cookie — transfer happens
- **Prevention:**
  - **CSRF tokens** — server generates a random token per session, embeds in forms; on submit, verify token matches server's stored value; `evil.com` can't know this token (SOP prevents reading responses cross-origin)
  - **SameSite cookies** — modern and effective; set cookie attribute:
    - `SameSite=Strict` — cookie never sent cross-site (breaks some OAuth flows)
    - `SameSite=Lax` — cookie sent on top-level GET navigations but not POST/iframe (good default)
    - `SameSite=None; Secure` — sent cross-site (required for embeds, needs HTTPS)
  - **Custom request headers** — require a custom header (`X-Requested-With: XMLHttpRequest`) that browsers won't add on simple cross-origin requests; CORS preflight blocks cross-origin scripts from adding it
  - **Double submit cookie** — set a CSRF token in a non-HttpOnly cookie and require it as a request header; server validates they match
- **JSON APIs** — less vulnerable if they require `Content-Type: application/json` (cross-origin form submissions can't set this without a preflight, which CORS blocks), but still best to use `SameSite=Lax`

**Key points:** `SameSite=Lax` cookie attribute is the simplest modern CSRF defense. CSRF tokens are the traditional server-side defense. JSON APIs with `SameSite` cookies are effectively protected.

**Follow-up:** Does CORS prevent CSRF? → No. CORS prevents a malicious page from reading your response cross-origin, but CSRF attacks don't need to read the response — they just need to trigger the state change (transfer, delete). You must use CSRF tokens or SameSite cookies.

---

### 42. What is HTTPS and what does it protect against? `[Junior]`

**Answer:**
- HTTPS = HTTP + TLS (Transport Layer Security); encrypts all data in transit between client and server
- **What TLS provides:**
  - **Encryption** — data is unreadable to anyone intercepting the network (man-in-the-middle on public WiFi)
  - **Authentication** — server certificate proves you're talking to the real `bank.com`, not an impersonator
  - **Integrity** — data can't be modified in transit without detection (prevents injection of ads or malware by ISPs)
- **TLS handshake** (simplified):
  1. Client sends supported TLS versions and cipher suites
  2. Server responds with its certificate (signed by a CA) and chosen cipher suite
  3. Client verifies certificate against trusted CAs; derives session key using asymmetric crypto
  4. Both sides use the symmetric session key for fast encryption of all subsequent data
- **HSTS (HTTP Strict Transport Security)** — tells browsers to always use HTTPS for this domain, even if user types `http://`:
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  ```
- **Certificate pinning** — mobile apps embed expected certificate fingerprint and refuse connections with different certs; extreme measure for high-security apps
- **What HTTPS doesn't protect**: XSS (attacker's script runs inside the encrypted session), SQL injection, logic bugs — encryption is transport-level only

**Key points:** HTTPS is table stakes in 2024 — Let's Encrypt makes free certificates trivial. Always redirect HTTP to HTTPS. Use HSTS. TLS 1.3 is current best practice.

**Follow-up:** What happens when a TLS certificate expires? → Browsers show a full-page warning and block access. Use automated certificate renewal (Let's Encrypt + certbot, or AWS ACM for AWS services). Monitor certificate expiry with tools like `ssl-checker` or your APM. Set reminders at 30 days.

---

### 43. How do API keys work, and what are the security best practices for them? `[Mid]`

**Answer:**
- API keys are opaque random strings used to authenticate automated/programmatic access to an API
- **Generation**: use cryptographically secure random bytes, not UUID (UUID has limited entropy in some versions):
  ```js
  const apiKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  // Or use a prefix for easy identification: sk_live_<random>
  ```
- **Storage**: never store the raw API key — store a hash (SHA-256, no salt needed since keys have high entropy):
  ```js
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  await db.apiKeys.create({ hash, userId, name, lastUsedAt: null });
  ```
  Show the raw key to the user exactly once (at creation); after that, only the hash is stored
- **Transmission**: always via HTTPS; in `Authorization: Bearer sk_live_abc123` header (not query params — query params appear in server logs, browser history, and proxy logs)
- **Scoping**: limit what each key can do (`read:orders`, `write:products`); allow users to create multiple keys with different scopes
- **Rotation**: support creating new keys without revoking old ones (overlap period); support revocation immediately
- **Usage tracking**: log `apiKeyId`, `endpoint`, `ip`, `timestamp` per request; show users their key usage in the dashboard
- **Rate limiting**: rate limit per API key, not just per IP

**Key points:** Store hashed API keys. Show raw key only once. Use request headers, not query params. Scope keys by permission.

**Follow-up:** What is the difference between an API key and an OAuth access token? → API keys are long-lived, user-managed credentials for server-to-server auth (no expiry unless revoked). OAuth access tokens are short-lived (minutes to hours), user-delegated, and scoped to what a user authorized; they're obtained through a flow, not manually created.

---

### 44. Explain JWT refresh token rotation and why it matters. `[Senior]`

**Answer:**
- **Access token**: short-lived JWT (15 min), sent with every API request in `Authorization: Bearer` header; if stolen, attacker has 15 min of access
- **Refresh token**: long-lived (7–30 days), stored in HttpOnly cookie; used only to get new access tokens; if stolen, attacker can impersonate indefinitely
- **Refresh token rotation** — issue a new refresh token every time the old one is used; invalidate the old one:
  ```js
  async function refreshTokens(oldRefreshToken) {
    const record = await db.refreshTokens.findOne({ token: hash(oldRefreshToken) });
    if (!record || record.revokedAt) {
      // Token reuse detected! Revoke entire token family
      await db.refreshTokens.revokeFamily(record.family);
      throw new Error('Token reuse detected');
    }

    const newRefreshToken = generateSecureToken();
    const newAccessToken = generateJWT(record.userId);

    // Revoke old, create new in same family
    await db.refreshTokens.revoke(record.id);
    await db.refreshTokens.create({ token: hash(newRefreshToken), family: record.family, userId: record.userId });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
  ```
- **Token family + reuse detection**: if a refresh token is used after being rotated, an attacker has a copy; invalidate the entire family to force re-login; notify the user
- **Storage**: refresh token in HttpOnly Secure SameSite=Strict cookie; access token in memory (not localStorage) to prevent XSS theft
- **Absolute expiry**: even with rotation, enforce a maximum session duration (e.g., 30 days) — user must re-authenticate

**Key points:** Rotation limits the blast radius of a stolen refresh token to one use. Reuse detection catches token theft. Family revocation is the security-aware response to suspected theft.

**Follow-up:** Why store the access token in memory instead of localStorage? → localStorage is accessible via JavaScript — XSS can read and exfiltrate it. Memory (a JS variable) is not persistent and not accessible cross-origin. The downside: memory is lost on page refresh, requiring a new access token fetch via the HttpOnly refresh token cookie (which XSS can't read).

---

### 45. What is bcrypt's work factor, and how do you choose it? `[Mid]`

**Answer:**
- bcrypt's work factor (cost) is the log2 of the number of iterations — work factor 12 means 2^12 = 4,096 iterations of the key derivation function
- Each increment by 1 doubles computation time — cost 12 is twice as slow as cost 11
- **Choosing the right cost**: time it on your production hardware; target 200–300ms per hash — slow enough to frustrate brute force, fast enough to not degrade login UX:
  ```js
  const bcrypt = require('bcrypt');

  // Benchmark different costs
  for (let cost = 10; cost <= 14; cost++) {
    const start = Date.now();
    await bcrypt.hash('testpassword', cost);
    console.log(`Cost ${cost}: ${Date.now() - start}ms`);
  }
  // Cost 10: ~65ms
  // Cost 12: ~250ms  -- typical sweet spot
  // Cost 14: ~1000ms -- only if login rate is very low
  ```
- **Increasing cost over time**: as hardware gets faster, increase the cost in a migration; on next login, re-hash with new cost (bcrypt stores the cost in the hash string itself, so you can check which cost was used):
  ```js
  async function login(email, password) {
    const user = await db.users.findByEmail(email);
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    // Upgrade hash if cost is outdated
    const currentCost = parseInt(user.passwordHash.split('$')[2]);
    if (currentCost < DESIRED_COST) {
      const newHash = await bcrypt.hash(password, DESIRED_COST);
      await db.users.update({ passwordHash: newHash }, { where: { id: user.id } });
    }
    return user;
  }
  ```
- **Argon2id** is now preferred over bcrypt — configurable memory hardness makes GPU cracking even harder

**Key points:** Cost 12 is a reasonable default for bcrypt. Always benchmark on production hardware. Plan for periodic cost upgrades. Argon2id is the modern recommendation.

**Follow-up:** Why does bcrypt truncate passwords at 72 characters? → bcrypt is based on Blowfish cipher with a 72-byte key limit — anything beyond 72 bytes is silently ignored. Implication: two passwords that share the first 72 characters are treated as identical. For very long passwords, pre-hash with SHA-512 before bcrypt, or use Argon2id which has no such limit.

---

## System & Performance

### 46. What are the main caching strategies, and when do you use each? `[Mid]`

**Answer:**
- **Cache-Aside (Lazy Loading)** — application checks cache first; on miss, loads from DB and populates cache:
  ```js
  async function getUser(id) {
    const cached = await redis.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    const user = await db.users.findById(id);
    await redis.setex(`user:${id}`, 3600, JSON.stringify(user));
    return user;
  }
  ```
  - Pros: only caches what's actually requested; resilient (cache failure → DB fallback)
  - Cons: cache miss causes 3 operations (check + DB + cache set); initial load is slow; cache may be stale
- **Write-Through** — write to cache and DB simultaneously on every write:
  - Pros: cache always fresh; consistent
  - Cons: write latency increases (two writes); caches data that may never be read
- **Write-Behind (Write-Back)** — write to cache immediately; async write to DB:
  - Pros: very fast writes; batch DB writes possible
  - Cons: risk of data loss if cache fails before DB write; complexity
- **Read-Through** — cache sits transparently in front of DB; cache fetches from DB on miss automatically (cache does the work, not application)
- **Refresh-Ahead** — proactively refresh cache before it expires (if hit rate is high and data is predictable)
- **Cache invalidation strategies:**
  - TTL-based: simple, may serve stale data up to TTL
  - Event-driven: on write, explicitly delete or update cache key (`redis.del('user:123')`)
  - Cache tags: tag related cache entries, invalidate by tag (Fastly, Cloudflare support this)

**Key points:** Cache-aside is the most common pattern. "There are only two hard things in computer science: cache invalidation and naming things." Always think about when and how caches go stale.

**Follow-up:** What is a cache warm-up strategy? → After deployment or cache restart (cold cache), all requests hit the DB simultaneously — the thundering herd problem. Solutions: pre-warm the cache by replaying recent queries before taking traffic, use probabilistic early expiration to prevent stampedes, or use gradual rollout with a warm cache from the previous deployment.

---

### 47. What are message queues and when should you use them? `[Mid]`

**Answer:**
- A message queue decouples the producer (sends messages) from the consumer (processes messages); producer doesn't wait for processing to complete
- **Use cases:**
  - **Async processing** — user uploads a video; API responds immediately with `202 Accepted`, queue consumer transcodes in background
  - **Load leveling** — smooth out traffic spikes; queue absorbs burst, consumers process at steady rate; prevents DB overload
  - **Retry with backoff** — failed processing is retried automatically with exponential backoff
  - **Fan-out** — one event triggers multiple consumers (order placed → notify warehouse, send email, update analytics, charge payment)
  - **Ordering** — guaranteed ordered processing (Kafka partitions guarantee order within a partition)
- **Tools:**
  - **BullMQ** (Redis-backed, Node.js) — easy setup, great for Node apps, supports priorities and rate limiting
  - **RabbitMQ** — AMQP protocol, routing, topic exchanges, dead letter queues; feature-rich
  - **AWS SQS** — managed, at-least-once delivery, standard and FIFO queues
  - **Kafka** — high throughput, log-based, replay-able, stream processing; complex but powerful
- **Key concepts:**
  - **At-least-once delivery** — messages may be delivered more than once; consumers must be idempotent
  - **Dead letter queue (DLQ)** — after N failed retries, message goes to DLQ for inspection; prevents poison pill messages blocking the queue
  - **Visibility timeout** — when a consumer reads a message, it's hidden from others for N seconds; consumer must delete it after processing, or it becomes visible again for retry

**Key points:** Message queues are essential for decoupling and async workflows. Always make consumers idempotent. Always configure a DLQ.

**Follow-up:** What is the difference between a queue and a topic (pub/sub)? → A queue: each message is consumed by exactly one consumer (competing consumers); good for work distribution. A topic (pub/sub): each message is delivered to all subscribers; good for fan-out events. Kafka, SNS, and Redis Pub/Sub implement topics; SQS and BullMQ implement queues. Many systems combine both (SNS fan-out to multiple SQS queues).

---

### 48. How does load balancing work? `[Junior]`

**Answer:**
- A load balancer distributes incoming requests across multiple backend servers to prevent any single server from being overwhelmed
- **Algorithms:**
  - **Round Robin** — requests cycle through servers in order (1→2→3→1→2→3); simple, good for equal-capacity homogeneous servers
  - **Weighted Round Robin** — servers with more capacity get more requests proportionally
  - **Least Connections** — route to server with fewest active connections; better for variable-duration requests
  - **IP Hash** — same client IP always routes to same server (sticky sessions without cookies); breaks if server goes down
  - **Least Response Time** — route to fastest-responding server; requires health monitoring
  - **Random** — route randomly; statistically good distribution at scale
- **Layers:**
  - **L4 (Transport)** — routes based on IP and TCP port; doesn't inspect HTTP content; very fast; nginx stream mode, AWS NLB
  - **L7 (Application)** — routes based on HTTP headers, URLs, cookies; can route `/api/*` to API servers and `/static/*` to CDN; SSL termination; nginx, AWS ALB
- **Health checks** — load balancer periodically probes each server (`GET /health`); if it fails, traffic is stopped to that server; automatic recovery when healthy again
- **Session persistence (sticky sessions)** — cookie or IP-based routing to ensure a user always hits the same server; useful for in-memory sessions but reduces distribution effectiveness
- SSL termination at load balancer: decrypts HTTPS, sends HTTP internally — simplifies certificate management

**Key points:** L7 load balancers are most common for web apps (AWS ALB, nginx). Health checks enable zero-downtime deployments. Prefer stateless apps to avoid sticky session complexity.

**Follow-up:** How do you deploy a new version without any downtime? → Rolling deployment: gradually replace old instances with new ones behind the load balancer; load balancer routes to healthy instances. Blue-green deployment: run two identical environments; switch load balancer from blue to green atomically; easy rollback by switching back. Canary: send 5% of traffic to new version, gradually increase, roll back on errors.

---

### 49. What is the CAP theorem and what does it mean in practice? `[Senior]`

**Answer:**
- CAP theorem states that a distributed system can guarantee at most 2 of 3 properties simultaneously:
  - **Consistency (C)** — every read receives the most recent write or an error
  - **Availability (A)** — every request receives a (non-error) response, though it may be stale
  - **Partition Tolerance (P)** — system continues operating despite network partitions (messages dropped between nodes)
- **Network partitions are inevitable in distributed systems** — you must tolerate them; the real choice is C vs A during a partition:
  - **CP systems** (choose consistency over availability) — during a partition, refuse requests rather than return potentially stale data. Examples: HBase, Zookeeper, most RDBMS with synchronous replication. Use for: financial transactions, inventory counts where correctness is critical
  - **AP systems** (choose availability over consistency) — during a partition, return best available data even if stale. Examples: Cassandra, DynamoDB (default), CouchDB. Use for: shopping carts, social media feeds, DNS — where stale data is acceptable
- **PACELC extension** — more nuanced: even without partitions (E), you trade latency (L) for consistency (C); lower replication lag = higher latency
- Real-world nuance: most databases offer tunable consistency; DynamoDB offers eventually consistent reads (fast) or strongly consistent reads (slower, more expensive); Cassandra quorum reads for consistency vs single-node reads for availability

**Key points:** You can't avoid network partitions in distributed systems. CP vs AP is a business decision — how bad is stale data vs unavailability for your use case?

**Follow-up:** Is a single-node PostgreSQL a CA system? → Technically yes — no partitions possible with a single node; offers consistency and availability. But "CA" is misleading because the moment you add replication or distribute it, you must choose C or A during partitions. Single-node is just "not distributed."

---

### 50. What is the difference between horizontal and vertical scaling? `[Junior]`

**Answer:**
- **Vertical scaling (scale up)** — add more resources to existing server (more CPU, RAM, faster disk):
  - Pros: no application changes needed; works for any workload; lower operational complexity
  - Cons: has hardware limits (biggest available machine); single point of failure; expensive at high end; requires downtime to resize
  - Good for: databases (start here before sharding), stateful services, when simplicity is valued
- **Horizontal scaling (scale out)** — add more servers running the same service:
  - Pros: theoretically unlimited scale; redundancy (no single point of failure); can scale independently per service; cheaper commodity hardware
  - Cons: requires stateless application design (sessions in Redis, not in-process); distributed coordination complexity; load balancer needed; data consistency harder
  - Good for: stateless web/API servers, read replicas, microservices
- **Stateless is the prerequisite for horizontal scaling** — if state lives in the process (in-memory sessions, local file cache), you can't route any request to any server
- Cost comparison: two 8-core servers is often cheaper and more resilient than one 16-core server for the same throughput
- Typical progression: vertical first (simple), then add read replicas (offload reads), then horizontal app servers behind load balancer, then cache layer, then DB sharding (last resort)

**Key points:** Design apps to be stateless from day one — it keeps horizontal scaling as an option. Start with vertical scaling for databases; horizontal for stateless apps.

**Follow-up:** What changes in your application to support horizontal scaling? → Move sessions to Redis (or use JWTs), move file uploads to object storage (S3), remove in-process caching (use Redis), use distributed locking (Redis/Zookeeper) instead of process-level mutexes, ensure scheduled jobs run only once (use a queue, not multiple crons).

---

### 51. What is the circuit breaker pattern? `[Senior]`

**Answer:**
- The circuit breaker prevents a failing dependency from cascading failures through your system — like an electrical circuit breaker that trips to protect wiring
- **Three states:**
  - **Closed (normal)** — requests pass through to the dependency; failure counter tracks recent failures
  - **Open (tripped)** — after N failures in a window, circuit opens; all requests fail fast with a fallback response (no wait for timeout); error rate stays contained
  - **Half-Open (probing)** — after a cool-down period, allows one test request through; if it succeeds, circuit closes (recover); if it fails, circuit stays open
- Without a circuit breaker: if your payment service times out at 30s and you have 100 req/s, you quickly accumulate 3,000 threads all blocked on payment — your entire app crashes
- With a circuit breaker: after 5 failures, circuit opens; requests get an instant `503` or fallback, freeing threads; service recovers without cascading
- Implementation (using `opossum` in Node.js):
  ```js
  const CircuitBreaker = require('opossum');

  const breaker = new CircuitBreaker(callPaymentService, {
    errorThresholdPercentage: 50, // Open when 50% of requests fail
    resetTimeout: 30000,          // Try half-open after 30s
    timeout: 3000,                // Fail fast after 3s
    volumeThreshold: 5,           // Min calls before tripping
  });

  breaker.fallback(() => ({ error: 'Payment service unavailable, try again' }));
  breaker.on('open', () => logger.warn('Circuit opened — payment service failing'));
  breaker.on('close', () => logger.info('Circuit closed — payment service recovered'));

  const result = await breaker.fire(paymentData);
  ```
- Related patterns: **Retry with exponential backoff** (retry transient errors), **Timeout** (don't wait forever), **Bulkhead** (isolate failure domains with separate thread pools)

**Key points:** Circuit breaker + timeout + retry form the "stability patterns" trio. Fail fast is almost always better than slow failure. Always implement fallback behavior.

**Follow-up:** How do you test a circuit breaker? → Use chaos engineering tools (Chaos Monkey, Gremlin) to intentionally kill downstream services. Write integration tests that mock the downstream service to return errors and verify the circuit opens, then recovers. Monitor circuit state as a metric in your APM.

---

### 52. How do you implement health checks for a production service? `[Mid]`

**Answer:**
- Health checks allow load balancers, orchestrators (Kubernetes), and monitoring systems to know if your service is functioning
- **Two types:**
  - **Liveness probe** — is the process alive? Simple check; if it fails, restart the container. Should never block or check external dependencies:
    ```js
    app.get('/health/live', (req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });
    ```
  - **Readiness probe** — is the service ready to accept traffic? Check all critical dependencies:
    ```js
    app.get('/health/ready', async (req, res) => {
      const checks = await Promise.allSettled([
        db.query('SELECT 1'),
        redis.ping(),
        checkExternalAPI(),
      ]);

      const results = {
        database: checks[0].status === 'fulfilled' ? 'ok' : 'fail',
        redis: checks[1].status === 'fulfilled' ? 'ok' : 'fail',
        externalApi: checks[2].status === 'fulfilled' ? 'ok' : 'fail',
      };

      const allHealthy = Object.values(results).every(v => v === 'ok');
      res.status(allHealthy ? 200 : 503).json({ status: allHealthy ? 'ok' : 'degraded', checks: results });
    });
    ```
- **Kubernetes probes:**
  ```yaml
  livenessProbe:
    httpGet:
      path: /health/live
      port: 3000
    initialDelaySeconds: 15
    periodSeconds: 10
  readinessProbe:
    httpGet:
      path: /health/ready
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 3
  ```
- Health check endpoint should NOT require authentication — load balancers and orchestrators won't have credentials
- Include version info in response for deployment verification: `{ version: process.env.APP_VERSION }`
- **Graceful shutdown**: on `SIGTERM`, stop accepting new requests, finish in-flight requests (drain), then exit

**Key points:** Separate liveness and readiness checks. Readiness checks prevent traffic during startup and dependency outages. Implement graceful shutdown to avoid dropped requests during deploys.

**Follow-up:** What is a deep health check and when is it appropriate? → A deep health check runs actual business-level validations (e.g., read and write a test record). It's too slow and risky for frequent automated probes but useful for smoke testing after deployment. Keep `/health/ready` lightweight (just connectivity checks); reserve deep checks for post-deploy validation scripts.

---

### 53. What should structured logging look like in a production Node.js app? `[Mid]`

**Answer:**
- Structured logging outputs JSON instead of plaintext — machines can parse and query it:
  ```js
  // Bad: plaintext (hard to query, parse, or alert on)
  console.log(`User 123 logged in from 192.168.1.1`);

  // Good: structured JSON
  logger.info({
    event: 'user.login',
    userId: 123,
    ip: '192.168.1.1',
    userAgent: req.headers['user-agent'],
    duration: 45, // ms
  });
  ```
- **Use a proper logging library**: `pino` (fastest in Node.js) or `winston`:
  ```js
  const pino = require('pino');
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    serializers: pino.stdSerializers, // Serialize Error objects properly
  });
  ```
- **Log levels**: `trace` (verbose debug) → `debug` → `info` → `warn` → `error` → `fatal`; set `info` in production, `debug` in development
- **Always include** in every log: timestamp (ISO 8601), log level, service name, request ID (for tracing a request through logs), environment
- **Request ID / trace ID**: generate UUID per request; pass through all downstream calls via headers (`X-Request-Id`, `X-Trace-Id`); include in every log line for correlation:
  ```js
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    req.log = logger.child({ requestId: req.id, method: req.method, path: req.path });
    next();
  });
  ```
- **Never log**: passwords, tokens, credit card numbers, PII (or redact before logging)
- Ship logs to a centralized system: ELK Stack (Elasticsearch + Logstash + Kibana), Datadog Logs, AWS CloudWatch, Loki + Grafana

**Key points:** Structured JSON logging is the foundation of observability. Correlation IDs (request/trace IDs) are essential for debugging distributed systems. Always redact sensitive data.

**Follow-up:** What is the difference between logging, metrics, and tracing (the observability pillars)? → Logs: discrete events with context (what happened). Metrics: numerical measurements over time (latency p99, error rate, request count) — queryable, aggregatable. Traces: end-to-end journey of a request across services (distributed tracing — Jaeger, Zipkin, AWS X-Ray). All three together give full observability; logs alone are insufficient for distributed systems.

---

### 54. What is APM (Application Performance Monitoring) and what metrics matter most? `[Mid]`

**Answer:**
- APM tools (Datadog, New Relic, Dynatrace, Elastic APM) automatically instrument your application to track performance, errors, and dependencies
- **Four Golden Signals** (Google SRE Book):
  - **Latency** — how long requests take; track percentiles (p50, p95, p99) not just averages; a p99 of 2s means 1% of users wait 2+ seconds
  - **Traffic** — requests per second; baseline for capacity planning
  - **Errors** — error rate (4xx/5xx per total requests); distinguish client errors (4xx, often not actionable) from server errors (5xx)
  - **Saturation** — how full your resources are (CPU %, memory %, connection pool usage, queue depth)
- **Key metrics to monitor:**
  - HTTP: `p95_response_time`, `error_rate`, `requests_per_second` by endpoint
  - Database: `query_duration_p95`, `connection_pool_used`, `slow_query_count`, `replication_lag`
  - Cache: `hit_rate`, `eviction_rate`, `memory_used`
  - Queue: `queue_depth`, `processing_time`, `dead_letter_count`
  - System: `cpu_usage`, `memory_used`, `gc_pause_duration` (Node.js GC pauses)
- **SLOs (Service Level Objectives)**: define target values (`p99 latency < 500ms`, `error rate < 0.1%`); alert when you're trending toward violation before you breach
- **Alerting principles**: alert on symptoms (high error rate), not causes (CPU spike); pages should be actionable; avoid alert fatigue with good thresholds

**Key points:** Track the four golden signals. Set SLOs before you need them. Alert on symptoms visible to users, not internal resource metrics.

**Follow-up:** What is the difference between an SLI, SLO, and SLA? → SLI (Service Level Indicator): the actual metric (`p99 latency = 450ms`). SLO (Service Level Objective): the target your team sets internally (`p99 < 500ms for 99.9% of requests`). SLA (Service Level Agreement): contractual commitment to customers with financial penalties for breach — usually less strict than your internal SLO.

---

### 55. How do you approach microservices vs monolith architecture decisions? `[Senior]`

**Answer:**
- **Start with a monolith** — Martin Fowler's monolith-first strategy: understand your domain boundaries before distributing them; premature microservices decomposition is one of the most costly architectural mistakes
- **When a monolith works well:**
  - Team is small (fewer than 10 engineers)
  - Domain is not yet fully understood
  - Simple deployment and debugging — single process, single log stream, no network hops between modules
  - Transactions across "services" are just function calls (atomic, free)
- **When to consider microservices:**
  - Different components have radically different scaling needs (auth can scale independently of video transcoding)
  - Teams need deployment independence (10+ teams stepping on each other's releases)
  - Technology isolation is needed (Python ML model alongside Go API)
  - Regulatory isolation (PCI-scoped payment service, HIPAA-scoped health data)
  - Clear, stable domain boundaries identified after living with the monolith
- **Microservices costs (often underestimated):**
  - Network calls between services add latency and failure modes (circuit breakers, retries, timeouts needed)
  - Distributed transactions across services require sagas or 2PC — complex
  - Observability becomes harder (distributed tracing required)
  - Deployment complexity multiplies: each service needs its own CI/CD, health checks, scaling policy
  - Service discovery, API gateway, inter-service auth (service mesh)
- **Modular monolith** is the middle ground: strict internal module boundaries (separate packages, clear interfaces, no circular dependencies) that can be extracted to services later if needed — best of both worlds
- Decision framework: if you can't clearly explain which microservice owns each piece of data and why, you're not ready to split

**Key points:** Microservices solve organizational and scaling problems, not technical ones. Start monolith, extract services only with clear justification. A modular monolith is often the right long-term architecture for most companies.

**Follow-up:** How do you break up a monolith incrementally without rewriting everything? → Strangler Fig pattern: build the new service alongside the monolith; use a proxy/router to route some traffic to the new service; gradually shift 100% of that feature's traffic; decommission the monolith's version of that feature. Repeat for each domain. Never do a "big bang" rewrite.

---

*End of Backend Interview Vault — 55 questions*
