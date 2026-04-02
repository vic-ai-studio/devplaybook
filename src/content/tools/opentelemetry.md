---
title: "OpenTelemetry — Vendor-Neutral Observability Framework"
description: "OpenTelemetry is the open-source observability framework for generating, collecting, and exporting telemetry (metrics, logs, traces). Instrument once, send to any backend — the industry standard for cloud-native observability."
category: "Observability"
pricing: "Free / Open Source"
pricingDetail: "OpenTelemetry is 100% free and open-source (Apache 2.0). CNCF incubating project backed by Google, Microsoft, Splunk, and others."
website: "https://opentelemetry.io"
github: "https://github.com/open-telemetry/opentelemetry-specification"
tags: ["observability", "tracing", "metrics", "logs", "cncf", "distributed-tracing", "instrumentation", "devops"]
pros:
  - "Vendor neutral: instrument once, send data to any backend (Jaeger, Zipkin, Datadog, Honeycomb, etc.)"
  - "All three signals: unified approach to traces, metrics, and logs"
  - "Auto-instrumentation: many frameworks instrumented automatically with zero code changes"
  - "CNCF backing: strong governance, vendor consortium, long-term stability"
  - "Collector: powerful agent/gateway for data processing, enrichment, and routing"
cons:
  - "Complex: OTEL specification, SDKs, Collector, backends — steep initial learning curve"
  - "SDK maturity varies by language (Go/Java stable; others still evolving)"
  - "Collector configuration can be verbose for complex pipelines"
  - "Not a backend itself — requires a separate storage/visualization layer"
date: "2026-04-02"
---

## What is OpenTelemetry?

OpenTelemetry (OTEL) is a CNCF project that standardizes how applications generate and export observability data. It provides:

- **APIs**: Language SDKs for instrumenting application code
- **SDKs**: Implementations of the APIs (Go, Java, Python, JS, .NET, Rust, etc.)
- **Collector**: An agent/gateway that receives, processes, and exports telemetry data
- **Protocols**: OTLP (OpenTelemetry Protocol) — standardized wire format

The key value proposition: instrument your code once with OTEL and send data to any compatible backend without changing your code.

## Quick Start

### Node.js Auto-Instrumentation

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

```javascript
// tracing.js (load before your app)
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'payments-service',
});

sdk.start();
```

```bash
# Start with auto-instrumentation
node -r ./tracing.js server.js
```

### Python Auto-Instrumentation

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # Install all auto-instrumentation packages

# Run with auto-instrumentation
opentelemetry-instrument \
  --service_name payment-service \
  --exporter_otlp_endpoint http://localhost:4317 \
  python app.py
```

### Manual Instrumentation

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payments-service', '1.0.0');

async function processPayment(orderId: string, amount: number) {
  const span = tracer.startSpan('process-payment');

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
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    throw err;
  } finally {
    span.end();
  }
}
```

## OpenTelemetry Collector

The Collector is an agent that runs alongside your application, receives telemetry, processes it, and exports to multiple backends:

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
    send_batch_size: 1024
  memory_limiter:
    limit_mib: 400
  resource:
    attributes:
      - key: environment
        value: production
        action: insert

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: info

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, resource]
      exporters: [jaeger, logging]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

## OTLP: The Standard Protocol

OpenTelemetry Protocol (OTLP) is the standard wire format for telemetry data. All major observability vendors now support OTLP:

- Datadog: `OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com`
- Honeycomb: `OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io`
- Grafana Cloud: OTLP endpoint for Tempo (traces), Mimir (metrics), Loki (logs)
- New Relic: `OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net`
- Jaeger: Native OTLP support

This means you can switch backends by changing environment variables — no code changes.

## Kubernetes Deployment

```yaml
# Deploy OTEL Collector as DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:latest
          args:
            - "--config=/conf/otel-collector-config.yaml"
          volumeMounts:
            - name: otel-collector-config-vol
              mountPath: /conf
```

OpenTelemetry is now the baseline for all new observability work in cloud-native applications. Instrument with OTEL, choose your backend based on cost and features.
