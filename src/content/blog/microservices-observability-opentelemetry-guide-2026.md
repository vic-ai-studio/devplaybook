---
title: "Microservices Observability with OpenTelemetry 2026: Tracing, Metrics, Logs"
description: "Complete guide to implementing observability in microservices using OpenTelemetry in 2026. Distributed tracing, metrics collection, structured logging, and production-ready setup with Jaeger, Prometheus, and Grafana."
date: "2026-04-02"
tags: [observability, opentelemetry, microservices, monitoring, devops]
readingTime: "11 min read"
---

# Microservices Observability with OpenTelemetry 2026: Tracing, Metrics, Logs

When a request fails in a monolith, you look at one set of logs. When a request fails across 12 microservices, you're in a different kind of pain. Observability — the ability to understand what your system is doing from the outside — is what separates teams that debug incidents in 10 minutes from teams that spend 4 hours on bridges.

OpenTelemetry (OTel) has become the standard for cloud-native observability. In 2026, it's the right default for any microservices architecture.

## The Three Pillars of Observability

**Traces** track a single request's journey across all services. A trace is composed of spans — each span represents one operation (an HTTP call, a database query, a cache lookup).

**Metrics** are time-series numbers: request rates, error rates, latencies, queue depths. They answer "how is the system performing right now?"

**Logs** are timestamped records of events. In a distributed system, logs must be structured (JSON) and correlated to traces by trace ID.

Together, these three give you the full picture. Traces show you where time is spent. Metrics alert you when thresholds are exceeded. Logs give you the detail to understand why.

## OpenTelemetry Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Your Applications                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Service A   │  │  Service B   │  │  Service C   │  │
│  │  OTel SDK    │  │  OTel SDK    │  │  OTel SDK    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼────────────────┼────────────────┼────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
                    OTLP Protocol
                           │
                    ┌──────▼──────┐
                    │  OTel       │
                    │  Collector  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  Jaeger  │     │Prometheus│     │  Loki    │
    │ (traces) │     │(metrics) │     │  (logs)  │
    └──────────┘     └──────────┘     └──────────┘
                           │
                    ┌──────▼──────┐
                    │   Grafana   │
                    │  Dashboard  │
                    └─────────────┘
```

The **OTel Collector** is the key component. Your services send telemetry data to the Collector via OTLP (OpenTelemetry Protocol), and the Collector forwards to your storage backends. This decouples your application code from the observability backend — you can swap Jaeger for Tempo without touching application code.

## Instrumenting a Node.js Service

### Install Dependencies

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

### Setup (tracing.js — load before everything else)

```javascript
// tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME || 'unknown-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '0.0.1',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/metrics',
    }),
    exportIntervalMillis: 30000, // Export every 30 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
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

### Start with tracing

```json
// package.json
{
  "scripts": {
    "start": "node --require ./tracing.js src/server.js"
  }
}
```

The `auto-instrumentations-node` package automatically traces:
- Incoming and outgoing HTTP requests
- Express route handlers
- PostgreSQL queries
- Redis operations
- MongoDB operations
- gRPC calls

**You get distributed tracing with zero code changes to your application logic.**

## Custom Spans and Attributes

Auto-instrumentation handles infrastructure. For business logic, add custom spans:

```javascript
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service', '1.0.0');

async function processOrder(orderId) {
  return tracer.startActiveSpan('process-order', async (span) => {
    try {
      // Add context to the span
      span.setAttributes({
        'order.id': orderId,
        'order.source': 'web',
      });

      const order = await db.findOrder(orderId);
      span.setAttribute('order.total', order.total);
      span.setAttribute('order.items', order.items.length);

      await validateInventory(order);
      await chargePayment(order);
      await scheduleShipment(order);

      span.setStatus({ code: SpanStatusCode.OK });
      return order;
    } catch (error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Custom Metrics

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('order-service', '1.0.0');

// Counter — only goes up
const ordersProcessed = meter.createCounter('orders.processed', {
  description: 'Total number of orders processed',
});

// Histogram — for latencies and sizes
const orderProcessingTime = meter.createHistogram('order.processing.duration', {
  description: 'Time to process an order (ms)',
  unit: 'ms',
});

// Gauge — can go up or down
const activeOrders = meter.createObservableGauge('orders.active', {
  description: 'Number of orders currently being processed',
});

activeOrders.addCallback((result) => {
  result.observe(getActiveOrderCount());
});

// Usage
async function processOrder(orderId) {
  const startTime = Date.now();
  try {
    const order = await doProcess(orderId);
    ordersProcessed.add(1, { status: 'success', channel: order.channel });
    return order;
  } catch (error) {
    ordersProcessed.add(1, { status: 'error', error: error.code });
    throw error;
  } finally {
    orderProcessingTime.record(Date.now() - startTime, { orderId });
  }
}
```

## Structured Logging with Trace Correlation

Logs need trace IDs to be useful in distributed systems:

```javascript
const { context, trace } = require('@opentelemetry/api');

function getTraceContext() {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

// Custom logger that automatically injects trace context
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      service: process.env.SERVICE_NAME,
      ...getTraceContext(),
      ...data,
    }));
  },
  error: (message, error, data = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      service: process.env.SERVICE_NAME,
      ...getTraceContext(),
      ...data,
    }));
  },
};

// Usage
logger.info('Order processed', { orderId, total });
```

Now when you see an error in Loki, you can copy the `traceId` and find the full request trace in Jaeger.

## OTel Collector Configuration

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
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health"'  # Drop health check spans

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
      processors: [memory_limiter, filter, batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

## Docker Compose Setup for Development

```yaml
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.97.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics

  jaeger:
    image: jaegertracing/all-in-one:1.56
    ports:
      - "16686:16686" # UI
    environment:
      COLLECTOR_OTLP_ENABLED: true

  prometheus:
    image: prom/prometheus:v2.51.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  loki:
    image: grafana/loki:2.9.5
    ports:
      - "3100:3100"

  grafana:
    image: grafana/grafana:10.4.0
    ports:
      - "3001:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: true
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
```

## Essential Grafana Dashboards

For microservices observability, configure dashboards for:

**Service RED metrics** (Rate, Errors, Duration):
- Request rate per service
- Error rate (4xx, 5xx separately)
- P50, P95, P99 latency histograms

**Service dependency map:**
- Which services call which other services
- Error rates on each dependency edge
- Latency of each dependency call

**Infrastructure:**
- CPU and memory per pod
- Pod restart count
- Node saturation

The [DevPlaybook observability tools](/tools/grafana-dashboard-guide) page has ready-to-use dashboard JSON configs.

## OpenTelemetry Python (FastAPI Example)

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

def setup_tracing(app, service_name: str):
    provider = TracerProvider()
    exporter = OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()

# main.py
from fastapi import FastAPI
from tracing import setup_tracing

app = FastAPI()
setup_tracing(app, "user-service")
```

## Conclusion

OpenTelemetry in 2026 is mature, well-supported, and the correct default for any microservices observability strategy. The key decisions are:

1. **Start with auto-instrumentation** — get traces flowing before writing any custom instrumentation
2. **Use the OTel Collector** — never export directly from your application to the backend
3. **Correlate logs with traces** — inject traceId into every log line
4. **Add custom spans for business operations** — auto-instrumentation misses the semantics of your domain
5. **Alert on RED metrics** — Rate, Errors, Duration per service

The setup cost is one afternoon. The debugging time saved in your first production incident pays it back.

---

**Related tools:**
- [Prometheus alerting rules guide](/tools/prometheus-alerting-guide)
- [Grafana dashboard design](/tools/grafana-dashboard-guide)
- [Distributed systems debugging](/tools/distributed-debugging-guide)
