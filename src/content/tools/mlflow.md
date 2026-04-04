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
