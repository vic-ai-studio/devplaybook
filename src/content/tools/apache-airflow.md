---
title: "Apache Airflow"
description: "Open-source workflow orchestration platform — define, schedule, and monitor data pipelines as Python DAGs with a web UI and rich operator ecosystem."
category: "Data Engineering & Pipeline"
pricing: "Free"
pricingDetail: "Open source; Astronomer (managed Airflow) from $299/month; AWS MWAA and GCP Composer available"
website: "https://airflow.apache.org"
github: "https://github.com/apache/airflow"
tags: [data-engineering, orchestration, pipeline, dags, python, etl, workflow]
pros:
  - "Mature and battle-tested — runs millions of pipelines in production worldwide"
  - "Rich operator ecosystem: AWS, GCP, Azure, dbt, Spark, 600+ operators"
  - "Web UI with DAG visualization, task logs, and backfill support"
  - "Python-native DAG definitions — full programmability"
  - "Large community and extensive documentation"
cons:
  - "Steep learning curve — DAG authoring, scheduler, executor concepts"
  - "Heavyweight setup for simple pipelines (Celery/Kubernetes executor)"
  - "DAG parsing can be slow for large numbers of DAGs"
  - "Limited dynamic task mapping before Airflow 2.3"
date: "2026-04-02"
---

## Overview

Apache Airflow is the most widely deployed workflow orchestration platform. It defines pipelines as Python DAGs (Directed Acyclic Graphs) — code-defined graphs of tasks with explicit dependencies, scheduling, and retry logic.

## Core Concepts

**DAG Definition**:

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.amazon.aws.operators.s3 import S3CreateObjectOperator
from datetime import datetime, timedelta

def extract_data():
    # Extract from source
    return fetch_api_data()

def transform_data(ti):
    raw = ti.xcom_pull(task_ids='extract')
    return clean_and_validate(raw)

def load_to_warehouse(ti):
    data = ti.xcom_pull(task_ids='transform')
    write_to_bigquery(data)

with DAG(
    dag_id='daily_etl_pipeline',
    schedule='@daily',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args={'retries': 2, 'retry_delay': timedelta(minutes=5)},
    tags=['etl', 'production'],
) as dag:
    extract = PythonOperator(task_id='extract', python_callable=extract_data)
    transform = PythonOperator(task_id='transform', python_callable=transform_data)
    load = PythonOperator(task_id='load', python_callable=load_to_warehouse)

    extract >> transform >> load
```

**Dynamic Task Mapping** (Airflow 2.3+):

```python
@dag(schedule='@daily')
def process_files():
    @task
    def get_file_list() -> list[str]:
        return s3.list_objects('my-bucket/input/')

    @task
    def process_file(filename: str):
        # Process each file in parallel
        transform_and_load(filename)

    files = get_file_list()
    process_file.expand(filename=files)  # One task per file
```

## Key Operators

```python
# HTTP API call
from airflow.providers.http.operators.http import HttpOperator

# dbt integration
from astronomer.providers.dbt.task_group.dbt_task_group import DbtTaskGroup

# Kubernetes pod
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator

# Trigger another DAG
from airflow.operators.trigger_dagrun import TriggerDagRunOperator
```

## Running Locally

```bash
pip install apache-airflow

