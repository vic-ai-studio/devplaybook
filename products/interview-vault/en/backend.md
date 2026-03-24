# Backend Interview Questions

**55 questions** covering REST APIs, Node.js, Databases, Authentication, Security, and Caching.

---

## REST APIs & HTTP (12 questions)

### 1. What are the HTTP methods and when do you use each? `[Junior]`

**Answer:**
| Method | Purpose | Idempotent | Safe |
|--------|---------|-----------|------|
| GET | Read data | ✅ | ✅ |
| POST | Create data | ❌ | ❌ |
| PUT | Replace entire resource | ✅ | ❌ |
| PATCH | Partial update | ❌ | ❌ |
| DELETE | Delete resource | ✅ | ❌ |
| HEAD | Like GET, no body | ✅ | ✅ |
| OPTIONS | CORS preflight | ✅ | ✅ |

**Idempotent:** Calling multiple times has same effect as calling once. **Safe:** No side effects.

---

### 2. What are HTTP status codes? Give examples. `[Junior]`

**Answer:**
- **1xx Informational:** 100 Continue
- **2xx Success:** 200 OK, 201 Created, 204 No Content
- **3xx Redirection:** 301 Moved Permanently, 302 Found, 304 Not Modified
- **4xx Client Error:** 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests
- **5xx Server Error:** 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable

**Common mistakes:** Using 200 for errors, confusing 401 (not authenticated) with 403 (not authorized).

---

### 3. What is REST and what are its constraints? `[Mid]`

**Answer:**
REST (Representational State Transfer) is an architectural style with 6 constraints:
1. **Client-Server** — separation of concerns
2. **Stateless** — each request contains all needed info; no server-side session
3. **Cacheable** — responses declare if they're cacheable
4. **Layered System** — client doesn't know if connected directly to server or proxy
5. **Uniform Interface** — consistent URLs, HTTP methods, representations
6. **Code on Demand** (optional) — server can send executable code

**Follow-up:** What's the difference between REST and RESTful? → REST is the specification; RESTful describes an API that follows REST principles.

---

### 4. What is the difference between authentication and authorization? `[Junior]`

**Answer:**
- **Authentication** — verifying **who** you are (identity). "Are you really Alice?"
- **Authorization** — verifying **what** you can do (permissions). "Is Alice allowed to delete this?"

**In HTTP context:**
- 401 Unauthorized → authentication failed (misleadingly named; should be "unauthenticated")
- 403 Forbidden → authentication succeeded but authorization failed

---

### 5. How does CORS work? `[Mid]`

**Answer:**
CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts cross-origin HTTP requests.

**Simple requests** (GET/POST with simple headers): Browser sends request with `Origin` header. Server responds with `Access-Control-Allow-Origin`. If origin doesn't match, browser blocks the response.

**Preflight requests** (PUT/DELETE, custom headers, JSON): Browser sends `OPTIONS` first. Server responds with allowed methods/headers. Then browser sends actual request.

```
// Server response headers for CORS
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400  // cache preflight for 24h
```

**Note:** CORS is browser-enforced only. Server-to-server calls bypass CORS.

---

### 6. What is idempotency and why does it matter in API design? `[Mid]`

**Answer:**
An operation is idempotent if calling it multiple times has the same effect as calling it once.

**Why it matters:** Network failures may cause clients to retry. If the server handles the same request twice and creates two records, that's a problem.

**Making POST idempotent:** Use idempotency keys:
```
POST /payments
Idempotency-Key: a1b2c3d4
```
Server stores the key and returns cached response on duplicate requests. Stripe, Stripe, and most payment APIs use this pattern.

---

### 7. What is pagination and what are the common patterns? `[Mid]`

**Answer:**
**Offset pagination:**
```
GET /posts?offset=20&limit=10
```
Simple but slow at high offsets (DB scans all preceding rows). Can miss items if data changes between requests.

**Cursor pagination:**
```
GET /posts?cursor=eyJpZCI6MjB9&limit=10
```
Uses a stable pointer (typically encrypted last item ID/timestamp). Consistent performance. Can't jump to page N. Best for feeds.

**Keyset pagination:**
```
GET /posts?after_id=20&limit=10
```
Similar to cursor but uses actual field values. Requires indexed column.

---

### 8. How do you version a REST API? `[Mid]`

