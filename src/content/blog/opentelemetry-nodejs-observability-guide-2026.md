---
title: "OpenTelemetry for Node.js: Complete Observability Guide 2026"
description: "Master OpenTelemetry for Node.js observability. Learn auto-instrumentation, traces, metrics, logs, OTLP export to Jaeger/Prometheus, production sampling strategies, and how OTel compares to Datadog."
date: "2026-03-27"
tags: ["opentelemetry", "nodejs", "observability", "monitoring", "tracing", "devops", "backend"]
author: "DevPlaybook Team"
readingTime: "10 min read"
---

# OpenTelemetry for Node.js: Complete Observability Guide 2026

If you're still piecing together observability with ad-hoc `console.log` statements, Datadog agents, and custom metrics scripts, there's a better way. **OpenTelemetry (OTel)** is the CNCF-graduated standard for collecting traces, metrics, and logs from your applications — vendor-neutral, open-source, and increasingly the industry default.

This guide shows you how to instrument a Node.js application with OpenTelemetry from zero to production.

## What Is OpenTelemetry?

OpenTelemetry is an observability framework and toolkit. It defines:
- **APIs** — language-specific interfaces for instrumenting your code
- **SDKs** — implementations of those APIs
- **Data formats** — OTLP (OpenTelemetry Protocol) for transmitting telemetry
- **Instrumentation libraries** — auto-instrumentation for popular frameworks

It's a CNCF project (same umbrella as Kubernetes, Prometheus, Jaeger) and is now the de facto standard for vendor-neutral instrumentation. Once you instrument with OTel, you can send data to Datadog, Jaeger, Grafana, Honeycomb, or any OTLP-compatible backend — without changing your application code.

## The Three Pillars of Observability

| Signal | What It Is | Use Case |
|--------|-----------|----------|
| **Traces** | Distributed request flows with timing | Debug slow requests, find bottlenecks |
| **Metrics** | Aggregated numeric measurements | Dashboards, alerts, trends |
| **Logs** | Timestamped event records | Error context, audit trails |

OTel connects all three: logs can be correlated to traces via trace IDs, metrics can be tagged with the same attributes as spans.

---

## Installation

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

---

## Auto-Instrumentation Setup

The fastest way to get OTel running is auto-instrumentation. It automatically patches HTTP, Express, database clients, Redis, gRPC, and more — no code changes needed in your application files.

```typescript
// instrumentation.ts — must be loaded BEFORE your app
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { Resource } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'my-api',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  }),

  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 15000,  // Export every 15 seconds
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
})

sdk.start()
console.log('OpenTelemetry SDK started')

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OTel SDK shut down'))
    .catch(err => console.error('Error shutting down OTel SDK', err))
    .finally(() => process.exit(0))
})
```

Load this before your application:

```json
// package.json
{
  "scripts": {
    "start": "node -r ./dist/instrumentation.js dist/server.js",
    "start:ts": "ts-node -r ./src/instrumentation.ts src/server.ts"
  }
}
```

With this setup, every incoming HTTP request, outgoing database query, and Redis call is automatically traced.

---

## Manual Spans and Custom Attributes

Auto-instrumentation covers the framework layer. For business logic, add manual spans.

```typescript
// src/services/order.service.ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api'

const tracer = trace.getTracer('order-service')

export async function processOrder(orderId: string, userId: string) {
  // Create a span for this operation
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      // Add attributes for filtering/searching in your backend
      span.setAttributes({
        'order.id': orderId,
        'user.id': userId,
        'order.type': 'standard',
      })

      const order = await fetchOrder(orderId)
      span.setAttribute('order.total', order.total)
      span.setAttribute('order.items_count', order.items.length)

      // Add events (timestamped annotations within the span)
      span.addEvent('order.fetched')

      const payment = await chargePayment(order)
      span.addEvent('payment.processed', {
        'payment.method': payment.method,
        'payment.amount': payment.amount,
      })

      await fulfillOrder(order, payment)
      span.addEvent('order.fulfilled')

      span.setStatus({ code: SpanStatusCode.OK })
      return { success: true, orderId }

    } catch (error) {
      // Record the error on the span
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      })
      throw error
    } finally {
      span.end()  // Always end the span
    }
  })
}
```

### Nested Spans

```typescript
async function fetchOrder(orderId: string) {
  const tracer = trace.getTracer('order-service')

  return tracer.startActiveSpan('fetchOrder', async (span) => {
    span.setAttribute('db.operation', 'SELECT')
    span.setAttribute('db.table', 'orders')

    const order = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    )

    span.end()
    return order
  })
}
```

The spans form a tree — `fetchOrder` is a child of `processOrder`, which is a child of the incoming HTTP request span. This gives you the full trace from request to database.

---

## Metrics

```typescript
// src/metrics.ts
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('my-api')

// Counter: monotonically increasing value
export const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total number of HTTP requests',
})

// Histogram: distribution of values (latencies, sizes)
export const requestDuration = meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
})

// Gauge: observable current value
export const activeConnections = meter.createObservableGauge(
  'db.connections.active',
  { description: 'Active database connections' }
)

// Register gauge callback
activeConnections.addCallback(result => {
  result.observe(db.pool.totalCount - db.pool.idleCount, {
    'db.system': 'postgresql',
  })
})
```

Using metrics in Express middleware:

```typescript
// src/middleware/metrics.ts
import { requestCounter, requestDuration } from '../metrics'

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start

    const attributes = {
      'http.method': req.method,
      'http.route': req.route?.path ?? req.path,
      'http.status_code': String(res.statusCode),
    }

    requestCounter.add(1, attributes)
    requestDuration.record(duration, attributes)
  })

  next()
}
```

