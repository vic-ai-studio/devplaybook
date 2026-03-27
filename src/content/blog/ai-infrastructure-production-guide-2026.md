---
title: "AI Infrastructure for Production 2026: GPU Clusters, Model Serving, and Cost Optimization"
description: "Complete guide to AI infrastructure in 2026. Learn GPU cluster management, model serving with vLLM/TGI/Triton, vector database scaling, LLM caching strategies, and cost optimization for production AI workloads."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["ai", "llm", "infrastructure", "gpu", "vllm", "vector-database", "mlops", "production", "cost-optimization"]
readingTime: "13 min read"
---

Running AI in a demo is straightforward. Running AI in production — reliably, at scale, without burning your compute budget — is a genuinely hard engineering problem.

The gap between "I got this working with a few API calls" and "this serves 10,000 users per day with 99.9% uptime and reasonable cost" is where most AI projects stall. This guide covers the infrastructure layer: GPU management, model serving, vector database scaling, caching, and the cost optimization strategies that separate sustainable AI products from expensive experiments.

---

## The AI Infrastructure Stack

Production AI infrastructure has distinct layers that each require different expertise:

```
┌─────────────────────────────────────┐
│         Application Layer           │  (Your product, API gateway)
├─────────────────────────────────────┤
│         Model Serving Layer         │  (vLLM, TGI, Triton, Ollama)
├─────────────────────────────────────┤
│         Vector & Storage Layer      │  (Pinecone, Weaviate, pgvector)
├─────────────────────────────────────┤
│         Compute Layer               │  (GPU clusters, pods, scheduling)
├─────────────────────────────────────┤
│         Infrastructure Layer        │  (Kubernetes, cloud providers)
└─────────────────────────────────────┘
```

Each layer has specialized tooling in 2026, and each has its own scaling challenges.

---

## GPU Clusters: The Foundation

### Choosing GPU Hardware

GPU selection is one of the highest-leverage decisions in AI infrastructure. The wrong choice leads to either overspending or underperforming.

**NVIDIA A100 (80GB SXM)**
The workhorse for large model inference and training. The 80GB variant allows serving 70B+ parameter models on a single GPU (with quantization) or across 2-4 GPUs (full precision).

- Best for: Production inference of 13B-70B models, fine-tuning
- Rough cost: ~$3/hour on-demand, ~$1.50/hour reserved

**NVIDIA H100 (80GB)**
The current generation datacenter GPU. ~2x performance vs A100 for transformer inference due to FP8 support and higher memory bandwidth (3.35 TB/s vs 2 TB/s on A100).

- Best for: High-throughput inference, training large models
- Rough cost: ~$4-6/hour depending on provider

**NVIDIA L40S / L4**
Mid-tier options for smaller models (7B-13B). The L4 is particularly cost-effective for batched inference of smaller models.

- Best for: 7B-13B model serving, embedding generation
- Rough cost: L4 ~$0.80/hour, L40S ~$2/hour

**AMD MI300X**
AMD's competitive offering in 2026. 192GB HBM3 memory allows fitting large models without sharding. ROCM ecosystem has matured significantly.

- Best for: Teams comfortable with AMD tooling, large model serving
- Rough cost: ~$3-4/hour

**Practical guidance**: For most production deployments serving 7B-34B models, L40S or A100 instances provide the best price/performance. Reserve H100s for the highest-traffic workloads or training runs.

### Kubernetes for GPU Workloads

Kubernetes with NVIDIA's GPU operator is the standard for managing GPU workloads at scale.

**Installing the GPU operator:**

```bash
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia
helm repo update

helm install --wait --generate-name \
  -n gpu-operator --create-namespace \
  nvidia/gpu-operator \
  --set driver.enabled=true \
  --set toolkit.enabled=true
```

**GPU resource requests in pods:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: llm-inference-pod
spec:
  containers:
  - name: inference-server
    image: vllm/vllm-openai:latest
    resources:
      limits:
        nvidia.com/gpu: 2  # Request 2 GPUs
      requests:
        nvidia.com/gpu: 2
    env:
    - name: MODEL_NAME
      value: "meta-llama/Llama-3-70b-instruct"
    - name: TENSOR_PARALLEL_SIZE
      value: "2"
