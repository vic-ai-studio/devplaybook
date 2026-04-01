---
title: "Redis Caching Patterns for Node.js: Cache-Aside, Write-Through & More"
description: "Redis caching patterns for Node.js: cache-aside, write-through, read-through, cache invalidation strategies, TTL management, and ioredis implementation examples."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Redis", "caching", "Node.js", "cache-aside", "write-through", "ioredis", "performance"]
readingTime: "9 min read"
category: "backend"
---

Caching is one of the highest-leverage performance improvements you can make to a Node.js application. A well-placed Redis cache turns 200ms database queries into sub-millisecond responses. But caching introduces consistency challenges — knowing which pattern to use and when to invalidate is where most implementations go wrong.

This guide covers the four primary caching patterns with practical `ioredis` implementations and the gotchas you will encounter in production.

## Setting Up ioredis

`ioredis` is the recommended Redis client for Node.js — it handles clustering, Sentinel failover, pipelining, and Lua scripting out of the box.

```bash
npm install ioredis
```

```typescript
// redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

export default redis;
```

Use `lazyConnect: true` so the connection is established on first use rather than blocking app startup.

## Pattern 1: Cache-Aside (Lazy Loading)

Cache-aside is the most common pattern. Your application code manages the cache explicitly: check cache first, fall back to the database if missing, then populate the cache.

```typescript
// cache-aside.ts
import redis from './redis';
import { db } from './database';

const CACHE_TTL = 300; // 5 minutes

async function getUserById(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;

  // 1. Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as User;
  }

  // 2. Cache miss — fetch from DB
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user) return null;

  // 3. Populate cache
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(user));

  return user;
}

// Invalidate on update
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  const updated = await db.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
    [data.name, data.email, userId]
  );

  // Delete stale cache entry
  await redis.del(`user:${userId}`);

  return updated;
}
```

**Pros:** Simple to implement, only caches what is actually read, resilient to Redis downtime (fall through to DB).

**Cons:** First request after a miss pays the full DB cost. Risk of stale data between cache population and next invalidation.

## Pattern 2: Write-Through

Write-through caches data at write time, keeping the cache always current for any key that has been written.

```typescript
// write-through.ts
async function createPost(data: CreatePostInput): Promise<Post> {
  // 1. Write to database first
  const post = await db.query(
    'INSERT INTO posts (title, content, author_id) VALUES ($1, $2, $3) RETURNING *',
    [data.title, data.content, data.authorId]
  );

  // 2. Write to cache immediately after DB write
  const pipeline = redis.pipeline();
  pipeline.setex(`post:${post.id}`, 3600, JSON.stringify(post));
  // Also invalidate list caches that include this item
  pipeline.del(`posts:user:${data.authorId}`);
  await pipeline.exec();

  return post;
}

async function updatePost(postId: string, data: Partial<Post>): Promise<Post> {
  const updated = await db.query(
    'UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [data.title, data.content, postId]
  );

  // Update cache in-place
  await redis.setex(`post:${postId}`, 3600, JSON.stringify(updated));

  return updated;
}
```

**Pros:** Cache always has fresh data for written keys. Reads are always fast once a key exists.

**Cons:** Write latency increases (two writes: DB + cache). Cache may store data that is never read.

## Pattern 3: Write-Behind (Write-Back)

Write to cache immediately and persist to the database asynchronously. This maximizes write throughput but risks data loss if the cache fails before flush.

```typescript
// write-behind.ts — use only for non-critical data
import { Queue } from 'bullmq'; // Requires BullMQ

const dbWriteQueue = new Queue('db-writes', { connection: redis });

async function trackPageView(pageId: string, userId: string): Promise<void> {
  const key = `pageviews:${pageId}:${new Date().toISOString().slice(0, 10)}`;

  // Write to Redis immediately (atomic increment)
  await redis.incr(key);
  await redis.expire(key, 86400 * 2); // Keep 2 days

  // Queue async DB write — non-blocking
  await dbWriteQueue.add('flush-pageview', { pageId, userId, timestamp: Date.now() });
}
```

**Use write-behind only for:** Analytics counters, view counts, non-critical metrics. Never for financial data or anything requiring strong consistency.

## Pattern 4: Read-Through

Read-through delegates the cache-miss logic to the cache layer itself. Your application always reads from the cache; a cache miss triggers an automatic DB load. This is typically implemented as a wrapper class:

