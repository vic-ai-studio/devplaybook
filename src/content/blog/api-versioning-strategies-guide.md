---
title: "API Versioning Strategies: URL Path, Headers & Content Negotiation"
description: "API versioning strategies guide: URL path versioning pros/cons, custom header versioning, content negotiation, semantic versioning, deprecation strategy, and Sunset headers."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["API versioning", "REST API", "backward compatibility", "deprecation", "HTTP headers", "semver"]
readingTime: "8 min read"
category: "api"
---

Every API eventually changes. The question isn't whether you'll need to version your API — it's whether you'll handle it gracefully or break your consumers without warning. This guide covers the four versioning strategies, when each applies, and how to deprecate old versions responsibly.

## Why Versioning Matters: Breaking vs Non-Breaking Changes

Not every API change requires a version bump. Understanding the distinction saves you from unnecessary versioning overhead.

**Breaking changes** — require a new version:
- Removing a field from a response
- Renaming a field
- Changing a field's type (e.g., `id` from integer to string)
- Removing an endpoint
- Making a previously optional field required
- Changing authentication method

**Non-breaking changes** — safe to deploy without versioning:
- Adding a new optional field to a response
- Adding a new endpoint
- Adding a new optional query parameter
- Adding a new value to an enum (with caution — if clients switch on enum values, this can break them)
- Relaxing validation rules (e.g., allowing longer strings)
- Adding deprecation notices

Maintaining a public changelog and using semantic versioning (`MAJOR.MINOR.PATCH`) helps consumers understand the scope of changes.

---

## Strategy 1: URL Path Versioning

Include the version number directly in the URL path:

```
GET https://api.example.com/v1/users/123
GET https://api.example.com/v2/users/123
```

**Implementation in Express:**

```javascript
import express from 'express';

const app = express();

// Version 1 routes
const v1Router = express.Router();
v1Router.get('/users/:id', (req, res) => {
  // v1: returns { id, name, email }
  res.json({ id: req.params.id, name: 'Alice', email: 'alice@example.com' });
});

// Version 2 routes — expanded user object
const v2Router = express.Router();
v2Router.get('/users/:id', (req, res) => {
  // v2: returns { id, name, email, avatarUrl, createdAt }
  res.json({
    id: req.params.id,
    name: 'Alice',
    email: 'alice@example.com',
    avatarUrl: 'https://cdn.example.com/avatars/123.jpg',
    createdAt: '2025-01-15T09:00:00Z'
  });
});

app.use('/v1', v1Router);
app.use('/v2', v2Router);
```

**Pros:**
- Immediately visible in URL — easy to test in browser or curl
- Easy to route at the load balancer or reverse proxy level
- Simple to document, bookmark, and share
- Clients can migrate incrementally (run v1 and v2 side-by-side)

**Cons:**
- Not technically "RESTful" — the version is part of the resource identifier, implying `/v1/users/123` and `/v2/users/123` are different resources
- Creates path proliferation in docs and routing tables
- Easy to forget to update version references in client code

**Best for:** Public APIs, developer platforms, APIs with broad third-party adoption. GitHub, Stripe (for endpoint structure), and most major public APIs use this approach.

---

## Strategy 2: Custom Header Versioning

Pass the version in a custom request header:

```http
GET /users/123
API-Version: 2026-04-01
```

**Implementation:**

```javascript
const versionMiddleware = (req, res, next) => {
  const requestedVersion = req.headers['api-version'] ?? 'latest';
  req.apiVersion = requestedVersion;
  next();
};

app.use(versionMiddleware);

app.get('/users/:id', (req, res) => {
  const version = req.apiVersion;

  if (version >= '2026-04-01') {
    // New behavior
    return res.json({ id: req.params.id, name: 'Alice', tier: 'premium' });
  }

  // Legacy behavior
  return res.json({ id: req.params.id, name: 'Alice' });
});
```

