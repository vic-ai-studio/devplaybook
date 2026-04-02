---
title: "Hugging Face"
description: "The AI community platform and open-source library hub — hosts 500K+ models, datasets, and Spaces demos. Transformers library enables local model inference."
category: "AI/ML Dev Tools"
pricing: "Free"
pricingDetail: "Free for public repos; Hub Pro $9/mo; Inference API and dedicated endpoints priced by usage"
website: "https://huggingface.co"
github: "https://github.com/huggingface/transformers"
tags: [ai, ml, models, transformers, nlp, computer-vision, huggingface]
pros:
  - "Largest public model and dataset repository — 500K+ models"
  - "Transformers library unifies model loading across PyTorch, TensorFlow, JAX"
  - "Model Hub with one-line download: `from_pretrained('model-name')`"
  - "Inference API for serverless model hosting without infrastructure"
  - "Spaces for deploying Gradio/Streamlit demos"
cons:
  - "Large models require significant VRAM (70B models need multiple A100s)"
  - "Model quality varies widely — curated lists help but vetting is needed"
  - "Inference API rate limits on free tier are restrictive for production"
  - "Transformers library is large; import times are slow"
date: "2026-04-02"
---

## Overview

Hugging Face is the GitHub of AI — a platform where the ML community shares models, datasets, and demos. The `transformers` library provides a unified API for loading and running thousands of open-source models locally.

## Using Models Locally

```python
from transformers import pipeline

# Text generation
generator = pipeline("text-generation", model="meta-llama/Llama-3.1-8B-Instruct")
result = generator("Explain transformers in simple terms:", max_new_tokens=200)

# Embeddings
from transformers import AutoTokenizer, AutoModel
import torch

tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")
model = AutoModel.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

inputs = tokenizer(["Hello world", "Hi there"], return_tensors="pt", padding=True)
with torch.no_grad():
    outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1)
```

## Inference API (Serverless)

```python
import requests

API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3"
headers = {"Authorization": "Bearer hf_..."}

response = requests.post(API_URL, headers=headers, json={
    "inputs": "What is retrieval augmented generation?",
    "parameters": {"max_new_tokens": 200}
})
```

## Model Card Best Practices

When using models from the Hub:
1. Check the model card for intended use and limitations
2. Verify the license (MIT, Apache 2.0 vs commercial restrictions)
3. Look at the community tab for known issues
4. Check the model size vs available VRAM

## Key Libraries

- **`transformers`**: Load and run models
- **`datasets`**: Load and process datasets
- **`accelerate`**: Multi-GPU and mixed-precision training
- **`peft`**: Parameter-efficient fine-tuning (LoRA, QLoRA)
- **`trl`**: Reinforcement learning from human feedback (RLHF)
