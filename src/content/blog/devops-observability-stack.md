---
title: "The Modern DevOps Observability Stack: Grafana, Prometheus, Loki"
description: "Build a complete DevOps observability stack with Prometheus for metrics, Loki for logs, Tempo for traces, and Grafana dashboards—includes Docker Compose setup."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["devops", "observability", "prometheus", "grafana", "loki", "monitoring"]
readingTime: "11 min read"
category: "DevOps"
---

You cannot operate what you cannot observe. The Grafana stack—Prometheus, Loki, Tempo, and Grafana—has become the standard open-source observability solution for teams running containers and Kubernetes. It covers the three pillars of observability: **metrics**, **logs**, and **traces**.

This guide walks through what each component does, how they fit together, and how to get the full stack running with Docker Compose and Kubernetes.

## The Three Pillars of Observability

**Metrics** tell you what is happening—counters, gauges, and histograms that describe the state of your system at any point in time. "The API is processing 1,200 requests/second with a p99 latency of 340ms."

**Logs** tell you what happened—timestamped records of events, errors, and state transitions. "At 14:32:01, user 4892 failed authentication: invalid JWT signature."

**Traces** tell you why it happened—the distributed journey of a single request across multiple services. "This request took 1.2 seconds because it waited 900ms for the payments service to call the fraud API."

All three are necessary. Metrics surface the problem. Logs narrow the cause. Traces pinpoint it.

---

## Component Overview

### Prometheus — Metrics Collection

Prometheus is a time-series database that **scrapes** metrics from instrumented targets at configurable intervals. Applications expose a `/metrics` endpoint; Prometheus collects it.

Key concepts:
- **Scrape targets**: Services and infrastructure Prometheus polls for metrics
- **PromQL**: The query language for writing alerts and dashboards
- **Alert rules**: Expressions that fire when thresholds are crossed
- **Alertmanager**: Routes alerts to Slack, PagerDuty, email, etc.

### Loki — Log Aggregation

Loki is a horizontally scalable log aggregation system that **only indexes labels** (not log content). This makes it dramatically cheaper than Elasticsearch at the cost of full-text search speed. It's designed to work alongside Prometheus—you correlate metrics and logs by the same labels.

### Tempo — Distributed Tracing

Tempo is a high-scale distributed tracing backend. It accepts traces in OpenTelemetry, Jaeger, and Zipkin formats. Like Loki, it stores traces in object storage and queries them by trace ID—making it very cost-efficient for high-volume trace data.

### Grafana — Visualization and Dashboards

Grafana is the unified frontend for all three data sources. In 2026, Grafana Explore is the primary interface for ad-hoc investigation, while pre-built dashboards handle routine monitoring. Grafana Alerting manages alerts across all data sources from one interface.

---

## Docker Compose Setup

The fastest way to get the full stack running locally or on a single server:

```yaml
# docker-compose.yml
version: "3.8"

networks:
  observability:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
  tempo_data:

services:

  # ─── Prometheus ──────────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./config/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./config/alert_rules.yml:/etc/prometheus/alert_rules.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-remote-write-receiver'
    ports:
      - "9090:9090"
    networks:
      - observability

  # ─── Alertmanager ────────────────────────────────────────
  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    restart: unless-stopped
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    ports:
      - "9093:9093"
    networks:
      - observability

  # ─── Loki ────────────────────────────────────────────────
  loki:
    image: grafana/loki:3.0.0
    container_name: loki
    restart: unless-stopped
    volumes:
      - ./config/loki.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    ports:
      - "3100:3100"
    networks:
      - observability

  # ─── Promtail (log shipper) ───────────────────────────────
  promtail:
    image: grafana/promtail:3.0.0
    container_name: promtail
    restart: unless-stopped
    volumes:
      - ./config/promtail.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - observability

  # ─── Tempo ───────────────────────────────────────────────
  tempo:
    image: grafana/tempo:2.4.0
    container_name: tempo
    restart: unless-stopped
    volumes:
      - ./config/tempo.yml:/etc/tempo.yml:ro
      - tempo_data:/var/tempo
    command: -config.file=/etc/tempo.yml
    ports:
      - "3200:3200"   # Tempo API
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    networks:
      - observability

  # ─── Grafana ─────────────────────────────────────────────
  grafana:
    image: grafana/grafana:10.4.0
    container_name: grafana
    restart: unless-stopped
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro
      - ./config/grafana-dashboards.yml:/etc/grafana/provisioning/dashboards/dashboards.yml:ro
      - ./dashboards:/var/lib/grafana/dashboards:ro
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-changeme}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_FEATURE_TOGGLES_ENABLE=traceqlEditor
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
      - loki
      - tempo
    networks:
      - observability

  # ─── Node Exporter (host metrics) ────────────────────────
  node-exporter:
    image: prom/node-exporter:v1.7.0
    container_name: node-exporter
    restart: unless-stopped
    pid: host
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    networks:
      - observability
```

