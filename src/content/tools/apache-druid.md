---
title: "Apache Druid — Real-Time Analytics Database for Sub-Second Queries"
description: "Real-time analytics database for sub-second queries on high-cardinality event data — powers dashboards and drill-down analytics at massive scale."
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

## Concrete Use Case: Real-Time Ad Campaign Dashboards at Scale

An ad-tech platform processes 4 billion impression events per day across 200,000 active campaigns. Each event carries 15+ dimensions: campaign ID, creative variant, publisher, geo (country/state/city), device type, OS, browser, ad format, bid price, and conversion flags. Campaign managers need dashboards that answer questions like "show me CTR by creative variant in Germany over the last 6 hours, broken down by device type" — and they need answers in under one second, even during peak traffic when 500 managers are querying simultaneously.

Before Druid, the platform used PostgreSQL with materialized views refreshed every 15 minutes. Queries on recent data took 8-30 seconds, and the 15-minute staleness meant campaign managers couldn't react to underperforming creatives in real time. Moving to a Spark SQL cluster reduced query times to 3-5 seconds but couldn't handle the concurrency — queries queued when more than 50 users were active. The materialized view approach also required careful pre-computation of every dimension combination, making ad-hoc exploration impossible.

With Apache Druid, impression events stream from Kafka and become queryable within 2-3 seconds of arrival. Roll-up at minute granularity compresses 4 billion daily rows to approximately 80 million segments, reducing storage costs by 50x while preserving the ability to drill down on any dimension combination. Druid's segment-level parallelism and bitmap indexes on high-cardinality dimensions (like campaign ID) keep p99 query latency under 800ms even at 500 concurrent users. Campaign managers can now spot a creative underperforming in a specific region, pause it, and reallocate budget — all within minutes instead of hours.

## When to Use Apache Druid

**Use Apache Druid when:**
- You need sub-second query latency on billions of event rows with high-cardinality dimensions (100K+ unique values per column)
- Your workload demands high query concurrency — hundreds or thousands of simultaneous dashboard users hitting the same cluster
- Data arrives as a continuous event stream (from Kafka, Kinesis, or similar) and must be queryable within seconds
- Roll-up at ingestion time provides meaningful compression — your events have repeating dimension combinations that can be pre-aggregated
- You are building always-on operational dashboards where consistent low-latency matters more than ad-hoc query flexibility

**When NOT to use Apache Druid:**
- Your dataset is under 100 million rows — PostgreSQL, ClickHouse, or DuckDB will handle this with far less operational burden
- You need complex JOINs between multiple tables or transactional write patterns — Druid's JOIN support is limited and it has no UPDATE/DELETE semantics
- Your team lacks dedicated infrastructure engineers — Druid's multi-node architecture (Coordinator, Broker, Historical, MiddleManager, Router) requires significant operational expertise to deploy, tune, and maintain
- Ad-hoc exploratory SQL is the primary use case — ClickHouse or a data warehouse like BigQuery provides a more complete SQL experience with lower complexity
