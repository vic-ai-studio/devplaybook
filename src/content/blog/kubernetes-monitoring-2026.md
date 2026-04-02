---
title: "Kubernetes Monitoring in 2026: Tools, Metrics, and Observability"
description: "A comprehensive guide to monitoring Kubernetes clusters in 2026: Prometheus, Grafana, OpenTelemetry, custom metrics, alerting, log aggregation, and distributed tracing setup."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Kubernetes", "Monitoring", "Prometheus", "Grafana", "Observability", "OpenTelemetry", "DevOps", "SRE"]
readingTime: "13 min read"
category: "devops"
---

Observability is not optional in production Kubernetes. When a pod crashes, a node runs out of memory, or a deployment silently fails its readiness probe, you need to know — before your users do. In 2026, the observability landscape for Kubernetes has consolidated around a few mature projects while newer standards like OpenTelemetry have matured into the de facto approach for distributed tracing and context propagation.

This guide covers the full observability stack: metrics collection with Prometheus, visualization with Grafana, log aggregation, distributed tracing, and the integrations that tie everything together into a coherent picture of your cluster's health.

## The Three Pillars of Observability

Before diving into tools, it helps to frame the problem. Observability in Kubernetes rests on three pillars:

1. **Metrics** — Numeric measurements over time. CPU usage, memory pressure, request latencies, error rates. Metrics are cheap to store and fast to query, making them ideal for dashboards and alerting.
2. **Logs** — Discrete timestamped events from applications and system components. Logs tell you *what happened* but require correlation to understand *why*.
3. **Traces** — End-to-end records of a request as it flows through multiple services. Traces are essential for understanding latency bottlenecks and error propagation in microservices architectures.

Together, these three signals give you a complete picture. Missing one creates blind spots.

## Metrics: Prometheus and kube-prometheus-stack

Prometheus is the standard for Kubernetes metrics. The `kube-prometheus-stack` Helm chart (maintained by the Prometheus community) installs everything you need in one shot: the Prometheus server, Alertmanager, Grafana, and a rich set of pre-configured dashboards and alerting rules covering all core Kubernetes components.

### Installation

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kube-prom stack prometheus-community/kube-prometheus-stack   --namespace monitoring   --create-namespace   --set prometheus.prometheusSpec.retention=30d   --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=100Gi
```

### Key Metrics to Track

Understanding what to monitor is as important as installing the tooling. Here are the critical signal categories:

**Node-level metrics** (from node-exporter):
- `node_cpu_seconds_total` — CPU utilization over time
- `node_memory_MemTotal_bytes` vs `node_memory_MemAvailable_bytes` — Memory pressure
- `node_filesystem_avail_bytes` — Disk space pressure
- `node_network_receive_bytes_total` / `node_network_transmit_bytes_total` — Network I/O

**Kubernetes component metrics** (from kube-state-metrics):
- `kube_pod_container_resource_limits` vs actual usage — Are pods hitting their limits?
- `kube_pod_status_phase` — Pod lifecycle state distribution
- `kube_deployment_spec_replicas` vs `kube_deployment_status_replicas_available` — Deployment health
- `kube_node_status_condition` — Node readiness conditions (MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable)

**Application metrics** (from your application instrumentation):
- `http_request_duration_seconds_bucket` — Request latency histogram
- `http_requests_total` — Request counter with labels for method, status code, route
- `job_queue_size` — Background worker queue depth
- `db_connection_pool_available` / `db_connection_pool_in_use` — Database pool health

### Prometheus PromQL Examples

Some practical PromQL queries for day-to-day monitoring:

```promql
# Actual CPU usage vs requested CPU across all pods
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) by (pod)
  / sum(kube_pod_container_resource_requests{resource="cpu"}) by (pod)

# Pods in CrashLoopBackOff in the last 5 minutes
sum(kube_pod_container_status_restarts_total) by (pod, namespace)
  - sum(kube_pod_container_status_restarts_total offset 5m) by (pod, namespace)

# High memory usage warning (>85% of limit)
kube_pod_container_resource_limits{resource="memory"}
  * on (pod, namespace) group_right()
  (rate(kube_pod_container_resource_usage{resource="memory"}[5m]) > 0.85)
```

### Alertmanager Configuration

Prometheus alerting rules feed into Alertmanager, which routes notifications to PagerDuty, Slack, email, or any webhook. A minimal Alertmanager config:

```yaml
global:
  resolve_timeout: 5m
