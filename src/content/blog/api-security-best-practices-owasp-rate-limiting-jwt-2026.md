---
title: "API Security Best Practices: OWASP Top 10, Rate Limiting, and JWT Security 2026"
description: "Complete guide to API security best practices in 2026. Covers OWASP API Top 10 2023, JWT authentication, rate limiting (token bucket, sliding window), input validation, CORS, HTTPS/TLS, and API key vs OAuth2 trade-offs with Node.js/Express code examples."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["api-security", "owasp", "jwt", "rate-limiting", "authentication", "nodejs", "express"]
readingTime: "18 min read"
---

APIs are the connective tissue of modern software. They power mobile apps, third-party integrations, microservices, and everything in between. They're also the most-attacked surface in production systems today. The 2024 Akamai State of the Internet report found that API attacks now account for over 40% of web application attacks — up from 25% two years prior.

The good news: most API vulnerabilities are preventable. This guide covers the OWASP API Security Top 10 2023, JWT best practices, [API Rate Limit Calculator](/tools/api-rate-limit-calculator) strategies, and a practical framework for securing Node.js/Express APIs from day one.

---

## OWASP API Security Top 10 (2023 Edition)

The Open Web Application Security Project publishes a list of the most critical API security risks. The 2023 edition reflects a shift in how APIs are being exploited.

### API1:2023 — Broken Object Level Authorization (BOLA)

BOLA is the most common API vulnerability. It happens when an API endpoint accepts a resource ID from the client and returns that resource without verifying the requester owns or has access to it.

**Example attack:**
```
GET /api/orders/12345   # attacker changes their order ID to someone else's
```

**Fix:** Always validate that the authenticated user has permission to access the specific object, not just the endpoint.

```javascript
// Express middleware for object-level auth
async function requireOrderOwnership(req, res, next) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.order = order;
  next();
}

app.get('/api/orders/:id', authenticate, requireOrderOwnership, (req, res) => {
  res.json(req.order);
});
```

### API2:2023 — Broken Authentication

Weak authentication mechanisms — missing token expiry, predictable tokens, no brute-force protection — allow attackers to impersonate legitimate users.

Common failure patterns:
- Tokens with no expiry (`exp` claim missing from JWT)
- Accepting tokens over HTTP instead of HTTPS
- No account lockout after repeated failed logins
- Password reset links that don't expire

### API3:2023 — Broken Object Property Level Authorization (BOPLA)

A user can read or write object properties they shouldn't have access to. This is often caused by mass assignment (accepting the full request body and writing it to the database) or returning the full model object.

```javascript
// VULNERABLE: mass assignment
app.post('/api/users/:id', authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, req.body); // attacker can set role: 'admin'
});

// SAFE: allowlist properties
app.post('/api/users/:id', authenticate, async (req, res) => {
  const allowed = ['name', 'email', 'avatar'];
  const update = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  await User.findByIdAndUpdate(req.params.id, update);
});
```

### API4:2023 — Unrestricted Resource Consumption

No limits on request size, query depth, file uploads, or response size. A single client can exhaust your compute, memory, or database connections.

### API5:2023 — Broken Function Level Authorization (BFLA)

Administrative or privileged endpoints are accessible to regular users because the authorization check looks at authentication (are you logged in?) but not authorization (what can you do?).

```javascript
// Check role on every admin route
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

app.delete('/api/admin/users/:id', authenticate, requireRole('admin'), deleteUser);
```

### API6:2023 — Unrestricted Access to Sensitive Business Flows

Attackers abuse legitimate API flows at scale — ticket scalping bots, credential stuffing, coupon abuse. The endpoint works as designed, but the business logic is exploited.

### API7:2023 — Server Side Request Forgery (SSRF)

Attacker provides a URL as input and your API fetches it server-side, potentially reaching internal services, cloud metadata endpoints, or the local filesystem.

