---
title: "Dagster — Data Orchestrator for Machine Learning & Analytics"
description: "Dagster is a data orchestration platform with an asset-centric model — define, observe, and test data assets instead of just scheduling task DAGs."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source (Dagster Core); Dagster Cloud Serverless free tier; Pro from $600/month"
website: "https://dagster.io"
github: "https://github.com/dagster-io/dagster"
tags: [data-engineering, orchestration, asset-centric, workflow, python, etl, lineage]
pros:
  - "Asset-centric: think about data outputs (tables, models) not just task execution"
  - "Software-defined Assets: built-in lineage graph showing asset dependencies"
  - "Type-checked inputs/outputs between steps (catches schema mismatches)"
  - "Excellent testing support — run ops in isolation with mock resources"
  - "Sensors and schedules with first-class freshness policies"
cons:
  - "Steeper mental model than Prefect or Airflow"
  - "Verbose API compared to Prefect's simple decorators"
  - "Smaller community than Airflow"
  - "Dagster Cloud can be expensive"
date: "2026-04-02"
---

## Overview

Dagster's key innovation is the **Software-Defined Asset** (SDA) model. Instead of defining pipelines as sequences of tasks, you define the data assets you want to produce. Dagster infers the execution order and provides a visual lineage graph of how assets depend on each other.

## Software-Defined Assets

```python
from dagster import asset, AssetIn, Output, MetadataValue
import pandas as pd

@asset(
    description="Raw orders loaded from the API",
    group_name="raw",
    tags={"layer": "bronze"},
)
def raw_orders() -> pd.DataFrame:
    """Fetch orders from the API and store as-is."""
    return fetch_orders_from_api()

@asset(
    ins={"raw_orders": AssetIn()},
    description="Cleaned and validated orders",
    group_name="staging",
    tags={"layer": "silver"},
)
def staged_orders(raw_orders: pd.DataFrame) -> Output[pd.DataFrame]:
    cleaned = raw_orders.dropna(subset=['order_id', 'customer_id'])
    cleaned = cleaned[cleaned['amount'] > 0]

    return Output(
        value=cleaned,
        metadata={
            "row_count": MetadataValue.int(len(cleaned)),
            "dropped_rows": MetadataValue.int(len(raw_orders) - len(cleaned)),
            "schema": MetadataValue.md(str(cleaned.dtypes)),
        }
    )

@asset(
    ins={
        "staged_orders": AssetIn(),
        "customers": AssetIn(),
    },
    description="Customer lifetime value calculation",
    group_name="marts",
    tags={"layer": "gold"},
)
def customer_ltv(staged_orders: pd.DataFrame, customers: pd.DataFrame) -> pd.DataFrame:
    merged = staged_orders.merge(customers, on='customer_id')
    return merged.groupby('customer_id').agg(
        total_orders=('order_id', 'count'),
        lifetime_value=('amount', 'sum'),
    ).reset_index()
```

## Resources: Dependency Injection

```python
from dagster import resource, ConfigurableResource

class BigQueryResource(ConfigurableResource):
    project: str
    dataset: str

    def write(self, df: pd.DataFrame, table: str):
        df.to_gbq(f"{self.project}.{self.dataset}.{table}", if_exists='replace')

@asset(required_resource_keys={"bigquery"})
def write_to_bq(context, customer_ltv: pd.DataFrame):
    context.resources.bigquery.write(customer_ltv, "customer_ltv")
```

## Testing

```python
from dagster import build_asset_context, materialize

def test_staged_orders():
    # Test the asset transformation in isolation
    raw_data = pd.DataFrame({
        'order_id': ['1', '2', None, '4'],
        'customer_id': ['a', 'b', 'c', None],
        'amount': [100, 0, 50, 200],
    })

    result = staged_orders(raw_data)
    assert len(result.value) == 1  # Only order_id='1', amount=100 survives
    assert result.metadata["row_count"].value == 1

def test_full_pipeline():
    # Materialize a set of assets with test data
    result = materialize(
        [raw_orders, staged_orders, customer_ltv],
        resources={"api": mock_api_resource},
    )
    assert result.success
```

## Dagster vs Prefect vs Airflow

| | Dagster | Prefect | Airflow |
|--|---------|---------|---------|
| Model | Asset-centric | Task-centric | Task-centric |
| Lineage | Built-in, visual | Limited | With extra plugins |
| Testing | Excellent | Good | Difficult |
| Learning curve | High | Low | Medium |
| Best for | Data platform teams, observability | Simple Python pipelines | Enterprise integrations |

Dagster is the best choice when data asset lineage, observability, and testability are first-class requirements — typically at companies building a data platform serving many teams.

## Best For

- **Data platform teams** building a centralized lakehouse or warehouse serving multiple business units where lineage and ownership matter
- **ML engineering** — Dagster's asset model maps naturally to feature tables, training datasets, and model artifacts as tracked data products
- **dbt + Python hybrid pipelines** — Dagster integrates natively with dbt for SQL transforms while handling Python-heavy steps (ML training, API calls)
- **Teams that need testable pipelines** — Dagster's `materialize()` and resource injection make unit testing data transformations straightforward
- **Organizations requiring observable data** — the visual asset graph makes it easy for non-engineers to understand data flow and freshness
