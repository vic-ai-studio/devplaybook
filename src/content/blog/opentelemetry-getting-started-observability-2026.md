---
title: "OpenTelemetry Getting Started: Observability Stack for 2026"
description: "Set up distributed tracing, metrics, and logs with OpenTelemetry. Complete tutorial with Node.js, Python examples, and integration with Jaeger, Prometheus, and Grafana."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["opentelemetry", "observability", "distributed-tracing", "monitoring", "devops"]
readingTime: "13 min read"
---

Observability has become non-negotiable for production systems. When something breaks at 3 AM, you need to answer three questions fast: *What happened? Where did it fail? Why?* OpenTelemetry (OTel) is the open-source standard that gives you the instrumentation layer to answer all three—without vendor lock-in.

This guide walks through building a complete observability stack in 2026: OpenTelemetry for instrumentation, the OTel Collector for processing, Jaeger for tracing, Prometheus for metrics, and Grafana for dashboards. Includes real Node.js and Python examples you can run today.

## What is OpenTelemetry?

OpenTelemetry is a CNCF project that standardizes how applications emit telemetry data. It covers three signals:

- **Traces**: End-to-end request flows across services
- **Metrics**: Numeric measurements over time (latency, error rate, throughput)
- **Logs**: Structured event records with trace correlation

The core value: instrument once, export anywhere. OTel supports 30+ backends including Datadog, Honeycomb, Jaeger, Zipkin, and Prometheus—all from the same SDK.

## Architecture Overview

```
Application (Node.js/Python)
    ↓ OTLP (gRPC/HTTP)
OpenTelemetry Collector
    ↓ Traces        ↓ Metrics      ↓ Logs
  Jaeger         Prometheus      Loki
    ↓                ↓              ↓
              Grafana (unified dashboards)
```

The **OTel Collector** is the key component. It receives telemetry from your services, processes it (sampling, filtering, enrichment), and exports to multiple backends simultaneously.

## Step 1: Deploy the Observability Stack with Docker Compose

Start with a local stack before deploying to production.

```yaml
# docker-compose.yml
version: '3.8'

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.98.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics scrape endpoint
    depends_on:
      - jaeger

  jaeger:
    image: jaegertracing/all-in-one:1.56
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"  # Jaeger UI
      - "4317"         # OTLP gRPC (internal)

  prometheus:
    image: prom/prometheus:v2.51.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.4.0
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    ports:
      - "3000:3000"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
```

### OTel Collector Configuration

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

  # Add resource attributes to all telemetry
  resource:
    attributes:
    - key: deployment.environment
      value: "production"
      action: upsert

  # Sample 10% of traces in high-volume environments
  probabilistic_sampler:
    sampling_percentage: 10

  # Always sample error traces
  tail_sampling:
    decision_wait: 10s
    num_traces: 100
    expected_new_traces_per_sec: 10
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

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: myapp

  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource, tail_sampling]
      exporters: [otlp/jaeger, debug]
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [debug]
```

```bash
docker-compose up -d
```

## Step 2: Instrument a Node.js Application

### Install Dependencies

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-grpc \
  @opentelemetry/exporter-metrics-otlp-grpc \
  @opentelemetry/sdk-metrics \
  @grpc/grpc-js
```

### Create the Instrumentation Setup File

```typescript
// src/instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'api-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: 'grpc://localhost:4317',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'grpc://localhost:4317',
    }),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

**Critical**: Load this file before anything else in your application:

```json
// package.json
{
  "scripts": {
    "start": "node --require ./dist/instrumentation.js dist/index.js"
  }
}
```

### Adding Custom Spans and Metrics

Auto-instrumentation handles HTTP, database, and cache calls. Add custom spans for business logic:

```typescript
// src/services/order-service.ts
import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');
const meter = metrics.getMeter('order-service');

// Custom metrics
const orderCounter = meter.createCounter('orders.created', {
  description: 'Number of orders created',
  unit: 'orders',
});

const orderValueHistogram = meter.createHistogram('orders.value', {
  description: 'Order value in USD',
  unit: 'USD',
  advice: {
    explicitBucketBoundaries: [10, 50, 100, 500, 1000, 5000],
  },
});

