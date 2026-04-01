---
title: "Redis Caching Patterns for Node.js Applications"
description: "Master Redis caching in Node.js with practical patterns: cache-aside, write-through, cache invalidation, TTL strategies, pub/sub, and production-ready implementation with ioredis."
date: "2026-04-02"
tags: [redis, caching, nodejs, backend, performance]
readingTime: "11 min read"
---

# Redis Caching Patterns for Node.js Applications

Caching is the single most impactful optimization available to most applications. A well-placed cache reduces database load by 90%, cuts response times from 50ms to 2ms, and lets your app handle 10x more traffic on the same hardware.

Redis is the cache of choice for Node.js applications. It's fast (sub-millisecond), versatile (strings, hashes, lists, sets, sorted sets), and integrates cleanly with every Node.js framework.

This guide covers the patterns that work in production.

## Setup: ioredis

```bash
npm install ioredis
```

```javascript
// redis.js — singleton client
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Connection pool for high-throughput
  enableReadyCheck: true,
  keepAlive: 10000,
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

export default redis;
```

## Pattern 1: Cache-Aside (Lazy Loading)

The most common pattern. Check cache first, fetch from DB on miss, populate cache.

```javascript
async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Cache miss — fetch from database
  const user = await db.users.findById(userId);
  if (!user) return null;

  // Populate cache with TTL (1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
  return user;
}
```

**When to use:** Read-heavy data that changes infrequently (user profiles, product catalogs, configuration).

**Tradeoff:** First request always hits the database (cold miss). Data can be stale until TTL expires.

## Pattern 2: Write-Through

Update cache and database simultaneously on writes.

```javascript
async function updateUser(userId, updates) {
  // Update database
  const user = await db.users.update(userId, updates);

  // Update cache immediately (keep it fresh)
  const cacheKey = `user:${userId}`;
  await redis.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}

async function deleteUser(userId) {
  await db.users.delete(userId);
  // Invalidate cache
  await redis.del(`user:${userId}`);
}
```

**When to use:** Data where stale reads are unacceptable (financial balances, inventory counts).

## Pattern 3: Cache Stampede Prevention

When a popular cache key expires, thousands of requests hit the database simultaneously. Prevent with a lock:

```javascript
async function getUserWithLock(userId) {
  const cacheKey = `user:${userId}`;
  const lockKey = `lock:user:${userId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Try to acquire lock (NX = only set if not exists)
  const lockAcquired = await redis.set(lockKey, '1', 'EX', 5, 'NX');

  if (lockAcquired) {
    try {
      // We have the lock — fetch and populate
      const user = await db.users.findById(userId);
      await redis.setex(cacheKey, 3600, JSON.stringify(user));
      return user;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Another process is populating — wait briefly and retry
    await new Promise(resolve => setTimeout(resolve, 50));
    return getUserWithLock(userId); // Retry
  }
}
```

For production, consider `redlock` for distributed locking across Redis clusters:

```bash
npm install redlock
```

```javascript
import Redlock from 'redlock';
const redlock = new Redlock([redis], { retryCount: 3, retryDelay: 100 });

const lock = await redlock.acquire([`locks:user:${userId}`], 5000);
try {
  // exclusive work
} finally {
  await lock.release();
}
```

## Pattern 4: Memoization with Redis

Cache the output of expensive computations:

```javascript
function memoize(fn, keyFn, ttl = 300) {
  return async function(...args) {
    const key = keyFn(...args);
    const cached = await redis.get(key);
    if (cached !== null) return JSON.parse(cached);

    const result = await fn(...args);
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  };
}

// Usage
const getExpensiveReport = memoize(
  async (startDate, endDate) => generateReport(startDate, endDate),
  (startDate, endDate) => `report:${startDate}:${endDate}`,
  600 // 10 minutes
);
```

## Pattern 5: Hash Caching for Partial Updates

Store objects as Redis hashes to update individual fields without a full cache invalidation:

```javascript
// Store user as hash
async function cacheUserHash(user) {
  const key = `user:${user.id}`;
  await redis.hset(key, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    updatedAt: user.updatedAt.toISOString(),
  });
  await redis.expire(key, 3600);
}

// Update just the name — no need to invalidate the whole cache
async function updateUserName(userId, name) {
  await db.users.update(userId, { name });
  await redis.hset(`user:${userId}`, 'name', name);
}

// Read individual fields efficiently
async function getUserRole(userId) {
  return redis.hget(`user:${userId}`, 'role');
}
```

## Pattern 6: Sorted Sets for Leaderboards and Rate Limiting

```javascript
// Leaderboard
async function updateScore(gameId, userId, score) {
  await redis.zadd(`leaderboard:${gameId}`, score, userId);
}

async function getTopPlayers(gameId, limit = 10) {
  const entries = await redis.zrevrangebyscore(
    `leaderboard:${gameId}`, '+inf', '-inf',
    'WITHSCORES', 'LIMIT', 0, limit
  );
  // Parse pairs: [userId, score, userId, score, ...]
  const result = [];
  for (let i = 0; i < entries.length; i += 2) {
    result.push({ userId: entries[i], score: parseFloat(entries[i + 1]) });
  }
  return result;
}

