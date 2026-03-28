---
title: "Redis in 2026: Caching, Pub/Sub, Streams, and Vector Search"
description: "Modern Redis patterns for Node.js developers. Covers ioredis vs node-redis, cache-aside and write-through patterns, pub/sub with Upstash, Redis Streams for event sourcing, and Redis Stack vector search for AI apps."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["redis", "caching", "nodejs", "backend", "database", "pubsub", "vector-search"]
readingTime: "13 min read"
---

Redis has been the default "add caching here" answer for a decade. But Redis in 2026 is far more than a cache. It's a pub/sub broker, a streaming platform, a session store, a rate limiter, a leaderboard engine, and — with Redis Stack — a vector database for AI-powered search.

This guide covers the patterns that matter for modern Node.js applications: the right client library, battle-tested caching strategies, real-time pub/sub, event sourcing with Streams, and vector search for semantic retrieval.

---

## Client Libraries: ioredis vs node-redis

### node-redis (v4+)

The official Redis client. Promise-based, TypeScript support, and the most actively maintained:

```bash
npm install redis
```

```typescript
import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

client.on("error", (err) => console.error("Redis error:", err));
await client.connect();

// Basic operations
await client.set("key", "value", { EX: 3600 }); // expires in 1 hour
const value = await client.get("key");
await client.del("key");
```

### ioredis

The community favorite for its richer API, cluster support, and Lua scripting:

```bash
npm install ioredis
```

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});

// Cluster mode
const cluster = new Redis.Cluster([
  { host: "redis-1.example.com", port: 6379 },
  { host: "redis-2.example.com", port: 6379 },
]);
```

**Choose node-redis when**: you want the official package, TypeScript types are important, or you're using Redis 7+ features.
**Choose ioredis when**: you need cluster support, Sentinel support, or complex Lua scripting.

### Upstash Redis (Serverless)

For serverless and edge deployments, Upstash's HTTP-based Redis client eliminates connection management:

```bash
npm install @upstash/redis
```

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Works in Cloudflare Workers, Vercel Edge Functions, etc.
await redis.set("key", "value", { ex: 3600 });
const value = await redis.get<string>("key");
```

---

## Caching Patterns

### Cache-Aside (Lazy Loading)

The most common pattern. Check cache first; on miss, load from database and populate cache:

```typescript
class UserCache {
  constructor(
    private redis: Redis,
    private db: Database,
    private ttl = 3600 // 1 hour
  ) {}

  async getUser(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;

    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as User;
    }

    // Cache miss — load from DB
    const user = await this.db.users.findUnique({ where: { id: userId } });
    if (!user) return null;

    // Populate cache
    await this.redis.setex(cacheKey, this.ttl, JSON.stringify(user));
    return user;
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(`user:${userId}`);
  }
}
```

**Pros**: Simple, load is deferred until needed, tolerant of cache failures.
**Cons**: First request after expiry is slow (cache miss penalty). Risk of stale data if invalidation is missed.

### Write-Through

Cache is updated on every write. Ensures cache is always populated:

```typescript
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // Update database first
  const updated = await db.users.update({
    where: { id: userId },
    data,
  });

  // Update cache immediately
  const cacheKey = `user:${userId}`;
  await redis.setex(cacheKey, 3600, JSON.stringify(updated));

  return updated;
}

async function createUser(data: CreateUserInput): Promise<User> {
  const user = await db.users.create({ data });

  // Populate cache on create too
  await redis.setex(`user:${user.id}`, 3600, JSON.stringify(user));

  return user;
}
```

**Pros**: Cache is always fresh after writes. No stale data from write operations.
**Cons**: Every write hits both DB and cache (overhead). Cache may contain records never read.

### Stale-While-Revalidate

Serve stale data immediately while refreshing in the background:

```typescript
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number; // before expiry, trigger background refresh
}

class SWRCache {
  constructor(private redis: Redis) {}

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options = { ttl: 3600, staleAfter: 300 }
  ): Promise<T> {
    const raw = await this.redis.get(key);

    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const now = Date.now();

      if (now < entry.staleAt) {
        // Fresh — return immediately
        return entry.data;
      }

      if (now < entry.expiresAt) {
        // Stale but not expired — return and refresh in background
        this.refresh(key, fetcher, options).catch(console.error);
        return entry.data;
      }
    }

    // Expired or missing — fetch and cache
    return this.refresh(key, fetcher, options);
  }

  private async refresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: { ttl: number; staleAfter: number }
  ): Promise<T> {
    const data = await fetcher();
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      expiresAt: now + options.ttl * 1000,
      staleAt: now + options.staleAfter * 1000,
    };
    await this.redis.setex(key, options.ttl, JSON.stringify(entry));
    return data;
  }
}
```

