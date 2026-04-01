---
title: "LLM Token Optimization: Reduce API Costs by 60%"
description: "Practical techniques to dramatically reduce LLM API costs: token counting, prompt compression, caching strategies, model routing, and batching. Real examples with before/after token counts and cost analysis."
date: "2026-04-01"
tags: [llm, tokens, cost-optimization, gpt4, claude, api-cost]
readingTime: "13 min read"
---

# LLM Token Optimization: Reduce API Costs by 60%

LLM API costs can spiral fast. A few unoptimized prompts in a high-traffic application can generate thousands of dollars in unexpected bills. But most teams have 40-60% of wasted tokens sitting right on the surface — verbose system prompts, redundant context, unconstrained output, and no caching.

This guide covers every major technique for reducing LLM token costs without sacrificing output quality. We'll work through real examples with before/after token counts and realistic cost projections.

---

## Understanding LLM Pricing

Before optimizing, understand what you're paying for.

### The Token Economics

LLMs charge per token, separately for input (prompt) and output (completion).

| Model | Input ($/1M) | Output ($/1M) | Context |
|-------|-------------|---------------|---------|
| GPT-4o | $2.50 | $10.00 | 128K |
| GPT-4o mini | $0.15 | $0.60 | 128K |
| claude-sonnet-4-6 | $3.00 | $15.00 | 200K |
| claude-haiku-4-5 | $0.80 | $4.00 | 200K |
| claude-opus-4-6 | $15.00 | $75.00 | 200K |
| Gemini 2.5 Pro | $1.25 | $10.00 | 1M |
| Gemini 2.0 Flash | $0.10 | $0.40 | 1M |
| o4-mini | $1.10 | $4.40 | 200K |

**Key insight:** Output tokens typically cost 3-5x more than input tokens. A 2000-token response on Claude Sonnet costs $0.03 in output alone. At 10,000 requests/day, that's $300/day from output alone.

Use the [Prompt Token Counter](/tools/prompt-token-counter) to get precise estimates before deploying any new prompt.

### Where Tokens Actually Go

In a typical LLM-powered application:
- **System prompt:** 10-40% of input tokens
- **Conversation history:** 20-50% of input tokens
- **User message:** 5-20% of input tokens
- **Retrieved context (RAG):** 0-50% of input tokens

Understanding this breakdown is essential because each category has different optimization levers.

---

## Technique 1: System Prompt Compression

System prompts are included in every request. Even small reductions compound dramatically at scale.

### Before: Verbose System Prompt (847 tokens)

```
You are a helpful AI assistant designed to help developers with their coding questions and technical problems. You have extensive knowledge of many programming languages including Python, JavaScript, TypeScript, Go, Rust, Java, and many others. You are friendly, professional, and always try to provide complete and helpful answers.

When answering questions, please make sure to:
- Be thorough and comprehensive in your explanations
- Provide code examples when relevant
- Explain why solutions work, not just what they do
- If you're not sure about something, say so
- Always be respectful and professional
- If the user asks about something dangerous or harmful, politely decline
- Try to anticipate follow-up questions and address them proactively

You should format your responses in a clear and readable way using markdown formatting where appropriate. Use code blocks for any code snippets. Use headers to organize long responses. Use bullet points for lists.

Remember to consider the user's experience level when crafting your responses. If they seem to be a beginner, explain concepts more thoroughly. If they seem experienced, you can use more technical terminology.
```

### After: Compressed System Prompt (187 tokens)

```
You are a coding assistant for professional developers.

Rules:
- Answer directly — skip preamble
- Use code examples over prose
- State uncertainty explicitly
- Decline harmful requests

Format: markdown, code blocks, headers for complex answers.
```

**Token savings: 660 tokens per request.** At 50,000 requests/day on Claude Sonnet: **$0.099/request × 660 tokens × 50K reqs = $99/day saved** — about $3,000/month from system prompt compression alone.

### Compression Techniques

**Remove filler phrases.** "You are a helpful AI assistant designed to..." becomes "You are a coding assistant." The model knows what helpful and AI mean.

**Convert prose to bullets.** Prose rules take 2-3x more tokens than equivalent bullet instructions.

**Cut examples from system prompts.** Move few-shot examples to a caching layer (see Technique 4) or include them only when the task requires them.

