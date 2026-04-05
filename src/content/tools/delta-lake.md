---
title: "Delta Lake — Open-Source Storage Layer for Reliable Data Lakes"
description: "Open-source ACID transaction layer for data lakes — brings reliability, schema enforcement, and time travel to Parquet files on cloud object storage."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source (Linux Foundation Delta Lake project); Databricks Delta Lake Pro/Enterprise with additional features"
website: "https://delta.io"
github: "https://github.com/delta-io/delta"
tags: [data-lake, spark, parquet, acid, data-engineering, lakehouse, python, databricks]
pros:
  - "ACID transactions on cloud storage (S3, GCS, Azure Blob)"
  - "Time travel: query any previous version of your data"
  - "Schema enforcement: prevent bad data from corrupting tables"
  - "Merge (upsert) support: efficiently update specific records"
  - "Works with Spark, Pandas, Polars, Flink, and more via Delta kernel"
cons:
  - "Adds transaction log overhead for small, frequent writes"
  - "Best performance with Spark — delta-rs (Rust) for non-Spark use is newer"
  - "Not a replacement for OLAP databases like ClickHouse (still file-based)"
  - "Vacuum operations needed to physically delete old data"
date: "2026-04-02"
---

## Overview

Delta Lake solves the reliability problem with data lakes: plain Parquet files on S3 have no ACID guarantees — a failed job can leave partial data, concurrent writers corrupt each other, and you can't roll back a bad write. Delta Lake adds a transaction log (`_delta_log/`) that makes the data lake as reliable as a database.

## Delta Lake with PySpark

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("Delta Example") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

# Write as Delta
orders_df.write \
    .format("delta") \
    .mode("overwrite") \
    .partitionBy("year", "month") \
    .save("s3://data-lake/delta/orders/")

# Read Delta
orders = spark.read.format("delta").load("s3://data-lake/delta/orders/")
```

## ACID Operations

```python
from delta.tables import DeltaTable

delta_table = DeltaTable.forPath(spark, "s3://data-lake/delta/orders/")

# MERGE (upsert): update existing or insert new
delta_table.alias("target").merge(
    source=new_orders.alias("source"),
    condition="target.order_id = source.order_id"
).whenMatchedUpdate(set={
    "status": "source.status",
    "updated_at": "source.updated_at",
}).whenNotMatchedInsert(values={
    "order_id": "source.order_id",
    "customer_id": "source.customer_id",
    "amount": "source.amount",
    "status": "source.status",
    "created_at": "source.created_at",
}).execute()

# DELETE with predicate
delta_table.delete("status = 'test' AND created_at < '2025-01-01'")

# UPDATE
delta_table.update(
    condition="status = 'pending' AND created_at < current_timestamp() - INTERVAL 7 DAYS",
    set={"status": "'expired'"}
)
```

## Time Travel

```python
# Query a previous version
old_data = spark.read.format("delta") \
    .option("versionAsOf", 5) \
    .load("s3://data-lake/delta/orders/")

# Query by timestamp
data_yesterday = spark.read.format("delta") \
    .option("timestampAsOf", "2026-04-01") \
    .load("s3://data-lake/delta/orders/")

# Show history
delta_table.history().show(truncate=False)
# version | timestamp | operation | operationParameters
# 10      | 2026-04-02 | MERGE     | {...}
# 9       | 2026-04-01 | WRITE     | {...}
```

## delta-rs: Delta Lake Without Spark

```python
# Use Delta Lake from Python without Spark
from deltalake import DeltaTable, write_deltalake
import pandas as pd

# Write from pandas
df = pd.read_parquet("input.parquet")
write_deltalake("s3://data-lake/delta/orders/", df, mode="append")

# Read to pandas
dt = DeltaTable("s3://data-lake/delta/orders/")
df = dt.to_pandas()

# Read specific version
dt = DeltaTable("s3://data-lake/delta/orders/", version=5)
```

## Schema Evolution

```python
# Add new columns without rewriting the table
orders_with_new_field.write \
    .format("delta") \
    .mode("append") \
    .option("mergeSchema", "true") \
    .save("s3://data-lake/delta/orders/")
```

Delta Lake is now part of the Linux Foundation as an open standard, competing with Apache Iceberg and Apache Hudi. Databricks natively supports all three, but Delta Lake has the widest Spark ecosystem adoption.