export async function createOrder(userId: string, items: OrderItem[]) {
  // Custom span wrapping business logic
  return tracer.startActiveSpan('order.create', async (span) => {
    try {
      // Add semantic attributes
      span.setAttributes({
        'order.user_id': userId,
        'order.item_count': items.length,
        'order.source': 'web',
      });

      const total = items.reduce((sum, item) => sum + item.price, 0);

      // Nested span for payment processing
      const order = await tracer.startActiveSpan('order.process_payment', async (paymentSpan) => {
        try {
          const result = await paymentService.charge(userId, total);
          paymentSpan.setAttributes({
            'payment.method': result.method,
            'payment.transaction_id': result.transactionId,
          });
          return result;
        } catch (error) {
          paymentSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
          paymentSpan.recordException(error as Error);
          throw error;
        } finally {
          paymentSpan.end();
        }
      });

      // Record business metrics
      orderCounter.add(1, {
        'order.status': 'success',
        'order.source': 'web',
      });
      orderValueHistogram.record(total, {
        'customer.tier': await getUserTier(userId),
      });

      span.setAttributes({ 'order.id': order.id, 'order.total': total });
      return order;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      orderCounter.add(1, { 'order.status': 'failed' });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

## Step 3: Instrument a Python Application

### Install Dependencies

```bash
pip install \
  opentelemetry-sdk \
  opentelemetry-exporter-otlp-proto-grpc \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-sqlalchemy \
  opentelemetry-instrumentation-redis \
  opentelemetry-instrumentation-requests
```

### Setup for FastAPI

```python
# app/instrumentation.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
import os

def setup_telemetry(app=None):
    resource = Resource.create({
        SERVICE_NAME: "user-service",
        SERVICE_VERSION: os.getenv("APP_VERSION", "1.0.0"),
        "deployment.environment": os.getenv("ENVIRONMENT", "development"),
    })

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint="http://localhost:4317")
        )
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint="http://localhost:4317"),
        export_interval_millis=10000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Auto-instrumentation
    if app:
        FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument()

    return trace.get_tracer("user-service"), metrics.get_meter("user-service")
```

```python
# app/main.py
from fastapi import FastAPI
from app.instrumentation import setup_telemetry
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

app = FastAPI()
tracer, meter = setup_telemetry(app)

# Custom metrics
request_counter = meter.create_counter(
    "http.requests.total",
    description="Total HTTP requests",
)

response_histogram = meter.create_histogram(
    "http.request.duration",
    description="HTTP request duration",
    unit="ms",
)

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", user_id)
        try:
            user = await db.fetch_user(user_id)
            if not user:
                span.set_status(Status(StatusCode.ERROR, "User not found"))
                return {"error": "not found"}, 404

            request_counter.add(1, {"endpoint": "get_user", "status": "success"})
            return user
        except Exception as e:
            span.record_exception(e)
            span.set_status(Status(StatusCode.ERROR, str(e)))
            request_counter.add(1, {"endpoint": "get_user", "status": "error"})
            raise
```

## Step 4: Configure Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

## Step 5: Build Grafana Dashboards

### Provision Data Sources Automatically

```yaml
# grafana/provisioning/datasources/datasources.yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Jaeger
    type: jaeger
    url: http://jaeger:16686
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
      nodeGraph:
        enabled: true
```

### Key Dashboard Panels

For a service-level dashboard, these four panels cover the golden signals (latency, traffic, errors, saturation):

```
# Prometheus queries for dashboard panels

# P99 Request Latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="api"}[5m])) by (le, endpoint)
)

# Error Rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint)
/
sum(rate(http_requests_total[5m])) by (endpoint)

# Throughput (RPS)
sum(rate(http_requests_total[1m])) by (endpoint)

# Active connections / saturation
sum(http_active_connections) by (pod)
```

## Step 6: Correlating Traces and Logs

The real power of OTel is correlating logs with traces. Add trace context to your log output:

```typescript
// Node.js: Add trace context to Winston logs
import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf((info) => {
      const activeSpan = trace.getActiveSpan();
      const spanContext = activeSpan?.spanContext();

      return JSON.stringify({
        ...info,
        trace_id: spanContext?.traceId,
        span_id: spanContext?.spanId,
        trace_flags: spanContext?.traceFlags,
      });
    })
  ),
  transports: [new winston.transports.Console()],
});
```

With trace IDs in your logs, Grafana can link directly from a trace in Jaeger to the correlated logs in Loki—a workflow that dramatically speeds up debugging.

## Production Considerations

### Sampling Strategy

Never send 100% of traces in production. A tiered strategy:

```yaml
# In your OTel Collector config
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
    # Always capture errors
    - name: error-traces
      type: status_code
      status_code: {status_codes: [ERROR]}
    # Always capture slow traces (>500ms)
    - name: slow-traces
      type: latency
      latency: {threshold_ms: 500}
    # Always capture traces with specific attributes
    - name: debug-traces
      type: string_attribute
      string_attribute:
        key: debug.enabled
        values: ["true"]
    # Sample 1% of everything else
    - name: base-sample
      type: probabilistic
      probabilistic: {sampling_percentage: 1}
```

### Security

```yaml
# Use TLS for OTLP connections in production
exporters:
  otlp:
    endpoint: https://your-backend:4317
    tls:
      cert_file: /etc/ssl/otel-cert.pem
      key_file: /etc/ssl/otel-key.pem
      ca_file: /etc/ssl/ca-cert.pem
    headers:
      Authorization: "Bearer ${OTLP_API_KEY}"
```

### Kubernetes Deployment

```yaml
# Deploy OTel Collector as a DaemonSet for node-level metrics
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.98.0
        args: ["--config=/conf/otel-collector-config.yaml"]
        ports:
        - containerPort: 4317  # OTLP gRPC
        - containerPort: 4318  # OTLP HTTP
        resources:
          requests:
            cpu: "200m"
            memory: "400Mi"
          limits:
            cpu: "1"
            memory: "2Gi"
        volumeMounts:
        - name: otel-collector-config
          mountPath: /conf
      volumes:
      - name: otel-collector-config
        configMap:
          name: otel-collector-config
```

## Choosing a Backend

OpenTelemetry's vendor-neutral design means you can switch backends without changing application code. Here's how the major options compare in 2026:

| Backend | Best For | Pricing Model |
|---|---|---|
| Jaeger | Self-hosted tracing, cost control | Free / infra costs |
| Tempo + Grafana | Existing Grafana stack | Free / infra costs |
| Honeycomb | Developer-first, high cardinality | Per event |
| Datadog | Full-stack monitoring, enterprise | Per host + ingestion |
| Grafana Cloud | Managed OSS stack | Free tier + usage |

For most teams starting out, Jaeger + Prometheus + Grafana (all self-hosted) provides a full observability stack at infrastructure cost only.

## Conclusion

OpenTelemetry has matured into the definitive observability standard. With a single instrumentation layer, you get distributed traces, metrics, and log correlation—all exportable to any backend without re-instrumenting.

The investment pays off the first time you trace a production incident from a user-facing error through five microservices to the exact database query that timed out—in under 5 minutes instead of 5 hours.

Explore related tools in the [monitoring and observability collection](/tools/monitoring) and [DevOps toolchain](/tools/devops) on DevPlaybook.
