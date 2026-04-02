---
title: "CDN and Edge Caching 2026: Complete Guide to Content Delivery Networks and Edge Computing"
description: "Comprehensive guide to CDN and edge caching strategies for 2026. Covers Cloudflare, Fastly, Akamai, AWS CloudFront, edge functions, cache invalidation, real-time synchronization, and multi-CDN strategies with code examples."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["cdn", "edge-computing", "cloudflare", "caching", "performance", "cloudfront", "fastly", "edge-functions", "wasm"]
readingTime: "22 min read"
---

CDNs have evolved far beyond simple static asset caching. In 2026, modern CDNs offer edge computing capabilities that let you run JavaScript, WebAssembly, and even full API logic at locations geographically close to your users. This shifts the performance paradigm from "cache everything and hope for the best" to "compute at the edge, cache intelligently."

This guide covers the complete CDN and edge computing landscape: from traditional CDN configuration to serverless edge functions, from cache invalidation strategies to multi-CDN architectures, with practical examples for Cloudflare Workers, Fastly Compute, and AWS CloudFront Functions.

---

## How CDNs Work: The Fundamentals

A Content Delivery Network distributes your content across a globally distributed network of servers called Points of Presence (PoPs). When a user requests your content, the CDN serves it from the nearest PoP rather than your origin server.

### Key CDN Terminology

| Term | Definition |
|------|-----------|
| PoP (Point of Presence) | Physical data center location |
| Edge Node | Server within a PoP that serves content |
| Origin Server | Your primary server where content is sourced |
| Cache Hit | Content served from CDN edge (fast) |
| Cache Miss | Content fetched from origin (slow) |
| TTL (Time To Live) | How long content stays cached |
| Cache Invalidation | Removing content from cache before TTL expires |
| Edge Function | Serverless code running at CDN edge |
| Anycast | Routing users to the nearest PoP automatically |

### The CDN Request Flow

```
User Request
     │
     ▼
┌─────────┐  DNS: nearest PoP
│   CDN   │──────────────────► Closest Edge Node
└─────────┘                        │
                                    │ Cache Hit?
                              ┌─────┴─────┐
                              │  YES      │  NO
                              ▼           ▼
                        Serve       Fetch from
                        from cache   Origin Server
                                     │
                                     ▼
                              Cache at edge
                              Return to user
```

---

## Major CDN Providers in 2026

### Cloudflare

Cloudflare operates one of the largest networks with 300+ PoPs globally. Its edge computing platform, Cloudflare Workers, lets you run JavaScript, Rust (via WASM), and Python at the edge.

**Cloudflare Workers: Edge JavaScript**

```javascript
// workers/speed-test.js - runs at edge, <1ms cold start
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Rewrite requests to use cached API responses
    if (url.pathname.startsWith('/api/users')) {
      const cacheKey = `https://api.example.com${url.pathname}`;
      const cache = caches.default;

      let response = await cache.match(cacheKey);
      if (!response) {
        // Fetch from origin, cache for 60 seconds
        response = await fetch(`https://api.example.com${url.pathname}`);
        response = new Response(response.body, response);
        response.headers.set('Cache-Control', 'public, max-age=60');
        await cache.put(cacheKey, response.clone());
      }
      return response;
    }

    // A/B testing at the edge
    if (url.pathname === '/') {
      const variant = Math.random() < 0.5 ? 'A' : 'B';
      const response = await fetch(request);
      const clone = response.clone();
      response.headers.set('X-AB-Variant', variant);
      return response;
    }

    return fetch(request);
  },
};

// wrangler.toml configuration
// name = "speed-test-worker"
// main = "workers/speed-test.js"
// compatibility_date = "2026-01-01"
```

**Cloudflare Pages: Static Site with Edge Functions**

```bash
# wrangler.toml for Cloudflare Pages
name = "my-site"
compatibility_date = "2026-01-01"
pages_build_output_dir = "./dist"

[[functions]]
route = "/api/*"
script = "api-worker"

