---
title: "REST API Best Practices: Endpoint Naming, Versioning, and Error Handling"
description: "Design clean, consistent REST APIs with proper URL naming, HTTP methods, versioning, error formats, pagination, auth, and rate limiting."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["api", "rest", "backend", "web-development", "best-practices"]
readingTime: "9 min read"
---

A well-designed REST API is a pleasure to integrate with. A poorly designed one forces every consumer to write defensive code, read through pages of docs, and guess at behavior. The difference usually comes down to consistency: consistent URLs, consistent HTTP method usage, consistent error shapes. This guide covers the core best practices that separate professional API design from amateur work.

## URL Design: Nouns, Not Verbs

REST URLs should identify resources (things), not actions. HTTP methods express the action.

```
# Bad — verbs in the URL
GET  /getUsers
POST /createUser
POST /deleteUser/42
POST /updateUserEmail

# Good — nouns, HTTP method carries the action
GET    /users
POST   /users
DELETE /users/42
PATCH  /users/42
```

### Use Plural Nouns for Collections

Plural is the convention. It is consistent regardless of whether you are operating on a collection or a single item.

```
GET  /users         — list all users
POST /users         — create a new user
GET  /users/42      — get user 42
PUT  /users/42      — replace user 42 entirely
PATCH /users/42     — partially update user 42
DELETE /users/42    — delete user 42
```

### Nest for Relationships, but Stay Shallow

Nest related resources under their parent, but avoid going deeper than two levels.

```
# Good
GET  /users/42/orders          — orders belonging to user 42
POST /users/42/orders          — create order for user 42

# Avoid — too deep, hard to read
GET  /users/42/orders/7/items/3/reviews
```

If the nested resource makes sense on its own, give it a top-level endpoint too:

```
GET /orders/7        — direct access by ID
GET /orders/7/items  — items within that order
```

### Use Hyphens, Not Underscores, in URLs

URLs are case-insensitive and underscores can be hidden by link underlining.

```
# Good
GET /blog-posts
GET /user-profiles

# Avoid
GET /blog_posts
GET /userProfiles
```

## HTTP Methods: Use Them Correctly

| Method | Purpose | Idempotent | Safe |
|---|---|---|---|
| `GET` | Retrieve a resource | Yes | Yes |
| `POST` | Create a resource or trigger action | No | No |
| `PUT` | Replace a resource entirely | Yes | No |
| `PATCH` | Partially update a resource | No | No |
| `DELETE` | Remove a resource | Yes | No |

**Idempotent** means calling the same request multiple times has the same effect as calling it once. `PUT /users/42` with the same body is safe to retry. `POST /users` creates a new user each time.

```bash
# PATCH — send only the fields to change
PATCH /users/42
{
  "email": "new@example.com"
}

# PUT — send the complete resource representation
PUT /users/42
{
  "id": 42,
  "name": "Alice",
  "email": "new@example.com",
  "role": "admin"
}
```

## API Versioning

Versioning lets you evolve your API without breaking existing consumers. The two main strategies are **URL-based versioning** and **header-based versioning**.

### URL Versioning (Recommended)

Include the version in the path. It is explicit, easy to test in a browser, and easy to document.

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

```bash
# v1 response
GET /v1/users/42
{ "name": "Alice Smith" }

# v2 response — new field added, old field renamed
GET /v2/users/42
{ "full_name": "Alice Smith", "display_name": "Alice" }
```

### Header Versioning

The version is passed in a custom request header.

```http
GET /users/42
Accept: application/vnd.example.v2+json
```

Header versioning keeps URLs clean but is harder to test, cache, and share. Most public APIs use URL versioning for its simplicity.

### Versioning Rules

- Never make breaking changes within a version (removing fields, changing types, renaming keys).
- Additive changes (new optional fields, new endpoints) are non-breaking and do not require a new version.
- Maintain at least one previous version for a deprecation window (typically 6–12 months).
- Use a `Sunset` header to signal deprecation:

```http
HTTP/1.1 200 OK
Sunset: Sat, 31 Dec 2026 23:59:59 GMT
Deprecation: true
Link: <https://api.example.com/v2/users>; rel="successor-version"
```

## Consistent Error Response Format

Every error — regardless of status code — should have the same JSON shape. Clients can then handle errors generically.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address."
      },
      {
        "field": "age",
        "message": "Must be at least 18."
      }
    ],
    "request_id": "req_abc123"
  }
}
```

Key fields:
- **`code`** — machine-readable string constant (used in client `switch` statements)
- **`message`** — human-readable description (may be shown in UI)
- **`details`** — field-level errors for validation
- **`request_id`** — unique ID for correlating with server logs (invaluable for debugging)

```js
// Client can now handle errors without parsing strings
switch (error.code) {
  case "VALIDATION_ERROR":  showFieldErrors(error.details); break;
  case "RATE_LIMITED":      scheduleRetry(error.retry_after); break;
  case "NOT_FOUND":         show404Page(); break;
  default:                  showGenericError(); break;
}
```

## Pagination

Never return unbounded lists. Always paginate collection endpoints.

### Cursor-Based Pagination (Preferred)

Cursor pagination is stable — inserting or deleting records does not cause items to appear twice or be skipped.

```
GET /users?limit=20&after=cursor_xyz

{
  "data": [...],
  "pagination": {
    "has_next": true,
    "next_cursor": "cursor_abc",
    "has_prev": true,
    "prev_cursor": "cursor_def"
  }
}
```

### Offset-Based Pagination

Simpler to implement, but can miss or duplicate items when the dataset changes between pages.

```
GET /users?page=3&per_page=20

{
  "data": [...],
  "pagination": {
    "page": 3,
    "per_page": 20,
    "total": 347,
    "total_pages": 18
  }
}
```

## Authentication

Use **Bearer tokens** (JWT or opaque) via the `Authorization` header. Never put tokens in URLs — they end up in server logs.

```http
# Correct
GET /users/42
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...

# Never do this
GET /users/42?token=eyJhbGciOiJSUzI1NiJ9...
```

For service-to-service calls, API keys are common:

```http
GET /data
X-API-Key: sk_live_abc123
```

Return `401 Unauthorized` when credentials are missing or invalid, and `403 Forbidden` when credentials are valid but the user lacks permission.

## Rate Limiting

Include rate limit headers on every response so consumers can self-throttle before hitting the limit.

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 873
X-RateLimit-Reset: 1711065600
```

When the limit is exceeded, return `429 Too Many Requests` with a `Retry-After` header:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711065600

{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Retry after 30 seconds.",
    "retry_after": 30
  }
}
```

## Quick Design Checklist

Before releasing any API endpoint, verify:

- [ ] URL uses plural nouns, no verbs
- [ ] Correct HTTP method for the operation
- [ ] Version prefix in the URL (`/v1/`)
- [ ] Success responses use the correct 2xx code (200/201/204)
- [ ] Error responses follow the standard error shape with a `code` field
- [ ] Collection endpoints are paginated with metadata
- [ ] Authentication via `Authorization: Bearer` header
- [ ] Rate limit headers present on all responses
- [ ] `request_id` included in error responses for debuggability
- [ ] No sensitive data (tokens, passwords) in URLs

A consistent, predictable API is its own best documentation. When consumers can guess the endpoint for any resource just from knowing the pattern, your API is doing its job.
