---
title: "REST API Design: 10 Best Practices Every Developer Should Follow"
description: "10 REST API design best practices covering naming conventions, versioning, error handling, authentication, pagination, and documentation. With real code examples."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["rest-api", "api-design", "backend", "http", "developer-best-practices", "web-development"]
readingTime: "13 min read"
---

A REST API is a contract. Every developer who integrates with your API is trusting that the contract is consistent, predictable, and clearly documented. When it isn't, they write defensive code, open support tickets, and eventually avoid your API if they have alternatives.

The good news is that excellent API design doesn't require brilliance — it requires following a small set of conventions that the industry has converged on over the past two decades. This guide covers the 10 most important ones, with concrete examples for each.

## TL;DR

- Use nouns (resources) in URLs, not verbs
- Match HTTP methods to their intended semantics (GET = read, POST = create, etc.)
- Version your API from day one (`/v1/`)
- Return consistent error objects with a machine-readable code and human-readable message
- Use correct HTTP status codes — 200, 201, 400, 401, 403, 404, 422, 429, 500
- Paginate every list endpoint with `limit`/`offset` or cursor-based pagination
- Expose filtering, sorting, and searching via query parameters
- Enforce HTTPS and use token-based authentication (OAuth2, JWT, or API keys)
- Rate limit every endpoint and communicate limits in response headers
- Document with OpenAPI/Swagger so clients can generate their own SDKs

---

## Why API Design Matters

Bad API design isn't just an inconvenience. It has real costs:

- **Integration time**: Developers spend days understanding inconsistent APIs that should take hours
- **Bug surface**: Surprising behavior (wrong status codes, inconsistent error shapes) causes integration bugs
- **Versioning debt**: APIs designed without versioning in mind force breaking changes on existing clients
- **Support burden**: Poor documentation generates a constant stream of "how do I..." questions

A well-designed API, on the other hand, is largely self-documenting. Developers can guess correct behavior from the patterns they've already learned.

---

## Practice 1: Use Nouns, Not Verbs in Endpoints

REST URLs identify resources. HTTP methods express the action. Mixing verbs into your URLs creates duplication and inconsistency.

```
# Bad — action verbs in the URL
GET  /getUsers
POST /createUser
POST /deleteUser/42
POST /getUserOrders/42

# Good — nouns, HTTP method carries the action
GET    /users
POST   /users
DELETE /users/42
GET    /users/42/orders
```

This matters for predictability. When a developer sees `/users`, they can immediately guess that `GET /users` lists users, `POST /users` creates one, and `GET /users/42` fetches a specific one — without reading docs.

Use plural nouns for collections (`/users`, not `/user`) and keep nesting shallow (max two levels deep):

```
# Good
GET /users/42/orders

# Avoid — too deep to be usable
GET /users/42/orders/7/items/3/reviews
```

---

## Practice 2: Use HTTP Methods Correctly

HTTP defines methods with specific semantics. Violating them breaks client caching, proxy behavior, and developer expectations.

| Method | Semantics | Idempotent | Body |
|--------|-----------|------------|------|
| `GET` | Read a resource | Yes | No |
| `POST` | Create a new resource | No | Yes |
| `PUT` | Replace a resource entirely | Yes | Yes |
| `PATCH` | Partially update a resource | No | Yes |
| `DELETE` | Remove a resource | Yes | No |

```
GET    /products/99         → return product 99
POST   /products            → create a new product (returns 201 + Location header)
PUT    /products/99         → replace product 99 entirely
PATCH  /products/99         → update only the fields provided
DELETE /products/99         → delete product 99
```

The `PUT` vs `PATCH` distinction trips up many developers. `PUT` requires the full resource representation — omitting a field means setting it to null. `PATCH` only updates what you send:

```json
// PATCH /products/99
// Only updates the price — other fields unchanged
{ "price": 29.99 }
```

---

## Practice 3: Version Your API

Add versioning from day one. It is nearly impossible to retrofit later without breaking existing clients.

