---
title: "ClickHouse"
description: "Column-oriented OLAP database — blazing-fast analytics queries on billions of rows, real-time data ingestion, and efficient compression."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; ClickHouse Cloud from $0.0222/hour per replica; Altinity Cloud also available"
website: "https://clickhouse.com"
github: "https://github.com/ClickHouse/ClickHouse"
tags: [database, analytics, olap, columnar, sql, real-time, data-engineering, time-series]
pros:
  - "100-1000x faster than row-based databases for analytics queries"
  - "Excellent compression — column storage compresses repetitive values efficiently"
  - "Real-time ingestion: insert millions of rows/second without slowing queries"
  - "Familiar SQL with powerful array functions and aggregation combinators"
  - "MergeTree engine family handles time-series, deduplication, materialized views"
cons:
  - "Not designed for transactional workloads (OLTP) — no real UPDATE/DELETE"
  - "Joins are limited — denormalized tables and arrays preferred"
  - "Query planning differs from PostgreSQL — requires learning ClickHouse-specific optimizations"
  - "Self-hosted clustering requires operational expertise"
date: "2026-04-02"
---

## Overview

ClickHouse is the fastest open-source analytical database for querying large volumes of data. Built by Yandex for web analytics, it's now the backbone of analytics platforms at Cloudflare, Uber, Stripe, and thousands of other companies. If PostgreSQL is too slow for your analytics queries, ClickHouse is the answer.

## Table Design

```sql
-- MergeTree: the base engine for most use cases
CREATE TABLE orders (
    order_id    UUID,
    customer_id String,
    created_at  DateTime,
    status      LowCardinality(String),  -- Optimized for low-cardinality columns
    amount      Decimal(10, 2),
    category    LowCardinality(String),
    items       Array(String)
)
ENGINE = MergeTree()
ORDER BY (created_at, customer_id)      -- Primary sort key (for range queries)
PARTITION BY toYYYYMM(created_at);      -- Partition by month

-- ReplacingMergeTree: deduplicate on primary key
CREATE TABLE user_events (
    user_id     String,
    event_type  String,
    occurred_at DateTime,
    value       Float64,
    version     UInt64  -- Higher version wins on dedup
)
ENGINE = ReplacingMergeTree(version)
ORDER BY (user_id, event_type, occurred_at);
```

## Query Performance

```sql
-- Count active users by day — scans billions of rows in seconds
SELECT
    toDate(created_at) AS day,
    uniqExact(customer_id) AS unique_customers,
    sum(amount) AS revenue,
    count() AS order_count,
    avg(amount) AS avg_order_value
FROM orders
WHERE created_at >= '2026-01-01'
  AND status = 'completed'
GROUP BY day
ORDER BY day;

-- Funnel analysis with ClickHouse array functions
SELECT
    countIf(has(steps, 'view')) AS views,
    countIf(has(steps, 'add_to_cart')) AS add_to_cart,
    countIf(has(steps, 'purchase')) AS purchases
FROM (
    SELECT
        session_id,
        groupArray(event_type) AS steps
    FROM events
    WHERE date = today()
    GROUP BY session_id
);
```

## Materialized Views

```sql
-- Pre-aggregate revenue at insert time
CREATE MATERIALIZED VIEW daily_revenue_mv
ENGINE = SummingMergeTree()
ORDER BY (day, category)
AS SELECT
    toDate(created_at) AS day,
    category,
    sum(amount) AS revenue,
    count() AS order_count
FROM orders
GROUP BY day, category;

-- Querying the materialized view is instant
SELECT day, category, sum(revenue) AS revenue
FROM daily_revenue_mv
WHERE day >= today() - 30
GROUP BY day, category
ORDER BY day, revenue DESC;
```

## Ingesting Data

```python
from clickhouse_driver import Client

client = Client('localhost')

# Bulk insert (most efficient)
client.execute(
    'INSERT INTO orders (order_id, customer_id, created_at, status, amount) VALUES',
    [
        {'order_id': uuid4(), 'customer_id': 'cust-1', 'created_at': datetime.now(),
         'status': 'completed', 'amount': 99.99},
        # ... thousands more
    ]
)
```

## ClickHouse vs PostgreSQL for Analytics

| Query | PostgreSQL | ClickHouse |
|-------|-----------|-----------|
| Count 1B rows | ~30s | ~0.1s |
| Group by on 100M rows | ~20s | ~0.5s |
| Time-series aggregation | ~10s | ~0.2s |
| Storage (1B rows) | ~500GB | ~50GB |

ClickHouse isn't a PostgreSQL replacement — use PostgreSQL for transactional data and ClickHouse for analytics. Many architectures sync PostgreSQL → ClickHouse via Kafka or ClickHouse's PostgreSQL integration.
