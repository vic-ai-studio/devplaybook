# API Gateway Pattern Design Guide

## What an API Gateway Does

```
                        ┌─────────────────────────────────┐
Client (Web/Mobile) ──→ │         API GATEWAY             │
                        │                                 │
                        │ • Authentication / Authorization │
                        │ • Rate limiting                 │
                        │ • Request routing               │
                        │ • SSL termination               │
                        │ • Request/response transform    │
                        │ • Caching                       │
                        │ • Logging / tracing             │
                        └──────┬─────┬──────┬─────────────┘
                               │     │      │
                          User │   Order  Product
                          Svc  │   Svc    Svc
```

**The gateway is the single entry point.** Internal services never expose ports to the internet.

---

## Gateway Responsibilities

### 1. Authentication

```typescript
// JWT verification middleware (Express/Hono/Fastify)
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = await verifyJWT(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 2. Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 req/min per IP
  analytics: true,
});

async function rateLimitMiddleware(req, res, next) {
  const identifier = req.headers['x-forwarded-for'] || req.ip;
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());

  if (!success) return res.status(429).json({ error: 'Rate limit exceeded' });
  next();
}
```

### 3. Request Routing

```typescript
// Route table — define upstream services
const routes = [
  { prefix: '/api/users',    upstream: 'http://user-service:3001' },
  { prefix: '/api/orders',   upstream: 'http://order-service:3002' },
  { prefix: '/api/products', upstream: 'http://product-service:3003' },
];

async function proxyRequest(req, res, upstream) {
  const response = await fetch(`${upstream}${req.path}`, {
    method: req.method,
    headers: { ...req.headers, 'x-forwarded-for': req.ip },
    body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    signal: AbortSignal.timeout(10_000),  // 10s timeout
  });
  // Stream response back to client
  res.status(response.status);
  response.body.pipe(res);
}
```

---

## Request/Response Transformation

```typescript
// Version translation: v1 API → v2 internal service format
function transformOrderRequest(v1Body) {
  return {
    ...v1Body,
    // v2 internal field names
    customerId: v1Body.customer_id,   // snake_case → camelCase
    lineItems: v1Body.items,
    currency: v1Body.currency ?? 'USD',  // default added in v2
  };
}
```

---

## Response Aggregation (BFF Pattern)

Browser Friendly Frontend — aggregate multiple service calls into one response:

```typescript
// Single endpoint that fetches from 3 services in parallel
app.get('/api/dashboard', async (req, res) => {
  const userId = req.user.id;

  const [user, orders, recommendations] = await Promise.allSettled([
    fetch(`${USER_SVC}/users/${userId}`).then(r => r.json()),
    fetch(`${ORDER_SVC}/orders?userId=${userId}&limit=5`).then(r => r.json()),
    fetch(`${REC_SVC}/recommendations/${userId}`).then(r => r.json()),
  ]);

  res.json({
    user: user.status === 'fulfilled' ? user.value : null,
    recentOrders: orders.status === 'fulfilled' ? orders.value : [],
    recommendations: recommendations.status === 'fulfilled' ? recommendations.value : [],
  });
});
```

---

## Gateway Technology Comparison

| Tool | Best for | Self-hosted? |
|------|----------|--------------|
| **Kong** | Enterprise feature set, plugins | Yes / Cloud |
| **Traefik** | Docker/Kubernetes native | Yes |
| **AWS API Gateway** | AWS-native serverless | Managed |
| **Cloudflare Workers** | Edge routing, global latency | Managed |
| **custom Express/Hono** | Full control, small teams | Yes |
| **nginx** | Reverse proxy only, no auth logic | Yes |

---

## Observability at the Gateway

Every request must log:
```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "requestId": "req_abc123",
  "method": "POST",
  "path": "/api/orders",
  "userId": "usr_xyz",
  "upstreamService": "order-service",
  "statusCode": 201,
  "durationMs": 145,
  "ip": "1.2.3.4",
  "userAgent": "MyApp/1.0"
}
```

Alert on:
- Error rate > 1% over 5 minutes → PagerDuty/Slack
- P99 latency > 2000ms → investigate upstream
- Rate limit triggers > 100/min → possible bot or misconfigured client