**Answer:**
**URL versioning:** `/api/v1/users` — most visible, easy to route, breaks cacheability
**Header versioning:** `Accept: application/vnd.api+json; version=1` — cleaner URLs, harder to test
**Query param:** `/api/users?version=1` — easy but clutters URLs
**Content negotiation:** `Accept: application/vnd.myapp.user.v2+json`

**Best practice:** URL versioning for public APIs (explicit, easy to document). Don't version every change — only breaking changes require a new version. Support N-1 versions.

---

### 9. What is GraphQL and how does it differ from REST? `[Mid]`

**Answer:**
GraphQL is a query language for APIs where the client specifies exactly what data it needs:

```graphql
query {
  user(id: "1") {
    name
    posts(limit: 5) {
      title
      createdAt
    }
  }
}
```

| | REST | GraphQL |
|---|---|---|
| Endpoints | Multiple (`/users`, `/posts`) | Single (`/graphql`) |
| Over-fetching | Common | Eliminated |
| Under-fetching | Common (N+1) | Eliminated |
| Type system | Optional | Built-in |
| Caching | HTTP cache | App-level |
| Learning curve | Low | Higher |

---

### 10. What is the N+1 query problem? `[Mid]`

**Answer:**
N+1 occurs when fetching a list triggers N additional queries for each item:

```javascript
// N+1 problem
const posts = await db.posts.findAll();        // 1 query
for (const post of posts) {
  post.author = await db.users.findById(post.authorId); // N queries
}

// Solution: JOIN or batch loading
const posts = await db.posts.findAll({
  include: [{ model: User, as: 'author' }]  // 1 query with JOIN
});

// Or: DataLoader pattern (batch + cache)
const authorLoader = new DataLoader(ids => User.findAll({ where: { id: ids } }));
```

**In GraphQL:** Use DataLoader to batch and cache resolver calls.

---

### 11. What is rate limiting and how do you implement it? `[Mid]`

**Answer:**
Rate limiting restricts how many requests a client can make in a time window.

**Algorithms:**
- **Fixed window:** Count requests per window (e.g., 100/minute). Burst at window boundary.
- **Sliding window:** More accurate. Redis `ZRANGEBYSCORE` with timestamps.
- **Token bucket:** Tokens replenish at fixed rate. Allows bursts up to bucket size.
- **Leaky bucket:** Requests processed at fixed rate. Smooths traffic.

```javascript
// Express middleware with rate-limiter-flexible
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 100,    // requests
  duration: 60,   // per 60 seconds
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

---

### 12. What HTTP caching mechanisms exist? `[Senior]`

**Answer:**
**Cache-Control header:**
```
Cache-Control: max-age=3600          # cache for 1 hour
Cache-Control: no-cache              # must revalidate with server
Cache-Control: no-store              # never cache
Cache-Control: private               # browser only, not CDN
Cache-Control: public, max-age=86400 # CDN + browser cache
```

**ETag:** Server generates hash of response. Client sends `If-None-Match: "abc123"`. Server returns 304 if unchanged.

**Last-Modified:** Server sends `Last-Modified` date. Client sends `If-Modified-Since`. Server returns 304 if unchanged.

**CDN:** Distributes cached responses globally. Reduces origin server load.

---

## Node.js (10 questions)

### 13. What is the Node.js event loop? How does it differ from the browser's? `[Mid]`

**Answer:**
Node.js event loop has distinct phases (libuv):
1. **timers** — `setTimeout`, `setInterval` callbacks
2. **pending callbacks** — I/O errors deferred from previous iteration
3. **idle, prepare** — internal use
4. **poll** — retrieve new I/O events
5. **check** — `setImmediate` callbacks
6. **close callbacks** — e.g., `socket.on('close')`

**Between each phase:** `process.nextTick()` and Promise microtasks drain completely.

**vs Browser:** Same conceptual loop but different implementation. `process.nextTick` (Node) has no browser equivalent. `setImmediate` (Node) = `window.setImmediate` (not standard). Node has file I/O phases.

---

### 14. What is `process.nextTick` vs `setImmediate` vs `setTimeout`? `[Senior]`

**Answer:**
- `process.nextTick(cb)` — runs **immediately** after current operation, before I/O. Highest priority. Can starve I/O if called recursively.
- `setImmediate(cb)` — runs in the **check** phase, after I/O callbacks in current iteration.
- `setTimeout(cb, 0)` — runs in **timers** phase of the next iteration (minimum 1ms delay in practice).

**Order when all queued:**
```
current sync → nextTick → microtasks → setImmediate → setTimeout(0)
```

---

### 15. How do Node.js streams work? `[Senior]`

**Answer:**
Streams process data in chunks instead of loading everything into memory:

```javascript
// Readable stream
fs.createReadStream('large-file.csv')
  .pipe(csv.parse())       // Transform stream
  .pipe(db.writeStream())  // Writable stream

