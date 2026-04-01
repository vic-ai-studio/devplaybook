---
title: "ML Model Monitoring in Production: Tools & Techniques 2026"
description: "ML model monitoring guide: data drift detection, concept drift, model performance degradation, Evidently AI, Prometheus metrics for ML, alerting strategies, and retraining triggers."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["ML monitoring", "data drift", "model monitoring", "Evidently AI", "production ML", "MLOps"]
readingTime: "10 min read"
category: "ai"
---

A model that scored 94% accuracy in your evaluation set and is now silently returning garbage predictions is worse than no model at all. It's worse because you won't know for weeks—until customers complain, revenue drops, or an audit surfaces the issue.

ML model monitoring exists to close that feedback loop. This guide covers what to monitor, how to detect drift early, and how to build alerting that triggers before production quality degrades below acceptable thresholds.

---

## The Four Pillars of ML Monitoring

### 1. Data Drift
Input feature distributions shift over time. A model trained on winter purchase data deployed through summer sees fundamentally different inputs.

### 2. Concept Drift
The relationship between inputs and the correct output changes. A fraud model trained before a new fraud technique emerges starts missing that fraud vector—even if input distributions look normal.

### 3. Prediction Distribution Shift
Your model starts outputting scores or classes at different rates than during training. Sudden increase in high-confidence predictions, or the class distribution flipping.

### 4. Performance Degradation
The model's actual accuracy, precision, or business metric falls below threshold. This requires ground truth labels, which arrive with delay in most real systems.

| Pillar | Signal | Latency to Detect | Requires Labels |
|---|---|---|---|
| Data drift | Feature statistics | Real-time | No |
| Concept drift | Performance on labeled samples | Days-weeks | Yes |
| Prediction shift | Output distribution | Real-time | No |
| Performance | Accuracy/AUC/F1 | Days-weeks | Yes |

The practical implication: monitor data drift and prediction shift in real-time, use them as early warning signals, and verify via performance metrics when labels arrive.

---

## Logging Predictions for Monitoring

Every inference must be logged. No logs = no monitoring. Store at minimum:

```python
import uuid
from datetime import datetime
from dataclasses import dataclass, asdict
import json

@dataclass
class PredictionLog:
    prediction_id: str
    model_version: str
    timestamp: str
    # Input features (schema-validated)
    features: dict
    # Model output
    prediction: float | str | list
    confidence: float | None
    # Filled in later when ground truth arrives
    ground_truth: float | str | None = None
    latency_ms: float | None = None

def log_prediction(features: dict, prediction, confidence=None, model_version="v1") -> str:
    pred_id = str(uuid.uuid4())
    log_entry = PredictionLog(
        prediction_id=pred_id,
        model_version=model_version,
        timestamp=datetime.utcnow().isoformat(),
        features=features,
        prediction=prediction,
        confidence=confidence,
    )

    # Write to your feature store / data warehouse
    append_to_store("predictions", asdict(log_entry))

    return pred_id  # Return for later ground truth linking
```

Store logs in a queryable store (BigQuery, ClickHouse, PostgreSQL). You'll need to query by time window, model version, and feature values.

---

## Evidently AI for Drift Reports