---

## Configuration Files

### Prometheus Configuration

```yaml
# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'local-dev'
    env: 'development'

rule_files:
  - /etc/prometheus/alert_rules.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'my-api'
    static_configs:
      - targets: ['my-api:8080']
    metrics_path: /metrics
    scrape_interval: 10s

  # Kubernetes pods with prometheus.io annotations
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
```

### Alert Rules

```yaml
# config/alert_rules.yml
groups:
- name: api_alerts
  interval: 30s
  rules:

  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
      /
      sum(rate(http_requests_total[5m])) by (service)
      > 0.05
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.service }}"
      description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.99,
        sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
      ) > 1.0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High p99 latency on {{ $labels.service }}"
      description: "p99 latency is {{ $value }}s"

  - alert: PodCrashLooping
    expr: rate(kube_pod_container_status_restarts_total[5m]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Pod {{ $labels.pod }} is crash looping"
```

### Grafana Data Sources Provisioning

```yaml
# config/grafana-datasources.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: 15s
      exemplarTraceIdDestinations:
        - datasourceUid: tempo
          name: trace_id

  - name: Loki
    type: loki
    uid: loki
    url: http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: '"traceId":"(\w+)"'
          name: TraceID
          url: '$${__value.raw}'

  - name: Tempo
    type: tempo
    uid: tempo
    url: http://tempo:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        filterByTraceID: true
      tracesToMetrics:
        datasourceUid: prometheus
      serviceMap:
        datasourceUid: prometheus
      search:
        hide: false
      nodeGraph:
        enabled: true
```

---

## Instrumenting Your Application

### Python (with OpenTelemetry)

```python
from prometheus_client import Counter, Histogram, start_http_server
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
import structlog

# Structured logging (ships to Loki via Promtail)
log = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# OpenTelemetry tracing
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://tempo:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

# Usage in a request handler
def handle_request(method, path):
    with tracer.start_as_current_span(f"{method} {path}") as span:
        trace_id = format(span.get_span_context().trace_id, '032x')
        with REQUEST_LATENCY.labels(method, path).time():
            try:
                result = process(path)
                REQUEST_COUNT.labels(method, path, "200").inc()
                log.info("request_handled", path=path, trace_id=trace_id)
                return result
            except Exception as e:
                REQUEST_COUNT.labels(method, path, "500").inc()
                log.error("request_failed", path=path, error=str(e), trace_id=trace_id)
                raise

# Expose metrics endpoint
start_http_server(9090)
```

---

## Key Dashboards to Build

### 1. Service Health Dashboard

Every service should have:
- Request rate (RPS)
- Error rate (%)
- p50 / p95 / p99 latency
- Active pods and restarts
- CPU and memory usage

**PromQL examples:**

```promql
# Request rate
sum(rate(http_requests_total{service="my-api"}[5m]))

# Error rate percentage
sum(rate(http_requests_total{service="my-api",status=~"5.."}[5m]))
/ sum(rate(http_requests_total{service="my-api"}[5m])) * 100

# p99 latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{service="my-api"}[5m])) by (le)
)
```

### 2. Kubernetes Cluster Dashboard

Import the official [Kubernetes Cluster dashboard (ID: 315)](https://grafana.com/grafana/dashboards/315) from Grafana Labs. It covers:
- Node CPU, memory, disk, network
- Pod status and restart counts
- Namespace resource utilization

### 3. Node Exporter Dashboard

Import [Node Exporter Full (ID: 1860)](https://grafana.com/grafana/dashboards/1860) for detailed host-level metrics.

### 4. Log-to-Trace Correlation

Configure Loki derived fields to extract trace IDs from structured logs and link directly to Tempo. When you see an error in logs, one click takes you to the full distributed trace.

---

## Deploying to Kubernetes with Helm

The Grafana community maintains a Kube Prometheus Stack Helm chart that deploys everything:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install kube-prometheus-stack \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=your-secure-password \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi

# Add Loki
helm repo add grafana https://grafana.github.io/helm-charts
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set prometheus.enabled=false \
  --set loki.persistence.enabled=true \
  --set loki.persistence.size=20Gi
```

---

## Conclusion

The Grafana observability stack is mature, cost-effective, and deeply integrated. Prometheus, Loki, Tempo, and Grafana work together to give you the full picture: what's happening, what happened, and why.

Start with Prometheus and a basic Grafana dashboard for your most critical service. Add Loki for log aggregation. Instrument your applications with OpenTelemetry and wire up Tempo for traces. Each addition compounds your ability to diagnose issues faster and with more confidence.

In 2026, teams that have invested in observability consistently outperform those that haven't—not because observability prevents incidents, but because it dramatically reduces the time from "something is wrong" to "we know exactly why and have fixed it."
