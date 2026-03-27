---
title: "Building Your Observability Stack in 2026: OpenTelemetry + Grafana vs Datadog vs New Relic"
description: "A practical guide to building a modern observability stack in 2026 — comparing OpenTelemetry + Grafana OSS, Datadog, and New Relic on cost, setup complexity, features, and real-world tradeoffs."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["observability", "opentelemetry", "grafana", "datadog", "new-relic", "monitoring", "tracing", "devops", "sre"]
readingTime: "15 min read"
---

Observability went from "nice to have" to "table stakes" between 2023 and 2026. The shift to microservices, serverless, and AI-augmented workloads created systems that are fundamentally too complex to debug without distributed tracing, structured logs, and meaningful metrics. The days of watching a single server's CPU graph are over.

In 2026, you have three primary paths to a production observability stack:

1. **OpenTelemetry + Grafana (OSS stack)** — build it yourself, own your data, pay infrastructure costs
2. **Datadog** — best-in-class commercial platform, full coverage, enterprise pricing
3. **New Relic** — full-stack observability with a generous free tier and consumption-based pricing

This guide walks through what each path looks like in practice — not the marketing, the actual implementation — and helps you choose based on your team's constraints.

---

## The Three Pillars of Observability

Before comparing stacks, a quick terminology alignment:

- **Metrics**: Time-series numerical data (CPU usage, request rate, error rate)
- **Logs**: Timestamped text records of discrete events
- **Traces**: Distributed traces that follow a request across multiple services

A complete observability stack captures all three, correlates them, and makes them queryable. The difference between platforms is mostly about how much of this correlation and querying is automated vs. manual.

---

## Option 1: OpenTelemetry + Grafana Stack

The open-source path means stitching together:
- **OpenTelemetry** (OTEL): Vendor-neutral instrumentation standard and collector
- **Prometheus**: Metrics storage and alerting
- **Loki**: Log aggregation
- **Tempo**: Distributed tracing backend
- **Grafana**: Visualization and unified querying

This is often called the **LGTM stack** (Loki, Grafana, Tempo, Mimir/Prometheus).

### Instrumentation with OpenTelemetry

OpenTelemetry provides SDKs for all major languages. Here's a Node.js setup:

```typescript
// otel-setup.ts — run before your app starts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'payment-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '2.1.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
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
process.on('SIGTERM', () => sdk.shutdown());
```

Auto-instrumentation catches HTTP requests, database queries, and cache calls automatically. For custom spans:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service', '2.1.0');

