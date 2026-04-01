---
title: "Grafana — Metrics Dashboards & Observability Visualization"
description: "Grafana is the open-source standard for metrics visualization and observability dashboards. Connect any data source — Prometheus, Loki, Tempo, CloudWatch, Datadog — and build real-time dashboards with alerting."
category: "Monitoring"
pricing: "Open Source / Cloud"
pricingDetail: "Open Source (AGPL). Grafana Cloud free tier (10k metrics, 50GB logs). Pro from $8/month. Enterprise self-hosted available."
website: "https://grafana.com"
github: "https://github.com/grafana/grafana"
tags: ["monitoring", "observability", "dashboards", "metrics", "alerting", "prometheus", "loki", "open-source"]
pros:
  - "Connects to 80+ data sources: Prometheus, Loki, Tempo, InfluxDB, PostgreSQL, CloudWatch, and more"
  - "Drag-and-drop dashboard builder; hundreds of community dashboards on grafana.com"
  - "Unified alerting: route alerts to PagerDuty, Slack, email, webhooks"
  - "Grafana Stack (LGTM): Loki (logs), Grafana (viz), Tempo (traces), Mimir (metrics) — full observability"
  - "Dashboard-as-code with Grafonnet/JSON; version control your dashboards"
cons:
  - "Dashboard config can drift without proper IaC discipline"
  - "Grafana Cloud can get expensive at high cardinality/volume"
  - "No built-in metric storage — needs Prometheus or Mimir behind it"
  - "Alert evaluation at scale requires careful resource planning"
date: "2026-04-01"
---

## What is Grafana?

Grafana is the de-facto standard for building observability dashboards. It doesn't store data itself — it connects to your existing data sources and provides a powerful visualization layer. Need to correlate CPU spikes with slow API responses and error log bursts? Grafana lets you do that across multiple data sources in a single dashboard.

## Quick Start with Docker

```yaml
# docker-compose.yml — Grafana + Prometheus stack
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana
    ports: ["3000:3000"]
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on: [prometheus]
```

Access Grafana at `http://localhost:3000`, add Prometheus as a data source, and import dashboard ID `1860` (Node Exporter Full) from grafana.com.

## Key Features

### Multi-Source Dashboards

Mix data from different sources in one dashboard. Plot Prometheus metrics next to CloudWatch logs next to a Postgres query — all in sync. Templating variables let users switch between environments, services, or time ranges dynamically.

### Unified Alerting

```yaml
# Alert rule example (via UI or Terraform)
alert: HighErrorRate
expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
for: 2m
annotations:
  summary: "Error rate {{ $value | humanizePercentage }} on {{ $labels.service }}"
```

Route alerts by severity to different notification channels. Mute windows prevent alert storms during planned maintenance.

### Explore Mode

Explore is Grafana's ad-hoc query interface — great for incident investigation. Switch between metrics (PromQL), logs (LogQL), and traces (TraceQL) without leaving the UI. Correlate a trace ID from a log line directly to a Tempo trace.

### Dashboard as Code

Export any dashboard to JSON and store it in git. Use Grafonnet (Jsonnet library) for programmatic dashboard generation. Provision dashboards automatically on startup via the `provisioning/` directory.

## Grafana Stack (LGTM)

| Component | Role |
|-----------|------|
| **Loki** | Log aggregation (like Elasticsearch, but cheaper) |
| **Grafana** | Visualization frontend |
| **Tempo** | Distributed tracing backend |
| **Mimir** | Horizontally scalable Prometheus-compatible metrics |

## Best For

- Engineering teams building their first observability stack (pair with Prometheus)
- Platform/SRE teams centralizing metrics from multiple cloud providers
- Incident response — correlate metrics, logs, and traces in one view
- Anyone who wants beautiful, shareable dashboards without a $2k/month SaaS bill
