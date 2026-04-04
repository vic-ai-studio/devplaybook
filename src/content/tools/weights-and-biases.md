---
title: "Weights & Biases"
description: "MLOps platform for experiment tracking, model versioning, dataset management, and hyperparameter sweeps — the industry standard for ML experiment logging."
category: "AI/ML Dev Tools"
pricing: "Freemium"
pricingDetail: "Free for personal/academic use; Teams from $50/user/month; Enterprise custom pricing"
website: "https://wandb.ai"
github: "https://github.com/wandb/wandb"
tags: ["mlops", "experiment-tracking", "ml", "training", "monitoring", "wandb", "machine-learning", "ai"]
pros:
  - "Near-zero setup: two lines of code to start logging experiments"
  - "Rich visualizations — loss curves, confusion matrices, sample predictions"
  - "Sweeps: automated hyperparameter search (Bayesian, grid, random)"
  - "Artifacts: versioned storage for datasets and models"
  - "Team collaboration with shared dashboards and reports"
cons:
  - "Free tier has limited data retention and private project limits"
  - "Can slow down training loops if logging is too frequent"
  - "Teams pricing is expensive for large ML teams"
  - "Requires internet connectivity (self-hosted option exists but complex)"
date: "2026-04-02"
---

## Overview

Weights & Biases (W&B) is the most widely used experiment tracking platform in ML. It lets you log metrics, hyperparameters, model checkpoints, and media from training runs, then compare them visually. The industry standard for teams training deep learning models.

## Basic Experiment Tracking

```python
import wandb

# Initialize a run
wandb.init(
    project="image-classifier",
    config={
        "learning_rate": 1e-3,
        "batch_size": 32,
        "epochs": 100,
        "architecture": "ResNet50",
    }
)

# Training loop
for epoch in range(wandb.config.epochs):
    train_loss, val_loss, val_acc = train_one_epoch(model, ...)

    wandb.log({
        "epoch": epoch,
        "train/loss": train_loss,
        "val/loss": val_loss,
        "val/accuracy": val_acc,
    })

wandb.finish()
```

## Hyperparameter Sweeps

```python
# Define sweep configuration
sweep_config = {
    "method": "bayes",  # Bayesian optimization
    "metric": {"name": "val/accuracy", "goal": "maximize"},
    "parameters": {
        "learning_rate": {"min": 1e-5, "max": 1e-2},
        "batch_size": {"values": [16, 32, 64]},
        "dropout": {"min": 0.1, "max": 0.5},
    }
}

def train():
    with wandb.init() as run:
        config = run.config
        model = build_model(dropout=config.dropout)
        train_model(model, lr=config.learning_rate, bs=config.batch_size)

sweep_id = wandb.sweep(sweep_config, project="image-classifier")
wandb.agent(sweep_id, function=train, count=50)  # Run 50 trials
```

## Model and Dataset Artifacts

```python
# Log a model checkpoint
artifact = wandb.Artifact("model-checkpoint", type="model")
artifact.add_file("checkpoint.pth")
wandb.log_artifact(artifact)

# Log a dataset
dataset_artifact = wandb.Artifact("training-data-v2", type="dataset")
dataset_artifact.add_dir("data/train/")
wandb.log_artifact(dataset_artifact)

# Use an artifact in another run
artifact = wandb.use_artifact("training-data-v2:latest")
data_dir = artifact.download()
```

## LLM Fine-tuning Integration

W&B integrates with Hugging Face Trainer out of the box:

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="./results",
    report_to="wandb",  # That's all you need
    run_name="llama-finetune-v1",
)
```
