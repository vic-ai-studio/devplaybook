---
title: "OpenTelemetry Observability Guide 2026: Traces, Metrics & Logs"
description: "A comprehensive guide to OpenTelemetry in 2026—covering OTel architecture, traces, metrics, logs, Node.js and Python instrumentation, Jaeger, Grafana/Prometheus integration, and production cost-control strategies for backend developers."
date: "2026-03-28"
readingTime: "10 min read"
tags: [opentelemetry, observability, monitoring, tracing, devops]
---

Distributed systems have a visibility problem. When a request crosses twelve microservices before returning an error, finding the culprit with `console.log` is not a strategy—it's a prayer. OpenTelemetry (OTel) exists to solve this. It gives you a vendor-neutral, standardized way to instrument your applications so you can collect traces, metrics, and logs without betting your entire observability stack on one proprietary vendor.

This guide covers everything you need to get OpenTelemetry working in production in 2026: what the standard is, how the three pillars work, how to instrument Node.js and Python applications, how to wire up Jaeger and Grafana, and how to keep costs under control at scale.

---

## What Is OpenTelemetry and the OTel Standard in 2026

OpenTelemetry is a CNCF (Cloud Native Computing Foundation) project that provides a unified specification, API, SDK, and tooling for generating and exporting telemetry data. It reached stable status for traces in 2021, added stable metrics in 2023, and by 2026 the logs specification has also graduated to stable across all major language SDKs.

The core promise of OTel is **vendor neutrality**. You instrument your application once using the OTel API. You export the data to a collector. The collector can forward it to Datadog, Grafana Cloud, Honeycomb, Jaeger, or any backend that speaks OTLP (OpenTelemetry Protocol). Switching vendors no longer means re-instrumenting your entire codebase.

The key components of the OTel architecture are:

- **API**: The interfaces your application code calls to create spans, record metrics, and emit logs. Lightweight, no-op by default if no SDK is configured.
- **SDK**: The implementation of the API. Handles batching, sampling, and export.
- **Collector**: A standalone binary (written in Go) that receives telemetry, processes it, and exports it to one or more backends. You can run it as a sidecar, a daemonset, or a gateway.
- **OTLP**: The wire protocol (gRPC or HTTP/protobuf) for moving telemetry data between components.

In 2026, the OpenTelemetry Collector has become the standard ingestion layer for most observability pipelines. Nearly every major APM vendor now accepts OTLP natively, which means you can point your application at the OTel Collector and route data anywhere without changing a line of application code.

---

## The Three Pillars: Traces, Metrics, Logs

Observability is built on three data types. Understanding what each one is good for determines how you instrument and query your system.

### Traces

A **trace** represents the end-to-end journey of a single request through your system. It is composed of **spans**—individual units of work, each with a start time, duration, attributes (key-value metadata), and status. Spans form a tree: a root span for the incoming HTTP request, child spans for database queries, downstream HTTP calls, cache lookups, and so on.

Traces answer the question: *Where did this specific request spend its time, and which service failed?*

### Metrics

**Metrics** are numeric measurements aggregated over time. OTel defines several instrument types:

- **Counter**: monotonically increasing value (total requests, total errors)
- **Histogram**: distribution of values (request duration, payload sizes)
- **Gauge**: current instantaneous value (active connections, queue depth)
- **UpDownCounter**: value that can go up or down (concurrent requests)

Metrics answer the question: *Is my system healthy right now, and how has it changed over time?*

### Logs

**Logs** are time-stamped, structured records of discrete events. OTel's log data model standardizes the structure so logs emitted from different services, languages, and frameworks can be queried uniformly. Critically, OTel can **correlate logs with traces** by injecting the active `trace_id` and `span_id` into log records, letting you jump from a trace view directly to the relevant log lines.

Logs answer the question: *What exactly happened inside this service at this moment?*

---

## OTel vs Proprietary Solutions

The dominant proprietary APM tools in 2026—Datadog, New Relic, Dynatrace—are excellent products with polished UIs, aggressive auto-instrumentation, and AI-powered anomaly detection. Here is where the trade-offs land:

| Dimension | OpenTelemetry | Datadog / New Relic |
|---|---|---|
| Vendor lock-in | None | High |
| Instrumentation cost | One-time | Re-instrument on switch |
| Data ownership | You control it | Vendor controls it |
| UI / dashboards | Bring your own (Grafana, Jaeger) | Included, polished |
| AI anomaly detection | Via backend (Grafana, etc.) | Built-in |
| Cost at scale | Depends on backend | Can be very high |
| Community | CNCF, massive | Proprietary |