**Use abbreviations.** "Don't" instead of "Do not". "i.e." instead of "that is to say".

**Remove redundancy.** "Always be professional and respectful" — models are trained to be professional. You're paying tokens to state the default.

---

## Technique 2: Output Token Constraints

Unconstrained output is one of the biggest sources of token waste. Models tend to be verbose when not constrained.

### Set max_tokens Explicitly

Always set `max_tokens` based on what you actually need:

```python
# Bad: no constraint
response = client.messages.create(
    model="claude-sonnet-4-6",
    messages=[...]
)

# Good: explicit limit
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,  # set based on your use case
    messages=[...]
)
```

For a task that should produce a 3-sentence summary, `max_tokens=256` is more than sufficient. Setting `max_tokens=4096` wastes potential output tokens and also signals to the model that a longer response is acceptable.

### Instruct Conciseness in the Prompt

```
Summarize the following error log in 2-3 sentences. Be concise.

[error log]
```

Adding "Be concise" and specifying sentence count reduces output length by 30-50% on average.

### Format-Based Compression

Structured outputs are often much shorter than prose:

**Prose (380 tokens):**
"The code has several issues that should be addressed. First, the `getUser` function on line 23 does not handle the case where the user is not found, which could cause a null reference exception. Additionally, the `updateProfile` function on line 47 is missing input validation..."

**Structured (95 tokens):**
```json
{"issues": [
  {"line": 23, "fn": "getUser", "problem": "no null check", "severity": "high"},
  {"line": 47, "fn": "updateProfile", "problem": "missing validation", "severity": "medium"}
]}
```

The JSON version contains the same information at 25% of the token cost. Use structured outputs whenever the consumer is code, not a human.

---

## Technique 3: Context Window Management

Conversation history is the silent budget killer. Each turn in a multi-turn conversation accumulates in the context.

### The Naive Approach (Expensive)

```
Turn 1: 200 tokens sent
Turn 2: 200 + 400 (history) = 600 tokens sent
Turn 3: 600 + 500 = 1100 tokens sent
Turn 10: ~8000 tokens sent
```

By turn 10, you're sending 40x more tokens than the first turn for the same conversation.

### Strategy 1: Rolling Window

Keep only the last N turns:

```python
def build_context(messages: list, max_turns: int = 5) -> list:
    # Always include system context
    # Keep only last max_turns turns
    return messages[-max_turns * 2:]  # *2 for user+assistant pairs
```

This is simple and works for most conversational use cases where recent history is more relevant than old history.

### Strategy 2: Summarization Compression

When history gets long, summarize old turns into a compact summary:

```python
async def compress_history(messages: list, threshold: int = 20) -> list:
    if len(messages) <= threshold:
        return messages

    # Summarize the oldest half of messages
    old_messages = messages[:len(messages)//2]
    recent_messages = messages[len(messages)//2:]

    summary = await llm.invoke(
        f"Summarize this conversation in 3-5 sentences, preserving key technical decisions and context:\n\n{format_messages(old_messages)}"
    )

    return [{"role": "system", "content": f"Previous conversation summary: {summary}"}] + recent_messages
```

The summarization call costs tokens, but the ongoing savings from shorter history more than offset it.

### Strategy 3: Selective Context Injection

Instead of sending full conversation history, use semantic search to find the most relevant previous turns:

```python
# Index conversation turns in a vector store
# On each new turn, retrieve the 3 most semantically similar past turns
relevant_history = vector_store.similarity_search(current_message, k=3)
context = format_messages(relevant_history) + current_message
```

This works especially well for long research conversations where only a few past turns are relevant to any given query.

---

## Technique 4: Prompt Caching

Prompt caching is one of the highest-leverage optimizations available. Both Anthropic and OpenAI offer significant discounts for cached tokens.

### Anthropic Prompt Caching

Claude caches tokens after 1024 tokens in the system prompt. Cached tokens cost $0.30/1M (90% discount from standard $3.00/1M on Sonnet).

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": your_long_system_prompt,  # must be >1024 tokens to cache
            "cache_control": {"type": "ephemeral"}
        }
    ],
    messages=[{"role": "user", "content": user_message}]
)

