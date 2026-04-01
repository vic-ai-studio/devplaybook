---
title: "LLM Observability 2026: LangSmith vs Helicone vs Arize Phoenix Compared"
description: "Complete guide to LLM observability platforms in 2026. Compare LangSmith, Helicone, and Arize Phoenix for tracing, evaluation, cost tracking, and debugging AI applications in production."
date: "2026-04-01"
tags: [ai, llm, observability, langsmith, helicone, arize, monitoring]
readingTime: "11 min read"
---

# LLM Observability 2026: LangSmith vs Helicone vs Arize Phoenix Compared

Shipping an LLM application is only half the battle. Once it's in production, you need answers to questions like: Why did this response hallucinate? Why is latency spiking on certain queries? Which prompt version performs better? How much did that batch job cost?

LLM observability platforms exist to answer these questions. In 2026, three platforms dominate the space: LangSmith, Helicone, and Arize Phoenix. Each takes a different philosophical approach — and choosing the wrong one will leave you blind when things go wrong.

This guide compares all three across the dimensions that matter for production AI systems.

## Why LLM Observability Is Different

Traditional APM tools (Datadog, New Relic, Grafana) are built for deterministic software. LLM applications are fundamentally different:

- **Non-deterministic outputs:** The same prompt can produce different results
- **Nested call chains:** A single user request may trigger dozens of LLM calls, tool uses, and retrieval steps
- **Quality is fuzzy:** You can't just measure "did it error?" — you need "was the response accurate?"
- **Cost visibility:** Token usage translates directly to dollars; you need fine-grained tracking

Standard observability tools handle latency and errors well but fail completely at prompt versioning, response quality evaluation, and LLM-specific cost attribution.

## The Contenders at a Glance

| Platform | Primary Focus | Open Source | Self-Host | Pricing |
|----------|--------------|-------------|-----------|---------|
| LangSmith | Tracing + Evaluation | No | Partial (Enterprise) | Free tier → $39/seat/mo |
| Helicone | Proxy-based logging | Yes (core) | Yes | Free tier → usage-based |
| Arize Phoenix | Evaluation + Analysis | Yes | Yes | Free (OSS) / Cloud pricing |

## LangSmith

LangSmith is LangChain's observability platform. It has the tightest integration with the LangChain ecosystem, but you don't need to use LangChain to benefit from it.

### Core Capabilities

**Tracing:** Every LLM call, tool invocation, and chain step is recorded as a run tree. You can drill down from a user session → chain → individual LLM call and see exact inputs, outputs, latency, and token usage at each step.

**Datasets and Evaluation:** LangSmith's strongest differentiator. Create curated datasets from production traces, annotate them with human feedback, and run automated evaluators (LLM-as-judge, exact match, regex, custom Python) to score your application.

**Prompt Hub:** Version and deploy prompts like code. A/B test prompt variants and compare evaluation scores before promoting to production.

**Playground:** Replay any production trace with modified prompts or models to debug issues or test improvements.

### Integration

```python
import os
from langsmith import Client
from langchain_openai import ChatOpenAI

os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-api-key"
os.environ["LANGCHAIN_PROJECT"] = "my-production-app"

# All LangChain operations are automatically traced
llm = ChatOpenAI(model="gpt-4o")
result = llm.invoke("Explain observability in 2 sentences")
```

For non-LangChain code, use the `@traceable` decorator:

```python
from langsmith import traceable

@traceable(name="my-rag-pipeline")
def answer_question(question: str, context: str) -> str:
    # Your LLM call here
    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"Context: {context}"},
            {"role": "user", "content": question}
        ]
    )
    return response.choices[0].message.content
```

### Pricing

| Plan | Price | Traces/Month |
|------|-------|-------------|
| Developer | Free | 5,000 |
| Plus | $39/seat/month | 50,000 |
| Enterprise | Custom | Unlimited |

**Best for:** Teams using LangChain or heavily focused on evaluation and dataset curation.

---

## Helicone

Helicone takes a radically different approach: it sits between your application and the LLM provider as an HTTP proxy. Zero code changes required for basic logging.

### Core Capabilities

**Proxy-based logging:** Route your OpenAI/Anthropic/Gemini calls through Helicone's proxy endpoint. Every request is automatically logged with full request/response data, latency, cost, and metadata.

**Zero-latency mode:** Helicone offers async logging that adds virtually no latency overhead — it queues log writes instead of blocking the request path.

**Cost tracking:** Built-in token cost calculation across all major providers. Dashboard shows spending by model, endpoint, user, and custom properties.

**Custom properties:** Tag any request with arbitrary metadata (user ID, session ID, feature flag, A/B test variant) and filter/aggregate by these properties in the dashboard.

**Caching:** Built-in semantic caching to reduce costs and latency for repeated similar queries.

### Integration

For OpenAI, change one line:

```python
from openai import OpenAI

# Before
client = OpenAI(api_key="sk-...")

# After — just change the base URL
client = OpenAI(
    api_key="sk-...",
    base_url="https://oai.helicone.ai/v1",
    default_headers={
        "Helicone-Auth": "Bearer your-helicone-api-key",
        "Helicone-Property-UserId": user_id,  # custom property
        "Helicone-Property-Feature": "search",
    }
)
```

For self-hosted deployments, Helicone's OSS core (Worker proxy) runs on Cloudflare Workers or can be deployed on your own infrastructure.

### Pricing

| Plan | Price | Logs/Month |
|------|-------|-----------|
| Free | $0 | 100,000 |
| Pro | $20/month | 2M |
| Enterprise | Custom | Unlimited |

