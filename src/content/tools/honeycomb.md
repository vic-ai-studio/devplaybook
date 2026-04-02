---
title: "Honeycomb — Observability for Complex Systems"
description: "Honeycomb is the modern observability platform built for high-cardinality, high-dimensionality data. It enables engineers to ask arbitrary questions about production without pre-defining metrics or dashboards."
category: "Observability"
pricing: "Free / Paid"
pricingDetail: "Free tier: 20M events/month. Team: starts at $130/month. Pro: $400/month. Enterprise: custom pricing."
website: "https://www.honeycomb.io"
github: "https://github.com/honeycombio"
tags: ["observability", "distributed-tracing", "opentelemetry", "debugging", "production", "events", "devops"]
pros:
  - "Arbitrary queries: ask any question about production with any combination of fields — no pre-aggregation"
  - "High cardinality: handles millions of unique values per field (user_id, request_id, etc.)"
  - "BubbleUp: automatically identifies what's different about slow/erroring requests"
  - "Query History + Results: share investigations with team, build on previous queries"
  - "Built for OpenTelemetry: official OTEL partner with first-class OTLP support"
cons:
  - "Pricing based on event volume — can get expensive at high scale"
  - "No infrastructure monitoring (EC2 metrics, etc.) — strictly observability for application traces/events"
  - "Learning curve for teams used to metrics-first observability"
  - "No log storage — structured events only"
date: "2026-04-02"
---

## What is Honeycomb?

Honeycomb is an observability platform built on a fundamentally different model than traditional monitoring. Instead of pre-defined metrics and dashboards, Honeycomb stores every event (trace span) with all its fields preserved, and lets you query across any combination of dimensions interactively.

The core insight: in complex distributed systems, you can't predict in advance which fields will be relevant during an incident. Honeycomb lets you discover that "the slow requests are *specifically* for users with billing_country=DE who are using mobile_platform=iOS and calling checkout_v2" — even if you never thought to set up a dashboard for that combination.

## Quick Start

```bash
# Install the Honeycomb CLI
pip install honeycomb-beeline  # Python
# Or use OpenTelemetry (recommended)
```

### OpenTelemetry Setup (Recommended)

```javascript
// Node.js with OTEL
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'https://api.honeycomb.io/v1/traces',
    headers: {
      'x-honeycomb-team': process.env.HONEYCOMB_API_KEY,
    },
  }),
  serviceName: 'payments-service',
});

sdk.start();
```

```bash
# Environment variables approach
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY"
OTEL_SERVICE_NAME=payments-service
```

## Structured Events: The Key Concept

Honeycomb works on *events* — structured data blobs with many fields:

```python
from honeycomb import beeline

# Add custom fields to your trace context
beeline.add_context({
    "user.id": user_id,
    "user.plan": user.plan_type,
    "request.checkout_version": "v2",
    "request.cart_item_count": len(cart.items),
    "payment.provider": "stripe",
    "payment.currency": "USD",
})
```

Every field you add becomes a dimension you can query on. This is the "wide events" philosophy: pack as much context as possible into each trace span.

## BubbleUp: Automatic Root Cause

BubbleUp is Honeycomb's signature feature. When you identify a subset of requests with a problem (slow, erroring), BubbleUp automatically shows you which field values are statistically more common in that subset vs the baseline:

1. Draw a selection on the trace duration histogram (select slow requests)
2. BubbleUp analyzes all fields across those requests
3. Shows you: "100% of slow requests have `api_version=v1`, `db_pool=secondary`"
4. You find the root cause in seconds instead of hours

## Query Interface

Honeycomb queries are interactive — no YAML, no PromQL:

```
Dataset: production-payments

BREAKDOWN: payment.provider, user.country
CALCULATE: P95(duration_ms), COUNT

WHERE: http.status_code >= 500
       AND app.checkout_version = "v2"

LIMIT: 100
ORDER BY: P95(duration_ms) DESC

TIME: Last 4 hours
```

You can refine queries interactively — each field value is clickable, letting you drill down without knowing the query language.

## Sharing Investigations

Every query in Honeycomb has a permalink. During incidents:

1. Identify the problematic dimension (BubbleUp → `user.plan = "enterprise"`)
2. Share the query URL in the incident Slack channel
3. Everyone sees the same live query — no "let me paste my dashboard screenshot"
4. Query history preserved for post-mortems

## Service Level Objectives (SLOs)

```python
# Define SLO: 99.9% of requests complete under 500ms
slo = honeycomb.SLO.create(
    name="Checkout SLO",
    description="99.9% of checkout requests < 500ms",
    target_percentage=99.9,
    time_window_days=30,
    success_criteria={
        "alias": "fast_requests",
        "filter": "duration_ms < 500"
    }
)
```

Honeycomb SLOs are based on actual request data — not sampled metrics — giving you accurate burn rate calculations.

## Honeycomb vs Datadog vs Jaeger

| Dimension | Honeycomb | Datadog | Jaeger |
|-----------|-----------|---------|--------|
| Core model | Wide events | Metrics + traces | Traces |
| High cardinality | Excellent | Limited | Limited |
| Infrastructure monitoring | ❌ | Excellent | ❌ |
| Arbitrary queries | Excellent | Limited | Limited |
| Cost | Medium | High | Free |
| UX for debugging | Best-in-class | Very good | Good |

Honeycomb is the right choice for engineering teams that want to debug complex distributed systems quickly, don't need infrastructure monitoring (use Prometheus for that), and embrace the OpenTelemetry ecosystem.
