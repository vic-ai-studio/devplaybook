---
title: "Sentry — Error Tracking, Performance Monitoring & Session Replay"
description: "Sentry captures every unhandled exception, slow transaction, and user session in your app. Get full stack traces, breadcrumbs, and release tracking so you can fix bugs before users report them."
category: "Monitoring"
pricing: "Free / Paid"
pricingDetail: "Free tier: 5k errors/month. Team plan $26/month (50k errors). Business plan $80/month. Self-hosted open source available."
website: "https://sentry.io"
github: "https://github.com/getsentry/sentry"
tags: ["error-tracking", "monitoring", "apm", "debugging", "session-replay", "performance", "observability"]
pros:
  - "5-minute SDK integration — one import and you're catching errors"
  - "Rich context: full stack trace, user info, request data, breadcrumbs"
  - "Session replay: watch exactly what the user did before the error"
  - "Release tracking: know which deploy introduced a regression"
  - "Performance monitoring: P50/P75/P99 latency, N+1 query detection, slow DB calls"
  - "Source maps support: readable stack traces for minified JS"
cons:
  - "Free tier limits are tight for production apps (5k errors/month)"
  - "Team plan pricing adds up with multiple projects"
  - "Data retention only 90 days on paid plans (no infinite history)"
  - "Self-hosted requires significant infra (Postgres, Redis, Kafka, Clickhouse)"
date: "2026-04-01"
---

## What is Sentry?

Sentry is an application monitoring platform focused on errors and performance. When your app throws an unhandled exception, Sentry captures it instantly — with the full stack trace, the last 50 user actions (breadcrumbs), request headers, environment variables, and who was affected. You fix bugs faster because you have the exact context you'd spend hours reproducing manually.

## Quick Integration

```bash
# Node.js / Express
npm install @sentry/node

# Python / FastAPI
pip install sentry-sdk[fastapi]
```

```javascript
// index.js — initialize before any other imports
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://your-dsn@sentry.io/project-id",
  tracesSampleRate: 0.1,  // 10% of transactions for performance
  release: process.env.GIT_COMMIT_SHA,
});
```

That's it. Every unhandled exception is now tracked with full context.

## Key Features

### Error Grouping & Deduplication

Sentry intelligently groups similar errors into "issues" so your dashboard doesn't flood with 10,000 identical `TypeError: Cannot read property 'x' of undefined` entries. Each issue shows occurrence count, affected users, and the first/last seen date.

### Breadcrumbs

The 50 events leading up to an error are automatically captured: page navigations, console logs, network requests, UI clicks. You see the user's journey, not just the crash.

```
[navigation] /products → /cart
[http] GET /api/cart 200 (45ms)
[click] button#checkout
[http] POST /api/orders 500 (2100ms)
[error] TypeError: order.id is undefined ← here
```

### Performance Monitoring

```python
# Python — manual transaction span
with sentry_sdk.start_transaction(op="task", name="process_order"):
    with sentry_sdk.start_span(op="db", description="fetch order"):
        order = db.query(Order).get(order_id)
```

Sentry measures every HTTP request, database query, and cache operation. N+1 query detection flags ORM anti-patterns automatically. Waterfall view shows exactly where time is spent.

### Session Replay

Available on Team+ plans, Session Replay records a video-like reconstruction (not a screen recording) of the user's session. Privacy-safe — PII is masked by default. When reviewing a bug, click "Replay" on the error and watch it happen.

### Release Tracking

Tag deploys with your git SHA:

```bash
SENTRY_AUTH_TOKEN=xxx sentry-cli releases new $VERSION
sentry-cli releases set-commits $VERSION --auto
sentry-cli releases finalize $VERSION
```

Sentry shows you which release introduced a regression and how many users are affected per version.

## Best For

- Frontend teams who need to catch JS errors users never report
- Backend APIs where silent exceptions cause data integrity issues
- Mobile apps (iOS/Android SDKs available) with session replay
- Teams adopting SLO monitoring — Sentry's error rates feed into error budget dashboards
