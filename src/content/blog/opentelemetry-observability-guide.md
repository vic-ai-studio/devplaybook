---
title: "OpenTelemetry: The Complete Observability Guide for Developers"
description: "Master OpenTelemetry observability in 2026. Learn traces, metrics, logs, OTEL SDK setup for Node.js and Python, exporters, sampling strategies, and production best practices."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["opentelemetry", "observability", "tracing", "metrics", "logging", "nodejs", "python", "devops"]
readingTime: "14 min read"
---

Modern applications are distributed by default. A single user request may touch a load balancer, API gateway, three microservices, two databases, and a message queue before a response is returned. When something goes wrong — and it will — you need to know exactly where, why, and how to fix it. That's what OpenTelemetry observability is built for.

OpenTelemetry (OTEL) is the CNCF standard for instrumenting applications to produce telemetry data: traces, metrics, and logs. It replaces vendor-specific SDKs with a single, portable API that works across languages and backends. This guide covers everything you need to go from zero to production-grade observability.

---

## What Is OpenTelemetry?

OpenTelemetry is an open-source observability framework that provides:

- **APIs** — language-specific interfaces for instrumentation
- **SDKs** — implementations of those APIs with processing pipelines
- **Collector** — a vendor-agnostic proxy that receives, processes, and exports telemetry
- **Instrumentation libraries** — auto-instrumentation for popular frameworks

The project merged OpenTracing and OpenCensus into a single standard, now maintained by the CNCF alongside Kubernetes and Prometheus.

### The Three Pillars of Observability

**Traces** track a request as it flows across services. Each trace is a tree of spans — individual units of work with start time, duration, attributes, and status.

**Metrics** are aggregated measurements over time: request rates, error percentages, latency percentiles, resource utilization.

**Logs** are timestamped records of discrete events. When correlated with trace IDs, they become dramatically more useful for debugging.

OpenTelemetry's goal is to make all three pillars work together — a log entry that contains a trace ID lets you jump directly from a log line to the full distributed trace that produced it.

---

## Core Concepts

### Traces and Spans

A **trace** represents the complete journey of a request. It has a unique `traceId` that persists across service boundaries.

A **span** is one operation within that trace. Spans have:
- `spanId` — unique identifier
- `parentSpanId` — links to parent span (or root if absent)
- `name` — describes the operation
- `kind` — SERVER, CLIENT, PRODUCER, CONSUMER, or INTERNAL
- `attributes` — key-value metadata
- `events` — timestamped annotations
- `status` — OK, ERROR, or UNSET

```
Trace: abc-123
├── [SERVER] POST /api/checkout (root span)
│   ├── [INTERNAL] validateCart
│   ├── [CLIENT] GET inventory-service/items
│   │   └── [SERVER] inventory-service: getItems (different service)
│   └── [CLIENT] POST payment-service/charge
│       └── [SERVER] payment-service: processPayment
```

### Context Propagation

For spans to form a trace across service boundaries, context must be propagated — typically via HTTP headers. OpenTelemetry uses the W3C TraceContext standard (`traceparent` and `tracestate` headers) by default.

When service A calls service B, it injects the current span context into the outgoing request headers. Service B extracts that context and creates a child span, maintaining the trace continuity.

### Resources

A **resource** describes the entity producing telemetry — your service. Common resource attributes:

```
service.name: checkout-service
service.version: 1.4.2
deployment.environment: production
host.name: prod-checkout-02
```

Resources are configured once at SDK initialization and attached to all telemetry produced by that process.

---

## Node.js SDK Setup

### Installation

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### SDK Initialization

