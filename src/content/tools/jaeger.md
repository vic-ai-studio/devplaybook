---
title: "Jaeger — Distributed Tracing for Microservices"
description: "Jaeger is the open-source distributed tracing platform by Uber, now a CNCF graduated project. It tracks requests across microservices to identify performance bottlenecks and diagnose complex failures."
category: "Observability"
pricing: "Free / Open Source"
pricingDetail: "Jaeger is 100% free and open-source (Apache 2.0). CNCF graduated project. Jaeger as a Service available via Grafana Cloud and others."
website: "https://www.jaegertracing.io"
github: "https://github.com/jaegertracing/jaeger"
tags: ["observability", "distributed-tracing", "microservices", "cncf", "opentelemetry", "performance", "devops"]
pros:
  - "Native OpenTelemetry support: accept OTLP traces directly from OTEL SDKs"
  - "Rich UI: flame graphs, service dependency maps, comparative trace analysis"
  - "Multiple storage backends: Elasticsearch, OpenSearch, Cassandra, Badger (local)"
  - "Adaptive sampling: dynamically adjust sampling rates based on traffic"
  - "Service dependency visualization: automatically maps microservice relationships"
cons:
  - "Metrics and logs not included — traces only (use with Prometheus and Loki for full stack)"
  - "Requires infrastructure for storage backend at production scale"
  - "UI becomes slow with very high trace volumes"
  - "Deployment complexity increases significantly at large scale"
date: "2026-04-02"
---

## What is Jaeger?

Jaeger was created by Uber Engineering in 2015 to trace requests across their massive microservices architecture. Open-sourced in 2017, donated to CNCF, and graduated in 2019, it's now one of the most widely deployed distributed tracing systems.

Jaeger answers: "What happened to request X as it traveled through 15 microservices and took 3 seconds?"

## Quick Start

```bash
# All-in-one Docker (for local development)
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \  # UI
  -p 4317:4317 \    # OTLP gRPC
  -p 4318:4318 \    # OTLP HTTP
  jaegertracing/all-in-one:latest

# Open UI
open http://localhost:16686
```

## Sending Traces to Jaeger

With OpenTelemetry SDK:

```javascript
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const traceExporter = new OTLPTraceExporter({
  url: 'http://jaeger:4317',  // OTLP gRPC
});
```

```bash
# Environment variable approach
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317 \
OTEL_SERVICE_NAME=payments-service \
node server.js
```

## Kubernetes Deployment

```bash
# Install Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/latest/download/jaeger-operator.yaml -n observability

# Deploy Jaeger instance (simple in-memory, for development)
cat <<EOF | kubectl apply -f -
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: simplest
spec:
  strategy: allInOne
  allInOne:
    options:
      log-level: debug
  storage:
    type: memory
    options:
      memory:
        max-traces: 100000
EOF
```

For production with Elasticsearch:

```yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: production-jaeger
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: https://elasticsearch:9200
        index-prefix: jaeger
  ingress:
    enabled: true
```

## Trace Sampling

Jaeger supports multiple sampling strategies:

```yaml
# sampling-strategies.json
{
  "service_strategies": [
    {
      "service": "payments-service",
      "type": "probabilistic",
      "param": 1.0  # 100% - always sample (low volume critical service)
    },
    {
      "service": "user-service",
      "type": "probabilistic",
      "param": 0.1  # 10% - high volume service
    }
  ],
  "default_strategy": {
    "type": "probabilistic",
    "param": 0.05  # 5% default
  }
}
```

Adaptive sampling adjusts rates dynamically:

```yaml
# Adaptive sampling configuration
sampling:
  strategies-file: /etc/jaeger/sampling.json
  strategies-max-ttl: 30s
```

## Service Dependency Map

Jaeger automatically builds a service dependency map from traces. Access it via the UI at `/dependencies` — it shows:

- Which services call which services
- Call rates between services
- Services with the highest error rates

This is invaluable for understanding blast radius during incidents and for architecture review.

## Comparing Traces

One of Jaeger's most useful features: compare two traces side-by-side:

1. Find a slow trace for a request
2. Find a fast trace for the same operation
3. Use "Compare Traces" to see exactly which span accounts for the difference

This is the most efficient way to diagnose performance regressions.

## Jaeger vs Zipkin vs Tempo

| Feature | Jaeger | Zipkin | Grafana Tempo |
|---------|--------|--------|---------------|
| OTLP support | ✅ | Partial | ✅ |
| Storage options | Multiple | Multiple | Object storage |
| UI | Excellent | Good | Via Grafana |
| Scalability | Good | Limited | Very high |
| Cloud integration | Self-hosted | Self-hosted | Grafana Cloud |
| Best for | On-prem K8s | Simple setups | Grafana stack |

Use Jaeger when you want a standalone distributed tracing system with an excellent UI and don't want to commit to the full Grafana stack.