// Rate limiting with sliding window
async function checkRateLimit(userId, limit = 100, windowSeconds = 60) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', windowStart); // Remove old entries
  pipeline.zadd(key, now, `${now}-${Math.random()}`); // Add current request
  pipeline.zcard(key); // Count requests in window
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const requestCount = results[2][1];

  return {
    allowed: requestCount <= limit,
    remaining: Math.max(0, limit - requestCount),
    resetAt: new Date(now + windowSeconds * 1000),
  };
}
```

## Pattern 7: Pub/Sub for Cache Invalidation

In multi-instance deployments, invalidate all instances' caches via pub/sub:

```javascript
// Publisher (when data changes)
async function invalidateUserCache(userId) {
  await db.users.update(userId, updates);
  await redis.publish('cache:invalidate:user', userId);
}

// Subscriber (in each app instance)
const subscriber = new Redis(redisConfig);
subscriber.subscribe('cache:invalidate:user');

subscriber.on('message', (channel, userId) => {
  if (channel === 'cache:invalidate:user') {
    localCache.delete(`user:${userId}`); // Clear local in-memory cache
  }
});
```

## TTL Strategy Guide

| Data Type | Recommended TTL | Reason |
|-----------|----------------|--------|
| User session | 24 hours | Balance UX and security |
| User profile | 1 hour | Changes infrequently |
| Product catalog | 5 minutes | Updated regularly |
| API rate limit window | Equal to window | Expires naturally |
| Search results | 30 seconds | Fresh enough for UX |
| Stock/inventory | No cache or 1s | Must be accurate |
| Configuration | 5 minutes | Rarely changes |
| Computed reports | 10-60 minutes | Expensive to regenerate |

## Pipelining for Batch Operations

Use pipelining to reduce round-trips when doing multiple operations:

```javascript
async function getMultipleUsers(userIds) {
  const pipeline = redis.pipeline();
  userIds.forEach(id => pipeline.get(`user:${id}`));

  const results = await pipeline.exec();
  const missing = [];

  const users = results.map((result, i) => {
    if (result[1]) return JSON.parse(result[1]);
    missing.push(userIds[i]);
    return null;
  });

  // Fetch missing users from DB in one query
  if (missing.length > 0) {
    const dbUsers = await db.users.findManyByIds(missing);
    const cachePipeline = redis.pipeline();
    dbUsers.forEach(user => {
      cachePipeline.setex(`user:${user.id}`, 3600, JSON.stringify(user));
    });
    await cachePipeline.exec();
  }

  return users;
}
```

## Cache Key Design

Good cache key design prevents collisions and makes debugging easier:

```
Pattern: {namespace}:{entity}:{id}:{variant}

Examples:
user:12345                    → User object
user:12345:settings           → User settings object
user:12345:orders:page:1      → Paginated orders
product:sku-789:availability  → Product availability
search:nodejs+redis:page:1    → Search results
session:abc123xyz             → Session data
```

Use prefixes for easy bulk deletion:

```javascript
// Delete all cached items for a user
async function evictUserCache(userId) {
  const keys = await redis.keys(`user:${userId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

Note: `redis.keys()` scans the entire keyspace — use `redis.scan()` in production for large keyspaces.

## Monitoring Redis Cache Performance

Track these metrics:

```javascript
// Cache hit rate monitoring
let hits = 0, misses = 0;

async function getCached(key) {
  const value = await redis.get(key);
  if (value) {
    hits++;
    return JSON.parse(value);
  }
  misses++;
  return null;
}

// Expose metrics endpoint
app.get('/metrics/cache', (req, res) => {
  const total = hits + misses;
  res.json({
    hits,
    misses,
    hitRate: total > 0 ? (hits / total * 100).toFixed(1) + '%' : '0%',
  });
});
```

Redis also exposes stats via `redis.info('stats')` — monitor `keyspace_hits`, `keyspace_misses`, and `used_memory`.

## Production Checklist

- [ ] Use connection pooling (ioredis handles this automatically)
- [ ] Set `maxmemory-policy` to `allkeys-lru` or `volatile-lru`
- [ ] Enable `requirepass` authentication
- [ ] Use TLS for Redis connections in production
- [ ] Set appropriate `maxmemory` to prevent OOM
- [ ] Monitor hit rate — target > 80% for meaningful caches
- [ ] Use Redis Sentinel or Cluster for HA
- [ ] Avoid storing large objects (> 1MB) — use S3 + Redis URL
- [ ] Never use `redis.keys('*')` in production code — use SCAN

---

**Related tools:**
- [Node.js performance optimization guide](/tools/nodejs-performance-guide)
- [Database indexing strategies](/blog/database-indexing-strategies)
- [API rate limiting patterns](/tools/api-rate-limiting-patterns)
