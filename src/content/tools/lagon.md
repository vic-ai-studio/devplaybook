---
title: "Lagon — Open-Source Serverless Edge Runtime (Archived)"
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

## Concrete Use Case: Self-Hosting Edge Functions to Avoid Vendor Lock-In While Keeping Workers Compatibility

A European healthcare SaaS company needed to run serverless edge functions for API gateway logic — request validation, JWT verification, rate limiting, and response transformation — but faced two hard constraints. First, GDPR and local healthcare regulations required all compute to run on infrastructure within the EU, on servers the company controlled. Second, the engineering team had already built 40+ Cloudflare Workers-style functions for a previous project and did not want to rewrite them for a different runtime API. Lagon solved both problems: it runs on the company's own Kubernetes cluster in Frankfurt, and its V8 isolate runtime accepts the same `Request`/`Response` Web API signatures that Cloudflare Workers uses.

The team deployed Lagon via Docker Compose on a dedicated node pool in their existing EKS cluster. PostgreSQL (already running for the main application) stored function metadata, and Redis handled request routing and rate-limit counters. They migrated their existing Workers functions with minimal changes — the main adjustment was replacing Cloudflare-specific KV bindings with direct Redis calls via a thin adapter module. The Lagon dashboard gave the ops team a deployment UI for promoting functions from staging to production, and the CLI integrated into their GitHub Actions pipeline for automated deployments on merge to `main`. Cold starts measured under 2ms, comparable to Cloudflare Workers, because both use V8 isolates rather than container-based cold starts.

The key benefit was portability. The functions remained valid Web API code that could run on Cloudflare Workers, Deno Deploy, or any WinterCG-compatible runtime if the company ever wanted to move. When Lagon's hosted cloud service was discontinued, the self-hosted deployment was unaffected — the team simply pinned the Docker image version and continued operating. The total infrastructure cost for running Lagon on their existing cluster was effectively zero marginal cost, compared to the estimated $800/month they would have spent on Cloudflare Workers at their request volume, while maintaining full data sovereignty compliance.

## When to Use Lagon

**Use Lagon when:**
- You have data sovereignty or regulatory requirements that mandate compute runs on infrastructure you control, not on a third-party cloud
- You want Cloudflare Workers API compatibility (Web standard Request/Response) without depending on Cloudflare's platform
- You already operate Kubernetes or Docker infrastructure and want to add edge-function capabilities without a new vendor relationship
- You need to integrate edge functions with services on your private network (internal databases, legacy APIs) that cannot be exposed to external platforms
- You want to avoid vendor lock-in and keep your functions portable across WinterCG-compatible runtimes

**When NOT to use Lagon:**
- You need a globally distributed edge network with 300+ points of presence — Lagon runs on your infrastructure, so latency depends on your own deployment topology
- You want a fully managed serverless experience with zero infrastructure responsibility — use Cloudflare Workers, Vercel Edge Functions, or Deno Deploy instead
- You need mature storage primitives (KV, durable objects, D1 databases) built into the runtime — Lagon requires you to bring your own storage backends
- Your team lacks the infrastructure expertise to operate and maintain a self-hosted runtime in production (monitoring, upgrades, scaling)
