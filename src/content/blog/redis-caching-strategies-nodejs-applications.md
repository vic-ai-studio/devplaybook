---
title: "Redis Caching Strategies for Node.js Applications"
description: "Master Redis caching in Node.js. Learn Cache-Aside, Write-Through, and Write-Back patterns with practical code examples, TTL strategies, and cache invalidation techniques."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["redis", "nodejs", "caching", "backend", "performance"]
readingTime: "10 min read"
---

Redis is the industry-standard caching layer for Node.js applications — but "add Redis" is where most tutorials stop. Knowing *how* to use Redis matters as much as using it at all.

This guide covers the caching patterns that actually ship in production, with real Node.js code.

---

## Why Cache?

Before patterns: a simple example. A product page queries the database on every load:

```
User Request → Node.js → PostgreSQL (8ms) → Response
```

At 100 req/s, that's 100 database queries/second. At 1000 req/s, you're looking at connection pooling limits, query queue buildup, and degraded response times.

With Redis:

```
User Request → Node.js → Redis HIT (0.3ms) → Response
                              ↓ MISS
                         PostgreSQL (8ms) → Redis (write) → Response
```

Cache hit rate of 90% means 90% of requests never touch the database.

---

## Setup

```bash
npm install ioredis
```

```typescript
// lib/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  // Reconnect on disconnect
  retryStrategy: (times) => Math.min(times * 50, 2000),
  // Lazy connect — don't crash on startup if Redis is down
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redis;
```

**ioredis vs node-redis**: Both are solid in 2026. `ioredis` has slightly nicer TypeScript types and built-in cluster support. `node-redis` (v4+) is the official Redis client and uses Promises natively. Use either.

---

## Pattern 1: Cache-Aside (Lazy Loading)

The most common pattern. Your application checks the cache first; if it's a miss, fetch from the database and populate the cache.

```typescript
// services/productService.ts
import redis from '../lib/redis';
import { db } from '../lib/db';

const PRODUCT_TTL = 60 * 5; // 5 minutes

export async function getProduct(id: string) {
  const cacheKey = `product:${id}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — query database
  const product = await db.query(
    'SELECT * FROM products WHERE id = $1',
    [id]
  );

  if (!product) return null;

  // 3. Populate cache with TTL
  await redis.setex(cacheKey, PRODUCT_TTL, JSON.stringify(product));

  return product;
}
```

**Pros**: Simple, only caches data that's actually requested ("hot" data).
**Cons**: Cache miss always hits the database (cold start problem). Race condition on concurrent misses (thundering herd — covered below).

---

## Pattern 2: Write-Through

When you update the database, you update the cache simultaneously.

```typescript
export async function updateProduct(id: string, data: Partial<Product>) {
  // 1. Update database
  const updated = await db.query(
    'UPDATE products SET name=$1, price=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
    [data.name, data.price, id]
  );

  // 2. Update cache (write-through)
  const cacheKey = `product:${id}`;
  await redis.setex(cacheKey, PRODUCT_TTL, JSON.stringify(updated));

  return updated;
}
```

**Pros**: Cache is always fresh after writes. No stale reads.
**Cons**: Every write touches both database and Redis. Higher write latency. Cache may hold data that's rarely read (cache pollution).

**When to use**: Write-through makes sense when you need read-after-write consistency (e.g., user profile updates that should be immediately visible).

---

## Pattern 3: Write-Behind (Write-Back)

Write to cache immediately, then asynchronously persist to the database. Very aggressive performance optimization.

```typescript
import { Queue } from 'bullmq'; // or any queue system

const writeQueue = new Queue('db-writes', { connection: redis });

export async function updateUserActivity(userId: string, activity: object) {
  const cacheKey = `user:activity:${userId}`;

  // 1. Write to Redis immediately (fast)
  await redis.setex(cacheKey, 3600, JSON.stringify(activity));

  // 2. Queue async DB write
  await writeQueue.add('persist-activity', { userId, activity });

  return activity;
}

