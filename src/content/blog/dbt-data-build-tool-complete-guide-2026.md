---
title: "dbt Complete Guide 2026: Models, Tests, Macros & CI/CD"
description: "dbt (data build tool) complete guide 2026: SQL models, ref() function, sources, generic/singular tests, macros with Jinja2, incremental models, dbt Cloud, and CI/CD integration."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["dbt", "data-build-tool", "analytics-engineering", "sql", "data-warehouse", "ci-cd"]
readingTime: "14 min read"
category: "data-engineering"
---

dbt (data build tool) transformed analytics engineering by bringing software engineering practices — version control, testing, documentation, CI/CD — to SQL-based data transformation. In 2026, dbt is the de facto standard for transformation in the modern data stack, used by thousands of teams on Snowflake, BigQuery, Redshift, and DuckDB.

This guide covers everything you need to go from zero to a production-ready dbt project.

## What Is dbt and Why It Matters

Before dbt, data analysts wrote SQL in ad-hoc scripts, Excel files, or stored procedures with no versioning, no testing, and no way to understand dependencies. A change in one table could silently break three downstream reports with no one knowing until a meeting.

dbt solves this by treating your SQL transformations as a software project:
- **Models** are `.sql` files that define a `SELECT` statement — dbt handles the `CREATE TABLE/VIEW` boilerplate
- **`ref()`** creates a dependency graph automatically — dbt runs models in correct order
- **Tests** validate data quality after every run
- **Macros** are reusable Jinja2 functions that reduce SQL duplication
- **Documentation** is auto-generated from your code and schema files

The result is a DAG (directed acyclic graph) of SQL transformations that is reproducible, testable, and documented.

## Project Structure

```
my_dbt_project/
├── dbt_project.yml          # Project configuration
├── profiles.yml             # Database connection settings
├── packages.yml             # External package dependencies
│
├── models/
│   ├── staging/             # Raw source → cleaned layer
│   │   ├── sources.yml      # Source definitions
│   │   ├── stg_orders.sql
│   │   └── stg_customers.sql
│   ├── intermediate/        # Business logic layer
│   │   └── int_order_items.sql
│   └── marts/               # Final analytical models
│       ├── schema.yml       # Model docs + tests
│       ├── fct_orders.sql
│       └── dim_customers.sql
│
├── macros/
│   ├── generate_surrogate_key.sql
│   └── cents_to_dollars.sql
│
├── tests/
│   └── assert_positive_revenue.sql  # Singular tests
│
├── snapshots/
│   └── orders_snapshot.sql
│
└── analyses/
    └── revenue_by_month.sql
```

## SQL Models and the ref() Function

Every dbt model is a `.sql` file containing a single `SELECT` statement. dbt wraps it in a `CREATE TABLE AS` or `CREATE VIEW AS` depending on your materialization setting.

### Staging model: `models/staging/stg_orders.sql`

```sql
-- Staging models clean and rename raw source data
-- They should be 1:1 with source tables

with source as (
    -- ref() to a source (not another model) uses source()
    select * from {{ source('ecommerce', 'raw_orders') }}
),

renamed as (
    select
        id                          as order_id,
        user_id                     as customer_id,
        status,
        -- Normalize currency: raw data stores cents
        {{ cents_to_dollars('amount_cents') }} as order_amount_usd,
        created_at                  as ordered_at,
        updated_at
    from source
    where status != 'test'  -- exclude test orders
)

select * from renamed
```

### Mart model: `models/marts/fct_orders.sql`

```sql
-- ref() creates a dependency edge — dbt builds stg_orders before this
with orders as (
    select * from {{ ref('stg_orders') }}
),

customers as (
    select * from {{ ref('stg_customers') }}
),

order_items as (
    select * from {{ ref('int_order_items') }}
),

final as (
    select
        o.order_id,
        o.customer_id,
        c.customer_name,
        c.customer_segment,
        o.ordered_at,
        o.status,
        o.order_amount_usd,
        coalesce(oi.item_count, 0)    as item_count,
        coalesce(oi.total_quantity, 0) as total_quantity
    from orders o
    left join customers c using (customer_id)
    left join order_items oi using (order_id)
)

select * from final
```

### sources.yml

