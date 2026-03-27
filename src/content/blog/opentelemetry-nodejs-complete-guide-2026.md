---
title: "OpenTelemetry Complete Guide for Node.js 2026"
description: "A comprehensive, practical guide to implementing OpenTelemetry in Node.js applications. Covers distributed tracing, metrics, logs, exporters (Jaeger, OTLP, Prometheus), auto-instrumentation, and production best practices for Express, Fastify, and NestJS."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["opentelemetry", "nodejs", "observability", "tracing", "monitoring", "devops", "express", "nestjs"]
readingTime: "18 min read"
---

Observability has become a non-negotiable part of modern backend engineering. When a request fails at 3 AM, you need distributed traces, metrics, and structured logs that actually tell you *where* the problem is — not a sea of `console.log` statements spread across five microservices.

OpenTelemetry (OTel) is the open-source standard that unifies how you collect, process, and export telemetry data. In this guide, you'll learn how to instrument Node.js apps from scratch, integrate popular exporters like Jaeger and OTLP, and make auto-instrumentation work across Express, Fastify, and NestJS.

---

## What Is OpenTelemetry?

OpenTelemetry is a vendor-neutral observability framework governed by the CNCF. It provides:

- **APIs and SDKs** to instrument your code
- **Collectors** to receive, process, and export telemetry
- **Semantic conventions** so different tools speak the same language

Three pillars of observability map directly to OTel signals:

| Signal | Purpose | OTel Component |
|--------|---------|----------------|
| Traces | Request flow across services | `@opentelemetry/sdk-trace-node` |
| Metrics | Counters, histograms, gauges | `@opentelemetry/sdk-metrics` |
| Logs | Structured event records | `@opentelemetry/sdk-logs` |

The major advantage over vendor-specific SDKs (Datadog, New Relic, etc.) is that you instrument once and export anywhere.

---

## Installation

Install the core SDK and common instrumentation packages:

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

For Jaeger specifically:

```bash
npm install @opentelemetry/exporter-jaeger
```

---

## Project Structure

A clean OTel setup keeps instrumentation separate from application code:

```
src/
  instrumentation.ts   ← bootstrap OTel before anything else
  app.ts               ← your Express/Fastify/NestJS app
  index.ts             ← entry point: requires instrumentation first
```

---

## Setting Up Tracing

Create `src/instrumentation.ts`:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME ?? 'my-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version ?? '0.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ?? 'http://localhost:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15_000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // noisy, often unneeded
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Then in `src/index.ts`, import instrumentation **first**:

```typescript
// MUST be the very first import
import './instrumentation';

import { app } from './app';

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

> **Critical:** Instrumentation must load before any other module. If you use `ts-node`, pass `--require ./src/instrumentation.ts` instead of relying on import order.

---

## Auto-Instrumentation

`getNodeAutoInstrumentations()` automatically instruments:

- **HTTP/HTTPS** — every incoming/outgoing request gets a span
- **Express** — route handlers, middleware timing
- **pg / mysql2 / mongodb** — database calls with query attributes
- **redis / ioredis** — cache operations
- **gRPC** — service-to-service calls
- **fetch / undici** — modern HTTP clients

You get distributed traces with zero manual code. Spans will carry:

- `http.method`, `http.route`, `http.status_code`
- `db.system`, `db.statement`
- `net.peer.name`, `net.peer.port`

---

## Manual Instrumentation

Auto-instrumentation handles I/O, but business logic needs manual spans:

```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service', '1.0.0');

async function processPayment(orderId: string, amount: number) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    span.setAttributes({
      'payment.order_id': orderId,
      'payment.amount': amount,
      'payment.currency': 'USD',
    });

    try {
      const result = await chargeCard(orderId, amount);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message,
      });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Adding Events to Spans

Events are timestamped annotations within a span — useful for marking checkpoints:

```typescript
span.addEvent('cache.miss', { 'cache.key': cacheKey });
span.addEvent('db.query.start');
const rows = await db.query(sql);
span.addEvent('db.query.end', { 'db.rows_returned': rows.length });
```

---

## Metrics

Define counters, histograms, and gauges:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('http-server', '1.0.0');

// Counter: total requests
const requestCounter = meter.createCounter('http.server.requests', {
  description: 'Total HTTP requests',
});

// Histogram: request duration distribution
const requestDuration = meter.createHistogram('http.server.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

// UpDownCounter: active connections
const activeConnections = meter.createUpDownCounter('http.server.active_connections');

// Usage in Express middleware
app.use((req, res, next) => {
  const start = Date.now();
  activeConnections.add(1);

  res.on('finish', () => {
    const duration = Date.now() - start;
    activeConnections.add(-1);

    const labels = {
      'http.method': req.method,
      'http.route': req.route?.path ?? 'unknown',
      'http.status_code': String(res.statusCode),
    };

    requestCounter.add(1, labels);
    requestDuration.record(duration, labels);
  });

  next();
});
```

### Observable (Async) Gauges

For values you want to observe on a schedule (e.g., memory usage):

```typescript
meter.createObservableGauge('process.memory.rss', {
  description: 'Resident set size in bytes',
  unit: 'By',
}).addCallback((result) => {
  result.observe(process.memoryUsage().rss);
});
```

---

## Structured Logs with OTel

OTel logs bridge structured logging with trace context, so logs are correlated with the spans that produced them.

```bash
npm install @opentelemetry/sdk-logs @opentelemetry/winston-transport winston
```

```typescript
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { createLogger, transports } from 'winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(
    new OTLPLogExporter({ url: 'http://localhost:4318/v1/logs' })
  )
);

const logger = createLogger({
  transports: [
    new transports.Console(),
    new OpenTelemetryTransportV3(), // auto-injects trace_id, span_id
  ],
});

