---
title: "Cloudflare Workers AI Guide 2026: Edge Inference, Models & Bindings"
description: "A complete guide to Cloudflare Workers AI in 2026. Learn how to run LLMs at the edge, use AI bindings, integrate with Workers and Pages, compare with Vercel AI, and optimize costs for production."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["cloudflare", "workers-ai", "edge-computing", "llm", "ai", "typescript", "serverless", "wasm"]
readingTime: "15 min read"
---

Running AI inference at the edge used to sound futuristic. In 2026, it's production reality — and Cloudflare Workers AI makes it surprisingly simple. Instead of shipping requests across an ocean to a centralized GPU cluster, Workers AI runs inference on Cloudflare's global network, putting model execution within milliseconds of your users.

This guide covers everything you need to run AI workloads on Cloudflare: available models, the AI binding API, Workers and Pages integration, latency vs. quality tradeoffs, and when to use Workers AI versus a centralized provider like Vercel AI SDK.

Need to test API endpoints as you build? Our [API Request Builder](/tools/api-request-builder) handles Bearer auth and JSON bodies without writing a line of code.

---

## What Is Cloudflare Workers AI?

Cloudflare Workers AI is a serverless AI inference platform built into the Workers runtime. You deploy a Worker (a JavaScript/TypeScript function running on the V8 isolate runtime), bind an AI model to it, and call the model directly from your Worker code — no external API calls, no authentication tokens, no cold starts.

Key properties:

- **Edge inference** — runs at 300+ Cloudflare PoPs worldwide
- **Zero cold starts** — models are pre-loaded in the Cloudflare network
- **Billing by neurons** — you pay for inference compute, not GPU time
- **Integrated binding** — the AI model is injected into your Worker like a KV namespace or D1 database
- **Privacy-first** — requests don't leave Cloudflare's network by default

It's not a replacement for frontier models — the models available on Workers AI are smaller and less capable than GPT-4o or Claude Opus. But for latency-sensitive tasks, embeddings, classification, and cost-sensitive high-volume workloads, Workers AI is hard to beat.

---

## Available Models in 2026

Cloudflare organizes Workers AI models by category:

### Text Generation

| Model | Parameters | Best For |
|-------|-----------|----------|
| `@cf/meta/llama-3.3-70b-instruct` | 70B | General chat, instruction following |
| `@cf/meta/llama-3.1-8b-instruct` | 8B | Fast, cost-efficient chat |
| `@cf/mistral/mistral-7b-instruct-v0.2` | 7B | Multilingual, European compliance |
| `@cf/qwen/qwen2.5-coder-32b-instruct` | 32B | Code generation, debugging |
| `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` | 32B | Reasoning, math |

### Embeddings

| Model | Dimensions | Use Case |
|-------|-----------|---------|
| `@cf/baai/bge-large-en-v1.5` | 1024 | English semantic search |
| `@cf/baai/bge-multilingual-gemma2` | 2048 | Multilingual RAG |

### Image Generation

| Model | Type | Notes |
|-------|------|-------|
| `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Text-to-image | SDXL base |
| `@cf/bytedance/stable-diffusion-xl-lightning` | Text-to-image | 4-step fast generation |

### Speech & Audio

| Model | Task |
|-------|------|
| `@cf/openai/whisper` | Speech-to-text |
| `@cf/openai/whisper-large-v3-turbo` | Fast, accurate transcription |

### Vision

| Model | Task |
|-------|------|
| `@cf/unum/uform-gen2-qwen-500m` | Image captioning, VQA |
| `@cf/llava-hf/llava-1.5-7b-hf` | Visual question answering |

Check `developers.cloudflare.com/workers-ai/models/` for the full list — it's updated frequently.

---

## Setting Up Your First Worker with AI

### Prerequisites

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Create a new Worker project
wrangler init my-ai-worker
cd my-ai-worker
```

### Configure `wrangler.toml`

```toml
name = "my-ai-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[ai]
binding = "AI"
```

The `[ai]` section creates an `AI` binding automatically available in your Worker. No API keys, no environment variables.

### Basic Text Generation

```typescript
// src/index.ts
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { prompt } = await request.json<{ prompt: string }>();

    const response = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: 512,
      }
    );

    return Response.json(response);
  },
};
```

Deploy it:

```bash
wrangler deploy
# Your Worker is live at: https://my-ai-worker.your-subdomain.workers.dev
```

That's the complete deployment. The model runs at the Cloudflare PoP nearest to each request.

---

## Streaming Responses

