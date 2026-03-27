---
title: "API Rate Limiting: Algorithms and Implementation Guide 2026"
description: "Complete guide to API rate limiting in 2026. Token Bucket, Leaky Bucket, Sliding Window algorithms with Node.js and Redis implementations, distributed rate limiting, 429 handling, and best practices."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["api", "rate-limiting", "redis", "nodejs", "backend", "performance", "security"]
readingTime: "15 min read"
---

Every public API without rate limiting is one viral Reddit post away from going down. Every internal microservice without rate limits is one buggy client loop away from cascading failure. Rate limiting is not optional infrastructure — it's the difference between a service that degrades gracefully and one that falls over completely under load.

This guide covers the five main rate limiting algorithms, how to implement them in Node.js with and without Redis, distributed rate limiting patterns for multi-instance deployments, and the HTTP conventions around `429 Too Many Requests` responses.

---

## Why Rate Limiting Matters

Rate limiting serves three distinct purposes:

**Abuse prevention.** Without limits, a single client can monopolize your service — intentionally (DDoS) or accidentally (runaway loop, credential stuffing). Rate limiting caps the blast radius of any single bad actor or bug.

**Fair resource sharing.** In multi-tenant systems, one customer's spike in usage shouldn't degrade service for others. Rate limiting enforces fairness.

**Cost control.** If your API calls paid upstream services (OpenAI, Stripe, Twilio), uncapped request volume translates directly to unexpected bills.

---

## The Five Core Algorithms

### 1. Fixed Window

The simplest algorithm. Count requests per time window (e.g., 100 requests per minute). When the window resets, the counter resets.

```javascript
class FixedWindowLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.counters = new Map(); // clientId -> { count, windowStart }
  }

  isAllowed(clientId) {
    const now = Date.now();
    const entry = this.counters.get(clientId);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.counters.set(clientId, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.limit) {
      return false;
    }

    entry.count++;
    return true;
  }
}
```

**Weakness: boundary burst.** A client can send 100 requests at 11:59:59 and another 100 at 12:00:01, effectively doubling the allowed rate at the window boundary. For most use cases this is acceptable; for strict enforcement it isn't.

### 2. Sliding Window Log

Maintains a log of request timestamps per client. On each request, remove timestamps older than the window and check the remaining count.

```javascript
class SlidingWindowLogLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.logs = new Map(); // clientId -> timestamp[]
  }

  isAllowed(clientId) {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let log = this.logs.get(clientId) || [];
    // Remove expired timestamps
    log = log.filter(ts => ts > cutoff);

    if (log.length >= this.limit) {
      this.logs.set(clientId, log);
      return false;
    }

    log.push(now);
    this.logs.set(clientId, log);
    return true;
  }
}
```

**Accurate but memory-intensive.** Storing every request timestamp for high-traffic clients requires significant memory. Rarely used in production at scale — use Sliding Window Counter instead.

### 3. Sliding Window Counter

Approximates the sliding window log with much less memory. Tracks counts for the current and previous windows, then calculates a weighted rate.

```javascript
class SlidingWindowCounterLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.windows = new Map(); // clientId -> { current, previous, windowStart }
  }

  isAllowed(clientId) {
    const now = Date.now();
    let entry = this.windows.get(clientId);

    if (!entry) {
      entry = { current: 0, previous: 0, windowStart: now };
      this.windows.set(clientId, entry);
    }

    const elapsed = now - entry.windowStart;

    if (elapsed >= this.windowMs) {
      // Roll the window
      entry.previous = entry.current;
      entry.current = 0;
      entry.windowStart = now;
    }

    // Weighted count: previous window's contribution decays as current window progresses
    const elapsed_fraction = elapsed / this.windowMs;
    const weighted = entry.previous * (1 - elapsed_fraction) + entry.current;

    if (weighted >= this.limit) {
      return false;
    }

    entry.current++;
    return true;
  }
}
```

This is the algorithm used by Cloudflare's rate limiting. It's accurate to within ~0.003% error rate and requires O(1) memory per client.

### 4. Token Bucket

Each client has a bucket with a maximum capacity of tokens. Tokens refill at a constant rate. Each request consumes one token. Requests are rejected when the bucket is empty.