```
/v1/users
/v1/products
/v2/users    ← breaking change, new major version
```

URI path versioning (`/v1/`) is the most common and most visible. Some teams prefer header-based versioning (`Accept: application/vnd.api.v2+json`), but URI versioning is simpler for clients to reason about and easier to test in a browser.

Semantic versioning rules for APIs:

- **Major version** (`v1` → `v2`): Breaking changes (removed fields, renamed endpoints, changed behavior)
- **Minor/patch**: Additive changes only — new optional fields, new endpoints, new optional query params

Keep old versions alive for a deprecation window (6–12 months minimum for public APIs). Communicate deprecation clearly in response headers:

```http
Deprecation: true
Sunset: Sat, 01 Jan 2025 00:00:00 GMT
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

---

## Practice 4: Return Consistent Error Objects

Every error response should have the same shape. Clients should never need to write different error-handling code for different endpoints.

A solid error format:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request body contains invalid data.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address."
      },
      {
        "field": "age",
        "message": "Must be a positive integer."
      }
    ],
    "requestId": "req_8fh3j2k1",
    "docsUrl": "https://docs.example.com/errors/VALIDATION_FAILED"
  }
}
```

Key fields:

- `code`: Machine-readable error identifier (use `SCREAMING_SNAKE_CASE`)
- `message`: Human-readable description
- `details`: Array of field-level errors for validation failures
- `requestId`: Unique ID for this request — invaluable for debugging support tickets
- `docsUrl`: Link to documentation for this error

Never expose internal error messages, stack traces, or SQL errors in production responses. Log those server-side; return a sanitized message to the client.

Use the [JSON Formatter](/tools/json-formatter) to validate your error response shapes during development — it catches malformed JSON instantly.

---

## Practice 5: Use Proper HTTP Status Codes

Status codes tell clients what happened without them having to parse the body. Use the right ones consistently:

**2xx — Success**
```
200 OK           — Successful GET, PUT, PATCH
201 Created      — Successful POST (resource created)
204 No Content   — Successful DELETE (no body)
```

**4xx — Client errors**
```
400 Bad Request     — Malformed request body or query params
401 Unauthorized    — No auth credentials provided
403 Forbidden       — Valid credentials, but insufficient permissions
404 Not Found       — Resource doesn't exist
405 Method Not Allowed — HTTP method not supported for this endpoint
409 Conflict        — State conflict (e.g., duplicate email on register)
422 Unprocessable   — Request is well-formed but semantically invalid
429 Too Many Requests — Rate limit exceeded
```

**5xx — Server errors**
```
500 Internal Server Error — Generic server failure
502 Bad Gateway           — Upstream service failed
503 Service Unavailable   — Server is down or overloaded
```

Common mistakes to avoid:

```
# Bad — using 200 for errors
HTTP/1.1 200 OK
{ "status": "error", "message": "User not found" }

# Bad — using 500 for client errors (missing required field)
HTTP/1.1 500 Internal Server Error

# Bad — using 404 for authentication failures
HTTP/1.1 404 Not Found
{ "message": "Not authorized" }
# (This should be 401)
```

---

## Practice 6: Paginate List Endpoints

Never return unbounded lists. A `GET /users` that returns 50,000 records will bring your API and your clients down.

**Offset-based pagination** (simple, widely understood):

```
GET /users?limit=20&offset=0    → first page
GET /users?limit=20&offset=20   → second page
GET /users?limit=20&offset=40   → third page
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "total": 1247,
    "limit": 20,
    "offset": 0,
    "nextOffset": 20,
    "hasMore": true
  }
}
```

**Cursor-based pagination** (better for real-time data, no skipped/duplicated records):

```
GET /posts?limit=20                            → first page
GET /posts?limit=20&after=cursor_abc123        → next page
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "cursor_xyz789",
    "hasMore": true
  }
}
```

Cursor-based is preferable when the underlying data changes frequently (e.g., a live feed). Offset-based is fine for stable datasets.

---

## Practice 7: Filter, Sort, and Search via Query Params

