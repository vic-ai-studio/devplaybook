---
title: "OpenTelemetry 2026: Complete Observability Guide - Traces, Metrics & Logs"
description: "Master OpenTelemetry in 2026: set up distributed tracing, metrics, and logs with Node.js and Python. Auto-instrumentation, custom spans, Jaeger, Grafana, and how it compares to Datadog and New Relic."
date: "2026-03-28"
tags: [opentelemetry, observability, tracing, metrics, monitoring]
readingTime: "7 min read"
---

# OpenTelemetry 2026: Complete Observability Guide — Traces, Metrics & Logs

Modern distributed systems are hard to debug. A single request might touch a dozen microservices, three queues, and two databases — and when something goes wrong at 3 AM, you need answers fast. OpenTelemetry is the open-source framework that makes that possible, and in 2026 it has become the undisputed standard for observability instrumentation.

This guide walks through everything you need to know: architecture, SDK setup for Node.js and Python, auto-instrumentation, custom spans, exporting to Jaeger and Grafana, and an honest comparison with proprietary tools like Datadog and New Relic.

---

## What Is OpenTelemetry?

OpenTelemetry (OTel) is a CNCF project that provides vendor-neutral APIs, SDKs, and a collector for generating, collecting, and exporting telemetry data:

- **Traces** — track a request as it flows through your system
- **Metrics** — counters, gauges, and histograms for quantitative measurements
- **Logs** — structured event records correlated with traces

The key idea: instrument once, export anywhere. Your code uses the OTel API, and you configure the backend (Jaeger, Grafana Tempo, Datadog, Honeycomb, etc.) at deploy time.

### Why OTel in 2026?

- **Stable across all three signals** — Logs spec hit GA in late 2024; all three pillars are now production-ready
- **Massive ecosystem** — auto-instrumentation libraries for 100+ frameworks
- **Vendor lock-in escape hatch** — switch backends without changing application code
- **Native Kubernetes integration** — OTel Operator handles injection automatically

---

## Core Concepts

Before writing code, understand these building blocks:

| Concept | Description |
|---|---|
| **Tracer** | Creates and manages spans |
| **Span** | A single unit of work with a start/end time and attributes |
| **Trace** | A tree of spans representing a complete request |
| **Context Propagation** | Passing trace context across service boundaries (W3C TraceContext) |
| **Exporter** | Sends telemetry to a backend (OTLP, Jaeger, Prometheus) |
| **Collector** | A proxy/pipeline process that receives, processes, and exports data |
| **Resource** | Attributes describing the source: service name, host, k8s pod |

---

## Node.js Setup: Auto-Instrumentation

The fastest way to instrument a Node.js app is auto-instrumentation — no code changes required.

### Install

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

### Create `tracing.js`

```js
// tracing.js — load this BEFORE your app
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

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

### Start your app with tracing

```bash
node -r ./tracing.js server.js
```

That's it. Every HTTP request, database query, and Redis call is now automatically traced. Auto-instrumentation covers Express, Fastify, HTTP, gRPC, MongoDB, PostgreSQL, Redis, and dozens more.

---

## Node.js: Custom Spans

Auto-instrumentation covers I/O, but your business logic needs manual spans.

```js
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('user-service', '1.0.0');

async function processOrder(orderId, userId) {
  // Start a custom span
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      span.setAttributes({
        'order.id': orderId,
        'user.id': userId,
        'order.source': 'web',
      });

      const inventory = await tracer.startActiveSpan('checkInventory', async (childSpan) => {
        childSpan.setAttribute('inventory.check.orderId', orderId);
        const result = await checkInventory(orderId);
        childSpan.end();
        return result;
      });

      if (!inventory.available) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Out of stock' });
        span.recordException(new Error('Inventory unavailable'));
        throw new Error('Out of stock');
      }

      // Add a span event (a timestamped log within the trace)
      span.addEvent('inventory.confirmed', { 'item.count': inventory.count });

      const payment = await chargePayment(userId, inventory.price);
      span.setAttribute('payment.transactionId', payment.transactionId);

      span.setStatus({ code: SpanStatusCode.OK });
      return { orderId, paymentId: payment.transactionId };
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end(); // Always end the span
    }
  });
}
```

Key practices:
- Use `startActiveSpan` to automatically propagate context to child spans
- Always call `span.end()` in a `finally` block
- Use semantic conventions for attribute names when possible

---

## Python Setup

```bash
pip install \
  opentelemetry-distro \
  opentelemetry-exporter-otlp-proto-http \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-requests \
  opentelemetry-instrumentation-sqlalchemy
