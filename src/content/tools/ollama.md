---
title: "Ollama"
description: "Run large language models locally on your machine — one-command setup for Llama, Mistral, Gemma, Qwen, and 100+ other open models."
category: "AI/ML Dev Tools"
pricing: "Free"
pricingDetail: "Fully free and open source"
website: "https://ollama.com"
github: "https://github.com/ollama/ollama"
tags: [llm, local-ai, ai, privacy, macos, linux, windows, inference]
pros:
  - "Trivial setup: `ollama run llama3.2` downloads and runs in seconds"
  - "OpenAI-compatible API — drop-in replacement for dev/testing"
  - "Automatic GPU acceleration (Apple Silicon, NVIDIA, AMD)"
  - "Model library: Llama 3, Mistral, Gemma, Qwen, Phi, CodeLlama, and 100+"
  - "No internet connection after initial download — fully offline"
cons:
  - "Limited by local hardware — large models (70B+) need high-end GPUs"
  - "No multi-user auth or access control (single-user local tool)"
  - "Model quality below frontier models (GPT-4o, Claude) for complex tasks"
  - "Windows support is newer and slightly less stable than macOS/Linux"
date: "2026-04-02"
---

## Overview

Ollama makes running open-source LLMs locally as easy as running a Docker container. It handles model downloads, GPU configuration, and serving an OpenAI-compatible REST API. Ideal for privacy-sensitive projects, offline development, and cost-free local inference.

## Getting Started

```bash
# Install (macOS)
brew install ollama

# Install (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Run a model (downloads automatically on first run)
ollama run llama3.2

# Run in the background as a service
ollama serve
```

## REST API

Ollama serves an OpenAI-compatible API at `http://localhost:11434`:

```python
# Using the OpenAI client (compatible)
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # not checked
)

response = client.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "Explain vector databases."}]
)

# Or use the native Ollama client
import ollama

response = ollama.chat(
    model="llama3.2",
    messages=[{"role": "user", "content": "Write a Python quicksort."}]
)
print(response["message"]["content"])
```

## Streaming

```python
import ollama

for chunk in ollama.chat(
    model="codellama:13b",
    messages=[{"role": "user", "content": "Review this code: ..."}],
    stream=True,
):
    print(chunk["message"]["content"], end="", flush=True)
```

## Embeddings

```python
response = ollama.embeddings(
    model="nomic-embed-text",
    prompt="The quick brown fox jumps over the lazy dog"
)
embedding = response["embedding"]  # List of floats
```

## Useful Commands

```bash
# List installed models
ollama list

# Pull a specific model version
ollama pull mistral:7b-instruct-q4_K_M

# Remove a model
ollama rm mistral

# See running models
ollama ps

# Model info
ollama show llama3.2
```

## Model Selection Guide

| Use Case | Recommended Model |
|----------|-------------------|
| General chat | `llama3.2:3b` (fast) or `llama3.1:8b` (better) |
| Code generation | `codellama:13b` or `qwen2.5-coder:7b` |
| Embeddings | `nomic-embed-text` |
| Low memory (4GB RAM) | `phi3:mini` or `gemma2:2b` |
| High quality (16GB+ VRAM) | `llama3.1:70b` or `qwen2.5:72b` |

## Use Cases

**Local development with zero API costs**: Run Ollama as a drop-in OpenAI replacement during development. Point your app's `OPENAI_BASE_URL` to `http://localhost:11434/v1` and `OPENAI_API_KEY` to `"ollama"` — all API calls go to your local model with no charges, no rate limits, and no internet required. Switch back to the real OpenAI API for production by changing one env variable.

**Private document processing**: For applications that process sensitive documents (legal contracts, medical records, internal reports), Ollama keeps all inference local — no data ever leaves the machine. Pair with LlamaIndex or LangChain to build a private RAG pipeline where embeddings and LLM calls both run locally.

**Powering local AI coding assistants**: Ollama is the backend for Continue.dev and similar tools when configured with local models. A `qwen2.5-coder:7b` model running on a Mac with Apple Silicon delivers fast tab autocomplete at zero cost — a practical alternative to paying for Copilot for offline or privacy-sensitive development.

**Rapid model evaluation and comparison**: Before choosing which open-source model to deploy in production, pull several candidates with `ollama pull` and run the same benchmark prompts against each. No cloud accounts, no billing, no waiting for API access — just `ollama run model-name` and you're evaluating in seconds.