# Check cache usage
cache_read = response.usage.cache_read_input_tokens
cache_write = response.usage.cache_creation_input_tokens
```

**When caching pays off:** If your system prompt is 2000 tokens and you have 10,000 requests/day, the cache write happens once (or on expiration), and cache reads save you $0.0051 per request. At 10K requests/day: **$51/day** saved.

### OpenAI Prompt Caching

OpenAI automatically caches prompts longer than 1024 tokens at 50% discount. No configuration needed — it's automatic for prompts over that threshold.

### Maximizing Cache Hit Rate

For caching to work, the cached portion must be **identical** across requests:

```python
# Bad: user data embedded in system prompt (breaks caching)
system = f"You are an assistant for {user.name} (ID: {user.id}). They are on the {user.plan} plan."

# Good: stable system prompt + user context in messages
system = "You are a billing support assistant."
messages = [
    {"role": "user", "content": f"[User: {user.name}, Plan: {user.plan}]\n\n{user_message}"}
]
```

Keep user-specific data out of the system prompt. Put it in the message where it doesn't affect cache keys.

---

## Technique 5: Model Routing

Not every task needs GPT-4o or Claude Opus. Routing requests to cheaper models for simpler tasks is one of the fastest ROI optimizations.

### Cost Comparison by Task

| Task | Required Model | Cost Savings vs. Sonnet |
|------|---------------|------------------------|
| Sentiment classification | Haiku / Flash | 80-95% |
| Simple Q&A (FAQ) | Mini / Flash | 80-90% |
| Code generation (small functions) | Sonnet / GPT-4o | 0% (use flagship) |
| Document summarization | Mini / Haiku | 70-80% |
| Complex reasoning | Opus / o3 | -500% (costs more) |
| RAG retrieval synthesis | Sonnet | 0% (use flagship) |

### Implementation Pattern

```python
def route_to_model(task_type: str, complexity: int) -> str:
    if task_type == "classification":
        return "claude-haiku-4-5"
    elif task_type == "summarization" and complexity < 3:
        return "gpt-4o-mini"
    elif task_type == "code_generation" and complexity > 7:
        return "claude-opus-4-6"
    else:
        return "claude-sonnet-4-6"  # default flagship
```

A more sophisticated approach uses a classifier LLM (cheap, fast) to route to the appropriate model:

```python
# Use a cheap model to classify the task
routing_decision = cheap_llm.invoke(
    f"Classify this request complexity as 'simple', 'medium', or 'complex':\n{user_message}"
)
model = route_by_complexity(routing_decision)
```

The routing call costs ~100 tokens ($0.00001 on Haiku) and saves potentially thousands of tokens on the main call.

---

## Technique 6: Request Batching and Deduplication

### Deduplication

Many applications ask the same LLM question repeatedly. Cache results at the application layer:

```python
import hashlib
import redis

def cached_llm_call(prompt: str, system: str, ttl: int = 3600) -> str:
    cache_key = hashlib.sha256(f"{system}:{prompt}".encode()).hexdigest()

    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return cached.decode()

    # Call LLM
    response = llm.invoke(prompt, system=system)

    # Store result
    redis_client.setex(cache_key, ttl, response)
    return response
```

For FAQ systems, classification tasks, and document analysis, 30-70% of requests are often identical or near-identical. Deduplication at the application layer is effectively free — you pay the LLM once and serve cached results indefinitely.

### Semantic Deduplication

For near-identical requests, use embedding similarity:

```python
def semantic_cache_lookup(query: str, threshold: float = 0.95) -> str | None:
    query_embedding = embed(query)
    similar = vector_cache.search(query_embedding, threshold=threshold)
    return similar[0].response if similar else None
```

If a new query is 95%+ similar to a cached query, return the cached response. This works well for FAQ-style applications where users rephrase the same question differently.

### Batching API Calls

Some providers support batch processing at reduced cost. OpenAI's Batch API offers 50% discount for requests processed within 24 hours:

```python
import openai

# Submit batch job
batch = openai.batches.create(
    input_file_id=file_id,  # JSONL file with requests
    endpoint="/v1/chat/completions",
    completion_window="24h"
)

