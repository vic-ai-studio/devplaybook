---
title: "LiteLLM vs Portkey vs OpenRouter: Choosing Your AI Gateway in 2026"
description: "Complete comparison of AI gateway solutions in 2026. Compare LiteLLM, Portkey, and OpenRouter for multi-provider routing, fallbacks, cost tracking, observability, and production reliability. Includes setup examples and decision guide."
date: "2026-04-01"
tags: [ai, llm, litellm, portkey, openrouter, llm-ops, developer-tools]
readingTime: "14 min read"
---

# LiteLLM vs Portkey vs OpenRouter: Choosing Your AI Gateway in 2026

You've decided to use LLMs in production. Now you have a problem: OpenAI goes down, your costs spike from a single endpoint, and you want to route fast queries to cheaper models while sending complex reasoning to Opus or GPT-4o.

You need an AI gateway.

AI gateways sit between your application and LLM providers. They handle routing, failover, cost tracking, rate limiting, observability, and unified API syntax. In 2026, three options dominate: LiteLLM, Portkey, and OpenRouter. Each takes a different approach, and choosing wrong will cost you time.

## What Is an AI Gateway?

A gateway abstracts away LLM provider differences behind a single interface. Instead of:

```python
# Without gateway — different SDK for each provider
import anthropic
import openai

claude = anthropic.Anthropic()
gpt = openai.OpenAI()

# Different method names, response formats, error types
claude_resp = claude.messages.create(model="claude-opus-4-6", messages=[...])
gpt_resp = gpt.chat.completions.create(model="gpt-4o", messages=[...])
```

You get:

```python
# With gateway — one interface for everything
import litellm

response = litellm.completion(
    model="anthropic/claude-opus-4-6",
    messages=[{"role": "user", "content": "Hello"}]
)

response = litellm.completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
```

The benefits compound at scale: change providers without rewriting code, enable fallbacks, centralize cost tracking.

---

## LiteLLM

LiteLLM is the Swiss Army knife of AI gateways. It can run as a Python library (in-process) or as a standalone proxy server, supporting 100+ LLM providers.

### Modes

**Library mode** — LiteLLM runs inside your Python process:

```python
from litellm import completion, acompletion
import os

# Set API keys (or use environment variables)
os.environ["ANTHROPIC_API_KEY"] = "sk-ant-..."
os.environ["OPENAI_API_KEY"] = "sk-..."
os.environ["GEMINI_API_KEY"] = "..."

# Unified interface across all providers
def chat(message: str, model: str = "gpt-4o") -> str:
    response = completion(
        model=model,
        messages=[{"role": "user", "content": message}],
    )
    return response.choices[0].message.content

# Same function works for any model
chat("Hello!", model="gpt-4o")
chat("Hello!", model="anthropic/claude-opus-4-6")
chat("Hello!", model="gemini/gemini-pro")
chat("Hello!", model="ollama/llama3")  # local models too
```

**Proxy mode** — LiteLLM runs as an OpenAI-compatible HTTP server:

```bash
# Install
pip install 'litellm[proxy]'

# Start proxy with config
litellm --config /path/to/config.yaml --port 8000
```

```yaml
# litellm_config.yaml
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-...

  - model_name: claude-fast
    litellm_params:
      model: anthropic/claude-haiku-4-5
      api_key: sk-ant-...

  - model_name: claude-slow
    litellm_params:
      model: anthropic/claude-opus-4-6
      api_key: sk-ant-...

  # Fallback group
  - model_name: best-available
    litellm_params:
      model: openai/gpt-4o
      fallbacks: ["anthropic/claude-opus-4-6", "gemini/gemini-pro"]

general_settings:
  master_key: sk-your-master-key  # for auth
  database_url: postgresql://...  # for usage logging

router_settings:
  routing_strategy: "usage-based-routing"
  enable_pre_call_check: true
```

Any OpenAI-compatible SDK can now point at your LiteLLM proxy:

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-master-key",
    base_url="http://localhost:8000"
)

# All requests go through LiteLLM
response = client.chat.completions.create(
    model="best-available",  # uses your fallback group
    messages=[{"role": "user", "content": "Hello"}]
)
```

### Advanced Features

**Fallbacks with retry logic:**

```python
from litellm import completion, APIError

response = completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    fallbacks=["anthropic/claude-opus-4-6", "gemini/gemini-pro"],
    context_window_fallbacks=[
        {"gpt-4o": ["gpt-4o-mini"]},
    ],
    num_retries=3,
    retry_policy={
        "RateLimitError": 3,
        "APIConnectionError": 2
    }
)
```

**Cost tracking:**

```python
from litellm import completion, completion_cost

response = completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a poem"}]
)

cost = completion_cost(completion_response=response)
print(f"Request cost: ${cost:.6f}")  # $0.000032
```

**Streaming:**

```python
stream = completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")
```

### Strengths
- Largest provider support (100+ providers)
- Best local/OSS model support (Ollama, vLLM, Together AI)
- Excellent cost tracking and budget limits
- Active OSS community
- Both library and proxy modes

### Weaknesses
- Proxy setup requires infrastructure management
- Dashboard is basic vs Portkey
- Less polished managed cloud offering

**Pricing:** LiteLLM OSS is free. LiteLLM Enterprise (managed proxy + advanced features) starts at $500/month.

---

## Portkey

Portkey is a managed AI gateway focused on production observability and reliability. It offers a hosted proxy you don't need to manage.

### Core Concepts

**Gateway:** Portkey's hosted proxy routes requests to LLM providers through their infrastructure. Zero infrastructure to maintain.

**Virtual Keys:** Portkey stores your provider API keys encrypted. Your app authenticates with a Portkey virtual key, never touching raw provider keys directly.

**Configs:** JSON configurations that define routing logic — fallbacks, A/B testing, retries, load balancing.

```python
from portkey_ai import Portkey

# Initialize with Portkey API key and config
portkey = Portkey(
    api_key="your-portkey-api-key",
    config="pc-your-config-id"  # or inline config
)

# OpenAI-compatible interface
response = portkey.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
```

### Config-Driven Routing

Portkey's killer feature is its config system for routing logic:

```python
from portkey_ai import Portkey, createConfig

# Fallback config: try GPT-4o first, fall back to Claude
config = createConfig({
    "strategy": {
        "mode": "fallback"
    },
    "targets": [
        {
            "virtualKey": "openai-key",
            "model": "gpt-4o",
        },
        {
            "virtualKey": "anthropic-key",
            "model": "claude-opus-4-6",
            "strategy": {"mode": "single"}
        }
    ]
})

portkey = Portkey(api_key="pk-...", config=config)
```

Load balancing with weighted routing:

```python
config = createConfig({
    "strategy": {
        "mode": "loadbalance"
    },
    "targets": [
        {
            "virtualKey": "openai-key-1",
            "weight": 0.7,  # 70% of traffic
        },
        {
            "virtualKey": "openai-key-2",
            "weight": 0.3,  # 30% of traffic (second account for rate limit distribution)
        }
    ]
})
```

### Observability

Portkey's managed dashboard is its biggest advantage over LiteLLM:

- Real-time request logs with full prompt/response visibility
- Latency breakdown by provider and model
- Cost analysis by user, application, model
- Feedback capture (human annotations on responses)
- Trace correlation for multi-step agent flows

```python
# Metadata for observability
response = portkey.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": user_query}],
    metadata={
        "user_id": user.id,
        "feature": "search",
        "session_id": session_id,
        "environment": "production"
    }
)
```

All metadata appears in the Portkey dashboard for filtering and analysis.

### Guardrails

Portkey includes a guardrails system for safety and compliance:

```python
config = createConfig({
    "targets": [{"virtualKey": "openai-key"}],
    "guardrails": [
        {
            "id": "pii-detection",
            "on_fail": "block",      # or "warn", "redact"
            "placement": "request",  # or "response"
        },
        {
            "id": "topic-restriction",
            "on_fail": "warn",
            "placement": "response",
        }
    ]
})
```

### Strengths
- Best-in-class managed observability dashboard
- Zero infrastructure (hosted gateway)
- Excellent A/B testing and experimentation features
- Built-in guardrails for safety/compliance
- Virtual key management for security

### Weaknesses
- Less OSS model support vs LiteLLM
- Vendor lock-in risk (though export is possible)
- Cost at high volume (paid tiers can add up)

**Pricing:**
| Plan | Price | Requests/Month |
|------|-------|---------------|
| Developer | Free | 10,000 |
| Pro | $49/month | 100,000 |
| Business | $499/month | Unlimited |

---

## OpenRouter

OpenRouter takes the marketplace approach. It's a single API endpoint that routes to 200+ models from dozens of providers, competing on price.

### How It Works

OpenRouter is an OpenAI-compatible API. You send requests to `https://openrouter.ai/api/v1`, and OpenRouter routes to the model you specify at the best available price.

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-or-...",  # OpenRouter API key
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "https://yourapp.com",  # optional
        "X-Title": "Your App Name"               # optional
    }
)

