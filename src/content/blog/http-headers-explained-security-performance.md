---
title: "HTTP Headers Explained: Security & Performance (2025)"
description: "A developer's guide to HTTP headers. Covers security headers (HSTS, CSP, CORS), performance headers (Cache-Control, ETag), and how to inspect headers with free tools."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["http", "headers", "security", "performance", "cors", "caching", "web-development"]
readingTime: "12 min read"
faq:
  - question: "What HTTP headers should every website have for security?"
    answer: "At minimum: Strict-Transport-Security (HSTS), X-Content-Type-Options, X-Frame-Options, Content-Security-Policy, and Referrer-Policy. These prevent common attacks like clickjacking, MIME sniffing, and cross-site scripting."
  - question: "How do I check what HTTP headers a server sends?"
    answer: "Use curl -I https://example.com to see response headers, browser DevTools Network tab, or an online HTTP headers checker tool. These show exactly what headers your server (and CDN) are returning."
  - question: "What is Cache-Control and how does it work?"
    answer: "Cache-Control tells browsers and CDNs how long to cache a response. max-age=31536000 caches for one year. no-store prevents all caching. no-cache allows caching but requires revalidation before serving cached content."
---

HTTP headers are the invisible metadata that travel with every request and response. They control security, caching, content negotiation, authentication, and performance. Getting them right is the difference between a fast, secure website and one that's vulnerable to common attacks.

This guide explains the headers that matter most — organized by category, with practical examples you can deploy today.

---

## Inspecting Headers

Before optimizing, you need to see what's there. Use the [DevPlaybook HTTP Headers Inspector](/tools/http-headers-inspector) to check any URL instantly, or use the command line:

```bash
# View all response headers
curl -I https://example.com

# Include headers + body
curl -i https://example.com

# Specific header (case-insensitive)
curl -sI https://example.com | grep -i cache-control

# Full verbose output (request + response)
curl -v https://example.com 2>&1 | grep -E "^[<>]"
```

In the browser: DevTools → Network tab → click any request → Headers tab.

---

## Security Headers

Security headers protect your users from common web attacks. None of these require code changes — they're HTTP response headers your server or CDN sends.

### 1. Strict-Transport-Security (HSTS)

Forces browsers to use HTTPS, preventing protocol downgrade attacks and cookie hijacking over HTTP.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age=31536000`: Cache this directive for one year
- `includeSubDomains`: Apply to all subdomains (required for preload)
- `preload`: Submit to the HSTS preload list (browsers load this before the first request)

**Warning**: Only add `preload` if you're certain all subdomains serve HTTPS. It's very hard to reverse.

**Nginx:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. Content-Security-Policy (CSP)

The most powerful security header. Defines which sources can load scripts, styles, images, and other resources. Blocks XSS attacks at the browser level.

**Strict policy (SPAs):**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'
```

**With CDN and analytics:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net https://www.googletagmanager.com;
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-src 'none';
  object-src 'none'
```

**Start with report-only mode to avoid breaking things:**
```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

This logs violations without blocking them, so you can audit before enforcing.

### 3. X-Frame-Options

Prevents your site from being embedded in iframes — blocks clickjacking attacks.

```
X-Frame-Options: DENY           # No iframes at all
X-Frame-Options: SAMEORIGIN     # Only same-origin iframes
```

**Note**: CSP's `frame-ancestors` directive is more flexible and supersedes this header. Use both for maximum compatibility:
```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
```

### 4. X-Content-Type-Options

Prevents browsers from MIME-sniffing responses away from the declared Content-Type. This stops attacks that disguise malicious files as innocent ones.

```
X-Content-Type-Options: nosniff
```

Always set this. There's no reason not to.

### 5. Referrer-Policy

Controls how much referrer information is sent with requests. Protects user privacy and prevents leaking internal URLs.

```
Referrer-Policy: strict-origin-when-cross-origin
```

Options from most to least private:
- `no-referrer` — never send referrer
- `no-referrer-when-downgrade` — don't send on HTTPS→HTTP
- `strict-origin` — only send origin (no path/query)
- `strict-origin-when-cross-origin` — full URL on same-origin, origin only cross-origin (**recommended**)
- `unsafe-url` — always send full URL (never use this)

### 6. Permissions-Policy

Restricts browser features your site doesn't use. Prevents third-party scripts from accessing the camera, microphone, or geolocation.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

This says: no access to camera, microphone, geolocation, or payment APIs from any frame.

### 7. Cross-Origin Resource Sharing (CORS)

CORS headers allow (or deny) browsers from making cross-origin requests to your API.

```
# Allow specific origins
Access-Control-Allow-Origin: https://app.example.com

# Allow credentials (cookies, auth headers)
Access-Control-Allow-Credentials: true

# Allowed methods
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS

# Allowed headers
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID

# Cache preflight for 24 hours
Access-Control-Max-Age: 86400
```

**Never use `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`** — this is a security error and browsers will reject it.

---

## Performance Headers

These headers control caching behavior, content encoding, and how efficiently browsers load your resources.

### Cache-Control

The most important performance header. Controls how long responses are cached by browsers and CDNs.

**Common patterns:**