For chat UIs, stream tokens as they're generated:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { messages } = await request.json<{ messages: RoleScopedChatInput[] }>();

    const stream = await env.AI.run(
      "@cf/meta/llama-3.3-70b-instruct",
      {
        messages,
        stream: true,
        max_tokens: 1024,
      }
    );

    // Return the stream directly as SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};
```

On the client, consume the SSE stream:

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (data === "[DONE]") break;
      try {
        const parsed = JSON.parse(data);
        process.stdout.write(parsed.response ?? "");
      } catch {}
    }
  }
}
```

Alternatively, use the Vercel AI SDK with the `@ai-sdk/cloudflare` provider to get `useChat` integration for free.

---

## Embeddings and Vector Search

Workers AI shines for RAG (Retrieval-Augmented Generation) workflows combined with Cloudflare Vectorize:

```typescript
export interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/index" && request.method === "POST") {
      // Index a document
      const { id, text } = await request.json<{ id: string; text: string }>();

      const { data } = await env.AI.run(
        "@cf/baai/bge-large-en-v1.5",
        { text: [text] }
      );

      await env.VECTORIZE.upsert([
        {
          id,
          values: data[0],
          metadata: { text, indexed_at: Date.now() },
        },
      ]);

      return Response.json({ success: true });
    }

    if (url.pathname === "/search" && request.method === "POST") {
      // Semantic search + generate answer
      const { query } = await request.json<{ query: string }>();

      // Generate query embedding
      const { data: queryEmbedding } = await env.AI.run(
        "@cf/baai/bge-large-en-v1.5",
        { text: [query] }
      );

      // Find similar documents
      const results = await env.VECTORIZE.query(queryEmbedding[0], {
        topK: 3,
        returnMetadata: "all",
      });

      const context = results.matches
        .map((m) => m.metadata?.text as string)
        .join("\n\n");

      // Generate answer with context
      const answer = await env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct",
        {
          messages: [
            {
              role: "system",
              content: `Answer the question using only this context:\n\n${context}`,
            },
            { role: "user", content: query },
          ],
        }
      );

      return Response.json({ answer, sources: results.matches });
    }

    return new Response("Not found", { status: 404 });
  },
};
```

This pattern — embed, store in Vectorize, retrieve, generate — is a complete RAG pipeline running 100% within the Cloudflare network with no external dependencies.

---

## Integration with Cloudflare Pages

Workers AI is available in Pages Functions, making it easy to add AI to any Pages project:

```typescript
// functions/api/summarize.ts
export const onRequestPost: PagesFunction<{ AI: Ai }> = async (ctx) => {
  const { text } = await ctx.request.json<{ text: string }>();

  const summary = await ctx.env.AI.run(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "user",
          content: `Summarize this in 3 bullet points:\n\n${text}`,
        },
      ],
      max_tokens: 300,
    }
  );

  return Response.json(summary);
};
```

Add the AI binding in your `wrangler.toml`:

```toml
[env.production]
[env.production.ai]
binding = "AI"
```

---

## Workers AI vs. Vercel AI SDK

These are complementary tools, not direct competitors. Here's when to use each:

| Factor | Workers AI | Vercel AI SDK |
|--------|-----------|--------------|
| **Deployment target** | Cloudflare Workers/Pages | Any Node.js/Edge environment |
| **Model quality** | Small-medium (7B–70B) | Frontier (GPT-4o, Claude Opus, Gemini) |
| **Latency** | ~50–200ms globally | ~200–800ms (depends on region) |
| **Cost** | $0.011–$0.19 per million tokens | Varies by provider (often 10–100x more) |
| **Provider lock-in** | Cloudflare only | Multiple providers |
| **Setup complexity** | Binding (zero config) | API keys per provider |
| **Streaming** | SSE | SSE + React hooks (useChat) |
| **Tool calling** | Available on select models | Full support across providers |

**Use Workers AI when:**
- You're already on Cloudflare Workers/Pages
- Cost and latency are primary concerns
- Task doesn't require frontier model capabilities (classification, summarization, embeddings, RAG)

**Use Vercel AI SDK when:**
- You need the best reasoning quality (code generation, complex analysis)
- You want multi-provider flexibility
- You need `useChat` and streaming React hooks

**Best pattern for many teams:** Workers AI for embeddings and retrieval, frontier models via Vercel AI SDK for generation.

---

## Cost Optimization

Workers AI pricing is based on "neurons" — Cloudflare's unit for inference compute. Approximate costs as of 2026:

