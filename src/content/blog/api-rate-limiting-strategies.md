---
title: "API Rate Limiting Strategies: Token Bucket, Sliding Window, Redis Implementation"
description: "Master API rate limiting strategies: token bucket algorithm, sliding window counter, fixed window, leaky bucket. Redis implementation examples in Node.js with code."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["rate limiting", "API", "Redis", "token bucket", "sliding window", "Node.js", "backend"]
readingTime: "7 min read"
category: "backend"
---

Without rate limiting, a single misbehaving client can take down your entire API. Whether it is a DDoS attack, a runaway cron job, or a developer testing in production against your live endpoints, uncontrolled request volume is a production incident waiting to happen. This guide covers the four main rate-limiting algorithms, when to use each, and complete Redis implementations in Node.js.

## Why Rate Limiting Matters

Rate limiting serves three purposes:

1. **Availability** — prevents one client from exhausting server resources
2. **Cost control** — limits expensive downstream calls (LLMs, payment APIs, SMS)
3. **Fair use** — ensures all clients get reasonable access

Every public-facing API should have rate limiting. Even internal APIs benefit from it to catch runaway consumers early.

## Algorithm 1: Fixed Window Counter

The simplest approach. Count requests per client within a fixed time window (e.g., 100 requests per minute, resetting at :00 each minute).

**Pros:** Simple, low memory usage.
**Cons:** Boundary spike problem — a client can make 100 requests at :59 and 100 more at :01, effectively sending 200 requests in 2 seconds.

```javascript
const redis = require('ioredis');
const client = new redis(process.env.REDIS_URL);

async function fixedWindowRateLimit(identifier, limit, windowSeconds) {
  const key = `ratelimit:fixed:${identifier}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;

  const pipeline = client.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds);
  const [[, count]] = await pipeline.exec();

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: (Math.floor(Date.now() / (windowSeconds * 1000)) + 1) * windowSeconds * 1000,
  };
}
```

## Algorithm 2: Sliding Window Counter

Smooths out the boundary spike by weighting the previous window's count based on how far into the current window you are.

**Pros:** No spike problem, still O(1) in Redis.
**Cons:** Approximate (not exact), slightly more complex.

```javascript
async function slidingWindowRateLimit(identifier, limit, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const currentWindow = Math.floor(now / windowMs);
  const previousWindow = currentWindow - 1;

  const currentKey = `ratelimit:sliding:${identifier}:${currentWindow}`;
  const previousKey = `ratelimit:sliding:${identifier}:${previousWindow}`;

  const [currentCount, previousCount] = await client.mget(currentKey, previousKey);

  const current = parseInt(currentCount || '0', 10);
  const previous = parseInt(previousCount || '0', 10);

  // Weight of previous window based on position in current window
  const elapsedFraction = (now % windowMs) / windowMs;
  const weightedCount = previous * (1 - elapsedFraction) + current;

  if (weightedCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Increment current window
  const pipeline = client.pipeline();
  pipeline.incr(currentKey);
  pipeline.expire(currentKey, windowSeconds * 2); // keep for 2 windows
  await pipeline.exec();

  return {
    allowed: true,
    remaining: Math.floor(limit - weightedCount - 1),
  };
}
```

## Algorithm 3: Token Bucket

Tokens accumulate at a fixed rate up to a maximum burst capacity. Each request consumes one token. If no tokens are available, the request is rejected.

**Pros:** Allows bursting, smooth refill, intuitive to configure.
**Cons:** Slightly more complex to implement correctly in a distributed system.

This is the algorithm used by AWS API Gateway and most enterprise-grade rate limiters.

```javascript
async function tokenBucketRateLimit(identifier, capacity, refillRate, refillInterval) {
  const key = `ratelimit:token:${identifier}`;
  const now = Date.now();

  const script = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local refillInterval = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
    local tokens = tonumber(bucket[1]) or capacity
    local lastRefill = tonumber(bucket[2]) or now

    -- Calculate tokens to add since last refill
    local elapsed = now - lastRefill
    local tokensToAdd = math.floor(elapsed / refillInterval) * refillRate
    tokens = math.min(capacity, tokens + tokensToAdd)

    -- Update lastRefill to the last refill boundary
    if tokensToAdd > 0 then
      lastRefill = lastRefill + math.floor(elapsed / refillInterval) * refillInterval
    end

    local allowed = 0
    if tokens >= 1 then
      tokens = tokens - 1
      allowed = 1
    end

    redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
    redis.call('EXPIRE', key, math.ceil(capacity / refillRate * refillInterval / 1000) + 60)

    return { allowed, tokens }
  `;

  const result = await client.eval(
    script, 1, key,
    capacity,          // max tokens
    refillRate,        // tokens added per interval
    refillInterval,    // interval in ms (e.g., 1000 = 1 token/sec)
    now
  );

  return {
    allowed: result[0] === 1,
    remaining: result[1],
  };
}

// Usage: 10 req burst, refill 1 token per second
const result = await tokenBucketRateLimit('user:123', 10, 1, 1000);
```

## Algorithm 4: Leaky Bucket

Requests enter a fixed-size queue (the bucket) and are processed at a constant rate. Excess requests that overflow the bucket are rejected.

**Pros:** Guarantees a constant output rate, protects downstream services.
**Cons:** Does not allow bursting; can feel unresponsive during legitimate spikes.

Best suited for protecting downstream services that cannot handle variable load (payment processors, email APIs).

```javascript
async function leakyBucketRateLimit(identifier, capacity, leakRatePerSec) {
  const key = `ratelimit:leaky:${identifier}`;
  const now = Date.now();

  const script = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local leakRate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local data = redis.call('HMGET', key, 'queue', 'lastLeak')
    local queue = tonumber(data[1]) or 0
    local lastLeak = tonumber(data[2]) or now

    -- Leak tokens since last check
    local elapsed = (now - lastLeak) / 1000
    local leaked = math.floor(elapsed * leakRate)
    queue = math.max(0, queue - leaked)
    if leaked > 0 then lastLeak = now end

    local allowed = 0
    if queue < capacity then
      queue = queue + 1
      allowed = 1
    end

    redis.call('HMSET', key, 'queue', queue, 'lastLeak', lastLeak)
    redis.call('EXPIRE', key, math.ceil(capacity / leakRate) + 60)

    return { allowed, queue }
  `;

  const result = await client.eval(
    script, 1, key, capacity, leakRatePerSec, now
  );

  return {
    allowed: result[0] === 1,
    queueDepth: result[1],
  };
}
```

## Express Middleware Integration

Wrap any algorithm into a reusable Express middleware:

```javascript
function createRateLimitMiddleware(options = {}) {
  const {
    algorithm = 'sliding',
    limit = 100,
    windowSeconds = 60,
    keyGenerator = (req) => req.ip,
    onRateLimited = null,
  } = options;

  return async (req, res, next) => {
    const identifier = keyGenerator(req);

    let result;
    if (algorithm === 'token') {
      result = await tokenBucketRateLimit(identifier, limit, 1, 1000);
    } else {
      result = await slidingWindowRateLimit(identifier, limit, windowSeconds);
    }

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining ?? 0);
    if (result.resetAt) {
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));
    }

    if (!result.allowed) {
      if (onRateLimited) return onRateLimited(req, res);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please retry after the reset time.',
        retryAfter: res.getHeader('X-RateLimit-Reset'),
      });
    }

    next();
  };
}