---

## Correlating Logs with Traces

The killer feature of OTel is **log-trace correlation**. When a request fails, you want to jump from the error log directly to the trace.

```typescript
// src/logger.ts
import { trace, context } from '@opentelemetry/api'
import pino from 'pino'

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
})

// Wrapper that automatically injects trace context
export const logger = {
  info(msg: string, extra?: object) {
    const span = trace.getActiveSpan()
    if (span) {
      const ctx = span.spanContext()
      baseLogger.info({ ...extra, traceId: ctx.traceId, spanId: ctx.spanId }, msg)
    } else {
      baseLogger.info(extra, msg)
    }
  },

  error(msg: string, error?: Error, extra?: object) {
    const span = trace.getActiveSpan()
    const ctx = span?.spanContext()
    baseLogger.error({
      ...extra,
      ...(ctx && { traceId: ctx.traceId, spanId: ctx.spanId }),
      err: error ? { message: error.message, stack: error.stack } : undefined,
    }, msg)
  },
}
```

Now every log line includes the `traceId`. In Grafana Loki or Datadog Logs, you can click "View Trace" and jump directly to the distributed trace for that request.

---

## Exporting to Jaeger, Prometheus, and OTLP Collector

The OTel Collector is a standalone agent that receives telemetry and forwards it to multiple backends simultaneously.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  prometheus:
    endpoint: 0.0.0.0:8889

  # Send to Datadog (vendor backend)
  datadog:
    api:
      key: ${DATADOG_API_KEY}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter]
      exporters: [jaeger, datadog]

    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, datadog]
```

```yaml
# docker-compose.yml (dev setup)
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
```

---

## Production Best Practices

### 1. Sampling

In high-traffic production, trace every request costs money and storage. Use sampling:

```typescript
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'

const sdk = new NodeSDK({
  // Sample 10% of traffic; always sample if parent span is sampled
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1),
  }),
  // ...
})
```

For more control, implement a custom sampler that always samples errors:

```typescript
import { Sampler, SamplingDecision, SamplingResult, Span } from '@opentelemetry/api'

class ErrorAlwaysSampler implements Sampler {
  private ratio: TraceIdRatioBasedSampler

  constructor(ratio: number) {
    this.ratio = new TraceIdRatioBasedSampler(ratio)
  }

  shouldSample(context: Context, traceId: string, spanName: string, spanKind: SpanKind, attributes: Attributes): SamplingResult {
    // Always sample spans marked as errors
    if (attributes['error'] || attributes['http.status_code'] >= 400) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED }
    }
    return this.ratio.shouldSample(context, traceId, spanName, spanKind, attributes)
  }

  toString(): string { return 'ErrorAlwaysSampler' }
}
```

### 2. Resource Attributes

Tag all telemetry with context about where it came from:

```typescript
import { Resource } from '@opentelemetry/resources'
import { detectResources } from '@opentelemetry/resources'

const resource = Resource.default().merge(new Resource({
  'service.name': process.env.SERVICE_NAME ?? 'my-api',
  'service.version': process.env.npm_package_version ?? 'unknown',
  'deployment.environment': process.env.NODE_ENV ?? 'development',
  'service.instance.id': process.env.POD_NAME ?? require('os').hostname(),
  'cloud.provider': 'aws',
  'cloud.region': process.env.AWS_REGION ?? 'us-east-1',
}))
```

### 3. Batch Export with Retry

```typescript
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  timeoutMillis: 5000,
  headers: {
    'Authorization': `Bearer ${process.env.OTEL_API_KEY}`,
  },
})

// BatchSpanProcessor buffers spans and sends in batches
// More efficient than SimpleSpanProcessor
const processor = new BatchSpanProcessor(exporter, {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000,
  exportTimeoutMillis: 30000,
})
```

---

## OTel vs Datadog vs Custom Logging

| Factor | OpenTelemetry | Datadog Agent | Custom Logging |
|--------|--------------|---------------|----------------|
| Vendor lock-in | None (export anywhere) | Locked to Datadog | None |
| Setup complexity | Medium | Low | Low |
| Auto-instrumentation | Excellent | Excellent | Manual only |
| Cost | Free (open-source) | $$$  | Storage only |
| Correlation (logs+traces) | Built-in | Built-in | Manual |
| Context propagation | W3C standard | Proprietary | N/A |
| Self-hosted option | Yes | Limited | Yes |

**When to use OpenTelemetry:**
- Multi-cloud or cloud-agnostic deployments
- You want to avoid vendor lock-in
- You need to send telemetry to multiple backends
- Open-source stack (Jaeger + Prometheus + Grafana)

**When Datadog makes sense:**
- Already paying for Datadog
- Team prefers managed infrastructure over self-hosting
- APM features like error tracking, session replay, profiling are needed

**Custom logging is insufficient when:**
- You need distributed tracing across microservices
- Debugging requires correlating requests across services
- SLO/SLA monitoring is required

---

## Summary

OpenTelemetry is the observability standard for Node.js in 2026:

- **Auto-instrumentation** covers HTTP, Express, databases, Redis with zero code changes
- **Manual spans** let you trace business logic with custom attributes and events
- **Metrics** give you dashboards, histograms, and alerts from the same SDK
- **Log correlation** links log lines to distributed traces via trace IDs
- **Vendor-neutral** — instrument once, export to Jaeger, Prometheus, Datadog, Grafana, Honeycomb
- **Production sampling** keeps costs manageable at scale

Start with `@opentelemetry/auto-instrumentations-node` and the OTLP collector. You'll have distributed traces running in under an hour, and the investment pays dividends the first time you debug a slow request across three services in 30 seconds instead of 30 minutes.
