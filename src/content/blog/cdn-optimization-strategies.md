---
title: "CDN Optimization Strategies: Cache Headers, Edge Computing, Cloudflare Workers"
description: "CDN optimization strategies: Cache-Control headers, CDN cache rules, Cloudflare Workers edge computing, asset optimization, cache invalidation, and multi-CDN failover."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["CDN", "Cloudflare", "cache headers", "edge computing", "performance", "Cache-Control"]
readingTime: "7 min read"
category: "performance"
---

A well-configured CDN can serve the majority of your traffic without a single request reaching your origin server. Poor cache configuration, on the other hand, turns your CDN into an expensive proxy that adds latency instead of removing it. This guide covers every CDN optimization lever: cache headers, edge logic with Cloudflare Workers, asset optimization, and invalidation strategies.

## Cache-Control Directives: The Complete Reference

The `Cache-Control` response header is the primary way you communicate caching intent to both browsers and CDNs.

### Key Directives

```
Cache-Control: public, max-age=31536000, immutable
```

| Directive | Meaning |
|-----------|---------|
| `public` | Can be cached by CDN (and browsers) |
| `private` | Only browser cache, not CDN |
| `no-cache` | Must revalidate with origin before serving (not "no caching") |
| `no-store` | Never cache — for sensitive data |
| `max-age=N` | Browser caches for N seconds |
| `s-maxage=N` | CDN caches for N seconds (overrides max-age for CDNs) |
| `stale-while-revalidate=N` | Serve stale while fetching fresh in background |
| `stale-if-error=N` | Serve stale if origin returns error |
| `immutable` | Resource will never change (skip revalidation) |

### Caching Strategy by Asset Type

```javascript
// Express middleware — set headers based on path
app.use((req, res, next) => {
  const path = req.path;

  if (path.match(/\.(js|css|woff2?|ttf|eot)$/) && path.includes('.[hash].')) {
    // Hashed static assets — cache forever
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (path.match(/\.(png|jpg|jpeg|webp|avif|svg|gif|ico)$/)) {
    // Images — long cache with stale-while-revalidate
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  } else if (path.startsWith('/api/')) {
    // API responses — short cache, revalidate in background
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  } else if (path === '/') {
    // HTML index — short CDN cache, always revalidate
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
  } else {
    // Default HTML pages
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  }

  next();
});
```

### Vary Header for Content Negotiation

Tell the CDN to maintain separate cache entries for different request variants:

```javascript
// Separate cache for different encodings
res.setHeader('Vary', 'Accept-Encoding');

// Separate cache for mobile vs desktop (use sparingly — multiplies cache size)
res.setHeader('Vary', 'Accept-Encoding, User-Agent');

// For internationalized sites
res.setHeader('Vary', 'Accept-Language, Accept-Encoding');
```

## Cloudflare Cache Rules

In the Cloudflare dashboard (or via API/Terraform), set Cache Rules to override origin headers or cache paths the origin marks as uncacheable:

```hcl
# Terraform — Cloudflare Cache Rule
resource "cloudflare_ruleset" "cache_rules" {
  zone_id = var.zone_id
  name    = "Cache optimization rules"
  kind    = "zone"
  phase   = "http_response_headers_transform"

  rules {
    action = "set_cache_settings"
    action_parameters {
      edge_ttl {
        mode    = "override_origin"
        default = 3600  # 1 hour default
      }
      browser_ttl {
        mode    = "override_origin"
        default = 3600
      }
    }
    expression  = "(http.request.uri.path matches \"^/static/\")"
    description = "Cache static assets for 1 hour"
    enabled     = true
  }
}
```

## Cloudflare Workers for Edge Logic

Cloudflare Workers run JavaScript at the edge — in 275+ data centers worldwide, milliseconds from your users. Use them to run logic without hitting your origin server.

### Edge A/B Testing

```javascript
// workers/ab-test.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only run A/B test on homepage
    if (url.pathname !== '/') {
      return fetch(request);
    }

    // Assign variant based on cookie or random
    const cookie = request.headers.get('Cookie') || '';
    const existingVariant = cookie.match(/ab_variant=([ab])/)?.[1];
    const variant = existingVariant || (Math.random() < 0.5 ? 'a' : 'b');

    // Fetch appropriate version
    const targetUrl = variant === 'b'
      ? new URL('/experiments/homepage-v2', url)
      : request.url;

    const response = await fetch(targetUrl, request);
    const newResponse = new Response(response.body, response);

    // Set variant cookie if not present
    if (!existingVariant) {
      newResponse.headers.append('Set-Cookie',
        `ab_variant=${variant}; Path=/; Max-Age=604800; SameSite=Lax`
      );
    }

    return newResponse;
  },
};
```