// Custom transform
const upper = new Transform({
  transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());
  }
});
```

**Types:** Readable, Writable, Duplex (both), Transform (duplex that modifies data)

**Backpressure:** Writable stream signals when its internal buffer is full. Use `.pipe()` or check `.write()` return value to handle it.

---

### 16. What is the difference between `require` and dynamic `import()` in Node.js? `[Mid]`

**Answer:**
- `require()` — synchronous, CommonJS. Loads module into cache, blocks execution.
- `import()` — dynamic, returns Promise. Can be used anywhere, including inside conditions.

```javascript
// require (sync)
const lodash = require('lodash'); // blocks

// Dynamic import (async)
const { chunk } = await import('lodash'); // non-blocking

// Conditional loading (only dynamic import supports this)
const module = condition ? await import('./a') : await import('./b');
```

**Why it matters:** Dynamic import enables code splitting and lazy loading in Node.js and bundlers.

---

### 17. How do you handle unhandled promise rejections in Node.js? `[Mid]`

**Answer:**
```javascript
// Listen for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
  // Don't crash in production for non-critical errors
  // But for critical errors, shut down gracefully:
  gracefulShutdown();
});

// Listen for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown(); // Always crash for uncaught sync errors
});

// Node.js 15+: unhandled rejections terminate the process by default
// Use --unhandled-rejections=warn to change behavior
```

---

### 18. What is clustering in Node.js? `[Senior]`

**Answer:**
Node.js is single-threaded. Clustering spawns multiple worker processes, each with its own event loop, to use all CPU cores:

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    cluster.fork(); // Restart dead workers
  });
} else {
  app.listen(3000); // Each worker listens (OS load-balances)
}
```

**Alternative:** PM2 cluster mode does this automatically. Worker threads (`worker_threads`) for CPU-bound tasks (share memory, no HTTP).

---

### 19. What is middleware in Express.js? `[Junior]`

**Answer:**
Middleware functions have access to `(req, res, next)` and can execute code, modify req/res, end the request cycle, or pass to the next middleware.

```javascript
// Application-level middleware
app.use((req, res, next) => {
  req.requestTime = Date.now();
  next(); // Pass to next middleware
});

// Error-handling middleware (4 params)
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Router-level
const router = express.Router();
router.use(authenticate); // runs for all routes in this router
```

---

### 20. How do you structure a Node.js project? `[Mid]`

**Answer:**
```
src/
├── controllers/    # Request handling, input validation
├── services/       # Business logic
├── repositories/   # Database access
├── models/         # Data schemas
├── middleware/      # Auth, logging, error handling
├── routes/         # Express route definitions
├── utils/          # Shared utilities
├── config/         # Environment configuration
└── app.ts          # Express app setup

# Separation of concerns:
Route → Controller → Service → Repository → Database
```

**Key principle:** Controllers should be thin (parse input, call service, return response). Business logic lives in services. Database queries in repositories.

---

### 21. How do you perform graceful shutdown in Node.js? `[Senior]`

