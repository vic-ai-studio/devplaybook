---
title: "CORS Tester Online: Debug Cross-Origin Errors Without Guessing"
description: "Use a CORS tester to diagnose cross-origin resource sharing errors instantly. Understand preflight requests, CORS headers, and how to fix 'No Access-Control-Allow-Origin' errors."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["cors", "api", "debugging", "web-security", "developer-tools"]
readingTime: "9 min read"
---

# CORS Tester Online: Debug Cross-Origin Errors Without Guessing

CORS errors are some of the most frustrating issues in web development. The browser blocks your request, gives you a vague error message, and the fix isn't obvious. A CORS tester shows you exactly what headers are being sent and received so you can diagnose the problem without guessing.

## What Is CORS?

CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts web pages from making requests to a different origin (domain, protocol, or port) than the one that served the page.

When your frontend at `https://app.example.com` calls an API at `https://api.example.com`, the browser performs a CORS check. If the API doesn't return the right headers, the browser blocks the response.

**Important:** CORS is enforced by the browser, not the server. The server receives the request and sends a response — the browser decides whether to expose that response to JavaScript based on the CORS headers.

## How to Use the CORS Tester

The [DevPlaybook CORS Tester](/tools/cors-tester) sends requests to your API endpoint and shows:

- The full request headers sent
- The response headers received
- Whether the CORS check passes or fails
- Which specific header is missing or incorrect

Enter your API URL, optionally set the Origin header to your frontend domain, choose the HTTP method, and click Test.

## Understanding Preflight Requests

For non-simple requests (PUT, DELETE, custom headers), browsers send a preflight `OPTIONS` request before the actual request:

```
OPTIONS /api/data HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

The server must respond with:

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

If the preflight fails, the browser never sends the actual request. This is why you sometimes see OPTIONS requests in your network tab that return 404 or 500.

## Common CORS Errors and Fixes

### "No 'Access-Control-Allow-Origin' header is present"

**Symptom:** The most common CORS error. The API response doesn't include `Access-Control-Allow-Origin`.

**Fix:** Add the header to your API:

```javascript
// Express.js
res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');

// Or use the cors package
const cors = require('cors');
app.use(cors({ origin: 'https://app.example.com' }));
```

**Common mistake:** Using `*` as the origin when sending credentials:

```
# This FAILS when credentials are sent
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

When `credentials: true` (cookies, Authorization header), you must specify an explicit origin, not `*`.

### Preflight Returns 404

**Symptom:** OPTIONS request to your API returns 404.

**Fix:** Your server isn't handling OPTIONS requests. Add a catch-all OPTIONS handler:

```javascript
// Express.js
app.options('*', cors()); // Enable pre-flight for all routes

// Or manually
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        return res.status(204).end();
    }
    next();
});
```

### "Request header field X is not allowed"

**Symptom:** You're sending a custom header that the server doesn't allow.

**Fix:** Add the header to `Access-Control-Allow-Headers`:

```
Access-Control-Allow-Headers: Content-Type, Authorization, X-Custom-Header
```

### Credentials Not Sent

**Symptom:** Cookies aren't sent with cross-origin requests.

**Fix:** Both client and server need to opt in:

```javascript
// Client (fetch)
fetch('https://api.example.com/data', {
    credentials: 'include'
});

// Server
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://app.example.com  // Must be explicit, not *
```

## CORS Headers Reference

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Access-Control-Allow-Origin` | Response | Which origins can access the resource |
| `Access-Control-Allow-Methods` | Response | Which HTTP methods are allowed |
| `Access-Control-Allow-Headers` | Response | Which request headers are allowed |
| `Access-Control-Allow-Credentials` | Response | Whether credentials can be sent |
| `Access-Control-Max-Age` | Response | How long to cache preflight results (seconds) |
| `Access-Control-Expose-Headers` | Response | Which response headers JS can read |
| `Origin` | Request | The requesting origin |
| `Access-Control-Request-Method` | Preflight | The method the actual request will use |
| `Access-Control-Request-Headers` | Preflight | The headers the actual request will send |

## CORS in Different Backend Frameworks

### Express.js

```javascript
const cors = require('cors');

const corsOptions = {
    origin: ['https://app.example.com', 'https://staging.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
};

app.use(cors(corsOptions));
```

### FastAPI (Python)

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Nginx Reverse Proxy

```nginx
location /api/ {
    proxy_pass http://localhost:3000;

    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    if ($request_method = OPTIONS) {
        return 204;
    }
}
```

## Debugging CORS in the Browser

When a CORS error occurs, open DevTools and check:

**Network tab:** Look for the failed request. Check if there's a preflight OPTIONS request before it. Look at the response headers — is `Access-Control-Allow-Origin` present?

**Console:** The error message usually tells you which header is missing: `"Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource."`

**Headers to verify:**
1. `Origin` was sent in the request
2. `Access-Control-Allow-Origin` matches the request's `Origin`
3. If using credentials, `Access-Control-Allow-Credentials: true` is present
4. Preflight `OPTIONS` returns 2xx status

## When CORS Doesn't Apply

CORS doesn't apply to:
- Server-to-server requests (no browser involved)
- Same-origin requests
- Non-browser clients (curl, Postman)

This is why your API works in Postman but fails in the browser. Postman doesn't enforce CORS — it sends the request directly without the origin check.

Use the [API Tester](/tools/api-tester) for Postman-style testing without browser CORS restrictions.

## Wildcard Origin Pitfalls

`Access-Control-Allow-Origin: *` works for public APIs but breaks when you need credentials. It also prevents you from exposing response headers via `Access-Control-Expose-Headers`.

For production APIs that serve authenticated users, always use explicit origins. You can maintain a whitelist:

```javascript
const allowedOrigins = [
    'https://app.example.com',
    'https://staging.example.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
```

## Summary

CORS errors are predictable once you understand the headers involved. Use the CORS tester to see exactly what headers your API is returning, compare them against what's required, and fix the specific missing piece. Most CORS issues are either: missing `Access-Control-Allow-Origin`, a failed preflight due to missing OPTIONS handler, or credentials + wildcard origin conflict.