# Poll for completion
# Batch API is 50% cheaper than real-time
```

Anthropic's Message Batches API offers similar pricing for large-scale processing:

```python
batch = client.messages.batches.create(
    requests=[
        {"custom_id": f"req-{i}", "params": {...}}
        for i, params in enumerate(all_requests)
    ]
)
```

Ideal for nightly jobs, bulk document processing, and any workflow that doesn't require real-time responses.

---

## Technique 7: RAG Context Compression

Retrieval-augmented generation is valuable but token-expensive. The retrieved context often includes irrelevant text that adds cost without adding value.

### Reranking

Retrieve more candidates than you need, then rerank and use only the top K:

```python
# Retrieve 20 chunks
candidates = vector_store.similarity_search(query, k=20)

# Rerank using a cross-encoder (fast, cheap)
reranked = cross_encoder.rank(query, candidates)

# Use only top 3
context = "\n\n".join(chunk.text for chunk in reranked[:3])
```

Cross-encoders are much smaller models than LLMs. A reranker adds ~10ms and negligible cost but can reduce your RAG context from 6000 tokens to 1500 tokens.

### Extractive Compression

Instead of sending full document chunks, extract only the relevant sentences:

```python
# Use a small LLM to extract relevant sentences
compression_prompt = f"""Extract only the sentences from the document that are directly relevant to answering: "{query}"

Document:
{document_text}

Return only the extracted sentences, nothing else."""

compressed = small_llm.invoke(compression_prompt)
# Use compressed instead of full document_text
```

A 1000-token document chunk often compresses to 100-200 tokens of actually relevant content.

---

## Real-World Optimization Impact

Here's a realistic before/after for a developer assistant application at 50,000 requests/day:

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| System prompt | 800 tokens | 180 tokens | 620 tokens/req |
| RAG context | 4000 tokens | 1200 tokens (compressed) | 2800 tokens/req |
| Output length | 600 tokens avg | 300 tokens (constrained) | 300 tokens/req |
| Conversation history | 2000 tokens | 400 tokens (rolling window) | 1600 tokens/req |
| **Total savings** | **7400 tokens/req** | | |

At Claude Sonnet pricing ($3.00/1M input, $15.00/1M output):
- Input savings: 5820 tokens × $0.003/1K × 50K = **$873/day**
- Output savings: 300 tokens × $0.015/1K × 50K = **$225/day**
- **Total: $1,098/day ($32,940/month)**

With prompt caching on the system prompt:
- Additional: ~600 tokens × 90% discount × 50K reqs = **$81/day**

Add model routing (using Haiku for 30% of simple requests):
- Additional: ~$150/day

**Total optimized savings: ~$1,329/day** on a 50K req/day application.

---

## Monitoring Token Usage

Optimization without measurement is guesswork. Instrument your LLM calls:

```python
def llm_call_with_metrics(prompt: str, system: str, model: str) -> dict:
    response = client.messages.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        system=system
    )

    # Track metrics
    metrics = {
        "model": model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cache_read_tokens": getattr(response.usage, "cache_read_input_tokens", 0),
        "cache_write_tokens": getattr(response.usage, "cache_creation_input_tokens", 0),
        "cost": calculate_cost(response.usage, model)
    }

    # Send to your observability stack
    langfuse.track(metrics)
    return {"content": response.content[0].text, "metrics": metrics}
```

Use [LangFuse](/tools/langfuse-trace-analyzer) or Helicone to aggregate per-endpoint token usage. You'll quickly see which prompts are the most expensive and where optimization effort pays off most.

---

## Quick-Win Checklist

Start here for immediate impact:

- [ ] Enable prompt caching (Anthropic) or verify automatic caching (OpenAI)
- [ ] Audit your system prompt — can it be cut by 50%?
- [ ] Set `max_tokens` on all production calls
- [ ] Add "Be concise" to any prompt where brevity matters
- [ ] Implement rolling window context for multi-turn conversations
- [ ] Route simple tasks (classification, simple Q&A) to cheap models
- [ ] Add application-layer caching with Redis or similar
- [ ] Add token tracking to measure optimization impact

---

## Tools for Token Management

- [Prompt Token Counter](/tools/prompt-token-counter) — Count tokens and estimate costs before deployment
- [System Prompt Tester](/tools/system-prompt-tester) — Test prompt variants for quality + token efficiency
- [Claude API Config Builder](/tools/claude-api-config-builder) — Build requests with caching enabled
- [Helicone Request Logger](/tools/helicone-request-logger) — Proxy-based LLM observability
- [LangFuse Trace Analyzer](/tools/langfuse-trace-analyzer) — Trace schema builder for production monitoring
