---
title: "Cloudflare AI and Workers AI Complete Guide 2026: Models, Edge Inference & Pricing"
description: "Complete Cloudflare AI and Workers AI guide for 2026: available models (LLaMA, Whisper, SDXL), edge inference setup, pricing breakdown, REST API vs binding usage, and real-world use cases."
date: "2026-04-01"
tags: [cloudflare, workers-ai, edge-ai, ai-inference, cloudflare-workers, llm]
readingTime: "10 min read"
---

# Cloudflare AI and Workers AI Complete Guide 2026

Cloudflare Workers AI brings AI inference to the edge — running model inference in Cloudflare's network of 300+ data centers globally, within milliseconds of your users, without managing GPU infrastructure. In 2026, the model catalog has grown substantially and the pricing model is mature enough to reason about at scale.

This guide covers what Workers AI actually offers, how to use it, where it fits versus hosted APIs like OpenAI, and the honest limitations.

## What Workers AI Is (and Isn't)

Workers AI runs inference for curated open-source models on Cloudflare's infrastructure. You call it from a Cloudflare Worker (or from anywhere via the REST API) and get inference results back without managing a GPU server.

It is **not** a training platform. You can't fine-tune models or upload custom weights. Workers AI gives you inference-only access to a catalog of hosted models.

The key distinction from OpenAI/Anthropic: Workers AI runs open-weight models (LLaMA, Mistral, Whisper, SDXL) that you can also run locally. Cloudflare manages the infrastructure. You pay per neuron-seconds, not per token.

## The Model Catalog

As of 2026, Workers AI includes:

**Text generation:**
- `@cf/meta/llama-3.1-8b-instruct` — Fast, capable instruction-following model
- `@cf/meta/llama-3.1-70b-instruct` — Higher quality, slower
- `@cf/mistral/mistral-7b-instruct-v0.1` — Efficient European alternative
- `@cf/google/gemma-7b-it` — Google's instruction-tuned model

**Text embeddings:**
- `@cf/baai/bge-base-en-v1.5` — 768-dim embeddings for semantic search
- `@cf/baai/bge-large-en-v1.5` — 1024-dim, higher accuracy

**Image generation:**
- `@cf/stabilityai/stable-diffusion-xl-base-1.0` — SDXL for image generation
- `@cf/bytedance/stable-diffusion-xl-lightning` — SDXL Lightning, 4-step fast generation

**Speech-to-text:**
- `@cf/openai/whisper` — Whisper base/small for transcription

**Translation:**
- `@cf/meta/m2m100-1.2b` — 200-language translation

**Code:**
- `@cf/defog/sqlcoder-7b-2` — SQL query generation from natural language

## Basic Setup: Worker Binding

In a Cloudflare Worker, AI is available as a first-class binding:

```toml
# wrangler.toml
name = "my-ai-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"
```

```ts
// src/index.ts
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { prompt } = await request.json<{ prompt: string }>();

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt },
      ],
    });

    return Response.json(response);
  },
};
```

Deploy with `wrangler deploy`. That's the complete setup — no API key management, no GPU provisioning.

## REST API: Use from Anywhere

Workers AI also exposes a REST API you can call from any environment:

```bash
curl https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -d '{
    "messages": [
      {"role": "system", "content": "Summarize the following text."},
      {"role": "user", "content": "Rust is a systems programming language..."}
    ]
  }'
```

The REST API makes Workers AI usable from Python, Node.js, or any HTTP client — not just Cloudflare Workers. This is useful for batch processing jobs or backend services that aren't on Cloudflare's edge network.

## Streaming Responses

For chat interfaces, streaming matters for perceived latency. Workers AI supports SSE streaming:

```ts
const stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [{ role: 'user', content: prompt }],
  stream: true,
});

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' },
});
```

The `stream: true` option returns a `ReadableStream` of SSE events. First token latency is typically under 500ms from edge nodes close to the user.

## Embeddings: Semantic Search at the Edge

Combining Workers AI embeddings with Vectorize (Cloudflare's vector DB) enables semantic search without an external vector database:

```ts
// index document
const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: documentContent,
});
await env.VECTORIZE.insert([{ id: docId, values: embedding.data[0] }]);

// search
const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: searchQuery,
});
const results = await env.VECTORIZE.query(queryEmbedding.data[0], { topK: 10 });
```

This pattern — embed on write, query on search — is the foundation of RAG (retrieval-augmented generation) applications. With Workers AI + Vectorize, the entire pipeline runs on Cloudflare's infrastructure.

## Pricing: Neurons Explained

Cloudflare charges for Workers AI in "neuron-seconds" — a compute unit that correlates with model size and inference time rather than token count. This makes costs harder to predict than OpenAI's per-token pricing, but Cloudflare publishes neuron costs per model.

Rough 2026 cost comparisons for 1 million text completions (short prompts, ~200 token output):

| Service | ~Cost |
|---------|-------|
| OpenAI GPT-4o | $15-30 |
| Anthropic Claude Haiku | $3-5 |
| Workers AI LLaMA 3.1 8B | $1-3 |
| Workers AI LLaMA 3.1 70B | $8-15 |

Workers AI's cost advantage is real for high-volume, quality-tolerant workloads. For tasks where LLaMA 3.1 8B quality is sufficient — classification, extraction, summarization of structured content — the economics are compelling.

The free tier allows 10,000 neurons per day, sufficient for development and low-volume applications.

## Limitations and When to Use a Hosted API

**Model selection is limited.** Workers AI has ~20-30 models. OpenAI, Anthropic, and Google each offer dozens, including proprietary models that outperform open-weight alternatives on complex reasoning tasks.

**No fine-tuning.** If your use case requires a model adapted to specific data or style, Workers AI isn't the right choice. You'd need to self-host or use a provider that supports fine-tuning.

**Context window constraints.** LLaMA 3.1 8B supports 128K context, but long-context inference is slower and costs more. For document-length inputs, verify your latency requirements.

**Output quality.** For general instruction following and summarization, LLaMA 3.1 and Mistral are competitive with GPT-3.5. For complex reasoning, code generation, or creative tasks, GPT-4o and Claude Sonnet outperform current Workers AI models.

Workers AI is the right choice when: you want to avoid data leaving your infrastructure (Cloudflare's edge), you have high inference volume that makes per-token pricing expensive, or you're already using Cloudflare Workers and want to avoid additional vendor dependencies.

---

Building AI-powered developer tools? Check out the [OpenTelemetry Trace Builder](/tools/opentelemetry-trace-builder) for adding observability to your AI inference pipeline, or the [k6 Script Generator](/tools/k6-script-generator) for load testing your AI endpoints before production.