**Answer:**
```javascript
const server = app.listen(3000);

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async () => {
    // Wait for in-flight requests to complete
    await closeDatabase();
    await closeRedis();
    await flushLogs();
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

---

### 22. What is dependency injection and how do you use it in Node.js? `[Senior]`

**Answer:**
DI is providing dependencies from outside rather than creating them inside. Improves testability and flexibility:

```javascript
// Without DI (hard to test)
class UserService {
  async getUser(id) {
    const db = new Database(); // tightly coupled
    return db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// With DI (testable)
class UserService {
  constructor(private db: Database) {}

  async getUser(id: string) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

// In tests:
const mockDb = { query: jest.fn().mockResolvedValue({ id: '1', name: 'Alice' }) };
const service = new UserService(mockDb);
```

---

## Databases (15 questions)

### 23. What is the difference between SQL and NoSQL databases? `[Junior]`

**Answer:**
| | SQL (Relational) | NoSQL |
|---|---|---|
| Schema | Fixed, predefined | Flexible, dynamic |
| Data model | Tables, rows, columns | Documents, key-value, graph, column |
| Joins | Native | Typically avoided |
| Transactions | ACID | Eventually consistent (varies) |
| Scaling | Vertical (traditionally) | Horizontal |
| Query language | SQL (standardized) | API-specific |
| Examples | PostgreSQL, MySQL | MongoDB, Redis, DynamoDB, Cassandra |

**When to use SQL:** Complex relationships, transactions, reporting. **NoSQL:** High-volume, flexible schema, specific data access patterns.

---

### 24. What are database indexes and how do they work? `[Mid]`

**Answer:**
An index is a separate data structure (typically a B-tree) that allows fast lookups on a column without scanning the entire table.

```sql
-- Without index: full table scan O(n)
SELECT * FROM users WHERE email = 'alice@example.com';

-- Create index
CREATE INDEX idx_users_email ON users(email);
-- Now: B-tree lookup O(log n)

-- Composite index
CREATE INDEX idx_users_email_status ON users(email, status);
-- Useful for queries filtering on both email AND status
```

**Trade-offs:** Indexes speed up reads but slow down writes (index must be maintained). Composite indexes follow leftmost prefix rule.

**When NOT to index:** Small tables, columns with very low cardinality (e.g., boolean), frequently updated columns.

---

### 25. What is database normalization? `[Mid]`

**Answer:**
Normalization reduces data redundancy by organizing data into related tables:

- **1NF:** Atomic values, no repeating groups
- **2NF:** No partial dependencies (non-key columns depend on the whole primary key)
- **3NF:** No transitive dependencies (non-key columns depend only on the primary key)

**Example:** Customer orders table with customer name/address repeated in every order row → violates 3NF. Fix: separate `customers` table, reference by foreign key.

**Denormalization:** Intentionally adding redundancy for read performance (e.g., caching computed fields, embedding data in NoSQL).

---

### 26. What are database transactions and ACID properties? `[Mid]`

**Answer:**
A transaction is a unit of work that is either committed entirely or rolled back:

- **Atomicity** — All operations succeed or none do
- **Consistency** — Data moves from one valid state to another (constraints maintained)
- **Isolation** — Concurrent transactions don't interfere with each other
- **Durability** — Committed transactions survive crashes (written to disk)

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
-- If either fails, both are rolled back
COMMIT;
```

---

### 27. What are transaction isolation levels? `[Senior]`

**Answer:**
Isolation levels trade off consistency vs. performance. In order of increasing isolation:

| Level | Dirty Read | Non-repeatable Read | Phantom Read |
|-------|-----------|--------------------|--------------|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | ❌ | Possible | Possible |
| REPEATABLE READ | ❌ | ❌ | Possible |
| SERIALIZABLE | ❌ | ❌ | ❌ |

- **Dirty read:** Reading uncommitted data from another transaction
- **Non-repeatable read:** Same query returns different row values within a transaction
- **Phantom read:** Same range query returns different rows within a transaction

PostgreSQL default: READ COMMITTED. MySQL InnoDB default: REPEATABLE READ.

---

### 28. What is a database connection pool? `[Mid]`

**Answer:**
Opening a DB connection is expensive (TCP handshake, authentication). A connection pool maintains a set of pre-opened connections:

```javascript
// pg (PostgreSQL)
const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  max: 20,          // max connections
  min: 2,           // idle connections kept alive
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
```

**Sizing:** `max = (core count * 2) + effective spindle count` (common rule). Too many connections overwhelm the DB.

---

### 29. What is an ORM? What are its pros and cons? `[Mid]`

**Answer:**
ORM (Object-Relational Mapper) translates between objects in code and rows in a database.

**Pros:**
- No raw SQL — fewer injection risks
- Automatic migrations and schema management
- Works across database vendors
- Relationships (includes, joins) are easier

**Cons:**
- Performance: auto-generated queries aren't always optimal (N+1 problem)
- Complex queries are awkward
- ORM magic can obscure what's happening
- Lock-in to ORM abstractions

**Popular ORMs:** Prisma (TypeScript-first, type-safe), TypeORM, Sequelize (Node.js), SQLAlchemy (Python), ActiveRecord (Rails).

---

### 30. What is the difference between a LEFT JOIN, INNER JOIN, and FULL OUTER JOIN? `[Mid]`

**Answer:**
```sql
-- INNER JOIN: only rows with matches in both tables
SELECT * FROM orders o INNER JOIN customers c ON o.customer_id = c.id;

-- LEFT JOIN: all rows from left, matched rows from right (NULLs if no match)
SELECT * FROM customers c LEFT JOIN orders o ON c.id = o.customer_id;
-- Returns ALL customers, even those with no orders

-- RIGHT JOIN: all rows from right, matched from left (rarely used)

-- FULL OUTER JOIN: all rows from both tables (NULLs where no match)
SELECT * FROM customers c FULL OUTER JOIN orders o ON c.id = o.customer_id;
```

---

### 31. What is database sharding? `[Senior]`

**Answer:**
Sharding is horizontal partitioning — splitting data across multiple database instances (shards) based on a shard key:

```
Users 1-1M  → Shard 1
Users 1M-2M → Shard 2
Users 2M+   → Shard 3
```

**Shard strategies:**
- **Range-based:** Simple but uneven distribution (hot shards)
- **Hash-based:** Uniform distribution but can't do range queries
- **Directory-based:** Lookup service maps key to shard. Flexible but lookup adds latency.

**Challenges:** Cross-shard queries, joins, transactions. Re-sharding is very painful. Use when you've exhausted vertical scaling and read replicas.

---

### 32. What is eventual consistency? `[Senior]`

**Answer:**
In distributed systems, eventually consistent means all nodes will converge to the same state eventually (if no new updates), but may temporarily return different values.

**Example:** Write to a primary DB, read from a replica. The replica may not have the write yet — stale read.

**CAP Theorem:** A distributed system can only guarantee 2 of: Consistency, Availability, Partition tolerance.

**When it's acceptable:** Social media feed, like counts, product recommendations. **When it's NOT:** Bank balances, inventory counts, booking systems.

---

### 33. What is Redis and what are its use cases? `[Mid]`

**Answer:**
Redis is an in-memory key-value store with persistence options and rich data structures.

**Data structures:** Strings, Lists, Sets, Sorted Sets, Hashes, Streams, Bitmaps, HyperLogLog

**Use cases:**
- **Caching:** Store expensive DB query results
- **Session storage:** Fast read/write for user sessions
- **Rate limiting:** Atomic increment with TTL
- **Pub/Sub:** Real-time messaging
- **Queues:** Lists as job queues (or use Redis Streams)
- **Leaderboards:** Sorted Sets for real-time rankings
- **Distributed locks:** SETNX + expire

---

### 34. How do you handle database migrations? `[Mid]`

**Answer:**
Migrations are version-controlled scripts that modify the database schema:

```
# Migration files (one per change, timestamped)
migrations/
  20240101_create_users.sql
  20240115_add_email_index.sql
  20240201_add_profile_table.sql
```

**Best practices:**
- Always have an `up` and `down` migration
- Migrations are immutable — never edit an existing migration
- Apply in CI before deploying app code (or use expand-contract pattern)
- Use tools: Flyway, Liquibase, Prisma Migrate, Knex.js

**Zero-downtime migrations:** Add column (nullable) → deploy code → backfill data → add constraint → remove old column.

---

### 35. What is query optimization and how do you debug slow queries? `[Senior]`

**Answer:**
**Tools:**
- `EXPLAIN ANALYZE` (PostgreSQL) — shows query plan with actual timing
- Slow query log (MySQL/PostgreSQL) — logs queries over a threshold
- `pg_stat_statements` — aggregate query statistics

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 123;
-- Look for: Seq Scan (bad on large tables), missing index, N+1 in loops
```

**Common fixes:**
1. Add missing index on frequently filtered/sorted columns
2. Avoid `SELECT *` — select only needed columns
3. Fix N+1 with JOINs or batch loading
4. Use query result caching
5. Partition large tables
6. Avoid functions on indexed columns in WHERE clauses: `WHERE DATE(created_at) = '2024-01-01'` prevents index use; use `WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02'`

---

## Authentication & Security (13 questions)

### 36. How does JWT authentication work? `[Mid]`

**Answer:**
JWT (JSON Web Token) is a self-contained token with three Base64-encoded parts: `header.payload.signature`.

**Flow:**
1. User logs in with credentials
2. Server validates, creates JWT: `{ userId, email, exp }` + signs with secret key
3. Client stores JWT (localStorage or httpOnly cookie)
4. Client sends JWT in `Authorization: Bearer <token>` header
5. Server validates signature — no DB lookup needed

**Pros:** Stateless, scalable, works across services. **Cons:** Can't invalidate single tokens (must use short expiry + refresh tokens), larger than session IDs.

```javascript
// Sign
const token = jwt.sign({ userId: '123' }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Verify
const payload = jwt.verify(token, process.env.JWT_SECRET); // throws if invalid
```

---

### 37. What is the difference between JWT and session-based authentication? `[Mid]`

**Answer:**
| | Sessions | JWT |
|---|---|---|
| Storage | Server (DB/Redis) | Client (token) |
| Scalability | Needs shared session store | Stateless |
| Revocation | Easy (delete from store) | Hard (need token blocklist) |
| Size | Small (session ID) | Larger (token payload) |
| Performance | DB lookup per request | Signature verification only |
| Security | httpOnly cookie | Depends on storage |

**Follow-up:** Where to store JWT? → httpOnly cookie (safest, prevents XSS access) for web apps. In memory for SPAs. Avoid localStorage (XSS vulnerable).

---

### 38. What is OAuth 2.0 and how does it work? `[Senior]`

**Answer:**
OAuth 2.0 is an authorization framework that lets users grant third-party apps access to their resources without sharing passwords.

**Authorization Code Flow (most secure, for server-side apps):**
1. App redirects user to provider (Google) with `client_id`, `scope`, `redirect_uri`
2. User authenticates and consents
3. Provider redirects to `redirect_uri` with `code`
4. App exchanges `code` + `client_secret` for `access_token` (server-side only)
5. App uses `access_token` to call API on user's behalf

**Key roles:** Resource Owner (user), Client (your app), Authorization Server (Google/GitHub), Resource Server (API).

**PKCE** — required for SPAs/mobile apps (no client secret) to prevent code interception.

---

### 39. What is password hashing and how should you store passwords? `[Mid]`

**Answer:**
Never store passwords in plaintext or with reversible encryption. Use a slow, purpose-built hashing algorithm:

```javascript
// bcrypt (common, safe)
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Hash on registration
const hash = await bcrypt.hash(password, SALT_ROUNDS);
await db.users.create({ email, passwordHash: hash });

// Verify on login
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

**Why slow algorithms?** Brute force is computationally expensive. bcrypt/scrypt/Argon2 have configurable work factors.

**Best algorithms (2024):** Argon2id (winner of PHC, recommended), bcrypt (battle-tested), scrypt.

**Never use:** MD5, SHA-1, SHA-256 (fast → easy to brute force).

---

### 40. What is SQL injection and how do you prevent it? `[Junior]`

**Answer:**
SQL injection occurs when untrusted input is interpolated into SQL queries:

```javascript
// VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`;
// Input: ' OR '1'='1
// Becomes: SELECT * FROM users WHERE email = '' OR '1'='1'

// SAFE: Parameterized queries
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]  // Driver handles escaping
);

// ORM (safe by default)
const user = await User.findOne({ where: { email } }); // Prisma, Sequelize, etc.
```

**Other injection types:** NoSQL injection, command injection, LDAP injection, XML injection. Always validate and sanitize inputs, use parameterized queries.

---

### 41. What is XSS and how do you prevent it? `[Mid]`

**Answer:**
XSS (Cross-Site Scripting) occurs when malicious scripts are injected into web pages:

**Types:**
- **Stored XSS:** Malicious script stored in DB, executed when other users view it
- **Reflected XSS:** Script in URL parameter reflected in response
- **DOM XSS:** Client-side code writes untrusted data to DOM

**Prevention:**
```javascript
// React's JSX auto-escapes — don't use dangerouslySetInnerHTML with untrusted data

// Sanitize if you must render HTML
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userContent);