[[env.production]]
name = "my-site"
routes = [{ pattern = "www.example.com", zone_name = "example.com" }]
```

### AWS CloudFront

CloudFront integrates deeply with AWS services, making it ideal for applications already running on AWS.

**CloudFront Functions for Edge Logic**

```javascript
// cloudfront-function.js - runs at CloudFront edge
function handler(event) {
    var request = event.request;
    var response = event.response;

    // Add security headers to all responses
    response.headers['strict-transport-security'] = {
        value: 'max-age=31536000; includeSubDomains'
    };
    response.headers['x-content-type-options'] = { value: 'nosniff' };
    response.headers['x-frame-options'] = { value: 'DENY' };

    // Rewrite URLs for internationalization
    var uri = request.uri;
    if (uri === '/') {
        var acceptLang = request.headers['accept-language'].value;
        if (acceptLang && acceptLang.startsWith('de')) {
            request.uri = '/de/index.html';
        } else if (acceptLang && acceptLang.startsWith('fr')) {
            request.uri '/fr/index.html';
        } else {
            request.uri = '/en/index.html';
        }
    }

    return request;
}
```

**CloudFront Lambda@Edge for Complex Logic**

```javascript
// lambda-edge-origin-request.js
exports.handler = async (event, context) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    // Extract JWT from cookie for authentication
    const cookieHeader = headers['cookie'] || [];
    const cookies = {};
    (cookieHeader[0]?.value || '').split(';').forEach(c => {
        const [k, v] = c.trim().split('=');
        if (k) cookies[k] = v;
    });

    // Add user context to headers for origin
    if (cookies['auth_token']) {
        request.headers['x-user-id'] = [{ key: 'X-User-ID', value: decodeJWT(cookies['auth_token']).sub }];
    }

    // Request a specific edge-optimized API backend
    if (request.uri.startsWith('/api/')) {
        request.origin = {
            custom: {
                domainName: 'api.cloudfront.net',
                port: 443,
                protocol: 'https',
                sslProtocols: ['TLSv1.2', 'TLSv1.3'],
                path: '/v1',
                keepaliveTimeout: 5,
            }
        };
        request.headers['host'] = [{ key: 'Host', value: 'api.example.com' }];
    }

    return request;
};

function decodeJWT(token) {
    const parts = token.split('.');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}
```

### Fastly Compute

Fastly's Compute platform runs WebAssembly at the edge, offering near-zero cold starts and support for Rust, C++, and other compiled languages.

**Fastly Compute@Edge with Rust**

```rust
// src/main.rs - Fastly Compute with Rust
use fastly::{Request, Response, CacheOverride, FutureStore};

#[fastly::main]
fn main(mut req: Request) -> Result<Response, fastly::Error> {
    let path = req.get_path();

    match path {
        "/" => Ok(Response::from_body("Hello from the edge!")
            .with_status(200)
            .with_content_type(fastly::mime::TEXT_PLAIN)),

        "/api/users" => {
            // Fetch and cache at edge
            let mut beresp = req.send托收("origin.example.com")?;

            // Override cache TTL
            beresp.set_ttl(300);

            Ok(beresp)
        },

        "/api/*" => {
            // Rewrite to backend
            let path_parts: Vec<&str> = path.split('/').collect();
            let backend_path = format!("/v1/{}", path_parts[2..].join("/"));
            req.set_path(&backend_path);

            let mut beresp = req.send托收("api-backend.example.com")?;
            beresp.set_ttl(60);
            Ok(beresp)
        },

        _ => Ok(Response::from_body("Not Found")
            .with_status(404)
            .with_content_type(fastly::mime::TEXT_PLAIN)),
    }
}
```

---

## Caching Strategies

### Cache Hierarchy

Modern caching uses a multi-tier approach:

```
Browser Cache (local)
     │
     ▼
CDN Edge Cache (global PoPs)
     │
     ▼
CDN Regional Cache (larger PoPs)
     │
     ▼
Origin Server / Database
```

### HTTP Caching Headers

```javascript
// Express - Comprehensive cache headers
const express = require('express');
const app = express();

