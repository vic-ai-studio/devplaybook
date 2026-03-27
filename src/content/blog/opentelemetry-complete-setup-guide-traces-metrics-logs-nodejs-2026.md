---
title: "OpenTelemetry Complete Setup Guide: Traces, Metrics, and Logs for Node.js 2026"
description: "OpenTelemetry setup guide for Node.js — instrument traces, metrics, and logs with the OTel SDK. Export to Jaeger, Tempo, and Prometheus. Auto-instrumentation, custom spans, context propagation explained."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["opentelemetry", "observability", "nodejs", "tracing", "metrics", "logging", "jaeger", "grafana-tempo", "monitoring"]
readingTime: "12 min read"
---

Observability without OpenTelemetry in 2026 means vendor lock-in — different SDKs for Datadog, New Relic, Honeycomb, each with their own API. OpenTelemetry (OTel) solves this: one open-source SDK, one data format, export anywhere. You instrument once and decide where your data goes later.

This guide covers a complete Node.js setup from zero to production: auto-instrumentation, custom traces, metrics, structured logs, context propagation, and exporting to Jaeger (traces) and Prometheus (metrics).

---

## What Is OpenTelemetry?

OpenTelemetry is a CNCF project that provides:

- **SDK** — libraries for instrumentation in 11+ languages
- **API** — stable interfaces your code calls (separate from implementation)
- **Collector** — a standalone agent/gateway that receives, processes, and exports telemetry
- **Protocol (OTLP)** — a standard wire format for traces, metrics, and logs

The three pillars:

| Signal | What it tells you | Format |
|--------|-------------------|--------|
| **Traces** | The path a request took through your system | Spans with parent/child relationships |
| **Metrics** | Aggregated numbers over time (counts, gauges, histograms) | Time series |
| **Logs** | Discrete events with timestamps and attributes | Structured JSON |

---

## Install Dependencies

```bash
# Core SDK
npm install @opentelemetry/sdk-node @opentelemetry/api

# Auto-instrumentation (HTTP, Express, database clients, etc.)
npm install @opentelemetry/auto-instrumentations-node

# OTLP exporters (send data to collectors)
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/exporter-metrics-otlp-http

# Optional: console exporter for local dev
npm install @opentelemetry/sdk-trace-node
```

---

## Step 1: Initialize the SDK (Tracing + Metrics)

Create `tracing.ts` (or `tracing.js`) and load it **before** any application code:

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'my-api',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),

  // Trace exporter — send spans to OTLP endpoint (Jaeger, Tempo, Honeycomb, etc.)
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    headers: {
      // For hosted services: 'x-honeycomb-team': process.env.HONEYCOMB_API_KEY
    },
  }),

  // Metrics exporter — send metrics every 30 seconds
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 30_000,
  }),

  // Auto-instrument: http, express, pg, mysql2, redis, mongodb, aws-sdk, grpc, etc.
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
    }),
  ],
});

sdk.start();
console.log('OpenTelemetry initialized');

// Graceful shutdown — flush pending telemetry
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Load it before your app entry point:

```json
// package.json
{
  "scripts": {
    "start": "node --require ./dist/tracing.js dist/index.js",
    "dev": "ts-node -r ./tracing.ts src/index.ts"
  }
}
```

Or via environment variable:

```bash
NODE_OPTIONS="--require ./tracing.js" node index.js
```

---

## Step 2: Auto-Instrumentation in Action

With `getNodeAutoInstrumentations`, your HTTP calls and database queries are automatically traced. An Express route becomes:

```
POST /api/orders
  └── SELECT * FROM users WHERE id = ? (pg, 4ms)
  └── SET order:123 (redis, 1ms)
  └── POST https://stripe.com/v1/charges (http, 230ms)
```

No code changes needed. Auto-instrumentation handles:

- `http` / `https` — all inbound and outbound HTTP requests
- `express` / `fastify` / `koa` — route-level spans
- `pg`, `mysql2`, `better-sqlite3` — SQL query spans with db.statement attribute
- `redis`, `ioredis` — Redis command spans
- `mongodb` — MongoDB operation spans
- `@aws-sdk/client-*` — AWS SDK calls (S3, DynamoDB, SQS, etc.)
- `grpc` / `@grpc/grpc-js` — gRPC method spans