// CSP Header
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123'

// httpOnly cookies — JS can't access them even if XSS occurs
```

---

### 42. What is CSRF and how do you prevent it? `[Mid]`

**Answer:**
CSRF (Cross-Site Request Forgery) tricks authenticated users into making unintended requests to your site:

```
1. User is logged in to bank.com (has session cookie)
2. User visits evil.com
3. evil.com has <img src="bank.com/transfer?amount=1000&to=attacker">
4. Browser auto-sends session cookie — transfer executes!
```

**Prevention:**
- **CSRF tokens:** Server generates unique token per session. Client includes in form/header. Server validates.
- **SameSite cookie attribute:** `SameSite=Strict/Lax` — browser won't send cookie on cross-site requests
- **Double Submit Cookie:** Set random CSRF cookie + require it in request header (CORS prevents attacker from reading cookies)

---

### 43. What is HTTPS and how does TLS work? `[Mid]`

**Answer:**
TLS (Transport Layer Security) encrypts communication between client and server:

**TLS Handshake (simplified):**
1. Client → Server: Supported TLS versions, cipher suites, random nonce
2. Server → Client: Certificate (containing public key), chosen cipher suite, random nonce
3. Client validates certificate against CA (Certificate Authority)
4. Key exchange (e.g., ECDH) → both derive same session key
5. Communication encrypted with symmetric session key

**What it provides:**
- **Encryption** — data is unreadable in transit
- **Authentication** — server's identity verified via certificate
- **Integrity** — data can't be modified without detection (MAC)

---

### 44. What is the principle of least privilege? `[Mid]`

**Answer:**
Grant the minimum permissions needed to perform a task, nothing more.

**In practice:**
- DB user for your app should only have SELECT/INSERT/UPDATE/DELETE on specific tables, NOT CREATE/DROP/ALTER
- API keys should be scoped to specific endpoints
- Service accounts should have minimal IAM roles
- Admin endpoints should have separate, stronger authentication
- Sensitive operations should require elevated authentication (re-auth for password changes)

**Why it matters:** Limits blast radius if a component is compromised. An SQL injection in an app with `db_owner` permissions is far worse than one with limited permissions.

---

### 45. How do you secure environment variables and secrets? `[Mid]`

**Answer:**
**Never:**
- Commit secrets to version control
- Log secrets
- Hardcode in source code
- Put in environment variable names that could be dumped

**Do:**
```bash
# .env files for local dev only (add to .gitignore)
DATABASE_URL=postgresql://...