```
# Cache forever (for versioned assets like main.abc123.js)
Cache-Control: public, max-age=31536000, immutable

# Revalidate every hour
Cache-Control: public, max-age=3600

# Always revalidate (but allow 304 Not Modified)
Cache-Control: no-cache

# Never cache (sensitive data, dynamic content)
Cache-Control: no-store, no-cache, must-revalidate

# Cache privately (browser only, not CDN)
Cache-Control: private, max-age=3600
```

**Immutable** tells the browser never to revalidate a cached resource — use only with content-hashed filenames where the URL changes when content changes.

### ETag and Last-Modified

Enable conditional requests so clients only download content that has changed.

```
# Server sends:
ETag: "abc123def456"
Last-Modified: Wed, 20 Mar 2026 10:00:00 GMT

# Client revalidates with:
If-None-Match: "abc123def456"
If-Modified-Since: Wed, 20 Mar 2026 10:00:00 GMT

# Server responds with 304 Not Modified if unchanged (no body)
```

This is critical for large files where bandwidth matters.

### Content-Encoding

Enables compression of response bodies. Modern servers and CDNs handle this automatically, but verify it's working:

```bash
curl -H "Accept-Encoding: br,gzip" -sI https://example.com | grep content-encoding
# content-encoding: br   (Brotli — best compression)
# or:
# content-encoding: gzip (Gzip — universal support)
```

If your server isn't sending `Content-Encoding: br` or `Content-Encoding: gzip`, you're sending uncompressed responses — typically 70-80% larger than they need to be.

### Vary

Tells CDNs that the response varies based on request headers, so they cache separate versions.

```
# Cache different versions for different Accept-Encoding values
Vary: Accept-Encoding

# Cache different versions for different origins
Vary: Origin

# Multiple variance dimensions
Vary: Accept-Encoding, Accept-Language
```

### Content-Type

Always set explicit Content-Type headers. Omitting it forces browsers to guess:

```
Content-Type: application/json; charset=utf-8
Content-Type: text/html; charset=utf-8
Content-Type: image/svg+xml
Content-Type: application/javascript; charset=utf-8
```

---

## Request Headers Worth Knowing

These headers are sent by clients (browsers, API consumers, mobile apps):

| Header | Purpose |
|---|---|
| `Authorization` | Bearer tokens, Basic auth, API keys |
| `Content-Type` | Format of the request body |
| `Accept` | Expected response format (`application/json`) |
| `Accept-Encoding` | Compression support (`br, gzip, deflate`) |
| `Accept-Language` | Preferred response language |
| `User-Agent` | Client identification |
| `If-None-Match` | Conditional request using ETag |
| `If-Modified-Since` | Conditional request using date |
| `X-Request-ID` | Correlation ID for distributed tracing |
| `X-Forwarded-For` | Original client IP (set by proxies/load balancers) |

---

## Recommended Security Headers Checklist

Use [Mozilla Observatory](https://observatory.mozilla.org/) or the [DevPlaybook HTTP Headers Inspector](/tools/http-headers-inspector) to score your site:

| Header | Priority |
|---|---|
| `Strict-Transport-Security` | Critical |
| `Content-Security-Policy` | Critical |
| `X-Content-Type-Options: nosniff` | High |
| `X-Frame-Options` | High |
| `Referrer-Policy` | High |
| `Permissions-Policy` | Medium |
| `Cross-Origin-Opener-Policy` | Medium |
| `Cross-Origin-Resource-Policy` | Medium |

---

## Setting Headers in Common Frameworks

### Express.js (Node.js)

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.example.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Nginx

```nginx
server {
  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  # Performance
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
  gzip_comp_level 6;

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    expires 1y;
  }

  location /api/ {
    add_header Cache-Control "no-store";
  }
}
```

### Next.js (next.config.js)

```javascript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Testing Your Headers

**Free tools:**
- [DevPlaybook HTTP Headers Inspector](/tools/http-headers-inspector) — Analyze headers for any URL
- [Mozilla Observatory](https://observatory.mozilla.org/) — Security scoring with recommendations
- [SecurityHeaders.com](https://securityheaders.com/) — Detailed analysis of security headers
- [Google PageSpeed Insights](https://pagespeed.web.dev/) — Performance + caching analysis

**Quick command-line check:**
```bash
# Security headers present?
curl -sI https://your-site.com | grep -iE "(strict-transport|content-security|x-frame|x-content-type|referrer)"

# Compression enabled?
curl -H "Accept-Encoding: gzip,br" -sI https://your-site.com | grep -i "content-encoding"

# CORS configured?
curl -H "Origin: https://other.com" -sI https://api.your-site.com | grep -i "access-control"
```

---

## Further Reading

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

**Related DevPlaybook tools:**
- [HTTP Headers Inspector](/tools/http-headers-inspector) — Analyze any URL's headers
- [CORS Tester](/tools/cors-tester) — Debug CORS issues
- [API Tester](/tools/api-tester) — Send custom headers in API requests

---

## Automate Your Security Checks

Want to run HTTP header security audits as part of your CI/CD pipeline? The **[Developer Productivity Bundle](https://vicnail.gumroad.com/l/dev-productivity-bundle?utm_source=devplaybook&utm_medium=blog&utm_campaign=http-headers-article)** includes automated security header check scripts and GitHub Actions workflows to catch missing headers before they reach production.