```

### Configure SDK

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

def setup_otel(service_name: str, service_version: str = "1.0.0"):
    resource = Resource.create({
        "service.name": service_name,
        "service.version": service_version,
        "deployment.environment": "production",
    })

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint="http://localhost:4318/v1/traces")
        )
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint="http://localhost:4318/v1/metrics"),
        export_interval_millis=10_000,
    )
    metrics.set_meter_provider(
        MeterProvider(resource=resource, metric_readers=[metric_reader])
    )
```

### FastAPI auto-instrumentation

```python
# main.py
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from otel_setup import setup_otel

setup_otel("payment-service")

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
RequestsInstrumentor().instrument()

@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    return {"order_id": order_id}
```

### Custom spans in Python

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer("payment-service")

def process_payment(user_id: str, amount: float) -> dict:
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attributes({
            "user.id": user_id,
            "payment.amount": amount,
            "payment.currency": "USD",
        })
        try:
            result = charge_card(user_id, amount)
            span.add_event("payment.charged", {"transaction_id": result["id"]})
            span.set_status(Status(StatusCode.OK))
            return result
        except PaymentError as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
```

---

## Custom Metrics

Metrics are for aggregate data: request counts, latency distributions, error rates.

```js
// Node.js metrics example
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('order-service', '1.0.0');

// Counter: only goes up
const orderCounter = meter.createCounter('orders.created', {
  description: 'Total orders created',
  unit: '1',
});

// Histogram: measure latency distributions
const processingTime = meter.createHistogram('order.processing.duration', {
  description: 'Time to process an order',
  unit: 'ms',
});

// UpDownCounter: can increase or decrease
const activeOrders = meter.createUpDownCounter('orders.active', {
  description: 'Currently active orders',
});

async function createOrder(data) {
  const startTime = Date.now();
  activeOrders.add(1, { region: data.region });

  try {
    const order = await saveOrder(data);
    orderCounter.add(1, { status: 'success', region: data.region });
    return order;
  } catch (err) {
    orderCounter.add(1, { status: 'error', error_type: err.constructor.name });
    throw err;
  } finally {
    processingTime.record(Date.now() - startTime, { region: data.region });
    activeOrders.add(-1, { region: data.region });
  }
}
```

---

## Exporting to Jaeger

Jaeger is the go-to open-source backend for distributed tracing.

### Docker Compose setup

```yaml
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:1.56
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.95.0
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - jaeger
```

### OTel Collector config

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
    timeout: 5s
    send_batch_size: 1000

  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

Access Jaeger UI at `http://localhost:16686`. Search by service name, trace ID, or operation.

---

## Exporting to Grafana (Tempo + Prometheus)

For production, Grafana's stack with Tempo (traces) + Prometheus (metrics) + Loki (logs) is popular.

```yaml
# Add to otel-collector-config.yaml exporters
exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: myapp
```

In Grafana, use **TraceQL** to query Tempo:

```
{ .http.route = "/api/orders" && duration > 500ms }
```

And link traces to metrics with exemplars — a span attribute that lets you jump from a Prometheus metric spike directly to the trace that caused it.

---

## Context Propagation Across Services

When service A calls service B, trace context must travel with the request. OTel uses **W3C TraceContext** by default.

```js
// With auto-instrumentation: HTTP headers are injected automatically.
// Manual propagation example:
const { context, propagation } = require('@opentelemetry/api');

// Inject (outgoing call)
const headers = {};
propagation.inject(context.active(), headers);
await fetch('http://payment-service/charge', { headers });

// Extract (incoming — usually done by HTTP instrumentation automatically)
const ctx = propagation.extract(context.active(), incomingHeaders);
tracer.startActiveSpan('handleRequest', {}, ctx, (span) => {
  // This span is now a child of the upstream span
  span.end();
});
```

