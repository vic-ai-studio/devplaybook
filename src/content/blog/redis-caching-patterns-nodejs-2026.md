---
title: "Redis Caching Patterns for Node.js: Cache-Aside, Write-Through, and TTL Strategies"
description: "Master Redis caching patterns in Node.js: cache-aside, write-through, write-behind, read-through, and TTL strategies. Code examples, when to use each pattern, and cache invalidation techniques."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["redis", "caching", "nodejs", "performance", "backend", "database", "architecture"]
readingTime: "13 min read"
---

Bad caching is worse than no caching. It introduces stale data bugs, inconsistent state, and thundering herd problems that are notoriously hard to debug in production. Good caching can reduce database load by 90% and cut API response times from 200ms to under 10ms.

This guide covers the four core Redis caching patterns with real Node.js code — and more importantly, when to use each one.

## Setting Up: Redis Client in Node.js

```typescript
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis error:', err));
await redis.connect();
```

Use `ioredis` for advanced features (cluster, sentinel, Lua scripting). Use the official `redis` package (v4+) for most applications — it's lighter and has better TypeScript support.

## Pattern 1: Cache-Aside (Lazy Loading)

Cache-Aside is the most common pattern. The application checks the cache first; on a miss, it reads from the database and populates the cache.

```typescript
async function getUserById(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Cache miss — read from database
  const user = await db.users.findUnique({ where: { id: userId } });
  if (!user) return null;

  // 3. Populate cache with TTL
  await redis.setEx(cacheKey, 3600, JSON.stringify(user)); // 1 hour TTL
  return user;
}
```

**When to use Cache-Aside:**
- Read-heavy workloads where database access is expensive
- Data that changes infrequently (user profiles, product catalog)
- When you can tolerate slight staleness (within TTL window)

**Cache-Aside problems to watch for:**

*Cache stampede (thundering herd):* When a popular cache entry expires, multiple concurrent requests all miss the cache simultaneously, all hit the database at once. Solution: use a mutex lock:

```typescript
import { Mutex } from 'async-mutex';
const locks = new Map<string, Mutex>();

async function getUserByIdSafe(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Acquire lock — only one request fetches from DB
  if (!locks.has(userId)) locks.set(userId, new Mutex());
  const mutex = locks.get(userId)!;

  return mutex.runExclusive(async () => {
    // Double-check after acquiring lock
    const rechecked = await redis.get(cacheKey);
    if (rechecked) return JSON.parse(rechecked);

    const user = await db.users.findUnique({ where: { id: userId } });
    if (user) await redis.setEx(cacheKey, 3600, JSON.stringify(user));
    return user;
  });
}
```

Use the [Redis Cache Key Generator](/tools/redis-cache-key-generator) to establish consistent key naming conventions.

## Pattern 2: Write-Through

Write-Through updates the cache *synchronously* whenever data is written to the database. The write is complete only when both the database and cache are updated.

```typescript
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // 1. Write to database
  const updated = await db.users.update({
    where: { id: userId },
    data,
  });

  // 2. Immediately update cache (synchronous write-through)
  const cacheKey = `user:${userId}`;
  await redis.setEx(cacheKey, 3600, JSON.stringify(updated));

  return updated;
}
```

**When to use Write-Through:**
- Data that's read far more often than written (user profiles, configuration)
- When you can't tolerate any cache staleness after writes
- In combination with Cache-Aside for read path

**Write-Through problems:**

*Write overhead:* Every write pays the cost of both DB write + cache write. For write-heavy workloads, this doubles your write latency.

*Cache pollution:* You might cache data that's never read. Solution: only write-through for entries that already exist in the cache:

```typescript
async function updateUserConditional(userId: string, data: Partial<User>): Promise<User> {
  const updated = await db.users.update({ where: { id: userId }, data });

  // Only update cache if entry already exists (avoid cache pollution)
  const cacheKey = `user:${userId}`;
  const exists = await redis.exists(cacheKey);
  if (exists) {
    await redis.setEx(cacheKey, 3600, JSON.stringify(updated));
  }

  return updated;
}
```

## Pattern 3: Write-Behind (Write-Back)

Write-Behind writes to the cache *immediately* but defers the database write to a background process. This dramatically reduces database write pressure for high-frequency updates.