// Logs now carry trace context automatically
logger.info('User authenticated', { userId: '123', method: 'oauth2' });
```

---

## Exporters

### Jaeger (via OTLP)

Modern Jaeger accepts OTLP natively (Jaeger 1.35+):

```yaml
# docker-compose.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

Point your exporter at `http://localhost:4318/v1/traces` and traces appear in Jaeger UI at `http://localhost:16686`.

### OpenTelemetry Collector (Production)

For production, route through the OTel Collector — it batches, retries, and fans out to multiple backends:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1000
  memory_limiter:
    limit_mib: 512

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: warn

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

---

## Framework Integration

### Express

With `getNodeAutoInstrumentations()`, Express routes are instrumented automatically. For custom span names on routes:

```typescript
import express from 'express';
import { trace } from '@opentelemetry/api';

const app = express();
const tracer = trace.getTracer('express-app');

app.get('/users/:id', async (req, res) => {
  const span = trace.getActiveSpan();
  span?.updateName(`GET /users/:id`); // Override auto-generated name
  span?.setAttribute('user.id', req.params.id);

  const user = await userService.findById(req.params.id);
  res.json(user);
});
```

### Fastify

```bash
npm install @opentelemetry/instrumentation-fastify
```

```typescript
import Fastify from 'fastify';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';

// In instrumentation.ts, replace auto-instrumentations with specific ones:
const sdk = new NodeSDK({
  instrumentations: [
    new FastifyInstrumentation(),
    new HttpInstrumentation(),
    new PgInstrumentation(),
  ],
});
```

Fastify hooks (onRequest, preHandler, onSend) each get their own spans automatically.

### NestJS

NestJS has first-class OTel support via the `nestjs-otel` package:

```bash
npm install nestjs-otel @opentelemetry/sdk-node
```

```typescript
// app.module.ts
import { OpenTelemetryModule } from 'nestjs-otel';

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      metrics: {
        hostMetrics: true,     // CPU, memory, GC
        apiMetrics: {
          enable: true,
          prefix: 'nestjs_',
        },
      },
    }),
  ],
})
export class AppModule {}
```

Use the `@Span()` decorator to wrap methods:

```typescript
import { Span } from 'nestjs-otel';

@Injectable()
export class OrderService {
  @Span('order.create')
  async createOrder(dto: CreateOrderDto) {
    // Automatically creates a span named 'order.create'
    return this.orderRepository.save(dto);
  }
}
```

---

## Context Propagation

For distributed systems, trace context must travel across service boundaries via HTTP headers (W3C TraceContext format):

```typescript
// Outgoing request: auto-propagated by HttpInstrumentation
// Manual propagation if needed:
import { propagation, context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

propagation.setGlobalPropagator(new W3CTraceContextPropagator());

// Inject into outgoing request headers:
const headers: Record<string, string> = {};
propagation.inject(context.active(), headers);
// headers now contain: { traceparent: '00-traceId-spanId-flags' }

// Extract from incoming request:
const parentContext = propagation.extract(context.active(), incomingHeaders);
context.with(parentContext, () => {
  tracer.startActiveSpan('downstream.call', (span) => {
    // This span is now a child of the upstream trace
    span.end();
  });
});
```

---

## Environment Variables (Production Config)

Use env vars to configure OTel without code changes:

```bash
# .env
OTEL_SERVICE_NAME=payment-service
OTEL_SERVICE_VERSION=2.1.0
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.prod.internal:4318
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer your-token
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1   # 10% sampling in production
OTEL_LOG_LEVEL=warn
```

### Sampling Strategies

| Sampler | When to Use |
|---------|------------|
| `always_on` | Development, low traffic |
| `always_off` | Disable tracing entirely |
| `traceidratio` | Sample X% of all traces |
| `parentbased_traceidratio` | Respect upstream sampling decision, else sample X% |

For production with high traffic, `parentbased_traceidratio` at 1-10% is typical.

---

## Common Pitfalls

**1. Instrumentation loads too late**
Always `require`/`import` instrumentation before your app code. Use `--require` flag with Node.js for guaranteed load order.

**2. Missing `span.end()` calls**
Unclosed spans leak resources. Use `startActiveSpan` with a callback — it auto-calls `span.end()` when the callback returns.

**3. Logging sensitive data in span attributes**
Span attributes are exported to your observability backend. Never include passwords, tokens, or PII.

**4. Over-instrumentation**
Every span has overhead. Avoid creating spans in tight loops or for trivial operations. Let auto-instrumentation handle I/O; manually instrument business logic boundaries.

**5. Not configuring batch processors**
The default `SimpleSpanProcessor` sends every span immediately — fine for dev, catastrophic for production. Always use `BatchSpanProcessor` in production (it's the default in `NodeSDK`).

---

## Quick Reference

```bash
# Run Jaeger locally
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  -e COLLECTOR_OTLP_ENABLED=true \
  jaegertracing/all-in-one:1.54

# Run with OTel env vars
SERVICE_NAME=my-api \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
node -r ./dist/instrumentation.js dist/index.js
```

---

## Takeaways

- Bootstrap `NodeSDK` before any app code — load order matters.
- `getNodeAutoInstrumentations()` covers most I/O automatically; add manual spans for business logic.
- Use `BatchSpanProcessor` in production and configure sampling.
- The OTel Collector is your friend in multi-backend setups — instrument once, export everywhere.
- Correlate logs with traces using the Winston transport for full observability.

With OpenTelemetry in place, you go from debugging blind to having request-level visibility across every service in your stack.

---

*Looking for more Node.js tooling guides? Check out [DevPlaybook's complete developer tools collection](https://devplaybook.cc).*
