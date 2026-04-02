---
title: "New Relic — Full-Stack Observability Platform"
description: "New Relic is a comprehensive observability platform with APM, infrastructure monitoring, browser monitoring, logs, and AI-powered alerting. Known for its free tier with 100GB/month data ingestion."
category: "Observability"
pricing: "Free / Paid"
pricingDetail: "Free: 100GB data/month, 1 full platform user. Pro: $0.35/GB after free tier. Enterprise: custom. User-based pricing can add up."
website: "https://newrelic.com"
github: "https://github.com/newrelic"
tags: ["observability", "apm", "infrastructure", "monitoring", "logs", "browser", "devops", "cloud"]
pros:
  - "Generous free tier: 100GB/month free data, 1 full user — sufficient for small teams"
  - "NRQL: powerful SQL-like query language for custom analysis"
  - "Full-stack: APM, infrastructure, browser, mobile, synthetics, logs in one platform"
  - "OpenTelemetry support: full OTLP ingestion for OTEL-instrumented apps"
  - "AI-powered: New Relic AI for anomaly detection and automated alert recommendations"
cons:
  - "User-based pricing surprises: $99/month per additional full platform user"
  - "Steep learning curve for NRQL and custom dashboards"
  - "UI can feel overwhelming with the number of features"
  - "APM agent instrumentation less polished than Datadog in some languages"
date: "2026-04-02"
---

## What is New Relic?

New Relic is a full-stack observability platform covering APM, infrastructure, browser performance, mobile, synthetics, and logs. Founded in 2008, it's one of the oldest observability platforms and has evolved significantly with a consumption-based pricing model (vs the historical per-agent pricing).

The key differentiator in 2026: New Relic's 100GB/month free tier makes it genuinely usable for small-to-medium teams at zero cost, and its NRQL query language is one of the most powerful in the industry.

## Quick Start

```bash
# Install New Relic Infrastructure Agent (Linux)
curl -Ls https://download.newrelic.com/install/newrelic-cli/scripts/install.sh | bash

NEW_RELIC_API_KEY=YOUR_API_KEY \
NEW_RELIC_ACCOUNT_ID=YOUR_ACCOUNT_ID \
/usr/local/bin/newrelic install

# Kubernetes (Helm)
helm repo add newrelic https://helm-charts.newrelic.com
helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic \
  --create-namespace \
  --set global.licenseKey=YOUR_LICENSE_KEY \
  --set global.cluster=production \
  --set infrastructure.enabled=true \
  --set prometheus.enabled=true \
  --set logging.enabled=true
```

## APM Instrumentation

```python
# Python
pip install newrelic
newrelic-admin generate-config YOUR_LICENSE_KEY newrelic.ini
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program python app.py
```

```javascript
// Node.js
require('newrelic');  // Must be first require in app
// Configure via newrelic.js or environment variables
```

```java
// Java: add -javaagent to JVM args
-javaagent:/path/to/newrelic.jar
```

## NRQL: New Relic Query Language

NRQL is a SQL-like language for querying all New Relic data:

```sql
-- Top 10 slowest transactions in last hour
SELECT percentile(duration, 95) AS 'P95 Duration',
       count(*) AS 'Request Count'
FROM Transaction
WHERE appName = 'payments-service'
SINCE 1 hour ago
FACET name
LIMIT 10

-- Error rate by service
SELECT percentage(count(*), WHERE error IS TRUE) AS 'Error Rate'
FROM Transaction
SINCE 30 minutes ago
FACET appName
TIMESERIES 1 minute

-- Infrastructure: high CPU hosts
SELECT average(cpuPercent) AS 'Avg CPU'
FROM SystemSample
WHERE cpuPercent > 80
SINCE 1 hour ago
FACET hostname
LIMIT 20

-- Log analysis
SELECT message
FROM Log
WHERE level = 'ERROR'
  AND service = 'checkout-service'
SINCE 30 minutes ago
LIMIT 100
```

## Custom Dashboards

```javascript
// Dashboard via API
const dashboard = {
  name: "Payment Service Health",
  permissions: "PUBLIC_READ_WRITE",
  pages: [{
    name: "Overview",
    widgets: [{
      title: "Request Rate",
      configuration: {
        nrql: [{
          query: "SELECT rate(count(*), 1 minute) FROM Transaction WHERE appName = 'payments-service' TIMESERIES"
        }]
      },
      rawConfiguration: {
        nrqlQueries: [{
          accountId: YOUR_ACCOUNT_ID,
          query: "SELECT rate(count(*), 1 minute) FROM Transaction..."
        }]
      }
    }]
  }]
};
```

## Alerts and Anomaly Detection

```javascript
// Create NRQL alert condition via API
const alertCondition = {
  type: "NRQL",
  name: "Payment API P95 Latency",
  nrql: {
    query: "SELECT percentile(duration, 95) FROM Transaction WHERE appName = 'payments-service'"
  },
  signal: {
    aggregationWindow: 60,  // seconds
    aggregationMethod: "EVENT_FLOW"
  },
  terms: [{
    threshold: 1.0,  // 1 second
    thresholdOccurrences: "ALL",
    thresholdDuration: 300,  // 5 minutes
    operator: "ABOVE",
    priority: "CRITICAL"
  }]
};
```

**New Relic AI (Intelligent Observability)**:
- Anomaly detection: automatically baselines metrics and alerts on deviations
- Incident Intelligence: correlates alerts from multiple sources to reduce noise
- Suggested alerts: recommends alert conditions based on your data

## OpenTelemetry Integration

```bash
# Send OTEL traces directly to New Relic
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:443
OTEL_EXPORTER_OTLP_HEADERS="api-key=YOUR_LICENSE_KEY"
OTEL_SERVICE_NAME=payments-service
```

## Distributed Tracing

New Relic's distributed tracing:
- Connects traces across services with automatic correlation
- Stores 100% of traces (no head-based sampling by default)
- Infinite Tracing: tail-based sampling for finding errors in high-volume systems
- Links traces to logs (requires trace ID injection in log formatter)

## New Relic vs Datadog

| Aspect | New Relic | Datadog |
|--------|-----------|---------|
| Free tier | 100GB/month | Limited |
| Per-user pricing | $99/full user/month | $15/host/month |
| APM quality | Very good | Excellent |
| UX | Good | Excellent |
| Query language | NRQL (SQL-like) | Proprietary |
| OpenTelemetry | Full support | Good support |

New Relic is the better choice when: budget is a constraint (100GB free tier), you need SQL-like querying, or you want OTEL-first instrumentation.