```typescript
// Write immediately to cache; queue for async DB flush
async function incrementUserMetric(userId: string, metric: string): Promise<void> {
  const cacheKey = `user_metrics:${userId}:${metric}`;
  const queueKey = 'metrics:dirty_queue';

  // 1. Increment in Redis immediately (fast, atomic)
  await redis.incr(cacheKey);

  // 2. Add to dirty queue for background flush (with deduplication)
  await redis.sAdd(queueKey, `${userId}:${metric}`);
}

// Background job: flush dirty metrics to database every 30 seconds
async function flushMetricsToDB(): Promise<void> {
  const queueKey = 'metrics:dirty_queue';
  const dirtyKeys = await redis.sMembers(queueKey);
  if (dirtyKeys.length === 0) return;

  // Remove from queue before processing (idempotent flush)
  await redis.del(queueKey);

  for (const key of dirtyKeys) {
    const [userId, metric] = key.split(':');
    const value = await redis.get(`user_metrics:${userId}:${metric}`);
    if (value !== null) {
      await db.userMetrics.upsert({
        where: { userId_metric: { userId, metric } },
        update: { value: parseInt(value) },
        create: { userId, metric, value: parseInt(value) },
      });
    }
  }
}

// Run every 30 seconds
setInterval(flushMetricsToDB, 30_000);
```

**When to use Write-Behind:**
- High-frequency writes where exact real-time persistence isn't required (view counters, analytics events, activity logs)
- Rate limiting data (request counts per user)
- Gaming scores, live dashboards

**Write-Behind risks:**
- Data loss on Redis failure (accept up to 30s of metric loss)
- Complexity: background flush errors need retry logic
- Not suitable for financial data or anything requiring ACID guarantees

## Pattern 4: Read-Through

Read-Through is Cache-Aside but the cache layer itself handles the database fallback. This is typically implemented via a caching library (like `cacheable` or custom middleware) rather than manually:

```typescript
class ReadThroughCache<T> {
  constructor(
    private redis: ReturnType<typeof createClient>,
    private loader: (key: string) => Promise<T | null>,
    private ttl: number
  ) {}

  async get(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (cached !== null) return JSON.parse(cached);

    const value = await this.loader(key);
    if (value !== null) {
      await this.redis.setEx(key, this.ttl, JSON.stringify(value));
    }
    return value;
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Usage:
const userCache = new ReadThroughCache<User>(
  redis,
  (userId) => db.users.findUnique({ where: { id: userId } }),
  3600
);

const user = await userCache.get(`user:${userId}`);
```

## TTL Strategy by Data Type

Choosing the right TTL prevents both stale data and excessive cache pressure:

| Data Type | Recommended TTL | Reasoning |
|-----------|----------------|-----------|
| User sessions | 1-24h | Balance security vs re-auth friction |
| Auth tokens | Match token expiry | Never cache past token expiry |
| User profiles | 1h | Changes infrequently; staleness acceptable |
| API responses (3rd party) | 5-60 min | Respect upstream rate limits |
| Search results | 10-30 min | Personalized = shorter TTL |
| Rate limit counters | Match rate window | Must expire with window |
| Product catalog | 6-24h | Rarely changes; high read volume |
| Session cart | 30 min rolling | Reset TTL on each cart update |
| Static config | 1-6h | Reload on deploy |

**Rolling TTL pattern** — reset TTL on every access (good for sessions):

```typescript
async function getSession(sessionId: string): Promise<Session | null> {
  const key = `session:${sessionId}`;
  const [value] = await redis
    .multi()
    .get(key)
    .expire(key, 1800) // Reset to 30 min on every access
    .exec();
  return value ? JSON.parse(value as string) : null;
}
```

## Cache Invalidation: The Hard Part

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

**Tag-based invalidation** — group related cache keys:

```typescript
async function invalidateUserCache(userId: string): Promise<void> {
  // Collect all user-related keys
  const keys = [
    `user:${userId}`,
    `user:${userId}:profile`,
    `user:${userId}:permissions`,
    `user:${userId}:preferences`,
  ];
  if (keys.length > 0) await redis.del(keys);
}

// Call on any user update
async function updateUserProfile(userId: string, data: Partial<User>) {
  const updated = await db.users.update({ where: { id: userId }, data });
  await invalidateUserCache(userId); // Invalidate entire user cache namespace
  return updated;
}
```

**Event-driven invalidation** — invalidate via database change events (PostgreSQL LISTEN/NOTIFY or change data capture):

```typescript
// PostgreSQL LISTEN for user changes
const client = await pool.connect();
await client.query('LISTEN user_changes');
client.on('notification', async (msg) => {
  const { userId } = JSON.parse(msg.payload || '{}');
  await invalidateUserCache(userId);
});
```

Caching done right is one of the highest-leverage performance improvements in backend engineering. Start with Cache-Aside, move to Write-Through for write paths you own, and use Write-Behind only for truly high-frequency non-critical counters.
