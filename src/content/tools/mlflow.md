---
title: "MLflow"
description: "Open-source MLOps platform for experiment tracking, model registry, and deployment — works with any ML library and runs locally or on-premise."
category: "AI/ML Dev Tools"
pricing: "Free"
pricingDetail: "Open source; Databricks Managed MLflow available as a hosted service"
website: "https://mlflow.org"
github: "https://github.com/mlflow/mlflow"
tags: ["mlops", "experiment-tracking", "ml", "model-registry", "python", "databricks", "machine-learning", "ai"]
pros:
  - "Fully open source — no SaaS dependency, runs on your infrastructure"
  - "Model Registry: version, stage, and promote models (staging → production)"
  - "MLflow Projects: reproducible ML runs packaged with conda/docker"
  - "Works with any ML framework — PyTorch, TensorFlow, scikit-learn, XGBoost"
  - "Native Databricks integration for enterprise teams"
cons:
  - "UI is functional but less polished than W&B or Neptune"
  - "No built-in hyperparameter sweeps (use Optuna/Ray Tune separately)"
  - "Artifact storage requires external setup (S3, Azure Blob, GCS) for teams"
  - "Self-hosting at scale requires infrastructure management"
date: "2026-04-02"
---

## Overview

MLflow is the open-source alternative to W&B for teams that need full data sovereignty or Databricks integration. It covers the ML lifecycle from experiment tracking to model deployment without vendor lock-in.

## Experiment Tracking

```python
import mlflow
import mlflow.sklearn

# Set the tracking server (default: local ./mlruns)
mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("credit-risk-model")

with mlflow.start_run(run_name="random-forest-v1"):
    # Log parameters
    mlflow.log_params({
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 5,
    })

    # Train model
    model = RandomForestClassifier(n_estimators=100, max_depth=10)
    model.fit(X_train, y_train)

    # Log metrics
    mlflow.log_metrics({
        "accuracy": accuracy_score(y_test, model.predict(X_test)),
        "roc_auc": roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]),
    })

    # Log the model (with automatic signature inference)
    mlflow.sklearn.log_model(
        model,
        "random-forest",
        input_example=X_train[:5],
    )
```

## Model Registry

```python
# Register a model from a run
result = mlflow.register_model(
    f"runs:/{run_id}/random-forest",
    "CreditRiskModel"
)

# Transition to production
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name="CreditRiskModel",
    version=result.version,
    stage="Production",
)

# Load the production model
model = mlflow.sklearn.load_model("models:/CreditRiskModel/Production")
```

## Serving Models

```bash
# Serve a logged model via REST API
mlflow models serve -m "models:/CreditRiskModel/Production" -p 1234

# Make predictions
curl -d '{"dataframe_split": {"columns": ["feature1", "feature2"], "data": [[1.0, 2.0]]}}' \
  -H 'Content-Type: application/json' \
  http://127.0.0.1:1234/invocations
```

## Starting the Tracking Server

```bash
# Install
pip install mlflow

# Start with local SQLite backend
mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./artifacts

# Production: use PostgreSQL + S3
mlflow server \
  --backend-store-uri postgresql://user:pass@localhost/mlflow \
  --default-artifact-root s3://my-bucket/mlflow-artifacts
```

## Concrete Use Case: Fraud Detection Model Lifecycle

A payments team trains a fraud detection model on transaction data. They run experiments across three approaches — Random Forest, XGBoost, and a neural network — then pick the best one for production via the Model Registry.

**Step 1: Track experiments**

```python
mlflow.set_experiment("fraud-detection")

# Run 1: Random Forest
with mlflow.start_run(run_name="rf-baseline"):
    mlflow.log_params({"model": "random_forest", "n_estimators": 200, "max_depth": 15})
    model = RandomForestClassifier(n_estimators=200, max_depth=15)
    model.fit(X_train, y_train)
    mlflow.log_metrics({
        "precision": precision_score(y_test, model.predict(X_test)),
        "recall": recall_score(y_test, model.predict(X_test)),
        "f1": f1_score(y_test, model.predict(X_test)),
    })
    mlflow.sklearn.log_model(model, "rf-model")

# Run 2: XGBoost
with mlflow.start_run(run_name="xgboost-tuned"):
    mlflow.log_params({"model": "xgboost", "learning_rate": 0.05, "max_depth": 8})
    model = xgb.XGBClassifier(learning_rate=0.05, max_depth=8, eval_metric="logloss")
    model.fit(X_train, y_train)
    mlflow.log_metrics({
        "precision": precision_score(y_test, model.predict(X_test)),
        "recall": recall_score(y_test, model.predict(X_test)),
        "f1": f1_score(y_test, model.predict(X_test)),
    })
    mlflow.sklearn.log_model(model, "xgb-model")
```