### Edge Authentication Check

Validate JWTs at the edge to reject unauthenticated requests before they reach your origin:

```javascript
// workers/auth-guard.js
import { jwtVerify, importSPKI } from 'jose';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only protect /api/ routes
    if (!url.pathname.startsWith('/api/')) {
      return fetch(request);
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const token = authHeader.slice(7);
      const publicKey = await importSPKI(env.JWT_PUBLIC_KEY, 'RS256');
      const { payload } = await jwtVerify(token, publicKey);

      // Forward user info to origin via header
      const modifiedRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers),
          'X-User-Id': payload.sub,
          'X-User-Role': payload.role,
        },
      });

      return fetch(modifiedRequest);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
```

### Image Optimization at Edge

```javascript
// workers/image-resize.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Cloudflare Image Resizing (requires Pro plan)
    if (url.pathname.startsWith('/images/')) {
      const accept = request.headers.get('Accept') || '';
      const format = accept.includes('avif') ? 'avif'
        : accept.includes('webp') ? 'webp' : 'jpeg';

      const width = parseInt(url.searchParams.get('w') || '800', 10);

      return fetch(request, {
        cf: {
          image: {
            width: Math.min(width, 2000), // cap at 2000px
            format,
            quality: 85,
          },
        },
      });
    }

    return fetch(request);
  },
};
```

## Cache Invalidation Strategies

Cache invalidation is famously hard. Here are the main strategies:

### 1. Hash-Based Cache Busting (Best)

Include a content hash in the filename — zero invalidation needed, content changes trigger a new URL automatically:

```
/static/app.a3f9c12.js    → app changes → /static/app.7d2a841.js
```

Configure your bundler (Vite, Webpack) to output hashed filenames:

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]',
      },
    },
  },
};
```

### 2. Cloudflare Cache Purge API

For content that changes without URL changes (HTML pages, API responses):

```javascript
async function purgeCloudflareCache(urls) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/purge_cache`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    }
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cache purge failed: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

// Purge on CMS publish
app.post('/webhooks/cms-publish', async (req, res) => {
  const { slug } = req.body;
  await purgeCloudflareCache([
    `https://yourdomain.com/blog/${slug}`,
    `https://yourdomain.com/blog`,  // also purge listing page
  ]);
  res.json({ purged: true });
});
```

### 3. Surrogate Keys (Cache Tags)

Tag cache entries and purge all entries with a given tag at once:

```javascript
// Set Surrogate-Key header on response
app.get('/blog/:slug', async (req, res) => {
  const post = await getPost(req.params.slug);

  // Tag the cached response with content identifiers
  res.setHeader('Surrogate-Key', `post-${post.id} author-${post.authorId} blog`);
  res.setHeader('Cache-Control', 'public, s-maxage=3600');
  res.json(post);
});

// Purge all posts by a specific author with one API call
async function purgeAuthorContent(authorId) {
  await purgeByTag(`author-${authorId}`);
}
```

## Multi-CDN Failover

For maximum availability, route traffic through multiple CDNs using DNS failover or a traffic manager:

```javascript
// Simple multi-CDN with fetch failover
const CDN_ENDPOINTS = [
  'https://cdn1.yourdomain.com',
  'https://cdn2.yourdomain.com',
];

async function fetchWithCDNFailover(path, options = {}) {
  for (const endpoint of CDN_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}${path}`, {
        ...options,
        signal: AbortSignal.timeout(3000), // 3s timeout per CDN
      });
      if (response.ok) return response;
    } catch (err) {
      console.warn(`CDN ${endpoint} failed:`, err.message);
    }
  }
  throw new Error('All CDN endpoints failed');
}
```

## CDN Optimization Checklist

- [ ] Hashed filenames for all JS/CSS/font assets (immutable caching)
- [ ] `Cache-Control: public, max-age=31536000, immutable` for hashed assets
- [ ] `stale-while-revalidate` on HTML pages for zero-latency updates
- [ ] `Vary: Accept-Encoding` set on all compressible responses
- [ ] Brotli compression enabled on CDN (better ratio than gzip)
- [ ] Cloudflare Cache Rules override uncacheable origin headers where appropriate
- [ ] Cache purge triggered on every deploy for HTML/API responses
- [ ] Cloudflare Workers handling auth/redirects/A-B tests at edge
- [ ] Image optimization (WebP/AVIF conversion, resizing) done at edge
- [ ] Cache hit ratio monitored in CDN analytics (target >95% for static assets)

A properly configured CDN should handle 90-95% of your traffic without hitting your origin. If your CDN analytics show a cache hit ratio below 80%, start by reviewing your Cache-Control headers — most configurations default to non-cacheable when in doubt.