---

## OpenTelemetry vs Datadog vs New Relic

| Feature | OpenTelemetry | Datadog APM | New Relic |
|---|---|---|---|
| **Cost** | Free (OSS) | $$$  (per host/GB) | $$ (per GB ingested) |
| **Vendor lock-in** | None | High | High |
| **Setup complexity** | Medium | Low | Low |
| **UI/Dashboards** | Bring your own (Jaeger, Grafana) | Excellent built-in | Excellent built-in |
| **Auto-instrumentation** | 100+ libraries | 100+ libraries | 100+ libraries |
| **Sampling** | Head + tail sampling via Collector | Adaptive sampling | Adaptive sampling |
| **Alerting** | Via Grafana/Prometheus | Built-in | Built-in |
| **Correlation (T+M+L)** | Manual config | Automatic | Automatic |

**When to use OTel:**
- Cost is a major concern (Datadog can be expensive at scale)
- You want backend flexibility
- Multi-cloud or multi-vendor environment
- You're building a platform that others will instrument

**When to choose Datadog/New Relic:**
- Small team, want minimal operational overhead
- Need excellent out-of-the-box dashboards and alerting
- Infrastructure monitoring beyond APM is important

**The hybrid approach (recommended for most teams):** Instrument with OTel, export to Datadog or New Relic via OTLP. You get the best of both worlds — vendor UX without lock-in.

```js
// Export to Datadog via OTLP
const traceExporter = new OTLPTraceExporter({
  url: 'https://trace.agent.datadoghq.com/api/v0.2/traces',
  headers: {
    'DD-API-KEY': process.env.DD_API_KEY,
  },
});
```

---

## Production Best Practices

**1. Use the OTel Collector in all environments**
Never export directly from application to backend in production. The Collector handles retries, batching, tail-based sampling, and routing.

**2. Apply tail-based sampling**
Head sampling (random % of traces) misses interesting errors. Tail sampling waits until a trace is complete, then samples based on outcome:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces
        type: latency
        latency: { threshold_ms: 1000 }
      - name: default-5pct
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

**3. Set resource attributes from environment**

```bash
OTEL_SERVICE_NAME=my-api \
OTEL_SERVICE_VERSION=2.1.0 \
OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,k8s.cluster.name=prod-us-east" \
node server.js
```

**4. Use semantic conventions**
Stick to [OTel Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/) for attribute names. This ensures compatibility with dashboards and alerting rules across tools.

**5. Correlate logs with traces**
Add `trace_id` and `span_id` to every log line:

```js
const { trace } = require('@opentelemetry/api');

function getTraceContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const { traceId, spanId } = span.spanContext();
  return { traceId, spanId };
}

logger.info('Order created', { orderId, ...getTraceContext() });
```

---

## Kubernetes: OTel Operator

For K8s, the OTel Operator auto-instruments pods without changing your Dockerfiles.

```yaml
# instrumentation.yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
spec:
  exporter:
    endpoint: http://otel-collector:4317
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
```

Then add an annotation to any pod:

```yaml
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-nodejs: "true"
```

No code changes, no Dockerfile changes. The Operator injects the OTel SDK as an init container.

---

## Summary

OpenTelemetry in 2026 is production-ready across all three signals. Start with auto-instrumentation for immediate coverage, add custom spans for business logic, and route through the OTel Collector for flexibility. Use Jaeger for local development and Grafana Tempo + Prometheus for production — or export to Datadog via OTLP to keep vendor flexibility while using their dashboards.

The real value of OTel isn't in any single feature — it's in the guarantee that you can observe your system consistently across every language, framework, and backend you'll ever use.

---

*Related tools on DevPlaybook: [JSON Formatter](/tools/json-formatter) · [JWT Decoder](/tools/jwt-decoder) · [Regex Tester](/tools/regex-tester)*
