---
title: "Datadog — Unified Monitoring & Observability Platform"
description: "Datadog is the leading commercial observability platform combining infrastructure metrics, APM, logs, security monitoring, and synthetics in one unified platform. The default choice for enterprise engineering teams."
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