**Step 2: Compare runs in the MLflow UI**

Open the UI at `http://localhost:5000`. The Runs table shows all experiments side-by-side with logged metrics, parameters, and artifacts. Sort by `f1` to surface the best performer. In this scenario, `xgboost-tuned` wins with F1=0.87 vs RF's F1=0.81.

**Step 3: Register and promote the winning model**

```python
client = mlflow.tracking.MlflowClient()

# Register the best run's model
best_run_id = "..."  # copy from UI or query with mlflow.search_runs()
registered = mlflow.register_model(
    f"runs:/{best_run_id}/xgb-model",
    "FraudDetectionModel"
)

# Move to Production after validation
client.transition_model_version_stage(
    name="FraudDetectionModel",
    version=registered.version,
    stage="Production",
)
```

**Step 4: Serve and call the production model**

```python
# Load production model
model = mlflow.sklearn.load_model("models:/FraudDetectionModel/Production")

# Predict on a new transaction
transaction = [[amount, frequency, country_risk, ...]]
is_fraud = model.predict_proba(transaction)[:, 1] > 0.7
```

This workflow — track → compare → register → serve — keeps every team member aligned on which model is live, why it was selected, and how to reproduce it.

## MLflow vs Alternatives

| Feature | MLflow | Weights & Biases | Neptune.ai | Manual Logging |
|---|---|---|---|---|
| Open source | ✅ | ❌ (SaaS) | ❌ (SaaS) | ✅ |
| Self-hosted | ✅ | ❌ | ❌ | ✅ |
| Model Registry | ✅ | ✅ | ✅ | ❌ |
| Experiment tracking | ✅ | ✅ | ✅ | ❌ |
| Built-in hyperparameter sweeps | ❌ | ✅ | ✅ | ❌ |
| Collaboration / sharing | Basic | Excellent | Excellent | None |
| SaaS offering | Databricks (paid) | W&B hosted | Neptune hosted | N/A |
| Best for | Enterprise + Databricks | Research teams | PM/sharing-heavy teams | Solo projects |

**Before MLflow (manual logging):**

```python
# Manual approach — brittle, no searchability
import pickle
from datetime import datetime
model = RandomForestClassifier().fit(X_train, y_train)
score = f1_score(y_test, model.predict(X_test))
with open(f"model_{datetime.now().strftime('%Y%m%d_%H%M%S')}_f1{score:.3f}.pkl", "wb") as f:
    pickle.dump(model, f)
# Version control? Git? Who knows. Which params gave this score? Good luck.
```

**After MLflow:**

```python
# One extra line sets you up for full reproducibility
mlflow.sklearn.log_model(model, "model")
# Instantly searchable, comparable, promotable to production.
```

## When to Use MLflow / When Not to Use

**Use MLflow when:**

- You need **data sovereignty** — data cannot leave your infrastructure (healthcare, finance, defense).
- Your team uses **Databricks** or plans to adopt it; MLflow is the native experiment tracking layer.
- You want an **open-source Model Registry** without paying for a SaaS product.
- You need **framework-agnostic tracking** — PyTorch, TensorFlow, XGBoost, and sklearn in the same project.
- You're running **reproducible ML pipelines** with MLflow Projects (conda/docker packaging).
- You need **production model staging** — promote Candidate → Staging → Production with approval gates.

**Do not use MLflow when:**

- Your team is small (1–3 people) and wants the **fastest setup**; W&B `wandb.init()` is one line and the UI works out of the box.
- You need **native hyperparameter sweeps** — MLflow doesn't have this; use Optuna, Ray Tune, or Hyperopt alongside it.
- You need a **polished, modern UI** with native charts, sweep visualization, and collaborative features; W&B is more mature here.
- You're doing **pure research** where experiment results need to be shareable via public links with non-technical collaborators; Neptune or W&B handle this better.
- Your artifact data is huge and you don't want to manage your own S3/GCS bucket; a managed SaaS handles this transparently.
- You want **zero infrastructure management** — self-hosting MLflow at scale means managing the tracking server, PostgreSQL, artifact storage, and backups yourself.

In short: MLflow is the right choice when control and ownership outweigh convenience. If you're on Databricks or need enterprise-grade governance with no vendor lock-in, MLflow is purpose-built for that. If you want to open a browser and start comparing runs in 60 seconds with no server to maintain, a SaaS alternative will serve you better.
