---
title: "Datadog — Unified Monitoring & Observability Platform"
description: "Datadog is the leading observability platform — unified infrastructure metrics, APM, logs, security monitoring, and synthetics for enterprise teams."
category: "Observability"
pricing: "Paid"
pricingDetail: "Infrastructure: $15-23/host/month. APM: $31/host/month. Logs: $0.10/GB ingested. Free trial available. Costs scale quickly with traffic."
website: "https://www.datadoghq.com"
github: "https://github.com/DataDog/dd-agent"
tags: ["observability", "monitoring", "apm", "logs", "metrics", "infrastructure", "cloud", "enterprise"]
pros:
  - "All-in-one: metrics, APM traces, logs, synthetics, security, rum — correlated in one platform"
  - "Excellent UX: best-in-class dashboards, exploration tools, and alert management UI"
  - "Deep integrations: 600+ out-of-the-box integrations with instant dashboards"
  - "APM + distributed tracing with automatic correlation to logs and infrastructure"
  - "Watchdog AI: automatic anomaly detection and root cause suggestions"
cons:
  - "Expensive: costs grow quickly with more hosts, log volume, and APM services"
  - "Vendor lock-in: custom metrics, dashboards, and synthetic tests are Datadog-specific"
  - "Log ingestion costs can be the primary budget driver at scale"
  - "Feature gating: many valuable features require separate add-on pricing"
date: "2026-04-02"
---

## What is Datadog?

Datadog is the leading commercial observability platform, used by thousands of engineering teams to monitor infrastructure, applications, and security. It combines metrics, APM distributed tracing, log management, synthetic monitoring, real user monitoring (RUM), and security in one unified platform with a single agent and dashboard.

## Quick Start

```bash
# Install Datadog Agent (Linux)
DD_API_KEY=your_api_key DD_SITE="datadoghq.com" \
  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)"

# Kubernetes (Helm)
helm repo add datadog https://helm.datadoghq.com
helm install datadog-agent datadog/datadog \
  --set datadog.apiKey=$DD_API_KEY \
  --set datadog.apm.portEnabled=true \
  --set datadog.logs.enabled=true \
  --set datadog.logs.containerCollectAll=true
```

## APM and Distributed Tracing

```python
# Python auto-instrumentation
pip install ddtrace

# Run with APM
DD_SERVICE=payments-service \
DD_ENV=production \
DD_VERSION=1.2.3 \
ddtrace-run python app.py
```

```javascript
// Node.js
const tracer = require('dd-trace').init({
  service: 'payments-service',
  env: 'production',
  version: '1.2.3',
});
```

Datadog APM automatically:
- Creates traces across microservices
- Correlates traces to host/container metrics
- Correlates traces to log lines (trace ID injection)
- Shows service topology maps
- Identifies N+1 database queries

## Log Management

```yaml
# /etc/datadog-agent/conf.d/custom.d/conf.yaml
logs:
  - type: file
    path: /var/log/myapp/*.log
    service: payments-service
    source: nodejs
    tags:
      - env:production
      - team:payments
```

Log features:
- **Live tail**: Real-time log streaming
- **Patterns**: Automatic log clustering to identify novel error patterns
- **Archive**: Long-term log storage at lower cost
- **Rehydration**: Re-index archived logs for investigation

## Infrastructure Monitoring

```yaml
# docker-compose labels for automatic discovery
services:
  payments-api:
    image: myorg/payments:latest
    labels:
      com.datadoghq.ad.check_names: '["nginx"]'
      com.datadoghq.ad.init_configs: '[{}]'
      com.datadoghq.ad.instances: '[{"nginx_status_url": "http://%%host%%:%%port%%/nginx_status/"}]'
      com.datadoghq.ad.logs: '[{"source": "nginx", "service": "payments-api"}]'
```

## Monitors and Alerts

```python
# Create a monitor via API
import datadog
from datadog import api

datadog.initialize(api_key='...', app_key='...')

monitor = api.Monitor.create(
    type="metric alert",
    query="avg(last_5m):avg:aws.ec2.cpu{service:payments-api} > 90",
    name="High CPU on payments API",
    message="@pagerduty CPU above 90% on payments API. Check autoscaling.",
    tags=["service:payments-api", "env:production"],
    options={
        "thresholds": {"critical": 90, "warning": 75},
        "notify_no_data": True,
        "no_data_timeframe": 10
    }
)
```

## Synthetic Monitoring

