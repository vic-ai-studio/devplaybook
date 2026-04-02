---
title: "Lagon"
description: "Open-source serverless edge runtime — self-host a Cloudflare Workers-like platform on your own infrastructure with V8 isolates, TypeScript support, and a deployment dashboard."
category: "WebAssembly & Edge Computing"
pricing: "Free"
pricingDetail: "Open source (AGPL-3.0); Lagon Cloud hosted service (pricing TBD)"
website: "https://lagon.app"
github: "https://github.com/lagonapp/lagon"
tags: [edge-computing, serverless, open-source, self-hosted, v8, javascript, typescript]
pros:
  - "Self-hostable alternative to Cloudflare Workers"
  - "V8 isolates for fast cold starts (similar to Workers)"
  - "Web standard APIs (Fetch, Request, Response, TextEncoder)"
  - "Built-in dashboard for deploying and monitoring functions"
  - "No vendor lock-in — run on your own Kubernetes or VMs"
cons:
  - "Smaller ecosystem than Cloudflare Workers or Vercel Edge"
  - "Less mature — fewer production deployments and battle-testing"
  - "Self-hosting requires infrastructure expertise"
  - "Limited storage integrations compared to managed platforms"
date: "2026-04-02"
---

## Overview

Lagon is the open-source, self-hosted answer to Cloudflare Workers. It provides a V8 isolate-based edge runtime that you can deploy on your own infrastructure — useful for organizations with data sovereignty requirements, custom networking needs, or those wanting to avoid vendor lock-in on edge compute.

## Function Format

Lagon functions use the same Web API format as Cloudflare Workers:

```typescript
// handler.ts
export function handler(request: Request): Response {
  const url = new URL(request.url);

  if (url.pathname === '/api/hello') {
    return new Response(
      JSON.stringify({ message: 'Hello from Lagon!', timestamp: Date.now() }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response('Not Found', { status: 404 });
}
```

## Async Handlers

```typescript
export async function handler(request: Request): Promise<Response> {
  if (request.method === 'POST') {
    const body = await request.json();
    const result = processData(body);
    return Response.json(result);
  }

  // Fetch from external API at the edge
  const upstream = await fetch('https://api.example.com/data');
  const data = await upstream.json();
  return Response.json(data);
}
```

## Self-Hosting with Docker

```yaml
# docker-compose.yml for self-hosted Lagon
services:
  lagon:
    image: lagon/lagon:latest
    ports:
      - "4000:4000"   # Dashboard
      - "4001:4001"   # Function runtime
    environment:
      DATABASE_URL: postgresql://lagon:password@postgres/lagon
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: lagon
      POSTGRES_USER: lagon
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
```

## CLI Usage

```bash
# Install Lagon CLI
npm install -g @lagon/cli

# Login to your self-hosted instance
lagon login --url http://your-lagon.example.com

# Deploy a function
lagon deploy handler.ts --name my-function

# List functions
lagon ls

# View logs
lagon logs my-function

# Delete function
lagon rm my-function
```

## Lagon vs Cloudflare Workers

| | Lagon | Cloudflare Workers |
|--|-------|-------------------|
| Hosting | Self-hosted | Cloudflare managed |
| Vendor lock-in | None | High |
| Edge locations | Your infrastructure | 300+ Cloudflare PoPs |
| Cold starts | ~1ms | ~1ms |
| Storage | External (Redis, PostgreSQL) | KV, D1, Durable Objects |
| Maturity | Early | Mature |
| Cost at scale | Infrastructure cost | $5/mo + usage |
| Best for | Data sovereignty, on-prem | Production global apps |

Lagon is the right choice when you need: data residency in specific regions, integration with your private network, or freedom from Cloudflare's pricing model. For global production applications without these constraints, Cloudflare Workers is more mature and better supported.
