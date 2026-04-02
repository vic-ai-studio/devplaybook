---
title: "Grafana Loki — Log Aggregation System for Cloud-Native Apps"
description: "Grafana Loki is the horizontally scalable, multi-tenant log aggregation system inspired by Prometheus. It stores logs as streams indexed only by labels, making it cost-effective for Kubernetes logging at scale."
category: "Observability"
pricing: "Free / Open Source"
pricingDetail: "Loki OSS is free (AGPL-3.0). Grafana Cloud includes Loki with a generous free tier (50GB/month). Enterprise edition available."
website: "https://grafana.com/oss/loki"
github: "https://github.com/grafana/loki"
tags: ["observability", "logging", "kubernetes", "grafana", "devops", "cloud-native", "log-aggregation"]
pros:
  - "Cost-effective: no full-text indexing — indexes only labels, stores raw log streams cheaply in object storage"
  - "Prometheus-like: LogQL query language mirrors PromQL — familiar for Prometheus users"
  - "Native Kubernetes: Promtail agent auto-discovers Kubernetes pods via labels"
  - "Deep Grafana integration: correlate logs, metrics, and traces in one UI"
  - "Horizontally scalable: microservices mode handles petabytes of logs"
cons:
  - "No full-text index: substring searches across large volumes are slow (vs Elasticsearch)"
  - "LogQL is less expressive than Elasticsearch's query language for complex analysis"
  - "Requires careful label design — high-cardinality labels cause performance issues"
  - "Complex cluster deployment: separate ingesters, distributors, queriers, compactors"
date: "2026-04-02"
---

## What is Grafana Loki?

Grafana Loki is a log aggregation system inspired by Prometheus. Unlike Elasticsearch which indexes the full text of every log message, Loki only indexes the *labels* (metadata) attached to log streams. The actual log content is stored compressed in object storage (S3, GCS, Azure Blob).

This approach makes Loki dramatically cheaper than Elasticsearch at scale — typically 10x lower cost for equivalent log volumes.

## Quick Start

```bash
# Docker Compose setup for local development
cat > docker-compose.yml << 'EOF'
version: "3"
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
EOF

docker-compose up -d
```

## Promtail: Log Shipping Agent

Promtail is the official Loki log shipping agent, designed for Kubernetes:

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Kubernetes pod logs (auto-discovers via labels)
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    pipeline_stages:
      - docker: {}  # Parse Docker JSON log format
      - labels:
          stream: stream  # Add stream label from log metadata
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: node_name
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
```

## LogQL: Querying Logs

LogQL is Loki's query language, inspired by PromQL:

```logql
# Find all error logs from payments service
{namespace="production", app="payments-service"} |= "error"

# Count errors per minute
sum(rate({app="payments-service"} |= "error" [1m])) by (pod)

# Parse structured JSON logs and filter
{app="payments-service"}
  | json
  | level="error"
  | line_format "{{.timestamp}} {{.message}}"

# Top 10 most common error messages
topk(10,
  sum by (message) (
    count_over_time({app="payments-service"} |= "error" | json | line_format "{{.message}}" [1h])
  )
)

# Pattern matching for slow requests
{app="api-gateway"}
  | regexp `duration=(?P<duration>\d+)ms`
  | duration > 1000
```

## Kubernetes Deployment via Helm

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Loki stack (Loki + Promtail)
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --create-namespace \
  --set promtail.enabled=true \
  --set grafana.enabled=true \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=50Gi
```

## Label Design Best Practices

Loki performance depends critically on label cardinality:

```yaml
# GOOD: low cardinality labels
labels:
  app: "payments-service"   # ~10 services
  env: "production"         # ~3 values
  namespace: "prod"         # ~5 namespaces
  pod: "payments-abc123"    # Number of replicas — OK

# BAD: high cardinality labels
labels:
  user_id: "12345"          # Millions of unique values — NEVER
  trace_id: "abc-def-123"   # Unique per request — NEVER
  request_body: "..."       # Arbitrary text — NEVER
```

Rule: label values should have < 1000 unique values. High-cardinality data belongs in the *log message*, not labels.

## Log Pipeline Stages

Transform logs during ingestion:

```yaml
pipeline_stages:
  # Parse JSON logs
  - json:
      expressions:
        level: level
        msg: message
        duration: request_duration_ms

  # Add labels from parsed fields
  - labels:
      level:
      service:

  # Drop debug logs in production
  - drop:
      source: level
      value: debug

  # Add static labels
  - static_labels:
      environment: production

  # Metrics from logs (requires Prometheus)
  - metrics:
      request_duration_milliseconds:
        type: Histogram
        description: "request duration in ms"
        source: duration
        config:
          buckets: [100, 250, 500, 1000, 2500, 5000]
```

## Grafana Integration

In Grafana, configure Loki as a data source and use it with Explore or dashboards:

```
# Grafana data source URL
http://loki:3100

# Correlate logs with traces
# In Explore: select a log line → jump to Jaeger/Tempo trace
```

Grafana's "Explore" view lets you run LogQL queries interactively, which is the best way to investigate incidents by correlating metrics (Prometheus), logs (Loki), and traces (Jaeger/Tempo) in one interface.