**Best for:** Teams that want instant logging with zero integration effort, or teams that need cost tracking across multiple LLM providers.

---

## Arize Phoenix

Arize Phoenix is the open-source, evaluation-focused option. It's built on OpenTelemetry (OTEL) standards and positions itself as the "developer-first" observability tool.

### Core Capabilities

**OpenTelemetry-native:** Phoenix uses OTEL spans and traces, which means it integrates naturally with your existing observability stack. If you're already sending traces to Jaeger, Zipkin, or Tempo, Phoenix can sit alongside them.

**Evaluation-first:** Phoenix's standout feature is its evaluation library (`phoenix.evals`). It ships with battle-tested evaluators for hallucination detection, relevance scoring, toxicity, QA correctness, and summarization quality.

**Retrieval analysis:** Deep-dive analysis for RAG pipelines — query-document relevance, retrieval precision/recall, chunk quality scoring.

**Embeddings visualization:** UMAP and t-SNE projections of embeddings to identify clusters, outliers, and distribution drift over time.

### Integration

```python
import phoenix as px
from phoenix.otel import register
from opentelemetry.instrumentation.openai import OpenAIInstrumentor

# Start Phoenix locally
session = px.launch_app()

# Register OpenTelemetry tracer
tracer_provider = register(
    project_name="my-app",
    endpoint="http://localhost:4317"
)

# Auto-instrument OpenAI
OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)

# All OpenAI calls are now traced automatically
```

Running evaluations:

```python
from phoenix.evals import (
    HallucinationEvaluator,
    RelevanceEvaluator,
    OpenAIModel,
    run_evals
)

eval_model = OpenAIModel(model="gpt-4o")

hallucination_evaluator = HallucinationEvaluator(eval_model)
relevance_evaluator = RelevanceEvaluator(eval_model)

# Run evals on your trace dataset
results = run_evals(
    dataframe=traces_df,
    evaluators=[hallucination_evaluator, relevance_evaluator],
    provide_explanation=True
)
```

### Pricing

Phoenix OSS is completely free and self-hosted. Arize also offers a managed cloud version with additional features:

| Plan | Price | Features |
|------|-------|---------|
| Phoenix OSS | Free | Full evaluation library, local UI |
| Arize Cloud | $500+/month | Team collaboration, data retention, SSO |

**Best for:** Teams that want full control over their data, need deep evaluation capabilities, or are already invested in OpenTelemetry.

---

## Head-to-Head Comparison

### Tracing Quality

**LangSmith** wins for LangChain users — the trace visualization is purpose-built for chain execution trees and is extremely intuitive.

**Helicone** provides clean request/response logging but lacks the hierarchical trace visualization for complex multi-step chains.

**Phoenix** has the most flexible tracing (OTEL-based) and works with any framework, but requires more configuration to get optimal results.

### Evaluation Capabilities

**Phoenix** wins clearly. Its evaluation library is the most comprehensive, with pre-built evaluators for almost every dimension of LLM quality. LangSmith is a close second with its dataset + evaluator workflow. Helicone lacks native evaluation — it's not what it's built for.

### Ease of Setup

**Helicone** wins. Proxy-based setup means you can have logging running in 2 minutes with one line changed. LangSmith is close behind for LangChain users. Phoenix requires the most setup but gives the most control.

### Cost Tracking

**Helicone** wins by a mile. Cost tracking is core to its identity — you get per-request cost, daily cost trends, cost by user/feature/model, and budget alerts out of the box.

### Self-Hosting

**Phoenix** wins — it's fully open source and designed to run locally or on your infrastructure. Helicone's core worker is open source but the full dashboard requires their cloud. LangSmith enterprise allows self-hosting but it's complex and expensive.

### Ecosystem Integration

**LangSmith** wins for the LangChain ecosystem. **Phoenix** wins for OpenTelemetry ecosystems. **Helicone** works with any provider via the proxy pattern.

---

## Decision Framework

**Choose LangSmith if:**
- You're building with LangChain/LangGraph
- Dataset curation and systematic evaluation are priorities
- You want a polished end-to-end platform for LLM development lifecycle

**Choose Helicone if:**
- You need zero-friction logging without code changes
- Multi-provider cost tracking is critical
- You want semantic caching and rate limiting out of the box
- Team size is small and you want quick time-to-value

**Choose Arize Phoenix if:**
- Data privacy/compliance requires self-hosting
- You're already using OpenTelemetry
- Evaluation is your primary concern (especially RAG quality)
- You want OSS with no vendor lock-in

---

## Combining Platforms

Many production teams use multiple tools:

- **Helicone** for cost tracking and basic logging (zero overhead)
- **Phoenix** for offline evaluation and dataset analysis
- **LangSmith** for prompt versioning and A/B testing

This is overkill for most teams but makes sense at scale where different stakeholders need different views of the same system.

---

## Quick Setup Checklist

Before choosing a platform, answer these questions:

- [ ] Do I use LangChain/LangGraph? → Consider LangSmith
- [ ] Is cost tracking mission-critical? → Consider Helicone
- [ ] Do I need data to stay on-prem? → Consider Phoenix OSS
- [ ] Will I run systematic evaluations? → Phoenix or LangSmith
- [ ] Do I have < 30 minutes to set up logging? → Helicone proxy

---

LLM observability is no longer optional. Production AI applications are too complex and too expensive to run blind. Whether you start with Helicone's five-minute proxy setup or invest in Phoenix's full evaluation pipeline depends on where you are in the maturity curve — but the important thing is to start now, before your first production incident.