### Cache Stampede Prevention

When a popular cache key expires, many requests hit the database simultaneously:

```typescript
async function getWithLock<T>(
  redis: Redis,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const lockKey = `lock:${key}`;

  // Try to get from cache
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  // Try to acquire lock (SET NX with 5s timeout)
  const locked = await redis.set(lockKey, "1", "EX", 5, "NX");

  if (locked) {
    try {
      const data = await fetcher();
      await redis.setex(key, ttl, JSON.stringify(data));
      return data;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Someone else is fetching — wait and retry
    await new Promise((resolve) => setTimeout(resolve, 100));
    return getWithLock(redis, key, fetcher, ttl);
  }
}
```

---

## Pub/Sub with Redis

### Basic Pub/Sub

```typescript
import Redis from "ioredis";

const publisher = new Redis(process.env.REDIS_URL);
const subscriber = new Redis(process.env.REDIS_URL);

// Subscribe to a channel
await subscriber.subscribe("notifications");

subscriber.on("message", (channel, message) => {
  const event = JSON.parse(message);
  console.log(`[${channel}]`, event);
});

// Publish from anywhere
await publisher.publish(
  "notifications",
  JSON.stringify({ type: "user:created", userId: "123", email: "alice@example.com" })
);
```

### Pattern-Based Subscribe

```typescript
// Subscribe to all user events: user:created, user:updated, user:deleted
await subscriber.psubscribe("user:*");

subscriber.on("pmessage", (pattern, channel, message) => {
  console.log(`Pattern: ${pattern}, Channel: ${channel}`);
  const event = JSON.parse(message);
  handleUserEvent(event);
});
```

### Pub/Sub with Upstash (Edge-Compatible)

Upstash's QStash adds durability to Redis pub/sub — messages are persisted and retried on failure:

```typescript
import { Client } from "@upstash/qstash";

const client = new Client({ token: process.env.QSTASH_TOKEN! });

// Publish a message with guaranteed delivery
await client.publishJSON({
  url: "https://myapp.com/api/webhooks/user-events",
  body: { type: "user:created", userId: "123" },
  retries: 3,
  delay: "0s",
});
```

---

## Redis Streams for Event Sourcing

Redis Streams provide durable, ordered, consumer-group-based event processing — think Kafka but with Redis simplicity:

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

// Producer: add events to a stream
async function publishEvent(stream: string, event: Record<string, string>) {
  const id = await redis.xadd(stream, "*", ...Object.entries(event).flat());
  return id;
}

// Example: user signup event
await publishEvent("events:users", {
  type: "user.created",
  userId: "123",
  email: "alice@example.com",
  timestamp: Date.now().toString(),
});

// Consumer group setup (run once)
await redis.xgroup("CREATE", "events:users", "email-service", "$", "MKSTREAM");

// Consumer: process events in a group
async function processEvents(stream: string, group: string, consumer: string) {
  while (true) {
    const results = await redis.xreadgroup(
      "GROUP",
      group,
      consumer,
      "COUNT",
      10,
      "BLOCK",
      5000, // wait 5 seconds for new messages
      "STREAMS",
      stream,
      ">" // only new, unprocessed messages
    );

    if (!results) continue;

    for (const [, messages] of results) {
      for (const [id, fields] of messages) {
        const event = Object.fromEntries(
          (fields as string[]).reduce((acc, val, i) => {
            if (i % 2 === 0) acc.push([val, (fields as string[])[i + 1]]);
            return acc;
          }, [] as [string, string][])
        );

        await handleEvent(event);

        // Acknowledge processing
        await redis.xack(stream, group, id);
      }
    }
  }
}
```

### When to Use Streams vs Pub/Sub

| Feature | Pub/Sub | Streams |
|---------|---------|---------|
| Persistence | No | Yes |
| Consumer groups | No | Yes |
| Replay events | No | Yes (up to maxlen) |
| Multiple consumers | Broadcast to all | Distributed work queue |
| At-least-once delivery | No | Yes (with XACK) |

Use **Pub/Sub** for: real-time notifications, chat, live dashboards where message loss is acceptable.
Use **Streams** for: order processing, audit logs, event sourcing where every event must be processed.

---

## Redis for Rate Limiting

```typescript
// Sliding window rate limiter
async function rateLimit(
  redis: Redis,
  identifier: string, // IP or user ID
  limit: number,      // max requests
  window: number      // window in seconds
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowStart = now - window * 1000;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, "-inf", windowStart); // remove old requests
  pipeline.zadd(key, now, now.toString());             // add current request
  pipeline.zcard(key);                                  // count in window
  pipeline.expire(key, window);                         // set TTL

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] as number;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    reset: Math.floor((now + window * 1000) / 1000),
  };
}

