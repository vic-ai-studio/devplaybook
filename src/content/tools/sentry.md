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

## Concrete Use Case: Full-Stack Error Tracking for a React + FastAPI E-Commerce Platform

A mid-size e-commerce team runs a React SPA on the frontend and a FastAPI service handling product catalog, cart, and checkout on the backend. Before Sentry, bugs surfaced through customer support tickets — often days after the root cause was deployed. The team integrated `@sentry/react` on the frontend and `sentry-sdk[fastapi]` on the backend, wiring both to the same Sentry organization with separate projects. On the React side, Sentry's ErrorBoundary component catches rendering failures and reports them with the component tree, while the Fetch/XHR breadcrumbs automatically capture every API call leading up to a crash. On the FastAPI side, the ASGI middleware captures unhandled exceptions with the full request payload, user ID from the JWT, and database query spans.

The critical piece is release tracking tied to GitHub deploys. The team added `sentry-cli` to their GitHub Actions workflow: on every merge to `main`, the pipeline runs `sentry-cli releases new $GITHUB_SHA`, associates commits with `set-commits --auto`, uploads source maps for the React build, and finalizes the release. When a new `TypeError` appears after a Thursday deploy, Sentry immediately attributes it to a specific commit in the release, shows that it affects 2% of checkout sessions, and links directly to the suspect commit on GitHub. The on-call engineer clicks through to Session Replay, watches a user add items to cart and hit the broken checkout button, identifies the null reference in the order summary component, and ships a fix — all within 30 minutes of the first occurrence.

This setup also feeds into the team's SLO dashboard. Sentry's error rate per release is exported via the API to Grafana, where the team tracks a 99.5% error-free session target. When the error budget dips below threshold, deploys are automatically paused by a GitHub Actions check that queries Sentry's API for the current release's crash-free rate. The combination of frontend and backend instrumentation under one Sentry organization gives the team a unified view of failures across the entire request lifecycle.

## When to Use Sentry

**Use Sentry when:**
- You need real-time error alerting with full stack traces, breadcrumbs, and user context rather than grepping through log files
- Your team ships frequently and needs release-level regression tracking to pinpoint which deploy introduced a bug
- You want session replay to visually reproduce user-reported issues without asking for screenshots or steps-to-reproduce
- You are running both frontend and backend services and want correlated error tracking across the full request lifecycle
- You need performance monitoring (P50/P95/P99 latencies, N+1 detection) alongside error tracking in a single platform

**When NOT to use Sentry:**
- You only need infrastructure-level monitoring (CPU, memory, disk) — use Prometheus/Grafana or Datadog instead
- Your application generates very high error volumes by design (e.g., web scrapers with expected 404s) and you would burn through quotas quickly
- You need long-term log storage and analysis — Sentry retains data for 90 days maximum; use ELK or Loki for log aggregation
- You are building a system where all errors are already handled and logged structurally (e.g., batch processing pipelines with built-in retry and dead-letter queues)