```javascript
class TokenBucketLimiter {
  constructor(capacity, refillRate) {
    this.capacity = capacity;       // max tokens
    this.refillRate = refillRate;   // tokens per second
    this.buckets = new Map();       // clientId -> { tokens, lastRefill }
  }

  isAllowed(clientId) {
    const now = Date.now() / 1000; // seconds
    let bucket = this.buckets.get(clientId);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(clientId, bucket);
    }

    // Refill based on elapsed time
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + elapsed * this.refillRate
    );
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      return false;
    }

    bucket.tokens -= 1;
    return true;
  }
}
```

**Advantage:** Allows short bursts. A client that's been quiet for a while has accumulated tokens and can send a burst of requests. This matches real usage patterns better than strict per-window limits.

Token Bucket is the algorithm used by AWS API Gateway and most API gateway products.

### 5. Leaky Bucket

Requests enter a queue (the "bucket") and are processed at a fixed output rate. If the queue is full, new requests are rejected. This smooths bursty traffic into a steady stream.

```javascript
class LeakyBucketLimiter {
  constructor(capacity, leakRate) {
    this.capacity = capacity;   // max queue size
    this.leakRate = leakRate;   // requests processed per ms
    this.buckets = new Map();   // clientId -> { queue, lastLeak }
  }

  isAllowed(clientId) {
    const now = Date.now();
    let bucket = this.buckets.get(clientId);

    if (!bucket) {
      bucket = { queue: 0, lastLeak: now };
      this.buckets.set(clientId, bucket);
    }

    // Leak requests that have been processed
    const elapsed = now - bucket.lastLeak;
    const leaked = Math.floor(elapsed * this.leakRate);
    bucket.queue = Math.max(0, bucket.queue - leaked);
    bucket.lastLeak = now;

    if (bucket.queue >= this.capacity) {
      return false;
    }

    bucket.queue++;
    return true;
  }
}
```

Leaky Bucket is less common for API rate limiting (Token Bucket is more user-friendly because it allows bursts), but it's useful for protecting downstream services with fixed processing capacity.

---

## Redis-Based Rate Limiting

In-memory implementations only work for single-process deployments. Any production Node.js API runs multiple instances — across processes, containers, or servers. You need distributed state.

Redis is the standard solution. Its atomic operations (INCR, EXPIRE, Lua scripts) make it ideal for rate limiting counters.

### Fixed Window with Redis

```javascript
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

async function fixedWindowRateLimit(clientId, limit, windowSec) {
  const key = `rl:${clientId}:${Math.floor(Date.now() / (windowSec * 1000))}`;

  const count = await client.incr(key);

  if (count === 1) {
    // First request in window — set expiry
    await client.expire(key, windowSec);
  }

  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(0, limit - count)
  };
}
```

### Sliding Window with Redis + Lua

Lua scripts execute atomically in Redis, avoiding race conditions:

```javascript
const slidingWindowScript = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

-- Count current entries
local count = redis.call('ZCARD', key)

if count >= limit then
  return 0
end

-- Add current request
redis.call('ZADD', key, now, now .. ':' .. math.random())
redis.call('EXPIRE', key, math.ceil(window / 1000))

return 1
`;

async function slidingWindowRateLimit(clientId, limit, windowMs) {
  const key = `rl:sliding:${clientId}`;
  const now = Date.now();

  const result = await client.eval(
    slidingWindowScript,
    1,        // number of keys
    key,      // KEYS[1]
    now,      // ARGV[1]
    windowMs, // ARGV[2]
    limit     // ARGV[3]
  );

  return { allowed: result === 1 };
}
```

### Token Bucket with Redis

```javascript
const tokenBucketScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])  -- tokens per second
local now = tonumber(ARGV[3])          -- current time in seconds

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill
local elapsed = now - last_refill
local new_tokens = math.min(capacity, tokens + elapsed * refill_rate)

if new_tokens < 1 then
  redis.call('HMSET', key, 'tokens', new_tokens, 'last_refill', now)
  redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
  return 0
end

redis.call('HMSET', key, 'tokens', new_tokens - 1, 'last_refill', now)
redis.call('EXPIRE', key, math.ceil(capacity / refill_rate) + 1)
return 1
`;

async function tokenBucketRateLimit(clientId, capacity, refillRate) {
  const key = `rl:token:${clientId}`;
  const now = Date.now() / 1000;

  const result = await client.eval(
    tokenBucketScript,
    1, key,
    capacity, refillRate, now
  );

  return { allowed: result === 1 };
}
```

