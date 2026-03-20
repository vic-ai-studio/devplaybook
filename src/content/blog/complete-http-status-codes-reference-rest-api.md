---
title: "Complete HTTP Status Codes Reference for REST API Devs"
description: "The complete HTTP status codes reference for REST API developers. Every 1xx, 2xx, 3xx, 4xx, and 5xx code explained with real-world API examples and best practices."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["http", "api", "rest", "web-development", "backend", "reference", "2026"]
readingTime: "13 min read"
---

HTTP status codes are the contract language of APIs. When your frontend receives a response, the status code is the first signal: did it work, where did it go, what went wrong? A good API uses status codes precisely; a confusing API returns `200 OK` with `"error": true` in the body.

This reference covers every status code you'll encounter in REST API development—with the context, examples, and gotchas that actually matter. Use the [DevPlaybook HTTP Status Codes Tool](/tools/http-status-codes) to look up any code quickly.

---

## Status Code Categories

| Range | Category | Your API Should... |
|-------|----------|-------------------|
| 1xx | Informational | Rarely return these manually |
| 2xx | Success | Be specific: `200` vs `201` vs `204` |
| 3xx | Redirection | Use `301`/`308` for permanent, `302`/`307` for temporary |
| 4xx | Client Error | Be descriptive: explain what the client did wrong |
| 5xx | Server Error | Never expose internals; log details server-side |

---

## 1xx — Informational

Informational codes are protocol-level responses that indicate the server received the request and is processing it. REST APIs rarely return these explicitly—they're typically handled at the HTTP/infrastructure layer.

### 100 Continue

The server received the request headers and the client should proceed with the request body. Used when clients send an `Expect: 100-continue` header before sending large payloads.

**Practical note:** Most HTTP clients handle this automatically. You'll encounter it when uploading large files or request bodies.

### 101 Switching Protocols

The server accepts the client's request to switch protocols—most commonly HTTP → WebSocket.

```javascript
// Client initiates WebSocket upgrade
const ws = new WebSocket('wss://api.example.com/ws');
// Server responds with 101 Switching Protocols
// Upgrade: websocket
// Connection: Upgrade
```

### 103 Early Hints

Allows the server to send response headers before the final HTTP message, enabling the client to start preloading resources. Used in CDN/edge optimization, not typically in API responses.

---

## 2xx — Success

### 200 OK

The default success response. The request succeeded and the response body contains the result.

**Use for:**
- `GET` requests that return data
- `POST` requests that return the created/updated resource
- `PUT`/`PATCH` requests when returning the updated resource

```http
GET /api/users/42
→ 200 OK
{
  "id": 42,
  "name": "Alice",
  "email": "alice@example.com"
}
```

**Don't use `200` when:**
- Nothing was returned (use `204`)
- A resource was created (use `201`)
- The request is being processed asynchronously (use `202`)

### 201 Created

A new resource was created successfully. Should include a `Location` header pointing to the new resource.

```http
POST /api/users
{ "name": "Bob", "email": "bob@example.com" }
→ 201 Created
Location: /api/users/43
{
  "id": 43,
  "name": "Bob",
  "email": "bob@example.com"
}
```

**Always return the created resource** (or at minimum the ID) in the body. Forcing clients to make a separate `GET` request is unnecessary friction.

### 202 Accepted

The request was accepted for processing, but processing is not yet complete. The classic async operation response.

```http
POST /api/reports/generate
{ "type": "monthly", "month": "2026-02" }
→ 202 Accepted
{
  "jobId": "job_abc123",
  "statusUrl": "/api/jobs/job_abc123",
  "estimatedSeconds": 30
}
```

Always include a way to check status—either a `statusUrl` in the body or a polling endpoint.

### 204 No Content

The request succeeded, but there's no content to return. The browser/client should not navigate away from the current page.

**Use for:**
- `DELETE` operations (resource successfully deleted)
- `PUT`/`PATCH` when you don't want to return the full resource
- Any successful operation with no meaningful response body

```http
DELETE /api/users/42
→ 204 No Content
(empty body)
```

**Common mistake:** Returning `200` with an empty body. Use `204` instead—it explicitly signals "success, nothing to show."

### 206 Partial Content

The server is delivering part of the resource due to a range request. Used for large file downloads, video streaming, and chunked data transfer.

```http
GET /api/files/video.mp4
Range: bytes=0-1048575
→ 206 Partial Content
Content-Range: bytes 0-1048575/52428800
Content-Type: video/mp4
```

---

## 3xx — Redirection

### 301 Moved Permanently

The resource has permanently moved to a new URL. Browsers and HTTP clients should cache this redirect and update their bookmarks/links.

```http
GET /api/v1/users
→ 301 Moved Permanently
Location: /api/v2/users
```

**Important:** `301` redirects cause `POST` requests to become `GET` requests in many clients (legacy behavior). Use `308` for permanent redirects that preserve the HTTP method.

### 302 Found (Temporary Redirect)

