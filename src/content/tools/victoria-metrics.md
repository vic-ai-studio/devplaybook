---
title: "VictoriaMetrics — High-Performance Time Series Database"
description: "VictoriaMetrics is a fast, cost-effective time series database and monitoring solution. It's a drop-in Prometheus replacement with 10x better compression, lower memory use, and a Prometheus-compatible API."
category: "Observability"
pricing: "Free / Open Source"
pricingDetail: "VictoriaMetrics Community is free (Apache 2.0). Enterprise adds cluster mode, multi-tenancy, and anomaly detection."
website: "https://victoriametrics.com"
github: "https://github.com/VictoriaMetrics/VictoriaMetrics"
tags: ["observability", "metrics", "prometheus", "time-series", "monitoring", "kubernetes", "devops"]
pros:
  - "Prometheus-compatible: drop-in replacement, same PromQL queries and Grafana integration"
  - "10x better compression: dramatically lower storage costs than Prometheus"
  - "High cardinality: handles millions of unique time series without performance degradation"
  - "Fast ingestion: handles 1M+ metrics/sec on commodity hardware"
  - "Simple operation: single binary, minimal configuration, no ZooKeeper/Kafka dependencies"
cons:
  - "Less community resources than Prometheus (smaller ecosystem)"
  - "Cluster version requires enterprise license for some features"
  - "MetricsQL extensions add non-standard syntax that can create vendor lock-in"
  - "Alerting requires vmalert — less mature than Prometheus Alertmanager"
date: "2026-04-02"
---

## What is VictoriaMetrics?

VictoriaMetrics is a time series database designed as a high-performance, cost-efficient replacement for Prometheus. Created by Valyala (author of fasthttp), it uses a custom storage engine that achieves dramatically better compression and query performance than Prometheus's native storage.

Key use cases:
- Long-term Prometheus storage (Prometheus writes to VictoriaMetrics via remote_write)
- High-cardinality metrics workloads that Prometheus struggles with
- Replacing Thanos/Cortex for multi-site Prometheus federation
- Cost reduction for large-scale metrics infrastructure

## Quick Start

```bash
# Single node (simplest setup)
docker run -it --rm \
  -v $(pwd)/victoria-metrics-data:/victoria-metrics-data \
  -p 8428:8428 \
  victoriametrics/victoria-metrics:latest

# Write a metric
curl -d 'metric{job="test"} 1.23' \
  http://localhost:8428/api/v1/import/prometheus

# Query via PromQL
curl "http://localhost:8428/api/v1/query?query=metric"
```

## Prometheus Integration

Use VictoriaMetrics as long-term Prometheus storage:

```yaml
# prometheus.yml
remote_write:
  - url: http://victoriametrics:8428/api/v1/write
    queue_config:
      max_samples_per_send: 10000
      capacity: 20000

# VictoriaMetrics handles deduplication if multiple Prometheus instances write
```

Or replace Prometheus entirely with vmagent:

```yaml
# vmagent-config.yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

# vmagent writes directly to VictoriaMetrics
remoteWrite:
  - url: http://victoriametrics:8428/api/v1/write
```

## Kubernetes Deployment

```bash
# Helm installation
helm repo add vm https://victoriametrics.github.io/helm-charts
helm repo update

# Single node (simpler)
helm install victoria-metrics vm/victoria-metrics-single \
  --namespace monitoring \
  --set server.persistentVolume.size=50Gi \
  --set server.retentionPeriod=90d

# Cluster mode (for high availability)
helm install victoria-metrics vm/victoria-metrics-cluster \
  --namespace monitoring
```

## MetricsQL Extensions

VictoriaMetrics extends PromQL with MetricsQL, adding useful functions:

```promql
# Keep last known value (no stale markers)
default_rollup(metric_name[1h])

# Median instead of mean (robust to outliers)
quantile(0.5, metric_name)

# Running maximum over time
running_max(metric_name[1h])

# Duration of a condition being true
duration_over_time(metric_name > 100, 5m)

# Standard PromQL still works:
rate(http_requests_total[5m])
sum by (service) (http_request_duration_seconds_bucket)
```

## Compression and Storage

VictoriaMetrics achieves 10x better compression vs Prometheus:

| Metric | Prometheus | VictoriaMetrics |
|--------|-----------|-----------------|
| Compression ratio | ~3x | ~30x |
| Disk usage (1B samples) | ~700MB | ~70MB |
| Query latency | Baseline | 2-5x faster |
| High cardinality (>5M series) | Struggles | Handles well |

This translates to dramatic cost savings for large-scale deployments.

## vmalert: Alerting Rules

```yaml
# alerting-rules.yaml
groups:
  - name: node_alerts
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High CPU on {{ $labels.instance }}"
          description: "CPU above 90% for 5 minutes"
```

```bash
# Run vmalert
vmalert \
  -rule=./alerting-rules.yaml \
  -datasource.url=http://victoriametrics:8428 \
  -notifier.url=http://alertmanager:9093
```

## Grafana Configuration

VictoriaMetrics works with Grafana as a Prometheus data source:

```
URL: http://victoriametrics:8428
# Or for cluster mode query node:
URL: http://vmselect:8481/select/0/prometheus
```

VictoriaMetrics is the best choice when you need Prometheus compatibility but are hitting performance or cost limits. Teams running 10M+ active time series or needing > 1 year retention typically see 5-10x cost reduction by switching.
