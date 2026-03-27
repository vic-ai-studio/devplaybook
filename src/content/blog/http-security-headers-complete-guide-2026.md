---
title: "Complete Guide to HTTP Security Headers: CSP, HSTS, and Modern Browser Security 2026"
description: "Master HTTP security headers in 2026: Content-Security-Policy configuration, HSTS preloading, Permissions-Policy, COEP/COOP for cross-origin isolation, and real-world configs for nginx, Apache, and Next.js."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["security", "http-headers", "csp", "hsts", "web-security", "nginx", "nextjs", "devops"]
readingTime: "18 min read"
---

HTTP security headers are the fastest ROI in web security. A few config lines can eliminate entire vulnerability classes — XSS, clickjacking, MIME sniffing, cross-origin attacks — before your application code even runs.

This guide covers every header that matters in 2026, with real production configs for nginx, Apache, and Next.js, plus the browser devtools workflow for validating your implementation. Use our free [HTTP Security Scanner](/tools/http-security-scanner) to audit your headers without writing a line of code.

---

## Why Headers Matter More Than Ever

Modern browsers enforce security policies at the network layer, before JavaScript executes. A strong header set:

- Blocks inline script injection even if your app has an XSS bug
- Prevents clickjacking without JavaScript
- Stops protocol downgrade attacks at the browser level
- Enables cross-origin isolation required for `SharedArrayBuffer` and high-resolution timers

The cost is configuration time. The benefit is defense-in-depth you can't get from application code alone.

---

## Header 1: Content-Security-Policy (CSP)

CSP is the most powerful and most complex security header. It tells the browser exactly which resources are allowed to load — by origin, type, and source.

### Basic CSP Syntax

```
Content-Security-Policy: directive-name source-list; directive-name source-list
```

A minimal, restrictive policy:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.yourservice.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

### Key Directives Explained

| Directive | Controls | Recommended Value |
|-----------|----------|-------------------|
| `default-src` | Fallback for all resources | `'self'` |
| `script-src` | JavaScript sources | `'self'` + explicit CDNs, **never** `'unsafe-eval'` |
| `style-src` | CSS sources | `'self'`; add `'unsafe-inline'` only if needed |
| `img-src` | Image sources | `'self' data: https:` |
| `connect-src` | XHR/fetch/WebSocket | `'self'` + your API origins |
| `frame-ancestors` | Who can iframe you | `'none'` replaces X-Frame-Options |
| `base-uri` | `<base>` tag URLs | `'self'` |
| `form-action` | Where forms can POST | `'self'` |

### The Nonce Approach (Recommended over `unsafe-inline`)

Instead of `'unsafe-inline'` for scripts, use a nonce:

```html
<!-- Server generates a fresh nonce per request -->
<script nonce="abc123xyz">
  // Your inline script
</script>
```

```
Content-Security-Policy: script-src 'nonce-abc123xyz' 'strict-dynamic'
```

`'strict-dynamic'` propagates trust to scripts loaded by the nonced script, eliminating the need to allowlist every CDN URL.

### Next.js CSP with Nonces

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export function middleware(request: NextRequest) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: https:`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`
  ].join("; ");

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce); // pass to page component
  return response;
}
```

In your root layout:

```typescript
// app/layout.tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html>
      <head>
        <script nonce={nonce} src="/analytics.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### CSP Report-Only Mode

Never deploy a strict CSP without testing it first. Use `Content-Security-Policy-Report-Only` to collect violations without blocking anything:

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self';
  report-uri /csp-violations
```

Set up a simple violation endpoint:

```typescript
// app/api/csp-violations/route.ts
export async function POST(req: Request) {
  const report = await req.json();
  console.warn("CSP violation:", report["csp-report"]);
  // Ship to your logging service
  return new Response(null, { status: 204 });
}
```

Run in report-only mode for 2 weeks, fix violations, then enforce.

---

## Header 2: HTTP Strict Transport Security (HSTS)

HSTS tells browsers to never connect to your site over HTTP — even if the user types `http://`. This prevents SSL stripping attacks.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

| Parameter | What It Does |
|-----------|--------------|
| `max-age=31536000` | Cache the HSTS policy for 1 year |
| `includeSubDomains` | Apply to all subdomains |
| `preload` | Request inclusion in browser preload lists |

**Warning:** `includeSubDomains` breaks HTTP-only subdomains permanently until `max-age` expires. Audit all your subdomains first.

### HSTS Preloading

Preloading bakes your domain into Chrome, Firefox, and Safari's HSTS lists — so the browser never even attempts HTTP, eliminating the first-request vulnerability.