```yaml
version: 2

sources:
  - name: ecommerce
    database: raw_db
    schema: public
    description: "Raw ecommerce data from Postgres via Fivetran"
    freshness:
      warn_after: {count: 12, period: hour}
      error_after: {count: 24, period: hour}
    tables:
      - name: raw_orders
        loaded_at_field: updated_at
        description: "Raw orders table"
        columns:
          - name: id
            description: "Primary key"
            tests:
              - unique
              - not_null
```

## Testing: Catch Data Quality Issues Early

dbt has two types of tests: generic (built-in) and singular (custom SQL assertions).

### Generic tests in `schema.yml`

```yaml
version: 2

models:
  - name: fct_orders
    description: "One row per order, joined with customer and item data"
    columns:
      - name: order_id
        description: "Unique order identifier"
        tests:
          - unique
          - not_null

      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id

      - name: status
        tests:
          - accepted_values:
              values: ['placed', 'shipped', 'delivered', 'cancelled', 'returned']

      - name: order_amount_usd
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
```

### Singular test: `tests/assert_positive_revenue.sql`

```sql
-- This test FAILS if any rows are returned
-- dbt expects 0 rows = test passes

select
    order_id,
    order_amount_usd
from {{ ref('fct_orders') }}
where
    status = 'delivered'
    and order_amount_usd <= 0
```

Run tests with:

```bash
dbt test                         # run all tests
dbt test --select fct_orders     # test one model
dbt test --select source:ecommerce  # test source freshness
```

## Macros with Jinja2

Macros are reusable functions written in Jinja2 that eliminate repetition across models.

### `macros/cents_to_dollars.sql`

```sql
{% macro cents_to_dollars(column_name, precision=2) %}
    round({{ column_name }} / 100.0, {{ precision }})
{% endmacro %}
```

### `macros/generate_surrogate_key.sql`

```sql
{% macro generate_surrogate_key(field_list) %}
    {{ dbt_utils.generate_surrogate_key(field_list) }}
{% endmacro %}

-- Usage in a model:
-- select
--   {{ generate_surrogate_key(['order_id', 'line_item_id']) }} as surrogate_key
```

### Advanced macro: safe division

```sql
{% macro safe_divide(numerator, denominator, default=0) %}
    case
        when {{ denominator }} = 0 or {{ denominator }} is null
        then {{ default }}
        else {{ numerator }} / {{ denominator }}::float
    end
{% endmacro %}

-- Usage:
-- {{ safe_divide('revenue', 'orders') }} as revenue_per_order
```

## Incremental Models

Full table refreshes are expensive for large datasets. Incremental models only process new or changed records.

### `models/marts/fct_events.sql`

```sql
{{
    config(
        materialized='incremental',
        unique_key='event_id',
        incremental_strategy='merge',
        on_schema_change='sync_all_columns'
    )
}}

with events as (
    select * from {{ ref('stg_events') }}

    {% if is_incremental() %}
        -- Only process records newer than the latest we already have
        where event_timestamp > (
            select max(event_timestamp)
            from {{ this }}
        )
    {% endif %}
)

select
    event_id,
    user_id,
    event_type,
    event_timestamp,
    properties,
    {{ dbt_utils.generate_surrogate_key(['event_id']) }} as surrogate_key
from events
```

Incremental strategies by warehouse:

| Warehouse | Recommended Strategy | Notes |
|---|---|---|
| Snowflake | `merge` | Best for upserts with unique_key |
| BigQuery | `insert_overwrite` | Partition-based, very efficient |
| Redshift | `delete+insert` | merge not natively supported |
| DuckDB | `delete+insert` | For local development |
| Postgres | `merge` | Requires dbt-postgres >= 1.6 |

## Snapshots for SCD Type 2

Snapshots capture the history of slowly changing dimensions (SCD Type 2) — when a customer changes their email, you want to keep both the old and new values with timestamps.

### `snapshots/customers_snapshot.sql`

```sql
{% snapshot customers_snapshot %}

{{
    config(
        target_schema='snapshots',
        unique_key='customer_id',
        strategy='timestamp',
        updated_at='updated_at',
    )
}}

select * from {{ source('ecommerce', 'raw_customers') }}

{% endsnapshot %}
```

