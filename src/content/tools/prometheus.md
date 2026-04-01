---
title: "Prometheus — Time-Series Monitoring & Alerting"
description: "Prometheus is the open-source monitoring system and time-series database powering cloud-native observability. Pull-based metrics scraping, PromQL, and built-in alerting make it the backbone of Kubernetes monitoring."
category: "Monitoring"
pricing: "Open Source"
pricingDetail: "Free and open source (Apache 2.0). Managed options: Grafana Cloud, AWS AMP, Google Cloud Managed Prometheus."
website: "https://prometheus.io"
github: "https://github.com/prometheus/prometheus"
tags: ["monitoring", "metrics", "time-series", "kubernetes", "alerting", "open-source", "devops", "sre"]
pros:
  - "Pull-based scraping: Prometheus controls what it monitors — no agent sprawl"
  - "PromQL: powerful functional query language purpose-built for time-series math"
  - "Native Kubernetes service discovery — auto-discovers pods, services, endpoints"
  - "Huge ecosystem: 800+ official and community exporters for any system"
  - "Alertmanager: deduplication, grouping, silencing, and multi-channel routing"
cons:
  - "Single-node storage doesn't scale horizontally (use Thanos or Mimir for HA)"
  - "No built-in long-term storage — data retention limited by local disk"
  - "PromQL has a steep learning curve for complex aggregations"
  - "High-cardinality labels can cause performance issues (cardinality explosion)"
date: "2026-04-01"
---

## What is Prometheus?

Prometheus is an open-source monitoring system originally built at SoundCloud and now a CNCF graduated project. It scrapes metrics from your services at regular intervals, stores them as time-series data, and lets you query and alert on them using PromQL. It's the default metrics backend for Kubernetes and the foundation of most modern observability stacks.

## How Prometheus Works

Unlike push-based systems (StatsD, Graphite), Prometheus **pulls** metrics. Your services expose an HTTP endpoint (usually `/metrics`) in the Prometheus text format, and Prometheus scrapes it on a schedule.

```python
# Python — expose metrics with prometheus_client
from prometheus_client import Counter, start_http_server

REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])

@app.route('/api/users')
def get_users():
    REQUEST_COUNT.labels(method='GET', endpoint='/api/users').inc()
    # ... handler logic
```

```bash
# What Prometheus sees at /metrics
http_requests_total{method="GET",endpoint="/api/users"} 1423
```

## Key Features

### PromQL — The Query Language

```promql
# HTTP error rate over last 5 minutes
rate(http_requests_total{status=~"5.."}[5m])

# P99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Alert: service down for 2+ minutes
up{job="my-service"} == 0
```

PromQL treats every metric as a time-series vector. Filter by labels, apply rate/increase/histogram functions, aggregate across instances.

### Kubernetes Service Discovery

```yaml
# prometheus.yml — auto-discover all Kubernetes services
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

Add `prometheus.io/scrape: "true"` to pod annotations — Prometheus finds and scrapes it automatically.

### Alertmanager

Alertmanager handles deduplication, grouping, and routing. Multiple alert instances for the same issue get grouped into one notification. Route by severity to PagerDuty, Slack, or email with inhibition rules to suppress dependent alerts.

### Exporters Ecosystem

| Exporter | What it monitors |
|----------|-----------------|
| Node Exporter | Linux host metrics (CPU, memory, disk, network) |
| kube-state-metrics | Kubernetes object state |
| Blackbox Exporter | External endpoints (HTTP, DNS, TCP probes) |
| MySQL/Postgres Exporter | Database performance metrics |
| Redis Exporter | Redis queue depth, hit rate, memory |

## Scaling Beyond Single Node

For production at scale, pair Prometheus with:
- **Thanos** — HA, deduplication, S3-backed long-term storage
- **Grafana Mimir** — horizontally scalable Prometheus-compatible TSDB
- **VictoriaMetrics** — high-performance drop-in replacement

## Best For

- Kubernetes clusters (it's the default monitoring stack with kube-prometheus-stack Helm chart)
- Microservice architectures needing per-service SLI/SLO tracking
- SRE teams building error budgets and burn rate alerts
- Any team adopting the Grafana/Prometheus/Loki/Tempo observability stack
