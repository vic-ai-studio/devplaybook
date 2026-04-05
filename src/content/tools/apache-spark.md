---
title: "Apache Spark — Unified Engine for Large-Scale Data Processing"
description: "Unified analytics engine for large-scale data processing — batch ETL, SQL, streaming, and ML on datasets too large for single machines."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; Databricks Runtime (managed Spark) from $0.07/DBU; EMR, Dataproc also available"
website: "https://spark.apache.org"
github: "https://github.com/apache/spark"
tags: [data-engineering, big-data, distributed, etl, python, scala, pyspark, sql]
pros:
  - "Process petabytes of data across distributed clusters"
  - "Unified API for batch, streaming, SQL, and ML in one framework"
  - "In-memory processing — 100x faster than MapReduce for iterative workloads"
  - "PySpark: Python API with pandas-like operations on distributed DataFrames"
  - "Spark SQL: run SQL queries against Parquet, Delta Lake, Iceberg"
cons:
  - "Overkill for datasets under ~1TB — pandas or DuckDB is simpler"
  - "Complex cluster management (standalone, YARN, Kubernetes)"
  - "Java memory management (GC pauses, OOM errors) can be frustrating"
  - "Debugging distributed jobs is harder than single-process code"
date: "2026-04-02"
---

## Overview

Apache Spark is the standard for large-scale data processing in 2026. PySpark brings Spark's distributed processing power to Python with a DataFrame API that feels similar to pandas. Databricks (built on Spark) is the dominant managed platform.

## PySpark DataFrame Operations

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType

spark = SparkSession.builder \
    .appName("OrderAnalytics") \
    .getOrCreate()

# Read Parquet from S3
orders = spark.read.parquet("s3://data-lake/orders/")

# Transformations (lazy — nothing runs until action)
result = (
    orders
    .filter(F.col("status") == "completed")
    .filter(F.col("created_at") >= "2026-01-01")
    .withColumn("month", F.date_trunc("month", F.col("created_at")))
    .groupBy("month", "category")
    .agg(
        F.count("order_id").alias("order_count"),
        F.sum("total_amount").alias("revenue"),
        F.avg("total_amount").alias("avg_order_value"),
        F.approx_count_distinct("customer_id").alias("unique_customers"),
    )
    .orderBy("month", "revenue", ascending=[True, False])
)

# Action: triggers computation
result.write.mode("overwrite").parquet("s3://data-lake/analytics/monthly_revenue/")
```

## Spark SQL

```python
# Register temp view and use SQL
orders.createOrReplaceTempView("orders")
customers.createOrReplaceTempView("customers")

sql_result = spark.sql("""
    SELECT
        c.segment,
        DATE_TRUNC('month', o.created_at) as month,
        COUNT(DISTINCT o.customer_id) as active_customers,
        SUM(o.total_amount) as revenue
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status = 'completed'
      AND o.created_at >= '2026-01-01'
    GROUP BY 1, 2
    ORDER BY 2, 3 DESC
""")
```

## Structured Streaming

```python
# Read from Kafka in real-time
stream = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "order-events")
    .load()
)

orders_stream = stream.select(
    F.from_json(F.col("value").cast("string"), order_schema).alias("order")
).select("order.*")

# Aggregate with 5-minute windows
windowed = (
    orders_stream
    .withWatermark("event_time", "10 minutes")
    .groupBy(F.window("event_time", "5 minutes"), "category")
    .agg(F.sum("amount").alias("revenue"))
)

# Write to Delta Lake
query = (
    windowed.writeStream
    .format("delta")
    .outputMode("append")
    .option("checkpointLocation", "/tmp/checkpoint")
    .start("s3://data-lake/streaming/revenue/")
)
```

## Delta Lake Integration

```python
# Write with ACID transactions
result.write.format("delta").mode("overwrite").save("s3://data-lake/orders/")

# Time travel
old_orders = spark.read.format("delta") \
    .option("versionAsOf", 5) \
    .load("s3://data-lake/orders/")

# Merge (upsert)
from delta.tables import DeltaTable
delta_table = DeltaTable.forPath(spark, "s3://data-lake/orders/")
delta_table.alias("target").merge(
    updates.alias("source"),
    "target.order_id = source.order_id"
).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()
```

## When to Use Spark

Use Spark when data volume exceeds what pandas/DuckDB can handle in memory on a single machine (typically > 50–100GB). For smaller datasets or interactive analytics, DuckDB or pandas is faster to iterate with. Databricks provides managed Spark with auto-scaling clusters, eliminating most operational complexity.