// Immutable static assets (hash in filename)
app.use('/static', express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Assets with content hashes are immutable
    if (path.match(/\.(js|css|woff2?|png|jpg|webp|avif)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// User-specific responses - never cache
app.use('/api/user', authenticate, (req, res) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json(req.user.profile);
});

// Shared but dynamic data - short cache with revalidation
app.get('/api/products', async (req, res) => {
  const products = await db.getProducts();

  // Cache for 5 minutes, allow stale for 1 minute while revalidating
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.setHeader('ETag', generateETag(products));
  res.json(products);
});

// Conditional requests - support If-None-Match
app.get('/api/products', async (req, res) => {
  const products = await db.getProducts();
  const etag = generateETag(products);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(products);
});
```

### Cache Invalidation Strategies

```bash
# Cloudflare - Purge cache via API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "files": ["https://example.com/css/main.css"],
    "prefixes": ["https://example.com/images/products/*"],
    "tags": ["homepage", "product-page"]
  }'

# Purge everything (use sparingly)
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": true}'
```

**Smart Cache Invalidation on Deployments:**

```yaml
# GitHub Actions - Invalidate CDN on deployment
name: Deploy and Invalidate Cache

on:
  push:
    branches: [main]
    paths: ['public/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to CDN
        run: |
          # Deploy files to CDN origin
          aws s3 sync public/ s3://my-bucket/ --delete

      - name: Invalidate CloudFront
        run: |
          # Get the distribution's config to find the ID
          DISTRIBUTION_ID=$(aws cloudfront list-distributions \
            --query "DistributionList.Items[?DomainName=='d123.cloudfront.net'].Id" \
            --output text)

          # Create invalidation for deployed paths
          aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/static/css/main.*.css" "/static/js/main.*.js" "/images/*"

# Cache-busting with content hashing in build
# vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});
```

---

## Edge Computing Patterns

### Edge-Side Rendering (ESR)

Render HTML at the edge for fast TTFB and good SEO.

**Cloudflare Workers SSR:**

```javascript
// workers/ssr.js
import { renderToReadableStream } from 'react-dom/server';
import App from './App.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // Proxy API requests to origin
      return fetch(request);
    }

    try {
      // Render React app at the edge
      const response = await renderToReadableStream(
        <App url={request.url} />,
        {
          bootstrapScriptContent: '<script src="/static/main.js"></script>',
          bootstrapModules: ['/static/main.js'],
        }
      );

      // Add cache headers
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return response;
    } catch (e) {
      return new Response('Edge Rendering Error', { status: 500 });
    }
  },
};
```

### Edge Authentication

```javascript
// Cloudflare Workers - JWT verification at edge
import { jwtVerify } from 'jose';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Protected routes require authentication
    if (url.pathname.startsWith('/api/user')) {
      const token = extractToken(request);

      if (!token) {
        return new Response('Unauthorized', { status: 401 });
      }

      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        // Add user ID to request headers for origin
        const modifiedRequest = new Request(request, {
          headers: {
            ...Object.fromEntries(request.headers),
            'x-user-id': payload.sub,
            'x-user-role': payload.role,
          },
        });

        return fetch(modifiedRequest);
      } catch {
        return new Response('Invalid Token', { status: 401 });
      }
    }

    return fetch(request);
  },
};

function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}
```

### A/B Testing at the Edge

```javascript
// Edge A/B testing with Cloudflare Workers
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cookieName = 'ab_variant';
    const variants = ['control', 'variant-a', 'variant-b'];

    // Check for existing variant cookie
    const cookies = request.headers.get('Cookie') || '';
    const existingVariant = variants.find(v => cookies.includes(`${cookieName}=${v}`));

    let variant = existingVariant;

    if (!variant) {
      // Assign new variant (weighted)
      const rand = Math.random();
      if (rand < 0.6) variant = 'control';
      else if (rand < 0.9) variant = 'variant-a';
      else variant = 'variant-b';
    }

    // Rewrite URL to variant path
    const variantPath = `/variants/${variant}${url.pathname}`;

    // Fetch variant content
    const response = await fetch(new Request(variantPath, request));

    // Add variant header and set cookie
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-AB-Variant', variant);
    newResponse.headers.set(
      'Set-Cookie',
      `${cookieName}=${variant}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
    );

    return newResponse;
  },
};
```

---

## Multi-CDN Strategies

### DNS-Based Load Balancing

```yaml
# DNS configuration for multi-CDN
# Using AWS Route 53 with latency-based routing
example.com. A 60
example.com. AAAA 60

# Latency alias records
api.example.com. A latency
  - cloudfront: d123.cloudfront.net (AWS regions)
  - fastly: global.entry.net (non-AWS regions)
  - cloudflare: .cloudflare.cdn.cloudflare.net
```

**Health Check and Failover:**

```yaml
# cloudflare-workers/multi-cdn-failover.js
const CDNS = [
  { name: 'cloudflare', url: 'https://cf.example.com' },
  { name: 'fastly', url: 'https://fastly.example.com' },
  { name: 'akamai', url: 'https://ak.example.com' },
];

let healthyCDNs = [...CDNS];
let currentIndex = 0;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return fetch(request);
    }

    // Try each CDN in order until one succeeds
    for (let i = 0; i < healthyCDNs.length; i++) {
      const cdnIndex = (currentIndex + i) % healthyCDNs.length;
      const cdn = healthyCDNs[cdnIndex];

      try {
        const response = await fetch(cdn.url + url.pathname, {
          cf: { cacheKeySuffix: cdn.name },
        });

        if (response.ok) {
          currentIndex = cdnIndex;
          return response;
        }
      } catch (e) {
        // Mark CDN as unhealthy
        healthyCDNs = healthyCDNs.filter(c => c.name !== cdn.name);
        if (healthyCDNs.length === 0) {
          return new Response('All CDNs unavailable', { status: 503 });
        }
      }
    }

    return new Response('CDN Error', { status: 500 });
  },
};
```

---

## Image and Media Optimization at the Edge

```javascript
// Cloudflare Workers - On-the-fly image optimization
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Image optimization for /images/* paths
    if (url.pathname.startsWith('/images/')) {
      const imagePath = url.pathname.slice(8); // Remove '/images/'

      // Parse query parameters for transformations
      const width = parseInt(url.searchParams.get('w') || '800');
      const format = url.searchParams.get('f') || 'webp';
      const quality = parseInt(url.searchParams.get('q') || '80');

      // Construct Cloudflare image resizing URL
      const imageUrl = `https://你的账号.images.cloudflare.com/${imagePath}`;
      const params = new URLSearchParams({
        width: width.toString(),
        format,
        quality,
        fit: 'cover',
      });

      const imageResponse = await fetch(`${imageUrl}?${params}`);

      return new Response(imageResponse.body, {
        headers: {
          'Content-Type': `image/${format}`,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'CF-Cache-Status': 'HIT',
        },
      });
    }

    return fetch(request);
  },
};
```

---

## Real-World CDN Configuration Examples

### Static Site with Cloudflare

```yaml
# _redirects for Cloudflare Pages (Netlify-style routing)
/blog/*  /blog/:slug  200
/api/*   https://api.example.com/api/:splat  200
/*       /index.html  200

# Cloudflare page rules (in dashboard)
# Rule 1: Cache static assets aggressively
# URL pattern: *example.com/static/*
# TTL: 1 month
# Edge cache TTL: 1 month

# Rule 2: HTML pages - short cache
# URL pattern: *example.com/*.html
# Edge cache TTL: 10 minutes

# Rule 3: API proxy - no caching
# URL pattern: *example.com/api/*
# Cache: bypass
```

### WordPress/WooCommerce CDN Configuration

```nginx
# nginx - origin server configuration for CDN
server {
    listen 80;
    server_name origin.example.com;

    # Real visitor IP from CDN
    set_real_ip_from 103.21.244.0/22;  # Cloudflare
    set_real_ip_from 103.22.200.0/22;
    real_ip_header CF-Connecting-IP;

    # CORS headers for CDN
    location /wp-content/uploads/ {
        add_header Access-Control-Allow-Origin "https://example.com";
        add_header Cache-Control "public, max-age=2592000";
        add_header CF-Cache-Status "HIT";
    }

    # WooCommerce AJAX endpoints - no cache
    location /wc-api/ {
        add_header Cache-Control "no-store, no-cache";
        proxy_pass http://127.0.0.1:8080;
    }
}
```

---

## CDN Performance Monitoring

```javascript
// Monitor CDN cache hit ratio
async function getCacheAnalytics(cdn, zoneId, apiToken) {
  const response = await fetch(
    `https://api.${cdn}.com/client/v4/zones/${zoneId}/analytics/dashboard?since=-1440&until=0`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  const data = await response.json();

  const requests = data.result.totals.requests || 0;
  const cached = data.result.totals.cached || 0;
  const hitRatio = requests > 0 ? (cached / requests * 100).toFixed(2) : 0;

  console.log(`Cache hit ratio: ${hitRatio}%`);
  console.log(`Total requests: ${requests}`);
  console.log(`Cached requests: ${cached}`);

  return { hitRatio, requests, cached };
}

// Set up alerts for cache hit ratio drops
const CACHE_HIT_THRESHOLD = 80; // percent

async function checkCacheHealth() {
  const { hitRatio } = await getCacheAnalytics('cloudflare', process.env.ZONE_ID, process.env.API_TOKEN);

  if (hitRatio < CACHE_HIT_THRESHOLD) {
    // Send alert (Slack, PagerDuty, etc.)
    await fetch(process.env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `CDN cache hit ratio dropped to ${hitRatio}% - below ${CACHE_HIT_THRESHOLD}% threshold`,
      }),
    });
  }
}
```

---

## CDN and Edge Caching Checklist

- [ ] Choose CDN provider based on PoP coverage for your target regions
- [ ] Set appropriate cache TTLs for each content type (immutable vs dynamic)
- [ ] Implement cache-busting with content-hashed filenames
- [ ] Configure proper security headers at the CDN layer
- [ ] Set up cache invalidation on deployments
- [ ] Monitor cache hit ratio and set up alerts for drops
- [ ] Use edge functions for authentication, A/B testing, and personalization
- [ ] Implement origin shield for better cache efficiency
- [ ] Configure health checks and CDN failover
- [ ] Enable compression (Brotli preferred over Gzip)
- [ ] Set up real user monitoring (RUM) for CDN performance
- [ ] Use HTTP/2 or HTTP/3 (QUIC) for multiplexing
- [ ] Implement image optimization at the edge
- [ ] Consider multi-CDN for critical production applications

---

## Conclusion

CDNs and edge computing in 2026 have evolved into programmable platforms that can handle authentication, rendering, API routing, and personalization — not just static asset caching. The shift from centralized origin servers to distributed edge computing fundamentally changes how we architect web applications.

The most effective approach is to understand your specific traffic patterns and user geography, then configure your CDN accordingly. Start with aggressive caching for static assets, implement edge functions for personalization and auth, and monitor your cache hit ratio to continuously optimize.