---

## Express Middleware Implementation

```javascript
const express = require('express');
const app = express();

function createRateLimiter(options = {}) {
  const {
    limit = 100,
    windowMs = 60_000,
    keyGenerator = (req) => req.ip,
    handler = null,
    skipSuccessfulRequests = false
  } = options;

  return async (req, res, next) => {
    const clientId = keyGenerator(req);
    const result = await fixedWindowRateLimit(clientId, limit, windowMs / 1000);

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor((Date.now() + windowMs) / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));

      if (handler) {
        return handler(req, res, next, result);
      }

      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
}

// Apply different limits to different routes
const apiLimiter = createRateLimiter({ limit: 100, windowMs: 60_000 });
const authLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 }); // Stricter for login

app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);
```

---

## Rate Limit Headers: X-RateLimit-*

The `X-RateLimit-*` headers are not an official standard, but they're a de facto convention:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | The request limit for the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |
| `X-RateLimit-Policy` | Human-readable limit description (e.g., "100;w=60") |
| `Retry-After` | Seconds until the client can retry (required on 429) |

The IETF draft `RateLimit` header (singular, no `X-` prefix) is gaining adoption but not yet universal.

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1742040000
Retry-After: 47
Content-Type: application/json

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again in 47 seconds.",
  "limit": 100,
  "window": "60s",
  "retry_after": 47
}
```

---

## 429 Handling Best Practices

### Server side: return useful information

A 429 response should tell the client exactly what to do next:

```javascript
function rateLimitHandler(req, res, next, result) {
  const retryAfterMs = result.resetAt - Date.now();
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);

  res.status(429).json({
    error: 'rate_limit_exceeded',
    limit: result.limit,
    window_sec: result.windowSec,
    retry_after: retryAfterSec,
    reset_at: new Date(result.resetAt).toISOString(),
    docs: 'https://yourapi.com/docs/rate-limiting'
  });
}
```

### Client side: implement exponential backoff

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response;
    }

    // Respect Retry-After header if present
    const retryAfter = response.headers.get('Retry-After');
    const waitMs = retryAfter
      ? parseInt(retryAfter) * 1000
      : Math.min(1000 * Math.pow(2, attempt), 32_000); // exponential backoff, max 32s

    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  throw new Error('Rate limit exceeded after maximum retries');
}
```

### Proactive rate limiting on the client

If the API returns remaining count headers, use them to throttle preemptively:

```javascript
class RateLimitAwareClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.remaining = Infinity;
    this.resetAt = null;
  }

  async request(path, options = {}) {
    // If we're close to the limit, wait for reset
    if (this.remaining <= 1 && this.resetAt) {
      const waitMs = Math.max(0, this.resetAt - Date.now());
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs + 100));
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);

    // Track limits from response headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (remaining !== null) this.remaining = parseInt(remaining);
    if (reset !== null) this.resetAt = parseInt(reset) * 1000;

    return response;
  }
}
```

---

## Distributed Rate Limiting Challenges

### The coordination problem

With multiple server instances, each has its own in-memory counter. A client can make `N * instanceCount` requests per window by hitting different instances.

**Solution:** Centralized state in Redis. All instances share the same counter.

### The Redis availability problem

If your rate limiter Redis goes down, what happens? Options:

1. **Fail open** — allow all requests. Simple, but defeats the purpose during attacks.
2. **Fail closed** — reject all requests. Keeps the backend protected but blocks legitimate traffic.
3. **Local fallback** — fall back to in-memory limiting per instance. Less precise but functional.

```javascript
async function rateLimitWithFallback(clientId, limit, windowSec) {
  try {
    return await redisRateLimit(clientId, limit, windowSec);
  } catch (err) {
    console.error('Redis rate limit failed, using in-memory fallback', err);
    return inMemoryRateLimit(clientId, limit, windowSec);
  }
}
```

### Geographic distribution

For global APIs, round-trip to a central Redis adds latency. Options:

- **Regional Redis clusters** with per-region limits (divide global limit across regions)
- **Consistent hashing** to route client IDs to specific Redis nodes
- **Approximate counters** with eventual consistency (acceptable for most use cases)

---

## Nginx Rate Limiting

For rate limiting at the edge (before your Node.js process), Nginx has built-in modules:

```nginx
# nginx.conf

# Define a rate limit zone: 10MB memory for IP-based limits, 10 req/sec
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    location /api/ {
        # Allow burst of 20 requests, process them without delay
        limit_req zone=api burst=20 nodelay;

        # Return 429 instead of default 503
        limit_req_status 429;

        proxy_pass http://backend;
    }

    location /auth/ {
        # Strict: 1 req/sec, no burst
        limit_req zone=api burst=5;
        limit_req_status 429;

        proxy_pass http://backend;
    }
}
```

Nginx rate limiting is fast (handled in C before requests reach Node.js) and doesn't require Redis for single-server deployments.

---

## API Gateway Rate Limiting

### AWS API Gateway

```yaml
# serverless.yml
provider:
  name: aws

functions:
  api:
    handler: handler.main
    events:
      - http:
          path: /api/{proxy+}
          method: any
          throttling:
            maxRequestsPerSecond: 100
            maxConcurrentRequests: 50
```

Or via AWS console/CDK with usage plans and API keys for per-client limits.

### Cloudflare Rate Limiting

Cloudflare's rate limiting (available on paid plans) applies at the edge, before requests reach your origin:

```javascript
// wrangler.toml equivalent — configure via dashboard or Terraform
// Rules: 100 requests per minute per IP to /api/*
// Action: Block for 60 seconds on exceed
```

Edge rate limiting is the most effective protection against volumetric attacks because it stops traffic before it reaches your infrastructure.

---

## Testing Rate Limiting

```javascript
// jest test example
describe('Rate Limiter', () => {
  it('allows requests under the limit', async () => {
    const limiter = new TokenBucketLimiter(10, 1);

    for (let i = 0; i < 10; i++) {
      expect(limiter.isAllowed('client1')).toBe(true);
    }
  });

  it('blocks requests over the limit', async () => {
    const limiter = new TokenBucketLimiter(5, 1);

    for (let i = 0; i < 5; i++) limiter.isAllowed('client2');

    expect(limiter.isAllowed('client2')).toBe(false);
  });

  it('refills tokens over time', async () => {
    const limiter = new TokenBucketLimiter(1, 10); // 10 tokens/sec

    limiter.isAllowed('client3'); // Exhaust

    await new Promise(r => setTimeout(r, 200)); // Wait 200ms = 2 tokens

    expect(limiter.isAllowed('client3')).toBe(true);
  });
});
```

---

## Tools and Libraries

Rather than implementing from scratch, use well-tested libraries:

| Library | Algorithm | Redis Support |
|---|---|---|
| `express-rate-limit` | Fixed Window | Via `rate-limit-redis` |
| `rate-limiter-flexible` | Multiple | Yes (built-in) |
| `bottleneck` | Token Bucket | Yes |
| `limiter` | Token Bucket | No |
| `@upstash/ratelimit` | Fixed/Sliding | Upstash Redis |

`rate-limiter-flexible` is the most comprehensive:

```javascript
const { RateLimiterRedis } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'middleware',
  points: 100,          // requests
  duration: 60,         // per 60 seconds
  blockDuration: 60,    // block for 60s after limit exceeded
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (e) {
    res.status(429).json({ error: 'Too many requests' });
  }
});
```

---

## DevPlaybook Tools

When building and debugging rate limiting:

- **[JSON Formatter](/tools/json-formatter)** — Validate your Redis Lua scripts and API response payloads
- **[HTTP Status Checker](/tools/http-status)** — Understand 429 vs 503 semantics
- **[Base64 Encoder](/tools/base64-encoder)** — Encode API keys for `Authorization` headers in test requests

---

## Algorithm Selection Guide

| Use Case | Algorithm | Why |
|---|---|---|
| Simple API protection | Fixed Window | Easy to implement and explain |
| Accurate sliding rate | Sliding Window Counter | Low memory, ~0% error |
| Allow usage bursts | Token Bucket | Matches real user behavior |
| Protect downstream service | Leaky Bucket | Smooth, predictable output rate |
| Edge/CDN enforcement | Nginx / Cloudflare | No app code needed |

For most applications, Token Bucket with Redis is the right choice: it allows short bursts, distributes across instances, and maps intuitively to user expectations about rate limits.

The sliding window counter is better if your users have steady traffic patterns and burst allowance would enable abuse (like authentication endpoints where you specifically don't want burst capacity).

What you should avoid is leaving rate limiting as a future problem. The time to add it is before your API is public, not after the first incident.