---

## Step 3: Custom Spans

Auto-instrumentation gives you the skeleton. Custom spans give you the detail:

```typescript
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service', '1.0.0');

export async function processOrder(orderId: string, userId: string) {
  // Create a span for this business operation
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      // Add structured attributes to the span
      span.setAttributes({
        'order.id': orderId,
        'user.id': userId,
        'order.source': 'web',
      });

      const order = await fetchOrder(orderId);
      span.setAttribute('order.total_usd', order.totalCents / 100);
      span.setAttribute('order.item_count', order.items.length);

      await chargePayment(order);
      await fulfillOrder(order);

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (err) {
      // Record the error on the span
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Nested Spans

Child spans inherit the parent via context propagation:

```typescript
async function chargePayment(order: Order) {
  return tracer.startActiveSpan('chargePayment', async (span) => {
    span.setAttributes({
      'payment.method': order.paymentMethod,
      'payment.amount_usd': order.totalCents / 100,
    });
    try {
      const charge = await stripe.charges.create({ /* ... */ });
      span.setAttribute('payment.charge_id', charge.id);
      return charge;
    } finally {
      span.end();
    }
  });
}
```

---

## Step 4: Metrics

The Metrics API provides three instrument types:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('order-service', '1.0.0');

// Counter — monotonically increasing (requests, errors, events)
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests processed',
});

// Histogram — measure distributions (latency, payload size)
const latencyHistogram = meter.createHistogram('http.request.duration_ms', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
  advice: { explicitBucketBoundaries: [5, 10, 25, 50, 100, 250, 500, 1000, 2500] },
});

// UpDownCounter — can go up or down (active connections, queue depth)
const activeConnections = meter.createUpDownCounter('db.connections.active', {
  description: 'Active database connections',
});

// Observable Gauge — polled on each collection cycle
const memoryGauge = meter.createObservableGauge('process.memory.heap_mb', {
  description: 'Process heap memory usage in MB',
});
memoryGauge.addCallback((result) => {
  result.observe(process.memoryUsage().heapUsed / 1_048_576);
});

// Usage in request handler
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const labels = { method: req.method, route: req.route?.path || req.path, status: String(res.statusCode) };
    requestCounter.add(1, labels);
    latencyHistogram.record(Date.now() - start, labels);
  });
  next();
});
```

---

## Step 5: Structured Logs with Trace Context

OTel logs correlate log entries to traces via `trace_id` and `span_id`:

```typescript
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { context, trace } from '@opentelemetry/api';

const logger = logs.getLogger('order-service', '1.0.0');

export function logEvent(severity: SeverityNumber, message: string, attributes: Record<string, unknown> = {}) {
  const span = trace.getActiveSpan();
  const ctx = context.active();

  logger.emit({
    severityNumber: severity,
    severityText: SeverityNumber[severity],
    body: message,
    attributes: {
      ...attributes,
      // Auto-correlate to active span if present
      'trace.id': span?.spanContext().traceId,
      'span.id': span?.spanContext().spanId,
    },
    context: ctx,
  });
}

// Usage
logEvent(SeverityNumber.INFO, 'Order charged', { 'order.id': orderId, 'payment.id': chargeId });
logEvent(SeverityNumber.ERROR, 'Payment failed', { 'order.id': orderId, 'error.type': err.name });
```

For most Node.js apps, wiring your existing logger (Winston, Pino) to emit trace context is easier:

```typescript
// Pino with trace context
import pino from 'pino';
import { trace } from '@opentelemetry/api';

const logger = pino({
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    return { traceId: ctx.traceId, spanId: ctx.spanId };
  },
});
```

---

## Step 6: Context Propagation Across Services

OpenTelemetry propagates trace context across service boundaries via HTTP headers:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

Auto-instrumentation handles this for HTTP calls automatically. For message queues, inject and extract manually:

