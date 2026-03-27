---
title: "OpenTelemetry Complete Guide 2026: Traces, Metrics, Logs & Jaeger Setup"
description: "The definitive OpenTelemetry guide for 2026. Learn how to set up traces, metrics, and logs with the OTel SDK, configure Jaeger backends, and instrument Node.js applications end-to-end."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["opentelemetry", "observability", "tracing", "metrics", "logs", "jaeger", "nodejs", "devops"]
readingTime: "20 min read"
---

Modern distributed systems fail in subtle ways. A single user request might touch a dozen services before completing — and when it breaks, you need more than error messages. You need the full story: which service called which, how long each hop took, and what state the system was in when things went wrong.

OpenTelemetry (OTel) is the CNCF standard that gives you that story. This guide covers everything from the three pillars of observability to wiring up a production-ready Node.js app with Jaeger for trace visualization.

---

## The Three Pillars: Traces, Metrics, and Logs

OpenTelemetry is built around three types of telemetry signals:

### Traces

A **trace** represents the complete journey of a request through your system. It's made up of **spans** — individual units of work, each with a start time, end time, attributes, and status.

```
[HTTP Request]
  └── [Auth Middleware] 4ms
  └── [Database Query: users] 23ms
  └── [Cache Lookup] 2ms
  └── [HTTP Response] 1ms
Total: 30ms
```

Traces answer: *Where is time being spent? Where do failures originate?*

### Metrics

**Metrics** are numeric measurements collected over time: counters, gauges, and histograms. Unlike traces, metrics are aggregated — they tell you *how many* and *how often*, not the full story of individual requests.

Examples:
- `http.server.request.duration` (histogram) — request latency distribution
- `http.server.active_requests` (gauge) — current concurrent requests
- `process.runtime.nodejs.gc.duration` (histogram) — GC pause times

### Logs

**Logs** are structured event records with timestamps, severity, and a message body. OTel logs are designed to be correlated with traces via `traceId` and `spanId` fields, so you can jump from a trace span directly to the log lines it emitted.

---

## How OpenTelemetry Works

The OTel architecture has three layers:

1. **SDK** — runs in your application process, captures telemetry
2. **Collector** — a standalone process that receives, processes, and exports data
3. **Backends** — storage and visualization (Jaeger, Prometheus, Grafana, Datadog, etc.)

```
Your App (OTel SDK)
    │
    ▼ OTLP (gRPC or HTTP)
OTel Collector
    │         │
    ▼         ▼
 Jaeger   Prometheus
```

You can skip the Collector in development and export directly from your app, but in production the Collector handles batching, retry, sampling, and fan-out to multiple backends.

---

## Installing the OTel SDK for Node.js

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/sdk-metrics \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

For Jaeger direct export (useful in development):

```bash
npm install @opentelemetry/exporter-jaeger
```

---

## Setting Up Tracing

Create a `tracing.ts` (or `tracing.js`) file that initializes OTel **before** any other imports:

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'my-api-service',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // noisy
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

Then in `package.json`:

```json
{
  "scripts": {
    "start": "node --require ./tracing.js src/index.js"
  }
}
```

Or with TypeScript + ts-node:

```json
{
  "scripts": {
    "start": "ts-node --require ./tracing.ts src/index.ts"
  }
}
```

---

## Manual Instrumentation: Custom Spans

Auto-instrumentation covers HTTP, databases, and popular frameworks. For your own business logic, add manual spans:

```typescript
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function processOrder(orderId: string) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttributes({
      'order.id': orderId,
      'order.source': 'api',
    });

    try {
      const order = await fetchOrder(orderId);

      // Nested span for a sub-operation
      const charged = await tracer.startActiveSpan('chargePayment', async (paySpan) => {
        paySpan.setAttribute('payment.amount', order.total);
        const result = await chargeStripe(order);
        paySpan.setStatus({ code: SpanStatusCode.OK });
        paySpan.end();
        return result;
      });

      span.setStatus({ code: SpanStatusCode.OK });
      return charged;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

Key span operations:
- `setAttributes()` — add key-value metadata (searchable in Jaeger)
- `addEvent()` — record a timestamped event within a span
- `recordException()` — attach an error with stack trace
- `setStatus()` — mark OK or ERROR with a message

---

## Metrics: Counters, Histograms, and Gauges

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-service');

// Counter — always increasing
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests received',
});

// Histogram — for latency and size distributions
const requestDuration = meter.createHistogram('http.request.duration.ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

// Observable gauge — for values that fluctuate
const activeConnections = meter.createObservableGauge('db.connections.active', {
  description: 'Active database connections',
});

activeConnections.addCallback((result) => {
  result.observe(getActiveConnectionCount(), { pool: 'primary' });
});

// In your Express middleware:
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    requestCounter.add(1, {
      method: req.method,
      route: req.route?.path ?? 'unknown',
      status: String(res.statusCode),
    });
    requestDuration.record(duration, {
      method: req.method,
      route: req.route?.path ?? 'unknown',
    });
  });

  next();
});
```

---

## Structured Logs with Trace Correlation

To get log-to-trace correlation, inject `traceId` and `spanId` into every log line:

```typescript
import { trace } from '@opentelemetry/api';
import pino from 'pino';

const baseLogger = pino({ level: 'info' });

function getLogger() {
  const span = trace.getActiveSpan();
  if (!span) return baseLogger;

  const { traceId, spanId } = span.spanContext();
  return baseLogger.child({ traceId, spanId });
}

// Usage
async function getUserById(userId: string) {
  const log = getLogger();
  log.info({ userId }, 'Fetching user');

  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

  if (!user) {
    log.warn({ userId }, 'User not found');
  }
  return user;
}
```

