---
title: "Deno Deploy"
description: "Global edge runtime for Deno scripts — deploy TypeScript functions to 35+ regions with zero configuration, built-in npm compatibility, and instant deployments from GitHub."
category: "WebAssembly & Edge Computing"
pricing: "Freemium"
pricingDetail: "Free: 100K requests/day, 100GB transfer; Pro $20/month; Business $50/month"
website: "https://deno.com/deploy"
github: "https://github.com/denoland/deploy_feedback"
tags: ["edge-computing", "serverless", "deno", "typescript", "javascript", "runtime", "cloud", "web-api"]
pros:
  - "Built-in TypeScript support — no build step, deploy .ts files directly"
  - "npm compatibility — use npm packages with `npm:` prefix"
  - "GitHub integration — automatic deployments on every push"
  - "Built-in KV (key-value store) for simple data persistence"
  - "Web standard APIs — Fetch, Request, Response, WebSockets"
cons:
  - "Deno's npm compatibility still has gaps for some packages"
  - "Fewer storage options than Cloudflare Workers (no SQL at edge)"
  - "35 regions vs Cloudflare's 300+"
  - "Smaller ecosystem and community than Cloudflare Workers"
date: "2026-04-02"
---

## Overview

Deno Deploy is the hosting platform for Deno's JavaScript/TypeScript runtime. It deploys directly from TypeScript source files — no compilation, no bundling, no Docker. The Deno runtime's built-in TypeScript support and Web API compliance make it a clean, minimal platform for edge functions.

## Getting Started

```typescript
// main.ts — deploy this file directly
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === '/api/time') {
    return Response.json({
      timestamp: new Date().toISOString(),
      region: Deno.env.get('DENO_REGION') ?? 'unknown',
    });
  }

  if (url.pathname === '/api/echo' && req.method === 'POST') {
    const body = await req.json();
    return Response.json({ echo: body });
  }

  return new Response('Not Found', { status: 404 });
});
```

## Deploying

```bash
# Install deployctl
deno install -Arf https://deno.land/x/deploy/deployctl.ts

# Deploy
deployctl deploy --project=my-project main.ts

# Or link GitHub repo for auto-deployments
# (configure in the Deno Deploy dashboard)
```

## Using npm Packages

```typescript
// No install needed — npm packages via npm: prefix
import { Hono } from 'npm:hono@4';
import { z } from 'npm:zod@3';

const app = new Hono();

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post('/users', async (c) => {
  const body = await c.req.json();
  const result = userSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.flatten() }, 400);
  }

  return c.json({ id: crypto.randomUUID(), ...result.data }, 201);
});

Deno.serve(app.fetch);
```

## Deno KV (Edge Database)

```typescript
const kv = await Deno.openKv();

// Write
await kv.set(['users', userId], {
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date().toISOString(),
});

// Read
const entry = await kv.get<User>(['users', userId]);
const user = entry.value;  // User | null

// Atomic operations (transactions)
const result = await kv.atomic()
  .check({ key: ['counter'], versionstamp: previousVersionstamp })
  .set(['counter'], newValue)
  .commit();

// List with prefix
const iter = kv.list<User>({ prefix: ['users'] });
for await (const entry of iter) {
  console.log(entry.key, entry.value);
}
```

## Deno Deploy vs Cloudflare Workers

| | Deno Deploy | Cloudflare Workers |
|--|------------|-------------------|
| Edge locations | 35 | 300+ |
| Cold start | ~1ms | ~1ms |
| TypeScript | Native (no build) | Via esbuild |
| SQL at edge | No (KV only) | D1 (SQLite) |
| npm packages | npm: prefix | node_modules |
| Pricing | $20/mo paid | $5/mo paid |
| Best for | Deno-native projects, simple APIs | Production apps needing SQL/Durable Objects |