# Quick start (standalone mode)
airflow standalone
# Starts webserver, scheduler, and creates admin user
# UI: http://localhost:8080
```

## When to Use

Airflow excels at enterprise ETL pipelines with complex dependencies, long-running tasks, and integration with many external services. For simpler data workflows or Python-native teams wanting modern DX, consider Prefect or Dagster. For event-driven streaming, use Kafka + Flink rather than Airflow.

---

## Concrete Use-Case: Daily ELT Pipeline with PostgreSQL, dbt, and Snowflake

This example shows a production data engineering team running a daily ELT pipeline that extracts from PostgreSQL, runs dbt transformations, loads to Snowflake, and sends a Slack alert on failure.

**Architecture overview:**

```
PostgreSQL (source) → Extract → dbt Transform → Snowflake (load) → Slack Alert
```

**DAG structure:**

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.postgres_operator import PostgresOperator
from airflow.providers.snowflake.transfers.copy_into_snowflake import CopyFromS3ToSnowflakeOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from airflow.providers.slack.operators.slack import SlackWebhookOperator
from airflow.utils.task_group import TaskGroup
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

SLACK_WEBHOOK_CONN = "slack_alerts"

default_args = {
    "owner": "data-engineering",
    "depends_on_past": False,
    "email_on_failure": False,
    "retries": 3,
    "retry_delay": timedelta(minutes=10),
    "retry_exponential_backoff": True,
    "max_retry_delay": timedelta(hours=1),
}

def extract_orders(**context):
    """Extract yesterday's orders from PostgreSQL to S3 staging."""
    import boto3
    from airflow.hooks.postgres_hook import PostgresHook

    pg = PostgresHook(postgres_conn_id="postgres_source")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    query = f"""
        SELECT order_id, customer_id, total_amount, created_at
        FROM orders
        WHERE DATE(created_at) = '{yesterday}'
    """

    records = pg.get_records(query)
    logger.info(f"Extracted {len(records)} orders")

    # Write to S3 staging area
    s3 = boto3.client("s3")
    import json
    bucket = "data-lake-staging"
    key = f"orders/{yesterday}/orders.json"
    s3.put_object(Bucket=bucket, Key=key, Body=json.dumps(records))

    context["task_instance"].xcom_push(key="date", value=yesterday)
    context["task_instance"].xcom_push(key="record_count", value=len(records))

def send_success_alert(**context):
    date = context["task_instance"].xcom_pull(task_ids="extract", key="date")
    count = context["task_instance"].xcom_pull(task_ids="extract", key="record_count")
    logger.info(f"Pipeline succeeded: {count} orders for {date}")

def send_failure_alert(context):
    dag_id = context["dag_run"].dag_id
    task_id = context["task_instance"].task_id
    error = context["task_instance"].log_url

    SlackWebhookOperator(
        slack_conn_id=SLACK_WEBHOOK_CONN,
        message=f":red_circle: ELT Pipeline Failed\nDAG: {dag_id}\nTask: {task_id}\n<{error}|View Logs>",
    ).execute(context=context)

with DAG(
    dag_id="daily_elt_orders",
    schedule="0 2 * * *",  # 2 AM daily
    start_date=datetime(2026, 1, 1),
    catchup=False,
    default_args=default_args,
    on_failure_callback=send_failure_alert,
    tags=["elt", "snowflake", "production"],
    description="Daily ELT pipeline: PostgreSQL → dbt → Snowflake",
) as dag:

    extract = PythonOperator(
        task_id="extract",
        python_callable=extract_orders,
        doc_md="Extract orders from PostgreSQL to S3 staging area.",
    )

    # Run dbt models
    dbt_run = SnowflakeOperator(
        task_id="dbt_run_models",
        snowflake_conn_id="snowflake_warehouse",
        sql="""
            CALL STORED_PROC_RUN_DBT_MODELS('daily_orders_transform');
        """,
        trigger_rule="all_success",
    )

    # Validate row counts
    validate_counts = SnowflakeOperator(
        task_id="validate_counts",
        snowflake_conn_id="snowflake_warehouse",
        sql="""
            SELECT COUNT(*) FROM orders_fact WHERE partition_date = '{{ task_instance.xcom_pull(task_ids="extract", key="date") }}';
        """,
        trigger_rule="all_success",
    )

    # Send Slack notification on success
    notify = PythonOperator(
        task_id="notify_success",
        python_callable=send_success_alert,
        trigger_rule="all_success",
    )

    extract >> dbt_run >> validate_counts >> notify
```

**Retry handling in practice:**

The DAG above uses `retry_exponential_backoff=True` with `max_retry_delay=timedelta(hours=1)`. This means:
- First retry after 10 minutes
- Second retry after 20 minutes
- Third retry after 40 minutes
- If all retries exhaust, `on_failure_callback` fires the Slack alert

**Key patterns demonstrated:**
- `xcom_pull` to pass extracted record counts between tasks
- `trigger_rule="all_success"` ensures dbt runs only if extraction succeeds
- `on_failure_callback` on the DAG catches any unhandled task failure
- `retry_exponential_backoff` prevents hammering a failing upstream API

---

## Comparison: Airflow vs Prefect vs Dagster