// Worker processes the queue
// worker.ts
const worker = new Worker('db-writes', async (job) => {
  if (job.name === 'persist-activity') {
    await db.query(
      'INSERT INTO user_activity (user_id, data, created_at) VALUES ($1, $2, NOW())',
      [job.data.userId, JSON.stringify(job.data.activity)]
    );
  }
});
```

**Pros**: Extremely low write latency. Ideal for high-write, lower-consistency workloads (analytics events, view counts, real-time feeds).
**Cons**: Risk of data loss if Redis goes down before flush. Complexity of queue management. Not suitable for financial transactions.

---

## Pattern 4: Cache Stampede Prevention

When a popular cached item expires, many requests hit the database simultaneously. This is the "thundering herd problem."

### Solution A: Mutex Lock (Per-Key Locking)

```typescript
export async function getProductWithLock(id: string) {
  const cacheKey = `product:${id}`;
  const lockKey = `lock:product:${id}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Try to acquire lock (SET NX EX = atomic lock)
  const lockAcquired = await redis.set(lockKey, '1', 'EX', 5, 'NX');

  if (lockAcquired) {
    try {
      // We have the lock — fetch from DB
      const product = await db.query('SELECT * FROM products WHERE id = $1', [id]);
      await redis.setex(cacheKey, PRODUCT_TTL, JSON.stringify(product));
      return product;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Another request is fetching — wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    const retried = await redis.get(cacheKey);
    return retried ? JSON.parse(retried) : null;
  }
}
```

### Solution B: Probabilistic Early Expiration

Allow cache refresh to happen slightly before the TTL expires, so one request "wins" the refresh:

```typescript
interface CachedValue<T> {
  value: T;
  expiresAt: number;
  delta: number; // time to recompute
}

export async function getWithEarlyRefresh<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await redis.get(key);

  if (cached) {
    const { value, expiresAt, delta }: CachedValue<T> = JSON.parse(cached);
    const now = Date.now() / 1000;
    const beta = 1; // tuning factor

    // Probabilistic check: refresh early if close to expiry
    if (now - delta * beta * Math.log(Math.random()) < expiresAt) {
      return value;
    }
  }

  // Fetch and cache
  const start = Date.now();
  const value = await fetchFn();
  const delta = (Date.now() - start) / 1000;

  const payload: CachedValue<T> = {
    value,
    expiresAt: Date.now() / 1000 + ttl,
    delta,
  };

  await redis.setex(key, ttl, JSON.stringify(payload));
  return value;
}
```

---

## Cache Invalidation Strategies

"There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

### Strategy 1: TTL-Based Expiry

Set a reasonable TTL and accept eventual consistency. Right for most read-heavy data:

```typescript
// Product catalog: 5min TTL (can tolerate slight staleness)
await redis.setex('product:123', 300, JSON.stringify(product));

// User session: 24hr TTL
await redis.setex(`session:${token}`, 86400, JSON.stringify(session));

// Real-time stock: 10sec TTL
await redis.setex('stock:AAPL', 10, JSON.stringify(quote));
```

### Strategy 2: Active Invalidation on Write

Delete or update the cache entry when the source changes:

```typescript
// After updating a product, invalidate its cache
export async function updateProductAndInvalidate(id: string, data: object) {
  await db.query('UPDATE products SET ...', [id]);

  // Delete all related cache keys
  await redis.del(`product:${id}`);
  await redis.del(`product:detail:${id}`);
  // Also invalidate list caches that might include this product
  await redis.del('products:list:featured');
}
```

### Strategy 3: Tag-Based Invalidation

Use sets to group related cache keys:

```typescript
// When caching, register the key under relevant tags
async function cacheWithTags(key: string, value: unknown, ttl: number, tags: string[]) {
  const multi = redis.multi();
  multi.setex(key, ttl, JSON.stringify(value));

  for (const tag of tags) {
    multi.sadd(`tag:${tag}`, key);
    multi.expire(`tag:${tag}`, ttl + 60);
  }

  await multi.exec();
}

// Invalidate all keys tagged with a category
async function invalidateByTag(tag: string) {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(`tag:${tag}`);
}

// Usage
await cacheWithTags(`product:${id}`, product, 300, [`category:${product.categoryId}`, 'products']);
await invalidateByTag(`category:${categoryId}`); // invalidates all products in this category
```

---

## Session Caching

Redis is the standard session store for Node.js with Express:

```typescript
import session from 'express-session';
import { RedisStore } from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
```

---

## Rate Limiting with Redis

A practical bonus use case:

```typescript
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Use sorted set with sliding window
  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, now - windowMs);
  multi.zadd(key, now, now.toString());
  multi.zcard(key);
  multi.expire(key, windowSeconds);
  const results = await multi.exec();

  const count = results?.[2]?.[1] as number ?? 0;
  const allowed = count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetIn: windowSeconds,
  };
}
```

---

## Production Tips

1. **Use key namespacing**: Always prefix keys by environment and service (`prod:users:123`, `dev:sessions:abc`)

2. **Serialize carefully**: `JSON.parse`/`JSON.stringify` are fine for most cases but consider `MessagePack` for high-throughput serialization

3. **Monitor memory usage**: Set `maxmemory` and a sensible eviction policy (`allkeys-lru` for general caching)

4. **Handle Redis downtime gracefully**:
```typescript
async function safeRedisGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error('Redis unavailable, falling through to DB:', err);
    return null; // Cache miss — let the request hit the DB
  }
}
```

5. **Pipeline bulk operations**: Use `redis.pipeline()` to batch multiple commands and reduce round-trips

---

## FAQ

**Q: When should I NOT use caching?**
Don't cache data that must be real-time accurate (financial balances, inventory in e-commerce checkout), or data that's queried randomly with no hot keys (you'd just thrash the cache).

**Q: Redis vs Memcached?**
Choose Redis. In 2026, there is almost no reason to use Memcached. Redis offers persistence, data structures, Lua scripting, clustering, and pub/sub — Memcached is just a key-value cache. Both are fast; Redis is more capable.

**Q: How do I handle Redis clustering?**
ioredis supports Redis Cluster natively. Managed Redis services (ElastiCache, Redis Cloud, Upstash) handle clustering for you. Use cluster mode when a single Redis instance can't hold your dataset in memory.

**Q: What TTL should I use?**
There's no universal answer. General guidance: session data 1-24hr, user profiles 5-15min, product catalog 1-5min, homepage content 30s-2min, real-time data 5-30s. Start conservative (shorter TTL) and increase based on cache hit rates in production.

**Q: How do I debug cache misses?**
Use Redis MONITOR (in dev only — high overhead) or instrument your code with metrics. Key metrics: hit rate (target >80%), memory usage, eviction rate, and p99 get latency.
