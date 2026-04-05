---
title: "Vercel Edge Functions — Serverless Compute at the CDN Edge"
description: "Run JavaScript/TypeScript at Vercel's global edge network — sub-millisecond cold starts, Web standard APIs, middleware for authentication and A/B testing in Next.js applications."
category: "WebAssembly & Edge Computing"
pricing: "Freemium"
pricingDetail: "Free on all Vercel plans; Pro/Enterprise have higher limits on edge executions"
website: "https://vercel.com/docs/functions/edge-functions"
website2: "https://vercel.com/docs/functions/edge-middleware"
github: ""
tags: [edge-computing, serverless, vercel, nextjs, middleware, typescript, javascript]
pros:
  - "Zero-config with Next.js — just add `export const runtime = 'edge'`"
  - "Sub-1ms cold starts (V8 isolates)"
  - "Next.js Middleware built on Edge Runtime — intercept every request"
  - "Geo, IP, and request data available without additional services"
  - "Included in all Vercel plans"
cons:
  - "Limited to Web APIs — no Node.js builtins (fs, crypto, etc.)"
  - "4MB size limit for edge functions (vs 250MB for serverless)"
  - "No stateful storage — must call external services"
  - "Some npm packages incompatible with edge runtime"
date: "2026-04-02"
---

## Overview

Vercel Edge Functions run on Vercel's global network using the V8 edge runtime — the same environment as Cloudflare Workers but optimized for Next.js integration. They're most commonly used as **Next.js Middleware**, intercepting and transforming requests before they reach your pages.

## Next.js Middleware (Most Common Use)

```typescript
// middleware.ts (at the root of your Next.js project)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Auth: redirect unauthenticated users
  const token = request.cookies.get('session')?.value;
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Geo-based routing
  const country = request.geo?.country ?? 'US';
  if (pathname === '/' && country !== 'US') {
    return NextResponse.rewrite(new URL(`/${country.toLowerCase()}`, request.url));
  }

  // A/B testing
  const bucket = request.cookies.get('ab-bucket')?.value ?? (Math.random() < 0.5 ? 'a' : 'b');
  const response = NextResponse.next();
  response.cookies.set('ab-bucket', bucket, { maxAge: 86400 });
  response.headers.set('x-ab-bucket', bucket);

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and API routes
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
```

## Edge API Route

```typescript
// app/api/search/route.ts
export const runtime = 'edge';  // Use edge runtime instead of Node.js

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? '';

  // This runs at the edge — near the user
  const results = await fetch(`https://search-api.example.com/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${process.env.SEARCH_API_KEY}` },
    // Edge functions support streaming responses
  });

  return new Response(results.body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=60',
    },
  });
}
```

## Geolocation and Request Data

```typescript
// Available in edge functions (not regular API routes)
export function middleware(req: NextRequest) {
  const geo = req.geo;
  // {
  //   city: "San Francisco",
  //   country: "US",
  //   region: "CA",
  //   latitude: "37.7749",
  //   longitude: "-122.4194"
  // }

  const ip = req.ip;  // "203.0.113.42"

  // Add to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-user-country', geo?.country ?? 'unknown');
  return response;
}
```

## When to Use Edge vs Node.js Functions

| Scenario | Use Edge | Use Node.js |
|----------|----------|-------------|
| Auth/redirect logic | ✅ | ✅ |
| Database queries | ❌ (no pg/mysql) | ✅ |
| Heavy computation | ❌ (4MB limit) | ✅ |
| Streaming responses | ✅ | ✅ |
| File system access | ❌ | ✅ |
| Global low latency | ✅ | ❌ (single region) |
| npm package support | Limited | Full |

For Next.js, the primary use case for Edge Functions is middleware (auth, redirects, geo routing, A/B testing). API routes that query databases should stay on Node.js.
