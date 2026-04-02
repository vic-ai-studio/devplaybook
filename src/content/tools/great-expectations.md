---
title: "Great Expectations"
description: "Data quality testing framework — define expectations about your data, validate them in pipelines, and generate data documentation automatically."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; GX Cloud (managed) from $500/month"
website: "https://greatexpectations.io"
github: "https://github.com/great-expectations/great_expectations"
tags: [data-quality, testing, validation, data-engineering, python, etl, observability]
pros:
  - "100+ built-in expectations covering nullability, ranges, patterns, distributions"
  - "Auto-generates data docs — HTML reports of data quality results"
  - "Profiling: infer expectations from existing data"
  - "Integrates with Airflow, Dagster, Prefect, dbt, Spark"
  - "Checkpoint system for reusable validation suites"
cons:
  - "Verbose setup for simple use cases"
  - "Documentation and API changed significantly between v2 and v3"
  - "Performance can be slow on large datasets without sampling"
  - "GX Cloud pricing is high for small teams"
date: "2026-04-02"
---

## Overview

Great Expectations (GX) brings testing discipline to data pipelines. It answers: "Does this data match what I expect?" before it's loaded into production tables, preventing bad data from silently corrupting analytics.

## Core Concepts

- **Expectation**: A statement about data (e.g., "column `email` should never be null")
- **Expectation Suite**: Collection of expectations for a dataset
- **Validator**: Runs expectations against actual data
- **Checkpoint**: Reusable validation pipeline step

## Basic Usage

```python
import great_expectations as gx
import pandas as pd

context = gx.get_context()

# Load data
df = pd.read_parquet("s3://data-lake/orders/2026-04-02.parquet")

# Create a batch of data to validate
batch = context.sources.pandas_default.read_dataframe(df)

# Define expectations
batch.expect_column_to_exist("order_id")
batch.expect_column_values_to_not_be_null("order_id")
batch.expect_column_values_to_be_unique("order_id")
batch.expect_column_values_to_not_be_null("customer_id")
batch.expect_column_values_to_be_between("amount", min_value=0, max_value=100000)
batch.expect_column_values_to_match_regex(
    "email",
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)
batch.expect_column_values_to_be_in_set(
    "status",
    ["pending", "completed", "cancelled", "refunded"]
)

# Validate
results = batch.validate()
print(f"Success: {results.success}")
print(f"Passed: {results.statistics['successful_expectations']}")
print(f"Failed: {results.statistics['unsuccessful_expectations']}")
```

## Saving and Reusing Expectation Suites

```python
# Save an expectation suite
context = gx.get_context()

suite = context.add_expectation_suite("orders_suite")

validator = context.get_validator(
    datasource_name="orders_datasource",
    data_asset_name="daily_orders",
    expectation_suite_name="orders_suite"
)

validator.expect_column_values_to_not_be_null("order_id")
validator.expect_column_values_to_be_between("amount", 0, 100000)
validator.expect_table_row_count_to_be_between(min_value=100, max_value=1000000)

# Save suite to disk/cloud
validator.save_expectation_suite(discard_failed_expectations=False)
```

## Checkpoint: Validation in Pipelines

```python
# Define a reusable checkpoint
checkpoint = context.add_checkpoint(
    name="orders_daily_checkpoint",
    validations=[
        {
            "batch_request": orders_batch_request,
            "expectation_suite_name": "orders_suite",
        }
    ]
)

# Run in Airflow/Prefect/etc.
results = checkpoint.run()

if not results.success:
    raise ValueError(f"Data quality check failed: {results}")
```

## Airflow Integration

```python
from great_expectations_provider.operators.great_expectations import GreatExpectationsOperator

validate_orders = GreatExpectationsOperator(
    task_id="validate_orders",
    datasource_name="orders_datasource",
    data_asset_name="daily_orders",
    expectation_suite_name="orders_suite",
    fail_task_on_validation_failure=True,
)
```

## When to Add Data Validation

Add Great Expectations at: ingestion from external sources, after major transformations, before loading to production tables. Skip it for intermediate scratch tables. The goal is to catch data problems at the source, not after they've propagated through your warehouse.