[Evidently AI](https://www.evidentlyai.com/) is the most widely used open-source library for ML monitoring reports and dashboards.

### Data Drift Detection

```python
import pandas as pd
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, DataQualityPreset
from evidently.metrics import ColumnDriftMetric, DatasetDriftMetric

# Reference data: what the model was trained/validated on
reference_df = pd.read_parquet("reference_data_march.parquet")

# Current data: last 7 days of production inputs
current_df = pd.read_parquet("production_inputs_last_7d.parquet")

# Generate drift report
report = Report(metrics=[
    DataDriftPreset(),         # All features
    DataQualityPreset(),       # Missing values, outliers
    ColumnDriftMetric(column_name="purchase_amount"),    # Specific feature
    ColumnDriftMetric(column_name="user_age_bucket"),
    DatasetDriftMetric(),      # Overall drift score
])

report.run(reference_data=reference_df, current_data=current_df)
report.save_html("drift_report.html")

# Access results programmatically
result = report.as_dict()
drift_detected = result["metrics"][0]["result"]["dataset_drift"]
drift_share = result["metrics"][0]["result"]["share_of_drifted_columns"]

print(f"Drift detected: {drift_detected}, Columns drifted: {drift_share:.1%}")
```

### Model Performance Monitoring

```python
from evidently.metric_preset import ClassificationPreset, RegressionPreset
from evidently.metrics import ClassificationQualityMetric

# For classification: needs predictions + ground truth
perf_report = Report(metrics=[
    ClassificationPreset(probas_threshold=0.5),
    ClassificationQualityMetric(),
])

# df must have 'target' (ground truth) and 'prediction' columns
perf_report.run(reference_data=reference_df, current_data=labeled_current_df)
perf_report.save_html("performance_report.html")
```

### Scheduled Monitoring with Evidently Test Suites

```python
from evidently.test_suite import TestSuite
from evidently.test_preset import DataDriftTestPreset
from evidently.tests import (
    TestShareOfDriftedColumns,
    TestNumberOfDriftedColumns,
    TestColumnDrift,
)

suite = TestSuite(tests=[
    TestShareOfDriftedColumns(lt=0.3),      # Less than 30% of columns drifted
    TestNumberOfDriftedColumns(lt=5),        # Less than 5 columns drifted
    TestColumnDrift(column_name="purchase_amount", stattest="ks", stattest_threshold=0.05),
])

suite.run(reference_data=reference_df, current_data=current_df)

if not suite.as_dict()["summary"]["all_passed"]:
    send_alert("Data drift threshold exceeded — review required")
```

---

## Statistical Tests for Drift

Understanding which statistical test to use when:

| Test | Best For | Sensitivity | Notes |
|---|---|---|---|
| **KS Test** (Kolmogorov-Smirnov) | Continuous features | Medium | Distribution shape changes |
| **PSI** (Population Stability Index) | Binned continuous | Low-Medium | Industry standard in finance |
| **Chi-squared** | Categorical features | Medium | Requires sufficient sample size |
| **Jensen-Shannon Divergence** | Any distribution | High | Good for detecting subtle shifts |
| **Wasserstein distance** | Continuous features | High | Accounts for magnitude of shift |

PSI thresholds (standard rule of thumb):

```python
def calculate_psi(reference: pd.Series, current: pd.Series, bins: int = 10) -> float:
    """Population Stability Index. PSI < 0.1: stable. 0.1-0.2: minor drift. > 0.2: major drift."""
    reference_counts, bin_edges = np.histogram(reference, bins=bins)
    current_counts, _ = np.histogram(current, bins=bin_edges)

    # Avoid division by zero
    reference_pct = (reference_counts + 0.0001) / len(reference)
    current_pct = (current_counts + 0.0001) / len(current)

    psi = np.sum((current_pct - reference_pct) * np.log(current_pct / reference_pct))
    return psi

psi = calculate_psi(reference_df["purchase_amount"], current_df["purchase_amount"])
if psi > 0.2:
    trigger_alert(f"Major drift in purchase_amount: PSI={psi:.3f}")
elif psi > 0.1:
    log_warning(f"Minor drift in purchase_amount: PSI={psi:.3f}")
```

---

## Prometheus Metrics for ML Endpoints

Expose ML-specific metrics from your inference service so your existing Prometheus/Grafana stack can monitor them:

```python
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time

# Counters
PREDICTIONS_TOTAL = Counter(
    "ml_predictions_total",
    "Total number of predictions",
    ["model_version", "outcome_class"]
)

PREDICTION_ERRORS = Counter(
    "ml_prediction_errors_total",
    "Total prediction errors",
    ["error_type"]
)

# Histograms
PREDICTION_LATENCY = Histogram(
    "ml_prediction_latency_seconds",
    "Prediction latency distribution",
    ["model_version"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

CONFIDENCE_SCORE = Histogram(
    "ml_prediction_confidence",
    "Distribution of model confidence scores",
    ["model_version"],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# Gauges (current state)
ROLLING_ACCURACY = Gauge(
    "ml_rolling_accuracy",
    "Rolling accuracy over last 1000 labeled predictions",
    ["model_version"]
)

def predict_with_metrics(features: dict, model_version: str = "v1"):
    start = time.time()

    try:
        result = model.predict(features)
        confidence = result["confidence"]
        prediction_class = result["class"]

        PREDICTIONS_TOTAL.labels(
            model_version=model_version,
            outcome_class=str(prediction_class)
        ).inc()

        CONFIDENCE_SCORE.labels(model_version=model_version).observe(confidence)

        return result
    except Exception as e:
        PREDICTION_ERRORS.labels(error_type=type(e).__name__).inc()
        raise
    finally:
        latency = time.time() - start
        PREDICTION_LATENCY.labels(model_version=model_version).observe(latency)

# Start metrics server on port 8000
start_http_server(8000)
```

**Grafana alert rules to configure:**

- Prediction latency p99 > 500ms → page on-call
- Confidence score mean drops below 0.65 over 30 min → warning
- Error rate exceeds 1% → page on-call
- Rolling accuracy (when labels available) drops 5+ points from baseline → trigger investigation

---

## Shadow Deployment for Safe Model Updates

Before routing real traffic to a new model, run it in shadow mode: it receives production inputs and logs predictions, but its outputs are not returned to users.

```python
import asyncio

async def shadow_predict(features: dict):
    """Run primary model + shadow model in parallel. Return primary result."""

    primary_task = asyncio.create_task(
        primary_model.predict_async(features)
    )
    shadow_task = asyncio.create_task(
        shadow_model.predict_async(features)
    )

    # Return primary immediately, don't wait for shadow
    primary_result = await primary_task

    # Log shadow result for comparison (fire and forget)
    asyncio.create_task(log_shadow_comparison(
        features=features,
        primary=primary_result,
        shadow_future=shadow_task,
    ))

    return primary_result

async def log_shadow_comparison(features, primary, shadow_future):
    try:
        shadow_result = await asyncio.wait_for(shadow_future, timeout=2.0)
        agreement = primary["class"] == shadow_result["class"]
        log_metric("shadow_agreement", int(agreement))
    except asyncio.TimeoutError:
        log_metric("shadow_timeout", 1)
```

Run shadow deployment for at least 72 hours and 10,000+ predictions before promoting a model to production.

---

## Retraining Triggers

| Trigger Type | Condition | Action |
|---|---|---|
| Schedule | Weekly / monthly | Retrain with fresh data regardless |
| Drift threshold | PSI > 0.2 on key features | Retrain + evaluate before promoting |
| Performance degradation | Accuracy drops 5+ points | Immediate retrain + manual review |
| Data volume | Training set more than 2x larger | Incremental fine-tune |
| Concept shift detected | External event (new product, policy change) | Targeted retraining |

```python
from datetime import datetime, timedelta

class RetrainingTrigger:
    def __init__(self, model_name: str):
        self.model_name = model_name

    def should_retrain(self, monitoring_data: dict) -> tuple[bool, str]:
        # Check PSI drift
        if monitoring_data.get("max_psi", 0) > 0.2:
            return True, f"Data drift: PSI={monitoring_data['max_psi']:.3f}"

        # Check performance degradation
        baseline_accuracy = monitoring_data.get("baseline_accuracy", 0.94)
        current_accuracy = monitoring_data.get("current_accuracy")
        if current_accuracy and (baseline_accuracy - current_accuracy) > 0.05:
            return True, f"Performance drop: {baseline_accuracy:.2%} → {current_accuracy:.2%}"

        # Check schedule (weekly)
        last_trained = monitoring_data.get("last_trained_at")
        if last_trained:
            days_since = (datetime.utcnow() - last_trained).days
            if days_since >= 7:
                return True, f"Scheduled retrain: {days_since} days since last training"

        return False, "No retrain needed"
```

---

## The Monitoring Stack Decision Matrix

| Scale | Recommended Stack | Cost |
|---|---|---|
| Startup / prototype | Evidently + Grafana + Postgres | ~$50/mo |
| Mid-size team | Evidently Cloud + Prometheus + PagerDuty | ~$200/mo |
| Enterprise | Arize AI or WhyLabs + custom pipelines | $1,000+/mo |
| Self-managed enterprise | Evidently + Grafana + ClickHouse + Airflow | Infrastructure cost |

The most common mistake: teams build their model and deploy it, then plan to "add monitoring later." Later never comes until something breaks. Instrument your prediction endpoint on day one—even basic logging of features and predictions gives you the data to retroactively investigate any future issue.

Start with PSI on your top 5 features and a confidence score histogram. That alone catches 70% of production issues before they become customer problems.
