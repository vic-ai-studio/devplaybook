---
title: "OpenTelemetry Observability: Traces, Metrics & Logs Guide 2026"
description: "Master OpenTelemetry for full-stack observability. Set up traces, metrics, and logs with Node.js and Python, export to Jaeger and OTLP."
readingTime: "8 min read"
date: "2026-03-28"
tags: ["opentelemetry", "observability", "monitoring", "devops", "nodejs"]
author: "DevPlaybook Team"
---

OpenTelemetry (OTel) has become the de facto standard for cloud-native observability. In 2026, it powers telemetry pipelines at companies of every scale — from solo-developer side projects to Fortune 500 microservice fleets. This guide walks you through everything you need to get full-stack observability running: SDK setup, the three pillars (traces, metrics, logs), auto-instrumentation, exporters, and sampling strategies with real Node.js and Python code.

## What Is OpenTelemetry?

OpenTelemetry is a vendor-neutral, open-source observability framework maintained by the CNCF. It provides a single set of APIs, SDKs, and tooling to collect **traces**, **metrics**, and **logs** from your application and ship them to any compatible backend.

Before OTel, teams were locked into Datadog agents, Jaeger clients, or Prometheus libraries — all with incompatible APIs. OTel solves this by separating *instrumentation* (how you collect data) from *export* (where you send it). You instrument once and route to any backend via the OpenTelemetry Collector.

### Why OTel Matters in 2026

- **Stable across all three signals** — Traces and metrics have been stable since 2021; the Logs Bridge API reached GA in late 2023 and is now mature.
- **Auto-instrumentation is production-ready** — Zero-code instrumentation covers most popular frameworks out of the box.
- **Collector is ubiquitous** — The OTel Collector runs as a sidecar, DaemonSet, or standalone gateway and handles batching, retry, and fan-out.
- **Broad backend support** — Jaeger, Grafana Tempo, Honeycomb, Datadog, Dynatrace, New Relic, and AWS X-Ray all accept OTLP natively.

---

## The Three Pillars of Observability

### 1. Traces

A **trace** represents the end-to-end journey of a single request through your system. It is composed of **spans** — each span captures one unit of work (a function call, a database query, an HTTP request).

Spans carry:
- A unique `traceId` shared across the entire request chain
- A `spanId` unique to that operation
- Timestamps (`startTime`, `endTime`)
- **Attributes** (key-value metadata)
- **Events** (timestamped annotations)
- **Status** (OK, ERROR, UNSET)

Distributed tracing lets you answer: *"Why did this user's checkout take 4 seconds?"*

### 2. Metrics

**Metrics** are numeric measurements aggregated over time. OTel supports four instrument types:

| Instrument | Use Case |
|---|---|
| `Counter` | Monotonically increasing value (requests served, errors) |
| `UpDownCounter` | Values that go up and down (queue depth, active connections) |
| `Histogram` | Distributions (request latency percentiles) |
| `Gauge` | Point-in-time snapshot (CPU usage, memory) |

Metrics answer: *"Is my service degraded right now across all requests?"*

### 3. Logs

**Logs** are timestamped, structured text records. OTel's Logs Bridge API connects existing logging libraries (Winston, Pino, Python's `logging`) to the OTel pipeline without replacing them. Logs get correlated with traces via `traceId` and `spanId` injection.

Logs answer: *"What exactly happened inside this specific failing request?"*

---

## SDK Setup: Node.js

Install the required packages:

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/sdk-metrics \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

Create `tracing.js` — load this **before** your app code:

```js
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'checkout-service',
    [ATTR_SERVICE_VERSION]: '2.1.0',
    'deployment.environment': process.env.NODE_ENV || 'production',
  }),

  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4318/v1/metrics',
    }),
    exportIntervalMillis: 15000,
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Start your app with:

```bash
node -r ./tracing.js server.js
```

### Manual Spans and Custom Attributes

Auto-instrumentation covers HTTP and DB automatically. Add manual spans for business logic:

```js
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('checkout-service', '2.1.0');