dbt adds `dbt_scd_id`, `dbt_updated_at`, `dbt_valid_from`, and `dbt_valid_to` columns automatically. The `dbt_valid_to` is `null` for the current row and a timestamp for historical rows.

## dbt Docs

dbt auto-generates a searchable documentation site from your models and schema YAML files.

```bash
dbt docs generate   # build the docs site
dbt docs serve      # open docs at localhost:8080
```

The docs site shows:
- Model descriptions and column definitions
- Lineage DAG (visual dependency graph)
- Source freshness status
- Test coverage per model

## dbt Core vs dbt Cloud

| Feature | dbt Core (open source) | dbt Cloud |
|---|---|---|
| Price | Free | $50/seat/month (Team) |
| CLI usage | Full access | Yes + browser IDE |
| Job scheduling | Manual / CI/CD | Built-in scheduler |
| Environment management | Manual | Dev/Staging/Prod environments |
| CI/CD integration | GitHub Actions (manual setup) | Native GitHub/GitLab CI |
| Semantic Layer | Limited | Full (dbt Metrics) |
| Observability | External tools needed | Built-in job history + alerts |
| Self-hosting | Required | Fully managed |

For solo developers and small teams: dbt Core + GitHub Actions is entirely sufficient and free. For data teams with multiple engineers and stakeholders needing scheduled jobs and lineage dashboards, dbt Cloud pays for itself quickly.

## CI/CD with GitHub Actions

### `.github/workflows/dbt-ci.yml`

```yaml
name: dbt CI

on:
  pull_request:
    paths:
      - 'models/**'
      - 'tests/**'
      - 'macros/**'
      - 'snapshots/**'

env:
  DBT_PROFILES_DIR: .

jobs:
  dbt-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dbt
        run: |
          pip install dbt-snowflake==1.8.0

      - name: Create profiles.yml
        run: |
          cat > profiles.yml << EOF
          my_project:
            target: ci
            outputs:
              ci:
                type: snowflake
                account: ${{ secrets.SNOWFLAKE_ACCOUNT }}
                user: ${{ secrets.SNOWFLAKE_USER }}
                private_key_passphrase: ${{ secrets.SNOWFLAKE_PRIVATE_KEY }}
                database: CI_DB
                warehouse: CI_WH
                schema: dbt_ci_${{ github.event.pull_request.number }}
                threads: 4
          EOF

      - name: dbt deps
        run: dbt deps

      - name: dbt compile (syntax check)
        run: dbt compile

      - name: dbt build (run + test on slim CI)
        run: |
          # Only run models changed in this PR
          dbt build --select state:modified+ --defer --state ./target
        env:
          DBT_TARGET: ci

      - name: Upload manifest
        uses: actions/upload-artifact@v4
        with:
          name: dbt-manifest
          path: target/manifest.json
```

The `state:modified+` selector is key: it only runs models that changed in the PR plus their downstream dependents. This makes CI fast even on large projects with hundreds of models.

## The `packages.yml` Ecosystem

dbt has a rich package ecosystem. Almost every project benefits from:

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.2.0
  - package: dbt-labs/audit_helper
    version: 0.12.0
  - package: calogica/dbt_expectations
    version: 0.10.3
  - package: dbt-labs/codegen
    version: 0.12.1
```

Install with `dbt deps`. The `dbt_utils` package alone saves hundreds of lines with helpers like `surrogate_key()`, `pivot()`, `unpivot()`, `safe_cast()`, and `date_spine()`.

## Key Commands Reference

```bash
dbt run                            # run all models
dbt run --select stg_orders        # run one model
dbt run --select +fct_orders       # run model + all upstream
dbt run --select fct_orders+       # run model + all downstream
dbt run --select tag:daily         # run models with tag

dbt test                           # run all tests
dbt build                          # run + test together

dbt snapshot                       # run all snapshots
dbt source freshness               # check source freshness

dbt compile                        # compile without executing
dbt debug                          # test database connection
dbt clean                          # delete target/ and dbt_packages/
```

dbt is one of those tools that genuinely transforms how a data team operates. The combination of version-controlled SQL, automatic dependency resolution, built-in testing, and auto-generated documentation eliminates entire categories of data quality incidents that previously required heroic manual debugging.