```javascript
// VULNERABLE: fetch user-supplied URL
app.post('/api/preview', async (req, res) => {
  const data = await fetch(req.body.url); // attacker can provide http://169.254.169.254/
});

// SAFE: validate and allowlist
const ALLOWED_SCHEMES = ['https:'];
const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;

function isSafeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return ALLOWED_SCHEMES.includes(url.protocol) && !BLOCKED_HOSTS.test(url.hostname);
  } catch {
    return false;
  }
}
```

### API8:2023 — Security Misconfiguration

Default credentials left unchanged, verbose error messages revealing stack traces, open S3 buckets, missing security headers, CORS misconfigured to `*`.

### API9:2023 — Improper Inventory Management

Shadow APIs — old versions, internal endpoints, documentation endpoints — left running in production without monitoring or auth.

### API10:2023 — Unsafe Consumption of APIs

Your API trusts data from third-party APIs it consumes without validation. Attacker compromises the upstream API and injects malicious data into your system.

---

## JWT Security Best Practices

[JWT Debugger](/tools/jwt-debugger)s are the dominant stateless authentication mechanism for APIs. They're also frequently misconfigured.

### Token Structure and Validation

A JWT has three parts: header (algorithm + type), payload (claims), signature. The signature is only as strong as the algorithm and secret you use.

```javascript
const jwt = require('jsonwebtoken');

// SIGN — use strong secret, set expiry
const token = jwt.sign(
  { userId: user.id, roles: user.roles },
  process.env.JWT_SECRET,  // min 256-bit (32-char) random string
  {
    expiresIn: '15m',       // short-lived access tokens
    issuer: 'your-api.com',
    audience: 'your-api.com'
  }
);

// VERIFY — validate all claims
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'your-api.com',
    audience: 'your-api.com'
  });
}
```

### Critical JWT Mistakes to Avoid

**1. Algorithm confusion (`alg: none`):** Never accept tokens with `alg: none`. Always specify which algorithms you accept:

```javascript
jwt.verify(token, secret, { algorithms: ['HS256'] }); // reject RS256, none, etc.
```

**2. Symmetric vs asymmetric:** For multi-service architectures, use RS256 (asymmetric). Services verify with the public key; only the auth server holds the private key. With HS256, every service needs the shared secret — a breach of any service exposes all.

**3. Missing expiry:** Always set `exp`. A JWT without an expiry is a permanent credential.

**4. Sensitive data in payload:** JWT payloads are base64-encoded, not encrypted. Never store passwords, PII, or secrets in the payload.

### Refresh Token Pattern

Access tokens should be short-lived (5–15 minutes). Use long-lived refresh tokens (stored in httpOnly cookies) to issue new access tokens:

```javascript
// Issue both tokens on login
app.post('/api/auth/login', async (req, res) => {
  const user = await validateCredentials(req.body);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = jwt.sign(
    { userId: user.id, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenFamily: generateId() },
    process.env.REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Refresh token in httpOnly cookie (not accessible to JS)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ accessToken });
});
```

---

## Rate Limiting Strategies

### Token Bucket Algorithm

Token bucket maintains a bucket that refills at a constant rate. Requests consume tokens. When the bucket is empty, requests are rejected. Allows bursting up to bucket capacity.

```javascript
const redis = require('redis');
const client = redis.createClient();

async function tokenBucketRateLimit(userId, maxTokens = 100, refillRate = 10) {
  const key = `rate:${userId}`;
  const now = Date.now();

  const data = await client.hGetAll(key);
  let tokens = data.tokens ? parseFloat(data.tokens) : maxTokens;
  let lastRefill = data.lastRefill ? parseInt(data.lastRefill) : now;

  // Refill tokens based on elapsed time
  const elapsed = (now - lastRefill) / 1000;
  tokens = Math.min(maxTokens, tokens + elapsed * refillRate);

  if (tokens < 1) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((1 - tokens) / refillRate) };
  }

  tokens -= 1;
  await client.hSet(key, { tokens: tokens.toString(), lastRefill: now.toString() });
  await client.expire(key, 3600);

  return { allowed: true, remaining: Math.floor(tokens) };
}

// Express middleware
function rateLimitMiddleware(req, res, next) {
  const userId = req.user?.id || req.ip;
  tokenBucketRateLimit(userId).then(({ allowed, remaining, retryAfter }) => {
    res.set('X-RateLimit-Remaining', remaining);
    if (!allowed) {
      res.set('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }
    next();
  });
}
```