```

**Multi-instance GPU (MIG) partitioning:**

For smaller models, you can partition a single A100 or H100 into multiple instances. An A100 80GB can be split into 7 × 10GB or 3 × 20GB instances, each serving a separate model.

```bash
# Enable MIG mode
nvidia-smi -i 0 -mig 1

# Create 7 instances of 1g.10gb profile
nvidia-smi mig -cgi 1g.10gb,1g.10gb,1g.10gb,1g.10gb,1g.10gb,1g.10gb,1g.10gb -C
```

This is extremely cost-effective for serving multiple small models — seven 7B models on a single A100 instead of seven separate GPU instances.

---

## Model Serving: vLLM, TGI, and Triton

### vLLM

vLLM is the dominant open-source LLM serving framework in 2026. Its key innovation is PagedAttention — a memory management technique borrowed from OS virtual memory that dramatically improves GPU utilization.

**Why vLLM is fast:**
- **Continuous batching**: Rather than waiting for a fixed batch size, vLLM continuously adds new requests to ongoing inference batches. This alone provides 2-3x throughput improvement over naive serving.
- **PagedAttention**: Eliminates KV cache memory fragmentation. Pre-vLLM, LLM serving wasted 60-80% of GPU memory on fragmentation.
- **Tensor parallelism**: Distributes a single model across multiple GPUs efficiently.

**Running vLLM:**

```bash
# Install
pip install vllm

# Start server (OpenAI-compatible API)
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8b-instruct \
  --tensor-parallel-size 1 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --port 8000
```

**vLLM Docker for production (use the [Dockerfile Generator](/tools/dockerfile-generator) to scaffold production-ready Dockerfiles):**

```Dockerfile
FROM vllm/vllm-openai:latest

ENV MODEL_NAME="meta-llama/Llama-3-8b-instruct"
ENV TENSOR_PARALLEL_SIZE="1"
ENV MAX_MODEL_LEN="8192"
ENV GPU_MEMORY_UTILIZATION="0.90"

ENTRYPOINT python -m vllm.entrypoints.openai.api_server \
  --model $MODEL_NAME \
  --tensor-parallel-size $TENSOR_PARALLEL_SIZE \
  --max-model-len $MAX_MODEL_LEN \
  --gpu-memory-utilization $GPU_MEMORY_UTILIZATION
```

**vLLM key configs for production:**

```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Llama-3-8b-instruct",
    tensor_parallel_size=1,
    gpu_memory_utilization=0.90,
    max_model_len=8192,
    # Enable prefix caching for shared system prompts
    enable_prefix_caching=True,
    # Quantization for memory efficiency
    quantization="fp8",  # Requires H100 or Ada Lovelace
    # AWQ quantization for older GPUs
    # quantization="awq",
)
```

### Text Generation Inference (TGI)

Hugging Face's TGI is a strong alternative to vLLM, particularly for:
- Deep HuggingFace ecosystem integration
- Support for GPTQ and AWQ quantization
- Flash Attention 2 integration
- Medusa speculative decoding

```bash
# Run TGI with Docker
docker run --gpus all --shm-size 1g -p 8080:80 \
  -v $HOME/models:/data \
  ghcr.io/huggingface/text-generation-inference:2.4 \
  --model-id meta-llama/Llama-3-8b-instruct \
  --quantize bitsandbytes-nf4 \
  --max-input-length 4096 \
  --max-total-tokens 8192 \
  --max-batch-prefill-tokens 4096
```

**vLLM vs TGI in 2026:**
- vLLM generally wins on throughput for large batch sizes
- TGI has better first-token latency for single requests
- Both support OpenAI-compatible APIs
- Choose based on your workload: high throughput (vLLM) vs low latency (TGI)

### NVIDIA Triton Inference Server

Triton is NVIDIA's production inference server, designed for enterprise deployments with strict reliability requirements. It supports TensorRT-LLM backends, which can provide 2-4x throughput improvements over vLLM for NVIDIA GPUs.

```bash
# Pull Triton with TensorRT-LLM backend
docker pull nvcr.io/nvidia/tritonserver:24.01-trtllm-python-py3