// Express/Hono middleware
app.use(async (c, next) => {
  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const { allowed, remaining, reset } = await rateLimit(redis, ip, 100, 60);

  c.header("X-RateLimit-Limit", "100");
  c.header("X-RateLimit-Remaining", remaining.toString());
  c.header("X-RateLimit-Reset", reset.toString());

  if (!allowed) {
    return c.json({ error: "Too Many Requests" }, 429);
  }

  await next();
});
```

---

## Redis Stack: Vector Search for AI Apps

Redis Stack adds vector similarity search to Redis, making it viable as a vector database for AI-powered features:

```bash
# Using Docker
docker run -p 6379:6379 redis/redis-stack:latest
```

```typescript
import { createClient, SchemaFieldTypes, VectorAlgorithms } from "redis";

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

// Create a vector index
await client.ft.create(
  "idx:articles",
  {
    title: { type: SchemaFieldTypes.TEXT, sortable: true },
    content: { type: SchemaFieldTypes.TEXT },
    embedding: {
      type: SchemaFieldTypes.VECTOR,
      ALGORITHM: VectorAlgorithms.HNSW,
      TYPE: "FLOAT32",
      DIM: 1536, // OpenAI text-embedding-3-small dimension
      DISTANCE_METRIC: "COSINE",
    },
  },
  { ON: "HASH", PREFIX: "article:" }
);

// Store an article with its embedding
async function storeArticle(id: string, title: string, content: string) {
  const embedding = await getEmbedding(content); // your embedding function

  await client.hSet(`article:${id}`, {
    title,
    content,
    embedding: Buffer.from(new Float32Array(embedding).buffer),
  });
}

// Semantic search
async function semanticSearch(query: string, topK = 5) {
  const queryEmbedding = await getEmbedding(query);
  const queryBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

  const results = await client.ft.search(
    "idx:articles",
    `*=>[KNN ${topK} @embedding $BLOB AS score]`,
    {
      PARAMS: { BLOB: queryBuffer },
      SORTBY: { BY: "score" },
      DIALECT: 2,
      RETURN: ["title", "content", "score"],
    }
  );

  return results.documents.map((doc) => ({
    id: doc.id,
    title: doc.value.title,
    score: parseFloat(doc.value.score as string),
  }));
}
```

### Redis Vector vs Pinecone vs pgvector

| Feature | Redis Stack | Pinecone | pgvector |
|---------|------------|----------|----------|
| Setup | Self-hosted or Upstash | Managed | Postgres extension |
| Latency | ~1ms | ~10ms | ~5ms |
| Scale | Millions | Billions | Millions |
| Combined queries | Redis data structures | No | Full SQL |
| Cost | Free self-hosted | Paid | Postgres cost |

**Choose Redis Stack when**: you already use Redis, need sub-millisecond latency, and want to combine vector search with caching/rate limiting in one service.

---

## Upstash Redis for Serverless

Upstash's pay-per-request pricing model is ideal for serverless where you can't maintain connections:

```typescript
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();

// Rate limiting with Upstash
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

// Cloudflare Worker or Edge Function
export async function GET(request: Request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "anonymous";
  const { success, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }

  // Handle request...
  return new Response("OK");
}
```

---

## Conclusion

Redis in 2026 is a full data platform, not just a cache. Cache-aside and write-through patterns solve 80% of performance problems. Streams bring durable event processing without Kafka's operational complexity. Pub/sub enables real-time features that databases can't provide efficiently. And Redis Stack makes vector search accessible to any team already running Redis.

For serverless deployments, Upstash is the obvious choice — HTTP API, pay-per-request, and edge-compatible. For self-hosted environments with high throughput requirements, ioredis with a Redis cluster delivers exceptional performance.

Pick the patterns you need, compose them in a single Redis instance, and you'll rarely need to add another data service.

**Related tools on DevPlaybook:**
- [Redis Command Reference](/tools/redis-commands) — quick reference for Redis commands
- [Cache TTL Calculator](/tools/cache-ttl-calculator) — calculate optimal TTL for your use case
- [Rate Limiter Tester](/tools/rate-limiter-tester) — test rate limiting configurations