| | **Airflow** | **Prefect** | **Dagster** |
|--|--|--|--|
| **Best for** | Enterprise teams with complex multi-system integrations | Python-first teams wanting fast local iteration | Teams needing data quality testing and asset-aware pipelines |
| **Language** | Python | Python | Python (with Dagster Labs' own op graph model) |
| **Scheduler** | Own scheduler (scheduler + triggerer) | Orion server (or Prefect Cloud) | Own daemon scheduler |
| **DAG model** | Tasks + operators (imperative-ish) | Flows + tasks (declarative) | Ops + graphs (asset-aware) |
| **Dynamic task mapping** | ✅ (2.3+) | ✅ native | ✅ via graph assets |
| **Local dev experience** | Moderate — needs scheduler for full体验 | Excellent — `prefect agent` local | Good — `dagit` local UI |
| **Cloud managed** | Astronomer, AWS MWAA, GCP Composer | Prefect Cloud | Dagster Cloud |
| **dbt integration** | Via task group or operator | Via task | Via assets |
| **Native asset model** | ❌ (task-based only) | Partial (Prefect 2.0) | ✅ First-class |
| **Data quality testing** | External (great_expectations) | External | ✅ Built-in (Dagster assertions) |
| **Learning curve** | Steeper (concepts: executor, triggerer, XCom) | Moderate | Moderate (ops/assets paradigm) |
| **Community** | Largest (Apache, ~30k GitHub stars) | Growing (~13k stars) | Growing (~10k stars) |
| **Typical team size** | 10+ engineers | 2–15 engineers | 3–20 engineers |
| **Install footprint** | Heavy (needs DB + scheduler + webserver) | Light (prefect agent) | Medium (Dagit + daemon) |

**Decision guide:**

- Choose **Airflow** when you need the largest operator ecosystem, enterprise support, or are running on AWS/GCP managed services.
- Choose **Prefect** when your team wants a Python-native DX, fast local testing, and a cleaner mental model.
- Choose **Dagster** when data quality and asset lineage are first-class concerns, or when you want built-in testing without stitching together great_expectations.

---

## When to Use / When Not to Use

**When to use Apache Airflow:**

- You are running **enterprise-scale ETL/ELT** with multiple external systems (PostgreSQL, Snowflake, S3, APIs, Spark, dbt) that require robust retry and alerting logic.
- Your team has an **SRE/DevOps culture** that values mature tooling with known failure modes, extensive documentation, and large community support.
- You need **600+ pre-built operators** so you don't have to write custom connectors for every integration.
- You are already on **AWS (MWAA) or GCP (Composer)** and want managed Airflow with enterprise SLA support via Astronomer.
- Your pipelines require **complex branching, conditional execution, and cross-DAG triggering**.
- You need **web-based observability** for business stakeholders who need to see DAG runs, task status, and logs without direct CLI access.

**When NOT to use Apache Airflow:**

- You are building **simple cron-style jobs** with no branching and just 2–3 tasks. Airflow's setup overhead (metadata DB, scheduler, webserver, executor) is disproportionate. Use Prefect, cron, or even a Makefile instead.
- Your team wants **fast local development and testing** without running a full Airflow instance. Prefect's `prefect agent` and `prefect deploy` are dramatically simpler for local iteration.
- You are building **event-driven streaming pipelines** (Kafka → Flink → downstream). Airflow's scheduler-based model is fundamentally batch; real-time streaming requires Kafka Streams, Flink, or similar.
- You need **native asset awareness** — tracking which tables/data are up-to-date, automatic materialization, and lineage graphs. Dagster's asset model is purpose-built for this; Airflow requires manual bookkeeping or external frameworks.
- Your pipelines are **short-lived and stateless** — for example, a lightweight data transform that runs in under 60 seconds. The Airflow scheduler overhead doesn't pay off for sub-minute jobs.
- You want **zero-config, modern DX** out of the box. Airflow's configuration complexity (choosing an executor, setting up connections, understanding DAG serialization) means non-trivial operational overhead.

**Bottom line:** Airflow is the right choice when reliability, ecosystem breadth, and enterprise support matter more than developer experience simplicity. For teams starting fresh on Python-centric data work in 2026, Prefect or Dagster often deliver value faster — but Airflow remains the right answer for large, established data platforms with complex multi-system integrations.