# Run with multiple model backends
docker run --gpus all -p 8000:8000 -p 8001:8001 -p 8002:8002 \
  -v /models:/models \
  nvcr.io/nvidia/tritonserver:24.01-trtllm-python-py3 \
  tritonserver --model-repository=/models
```

Triton is overkill for most teams but essential if you need:
- Ensemble models (preprocessing → LLM → postprocessing as a single request)
- Dynamic batching with SLA constraints
- Multiple model formats (PyTorch, TensorFlow, ONNX, TensorRT) in one server
- NVIDIA's A/B testing and canary deployment features

---

## Vector Database Scaling

Vector databases store embeddings and enable semantic search — a core component of RAG (Retrieval-Augmented Generation) architectures. At scale, vector DB performance becomes a critical bottleneck.

### pgvector at Scale

For many teams, PostgreSQL with pgvector is the right answer. It's simpler to operate, integrates with existing tooling, and handles hundreds of millions of vectors with proper configuration.

```sql
-- Create table with embedding column
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT,
  metadata JSONB,
  embedding vector(1536)  -- OpenAI ada-002 dimensions
);

-- Create HNSW index (faster than IVFFlat for most workloads)
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Similarity search
SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
FROM documents
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

**pgvector performance tips:**
- Use HNSW index over IVFFlat for most query patterns
- Set `hnsw.ef_search` based on recall requirements (64-256 is typical)
- Increase `maintenance_work_mem` before building indexes (4GB+ recommended)
- Partition large tables by a high-cardinality column (user_id, date) to limit scan scope

### Pinecone

Pinecone is the managed vector database for teams that want to scale without operating infrastructure. In 2026, Pinecone's serverless tier changed the economics significantly:

- **Serverless**: Pay per vector stored and per query — no idle costs. Works for unpredictable or low-average workloads.
- **Pods**: Dedicated compute — better for predictable high-throughput workloads.

```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="your-api-key")

# Create serverless index
pc.create_index(
    name="documents",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1")
)

index = pc.Index("documents")

# Upsert vectors with metadata
index.upsert(vectors=[
    {
        "id": "doc-001",
        "values": embedding,
        "metadata": {"source": "user-manual", "page": 42}
    }
])

# Query with metadata filtering
results = index.query(
    vector=query_embedding,
    top_k=10,
    filter={"source": {"$eq": "user-manual"}}
)
```

### Weaviate

Weaviate is the vector database of choice for teams building multi-modal RAG (text + images + structured data). It supports:

- Multi-tenancy (separate namespaces per customer — critical for SaaS)
- Hybrid search (BM25 + vector in a single query)
- Modules for automatic embedding generation (text2vec-openai, etc.)

```python
import weaviate

client = weaviate.connect_to_wcs(
    cluster_url="https://your-cluster.weaviate.network",
    auth_credentials=weaviate.auth.AuthApiKey("your-api-key")
)

# Multi-tenant collection
collection = client.collections.get("Document")

# Query with hybrid search (BM25 + vector)
results = collection.query.hybrid(
    query="deployment strategies for microservices",
    alpha=0.75,  # 0=pure BM25, 1=pure vector
    limit=10,
    tenant="customer-123"
)
```

---

## LLM Caching Strategies

LLM inference is expensive. Caching is the most impactful cost reduction technique.

### Semantic Caching

Traditional caching matches exact strings. Semantic caching matches *similar* queries — if you've answered "how do I deploy to Kubernetes?" you can return the same (or similar) answer for "what's the Kubernetes deployment process?"

```python
from langchain.cache import GPTCache
from gptcache import Cache
from gptcache.processor.pre import get_prompt
from gptcache.similarity_evaluation.distance import SearchDistanceEvaluation

cache = Cache()
cache.init(
    pre_embedding_func=get_prompt,
    similarity_evaluation=SearchDistanceEvaluation(max_distance=0.3)
)

# Install as LangChain cache
import langchain
langchain.llm_cache = GPTCache(init_func=lambda cache_obj: cache)
```

**GPTCache** is the leading open-source semantic caching library. It integrates with LangChain, LlamaIndex, and custom OpenAI clients.

**Redis for exact-match caching:**

For queries with predictable, repeated inputs (dashboards, reports, admin panels), exact-match caching with Redis is more appropriate:

```python
import redis
import hashlib
import json

redis_client = redis.Redis(host="localhost", port=6379)

def cached_completion(prompt: str, ttl: int = 3600) -> str:
    cache_key = f"llm:{hashlib.sha256(prompt.encode()).hexdigest()}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    result = response.choices[0].message.content

    redis_client.setex(cache_key, ttl, json.dumps(result))
    return result
```

### Prefix Caching (vLLM)

For applications with long system prompts (RAG context, agent instructions), prefix caching stores the KV cache for the system prompt and reuses it across requests. This is hugely effective because:

- System prompts are often 500-2000 tokens
- At 1000+ tokens, the time-to-first-token can be 50-200ms
- With prefix caching, subsequent requests skip that computation entirely

Enable in vLLM:
```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3-8b-instruct \
  --enable-prefix-caching
```

### Speculative Decoding

Speculative decoding uses a small "draft" model to propose multiple tokens, then verifies them with the large model in parallel. For greedy decoding and low-temperature sampling, this provides 2-3x speedup.

```python
# vLLM speculative decoding config
llm = LLM(
    model="meta-llama/Llama-3-70b-instruct",
    speculative_model="meta-llama/Llama-3-8b-instruct",  # Draft model
    num_speculative_tokens=5,
    tensor_parallel_size=4
)
```

---

## Cost Optimization Framework

### The GPU Cost Stack

Understanding where money goes is the first step to optimizing it:

| Component | Typical % of AI Infra Cost |
|-----------|---------------------------|
| GPU compute (inference) | 50-65% |
| GPU compute (training/fine-tuning) | 15-20% |
| Storage (models, vectors) | 10-15% |
| Network transfer | 5-10% |
| Other (CPUs, memory, monitoring) | 5-10% |

Inference compute is the big lever. Optimize there first.

### Quantization

Quantization reduces model precision from FP16/BF16 to INT8/INT4/FP8, dramatically reducing memory and compute requirements.

**Memory requirements for Llama 3 70B:**

| Precision | VRAM Required | Quality Impact |
|-----------|---------------|----------------|
| BF16 | ~140 GB | Baseline |
| AWQ INT4 | ~40 GB | <1% degradation |
| GPTQ INT4 | ~38 GB | <2% degradation |
| FP8 (H100) | ~70 GB | <0.5% degradation |

AWQ (Activation-aware Weight Quantization) is the recommended approach for most teams:

```bash
# Install AutoAWQ
pip install autoawq

# Quantize a model
python -c "
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer

model_path = 'meta-llama/Llama-3-70b-instruct'
quant_path = 'Llama-3-70b-AWQ'

quant_config = {
    'zero_point': True,
    'q_group_size': 128,
    'w_bit': 4,
    'version': 'GEMM'
}

model = AutoAWQForCausalLM.from_pretrained(model_path, safetensors=True)
tokenizer = AutoTokenizer.from_pretrained(model_path)
model.quantize(tokenizer, quant_config=quant_config)
model.save_quantized(quant_path)
"
```

### Spot Instances for Training

Training runs are interruptible — you checkpoint frequently anyway. Using spot/preemptible instances for training reduces cost by 60-80%.

```yaml
# Kubernetes spot instance node pool
apiVersion: v1
kind: Pod
spec:
  nodeSelector:
    cloud.google.com/gke-spot: "true"
  tolerations:
  - key: cloud.google.com/gke-spot
    operator: Equal
    value: "true"
    effect: NoSchedule
  containers:
  - name: training-job
    image: pytorch/pytorch:2.2-cuda12.1
    resources:
      limits:
        nvidia.com/gpu: 8
```

**Checkpointing for spot recovery:**

```python
from torch.distributed.checkpoint.state_dict import (
    get_state_dict, set_state_dict
)

# Save checkpoint every N steps
if step % checkpoint_interval == 0:
    state_dict = get_state_dict(model, optimizer)
    torch.distributed.checkpoint.save(
        state_dict=state_dict,
        storage_writer=torch.distributed.checkpoint.FileSystemWriter(checkpoint_path),
    )

# On resume, load last checkpoint
if checkpoint_path.exists():
    state_dict = torch.distributed.checkpoint.load(
        storage_reader=torch.distributed.checkpoint.FileSystemReader(checkpoint_path)
    )
    set_state_dict(model, optimizer, model_state_dict=state_dict["model"])
```