```typescript
import { propagation, context } from '@opentelemetry/api';

// Producer: inject trace context into message headers
async function publishMessage(topic: string, payload: unknown) {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  await kafka.producer().send({
    topic,
    messages: [{ value: JSON.stringify({ payload, otelHeaders: carrier }) }],
  });
}

// Consumer: extract trace context from message headers
async function consumeMessage(message: KafkaMessage) {
  const { payload, otelHeaders } = JSON.parse(message.value!.toString());
  const parentContext = propagation.extract(context.active(), otelHeaders);

  await context.with(parentContext, async () => {
    return tracer.startActiveSpan('consume.message', async (span) => {
      try {
        await processPayload(payload);
      } finally {
        span.end();
      }
    });
  });
}
```

---

## Step 7: Export to Jaeger (Traces)

Run Jaeger locally with Docker:

```bash
docker run -d \
  -p 16686:16686 \    # Jaeger UI
  -p 4317:4317 \      # OTLP gRPC
  -p 4318:4318 \      # OTLP HTTP
  jaegertracing/all-in-one:latest
```

Your SDK already points to `http://localhost:4318/v1/traces` — traces appear in Jaeger UI at `http://localhost:16686`.

For **Grafana Tempo** (production-grade, integrates with Grafana):

```yaml
# docker-compose.yaml
services:
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "3200:3200"   # Tempo API
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
    command: -config.file=/etc/tempo.yaml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
```

---

## Step 8: Export to Prometheus (Metrics)

OpenTelemetry can push metrics to a Prometheus-compatible endpoint:

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

const exporter = new PrometheusExporter({ port: 9464 });

const meterProvider = new MeterProvider({
  readers: [exporter],
});

metrics.setGlobalMeterProvider(meterProvider);
```

Prometheus scrapes `http://localhost:9464/metrics`. Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-api'
    static_configs:
      - targets: ['localhost:9464']
```

---

## OpenTelemetry Collector (Production)

In production, use the **OTel Collector** as a gateway between your app and backends. Benefits: batching, retry on failure, filtering sensitive data, fan-out to multiple backends.

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  filter/drop_health:
    spans:
      exclude:
        match_type: strict
        attributes:
          - key: http.route
            value: /healthz

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, filter/drop_health]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheusremotewrite]
```

---

## Environment Variables Reference

```bash
# Service identity
OTEL_SERVICE_NAME=my-api
OTEL_SERVICE_VERSION=1.2.0

# Exporter endpoints
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4318/v1/metrics

# Sampling (reduce volume in production)
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1   # 10% sample rate

# Propagation format
OTEL_PROPAGATORS=tracecontext,baggage

# Log level
OTEL_LOG_LEVEL=warn
```

---

## Common Mistakes

**1. Loading the SDK after `require('express')`**
Auto-instrumentation patches modules at import time. If you `require('express')` before `sdk.start()`, Express won't be instrumented. Always load `tracing.ts` first.

**2. Not calling `span.end()`**
Spans not ended are never exported. Use try/finally or `startActiveSpan`'s callback form — the SDK calls `end()` for you automatically when using the callback version.

**3. Recording sensitive data in span attributes**
Span attributes are stored in your tracing backend and visible to anyone with access. Never put passwords, tokens, full credit card numbers, or PII in `span.setAttribute()`. Redact at the collector level if needed.

**4. Setting sampling too high in production**
At 100% sampling on a high-traffic service, traces become expensive storage-wise. Use `parentbased_traceidratio` with 1–10% in production, 100% in staging.

---

## Summary

| Step | What you get |
|------|-------------|
| Install SDK + auto-instrumentation | HTTP, DB, Redis traces for free |
| Custom spans | Business operation visibility |
| Metrics | Counters, histograms, gauges |
| Structured logs | Correlated to trace context |
| Context propagation | Traces across services and queues |
| Jaeger / Tempo | Trace storage and UI |
| Prometheus | Metrics storage and alerting |
| OTel Collector | Production-grade routing and filtering |

OpenTelemetry's power is the vendor-neutral foundation: instrument once, ship to Jaeger today, Honeycomb tomorrow, Grafana next quarter — without touching your application code.

---

**Related tools:** [API Latency Heatmap](/tools/api-latency-heatmap) · [API Request Builder](/tools/api-request-builder) · [Ansible Playbook Builder](/tools/ansible-playbook-builder) · [Docker Compose Generator](/tools/docker-compose-generator)
