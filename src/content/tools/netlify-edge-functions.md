---
title: "Netlify Edge Functions"
description: "Deno-powered edge functions on Netlify's global CDN — intercept requests, transform responses, and run custom logic at the edge without leaving the Netlify workflow."
category: "WebAssembly & Edge Computing"
pricing: "Freemium"
pricingDetail: "Free: 3M edge function invocations/month; Pro/Team plans include higher limits"
website: "https://docs.netlify.com/edge-functions/overview"
github: "https://github.com/netlify/edge-bundler"
tags: [edge-computing, serverless, netlify, deno, javascript, typescript, cdn]
pros:
  - "Deno runtime — TypeScript natively, Web APIs, npm package support"
  - "Deep Netlify integration — same workflow as regular Netlify functions"
  - "Request context includes geolocation, device type, account info"
  - "Can run before or after Netlify's redirects and rewrites"
  - "Netlify Dev supports local edge function development"
cons:
  - "Deno runtime limits npm package compatibility vs Node.js"
  - "50ms execution limit (soft) — designed for fast request modification"
  - "Less control than Cloudflare Workers for complex applications"
  - "Fewer edge locations than Cloudflare"
date: "2026-04-02"
---

## Overview

Netlify Edge Functions are Deno-based functions that run at the CDN edge layer, before content is served to users. They integrate seamlessly with the Netlify build and deployment workflow, making them the natural choice for teams already using Netlify.

## Creating an Edge Function

```typescript
// netlify/edge-functions/greet.ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context): Promise<Response> => {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "World";

  // Geo data from Netlify context
  const country = context.geo?.country?.code ?? "US";
  const city = context.geo?.city ?? "Unknown";

  return Response.json({
    message: `Hello, ${name}!`,
    location: `${city}, ${country}`,
  });
};

export const config: Config = {
  path: "/api/greet",
};
```

## Netlify Configuration

```toml
# netlify.toml
[[edge_functions]]
path = "/api/greet"
function = "greet"

# Run on all routes
[[edge_functions]]
path = "/*"
function = "auth-check"

# Exclude static assets
[[edge_functions]]
path = "/*"
function = "middleware"
excludedPath = ["/static/*", "/*.js", "/*.css"]
```

## Authentication Middleware

```typescript
// netlify/edge-functions/auth.ts
import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Protected routes
  if (!url.pathname.startsWith('/dashboard')) {
    return context.next();
  }

  const sessionCookie = context.cookies.get('session');

  if (!sessionCookie) {
    return Response.redirect(new URL('/login', url.origin));
  }

  try {
    // Verify session (use a lightweight JWT library)
    const session = await verifySession(sessionCookie.value);

    // Pass user info to origin via header
    const requestWithUser = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        'x-user-id': session.userId,
      },
    });

    return context.next(requestWithUser);
  } catch {
    return Response.redirect(new URL('/login', url.origin));
  }
};

export const config: Config = { path: "/dashboard/*" };
```

## Using npm Packages

```typescript
// Netlify Edge Functions support npm packages via Deno's npm: prefix
import { Hono } from "npm:hono@4";
import { z } from "npm:zod@3";

const app = new Hono();

app.get("/api/data", async (c) => {
  return c.json({ timestamp: Date.now() });
});

export default app.fetch;
export const config: Config = { path: "/api/*" };
```

## Context Object Features

```typescript
export default async (req: Request, context: Context) => {
  // Geographic data
  console.log(context.geo?.country?.name);      // "United States"
  console.log(context.geo?.city);               // "New York"
  console.log(context.geo?.subdivision?.code);  // "NY"
  console.log(context.geo?.latitude);           // "40.7128"

  // Request cookies
  const theme = context.cookies.get('theme')?.value;

  // Account info (Netlify Identity)
  const user = context.account;

  // Modify and forward
  const response = await context.next();

  // Modify response
  response.headers.set('x-served-by', 'edge');
  return response;
};
```