Create a `tracing.js` file and load it before your application code:

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME || 'my-service',
  [SEMRESATTRS_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  'deployment.environment': process.env.NODE_ENV || 'development',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000, // export every 30s
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

module.exports = sdk;
```

Load it first in your application:

```javascript
// server.js
require('./tracing'); // MUST be first

const express = require('express');
const app = express();
// ... rest of your app
```

Or via Node's `--require` flag:

```bash
node --require ./tracing.js server.js
```

### Manual Instrumentation

Auto-instrumentation covers HTTP, database, and framework calls. For custom business logic, use the tracer API directly:

```javascript
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('checkout-service', '1.0.0');

async function processOrder(orderId, userId) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    span.setAttributes({
      'order.id': orderId,
      'user.id': userId,
    });

    try {
      const cart = await fetchCart(userId);

      // Create child span for sub-operation
      const validationResult = await tracer.startActiveSpan('validateInventory', async (childSpan) => {
        childSpan.setAttribute('cart.item_count', cart.items.length);
        const result = await checkInventory(cart.items);
        childSpan.end();
        return result;
      });

      if (!validationResult.allAvailable) {
        span.addEvent('inventory_check_failed', {
          'unavailable_items': validationResult.unavailable.join(','),
        });
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Items out of stock' });
        throw new Error('Items out of stock');
      }

      const order = await createOrder(cart, userId);
      span.setAttribute('order.created_id', order.id);
      span.setStatus({ code: SpanStatusCode.OK });
      return order;
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

### Custom Metrics

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('checkout-service', '1.0.0');

// Counter — monotonically increasing
const orderCounter = meter.createCounter('orders.created', {
  description: 'Number of orders created',
  unit: '1',
});

// Histogram — distribution of values
const orderValueHistogram = meter.createHistogram('order.value', {
  description: 'Distribution of order values in USD',
  unit: 'USD',
});

// UpDownCounter — can go up or down
const activeCheckouts = meter.createUpDownCounter('checkouts.active', {
  description: 'Number of checkouts currently in progress',
});

// Observable gauge — measured on-demand
const cartGauge = meter.createObservableGauge('carts.pending', {
  description: 'Number of pending carts',
});
cartGauge.addCallback(async (observableResult) => {
  const count = await getPendingCartCount();
  observableResult.observe(count, { region: process.env.REGION });
});

// Usage
async function createOrder(cart, userId) {
  activeCheckouts.add(1, { user_tier: getUserTier(userId) });

  const order = await db.orders.create({ cart, userId });

  orderCounter.add(1, { status: 'success', payment_method: cart.paymentMethod });
  orderValueHistogram.record(cart.totalCents / 100, { currency: 'USD' });
  activeCheckouts.add(-1, { user_tier: getUserTier(userId) });

  return order;
}
```

---

## Python SDK Setup

### Installation

```bash
pip install opentelemetry-sdk \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-requests \
  opentelemetry-instrumentation-sqlalchemy
```

### SDK Configuration

```python
# otel_setup.py
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION

def setup_telemetry(service_name: str, service_version: str = "1.0.0"):
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    # Traces
    trace_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
                           "http://localhost:4318/v1/traces"),
    )
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_exporter = OTLPMetricExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
                           "http://localhost:4318/v1/metrics"),
    )
    meter_provider = MeterProvider(
        resource=resource,
        metric_readers=[PeriodicExportingMetricReader(metric_exporter, export_interval_millis=30000)],
    )
    metrics.set_meter_provider(meter_provider)

    return trace.get_tracer(service_name), metrics.get_meter(service_name)
```

### FastAPI Integration

```python
# main.py
from fastapi import FastAPI
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from otel_setup import setup_telemetry
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer, meter = setup_telemetry("inventory-service", "2.1.0")
FastAPIInstrumentor.instrument()
RequestsInstrumentor.instrument()

app = FastAPI()

# Custom metrics
request_counter = meter.create_counter("http.requests", description="Total HTTP requests")
latency_histogram = meter.create_histogram("http.request.duration", unit="ms")

@app.get("/items/{item_id}")
async def get_item(item_id: str):
    with tracer.start_as_current_span("get_item") as span:
        span.set_attribute("item.id", item_id)

        try:
            item = await fetch_from_db(item_id)

            if item is None:
                span.set_attribute("item.found", False)
                span.set_status(Status(StatusCode.ERROR, "Item not found"))
                return {"error": "not found"}, 404

            span.set_attribute("item.found", True)
            span.set_attribute("item.stock", item.stock)
            return item

        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            raise
```

---

## Exporters

OpenTelemetry supports multiple export formats and destinations.

### OTLP (OpenTelemetry Protocol)

The native format. Use this for the OpenTelemetry Collector or backends that support OTLP natively (Grafana Tempo, Honeycomb, Lightstep, Datadog with OTLP receiver).

```javascript
// HTTP exporter (port 4318)
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// gRPC exporter (port 4317) — lower overhead, better for high-volume
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
```

### Jaeger

```javascript
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const exporter = new JaegerExporter({
  endpoint: 'http://jaeger:14268/api/traces',
});
```

### Console (for development)

```javascript
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');

// Use SimpleSpanProcessor for dev — exports immediately, blocks the thread
// Use BatchSpanProcessor for production — buffers and exports async
```

---

## The OpenTelemetry Collector

The Collector is the recommended deployment pattern for production. It decouples your application from the observability backend, allowing you to:

- Change backends without redeploying applications
- Filter and transform data before export
- Add consistent resource attributes
- Buffer data during backend outages

### Minimal Collector Config

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
    timeout: 1s
    send_batch_size: 1024

  # Add consistent attributes to all telemetry
  resource:
    attributes:
      - key: deployment.datacenter
        value: us-east-1
        action: insert

  # Filter out health check spans
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health"'

exporters:
  # Send traces to Jaeger
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  # Send metrics to Prometheus
  prometheus:
    endpoint: 0.0.0.0:8889

  # Debug output
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource, filter]
      exporters: [jaeger]

    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheus]
```