### Request Routing and Model Tiering

Not all requests need your most capable (expensive) model. A tiered routing strategy can cut costs by 40-60%:

```python
from anthropic import Anthropic

client = Anthropic()

def route_request(prompt: str, context_length: int) -> str:
    # Simple classification heuristic — in practice, use a fast classifier
    complexity_indicators = [
        "analyze", "compare", "synthesize", "explain in detail",
        "write a comprehensive", "create a detailed plan"
    ]
    is_complex = any(indicator in prompt.lower()
                     for indicator in complexity_indicators)
    is_long_context = context_length > 8000

    if is_complex or is_long_context:
        # Use Claude Opus 4.6 for complex tasks
        model = "claude-opus-4-6"
    elif context_length > 2000:
        # Use Sonnet for medium tasks
        model = "claude-sonnet-4-6"
    else:
        # Use Haiku for simple tasks
        model = "claude-haiku-4-5-20251001"

    response = client.messages.create(
        model=model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text
```

### Autoscaling GPU Workloads

KEDA (Kubernetes Event-Driven Autoscaling) enables scaling GPU pods based on queue depth, which is more appropriate for LLM serving than CPU-based HPA:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: vllm-scaler
spec:
  scaleTargetRef:
    name: vllm-deployment
  minReplicaCount: 1
  maxReplicaCount: 10
  pollingInterval: 15
  cooldownPeriod: 300
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: vllm_request_queue_depth
      threshold: "10"
      query: avg(vllm_num_requests_waiting)
```

Scale down to 1 replica during off-hours; scale up when the request queue grows. For a typical product with predictable traffic patterns, this alone can cut compute costs by 40-60%.

---

## Observability for AI Infrastructure

AI workloads have unique observability requirements beyond traditional APM.

**Key metrics to track:**

```python
# Custom Prometheus metrics for LLM serving
from prometheus_client import Counter, Histogram, Gauge

llm_requests_total = Counter(
    "llm_requests_total",
    "Total LLM requests",
    ["model", "status"]
)

llm_tokens_total = Counter(
    "llm_tokens_total",
    "Total tokens processed",
    ["model", "type"]  # type: prompt or completion
)

llm_request_duration = Histogram(
    "llm_request_duration_seconds",
    "LLM request duration",
    ["model"],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30]
)

llm_time_to_first_token = Histogram(
    "llm_ttft_seconds",
    "Time to first token",
    ["model"],
    buckets=[0.05, 0.1, 0.2, 0.5, 1, 2]
)

gpu_memory_utilization = Gauge(
    "gpu_memory_utilization_bytes",
    "GPU memory utilization",
    ["gpu_id", "pod"]
)
```

**LLM-specific alerts:**

- TTFT > 2s for P95 (inference latency degradation)
- Request queue depth > 50 (need to scale)
- GPU memory > 95% (risk of OOM)
- Token generation rate dropped > 20% (possible GPU thermal throttling)

---

## Summary

Building production AI infrastructure in 2026 means making opinionated choices at every layer: which GPU tier makes sense for your model size and traffic, which serving framework balances throughput and latency for your workload, how aggressively to quantize without impacting quality, and where caching can eliminate expensive redundant inference.

The teams that get this right achieve 5-10x better cost efficiency than teams that treat AI infrastructure as an afterthought. The techniques here — continuous batching, prefix caching, quantization, spot instances for training, KEDA autoscaling — are not exotic optimizations. They're the table stakes for running AI in production sustainably.

**Key takeaways:**
- vLLM with continuous batching is the baseline for LLM serving; evaluate TGI and TensorRT-LLM for specific requirements
- AWQ INT4 quantization cuts 70B model memory from 140GB to 40GB with <2% quality loss
- Prefix caching is a free throughput improvement for any app with long system prompts
- Semantic caching with GPTCache can eliminate 30-50% of redundant LLM calls
- KEDA autoscaling on queue depth is more appropriate than CPU/memory HPA for GPU workloads
- Tiered model routing (Haiku/Sonnet/Opus or equivalent) can cut LLM API costs by 40-60%