**Date-based versioning (Stripe's approach):**

Stripe uses ISO date strings (`2024-06-20`) as versions instead of integers. This models the API as a snapshot at a specific date — consumers pin to a date, and Stripe runs all past versions simultaneously.

```http
GET /v1/customers/cus_123
Stripe-Version: 2024-06-20
```

**Pros:**
- Clean URLs — the path stays stable
- More semantically correct (same resource, different representation)
- Fine-grained version control per-request

**Cons:**
- Invisible to HTTP caching infrastructure (headers not used as cache keys by default)
- Harder to test manually (must set headers in tools)
- Easy to forget to send the header — requires strict client discipline
- Not visible in browser address bar or server logs without custom logging

**Best for:** Internal APIs, APIs where the same base URL must remain stable, teams using Stripe-style date versioning.

---

## Strategy 3: Content Negotiation (Accept Header)

Use the `Accept` header to request a specific media type version:

```http
GET /users/123
Accept: application/vnd.example.v2+json
```

**Implementation:**

```javascript
app.get('/users/:id', (req, res) => {
  const accept = req.headers.accept ?? 'application/json';

  if (accept.includes('vnd.example.v2+json')) {
    return res.json({ id: req.params.id, name: 'Alice', tier: 'premium' });
  }

  // Default to v1
  res.setHeader('Content-Type', 'application/vnd.example.v1+json');
  res.json({ id: req.params.id, name: 'Alice' });
});
```

**Pros:**
- Follows HTTP specification most closely (the Accept/Content-Type negotiation model)
- URLs remain clean and stable
- Correct from a REST theory perspective — one resource, multiple representations

**Cons:**
- Complex to implement and maintain
- Difficult to test without tooling
- Vendor media types are verbose and unfamiliar to most developers
- Poor CDN and proxy cache support (must vary on `Accept` header)
- Almost no major public API uses this in practice

**Best for:** Academic correctness. In practice, almost never the right choice for real-world APIs.

---

## Strategy 4: Query Parameter Versioning

Pass the version as a query parameter:

```
GET /users/123?version=2
GET /users/123?api-version=2026-04-01
```

**Pros:**
- Easy to test in browser
- Works with simple HTTP clients

**Cons:**
- Query parameters are for filtering/searching/pagination, not API identity
- Creates caching problems — most CDNs cache by URL including query string, but this can cause version-mixed cache responses
- Pollutes every URL with boilerplate
- Easily dropped by proxies or logging systems

**Best for:** Internal tooling, quick scripts, or as a fallback alongside header versioning. Not recommended as a primary strategy.

---

## Non-Breaking Changes That Don't Need Versioning

Many changes can be deployed without bumping the version if you follow additive-only practices:

```json
// v1 response (existing consumers rely on this shape)
{
  "id": "user_123",
  "name": "Alice"
}

// Deploy new field — existing consumers ignore unknown fields
{
  "id": "user_123",
  "name": "Alice",
  "avatarUrl": "https://cdn.example.com/123.jpg",  // NEW — safe addition
  "createdAt": "2025-01-15T09:00:00Z"              // NEW — safe addition
}
```

Consumers should be written to ignore fields they don't recognize (Postel's Law: be conservative in what you send, liberal in what you accept). Document this expectation explicitly.

---

## Deprecating Old Versions: Sunset Headers

When you're ready to retire a version, communicate it clearly using the `Sunset` HTTP header:

```http
HTTP/1.1 200 OK
Sunset: Sun, 01 Mar 2027 00:00:00 GMT
Deprecation: Tue, 01 Apr 2026 00:00:00 GMT
Link: <https://docs.example.com/migrate-v1-to-v2>; rel="successor-version",
      <https://docs.example.com/deprecation>; rel="deprecation"
```

**Deprecation timeline best practices:**
- **Announce deprecation** at least 6 months before sunset for public APIs
- **Set `Deprecation` header** from the announcement date
- **Set `Sunset` header** for the actual end-of-life date
- **Include a migration guide URL** in the `Link` header
- **Send email notifications** to registered API consumers 90, 30, and 7 days before sunset
- **Return 410 Gone** (not 404) after the version is removed

---

## Consumer-Driven Contract Testing

Before deprecating or changing any endpoint, verify that no consumer depends on the old behavior. Consumer-driven contract testing (Pact) solves this:

```javascript
// Consumer test: specifies what the consumer expects
const interaction = {
  state: 'user 123 exists',
  uponReceiving: 'a request for user 123',
  withRequest: {
    method: 'GET',
    path: '/v1/users/123',
    headers: { Accept: 'application/json' }
  },
  willRespondWith: {
    status: 200,
    body: {
      id: '123',
      name: like('Alice'),      // Type matching
      email: like('alice@example.com')
    }
  }
};
```

The contract is published to a Pact Broker. Your API's CI pipeline checks all consumer contracts before merging changes — if any consumer would break, the pipeline fails.

---

## Real-World Case Studies

**Stripe**: Date-based header versioning (`Stripe-Version: 2024-06-20`). Each customer is pinned to the API version from when they first integrated. Stripe maintains dozens of active versions simultaneously. Complex to maintain but maximally consumer-friendly.

**Twilio**: URL path versioning (`/2010-04-01/Accounts/`) using date-based paths. Stable for years — once published, a version never changes.

**GitHub**: URL path versioning (`/v3/`, now transitioning to graphql). Clear, simple, widely understood.

**AWS**: Uses date-based query parameters for some services (`Version=2016-11-15`). Legacy choice; not recommended for new APIs.

---

## Decision Guide

| Situation | Recommended Strategy |
|-----------|---------------------|
| Public API with broad third-party adoption | URL path versioning |
| Internal API, TypeScript monorepo | Header versioning or tRPC (skip versioning) |
| Need Stripe-level version granularity | Date-based header versioning |
| Strict REST compliance matters | Content negotiation (rare) |
| Quick prototype | Query parameter |

The most important thing isn't which strategy you choose — it's that you **choose one and apply it consistently**, communicate changes clearly to consumers, and give adequate deprecation notice before breaking anything.
