---
title: "HTTP Status Codes Explained: Complete Guide for Developers"
description: "Every HTTP status code group explained with real-world examples. Know exactly when to use 200, 201, 301, 401, 404, 429, 500, and more."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["http", "api", "web-development", "backend", "reference"]
readingTime: "8 min read"
---

HTTP status codes are the universal language between clients and servers. A three-digit number tells the client exactly what happened to its request — whether the operation succeeded, the resource moved, the client made a mistake, or the server had a problem. This guide covers every major status code group with the real-world context you need to use them correctly.

## How Status Codes Are Structured

Every HTTP status code is a three-digit integer. The first digit defines the class:

- **1xx** — Informational: the request was received, still processing
- **2xx** — Success: the request was received, understood, and accepted
- **3xx** — Redirection: further action is needed to complete the request
- **4xx** — Client Error: the request has bad syntax or cannot be fulfilled
- **5xx** — Server Error: the server failed to fulfill a valid request

## 1xx — Informational

### 100 Continue

The server has received the request headers and the client should proceed to send the request body.

**When you see it:** Uploading a large file. The client sends headers first (including `Content-Length`), receives `100 Continue`, then streams the body. This avoids uploading megabytes of data only to receive a `401 Unauthorized`.

### 101 Switching Protocols

The server is switching to the protocol specified in the `Upgrade` header.

**When you see it:** WebSocket handshake. The client sends `Upgrade: websocket`, the server responds with `101` to confirm the protocol switch from HTTP to WebSocket.

## 2xx — Success

### 200 OK

The request succeeded. The meaning of "success" depends on the HTTP method: GET returns the resource, POST returns the result of processing, PUT returns the updated resource.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "id": 42, "name": "Alice" }
```

**When to use it:** The default success response. If nothing else applies, use 200.

### 201 Created

The request succeeded and a new resource was created. The `Location` header should point to the new resource.

```http
HTTP/1.1 201 Created
Location: /api/users/42
Content-Type: application/json

{ "id": 42, "name": "Alice" }
```

**When to use it:** Always return `201` (not `200`) when a `POST` request creates a new record. It signals to clients — and API consumers — that something new exists.

### 204 No Content

The request succeeded but there is no content to return.

```http
HTTP/1.1 204 No Content
```

**When to use it:** `DELETE` requests that succeed. `PUT` or `PATCH` requests where you do not want to return the updated body. Keeps payloads lean.

## 3xx — Redirection

### 301 Moved Permanently

The resource has permanently moved to a new URL. Browsers and search engines update their cached URLs.

**When to use it:** Migrating from `http://` to `https://`, or permanently restructuring your URL scheme. Search engines pass link equity through a 301.

### 302 Found (Temporary Redirect)

The resource is temporarily at a different URL. Browsers follow the redirect but keep using the original URL for future requests.

**When to use it:** A/B testing, temporary maintenance pages, or redirect flows where the original URL will return eventually.

### 304 Not Modified

The client's cached version of the resource is still current — no body is returned.

**When to use it:** Browsers send `If-None-Match` or `If-Modified-Since` headers. If the resource has not changed, the server returns `304` and the browser uses its cache. This dramatically reduces bandwidth.

## 4xx — Client Errors

### 400 Bad Request

The server cannot process the request because of malformed syntax, invalid parameters, or a missing required field.

```json
{
  "error": "BAD_REQUEST",
  "message": "Field 'email' is required."
}
```

**When to use it:** Schema validation failure, unparseable JSON body, missing required query parameters.

### 401 Unauthorized

The client is not authenticated. Credentials are missing or invalid. The response should include a `WWW-Authenticate` header.

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api"
```

**When to use it:** Missing or expired JWT token, invalid API key. Note the misleading name — "unauthorized" actually means "unauthenticated".

### 403 Forbidden

The client is authenticated but does not have permission to access the resource.

**When to use it:** A logged-in user tries to access another user's private data, or a non-admin user tries to reach an admin endpoint. The server knows who you are — it just does not allow it.

**401 vs 403:** `401` = "who are you?", `403` = "I know who you are, but no."

### 404 Not Found

The server cannot find the requested resource.

**When to use it:** A resource with the requested ID does not exist. Also used intentionally to hide the existence of restricted resources (instead of `403`), to avoid leaking information.

### 409 Conflict

The request conflicts with the current state of the resource.

```json
{
  "error": "CONFLICT",
  "message": "A user with this email already exists."
}
```

**When to use it:** Attempting to create a resource that already exists (duplicate email, unique constraint violation), or an optimistic locking conflict where two clients updated the same record simultaneously.

### 422 Unprocessable Entity

The request was well-formed but contained semantic errors that prevented processing.

**When to use it:** The JSON is valid, but the data fails business-rule validation — for example, `start_date` is after `end_date`, or a numeric value is out of the acceptable range. Many REST API frameworks use `422` for validation errors.

### 429 Too Many Requests

The client has exceeded the rate limit.

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1711065600
```

**When to use it:** Always return this (not `503`) when throttling a specific client. Include `Retry-After` so clients know when to try again.

## 5xx — Server Errors

### 500 Internal Server Error

Something went wrong on the server — an unhandled exception, a bug in the application code.

**When to use it:** The catch-all for unexpected server failures. Log the full error internally; return only a generic message to the client (never expose stack traces in production).

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred. Please try again later."
}
```

### 502 Bad Gateway

The server, while acting as a gateway or proxy, received an invalid response from an upstream server.

**When you see it:** Your Nginx or load balancer forwards the request to your app server, and the app server crashes or returns garbage. The proxy returns `502` to the client.

### 503 Service Unavailable

The server is temporarily unable to handle the request — usually due to overload or scheduled maintenance.

```http
HTTP/1.1 503 Service Unavailable
Retry-After: 120
```

**When to use it:** Planned downtime, circuit breaker tripped, or the database connection pool is exhausted. Always include `Retry-After`.

### 504 Gateway Timeout

The server, while acting as a gateway, did not receive a timely response from an upstream server.

**When you see it:** Your API calls a third-party service that times out. Nginx waited longer than its configured timeout and gave up. Common during slow external API calls or database query timeouts.

## Quick Reference

| Code | Name | Typical trigger |
|---|---|---|
| 200 | OK | Successful GET, POST result |
| 201 | Created | POST created a resource |
| 204 | No Content | DELETE, or PUT with no body |
| 301 | Moved Permanently | Domain migration, HTTPS redirect |
| 302 | Found | Temporary redirect |
| 304 | Not Modified | Client cache is fresh |
| 400 | Bad Request | Validation failure, bad JSON |
| 401 | Unauthorized | Missing or invalid credentials |
| 403 | Forbidden | Authenticated but not permitted |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource, locking conflict |
| 422 | Unprocessable Entity | Business-rule validation failure |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled server exception |
| 502 | Bad Gateway | Upstream server returned invalid response |
| 503 | Service Unavailable | Server overloaded or in maintenance |
| 504 | Gateway Timeout | Upstream server timed out |

Using status codes correctly makes APIs self-documenting. Clients — and the developers who write them — can handle responses programmatically without parsing error message strings, which leads to more robust integrations and better user experiences.