---

## Sampling Strategies

Sampling is how you control what fraction of traces to actually record and export. At high traffic volumes, recording 100% of traces is impractical.

### Head-based Sampling

The sampling decision is made at the start of the trace (the root span). All services in the trace either record or drop together.

```javascript
const { TraceIdRatioBased, ParentBased } = require('@opentelemetry/sdk-trace-base');

// Sample 10% of all traces
const sampler = new TraceIdRatioBased(0.1);

// ParentBased: respect the upstream sampling decision
// If no parent, sample at 10%
const productionSampler = new ParentBased(new TraceIdRatioBased(0.1));
```

### Tail-based Sampling (via Collector)

The sampling decision is made after the trace is complete. Lets you always sample errors and slow requests, sampling normal traffic at a lower rate.

```yaml
# In the Collector config, use the tailsampling processor
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      # Always sample errors
      - name: error-policy
        type: status_code
        status_code: { status_codes: [ERROR] }

      # Always sample slow requests (>1s)
      - name: latency-policy
        type: latency
        latency: { threshold_ms: 1000 }

      # Sample 5% of everything else
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }
```

---

## Production Best Practices

**Use BatchSpanProcessor.** `SimpleSpanProcessor` exports synchronously and will slow your application. `BatchSpanProcessor` buffers spans and exports in background batches.

**Configure resource attributes via environment variables.** The OTEL SDK reads `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION`, and `OTEL_RESOURCE_ATTRIBUTES` automatically. This lets you set them at deploy time without code changes.

```bash
OTEL_SERVICE_NAME=checkout-service
OTEL_SERVICE_VERSION=1.4.2
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production,host.region=us-east-1
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

**Add trace IDs to logs.** This is the connective tissue between your log aggregator and your tracing backend:

```javascript
const { trace } = require('@opentelemetry/api');

function getTraceContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const { traceId, spanId } = span.spanContext();
  return { traceId, spanId };
}

// In your logger:
logger.info('Order processed', { orderId, ...getTraceContext() });
```

**Set span status explicitly.** Don't rely on auto-instrumentation to mark errors. If your business logic encounters an error condition (out of stock, invalid input), set `SpanStatusCode.ERROR` and record the exception.

**Use semantic conventions.** OTEL defines [standard attribute names](https://opentelemetry.io/docs/specs/semconv/) for HTTP, databases, messaging, and more. Using these makes your data queryable across services without needing to know each team's custom naming.

```javascript
// Instead of custom names:
span.setAttribute('sql_query', query);     // ❌
span.setAttribute('db.statement', query);  // ✓ semantic convention
```

**Instrument outbound calls.** Auto-instrumentation covers popular libraries, but if you have custom HTTP clients or gRPC clients, make sure they propagate context. A break in propagation creates orphaned traces.

---

## Choosing a Backend

| Backend | Type | Best For |
|---------|------|----------|
| Grafana Tempo | OSS | Teams already on Grafana/Prometheus |
| Jaeger | OSS | Full self-hosted, CNCF project |
| Zipkin | OSS | Simple setup, smaller scale |
| Honeycomb | SaaS | High-cardinality analysis |
| Lightstep | SaaS | Enterprise, AI-driven insights |
| Datadog | SaaS | Unified metrics/logs/traces |
| AWS X-Ray | Cloud | AWS-native deployments |

For most teams: start with Grafana + Tempo + Prometheus. It's fully OSS, integrates with Loki for logs, and the LGTM stack (Loki/Grafana/Tempo/Mimir) gives you unified observability with zero vendor lock-in.

---

## Quick Start with Docker Compose

```yaml
# docker-compose.yaml
version: '3'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # gRPC
      - "4318:4318"   # HTTP

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "14250:14250"  # gRPC receiver

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
```

---

## Key Takeaways

- OpenTelemetry is the industry standard for observability instrumentation — use it instead of vendor SDKs.
- Auto-instrumentation covers most of your HTTP/database/framework calls with zero code changes.
- Manual instrumentation with the tracer API is essential for business logic visibility.
- Deploy the OpenTelemetry Collector between your apps and backends to decouple and gain operational flexibility.
- Tail-based sampling in the Collector lets you always capture errors and slow requests while sampling normal traffic.
- Connect logs to traces via trace IDs — this is the highest-value correlation you can make.
- Use semantic conventions for attribute names to keep your telemetry queryable and portable.
