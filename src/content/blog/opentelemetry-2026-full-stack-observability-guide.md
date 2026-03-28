---
title: "OpenTelemetry 2026: The Complete Guide to Full-Stack Observability"
description: "A comprehensive guide to OpenTelemetry in 2026 — covering traces, metrics, and logs, auto-instrumentation in Node.js and Python, backends like Jaeger and Grafana Tempo, and production best practices for correlating signals."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["opentelemetry", "observability", "distributed-tracing", "metrics", "logs", "nodejs", "python", "grafana", "jaeger"]
readingTime: "14 min read"
---

OpenTelemetry (OTel) is now the industry standard for instrumentation. In 2026, it's stable, widely adopted, and the question is no longer "should we use it?" but "how do we use it well?" This guide covers the full picture — from architecture to production-ready implementation in Node.js and Python.

---

## What OpenTelemetry Is (and What It Isn't)

OpenTelemetry is a CNCF project that provides:

1. **A specification** — defines what telemetry data looks like (semantic conventions)
2. **APIs** — language-specific interfaces for creating telemetry
3. **SDKs** — implementations of those APIs for each language
4. **The Collector** — a vendor-agnostic proxy/pipeline for telemetry data
5. **Auto-instrumentation** — automatic instrumentation for popular libraries

What it is *not*: a backend, a storage system, or a visualization tool. OTel gets data out of your application. You still need something to store and query it (Jaeger, Grafana Tempo, Prometheus, Loki, etc.).

---

## The Three Pillars: Traces, Metrics, and Logs

**Traces** capture the journey of a request through your system. A trace is a tree of spans — each span represents a unit of work (HTTP request, database query, function call). Traces answer: "What happened when this request was processed?"

**Metrics** are numeric measurements over time — counters, gauges, histograms. Metrics answer: "How is my system performing right now?" and "Is this pattern normal?"

**Logs** are timestamped text records of events. Logs answer: "What exactly happened at this moment?"

The real power of OTel is **correlation** — a log entry can contain a trace ID, letting you jump from a log message directly to the trace that produced it. This turns three separate views into one unified debugging experience.

---

## OTel Architecture

```
Your Application
    │
    ├── OTel SDK (traces, metrics, logs)
    │       │
    │       └── OTLP Exporter → OTel Collector
    │
OTel Collector (optional but recommended)
    │
    ├── Traces → Jaeger / Grafana Tempo / Zipkin
    ├── Metrics → Prometheus / Grafana Mimir
    └── Logs → Loki / Elasticsearch
```

The Collector provides a buffer between your app and backends. Benefits: batching, retry on failure, tail-based sampling, and the ability to switch backends without redeploying your application.

---

## Auto-Instrumentation vs Manual Instrumentation

### Auto-Instrumentation

Auto-instrumentation hooks into popular libraries (Express, FastAPI, Redis, PostgreSQL, gRPC, etc.) and creates spans automatically with no code changes. It's the right starting point.

**Node.js auto-instrumentation:**
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```javascript
// instrumentation.js — load before anything else
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'my-api',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://otel-collector:4318/v1/metrics',
    }),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

```bash
# Start your app with instrumentation
node -r ./instrumentation.js app.js
```

**Python auto-instrumentation:**
```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install
```

```bash
# Run with auto-instrumentation
opentelemetry-instrument \
  --service_name my-api \
  --exporter_otlp_endpoint http://otel-collector:4317 \
  python app.py
```

This automatically instruments Flask, FastAPI, SQLAlchemy, Redis, requests, and dozens more.

### Manual Instrumentation

Use manual instrumentation when you need custom spans for business logic that libraries don't cover.

**Node.js manual spans:**
```javascript
const opentelemetry = require('@opentelemetry/api');

const tracer = opentelemetry.trace.getTracer('my-service', '1.0.0');

