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

## Concrete Use Case: Building an Incident Response Dashboard Correlating Metrics, Logs, and Traces

An SRE team at a mid-size e-commerce company (running 40 microservices on Kubernetes) faces a recurring problem during incidents: engineers scramble between Prometheus for metrics, `kubectl logs` for container output, and Jaeger for traces, losing critical minutes piecing together the timeline. The team decides to build a unified incident response dashboard in Grafana that correlates all three signals in a single view, backed by the Grafana LGTM stack — Mimir for metrics, Loki for logs, and Tempo for traces.

The dashboard is organized into four rows. The top row shows the "golden signals" — request rate, error rate, and p99 latency — pulled from Mimir via PromQL, with template variables for service name and environment so the on-call engineer can instantly scope to the affected service. The second row displays Loki log panels filtered to `level=error` for the selected service, with a derived field configuration that extracts trace IDs from structured log lines and links them directly to Tempo. When an engineer sees an error log entry, they click the trace ID and Grafana opens the full distributed trace in a side panel — no context switching, no copying IDs between tools. The third row shows infrastructure metrics (CPU, memory, pod restarts) from the Kubernetes mixin dashboards, and the fourth row contains an annotation overlay that marks deployment events (pulled from a webhook triggered by ArgoCD) so the team can immediately see if an incident correlates with a recent rollout.

The impact is significant: mean time to identify root cause drops from 25 minutes to 8 minutes in the first quarter after deployment. The team provisions all dashboards via Grafonnet stored in a git repository, so every panel definition is version-controlled and reviewed via pull request. Alert rules are defined in the same repository using Grafana's file-based provisioning, routing critical alerts to PagerDuty and warning-level alerts to a dedicated Slack channel. The entire observability stack runs on Grafana Cloud's Pro tier at roughly $1,200/month — a fraction of what equivalent Datadog or New Relic pricing would cost for their cardinality and log volume.

## When to Use Grafana

**Use Grafana when:**
- You need to visualize metrics, logs, and traces from multiple data sources in a single, unified dashboard
- You are building an observability stack and want a vendor-neutral visualization layer that works with Prometheus, Loki, Tempo, InfluxDB, Elasticsearch, CloudWatch, and 80+ other sources
- You want dashboard-as-code workflows where all panel definitions and alert rules are version-controlled in git
- Your team needs unified alerting that can route notifications to Slack, PagerDuty, OpsGenie, email, or webhooks based on severity and label matching
- You want a cost-effective alternative to commercial observability platforms while retaining full control over your data and retention policies

**When NOT to use Grafana:**
- You need a fully managed, zero-configuration observability platform and are willing to pay premium pricing — Datadog or New Relic provide a more integrated out-of-the-box experience
- Your team has no dedicated metrics infrastructure (no Prometheus, no InfluxDB) and you need Grafana to also store data — Grafana is a visualization layer, not a storage engine
- You are looking for application performance monitoring (APM) with automatic instrumentation, code-level profiling, and dependency mapping — dedicated APM tools provide deeper application-level insights
- You have a very small team with a single application where a simpler monitoring tool like Uptime Kuma or a cloud provider's built-in dashboards (CloudWatch, GCP Monitoring) would suffice