async function processPayment(orderId, amount) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    span.setAttribute('order.id', orderId);
    span.setAttribute('payment.amount', amount);
    span.setAttribute('payment.currency', 'USD');

    try {
      const result = await chargeCard(orderId, amount);
      span.setAttribute('payment.transaction_id', result.txId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Custom Metrics in Node.js

```js
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('checkout-service', '2.1.0');

const requestCounter = meter.createCounter('http.server.requests', {
  description: 'Total HTTP requests received',
});

const latencyHistogram = meter.createHistogram('http.server.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

const activeOrdersGauge = meter.createObservableGauge('orders.active', {
  description: 'Number of orders currently being processed',
});

activeOrdersGauge.addCallback((result) => {
  result.observe(getActiveOrderCount(), { region: 'us-east-1' });
});

// Usage in middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const attrs = {
      'http.method': req.method,
      'http.route': req.route?.path || req.path,
      'http.status_code': res.statusCode,
    };
    requestCounter.add(1, attrs);
    latencyHistogram.record(Date.now() - start, attrs);
  });
  next();
});
```

---

## SDK Setup: Python

Install dependencies:

```bash
pip install opentelemetry-sdk \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-httpx \
  opentelemetry-instrumentation-sqlalchemy
```

```python
# otel_setup.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "inventory-service",
    "service.version": "1.4.0",
    "deployment.environment": "production",
})

# Traces
tracer_provider = TracerProvider(resource=resource)
tracer_provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
    )
)
trace.set_tracer_provider(tracer_provider)

# Metrics
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4318/v1/metrics"),
    export_interval_millis=15000,
)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
```

### Auto-Instrumenting FastAPI

```python
# main.py
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
import otel_setup  # noqa: F401 — side effects initialize providers

app = FastAPI()

FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument(engine=engine)
```

### Manual Tracing in Python

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind, StatusCode

tracer = trace.get_tracer("inventory-service", "1.4.0")

async def reserve_stock(item_id: str, quantity: int) -> bool:
    with tracer.start_as_current_span(
        "inventory.reserve",
        kind=SpanKind.INTERNAL,
    ) as span:
        span.set_attribute("inventory.item_id", item_id)
        span.set_attribute("inventory.quantity_requested", quantity)

        available = await db.get_stock(item_id)
        span.set_attribute("inventory.quantity_available", available)

        if available < quantity:
            span.set_status(StatusCode.ERROR, "Insufficient stock")
            span.add_event("stock_check_failed", {
                "requested": quantity,
                "available": available,
            })
            return False

        await db.decrement_stock(item_id, quantity)
        span.set_status(StatusCode.OK)
        return True
```

---

## Exporters: Jaeger and OTLP

### OTLP (Recommended)

OTLP (OpenTelemetry Protocol) is the native wire format. Send over HTTP/JSON or gRPC. The OTel Collector receives OTLP and fans out to multiple backends simultaneously.

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 512

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: "http://prometheus:9090/api/v1/write"
  logging:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger, logging]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
```

### Jaeger Direct Export (Node.js)

For simpler setups without a Collector:

```js
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const traceExporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});
```

---

## Sampling Strategies

Sampling controls what percentage of traces you record. At high traffic volumes, recording 100% of traces is cost-prohibitive.

### Head-Based Sampling

The decision is made at the start of a trace. Simple but inflexible — you may drop an important error trace.

```js
const { TraceIdRatioBasedSampler, ParentBasedSampler } = require('@opentelemetry/sdk-trace-base');

// Sample 10% of traces, always respect parent's decision
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});

const sdk = new NodeSDK({ sampler, /* ... */ });
```

### Tail-Based Sampling via Collector

Tail sampling makes decisions *after* the full trace is collected, letting you keep 100% of error traces and only 5% of successful ones:

```yaml
# collector-config.yaml (tail sampling processor)
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    policies:
      - name: keep-errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: keep-slow-traces
        type: latency
        latency: { threshold_ms: 1000 }
      - name: probabilistic-sample
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

### Always-On for Development

```python
from opentelemetry.sdk.trace.sampling import ALWAYS_ON

tracer_provider = TracerProvider(sampler=ALWAYS_ON, resource=resource)
```

---

## Correlating Logs with Traces

Inject `traceId` and `spanId` into your logs automatically so you can jump from a log line to the full trace in your UI.

**Node.js with Pino:**

```js
const pino = require('pino');
const { trace, context } = require('@opentelemetry/api');

const logger = pino({
  mixin() {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const { traceId, spanId, traceFlags } = span.spanContext();
    return { traceId, spanId, traceFlags };
  },
});
```

**Python with structlog:**

```python
import structlog
from opentelemetry import trace

def add_otel_context(logger, method, event_dict):
    span = trace.get_current_span()
    if span.is_recording():
        ctx = span.get_span_context()
        event_dict["trace_id"] = format(ctx.trace_id, "032x")
        event_dict["span_id"] = format(ctx.span_id, "016x")
    return event_dict

structlog.configure(
    processors=[add_otel_context, structlog.processors.JSONRenderer()],
)
```

---

## Production Checklist

Before shipping OTel to production, verify these points:

- **Batch processors enabled** — Never use `SimpleSpanProcessor` in production; always use `BatchSpanProcessor` to avoid blocking the request path.
- **Resource attributes set** — `service.name`, `service.version`, and `deployment.environment` are required for meaningful dashboards.
- **Sampling configured** — Default is `ParentBased(AlwaysOn)` which records everything. Set a ratio or use tail sampling.
- **Collector deployed** — Running an OTel Collector decouples your app from the backend, adds buffering, and lets you change backends without redeploying.
- **SDK shutdown hooked** — Call `sdk.shutdown()` on `SIGTERM` to flush buffered spans before the process exits.
- **Sensitive data scrubbed** — Use the Collector's `attributes` processor to redact PII (email addresses, tokens) from span attributes before export.

---

## Summary

OpenTelemetry in 2026 is mature, stable, and the right choice for any new observability instrumentation. The key takeaways:

- **Instrument once, export anywhere** — OTLP + the OTel Collector decouples your code from your backend.
- **Auto-instrumentation covers the 80%** — HTTP, databases, message queues, and popular frameworks are instrumented for free.
- **Manual spans fill the gaps** — Wrap business-critical logic with custom spans and attributes.
- **Tail sampling is worth the setup** — Keep all errors, sample the rest. The Collector makes this straightforward.
- **Correlate all three signals** — Inject `traceId` into logs and link metrics dashboards to traces for complete observability.

Start with auto-instrumentation and OTLP export to a local Jaeger instance. Once your traces look right, add the Collector, enable metrics, and gradually add manual instrumentation where you need deeper insight.