async function processOrder(orderId) {
  return tracer.startActiveSpan('processOrder', async (span) => {
    try {
      span.setAttribute('order.id', orderId);
      span.setAttribute('order.source', 'api');

      const order = await db.getOrder(orderId);
      span.setAttribute('order.total', order.total);
      span.setAttribute('order.items_count', order.items.length);

      await chargePayment(order);
      await fulfillOrder(order);

      span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
      return order;
    } catch (err) {
      span.recordException(err);
      span.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: err.message,
      });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

**Python manual spans:**
```python
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("my-service", "1.0.0")

def process_order(order_id: str):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)

        try:
            order = db.get_order(order_id)
            span.set_attribute("order.total", float(order.total))

            charge_payment(order)
            fulfill_order(order)

            span.set_status(StatusCode.OK)
            return order
        except Exception as e:
            span.record_exception(e)
            span.set_status(StatusCode.ERROR, str(e))
            raise
```

---

## Custom Metrics

**Node.js custom metrics:**
```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('my-service', '1.0.0');

// Counter — only goes up
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests',
});

// Histogram — distribution of values
const requestDuration = meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

// Observable Gauge — polled value
const activeConnections = meter.createObservableGauge('db.connections.active', {
  description: 'Active database connections',
});
activeConnections.addCallback((result) => {
  result.observe(db.getActiveConnectionCount());
});

// Usage
app.use((req, res, next) => {
  const start = Date.now();
  requestCounter.add(1, { method: req.method, route: req.route?.path });

  res.on('finish', () => {
    requestDuration.record(Date.now() - start, {
      method: req.method,
      status_code: res.statusCode,
    });
  });
  next();
});
```

---

## The OTel Collector

The Collector is a binary that receives, processes, and exports telemetry. Deploy it as a sidecar (one per pod) or as a gateway (central collector cluster).

**Docker Compose setup:**
```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics (self-monitoring)

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14250:14250"  # gRPC for collector

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

**otel-collector.yaml:**
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
    timeout: 5s
    send_batch_size: 1000

  # Add resource attributes to all telemetry
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert

  # Tail-based sampling — only keep 10% of successful traces, 100% of errors
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
        probabilistic: {sampling_percentage: 10}

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

  prometheus:
    endpoint: 0.0.0.0:8889

  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource, tail_sampling]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [loki]
```

---

## Backends: Jaeger vs Grafana Tempo

Both Jaeger and Grafana Tempo store distributed traces. The right choice depends on your existing stack.

**Jaeger:**
- Purpose-built for distributed tracing
- Excellent UI with service maps and dependency graphs
- Cassandra, Elasticsearch, or Badger for storage
- Simpler to operate for trace-only setups

**Grafana Tempo:**
- Object storage backend (S3, GCS, Azure Blob) — very cheap at scale
- Integrates with Grafana (traces, metrics, logs in one UI)
- TraceQL query language for complex trace queries
- Pairs with Grafana Loki (logs) and Mimir (metrics) for the full observability stack

For teams already using Grafana/Prometheus, Tempo is the natural choice. For teams wanting a standalone tracing solution, Jaeger is simpler.

---

## Correlating Traces, Metrics, and Logs

Correlation is where OTel's value becomes clear. When a trace ID is attached to logs, you can go from a slow request metric → to the trace that was slow → to the log lines generated during that trace.

**Attach trace context to structured logs (Node.js):**
```javascript
const { trace, context } = require('@opentelemetry/api');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format((info) => {
      const span = trace.getActiveSpan();
      if (span) {
        const spanContext = span.spanContext();
        info.trace_id = spanContext.traceId;
        info.span_id = spanContext.spanId;
        info.trace_flags = spanContext.traceFlags;
      }
      return info;
    })()
  ),
  transports: [new winston.transports.Console()],
});
```

With `trace_id` in every log line, Grafana can link directly from a log entry to the trace in Tempo.

---

## Production Best Practices

**1. Use tail-based sampling, not head-based.** Head-based sampling (sample at the start of a trace) means you randomly discard traces. Tail-based sampling waits until a trace is complete, then keeps it if it's interesting (slow, errored, specific users). The Collector supports tail-based sampling via the `tail_sampling` processor.

**2. Add semantic conventions from day one.** OTel defines standard attribute names (`http.method`, `db.system`, `rpc.service`). Using them means your data is consistent across services and tools can understand it automatically.

**3. Set resource attributes.** Service name, version, and deployment environment should be on every span. Set them in the SDK configuration, not per-span.

**4. Don't instrument everything manually.** Auto-instrumentation covers most of what you need. Add manual spans only for business-critical operations where you need custom attributes.

**5. Watch your cardinality.** High-cardinality attributes (user IDs, session IDs) in metrics will explode your metric series count. Use them in traces and logs, not in metric label sets.

**6. Deploy the Collector.** Even if it feels like extra infrastructure, the Collector's batching and retry capabilities prevent data loss during backend outages. It also gives you the ability to add sampling or change backends without redeploying apps.

---

## Getting Started Checklist

- [ ] Install OTel SDK for your primary language
- [ ] Enable auto-instrumentation for your web framework and database libraries
- [ ] Set `service.name`, `service.version`, and `deployment.environment` as resource attributes
- [ ] Deploy OTel Collector in your infrastructure
- [ ] Choose and deploy a trace backend (Jaeger for simplicity, Tempo for Grafana integration)
- [ ] Configure Prometheus scraping for OTel metrics
- [ ] Add trace ID injection to your structured logs
- [ ] Verify traces appear for sample requests before going to production
- [ ] Configure tail-based sampling in the Collector
- [ ] Set up Grafana dashboards correlating traces, metrics, and logs

---

## Key Takeaways

- **OTel is the standard** — don't build custom instrumentation when OTel SDKs exist for your language
- **Auto-instrumentation first** — it covers HTTP, databases, and queues without code changes
- **The Collector is worth deploying** — its sampling and batching capabilities pay off at scale
- **Grafana Tempo + Loki + Mimir** is the most cost-effective full-stack observability stack in 2026
- **Correlation is the goal** — trace IDs in logs transform debugging from guesswork to navigation
- **Cardinality discipline** — keep high-cardinality identifiers in traces and logs, not metric labels