# Production: use secrets managers
# AWS Secrets Manager
const secret = await secretsManager.getSecretValue({ SecretId: 'prod/db' });

# Kubernetes secrets
# HashiCorp Vault
# GitHub Actions secrets
```

**Rotation:** Implement secret rotation. Services should handle credential rotation without downtime.

---

### 46. What is input validation and sanitization? `[Mid]`

**Answer:**
- **Validation:** Check that input conforms to expected format (type, length, pattern)
- **Sanitization:** Clean input by removing/escaping potentially dangerous characters

```javascript
// Zod schema validation (TypeScript)
const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),
});

app.post('/users', async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  const { data } = result; // Fully typed and validated
  await createUser(data);
});
```

**Rule:** Validate at the boundary. Never trust data from clients, external APIs, or even other internal services.

---

### 47. What are common security headers and what do they do? `[Senior]`

**Answer:**
```
Content-Security-Policy: default-src 'self'   # Prevent XSS
Strict-Transport-Security: max-age=31536000    # Force HTTPS
X-Content-Type-Options: nosniff               # Prevent MIME sniffing
X-Frame-Options: DENY                         # Prevent clickjacking
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=()  # Disable browser features
```

**Use Helmet.js** in Express:
```javascript
import helmet from 'helmet';
app.use(helmet()); // Sets all security headers with sensible defaults
```

---

### 48. What is a timing attack and how do you prevent it? `[Senior]`

**Answer:**
A timing attack extracts secrets by measuring how long operations take. For example, a naive string comparison (`===`) returns early on the first mismatched character — attackers can guess a token character by character by measuring response time.

```javascript
// VULNERABLE
if (userToken === expectedToken) { ... }