### Sliding Window Algorithm

Sliding window counts requests in a rolling time window. More accurate than fixed window (no boundary spike), but requires more storage.

```javascript
async function slidingWindowRateLimit(userId, windowMs = 60000, maxRequests = 100) {
  const key = `sliding:${userId}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Remove old entries outside the window
  await client.zRemRangeByScore(key, '-inf', windowStart);

  const count = await client.zCard(key);
  if (count >= maxRequests) {
    const oldest = await client.zRange(key, 0, 0, { REV: false });
    const retryAfter = oldest.length
      ? Math.ceil((parseInt(oldest[0]) + windowMs - now) / 1000)
      : Math.ceil(windowMs / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  await client.zAdd(key, [{ score: now, value: `${now}-${Math.random()}` }]);
  await client.expire(key, Math.ceil(windowMs / 1000) + 1);

  return { allowed: true, remaining: maxRequests - count - 1 };
}
```

### express-rate-limit for Quick Setup

For most applications, the `express-rate-limit` package covers the basics:

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,    // Return RateLimit-* headers
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
  }),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Apply globally
app.use('/api/', limiter);

// Stricter limits for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/', authLimiter);
```

---

## Input Validation and Sanitization

Every piece of data from the outside world is untrusted. Validate at the boundary.

```javascript
const { z } = require('zod');

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['user', 'moderator']).default('user') // never allow 'admin' from input
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

app.post('/api/users', authenticate, validateBody(CreateUserSchema), createUser);
```

**SQL injection prevention:** Use parameterized queries or an ORM — never concatenate user input into SQL strings:

```javascript
// VULNERABLE
const rows = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);

// SAFE — parameterized
const rows = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
```

---

## CORS Configuration

Cross-Origin Resource Sharing controls which domains can call your API from a browser. Misconfigured CORS (`Access-Control-Allow-Origin: *` with credentials) is a common vulnerability.

```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://yourapp.com',
      'https://admin.yourapp.com',
      process.env.NODE_ENV === 'development' && 'http://localhost:3000'
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: ${origin} not allowed`));
    }
  },
  credentials: true,          // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400               // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
```

**Rule:** Never use `origin: '*'` when `credentials: true` is set — browsers will block it, and it signals misconfiguration.

---

## HTTPS and Security Headers

### Force HTTPS

Never serve API traffic over HTTP in production. Use your reverse proxy (nginx, Caddy) or platform (Railway, Fly.io, Vercel) to terminate TLS and redirect HTTP → HTTPS.

In Express, detect and redirect:

```javascript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});
```

### Security Headers with Helmet

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  },
  hsts: {
    maxAge: 31536000,         // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

Helmet automatically sets: `X-Frame-Options`, `X-Content-Type-Options`, `X-DNS-Prefetch-Control`, `X-Permitted-Cross-Domain-Policies`, `X-Download-Options`, and removes `X-Powered-By`.

---

## API Authentication Methods: API Keys vs JWT vs OAuth2

Choosing the right auth mechanism depends on your use case.

### API Keys

**Best for:** Server-to-server integrations, public APIs, simple machine clients.

```javascript
// Generate a cryptographically random key
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex'); // 64-char hex