```typescript
// read-through.ts
class ReadThroughCache<T> {
  constructor(
    private readonly redis: Redis,
    private readonly loader: (key: string) => Promise<T | null>,
    private readonly ttl: number = 300
  ) {}

  async get(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    // Trigger load — only one request should load at a time
    const value = await this.loadWithLock(key);
    return value;
  }

  private async loadWithLock(key: string): Promise<T | null> {
    const lockKey = `lock:${key}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (!acquired) {
      // Another process is loading — wait briefly and retry from cache
      await new Promise(r => setTimeout(r, 50));
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    }

    try {
      const value = await this.loader(key);
      if (value) {
        await this.redis.setex(key, this.ttl, JSON.stringify(value));
      }
      return value;
    } finally {
      await this.redis.del(lockKey);
    }
  }
}

// Usage
const productCache = new ReadThroughCache(
  redis,
  (id) => db.query('SELECT * FROM products WHERE id = $1', [id]),
  600
);

const product = await productCache.get(`product:${productId}`);
```

This pattern also includes a simple lock to prevent the **thundering herd problem** (see below).

## Redis Data Structures for Caching

Not everything should be stored as serialized JSON strings.

**Hash** — for objects with frequent partial updates:
```typescript
// Store user profile as hash — update individual fields without deserializing
await redis.hset(`user:${id}`, {
  name: 'Alice',
  email: 'alice@example.com',
  planTier: 'pro',
});

// Update a single field
await redis.hset(`user:${id}`, 'planTier', 'enterprise');

// Read a single field
const tier = await redis.hget(`user:${id}`, 'planTier');
```

**Sorted Set** — for leaderboards and ranked lists:
```typescript
// Leaderboard — score is the value to sort by
await redis.zadd('leaderboard:global', score, userId);

// Get top 10
const topUsers = await redis.zrevrange('leaderboard:global', 0, 9, 'WITHSCORES');
```

**Set** — for membership checks (tags, permissions):
```typescript
// Cache user permissions as a set
await redis.sadd(`user:${id}:permissions`, 'read:posts', 'write:posts', 'admin:users');

// O(1) membership check
const canWrite = await redis.sismember(`user:${id}:permissions`, 'write:posts');
```

## Cache Invalidation Strategies

### Tag-Based Invalidation

Group related cache keys under tags so you can invalidate a whole category at once:

```typescript
async function setWithTags(key: string, value: unknown, ttl: number, tags: string[]): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.setex(key, ttl, JSON.stringify(value));

  // Register key under each tag
  for (const tag of tags) {
    pipeline.sadd(`tag:${tag}`, key);
    pipeline.expire(`tag:${tag}`, ttl + 60);
  }

  await pipeline.exec();
}

async function invalidateTag(tag: string): Promise<void> {
  const keys = await redis.smembers(`tag:${tag}`);
  if (keys.length === 0) return;

  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.del(key);
  }
  pipeline.del(`tag:${tag}`);
  await pipeline.exec();
}

// Usage: cache product list with category tag
await setWithTags(
  `products:category:42`,
  products,
  300,
  ['products', 'category:42']
);

// When category 42 is updated, invalidate all related caches
await invalidateTag('category:42');
```

## Thundering Herd and Cache Stampede

When a popular cached key expires, hundreds of simultaneous requests hit the database at once. Mitigation approaches:

**Probabilistic early expiration** — start refreshing slightly before expiry:
```typescript
async function getWithEarlyRefresh(key: string, ttl: number, loader: () => Promise<unknown>) {
  const result = await redis.get(key);
  if (!result) return null;

  const remaining = await redis.ttl(key);
  // Probabilistically refresh when 10% of TTL remains
  if (remaining < ttl * 0.1 && Math.random() < 0.1) {
    // Refresh in background without blocking the request
    loader().then(value => redis.setex(key, ttl, JSON.stringify(value))).catch(console.error);
  }

  return JSON.parse(result);
}
```

**Stale-while-revalidate** — return stale data immediately while refreshing in background. This is the pattern used by HTTP cache headers and works equally well at the application layer.

## TTL Strategy

- **User sessions:** 24 hours (sliding — extend on each access)
- **User profiles:** 5-15 minutes (balance freshness vs DB load)
- **Product/content:** 1-6 hours (changes infrequently)
- **Search results:** 1-5 minutes (relevance degrades)
- **Rate limit counters:** Match your rate limit window (1 minute, 1 hour)
- **Leaderboards:** 60 seconds (near-real-time but not exact)

Always set a TTL. Never cache without expiry unless you have guaranteed invalidation logic.

## Summary

Cache-aside is the right default for most Node.js applications — simple, resilient, and easy to reason about. Write-through makes sense when you can not tolerate stale reads on recently written data. Avoid write-behind unless you understand the durability trade-offs.

The biggest production mistake is skipping cache invalidation design. Before implementing any cache, write down the answer to: "when this data changes in the database, what cache keys become stale?" Plan the invalidation logic before writing the caching logic.