// SAFE: constant-time comparison
import { timingSafeEqual } from 'crypto';
const safe = timingSafeEqual(
  Buffer.from(userToken, 'hex'),
  Buffer.from(expectedToken, 'hex')
);
```

**Also applies to:** Password comparisons (bcrypt handles this), API key validation, HMAC verification.

---

## Caching & Performance (10 questions)

### 49. What is caching and what are the main caching strategies? `[Mid]`

**Answer:**
Caching stores computed results to serve future requests faster.

**Strategies:**
- **Cache-aside (Lazy loading):** App checks cache, if miss → query DB → store in cache. Most common.
- **Write-through:** Write to cache AND DB simultaneously. Cache always fresh, but write latency doubles.
- **Write-behind (Write-back):** Write to cache, async write to DB. Fast writes, risk of data loss.
- **Read-through:** Cache fetches from DB on miss automatically. App always reads from cache.
- **Refresh-ahead:** Proactively refresh cache before expiry. Reduces miss rate for predictable access patterns.

---

### 50. What is cache invalidation and why is it hard? `[Mid]`

**Answer:**
"There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

**Strategies:**
- **TTL (Time-to-Live):** Expire after a fixed time. Simple but may serve stale data.
- **Event-driven invalidation:** When data changes, explicitly delete/update cached value. More accurate but complex.
- **Cache tags:** Tag cached items, invalidate all with a given tag. Used by CDNs.

**Challenges:**
- Distributed caches may have inconsistent invalidation
- Racing invalidation (write + delete + re-read before invalidation propagates)
- What cache key to invalidate?

**Cache stampede:** Many requests simultaneously hit the DB on cache miss. Use probabilistic early expiration or locking.

---

### 51. What is CDN and how does it work? `[Mid]`

**Answer:**
A CDN (Content Delivery Network) is a geographically distributed network of servers that caches content closer to users.

**How it works:**
1. DNS resolves to nearest CDN edge node
2. Edge node checks its cache
3. Cache hit → serve directly (low latency)
4. Cache miss → fetch from origin, cache, serve

**What to cache:** Static assets (images, JS, CSS), API responses with `Cache-Control: public`, server-rendered HTML pages.

**Popular CDNs:** Cloudflare, AWS CloudFront, Fastly, Akamai.

**Edge computing:** CDNs now run code at edge (Cloudflare Workers, Vercel Edge Functions) — execute logic close to users.

---

### 52. What is a message queue and when would you use one? `[Senior]`

**Answer:**
A message queue decouples producers and consumers. Producers send messages without waiting for consumers to process them.

**Use cases:**
- Background jobs (send email, process images, generate reports)
- Load leveling (handle traffic spikes by queuing work)
- Microservices communication (async events)
- Guaranteed delivery (messages persist until processed)

```javascript
// Producer
await queue.add('sendEmail', { to: user.email, template: 'welcome' });

