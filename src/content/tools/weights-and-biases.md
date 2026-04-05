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

---

## Concrete Use Case: Finding Optimal Hyperparameters for ResNet on CIFAR-10

Imagine you are a computer vision engineer training a ResNet-50 model on CIFAR-10 for a product defect detection system. You need to find the best learning rate and batch size combination before committing to a full training run. W&B sweeps make this systematic and reproducible.

**Step 1: Define the sweep.** You write a `sweep.yaml` or use the Python API:

```python
sweep_config = {
    "name": "resnet-cifar10-hparam-search",
    "method": "bayes",
    "metric": {"name": "val/accuracy", "goal": "maximize"},
    "parameters": {
        "learning_rate": {"min": 1e-4, "max": 1e-2, "distribution": "log_uniform"},
        "batch_size": {"values": [32, 64, 128, 256]},
        "optimizer": {"values": ["adam", "sgd"]},
        "weight_decay": {"min": 1e-5, "max": 1e-3},
    },
}

sweep_id = wandb.sweep(sweep_config, project="defect-detector")
wandb.agent(sweep_id, function=train, count=50)  # 50 trials
```

**Step 2: Run the sweep.** Each trial trains ResNet-50 for 20 epochs on CIFAR-10. W&B automatically logs system metrics (GPU utilization, memory), train/val loss, and validation accuracy for every run.

**Step 3: Analyze in the dashboard.** After 50 runs, you open the W&B sweeps page. You see:
- A parallel coordinates plot showing how each hyperparameter combination maps to final accuracy
- A contour plot revealing interaction effects (e.g., SGD performs well only with batch_size=256 and higher learning rates)
- A summary table ranking the top 5 configurations by validation accuracy

You identify that `learning_rate=3.2e-3, batch_size=128, optimizer=sgd` yields 94.7% validation accuracy — the best across all 50 trials.

**Step 4: Promote the best model artifact and use it in a new script.** Once you've identified the winning run, you promote its checkpoint to a named version:

```python
# In the original sweep run script (or via the UI)
run = wandb.init(project="defect-detector", id="run-abc123")
artifact = wandb.Artifact("resnet50-cifar10-best", type="model")
artifact.add_file("best_model.pth")
wandb.log_artifact(artifact)
wandb.finish()

# In a new training script (fine-tuning on production data)
artifact = wandb.use_artifact("defect-detector/resnet50-cifar10-best:latest")
model_dir = artifact.download()
model = load_resnet50_from_checkpoint(f"{model_dir}/best_model.pth")
fine_tune_on_production_data(model, production_dataset)
```

This workflow — sweep → visual analysis → artifact promotion → reuse — is the core W&B loop that separates it from ad-hoc experiment tracking.

---

## W&B vs MLflow vs Neptune: Experiment Tracking Comparison

All three platforms track experiments, but they differ significantly in setup complexity, visualization depth, and team collaboration features.

| | **Weights & Biases** | **MLflow** | **Neptune** |
|---|---|---|---|
| **Setup time** | < 5 min (2-line integration) | 15–60 min (server, tracking URI) | < 5 min (2-line integration) |
| **Hosting** | Cloud (default) or self-hosted | Self-hosted (open source) or Databricks | Cloud (default) or self-hosted |
| **Visualizations** | Rich: parallel coords, contour plots, media logging, system metrics | Basic: matplotlib integration, no native rich plots | Rich: many chart types, good media support |
| **Hyperparameter sweeps** | Native Bayesian/grid/random sweeps with agent | Tracking only; sweeps require custom code | Native sweeps |
| **Artifacts (model/dataset versioning)** | Full artifact system with lineage | Tracking server + optional model registry | Artifact storage with versioning |
| **LLM fine-tuning support** | Native HuggingFace, LangChain, Weights & Biases Ginza | Via MLflow's `mlflow.transformers` | Via integrations |
| **Team collaboration** | Excellent shared dashboards, reports, comments | Basic — shared experiments via tracking server | Good shared dashboards, team workspaces |
| **Free tier** | 100 GB artifacts, 100k runs/month, public projects | Unlimited (self-hosted) | 100k runs/month, 1 user |
| **Paid pricing** | From $50/user/month (Teams) | Open source free; Databricks MLflow is pay-per-DBU | From $49/month (Pro) |
| **Best for** | Deep learning teams needing rich visualizations and sweeps | Teams wanting full self-hosted control, or already on Databricks | Teams wanting a lightweight W&B alternative with strong UX |

**Key tradeoffs:**
- **W&B** has the most polished visualizations and the easiest sweeps, but is cloud-first and gets expensive for large teams.
- **MLflow** is fully open-source and self-hostable, making it the only choice when data cannot leave your infrastructure, but the UI is less polished and sweeps require custom implementation.
- **Neptune** is a strong middle ground — cleaner UX than MLflow, cheaper than W&B for small teams, but the ecosystem integrations are less battle-tested at massive scale.

---

## When to Use / When Not to Use

### When to use Weights & Biases

- **Training deep learning models** (PyTorch, TensorFlow, JAX, Hugging Face): W&B's integration is seamless and its visualizations are purpose-built for neural network training curves.
- **Running hyperparameter sweeps**: The Bayesian sweep agent alone justifies W&B for many teams — it handles parallel execution, early stopping, and result aggregation automatically.
- **Versioning models and datasets together**: W&B Artifacts provide a complete lineage trail from raw data → processed dataset → trained model → evaluation results.
- **Collaborating on experiments**: Shared dashboards, run comments, and reports make it easy to review a colleague's experiment without re-running code.
- **Logging media** (images, audio, video, bounding boxes): W&B's native media logging is far easier than rolling your own visualization code.
- **LLM fine-tuning projects**: Native HuggingFace Trainer integration means you can track a fine-tuning run with a single `report_to="wandb"` line.

### When NOT to use Weights & Biases

- **Strict data sovereignty requirements**: W&B's cloud requires internet connectivity and data upload. If your data cannot leave your network (e.g., healthcare HIPAA data, financial records), self-hosted MLflow is the safer choice even if the UX is less polished.
- **Very small teams with zero budget**: The free tier is generous for individuals, but Teams pricing ($50/user/month) adds up fast for a 10-person ML team. Self-hosted MLflow is free.
- **Training on edge/embedded devices with intermittent connectivity**: Each logging call can block if the network is down. W&B handles this gracefully with local caching, but the experience degrades for long-running remote training jobs.
- **Experiments that are already well-structured in a notebook**: If your entire ML workflow fits in a Jupyter notebook and you just need to track a few metrics, a two-line W&B integration is overkill. Use a simple `mlflow.log_param()` approach or even just timestamped CSV logs.
- **Non-ML experiments**: W&B is optimized for ML training loops. If you're tracking A/B test results, classical statistics, or non-deep-learning experiments, a lightweight analytics tool (Metabase, Mixpanel) or even a well-structured spreadsheet will be more appropriate.

W&B excels when your team trains deep learning models at scale and needs the full loop — from hyperparameter search to model artifact management to collaboration — without building custom infrastructure.
