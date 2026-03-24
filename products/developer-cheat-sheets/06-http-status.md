# HTTP Status Codes Cheat Sheet

---

## 2xx — Success

| Code | Name | When to Use |
|------|------|-------------|
| **200** | OK | Standard success for GET, PUT, PATCH |
| **201** | Created | Resource was created (POST) — include `Location` header |
| **202** | Accepted | Request accepted, processing async — return job ID |
| **204** | No Content | Success with no body (DELETE, or PUT with no response) |
| **206** | Partial Content | Range requests (streaming, large file downloads) |

**Rules of thumb:**
- POST that creates → 201
- DELETE → 204 (or 200 with body if you return deleted resource)
- Async background job → 202 with job status URL

---

## 3xx — Redirection

| Code | Name | When to Use |
|------|------|-------------|
| **301** | Moved Permanently | URL changed forever — browser caches, use for SEO redirects |
| **302** | Found | Temporary redirect — browser doesn't cache |
| **303** | See Other | After POST, redirect to GET (Post/Redirect/Get pattern) |
| **304** | Not Modified | Client cache is still valid (ETag/If-None-Match) |
| **307** | Temporary Redirect | Same as 302 but preserves HTTP method |
| **308** | Permanent Redirect | Same as 301 but preserves HTTP method |

**Rules of thumb:**
- Permanent URL change → 301
- Temporary redirect → 302 or 307 (use 307 if method matters)
- After form POST → 303 to prevent duplicate submissions

---

## 4xx — Client Errors

| Code | Name | When to Use |
|------|------|-------------|
| **400** | Bad Request | Malformed request, invalid input, validation failure |
| **401** | Unauthorized | Not authenticated (no/invalid token) — despite name, means "unauthenticated" |
| **403** | Forbidden | Authenticated but no permission — you know who they are, they can't do this |
| **404** | Not Found | Resource doesn't exist |
| **405** | Method Not Allowed | HTTP method not supported for this endpoint |
| **409** | Conflict | State conflict (duplicate, version mismatch, already exists) |
| **410** | Gone | Resource permanently deleted (vs 404 which may come back) |
| **422** | Unprocessable Entity | Request is well-formed but semantically invalid (RFC 9110 preferred over 400) |
| **429** | Too Many Requests | Rate limit exceeded — include `Retry-After` header |

**401 vs 403:**
- 401 = "Who are you? Please log in."
- 403 = "I know who you are. You can't do this."

**400 vs 422:**
- 400 = Malformed syntax (can't parse it)
- 422 = Valid syntax, invalid business logic (email already taken, invalid state transition)

---

## 5xx — Server Errors

| Code | Name | When to Use |
|------|------|-------------|
| **500** | Internal Server Error | Unexpected server error — include a correlation ID in response |
| **501** | Not Implemented | Method/feature not implemented yet |
| **502** | Bad Gateway | Upstream service returned invalid response |
| **503** | Service Unavailable | Server down, overloaded, or maintenance — include `Retry-After` |
| **504** | Gateway Timeout | Upstream service timed out |

**Rules of thumb:**
- Never expose stack traces in 5xx responses to clients
- Always log server errors with correlation IDs
- 503 during deployments + `Retry-After` = graceful handling

---

## Headers to Include

| Scenario | Header |
|----------|--------|
| Created resource | `Location: /resources/123` |
| Rate limited | `Retry-After: 60` (seconds) |
| Caching | `Cache-Control: max-age=3600` |
| No cache | `Cache-Control: no-store` |
| Conditional requests | `ETag: "abc123"` |
| CORS | `Access-Control-Allow-Origin: *` |
| Request tracing | `X-Request-ID: uuid` |

---

## REST Response Format (Recommended)

```json
// Success (200)
{
  "data": { "id": 1, "name": "Alice" }
}

// Collection (200)
{
  "data": [...],
  "pagination": { "page": 1, "perPage": 20, "total": 150 }
}

// Created (201)
{
  "data": { "id": 123, "name": "New Resource" }
}
// + Location: /resources/123

// Error (4xx/5xx)
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is already in use",
    "details": [
      { "field": "email", "message": "Must be unique" }
    ],
    "requestId": "req_abc123"
  }
}
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
