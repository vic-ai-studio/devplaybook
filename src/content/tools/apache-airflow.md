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