// Validate incoming key
async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required' });

  // Store hashed keys in DB — never raw keys
  const hashed = crypto.createHash('sha256').update(key).digest('hex');
  const keyRecord = await ApiKey.findOne({ keyHash: hashed, active: true });

  if (!keyRecord) return res.status(401).json({ error: 'Invalid API key' });

  req.apiClient = keyRecord;
  next();
}
```

**Pros:** Simple, stateless, easy to rotate. **Cons:** No expiry by default, hard to scope granularly, if leaked it's a static credential until rotated.

### JWT (JSON Web Tokens)

**Best for:** User-facing APIs, SPAs, mobile apps.

**Pros:** Stateless (no DB lookup per request), self-contained claims, short-lived. **Cons:** Can't be invalidated before expiry without a blocklist, payload is visible to anyone who has the token.

### OAuth2

**Best for:** Third-party API access (your users granting permissions to external apps), delegated authorization.

OAuth2 is a delegation framework, not just an auth protocol. Key flows:
- **Authorization Code + PKCE:** Web apps and mobile apps accessing third-party resources
- **Client Credentials:** Machine-to-machine, no user involved
- **Device Code:** IoT, CLI tools

For most internal APIs, OAuth2 adds unnecessary complexity. JWT or API keys suffice. Use OAuth2 when you need delegated access (letting Slack post on behalf of a user, letting a third-party read user data with scope restrictions).

| | API Keys | JWT | OAuth2 |
|---|---|---|---|
| Use case | M2M, public APIs | User sessions | Delegated access |
| Stateless | ✅ | ✅ | Depends on flow |
| Expiry | Manual rotation | Built-in `exp` | Short-lived tokens |
| Granular scopes | ❌ | Limited | ✅ |
| Complexity | Low | Medium | High |

---

## Practical Security Checklist

Before shipping any API endpoint, verify:

**Authentication & Authorization:**
- [ ] Every endpoint requires authentication (or is explicitly public)
- [ ] Object-level authorization checks (BOLA prevention)
- [ ] Role/permission checks for sensitive actions (BFLA prevention)
- [ ] Property-level allowlisting on write endpoints (BOPLA prevention)

**Input & Output:**
- [ ] All inputs validated with schema (Zod, Joi, Yup)
- [ ] Parameterized queries for all database interactions
- [ ] Response objects sanitized — no password hashes, internal IDs, or admin fields in public responses

**Infrastructure:**
- [ ] Rate limiting on all endpoints (stricter on auth endpoints)
- [ ] HTTPS enforced, HTTP redirected
- [ ] Security headers set (Helmet)
- [ ] CORS configured with explicit origin allowlist
- [ ] Meaningful error messages without stack traces in production

**JWT specific (if applicable):**
- [ ] Algorithm explicitly specified in verification
- [ ] Short expiry on access tokens (≤15 minutes)
- [ ] Refresh tokens in httpOnly cookies
- [ ] No sensitive data in JWT payload

---

## Monitoring and Incident Response

Security doesn't end at deployment. You need visibility into what's happening.

**Log the right things:**
- Authentication failures (with IP, user agent)
- Authorization failures (who tried to access what)
- Rate limit hits (identify abuse patterns)
- Unusual parameter patterns (SQLi attempts, SSRF probes)

**Don't log:**
- Passwords, tokens, API keys
- Full request/response bodies (PII risk)

**Anomaly signals to alert on:**
- Authentication failure rate spike
- Unusual geographic access (user in two countries simultaneously)
- API endpoint scanning (sequential ID enumeration)
- Sudden spike in 4xx errors from a single IP

---

## Key Takeaways

1. **OWASP API Top 10** names the most common attack patterns — BOLA, broken auth, mass assignment, and SSRF cause most real breaches.
2. **JWT security** requires explicit algorithm validation, short expiry, and never storing sensitive data in payloads.
3. **Rate limiting** should be layered — global limits plus stricter limits on auth and expensive endpoints. Use Redis for distributed deployments.
4. **Input validation** at the boundary with schema validators (Zod) eliminates entire vulnerability classes.
5. **CORS and security headers** are configuration, not code — Helmet + explicit origin allowlists cover most cases.
6. **Authentication method choice** depends on use case: API keys for M2M, JWT for user sessions, OAuth2 for delegated third-party access.

API security is not a one-time checklist — it's an ongoing practice. The OWASP API Security Project updates their list as new attack patterns emerge. Subscribe to security advisories for your dependencies, run automated DAST tools as part of CI/CD, and conduct periodic security reviews of your API inventory.