Don't create separate endpoints for every filtering combination. Use query parameters:

```
# Filtering
GET /products?category=electronics&inStock=true&maxPrice=500

# Sorting
GET /products?sort=price&order=asc
GET /products?sort=-createdAt          (prefix - for descending)

# Searching
GET /products?q=wireless+headphones

# Combined
GET /products?category=electronics&sort=-price&limit=10&offset=0
```

Document the available filter fields, sort options, and search behavior explicitly. Undocumented query params that silently return wrong results are a common source of client bugs.

For validating endpoint URL patterns, the [Regex Tester](/tools/regex-tester) is useful for building and testing path matching patterns in your routing layer.

---

## Practice 8: Use HTTPS and Authentication

**HTTPS is non-negotiable.** Serving a REST API over HTTP exposes credentials and data to anyone on the network. Every public API must use HTTPS. Period.

For authentication, the three most common patterns:

**API Keys** (simplest — good for server-to-server):
```http
GET /v1/users
Authorization: Bearer sk_live_abc123xyz
```

**JWT (JSON Web Tokens)** (stateless, good for user-facing APIs):
```http
GET /v1/users/me
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

Decode and inspect JWTs during development with the [JWT Decoder](/tools/jwt-decoder) — it shows you the header, payload, and expiry without needing to implement decoding yourself.

**OAuth 2.0** (delegated access — when third parties need to act on behalf of users):
```
Authorization Code flow for user-facing apps
Client Credentials flow for server-to-server
```

For all patterns, follow these security rules:
- Never log full auth tokens
- Rotate secrets and tokens regularly
- Use short expiry times for JWTs (15 minutes to 1 hour)
- Revoke tokens on logout and password change

---

## Practice 9: Rate Limit Your API

Without rate limiting, a single misbehaving client can bring down your API for everyone. Implement limits and communicate them clearly in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1706745600
Retry-After: 47
```

When a client exceeds the limit:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

Common rate limiting strategies:

- **Fixed window**: 1000 requests per hour, resets at the top of each hour
- **Sliding window**: 1000 requests per any rolling 60-minute window (smoother, fairer)
- **Token bucket**: Requests consume tokens; tokens refill at a fixed rate (allows short bursts)

Apply different limits by tier: free vs. paid, authenticated vs. unauthenticated. Unauthenticated requests should have the strictest limits.

---

## Practice 10: Document with OpenAPI/Swagger

If your API isn't documented, it isn't useful. If your documentation is out of date, it's actively harmful.

OpenAPI (formerly Swagger) is the industry standard for REST API documentation. An OpenAPI specification is a YAML or JSON file that describes every endpoint, parameter, request body, and response:

```yaml
openapi: 3.0.3
info:
  title: Example API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Paginated list of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/Unauthorized'
  /users/{id}:
    get:
      summary: Get a user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: User object
        '404':
          $ref: '#/components/responses/NotFound'
```

The benefits of an OpenAPI spec go beyond documentation:

- **Auto-generated client SDKs** in any language (using `openapi-generator`)
- **Request validation** in your framework (FastAPI, NestJS, and others do this natively)
- **Interactive playground** via Swagger UI or Redoc
- **Contract testing** — verify your implementation matches the spec in CI

Generate the spec from code annotations where your framework supports it (FastAPI with Python type hints, NestJS with decorators, Rails with `rswag`). Hand-writing the spec works too but drifts from implementation faster.

---

## Putting It All Together

A request to a well-designed API looks like this:

```http
GET /v1/products?category=electronics&sort=-price&limit=20&offset=0 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbG...
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1706745600

{
  "data": [
    {
      "id": "prod_abc123",
      "name": "Sony WH-1000XM5",
      "category": "electronics",
      "price": 349.99,
      "inStock": true,
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 184,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

Clean URL structure, proper HTTP method, versioned path, consistent response shape, pagination metadata, rate limit headers visible. A developer seeing this response for the first time can understand exactly what happened and what to do next.

That predictability — more than any individual practice in isolation — is what makes an API a pleasure to work with.
