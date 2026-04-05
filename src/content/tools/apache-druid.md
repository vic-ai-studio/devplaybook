---
title: "Apache Druid — Real-Time Analytics Database for Sub-Second Queries"
description: "Real-time analytics database designed for sub-second queries on high-cardinality event data — powers dashboards and drill-down analytics at Airbnb, Netflix, Lyft scale."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; Imply Cloud (managed Druid) from $750/month; AWS DSQL based on Druid"
website: "https://druid.apache.org"
github: "https://github.com/apache/druid"
tags: [database, olap, real-time, analytics, event-data, time-series, data-engineering]
pros:
  - "Sub-second query response on billions of rows — 10-100x faster than Spark SQL for dashboards"
  - "Real-time ingestion from Kafka — queryable within seconds of event arrival"
  - "Columnar storage with bitmap indexing for high-cardinality dimensions"
  - "Approximate query support (HyperLogLog, Theta sketches) for ultra-fast cardinality estimates"
  - "Roll-up: pre-aggregate at ingestion time to reduce storage 10-100x"
cons:
  - "Operational complexity: multiple node types (Coordinator, Broker, Historical, etc.)"
  - "Not a general-purpose database — designed for event/time-series data"
  - "Complex schema design — requires understanding segments and roll-up"
  - "JOIN support is limited compared to traditional SQL databases"
date: "2026-04-02"
---

## Overview

Apache Druid is purpose-built for interactive analytics on event streams. The use case: an operations dashboard where analysts drill into traffic, errors, or business metrics across any dimension (user, country, device, version) with sub-second response times on billions of rows.

## Key Design Principles

**Time-based architecture**: Every Druid datasource has a primary timestamp. Data is stored in time-based segments, enabling efficient time range queries.

**Roll-up**: Pre-aggregate metrics at ingestion time:

```json
// Without roll-up: store every raw event
// { user_id: "u123", country: "US", page: "/home", timestamp: "2026-04-02T10:00:00.123Z" }
// { user_id: "u124", country: "US", page: "/home", timestamp: "2026-04-02T10:00:00.456Z" }
// → 2 rows stored

// With roll-up (1-minute granularity):
// { country: "US", page: "/home", __time: "2026-04-02T10:00:00Z", count: 2, users: { "u123", "u124" } }
// → 1 row stored, 50-100x storage reduction at scale
```

## Ingestion Spec

```json
{
  "type": "kafka",
  "spec": {
    "dataSchema": {
      "dataSource": "page_views",
      "timestampSpec": { "column": "timestamp", "format": "iso" },
      "dimensionsSpec": {
        "dimensions": ["user_id", "country", "page", "device_type", "browser"]
      },
      "metricsSpec": [
        { "type": "count", "name": "count" },
        { "type": "doubleSum", "name": "session_duration", "fieldName": "duration_seconds" },
        { "type": "HLLSketchBuild", "name": "unique_users", "fieldName": "user_id" }
      ],
      "granularitySpec": {
        "queryGranularity": "minute",
        "rollup": true
      }
    },
    "ioConfig": {
      "type": "kafka",
      "consumerProperties": { "bootstrap.servers": "kafka:9092" },
      "topic": "page-view-events"
    }
  }
}
```

## Querying

```sql
-- Druid SQL: sub-second over billions of rows
SELECT
    TIME_FLOOR(__time, 'PT1H') AS hour,
    country,
    SUM(count) AS pageviews,
    HLL_SKETCH_ESTIMATE(DS_HLL(unique_users)) AS unique_users,
    AVG(session_duration) AS avg_session_seconds
FROM page_views
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '7' DAY
  AND country IN ('US', 'GB', 'JP')
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC
LIMIT 100;
```

## Druid vs ClickHouse

| | Apache Druid | ClickHouse |
|--|-------------|-----------|
| Real-time ingestion | Seconds (Kafka) | Sub-second |
| Roll-up at ingestion | ✅ | Via materialized views |
| High-concurrency queries | Excellent | Good |
| SQL completeness | Limited (no complex JOINs) | Full SQL |
| Operational complexity | Very high | Medium |
| Best for | High-concurrency dashboards | Ad-hoc analytics, JOINs |

Druid is overkill for most companies. Use ClickHouse first — it handles most real-time analytics needs with less complexity. Evaluate Druid when you need extremely high query concurrency (1000+ concurrent dashboard queries) or roll-up compression is essential for storage costs.