async function processPayment(orderId: string, amount: number) {
  const span = tracer.startSpan('process-payment', {
    attributes: {
      'order.id': orderId,
      'payment.amount': amount,
      'payment.currency': 'USD',
    },
  });

  try {
    const result = await paymentGateway.charge(orderId, amount);
    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute('payment.transaction_id', result.transactionId);
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### OpenTelemetry Collector Configuration

The collector is the central hub that receives telemetry, processes it, and forwards to backends:

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
    send_batch_size: 10000
  resource:
    attributes:
      - action: insert
        key: environment
        value: production

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  loki:
    endpoint: "http://loki:3100/loki/api/v1/push"
  otlp/tempo:
    endpoint: http://tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
```

### Docker Compose Stack

```yaml
version: '3'
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    command: --config /etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"

  tempo:
    image: grafana/tempo:latest
    command: -config.file=/etc/tempo.yaml
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
    ports:
      - "3200:3200"
      - "4317"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    ports:
      - "3000:3000"
    volumes:
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
```

### OSS Stack Strengths

- **No vendor lock-in** — your data, your infrastructure, portable telemetry
- **Cost** — you pay infrastructure, not per-seat or per-data-ingested
- **OpenTelemetry adoption** — industry standard, SDK support for every language
- **Grafana's unified view** — correlate metrics, logs, and traces in a single pane

### OSS Stack Weaknesses

- **Operational burden** — you manage, scale, and back up every component
- **Setup time** — 1-3 days for a production-ready setup vs. 30 minutes for Datadog
- **Alert quality** — building good alerting rules requires expertise
- **No AI/ML insights** — anomaly detection requires additional tooling (Grafana ML is catching up)

### OSS Stack Cost

For a medium-scale deployment (100GB logs/day, 10M spans/day):
- **EC2/GCP VM costs**: ~$300-600/month (Prometheus + Loki + Tempo + Grafana)
- **Storage (S3 for Tempo/Loki)**: ~$50-100/month
- **Total**: ~$350-700/month (vs. $10,000+/month on Datadog at same scale)

---

## Option 2: Datadog

Datadog is the market leader in commercial observability. Its APM, infrastructure monitoring, log management, and RUM products are best-in-class, and the correlation between signals is seamless.

### Datadog Agent Setup

```yaml
# datadog-agent.yaml (Kubernetes DaemonSet)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: datadog-agent
spec:
  selector:
    matchLabels:
      app: datadog-agent
  template:
    spec:
      containers:
      - name: datadog-agent
        image: gcr.io/datadoghq/agent:latest
        env:
          - name: DD_API_KEY
            valueFrom:
              secretKeyRef:
                name: datadog-secret
                key: api-key
          - name: DD_SITE
            value: "datadoghq.com"
          - name: DD_APM_ENABLED
            value: "true"
          - name: DD_LOGS_ENABLED
            value: "true"
          - name: DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL
            value: "true"
          - name: DD_PROCESS_AGENT_ENABLED
            value: "true"
```

### Datadog APM with OpenTelemetry

Datadog now accepts OTLP data, so you can use OpenTelemetry instrumentation and route it to Datadog:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces', // Datadog Agent OTLP endpoint
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

### Datadog Strengths

- **Best-in-class APM** — flame graphs, service maps, and end-to-end request traces are unmatched
- **Minimal setup** — agent auto-discovery instruments most languages automatically
- **AI-powered insights** — Watchdog alerts on anomalies without manual alert rules
- **Security integration** — CSPM, SIEM, and APM in one platform
- **Excellent UX** — dashboards are fast to build, sharing is frictionless

### Datadog Weaknesses

- **Expensive** — pricing model is per-host + per-GB-logs + per-trace. At scale, costs can easily reach $50,000-100,000/month
- **Vendor lock-in** — proprietary query language (DDSQL, DQL), custom dashboards, non-portable alerts
- **Overage surprises** — log ingestion can spike unexpectedly and hit expensive tiers
- **Enterprise-first** — support quality at lower tiers can be disappointing

### Datadog Pricing (2026, approximate)

- **Infrastructure**: $15-23/host/month
- **APM**: $31/host/month (includes trace ingestion)
- **Log Management**: $0.10-0.25/GB ingested, plus retention costs
- **Realistic cost for 50-host team**: $8,000-15,000/month

---

## Option 3: New Relic

New Relic pivoted to a consumption-based pricing model in 2021 (paying for data ingested, not seats) and added a generous free tier. In 2026, it's the most cost-predictable commercial option.

### New Relic Setup with OpenTelemetry

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { credentials } from '@grpc/grpc-js';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'https://otlp.nr-data.net:4317',
    credentials: credentials.createSsl(),
    headers: {
      'api-key': process.env.NEW_RELIC_LICENSE_KEY!,
    },
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'https://otlp.nr-data.net:4317',
      credentials: credentials.createSsl(),
      headers: {
        'api-key': process.env.NEW_RELIC_LICENSE_KEY!,
      },
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

### New Relic NRQL (Querying)

```sql
-- Find slowest transactions
SELECT average(duration), percentile(duration, 95, 99)
FROM Transaction
WHERE appName = 'payment-service'
FACET name
SINCE 1 hour ago
LIMIT 20

-- Error rate by service
SELECT count(*) / rate(count(*), 1 minute) AS 'Error Rate'
FROM TransactionError
FACET appName
SINCE 24 hours ago
TIMESERIES 5 minutes

-- Trace analysis
SELECT *
FROM Span
WHERE service.name = 'payment-service'
AND duration > 2
SINCE 30 minutes ago
```

### New Relic Strengths

- **Generous free tier** — 100GB/month free (genuinely useful for small teams)
- **Full-stack in one platform** — APM, infrastructure, browser, mobile, synthetic monitoring
- **NRQL** — powerful SQL-like query language across all telemetry types
- **Good AI/ML** — anomaly detection and alert baselines are built in
- **OpenTelemetry native** — full OTLP support, no proprietary agent required

### New Relic Weaknesses

- **UI complexity** — the platform is large; finding the right screen takes time
- **Historical pricing confusion** — legacy per-seat pricing coexists with new consumption pricing
- **Less polished than Datadog** — APM flame graphs and service maps are good but not Datadog-quality
- **Support tiers** — free/standard tier support can be slow

### New Relic Pricing (2026)

- **Free**: 1 user, 100GB/month data, full access to all features
- **Pro**: $0.30/GB after free tier, $99/user/month for full-access users
- **Realistic cost for 50-host team with 50GB/day logs**: ~$2,000-4,000/month

---

## Side-by-Side Comparison

| | OSS (OTEL + Grafana) | Datadog | New Relic |
|---|---|---|---|
| **Setup time** | 1-3 days | 30 minutes | 1-2 hours |
| **Operational burden** | High | None | None |
| **Cost (50 hosts, 50GB/day logs)** | $700/month | $12,000+/month | $3,000/month |
| **Vendor lock-in** | None | High | Medium |
| **APM quality** | Good (Grafana/Tempo) | Best-in-class | Very good |
| **AI/anomaly detection** | Manual/limited | Excellent (Watchdog) | Good |
| **Free tier** | Self-hosted only | None | 100GB/month |
| **OpenTelemetry support** | Native | Good (via OTLP) | Excellent |

---

## Decision Framework

### Choose OSS (OpenTelemetry + Grafana) when:
- **Cost is a primary constraint** — at scale, OSS is 10-20x cheaper than commercial
- **Data sovereignty matters** — regulated industries, GDPR, data residency requirements
- **Your team has SRE/DevOps capacity** — managing the stack requires ongoing effort
- **You want OpenTelemetry portability** — instrument once, switch backends later

### Choose Datadog when:
- **You need the best APM** — Datadog's distributed tracing and service maps are genuinely superior
- **Time-to-value matters** — 30-minute setup, auto-discovery, minimal configuration
- **You're a mature team with budget** — Datadog's cost is justified for teams where downtime is expensive
- **Security + observability integration** — Datadog's CSPM and SIEM are best-in-class

### Choose New Relic when:
- **You want commercial observability at lower cost** — consumption pricing is predictable and cheaper than Datadog
- **Small to medium team** — the free tier is genuinely useful; you can stay free longer
- **Full-stack coverage** — New Relic covers browser, mobile, and synthetic monitoring with one platform
- **OpenTelemetry first** — New Relic's OTLP support is excellent; no proprietary agent required

---

## The 2026 Recommendation

**Start with New Relic's free tier.** 100GB/month is enough to cover a small production service with meaningful coverage. When you outgrow it, you'll have learned what your data volume actually looks like and can make an informed budget decision.

**Scale to OSS if cost is your constraint** — when you hit $2,000-3,000/month on New Relic, the OSS stack starts paying for itself within 3-6 months. The operational overhead is real but manageable with modern infrastructure tools (Helm charts, Terraform modules for Grafana stacks).

**Pay for Datadog if APM quality is critical** — if you're debugging complex distributed systems and need the best possible trace correlation, service maps, and anomaly detection, Datadog's price premium is defensible. Calculate your actual bill with Datadog's pricing calculator before committing.

The key insight for 2026: **instrument with OpenTelemetry regardless of your backend choice**. OTEL is the standard; it gives you the freedom to swap backends without re-instrumenting your application.

---

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana LGTM Stack](https://grafana.com/go/grafana-lgtm-stack/)
- [Datadog Pricing Calculator](https://www.datadoghq.com/pricing/)
- [New Relic Pricing](https://newrelic.com/pricing)
- [OpenTelemetry Node.js SDK](https://opentelemetry.io/docs/languages/js/)
- [Grafana Alloy (next-gen collector)](https://grafana.com/docs/alloy/latest/)
