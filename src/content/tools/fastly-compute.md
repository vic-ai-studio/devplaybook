---
title: "Fastly Compute — High-Performance Edge Computing Platform"
description: "WebAssembly-powered edge compute platform — run Rust, JavaScript, Go, or any WASM-compiled language at Fastly's global CDN with near-zero cold starts and streaming responses."
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