Submit at [hstspreload.org](https://hstspreload.org). Requirements:
1. Valid HTTPS certificate
2. HTTPS redirect for all HTTP traffic
3. `max-age` ≥ 31536000
4. `includeSubDomains` present
5. `preload` present

---

## Header 3: X-Frame-Options (Deprecated → Use CSP `frame-ancestors`)

```
X-Frame-Options: DENY
```

Still useful for older browsers, but `frame-ancestors` in CSP supersedes it:

```
Content-Security-Policy: frame-ancestors 'none'
```

`frame-ancestors 'none'` prevents all framing. `frame-ancestors 'self'` allows same-origin frames only. `frame-ancestors https://trusted.com` allows a specific origin.

---

## Header 4: X-Content-Type-Options

Prevents MIME-sniffing — browsers guessing content type from content instead of the `Content-Type` header. This can lead to script execution from files served as `text/plain`.

```
X-Content-Type-Options: nosniff
```

One value, always set it.

---

## Header 5: Permissions-Policy

Controls access to browser APIs: camera, microphone, geolocation, payment, etc. Replaces the deprecated Feature-Policy header.

```
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=(),
  payment=(self),
  usb=(),
  fullscreen=(self)
```

Empty `()` denies the feature entirely. `(self)` allows only same-origin access. `(self "https://trusted.com")` allows same-origin plus a specific third party.

This header is critical when embedding third-party iframes — it prevents them from accessing sensitive APIs even if they're compromised.

---

## Header 6: Cross-Origin Headers (COEP, COOP, CORP)

Cross-origin isolation is required to use `SharedArrayBuffer` and high-resolution timing — both needed for WebAssembly threading and performance profiling.

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

| Header | What It Does |
|--------|--------------|
| COEP `require-corp` | Blocks cross-origin resources that don't opt in |
| COOP `same-origin` | Isolates your browsing context from cross-origin windows |
| CORP `same-origin` | Restricts who can load this resource |

**Warning:** COEP breaks loading cross-origin images/scripts that don't set `Cross-Origin-Resource-Policy: cross-origin`. Audit all third-party dependencies before enabling.

For resources you control that need cross-origin loading (CDN assets):

```
Cross-Origin-Resource-Policy: cross-origin
```

---

## Header 7: Referrer-Policy

Controls how much URL information is sent in the `Referer` header when users navigate away.

```
Referrer-Policy: strict-origin-when-cross-origin
```

| Policy | Behavior |
|--------|----------|
| `no-referrer` | Never send Referer |
| `strict-origin` | Send only origin (no path/query), HTTPS → HTTP drops entirely |
| `strict-origin-when-cross-origin` | Full URL for same-origin, origin only for cross-origin (recommended) |
| `unsafe-url` | Always send full URL — never use this |

---

## Production Configurations

### nginx

```nginx
# /etc/nginx/conf.d/security-headers.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(self)" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'" always;

# Include in your server block:
# include /etc/nginx/conf.d/security-headers.conf;
```

Test your nginx config: `nginx -t`

### Apache

```apache
# .htaccess or VirtualHost
<IfModule mod_headers.c>
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none'"
</IfModule>
```

### Vercel (next.config.ts)

```typescript
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  }
  // Note: CSP with nonces is handled in middleware.ts
];

const config: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default config;
```

### Cloudflare Workers

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);

    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "DENY");
    newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    newResponse.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
    newResponse.headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );

    return newResponse;
  }
};
```

---

## Validation Workflow

### Browser DevTools

1. Open DevTools → Network tab
2. Click any request → Headers
3. Check Response Headers for each security header
4. Open Console → look for CSP violation warnings

### Command Line

```bash
# Quick header dump
curl -sI https://yoursite.com | grep -i "security\|csp\|hsts\|content-type\|permissions\|referrer\|frame"

# Verbose with redirect following
curl -sIL https://yoursite.com
```

### Automated Scanning

Run [securityheaders.com](https://securityheaders.com) or our [HTTP Security Scanner](/tools/http-security-scanner) to get an instant grade and remediation checklist. Aim for A+.

---

## Priority Rollout Order

If you're adding headers to an existing production site, this order minimizes risk:

1. **`X-Content-Type-Options: nosniff`** — no side effects, add immediately
2. **`Referrer-Policy`** — safe, may affect analytics (check your tracking)
3. **`X-Frame-Options: DENY`** — safe unless you embed yourself in iframes
4. **`HSTS`** — start with short `max-age` (300s), extend after confirming HTTPS works
5. **`Permissions-Policy`** — audit which APIs your app uses first
6. **`CSP`** — deploy in `Report-Only` mode first, enforce after 2 weeks of zero violations
7. **`COEP/COOP/CORP`** — last, only if you need cross-origin isolation

---

## Security Headers Score Card

| Header | Priority | Complexity | Impact |
|--------|----------|------------|--------|
| HSTS | Critical | Low | High |
| X-Content-Type-Options | High | None | Medium |
| X-Frame-Options / CSP frame-ancestors | High | Low | High |
| Referrer-Policy | Medium | Low | Medium |
| CSP | Critical | High | Very High |
| Permissions-Policy | Medium | Medium | Medium |
| COEP/COOP | Low (unless WASM) | High | Medium |

---

## Further Reading

- [Zero Trust Architecture for Web Developers](/blog/zero-trust-architecture-web-developers-2026) — defense-in-depth beyond headers
- [API Security Best Practices](/blog/api-security-best-practices-owasp-rate-limiting-jwt-2026) — secure your backend APIs
- [CSP Checker Tool](/tools/csp-checker) — validate your CSP policy syntax instantly