# Access any model via OpenRouter
response = client.chat.completions.create(
    model="anthropic/claude-opus-4-6",
    messages=[{"role": "user", "content": "Hello"}]
)

# Use model routing strategies
response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[{"role": "user", "content": "Complex reasoning task"}],
    extra_body={
        "route": "fallback"  # auto-fallback if primary is unavailable
    }
)
```

### Strengths
- Access to 200+ models with one API key
- Automatic fallback routing
- Competitive pricing (often cheaper than direct provider rates)
- No infrastructure to manage
- Great for evaluating and comparing models

### Weaknesses
- Less observability than LiteLLM Proxy or Portkey
- No built-in cost budgets by user/team
- Additional latency (one extra hop vs direct)
- Limited to OpenRouter's supported models

**Pricing:** Pay per token at each model's listed rate (slight markup over provider direct rates, competitive for most models).

---

## Head-to-Head Comparison

| Dimension | LiteLLM | Portkey | OpenRouter |
|-----------|---------|---------|------------|
| Self-hosting | ✓ (strongly) | ✗ | ✗ |
| OSS/local models | ✓✓✓ | ✓ | ✗ |
| Observability | ✓✓ (proxy) | ✓✓✓ | ✓ |
| Cost tracking | ✓✓✓ | ✓✓✓ | ✓✓ |
| Setup complexity | Medium-High | Low | Very Low |
| Fallback support | ✓✓✓ | ✓✓✓ | ✓✓ |
| Guardrails | ✗ (basic) | ✓✓✓ | ✗ |
| Model variety | ✓✓✓ | ✓✓ | ✓✓✓ |
| Enterprise features | ✓✓✓ | ✓✓✓ | ✓ |

---

## Decision Guide

**Choose LiteLLM if:**
- You need to run local/OSS models (Ollama, vLLM)
- Self-hosting is required (compliance, data residency)
- You want maximum provider flexibility
- Your team can manage infrastructure
- You have complex routing logic specific to your domain

**Choose Portkey if:**
- You want production observability out of the box
- You need guardrails for safety/compliance
- A/B testing prompt variants is important
- You don't want to manage gateway infrastructure
- Budget allows for the managed service tier

**Choose OpenRouter if:**
- You want the fastest path to multi-provider access
- You're evaluating models and need flexibility
- You're building a prototype or side project
- Simplicity is the priority

---

## Quick Setup Comparison

Setting up a basic multi-provider fallback:

**LiteLLM (1 hour setup):**
```bash
pip install litellm
litellm --config config.yaml
```

**Portkey (5 minutes):**
```python
pip install portkey-ai
# Configure at app.portkey.ai, get config ID, done
```

**OpenRouter (2 minutes):**
```bash
# Get API key from openrouter.ai, point existing code at new base_url
```

Use the [LiteLLM Proxy Config Generator](/tools/litellm-proxy-config-generator) or [Portkey Gateway Config](/tools/portkey-ai-gateway-config) to generate starter configurations without reading through API docs.

---

The right choice depends entirely on your priorities. If observability and compliance matter most, Portkey. If maximum flexibility and self-hosting matter, LiteLLM. If you want to be up in 5 minutes evaluating models, OpenRouter. Many teams end up with OpenRouter for development and LiteLLM or Portkey for production — a reasonable approach.