- **Llama 3.1 8B** — ~$0.011 per million tokens (input + output)
- **Llama 3.3 70B** — ~$0.19 per million tokens
- **BGE embeddings** — ~$0.011 per million tokens
- **Whisper** — ~$0.0007 per audio minute

Tips to minimize costs:

1. **Use the smallest model that works.** Run Llama 8B for simple classification; reserve Llama 70B for nuanced reasoning.
2. **Cache embedding results.** Embeddings are deterministic — cache them in KV or D1.
3. **Truncate long inputs.** Most tasks don't need 8K tokens. Truncate to 1K–2K for cost savings.
4. **Batch embedding requests.** The BGE embedding model accepts arrays — batch multiple texts in one call.

```typescript
// Efficient: batch 10 texts in one call
const { data } = await env.AI.run(
  "@cf/baai/bge-large-en-v1.5",
  { text: tenTexts }  // array of 10 strings
);

// Inefficient: 10 separate calls
for (const text of tenTexts) {
  await env.AI.run("@cf/baai/bge-large-en-v1.5", { text: [text] });
}
```

---

## Limits and Considerations

**Current limitations to be aware of:**

- **No fine-tuning** — you use pre-trained models as-is
- **Rate limits** — Workers AI has per-account and per-Worker limits (check your plan)
- **Context window** — most models max at 4K–8K tokens; no 200K context window like Claude
- **Response quality** — smaller models make more factual errors; add validation for production
- **No multimodal support** for text+image in the same message (use separate vision models)

**Debugging:**

```typescript
// Log usage data for cost tracking
const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
  messages,
});

// Response includes usage metadata
console.log(JSON.stringify({
  input_tokens: response.usage?.input_tokens,
  output_tokens: response.usage?.output_tokens,
}));
```

---

## Complete Example: AI-Powered Search API

A complete Workers AI application combining text generation and embeddings:

```typescript
// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  KV: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Index endpoint: store document with embedding
app.post("/documents", async (c) => {
  const { id, title, content } = await c.req.json<{
    id: string;
    title: string;
    content: string;
  }>();

  const text = `${title}\n\n${content}`;
  const { data } = await c.env.AI.run("@cf/baai/bge-large-en-v1.5", {
    text: [text],
  });

  await c.env.VECTORIZE.upsert([{
    id,
    values: data[0],
    metadata: { title, content: content.slice(0, 500) },
  }]);

  return c.json({ success: true, id });
});

// Search endpoint: semantic search + AI answer
app.post("/search", async (c) => {
  const { query } = await c.req.json<{ query: string }>();

  // Check cache
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  // Embed query
  const { data: qEmbed } = await c.env.AI.run("@cf/baai/bge-large-en-v1.5", {
    text: [query],
  });

  // Find relevant docs
  const results = await c.env.VECTORIZE.query(qEmbed[0], {
    topK: 3,
    returnMetadata: "all",
  });

  const context = results.matches
    .map((m) => `${m.metadata?.title}\n${m.metadata?.content}`)
    .join("\n---\n");

  // Generate answer
  const aiResponse = await c.env.AI.run("@cf/meta/llama-3.3-70b-instruct", {
    messages: [
      {
        role: "system",
        content: `Answer questions using only the provided context. Be concise.\n\nContext:\n${context}`,
      },
      { role: "user", content: query },
    ],
    max_tokens: 500,
  });

  const response = {
    answer: aiResponse.response,
    sources: results.matches.map((m) => ({
      id: m.id,
      title: m.metadata?.title,
      score: m.score,
    })),
  };

  // Cache for 5 minutes
  await c.env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 });

  return c.json(response);
});

export default app;
```

This Worker uses Hono (a lightweight router), Vectorize for vector storage, KV for caching, and Workers AI for both embeddings and generation — entirely within the Cloudflare ecosystem.

---

## Summary

Cloudflare Workers AI brings ML inference to the edge with zero configuration:

- **AI binding** — models are injected like any other Cloudflare resource
- **300+ PoPs** — global inference with sub-200ms latency
- **Text, vision, audio, embeddings** — broad model catalog for different tasks
- **Vectorize integration** — full RAG pipelines without external dependencies
- **Pages support** — add AI to any static site via Functions
- **Low cost** — cents per million tokens for most workloads

The sweet spot for Workers AI: high-volume, latency-sensitive, cost-optimized tasks where a 70B model is good enough. Pair it with frontier models via the Vercel AI SDK when you need maximum reasoning quality.

Curious what your Workers AI responses look like? Paste them into our [JSON Formatter](/tools/json-formatter) to inspect the structure.