route:
  group_by: ['namespace', 'alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: slack-ops
  routes:
    - match:
        severity: critical
      receiver: pagerduty-ops
      continue: true
    - match:
        severity: warning
      receiver: slack-ops
receivers:
  - name: slack-ops
    slack_configs:
      - api_url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
        channel: '#ops-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}
{{ .Annotations.description }}{{ end }}'
  - name: pagerduty-ops
    pagerduty_configs:
      - routing_key: YOUR_PAGERDUTY_KEY
        severity: '{{ .GroupLabels.severity }}'
```

## Visualization: Grafana Dashboards

Grafana is the visualization layer on top of Prometheus (and many other data sources). The `kube-prometheus-stack` ships with dozens of pre-built dashboards. Key ones to bookmark:

- **Kubernetes / Views in Namespaces** — Per-namespace resource usage overview
- **Kubernetes / Compute Resources / Namespace (Pods)** — CPU and memory by namespace with % utilization
- **Kubernetes / Networking / Pod** — Network I/O per pod
- **Node Exporter / Nodes** — Host-level metrics across all nodes

### Building Custom Dashboards

When pre-built dashboards are not enough, build your own. A few tips:

1. **Use variables for reusability** — Dashboard variables for `namespace`, `pod`, and `container` let you filter any panel without duplicating it.
2. **Use latency histograms** — `http_request_duration_seconds_bucket` lets you plot p50, p95, and p99 latencies from a single instrumented metric.
3. **Set appropriate refresh rates** — Dashboard refresh rates should match the staleness of your data. 5s for real-time debugging, 1m or 5m for general monitoring.

Query example for p99 latency:
```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

## Logging: Loki, Promtail, and the ELK Alternative

Prometheus is great for metrics, but logs require a different ingestion pattern. In 2026, Grafana Loki has largely displaced Elasticsearch for Kubernetes log aggregation due to its much lower operational overhead — Loki indexes only labels, not log content, making it radically cheaper at scale.

### Loki + Promtail Stack

```bash
helm install loki grafana/loki   --namespace monitoring   --set loki.commonConfig.replication_factor=2   --set loki.storage.type=boltdb-shipper

helm install promtail grafana/promtail   --namespace monitoring   --set -f - << 'EOF'
extraArgs:
  - -config.file=/etc/promtail/promtail.yaml
client:
  backoff_config:
    max_retries: 5
  timeout: 10s
  url: http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
EOF
```

### Structured Logging

For Loki to index log fields effectively, your application logs should be structured JSON. Most language SDKs support this natively:

```json
{"level": "warn", "ts": "2026-04-02T10:30:00Z", "msg": "slow query", "duration_ms": 2300, "query": "SELECT * FROM orders"}
```

Loki can then query using label filters: `{namespace="api"} |= "slow query" | json | duration_ms > 1000`

## Distributed Tracing: OpenTelemetry

Metrics and logs tell you *that* something went wrong. Traces tell you *where*. In a microservices mesh, a single user request might traverse a dozen services. Without distributed tracing, pinpointing which service introduced latency is a game of guesswork.

### OpenTelemetry Architecture

The OpenTelemetry (OTel) project provides vendor-neutral APIs, SDKs, and collectors. The architecture has three parts:

1. **Application instrumentation** — Libraries or auto-instrumentation that generate trace spans
2. **Otel Collector** — A middleware service that receives, processes, and exports telemetry data
3. **Backend** — Jaeger, Tempo (Grafana's tracing backend), Honeycomb, or any OTLP-compatible service

### OTel Collector with Grafana Tempo

Deploy the OTel Collector as a DaemonSet or sidecar to receive traces and forward them to Tempo:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  mode: daemonset
  config: |
    receivers:
      otlp:
        protocols:
          grpc:
          http:
    processors:
      batch:
        timeout: 1s
        send_batch_size: 1024
    exporters:
      otlp:
        endpoint: tempo.monitoring.svc.cluster.local:4317
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp]
```

Instrument your application with the OTel SDK. For Python:

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

resource = Resource(attributes={SERVICE_NAME: "checkout-service"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317")))
trace.set_tracer_provider(provider)
```

Auto-instrumentation catches HTTP, database calls, and message queue operations automatically — no manual span creation needed for the boilerplate.

## Service-Level Objectives and SLI/SLO/SLA

Metrics and dashboards are means to an end. The practice of defining and tracking Service-Level Objectives (SLOs) gives your monitoring effort focus and a shared language with stakeholders.

Define your SLIs (Service Level Indicators) first:

| Service | SLI | Source metric |
|---------|-----|---------------|
| API | Availability | `sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` |
| API | Latency p95 | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |
| Database | Query success | `sum(rate(sql_query_duration_seconds_count{status="error"}[5m]))` |
| Background jobs | Job completion rate | `sum(rate(jobs_completed_total[5m])) / sum(rate(jobs_submitted_total[5m]))` |

Then set your SLOs (targets):

- API availability: 99.9% (downtime budget ~8.7h/year)
- API p95 latency: < 500ms
- Background job completion: 99.95%

Alert on *error budgets*, not just thresholds. If you have a 99.9% SLO and you're burning through more than 50% of your monthly error budget in the first two weeks, that's a real signal — even if you're still above the SLO threshold.

## Kubernetes-Specific Monitoring Considerations

Beyond application metrics, several Kubernetes-native patterns deserve attention:

### Control Plane Monitoring

Don't neglect the control plane. If etcd is slow or the API server is returning 5xx errors, your workloads may be degraded without obvious symptoms. Key control plane metrics:

- `etcd_server_leader_changes_total` — Leadership churn (should be near zero)
- `apiserver_request_duration_seconds_bucket` — API server latency
- `scheduler_binding_duration_seconds_bucket` — Pod scheduling latency
- `controller_manager_workqueue_depth` — Kube-controller-manager queue depth

### Pod Disruption Budgets and Eviction Pressure

Monitor eviction thresholds before they become critical:

```promql
# Nodes at memory pressure
kube_node_status_condition{condition="MemoryPressure",status="true"} 

# Pods being evicted
kube_pod_container_status_restarts_total
  - on(pod, namespace) group_right()
  delta(kube_pod_container_status_restarts_total[5m]) > 0
```

### Multi-Cluster Monitoring

If you run multiple clusters, use Grafana Federation or Grafana's built-in multi-cluster support to aggregate metrics into a single pane of glass:

```bash
# In the central "federation" Prometheus scrape config
scrape_configs:
  - job_name: 'federate'
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{job="kubernetes-nodes"}'
        - '{job="kubernetes-pods"}'
    static_configs:
      - targets:
          - cluster1-prometheus.monitoring.svc:9090
          - cluster2-prometheus.monitoring.svc:9090
```

## Alerting Philosophy

Not all alerts are equal. Distinguish between:

- **Runbook-level alerts** — Informational, no immediate action needed. Log and investigate in business hours.
- **Warning alerts** — Something is degraded. Check the dashboard and evaluate.
- **Critical alerts** — User-facing impact or imminent risk. Wake someone up.

Keep your alert set small. A dashboard with 200 alerts is a dashboard no one reads. Every alert should have an associated runbook — a step-by-step diagnosis and remediation guide. If an alert fires regularly but no one knows what to do with it, either fix the root cause or silence it.

Example runbook header in the alert annotation:

```yaml
annotations:
  summary: "High pod restart rate in {{ $labels.namespace }}"
  description: "Pod {{ $labels.namespace }}/{{ $labels.pod }} has restarted {{ $value }} times in the last 10 minutes."
  runbook_url: "https://wiki.example.com/runbooks/high-pod-restarts"
```

## Cost Optimization Through Monitoring

Monitoring data itself can guide cost optimization:

1. **Right-sizing resources** — Use metrics to identify over-provisioned pods (`requests >> actual usage`) and reduce their resource requests.
2. **Spot/preemptible node utilization** — Maximize utilization on cheaper spot nodes while keeping headroom for reliability.
3. **Storage utilization** — Track PVC usage vs. requested size to avoid wasted provisioned storage.
4. **Network egress** — Monitor cross-region egress costs; topology-aware routing can reduce cross-zone traffic costs in cloud environments.

## Putting It All Together

A coherent observability stack in 2026 looks like this:

- **Metrics**: Prometheus (scraped from node-exporter, kube-state-metrics, and application /metrics endpoints) with Alertmanager routing to Slack/PagerDuty
- **Visualization**: Grafana pointing at Prometheus for dashboards and Explore for ad-hoc querying
- **Logs**: Loki + Promtail for Kubernetes logs, Grafana Explore for log queries
- **Traces**: OpenTelemetry SDK instrumenting application code → OTel Collector → Grafana Tempo → Grafana Explore (unified trace+metric+log correlation)
- **Alerting**: Alertmanager with severity routing, error-budget-based alerts for SLOs
- **SLO tracking**: Grafana SLO dashboards or dedicated tools like Sloth

The investment in setting this stack up pays back every incident. In 2026, there is no excuse for flying blind in production Kubernetes.