// Apply globally
app.use('/api/', createRateLimitMiddleware({ limit: 1000, windowSeconds: 3600 }));

// Stricter limits on sensitive endpoints
app.use('/api/auth/', createRateLimitMiddleware({
  algorithm: 'token',
  limit: 5,
  keyGenerator: (req) => `${req.ip}:${req.body?.email}`,
}));
```

## Handling 429 Responses on the Client

Clients should implement exponential backoff when they receive a 429:

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) return response;

    if (attempt === maxRetries) throw new Error('Rate limit exceeded after max retries');

    const retryAfter = response.headers.get('Retry-After');
    const retryAfterReset = response.headers.get('X-RateLimit-Reset');

    let delayMs;
    if (retryAfter) {
      delayMs = parseInt(retryAfter, 10) * 1000;
    } else if (retryAfterReset) {
      delayMs = (parseInt(retryAfterReset, 10) * 1000) - Date.now();
    } else {
      delayMs = Math.min(1000 * Math.pow(2, attempt), 30000); // exponential backoff, max 30s
    }

    console.warn(`Rate limited. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
```

## Distributed Rate Limiting Considerations

When running multiple API instances:

- **Always use Redis** (not in-memory) for rate limit state so all instances share the same counters
- Use Lua scripts (as shown above) for atomic operations — avoids race conditions
- Consider Redis Cluster for high availability; use consistent hashing for key routing
- Add a local in-memory cache as a first layer to reduce Redis round trips on hot paths

## Algorithm Selection Guide

| Scenario | Recommended Algorithm |
|----------|----------------------|
| General API protection | Sliding Window |
| Allows short bursts (good UX) | Token Bucket |
| Protect expensive downstream API | Leaky Bucket |
| Simple, low-traffic API | Fixed Window |
| Authentication endpoints | Fixed Window + lockout |

Rate limiting is infrastructure, not an afterthought. Add it before launch, not after your first incident.