The resource is temporarily at a different URL. Clients should continue to use the original URL for future requests. Same method-change caveat as `301`—use `307` to preserve the method.

### 304 Not Modified

The resource hasn't changed since the client's last request. Used with conditional requests (`If-Modified-Since`, `If-None-Match`).

```http
GET /api/articles/10
If-None-Match: "abc123"
→ 304 Not Modified
(empty body — client uses cached version)
```

Implementing `304` properly can dramatically reduce bandwidth for read-heavy APIs.

### 307 Temporary Redirect

Same as `302` but explicitly preserves the HTTP method. A `POST` request to a `307` location stays a `POST`.

### 308 Permanent Redirect

Same as `301` but preserves the HTTP method. The correct choice when permanently redirecting non-GET endpoints.

---

## 4xx — Client Errors

The 4xx range is where REST API design matters most. Vague error responses make debugging painful; precise error responses make integrators productive.

### 400 Bad Request

The request is malformed or contains invalid data.

```json
// Request
POST /api/users
{ "email": "not-an-email", "age": -5 }

// Response: 400 Bad Request
{
  "error": "validation_failed",
  "message": "Request contains invalid fields",
  "details": [
    { "field": "email", "code": "invalid_format", "message": "Must be a valid email address" },
    { "field": "age", "code": "out_of_range", "message": "Must be a positive number" }
  ]
}
```

**Best practice:** Return all validation errors at once, not just the first one. Include field names and human-readable messages.

### 401 Unauthorized

Authentication is required and has not been provided, or the provided credentials are invalid.

```http
GET /api/profile
(no Authorization header)
→ 401 Unauthorized
WWW-Authenticate: Bearer realm="api"
{
  "error": "authentication_required",
  "message": "Please provide a valid Bearer token"
}
```

**Common confusion:** `401` means "not authenticated." `403` means "authenticated but not authorized." The naming is historical and confusing—just remember: `401` = who are you? `403` = I know who you are, but no.

### 403 Forbidden

The client is authenticated but lacks permission to access the requested resource.

```json
// 403 Forbidden
{
  "error": "insufficient_permissions",
  "message": "You do not have access to this resource",
  "required_role": "admin"
}
```

**Privacy consideration:** For sensitive resources, returning `404` instead of `403` prevents enumeration attacks—the client can't tell if the resource exists or is just restricted. Choose based on your security model.

### 404 Not Found

The requested resource does not exist.

```json
// 404 Not Found
{
  "error": "not_found",
  "message": "User with ID 99999 not found"
}
```

**Use consistently for:**
- Resource IDs that don't exist
- Routes that don't exist (handled by your router automatically)
- Resources deleted in the past (return `410 Gone` if you want to distinguish)

### 405 Method Not Allowed

The HTTP method used is not supported for this endpoint. Must include an `Allow` header listing valid methods.

```http
DELETE /api/articles/10/comments
→ 405 Method Not Allowed
Allow: GET, POST
```

### 408 Request Timeout

The client took too long to send the request. The server closed the connection. Rare in REST APIs but possible with slow upload connections.

### 409 Conflict

The request conflicts with the current state of the resource. Common for:
- Duplicate creation attempts
- Optimistic concurrency conflicts
- State machine violations

```json
// 409 Conflict — duplicate email
{
  "error": "conflict",
  "message": "A user with this email already exists",
  "field": "email"
}

// 409 Conflict — optimistic lock
{
  "error": "conflict",
  "message": "Resource was modified since you last fetched it",
  "current_version": 7,
  "your_version": 5
}
```

### 410 Gone

The resource existed but has been permanently deleted. Unlike `404`, `410` signals to search engines and caches that the URL should be removed.

```json
// 410 Gone
{
  "error": "resource_deleted",
  "message": "This account was permanently deleted on 2025-01-15"
}
```

### 413 Content Too Large

The request body exceeds the server's configured limit.

```json
// 413 Content Too Large
{
  "error": "payload_too_large",
  "message": "Request body exceeds 10MB limit",
  "max_bytes": 10485760
}
```

### 415 Unsupported Media Type

The request's `Content-Type` is not supported by this endpoint.

```json
// 415 Unsupported Media Type
{
  "error": "unsupported_media_type",
  "message": "Content-Type must be application/json",
  "supported": ["application/json", "application/x-www-form-urlencoded"]
}
```

### 422 Unprocessable Entity

The request is syntactically correct but semantically invalid—the data can be parsed but violates business rules.

```json
// Request: valid JSON, but business rule violated
POST /api/invoices
{ "amount": 100, "currency": "XYZ" }

// 422 Unprocessable Entity
{
  "error": "unprocessable",
  "message": "Currency XYZ is not supported",
  "supported_currencies": ["USD", "EUR", "GBP"]
}
```

**400 vs 422:** Use `400` for structural problems (malformed JSON, missing required fields). Use `422` for semantic problems (valid request that violates business logic).

### 429 Too Many Requests

