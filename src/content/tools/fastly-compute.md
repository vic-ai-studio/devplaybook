---
title: "Fastly Compute — High-Performance Edge Computing Platform"
description: "WebAssembly-powered edge compute — run Rust, JavaScript, Go, or any WASM language at Fastly's global CDN with near-zero cold starts and streaming."
category: "WebAssembly & Edge Computing"
pricing: "Paid"
pricingDetail: "Pay-per-use: $0.05 per million requests + $0.30/GB for bandwidth; Free trial available"
website: "https://www.fastly.com/products/edge-compute"
github: "https://github.com/fastly/compute-starter-kit-javascript-default"
tags: [edge-computing, serverless, wasm, fastly, cdn, performance, rust]
pros:
  - "WebAssembly-native — runs Rust, Go, JavaScript as WASM"
  - "Fastly's CDN is purpose-built for performance (used by GitHub, Stripe, Spotify)"
  - "Streaming responses and request/response manipulation"
  - "VCL (Varnish) + Compute hybrid — use both for different routes"
  - "Fiddle (online playground) for quick testing"
cons:
  - "More expensive than Cloudflare Workers at scale"
  - "Smaller developer community than Cloudflare"
  - "JavaScript support less mature than Workers"
  - "WASM-first means some JS Node.js APIs unavailable"
date: "2026-04-02"
---

## Overview

Fastly Compute runs code as WebAssembly modules at the edge — making it fundamentally different from V8-isolate-based platforms like Cloudflare Workers. By using WASM, it supports multiple languages (Rust, Go, JavaScript) with the same runtime, and achieves microsecond cold starts.

## JavaScript Quick Start

```bash
# Install Fastly CLI
npm install -g @fastly/cli

# Create project
fastly compute init --language=javascript

# Local development
fastly compute serve

# Deploy
fastly compute deploy
```

```javascript
// src/index.js
import { Router } from '@fastly/js-compute';

const router = new Router();

router.get('/api/geo', async (req) => {
  const geo = req.headers.get('Fastly-Client-Geo-Country-Code');
  const ip = req.headers.get('Fastly-Client-IP');

  return new Response(JSON.stringify({ country: geo, ip }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.post('/api/transform', async (req) => {
  const body = await req.json();
  // Transform request at the edge before forwarding to origin
  const transformed = transformData(body);

  const origin = await fetch('https://api.origin.com/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transformed)
  });

  return origin;
});

addEventListener('fetch', (event) => event.respondWith(router.route(event.request)));
```

## Rust at the Edge

```rust
// src/main.rs
use fastly::http::StatusCode;
use fastly::{Error, Request, Response};

#[fastly::main]
fn main(req: Request) -> Result<Response, Error> {
    match (req.get_method_str(), req.get_path()) {
        ("GET", "/api/status") => {
            let data = serde_json::json!({
                "status": "ok",
                "datacenter": std::env::var("FASTLY_POP").unwrap_or_default(),
            });
            Ok(Response::from_status(StatusCode::OK)
                .with_content_type(fastly::mime::APPLICATION_JSON)
                .with_body(data.to_string()))
        },

        // Forward to origin for other paths
        _ => {
            let bereq = req.clone_without_body();
            Ok(bereq.send("origin_backend")?)
        }
    }
}
```

## Edge Caching and Purging

```javascript
// Cache objects at the edge with custom keys
const cacheKey = `product:${productId}:${currency}`;

// Check cache
const cached = await env.cache.get(cacheKey);
if (cached) return new Response(cached, { headers: { 'X-Cache': 'HIT' } });

// Fetch from origin and cache
const fresh = await fetch(`https://api.origin.com/products/${productId}`);
const body = await fresh.text();
await env.cache.put(cacheKey, body, { ttl: 300 });
return new Response(body, { headers: { 'X-Cache': 'MISS' } });
```

## When to Use Fastly Compute

Fastly Compute is ideal when: you're already using Fastly CDN and want to add edge logic, you need Rust at the edge for maximum performance, or you want multi-language WASM support. Cloudflare Workers is more mature for pure JavaScript/TypeScript edge functions with built-in databases.

## Concrete Use Case: Content Personalization at the CDN Edge

A media company serves 50 million page views per day across 40 countries. They run A/B tests on headlines, hero images, and call-to-action placements, with 12 active experiments at any given time. Each visitor should see a personalized HTML page based on three signals: geographic location (derived from IP), their assigned A/B test segments (stored in a cookie), and whether they are a logged-in subscriber (determined by a JWT in the request headers). Previously, this personalization happened at the origin server — a Node.js application that assembled the correct page variant for each request. This meant every page view hit the origin, defeating CDN caching entirely and requiring 80+ origin servers to handle peak traffic.

With Fastly Compute, the personalization logic moves to the edge. A Rust-based Compute service intercepts incoming requests at the nearest Fastly POP, reads the geo-location from Fastly's built-in `Fastly-Client-Geo-Country-Code` header, parses the A/B segment cookie, and validates the subscriber JWT. Based on these three signals, the service constructs a composite cache key (e.g., `page:/news:geo:DE:segments:exp3-variant-b,exp7-control:subscriber:true`) and checks Fastly's edge cache. On a cache hit, the fully personalized HTML is served in under 10ms from the edge — no origin contact at all. On a cache miss, the service fetches a base HTML template from the origin and performs string replacement of personalization tokens (`{{headline}}`, `{{hero_image}}`, `{{cta_text}}`) using a configuration dictionary stored in a Fastly Config Store, then caches the assembled result.

The result is a 94% cache hit rate on personalized pages — up from 0% when personalization was origin-only. Origin server count dropped from 80 to 12. Time-to-first-byte for personalized pages went from 320ms (origin round-trip) to 8ms (edge cache hit). The Rust WASM module cold-starts in under 50 microseconds, so even cache misses with edge assembly complete in under 40ms. A/B test managers update experiment configurations in the Fastly Config Store via API, and changes propagate globally within 5 seconds — no deployments required.

## When to Use Fastly Compute

**Use Fastly Compute when:**
- You need to run custom logic at the CDN edge with support for multiple languages (Rust, Go, JavaScript) compiled to WebAssembly
- Your application requires request/response transformation at the edge — modifying headers, rewriting HTML, routing based on geo-location or cookies — before reaching the origin
- You are already using Fastly's CDN and want to add programmable edge logic alongside existing VCL caching rules in a hybrid configuration
- Maximum edge performance is critical and you want to write Rust for microsecond-level cold starts and deterministic execution times
- You need streaming response support at the edge — assembling or transforming large responses without buffering the entire body in memory

**When NOT to use Fastly Compute:**
- You are building a JavaScript-first edge application and need a mature ecosystem with built-in KV storage, durable objects, and D1 database — Cloudflare Workers has a more complete platform for this
- Cost sensitivity is the primary concern — Fastly Compute is more expensive per request than Cloudflare Workers at high volume, and its free tier is more limited
- Your edge logic is simple (redirects, header manipulation, basic routing) and doesn't justify a full WASM deployment — Fastly's VCL or Cloudflare's Page Rules handle these cases with less complexity
- You need a large developer community for troubleshooting and examples — Cloudflare Workers has significantly more community content, tutorials, and third-party integrations
