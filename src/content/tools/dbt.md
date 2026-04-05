---
title: "dbt — SQL-First Data Transformation Framework"
description: "SQL-first data transformation framework — write SELECT statements, dbt handles the ETL mechanics, testing, documentation, and lineage graph."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "dbt Core is open source; dbt Cloud (hosted) from $50/developer/month"
website: "https://www.getdbt.com"
github: "https://github.com/dbt-labs/dbt-core"
tags: [data-engineering, sql, transformation, analytics, elt, warehouse, testing]
pros:
  - "SQL-first: analysts write transforms in SQL, not Python"
  - "Built-in testing: not-null, unique, accepted-values, relationships out of the box"
  - "Auto-generated documentation with lineage DAG"
  - "Jinja templating for reusable SQL macros"
  - "Works with Snowflake, BigQuery, Redshift, DuckDB, Databricks, and more"
cons:
  - "Limited to ELT (transform in warehouse), not ETL"
  - "Complex Python logic still requires external tools"
  - "dbt Cloud can be expensive for large teams"
  - "YAML configuration can be verbose for large projects"
date: "2026-04-02"
---

## Overview

dbt (data build tool) transformed analytics engineering by bringing software engineering practices — version control, testing, documentation, CI/CD — to SQL-based data transformation. Instead of writing ad-hoc SQL queries that nobody maintains, dbt projects are structured, tested, and documented.

## Project Structure

```
dbt_project/
├── models/
│   ├── staging/          # Raw source data → clean
│   │   ├── stg_orders.sql
│   │   └── stg_customers.sql
│   ├── intermediate/     # Business logic
│   │   └── int_order_items.sql
│   └── marts/            # Final analytics tables
│       ├── orders.sql
│       └── customer_ltv.sql
├── tests/                # Custom tests
├── macros/               # Reusable SQL functions
├── seeds/                # CSV reference data
└── dbt_project.yml       # Project config
```

## Writing Models

```sql
-- models/staging/stg_orders.sql
-- Jinja config block
{{ config(materialized='view') }}

with source as (
    select * from {{ source('postgres', 'orders') }}
),

cleaned as (
    select
        id as order_id,
        user_id as customer_id,
        created_at,
        status,
        -- Coerce types, handle nulls
        coalesce(total_amount, 0) as total_amount,
        -- Only include non-cancelled orders
        case when status = 'cancelled' then false else true end as is_active
    from source
    where created_at >= '2024-01-01'
)

select * from cleaned
```

```sql
-- models/marts/customer_ltv.sql
{{ config(materialized='table', tags=['daily']) }}

with orders as (
    select * from {{ ref('stg_orders') }}  -- Ref creates lineage dependency
),

customers as (
    select * from {{ ref('stg_customers') }}
),

ltv_calc as (
    select
        c.customer_id,
        c.email,
        count(o.order_id) as total_orders,
        sum(o.total_amount) as lifetime_value,
        min(o.created_at) as first_order_date,
        max(o.created_at) as last_order_date
    from customers c
    left join orders o using (customer_id)
    where o.is_active
    group by 1, 2
)

select * from ltv_calc
```

## Testing

```yaml
# models/staging/schema.yml
version: 2

models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'completed', 'cancelled', 'refunded']
      - name: customer_id
        tests:
          - relationships:
              to: ref('stg_customers')
              field: customer_id
```

```bash
dbt test                    # Run all tests
dbt test --select stg_orders # Test one model
dbt build                   # Run models + tests in dependency order
```

## Running dbt

```bash
pip install dbt-snowflake  # or dbt-bigquery, dbt-postgres, etc.

dbt init my_project
dbt debug        # Check connection
dbt run          # Build all models
dbt run --select marts.customer_ltv  # Build one model
dbt docs generate && dbt docs serve  # Auto-generated docs + lineage graph
```

## dbt + Airflow Integration

```python
# Trigger dbt from Airflow
from astronomer.providers.dbt.task_group.dbt_task_group import DbtTaskGroup

with DAG('dbt_pipeline') as dag:
    dbt_run = DbtTaskGroup(
        group_id='dbt_models',
        project_dir='/dbt',
        select=['tag:daily'],
        execution_config=ExecutionConfig(execution_mode=ExecutionMode.LOCAL)
    )
```