The practical recommendation for 2026: use OpenTelemetry for instrumentation regardless of where you send the data. Even if you use Datadog today, instrumenting with OTel means you can switch backends in a configuration change, not a code rewrite. Most proprietary vendors now offer first-class OTLP ingestion, so there is no performance or feature penalty for using OTel on the sending side.

---

## Node.js Instrumentation Setup

Install the required packages:

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

Create `tracing.js` and load it before your application code:

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
  [SEMRESATTRS_SERVICE_NAME]: process.env.SERVICE_NAME || 'my-api',
  [SEMRESATTRS_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'production',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000, // export every 30 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy in production
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

For manual span creation within your application logic:

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('payment-service', '1.0.0');

async function processPayment(orderId, amount) {
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
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

---

## Python Instrumentation Setup

Install the packages:

```bash
pip install opentelemetry-sdk \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-httpx \
  opentelemetry-instrumentation-sqlalchemy \
  opentelemetry-instrumentation-redis
```

Configure the SDK in your application entrypoint:

```python
# otel_setup.py
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

OTLP_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")

resource = Resource.create({
    SERVICE_NAME: os.getenv("SERVICE_NAME", "my-python-api"),
    SERVICE_VERSION: os.getenv("SERVICE_VERSION", "1.0.0"),
    "deployment.environment": os.getenv("ENVIRONMENT", "production"),
})

# Trace provider with 10% sampling in production
sampler = TraceIdRatioBased(float(os.getenv("OTEL_TRACE_SAMPLE_RATE", "0.1")))
tracer_provider = TracerProvider(resource=resource, sampler=sampler)
tracer_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint=OTLP_ENDPOINT, insecure=True))
)
trace.set_tracer_provider(tracer_provider)

# Metrics provider
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint=OTLP_ENDPOINT, insecure=True),
    export_interval_millis=30000,
)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)
```

Instrument a FastAPI application:

```python
# main.py
from otel_setup import *  # initialize OTel before anything else
from fastapi import FastAPI, HTTPException
from opentelemetry import trace, metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument(engine=engine)  # pass your SQLAlchemy engine

tracer = trace.get_tracer("order-service", "1.0.0")
meter = metrics.get_meter("order-service", "1.0.0")

# Custom metrics
order_counter = meter.create_counter(
    "orders.created",
    description="Total number of orders created",
    unit="1",
)
order_duration = meter.create_histogram(
    "orders.processing_duration",
    description="Time to process an order",
    unit="ms",
)

@app.post("/orders")
async def create_order(order: OrderRequest):
    with tracer.start_as_current_span("order.create") as span:
        span.set_attribute("order.customer_id", order.customer_id)
        span.set_attribute("order.item_count", len(order.items))

        import time
        start = time.monotonic()
        try:
            result = await order_service.create(order)
            order_counter.add(1, {"status": "success", "region": order.region})
            return result
        except Exception as e:
            span.record_exception(e)
            order_counter.add(1, {"status": "error", "region": order.region})
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            elapsed = (time.monotonic() - start) * 1000
            order_duration.record(elapsed, {"region": order.region})
```

---

## Jaeger Integration for Distributed Tracing

Jaeger is the most widely used open-source distributed tracing backend in 2026. It accepts OTLP natively and provides a UI for searching and visualizing traces.

Run Jaeger with Docker Compose:

```yaml
# docker-compose.yml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.55
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"   # Jaeger UI
      - "4317:4317"     # OTLP gRPC
      - "4318:4318"     # OTLP HTTP

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.95.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4319:4318"   # expose collector HTTP endpoint to apps
    depends_on:
      - jaeger
```

OTel Collector configuration:

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
    timeout: 1s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

Access the Jaeger UI at `http://localhost:16686`. Search by service name, operation, tag values, or duration range. Clicking on a trace shows the full span tree, including timing, attributes, and any recorded exceptions.

---

## Grafana + Prometheus Metrics Integration

Prometheus scrapes the metrics endpoint exposed by the OTel Collector, and Grafana visualizes them.

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

Add Grafana to your Docker Compose stack:

```yaml
  prometheus:
    image: prom/prometheus:v2.49.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.3.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
```

In Grafana, add Prometheus as a data source (`http://prometheus:9090`) and start building dashboards. Useful PromQL queries for your OTel-instrumented services:

```promql
# Request rate per service
rate(http_server_duration_count{job="my-api"}[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_server_duration_bucket{job="my-api"}[5m]))

# Error rate
rate(http_server_duration_count{http_status_code=~"5.."}[5m])
  / rate(http_server_duration_count[5m])

# Custom business metric
rate(orders_created_total{status="success"}[5m])
```

For Grafana Tempo (a dedicated trace backend), you can also link traces directly from Grafana panels using exemplars—Prometheus metrics that contain embedded trace IDs, letting you click from a latency spike on a graph directly to the responsible trace.

---

## Auto-Instrumentation vs Manual Instrumentation

**Auto-instrumentation** uses agents or monkey-patching to add spans without changing your application code. For Node.js this is `@opentelemetry/auto-instrumentations-node`; for Python it is `opentelemetry-instrument` CLI or the `instrument()` calls shown above. Auto-instrumentation covers HTTP servers, database clients, message queues, and HTTP clients out of the box.

**When to use auto-instrumentation:**
- Getting started and need visibility immediately
- Covering infrastructure-level operations (HTTP, DB, cache)
- Teams where instrumenting every service manually is not feasible

**When to add manual instrumentation:**
- Business logic that auto-instrumentation cannot see (payment processing, fraud checks, order fulfillment steps)
- Adding business-relevant attributes (`order.customer_tier`, `payment.method`)
- Recording domain-specific metrics that matter for your SLOs
- Adding structured log correlation to existing log statements

The recommended approach in 2026 is both: start with auto-instrumentation for baseline coverage, then layer manual spans and metrics on top for the operations that matter to your business.

---

## Production Tips: Sampling, Cardinality, Cost Control

Sending 100% of traces to a backend in a high-traffic service will bankrupt you. These are the strategies that matter.

### Sampling

**Head-based sampling** makes the keep/drop decision at the start of a trace. It is simple and low-overhead, but you might drop traces for errors that you would want to keep.

```python
# Keep 10% of all traces
sampler = TraceIdRatioBased(0.1)
```

**Tail-based sampling** makes the keep/drop decision after the trace is complete. The OTel Collector supports this via the `tailsampling` processor:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-policy
        type: status_code
        status_code: {status_codes: [ERROR]}
      - name: slow-traces-policy
        type: latency
        latency: {threshold_ms: 1000}
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: {sampling_percentage: 5}
```

This configuration keeps 100% of error traces, 100% of traces over 1 second, and 5% of everything else. You get full visibility into problems without paying for healthy fast traffic.

### Cardinality Control

High-cardinality attributes on metrics destroy Prometheus performance and explode costs on hosted backends. Never use user IDs, order IDs, or request IDs as metric label values.

```python
# Bad: unbounded cardinality
order_counter.add(1, {"customer_id": order.customer_id})  # millions of label combinations

# Good: low-cardinality labels only
order_counter.add(1, {"region": order.region, "status": "success"})  # bounded set
```

High-cardinality data belongs in traces (as span attributes), not metrics.

### Cost Control Checklist

- Set `exportIntervalMillis` to 30-60 seconds for metrics, not the default 10 seconds
- Disable noisy auto-instrumentations (`@opentelemetry/instrumentation-fs` in Node.js)
- Use the OTel Collector as a gateway with the `filter` processor to drop spans for health check endpoints
- Set `memory_limiter` on the collector to prevent OOM under load spikes
- Use the `batch` processor to reduce export overhead
- For logs, only export WARN and ERROR level in production, or use sampling on INFO

```yaml
# Filter health check spans at the collector
processors:
  filter/health:
    traces:
      span:
        - 'attributes["http.target"] == "/health"'
        - 'attributes["http.target"] == "/metrics"'
```

---

## Conclusion: Architecture Recommendations

For a production OpenTelemetry architecture in 2026:

1. **Instrument with OTel SDKs** using auto-instrumentation as the base layer, manual spans for business logic.
2. **Run the OTel Collector** as a sidecar (Kubernetes) or standalone gateway. Never export directly from application to backend—the collector handles batching, retry, and routing.
3. **Use tail-based sampling** in the collector. Keep all errors, keep slow traces, sample healthy fast traffic at 5-10%.
4. **Send traces to Jaeger or Grafana Tempo** for distributed tracing search and visualization.
5. **Send metrics to Prometheus** and visualize in Grafana. Use exemplars to link from metric charts to traces.
6. **Correlate logs** by injecting `trace_id` and `span_id` into your log output, then ship logs to Loki or your preferred log backend.
7. **Control cardinality aggressively.** High-cardinality data goes into trace attributes, not metric labels.
8. **Standardize resource attributes** (`service.name`, `service.version`, `deployment.environment`) across every service so you can filter and group in any backend.

OpenTelemetry in 2026 is mature, stable, and the obvious choice for any team that wants observability without vendor lock-in. The instrumentation cost is a one-time investment. The flexibility to route data anywhere—Grafana Cloud today, Honeycomb tomorrow, your own self-hosted stack if costs get out of hand—is worth it on its own. Start with auto-instrumentation, add tail sampling at the collector, and build manual spans for the five or ten operations that are actually critical to your business. That is a production-ready observability stack.