The client has exceeded the rate limit. Must include `Retry-After` and ideally rate limit headers.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711060000

{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please wait 60 seconds.",
  "retry_after": 60
}
```

### 451 Unavailable For Legal Reasons

The resource is not available due to legal demands (censorship, court orders, DMCA). Named after Fahrenheit 451.

---

## 5xx — Server Errors

5xx errors indicate the server failed to fulfill a valid request. Rule #1: never expose internal error details (stack traces, database errors, file paths) in 5xx responses. Log everything, return minimal information.

### 500 Internal Server Error

The default server error. Something unexpected happened.

```json
// What you return to the client
{
  "error": "internal_server_error",
  "message": "An unexpected error occurred",
  "request_id": "req_abc123"
}

// What you log on the server (never send to client)
{
  "timestamp": "2026-03-21T10:30:00Z",
  "request_id": "req_abc123",
  "error": "TypeError: Cannot read properties of undefined (reading 'userId')",
  "stack": "...",
  "user_id": 42,
  "route": "GET /api/profile"
}
```

Include a `request_id` in error responses so support teams can correlate client reports to server logs.

### 501 Not Implemented

The server does not support the functionality required to fulfill the request. Returned for HTTP methods the server doesn't implement at all (rare in practice).

### 502 Bad Gateway

A proxy/gateway server received an invalid response from an upstream server. Common in microservices: your API gateway can't reach a downstream service.

### 503 Service Unavailable

The server is temporarily unable to handle requests—due to maintenance, overload, or dependency failure. Include `Retry-After` when possible.

```http
HTTP/1.1 503 Service Unavailable
Retry-After: 120

{
  "error": "service_unavailable",
  "message": "The service is temporarily unavailable for scheduled maintenance",
  "retry_after": 120,
  "status_url": "https://status.example.com"
}
```

### 504 Gateway Timeout

A proxy/gateway server didn't receive a timely response from an upstream server. Common in API integrations and microservice chains with slow dependencies.

---

## REST API Error Response Best Practices

### Consistent Error Shape

Pick a structure and stick to it across all error responses:

```typescript
interface ApiError {
  error: string;       // Machine-readable error code: "not_found", "validation_failed"
  message: string;     // Human-readable description
  request_id: string;  // For support correlation
  details?: Array<{    // Optional: field-level errors
    field: string;
    code: string;
    message: string;
  }>;
  docs_url?: string;   // Link to relevant API documentation
}
```

### Never Return 200 with Error in Body

```json
// Bad — forces clients to parse body to detect errors
200 OK
{ "success": false, "error": "User not found" }

// Good — HTTP status code carries the error signal
404 Not Found
{ "error": "not_found", "message": "User not found" }
```

### Use Status Codes for Caching

- `200` responses are cacheable by default (with proper `Cache-Control`)
- `404` and `410` can be cached (CDN can serve cached 404s)
- `401` and `403` should not be cached
- `500` should not be cached

### Return Helpful 4xx Messages

```json
// Unhelpful
{ "error": "Bad Request" }

// Helpful
{
  "error": "validation_failed",
  "message": "The request body is missing required fields",
  "details": [
    { "field": "email", "code": "required", "message": "Email address is required" }
  ],
  "docs_url": "https://api.example.com/docs/users#create"
}
```

---

## Quick Reference Table

| Code | Name | When to Use |
|------|------|-------------|
| 200 | OK | Standard success with response body |
| 201 | Created | Resource created (POST) |
| 202 | Accepted | Async operation queued |
| 204 | No Content | Success, no response body (DELETE) |
| 206 | Partial Content | Range request fulfilled |
| 301 | Moved Permanently | Permanent redirect (changes to GET) |
| 304 | Not Modified | Conditional GET — use cached version |
| 307 | Temporary Redirect | Temp redirect, preserve method |
| 308 | Permanent Redirect | Permanent redirect, preserve method |
| 400 | Bad Request | Malformed request or validation error |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | HTTP method not supported |
| 409 | Conflict | State conflict or duplicate |
| 410 | Gone | Resource permanently deleted |
| 413 | Content Too Large | Request body too big |
| 415 | Unsupported Media Type | Wrong Content-Type |
| 422 | Unprocessable Entity | Semantic validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server failure |
| 502 | Bad Gateway | Upstream server error |
| 503 | Service Unavailable | Server overloaded or in maintenance |
| 504 | Gateway Timeout | Upstream server timeout |

---

## Explore More

The [DevPlaybook HTTP Status Codes Tool](/tools/http-status-codes) provides a searchable reference for every HTTP status code with descriptions and use cases. Keep it open when designing your API contract or debugging integration issues.

For testing your API's status code responses, the [API Request Builder](/tools/api-request-builder) lets you send requests and inspect responses directly in the browser.

---

*Need to test regex patterns on API response bodies? The [Regex Tester](/tools/regex-tester) makes it easy. Working with JWT authentication in your API? Check out our [JWT Decoder guide](/blog/best-free-jwt-decoder-tools-2026).*