In Jaeger, you can click a span and follow the `traceId` link into your log aggregator (Loki, OpenSearch, etc.) to see correlated logs.

---

## Running Jaeger Locally

Jaeger is the easiest way to visualize traces in development. Use the all-in-one Docker image:

```bash
docker run -d \
  --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Ports:
- `16686` — Jaeger UI (open in browser)
- `4317` — OTLP gRPC receiver
- `4318` — OTLP HTTP receiver

With this running, your `OTLPTraceExporter` pointing to `http://localhost:4318/v1/traces` will automatically appear in the Jaeger UI at `http://localhost:16686`.

### Searching Traces in Jaeger

Once traces arrive, you can search by:
- **Service** — filter to a specific microservice
- **Operation** — find all `POST /orders` spans
- **Tags** — find all spans where `order.id = "abc123"`
- **Duration** — find requests slower than 500ms
- **Time range** — look at the last 1 hour

The trace view shows a waterfall diagram with all spans, their durations, and any events or errors.

---

## The OTel Collector in Production

In production, route telemetry through the OTel Collector rather than exporting directly from your app. The Collector provides:

- **Batching** — reduces network overhead
- **Retry** — handles backend unavailability
- **Sampling** — drop a percentage of low-value traces
- **Fan-out** — send to multiple backends simultaneously

**`otel-collector-config.yaml`:**

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  # Tail sampling: keep 100% of error traces, 10% of success traces
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces
        type: latency
        latency: { threshold_ms: 1000 }
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, tail_sampling]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

---

## Sampling Strategy

Tracing every request is expensive at scale. Common strategies:

| Strategy | When to Use |
|----------|------------|
| **Always-on** | Development, low-traffic services |
| **Probabilistic (head)** | Sample 5-10% of all traces uniformly |
| **Rate limiting** | Cap at N traces/second regardless of traffic |
| **Tail sampling** | Keep traces with errors or slow spans (requires Collector) |

For production, tail sampling in the Collector is the gold standard — you capture all errors without storing every boring success.

---

## Context Propagation Across Services

Distributed tracing only works if trace context travels between services. OTel uses the W3C TraceContext standard by default (the `traceparent` HTTP header).

Auto-instrumentation handles this automatically for HTTP calls via `fetch`, `axios`, and `node:http`. For message queues, you need to manually inject/extract:

```typescript
import { propagation, context } from '@opentelemetry/api';

// Producer: inject trace context into message headers
async function publishMessage(topic: string, payload: object) {
  const headers: Record<string, string> = {};
  propagation.inject(context.active(), headers);

  await kafka.producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload), headers }],
  });
}

// Consumer: extract trace context from message headers
async function consumeMessage(message: KafkaMessage) {
  const parentContext = propagation.extract(context.active(), message.headers ?? {});

  return context.with(parentContext, async () => {
    // Spans created here are children of the producer's trace
    await processMessage(message);
  });
}
```

---

## Environment-Based Configuration

Rather than hardcoding endpoints, use the standard OTel environment variables:

```bash
# Service identity
OTEL_SERVICE_NAME=my-api
OTEL_SERVICE_VERSION=2.1.0
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,team=platform

# Exporter endpoints
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.internal:4318
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer ${TOKEN}

# Sampling
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

The SDK reads these automatically — no code changes needed between environments.

---

## Verifying Your Setup

A quick sanity check before deploying:

```typescript
// health-check.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('health-check');

async function smokeTest() {
  return tracer.startActiveSpan('smoke-test', async (span) => {
    span.setAttributes({ 'test.type': 'startup' });

    // Force flush so the span is exported before the process exits
    const sdk = trace.getTracerProvider() as any;
    if (sdk?.forceFlush) await sdk.forceFlush();

    span.end();
    console.log('OTel smoke test span exported');
  });
}

smokeTest();
```

After running, open Jaeger UI → search for service `health-check` → you should see the `smoke-test` span.

---

## Common Pitfalls

**1. Importing before `sdk.start()`**
Auto-instrumentation patches modules at import time. If you `import express from 'express'` before calling `sdk.start()`, the HTTP instrumentation won't apply. Always load `tracing.ts` first via `--require`.

**2. Missing `span.end()`**
Spans that aren't ended never appear in Jaeger. Always use `try/finally` or `startActiveSpan` (which handles end automatically in its callback).

**3. High cardinality attributes**
Don't put unique values (user IDs, order IDs) directly in metric attribute sets — that creates unbounded label cardinality and crashes Prometheus. Put them in trace span attributes instead, not metric labels.

**4. Synchronous `sdk.shutdown()` on exit**
The SDK buffers spans in memory. Call `await sdk.shutdown()` in your `SIGTERM` handler to flush the buffer before the process exits, or you'll lose the last few spans.

---

## What to Read Next

- [OpenTelemetry Collector documentation](https://opentelemetry.io/docs/collector/) — full configuration reference
- [Jaeger Architecture](https://www.jaegertracing.io/docs/architecture/) — how Jaeger stores and queries traces
- [Grafana + OTel](https://grafana.com/docs/grafana/latest/datasources/jaeger/) — connect Jaeger traces to Grafana dashboards
- Auto-instrumentation packages: `@opentelemetry/auto-instrumentations-node` covers 40+ libraries including Mongoose, Redis, gRPC, and AWS SDK

OpenTelemetry has become the de facto standard for observability in distributed systems. Start with auto-instrumentation to get value immediately, then layer in custom spans for your business logic as you identify gaps in visibility.
