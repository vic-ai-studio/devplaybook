---
title: "Prometheus & Grafana Monitoring Stack: Setup & Alerting Guide"
description: "Prometheus and Grafana monitoring stack guide: Docker Compose setup, scrape configs, PromQL queries, Grafana dashboards, Alertmanager rules, and Kubernetes monitoring with kube-prometheus."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Prometheus", "Grafana", "monitoring", "observability", "PromQL", "alerting", "Kubernetes"]
readingTime: "11 min read"
category: "devops"
---

Prometheus and Grafana have become the standard observability stack for cloud-native applications. Prometheus scrapes metrics from your services and stores them in a time-series database. Grafana visualizes those metrics in dashboards and routes alerts to your team. Together they provide the core pillars of the observability loop: collect, visualize, alert.

## Quick Start with Docker Compose

The fastest way to get the full stack running locally is Docker Compose:

```yaml
# docker-compose.yml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.4.0
    container_name: grafana
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://grafana.yourdomain.com
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:v1.7.0
    container_name: node-exporter
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|run)($$|/)'
    ports:
      - "9100:9100"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

Run `docker compose up -d` and you have Prometheus on port 9090, Grafana on port 3000, and Alertmanager on port 9093.

## Prometheus Scrape Configuration

The `prometheus.yml` file defines which targets Prometheus scrapes:

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "rules/*.yml"

scrape_configs:
  # Prometheus self-monitoring
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  # Host metrics via node exporter
  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]

  # Application services
  - job_name: "api-server"
    metrics_path: /metrics
    scrape_interval: 10s
    static_configs:
      - targets: ["api:8000"]
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        regex: '([^:]+)(?::\d+)?'
        replacement: '${1}'

  # Kubernetes service discovery (when running in cluster)
  - job_name: "kubernetes-pods"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

Annotate your Kubernetes pods to opt them into scraping:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8000"
    prometheus.io/path: "/metrics"
```

## Instrumenting Your Application

Use the official Prometheus client library to expose metrics from your code:

```python
# Python / FastAPI example
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import FastAPI, Response
import time

app = FastAPI()

# Define metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

ACTIVE_USERS = Gauge("active_users_total", "Currently active users")

@app.middleware("http")
async def metrics_middleware(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status_code=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

## PromQL: Querying Your Data

PromQL (Prometheus Query Language) is the SQL of metrics. Here are the essential patterns:

```promql
# Request rate over the last 5 minutes (per second)
rate(http_requests_total[5m])

# Error rate as a percentage
100 * (
  sum(rate(http_requests_total{status_code=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
)

# 99th percentile latency
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint))

# CPU usage by pod in Kubernetes
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod, namespace)

# Memory usage as percentage of limit
(container_memory_working_set_bytes / container_spec_memory_limit_bytes) * 100

# Pods not in Running state
count(kube_pod_status_phase{phase!="Running"} == 1) by (namespace, phase)
```

The `rate()` function is fundamental — it calculates the per-second rate of increase of a counter over a time window. Always use `rate()` for counters, never raw counter values in graphs.

## Alerting Rules

Define alert rules in YAML files under your `rules/` directory:

```yaml
# prometheus/rules/api-alerts.yml
groups:
  - name: api.rules
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"
          runbook: "https://wiki.company.com/runbooks/high-error-rate"

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
          ) > 2.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High p99 latency on {{ $labels.endpoint }}"
          description: "p99 latency is {{ $value }}s"

      # Pod not running
      - alert: PodNotRunning
        expr: kube_pod_status_phase{phase!~"Running|Succeeded"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.pod }} is not running"
```

The `for` clause prevents flapping — an alert only fires if the condition is true continuously for the specified duration.

## Alertmanager Configuration

Alertmanager routes alerts to the right destination:

```yaml
# alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

route:
  group_by: ["alertname", "team"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: "default"
  routes:
    - matchers:
        - severity = critical
      receiver: "pagerduty-critical"
      continue: true
    - matchers:
        - team = backend
      receiver: "slack-backend"

receivers:
  - name: "default"
    slack_configs:
      - channel: "#alerts"
        title: "{{ .GroupLabels.alertname }}"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"

  - name: "pagerduty-critical"
    pagerduty_configs:
      - service_key: "YOUR_PAGERDUTY_SERVICE_KEY"

  - name: "slack-backend"
    slack_configs:
      - channel: "#backend-alerts"
        send_resolved: true

inhibit_rules:
  - source_matchers:
      - severity = critical
    target_matchers:
      - severity = warning
    equal: ["alertname"]
```

Inhibition rules prevent alert spam — when a critical alert fires, related warning alerts are silenced.

## Kubernetes Monitoring with kube-prometheus-stack

For Kubernetes environments, the `kube-prometheus-stack` Helm chart installs everything pre-configured:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=your-secure-password \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi
```

This installs Prometheus, Grafana, Alertmanager, node-exporter, kube-state-metrics, and a set of pre-built dashboards for Kubernetes cluster health — all with working alert rules out of the box.

Access Grafana at the LoadBalancer IP or through a port-forward:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

The pre-built dashboards include Kubernetes cluster overview, node metrics, namespace-level resource usage, and persistent volume monitoring. Import additional community dashboards from `grafana.com/grafana/dashboards` using their ID numbers directly in the Grafana UI.

A complete Prometheus + Grafana stack gives you the data you need to answer the four key questions of production operations: Is my system available? Is it performing within SLA? What is causing any degradation? And what has changed since the last time things were healthy?