```python
# Create a browser test (simulates real user)
browser_test = api.Synthetics.create_test(
    config={
        "request": {
            "method": "GET",
            "url": "https://app.example.com/checkout",
        },
        "assertions": [
            {"type": "statusCode", "operator": "is", "target": 200},
            {"type": "responseTime", "operator": "lessThan", "target": 2000},
        ]
    },
    locations=["aws:us-east-1", "aws:eu-west-1"],
    name="Checkout page availability",
    type="browser",
    tags=["env:production", "team:frontend"],
    options={"tick_every": 60}
)
```

## Datadog vs Grafana Stack vs New Relic

| Aspect | Datadog | Grafana Stack | New Relic |
|--------|---------|---------------|-----------|
| Setup complexity | Low | High | Low |
| UX quality | Excellent | Good | Good |
| Cost | High | Low (self-hosted) | Medium |
| Vendor lock-in | High | Low (open standards) | Medium |
| Enterprise features | Excellent | Via Grafana Enterprise | Good |
| Correlation | Best-in-class | Requires config | Good |

Datadog is the right choice when: you need immediate productivity, engineering time is more expensive than licensing, and you want the best-in-class UX for incident investigation.

## Concrete Use Case: Unifying Observability Across 8 Microservices After a 4-Hour Incident

An engineering team at an e-commerce platform runs 8 Node.js microservices on AWS ECS: storefront, search, inventory, cart, checkout, payments, notifications, and analytics. A 4-hour production incident reveals the root cause: a slow database connection in the inventory service caused cascading timeouts in cart and checkout — visible to users as blank product pages and failed checkouts. Engineers lost critical minutes jumping between CloudWatch Metrics, CloudWatch Logs, and manual `ecs exec` sessions. The postmortem decision: adopt Datadog for unified observability.

The migration runs over two weeks. The Datadog Agent is deployed as a sidecar container in every ECS task definition, configured to collect host metrics, container metrics, and forward logs. APM is enabled via `ddtrace-run` wrapping each Node.js service with `DD_SERVICE`, `DD_ENV`, and `DD_VERSION` environment variables set to the service name, deployment environment, and Git SHA respectively. Trace-to-log correlation is configured by injecting the Datadog trace ID into structured JSON log lines — engineers can jump from a slow trace in APM directly to the exact log lines generated during that request. Service topology maps are immediately available: the team can see in real time that the inventory service's upstream PostgreSQL calls are driving P99 latency above 2 seconds, and clicking through shows the RDS instance CPU pinned at 95%.

The team configures monitors for three key SLIs: checkout error rate (alert at 0.5%, critical at 1%), cart API P95 latency (alert at 800ms), and inventory database query duration (alert at 500ms). Alerts route to PagerDuty for critical thresholds and Slack for warnings, with message templates including the exact metric value, affected service, and a deep-link to the APM service dashboard. Synthetic monitoring is added for the checkout flow — a browser test running every 60 seconds from three AWS regions verifies the full add-to-cart and checkout sequence completes in under 3 seconds. Six months after the migration, mean time to diagnose (MTTD) drops from 47 minutes to 11 minutes. The cost — approximately $4,200/month across all 8 services with APM and logs — is justified against the estimated $180,000 in GMV lost during the original 4-hour incident.

## When to Use Datadog

**Use Datadog when:**
- Your engineering team needs immediate productivity with a fully integrated observability platform — Datadog's 600+ out-of-the-box integrations and automatic service topology maps reduce time-to-value versus assembling a Grafana LGTM stack
- You are running microservices and need APM distributed tracing with automatic correlation to infrastructure metrics and log lines — Datadog's trace-to-log correlation is best-in-class and requires minimal manual configuration
- You need synthetic monitoring (scheduled browser/API tests) alongside infrastructure and application observability in one platform with one alert routing system
- Engineering time is more expensive than licensing and you cannot afford to spend weeks building and maintaining open-source observability infrastructure

**When NOT to use Datadog:**
- Your log volume is high (100GB+/day) and Datadog's $0.10/GB ingestion pricing would create a significant monthly bill — Grafana Loki with S3 storage is 10-50x cheaper at scale
- You have a strong preference for open standards (OpenTelemetry, Prometheus) and want to avoid vendor lock-in that prevents migrating dashboards, alert rules, and instrumentation to another platform
- You are a small team (fewer than 5 engineers, one or two services) where Datadog's pricing and configuration complexity outweighs a simpler solution like Sentry + Uptime Kuma
