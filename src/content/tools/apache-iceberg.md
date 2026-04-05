---
title: "Apache Iceberg — Open Table Format for Huge Analytic Datasets"
description: "Open table format for huge analytic datasets — ACID transactions, schema evolution, hidden partitioning, and time travel on data lakes."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source (Apache Software Foundation); managed via Snowflake, BigQuery, AWS Glue, Databricks"
website: "https://iceberg.apache.org"
github: "https://github.com/apache/iceberg"
tags: [data-lake, lakehouse, parquet, acid, open-table-format, data-engineering, spark, flink]
pros:
  - "Hidden partitioning: query without knowing partition layout"
  - "Partition evolution: change partitioning without rewriting data"
  - "Multi-engine: Spark, Flink, Trino, Presto, Dremio, Snowflake, BigQuery all support it"
  - "Row-level deletes and MERGE without full rewrites"
  - "True open standard — no single vendor controls the spec"
cons:
  - "More complex metadata (manifest files, manifest lists) than Delta Lake"
  - "REST catalog management adds operational overhead"
  - "Spark write performance slightly slower than Delta Lake for some workloads"
  - "Tooling ecosystem slightly less mature than Delta Lake"
date: "2026-04-02"
---

## Overview

Apache Iceberg is the table format that Netflix built for petabyte-scale tables with thousands of concurrent readers and writers. It's now the dominant open standard, supported natively by Snowflake, BigQuery, AWS Athena, and Databricks — making it the most portable choice for multi-cloud data lakehouses.

## Core Advantages Over Plain Parquet

**Hidden Partitioning**: Query without specifying partition column:

```sql
-- Without Iceberg (Hive-style partitioning): you must filter by partition
SELECT * FROM orders WHERE year = 2026 AND month = 4 AND day = 2;

-- With Iceberg hidden partitioning: just filter by the natural column
SELECT * FROM orders WHERE created_at >= '2026-04-02';
-- Iceberg automatically uses the underlying day partition
```

**Partition Evolution**: Change how data is partitioned as it grows:

```sql
-- Start with monthly partitioning
ALTER TABLE orders ADD PARTITION FIELD months(created_at);

-- Switch to daily as data grows (old data keeps monthly, new data gets daily)
ALTER TABLE orders DROP PARTITION FIELD months(created_at);
ALTER TABLE orders ADD PARTITION FIELD days(created_at);
```

## PySpark + Iceberg

```python
spark = SparkSession.builder \
    .appName("Iceberg Example") \
    .config("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.glue_catalog.warehouse", "s3://data-lake/iceberg/") \
    .config("spark.sql.catalog.glue_catalog.catalog-impl",
            "org.apache.iceberg.aws.glue.GlueCatalog") \
    .getOrCreate()

# Create table
spark.sql("""
    CREATE TABLE glue_catalog.analytics.orders (
        order_id        STRING,
        customer_id     STRING,
        created_at      TIMESTAMP,
        status          STRING,
        amount          DECIMAL(10,2),
        category        STRING
    )
    USING iceberg
    PARTITIONED BY (days(created_at))
""")

# Write
orders_df.writeTo("glue_catalog.analytics.orders").append()

# Merge (upsert)
spark.sql("""
    MERGE INTO glue_catalog.analytics.orders AS target
    USING new_orders AS source
    ON target.order_id = source.order_id
    WHEN MATCHED THEN UPDATE SET *
    WHEN NOT MATCHED THEN INSERT *
""")
```

## Time Travel

```sql
-- Query historical version
SELECT * FROM orders
FOR SYSTEM_TIME AS OF TIMESTAMP '2026-04-01 00:00:00';

-- By snapshot ID
SELECT * FROM orders
FOR VERSION AS OF 8516875965979439684;

-- Show table history
SELECT * FROM orders.history;

-- Show snapshots
SELECT * FROM orders.snapshots;
```

## Schema Evolution

```sql
-- Add column (safe, never breaks readers)
ALTER TABLE orders ADD COLUMN discount_code STRING;

-- Rename column (safe)
ALTER TABLE orders RENAME COLUMN amount TO total_amount;

-- Change type (safe promotions only, e.g., int → long)
ALTER TABLE orders ALTER COLUMN total_amount TYPE DECIMAL(12,2);
```

## Iceberg vs Delta Lake

| | Apache Iceberg | Delta Lake |
|--|---------------|-----------|
| Governance | Apache Foundation | Linux Foundation |
| Hidden partitioning | ✅ | ❌ |
| Multi-engine | Excellent | Good |
| Databricks | Supported | Native |
| Snowflake | Native | Via connector |
| BigQuery | Native | No |
| AWS Athena | Native | Via manifest |
| Best for | Multi-cloud, multi-engine | Databricks-centric stacks |

For Databricks-centric organizations, Delta Lake is simpler. For multi-cloud or multi-engine architectures, Iceberg's open standard and broader engine support make it the better long-term choice.
