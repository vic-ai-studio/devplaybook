---
title: "Grafana Tempo — Scalable Distributed Tracing Backend"
description: "Grafana Tempo is the high-scale, cost-effective distributed tracing backend. It stores traces in object storage (S3, GCS) with no index, making it 10x cheaper than Elasticsearch-based tracing at scale."
category: "Observability"
pricing: "Free / Open Source"
pricingDetail: "Tempo OSS is free (AGPL-3.0). Grafana Cloud includes Tempo with free tier (50GB traces/month). Enterprise edition available."
website: "https://grafana.com/oss/tempo"
github: "https://github.com/grafana/tempo"
tags: ["observability", "distributed-tracing", "grafana", "opentelemetry", "kubernetes", "cloud-native", "devops"]
pros:
  - "No index — stores traces directly in object storage at very low cost (10x cheaper than Jaeger+ES)"
  - "Seamlessly integrates with Grafana for trace + metric + log correlation"
  - "Native OTLP support: receives traces from any OpenTelemetry-instrumented service"
  - "TraceQL: powerful query language for searching traces by attributes"
  - "Service graph metrics: automatically derives RED metrics from trace data"
cons:
  - "No standalone UI — requires Grafana for visualization"
  - "Trace search across all traces requires expensive full-scan (improved with TraceQL but still slower than Jaeger for ad-hoc search)"
  - "More complex to operate than Jaeger at small scale"
  - "Best value as part of Grafana stack — less useful standalone"
date: "2026-04-02"
---

## What is Grafana Tempo?

Grafana Tempo is a distributed tracing backend designed for high scale and low cost. Like Loki's approach to logs, Tempo stores traces directly in object storage without indexing trace content. Instead, traces are looked up by Trace ID — making it extremely storage-efficient.

Tempo is the tracing component of the Grafana observability stack (Loki for logs, Mimir/Prometheus for metrics, Tempo for traces, Grafana for visualization).

## Quick Start

```bash
# Docker Compose with full Grafana stack
cat > docker-compose.yml << 'EOF'
version: "3"
services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo.yaml:/etc/tempo.yaml
      - tempo-data:/tmp/tempo
    ports:
      - "3200:3200"   # Tempo UI (via Grafana)
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/ds.yaml

volumes:
  tempo-data:
EOF
```

## Tempo Configuration

```yaml
# tempo.yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: "0.0.0.0:4317"
        http:
          endpoint: "0.0.0.0:4318"

ingester:
  max_block_duration: 5m

compactor:
  compaction:
    block_retention: 48h  # How long to keep traces

storage:
  trace:
    backend: local  # Use s3 for production
    local:
      path: /tmp/tempo/blocks
    wal:
      path: /tmp/tempo/wal

# For production with S3:
# storage:
#   trace:
#     backend: s3
#     s3:
#       bucket: my-tempo-traces
#       region: us-east-1
```

## TraceQL: Querying Traces

Tempo's TraceQL is a trace query language for finding traces by span attributes:

```traceql
# Find slow payments
{ .service.name = "payments-service" && duration > 1s }

# Find traces with errors
{ status = error }

# Find database calls slower than 500ms
{ span.db.system = "postgresql" && duration > 500ms }

# Find traces with specific HTTP status codes
{ .http.status_code = 500 }

# Complex query: find user checkout flows with payment errors
{ .service.name = "checkout-service" } && { .service.name = "payments-service" && status = error }
```

## Grafana Integration

Configure Tempo as a Grafana data source:

```yaml
# grafana-datasources.yaml
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      httpMethod: GET
      serviceMap:
        datasourceUid: prometheus  # For service graph
      nodeGraph:
        enabled: true
      lokiSearch:
        datasourceUid: loki  # Jump from traces to logs
```

In Grafana Explore:
1. Query traces with TraceQL
2. Click a trace to view flame graph
3. Click a span with `log.trace_id` to jump to related logs in Loki
4. Click a service in the service graph to view Prometheus RED metrics

This correlation — moving seamlessly between metrics, logs, and traces — is Tempo's primary value proposition.

## Service Graph Metrics

Tempo can automatically generate service graph metrics (request rate, error rate, duration) from trace data:

```yaml
# tempo.yaml
metrics_generator:
  registry:
    external_labels:
      source: tempo
  storage:
    path: /tmp/tempo/generator/wal
    remote_write:
      - url: http://prometheus:9090/api/v1/write
  processors:
    - service-graphs
    - span-metrics
```

This creates Prometheus metrics like:
- `traces_service_graph_request_total{client, server, status_code}`
- `traces_service_graph_request_duration_seconds{client, server}`
- `traces_spanmetrics_duration_seconds{service, span_name, status_code}`

## Kubernetes Deployment

```bash
# Helm installation
helm repo add grafana https://grafana.github.io/helm-charts
helm install tempo grafana/tempo \
  --namespace monitoring \
  --set tempo.storage.trace.backend=s3 \
  --set tempo.storage.trace.s3.bucket=my-tempo-traces \
  --set tempo.storage.trace.s3.region=us-east-1
```

Tempo is the right choice when you're already using Grafana for metrics and Loki for logs — it completes the observability stack with minimal additional infrastructure cost.