// Consumer (worker)
queue.process('sendEmail', async (job) => {
  await emailService.send(job.data);
});
```

**Popular tools:** Redis (BullMQ), RabbitMQ, Apache Kafka (high-throughput event streaming), AWS SQS.

---

### 53. What is the difference between horizontal and vertical scaling? `[Mid]`

**Answer:**
- **Vertical scaling (scale up):** Add more resources (CPU, RAM) to a single server. Simple, but has limits and causes downtime.
- **Horizontal scaling (scale out):** Add more servers. Requires stateless architecture, load balancing. Theoretically unlimited.

**For horizontal scaling, you need:**
- Stateless app servers (no local session state)
- Shared state in DB/Redis
- Load balancer (Nginx, AWS ALB)
- Health checks and auto-scaling

**Databases:** Vertical scaling first, then read replicas, then sharding as last resort.

---

### 54. What is WebSocket and when would you use it? `[Mid]`

**Answer:**
WebSocket provides a persistent, full-duplex TCP connection between client and server — both sides can push data at any time.

**vs HTTP polling:**
- Polling: Client requests every N seconds. Wasteful if no updates.
- Long-polling: Client request stays open until server has data. Better but still overhead.
- WebSocket: One persistent connection, real-time push from both sides.

**Use cases:** Real-time chat, live notifications, collaborative editing, live dashboards, online games.

```javascript
// Node.js (ws library)
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', (ws) => {
  ws.on('message', (msg) => console.log('Received:', msg));
  ws.send('Hello!');
});
```

---

### 55. What is the twelve-factor app methodology? `[Senior]`

**Answer:**
12 principles for building scalable, maintainable cloud-native apps:

1. **Codebase** — one repo, many deploys
2. **Dependencies** — explicitly declare (package.json, requirements.txt)
3. **Config** — store in environment, not code
4. **Backing services** — treat as attached resources (swappable URLs)
5. **Build, release, run** — separate stages
6. **Processes** — stateless, share-nothing processes
7. **Port binding** — export services via port
8. **Concurrency** — scale via process model
9. **Disposability** — fast startup, graceful shutdown
10. **Dev/prod parity** — keep environments similar
11. **Logs** — treat as event streams (stdout)
12. **Admin processes** — run as one-off processes
