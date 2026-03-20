---
title: "How to Use Claude API: Complete Guide for Developers"
description: "A complete developer guide to the Claude API — API keys, authentication, your first API call in curl/Python/Node.js, model selection, prompt engineering, streaming, and cost management. Everything you need to build production-ready apps with Anthropic's Claude."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["claude-api", "anthropic", "ai", "developer-guide", "tutorial"]
readingTime: "14 min read"
---

Anthropic's Claude API gives developers access to one of the most capable large language models available. Whether you're building a coding assistant, a document summarizer, a customer support bot, or an autonomous agent, Claude's API is well-designed, straightforward to call, and powerful enough to handle genuinely complex tasks.

This guide walks you through everything from getting your first API key to production-ready best practices. All examples are tested and working.

---

## Step 1: Get Your API Key

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account
2. Navigate to **API Keys** in the left sidebar
3. Click **Create Key**, give it a name, and copy the key immediately — you won't see it again

Store your key securely. Never hardcode it in source files. Use environment variables:

```bash
# Add to your shell profile or .env file
export ANTHROPIC_API_KEY="sk-ant-..."
```

For production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault, Doppler, etc.) rather than environment variables baked into your deployment.

---

## Step 2: Understand the Models

As of 2025, the primary Claude models available via API are:

| Model | Best For | Input Cost | Output Cost |
|---|---|---|---|
| claude-opus-4 | Most complex reasoning, deep analysis | $15/M tokens | $75/M tokens |
| claude-sonnet-4-6 | Balanced capability + speed (recommended) | $3/M tokens | $15/M tokens |
| claude-haiku-4-5 | High-volume, low-latency tasks | $0.80/M tokens | $4/M tokens |

**Which model should you use?**

- **claude-sonnet-4-6**: Your default choice for most applications. Excellent reasoning, fast responses, reasonable cost. This is the sweet spot for 90% of use cases.
- **claude-haiku-4-5**: Use when you need high throughput or very low latency — autocomplete, classification, short summarization. The cheapest option for simple tasks.
- **claude-opus-4**: Reserve for tasks that genuinely require maximum reasoning depth — complex multi-step analysis, research synthesis, agentic workflows where quality matters most.

You can check the current model list programmatically:

```bash
curl https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01"
```

---

## Step 3: Your First API Call

### cURL

The simplest possible call:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Explain the difference between async/await and Promises in JavaScript in 3 bullet points."
      }
    ]
  }'
```

You'll get back a JSON response like:

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Here are 3 key differences between async/await and Promises..."
    }
  ],
  "model": "claude-sonnet-4-6",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 28,
    "output_tokens": 142
  }
}
```

Note the `usage` field — always check this during development so you understand your token consumption.

---

### Python

Install the official SDK:

```bash
pip install anthropic
```

Basic call:

```python
import anthropic

client = anthropic.Anthropic()  # Reads ANTHROPIC_API_KEY from environment

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Explain the difference between async/await and Promises in JavaScript in 3 bullet points."
        }
    ]
)

print(message.content[0].text)
print(f"Tokens used: {message.usage.input_tokens} in, {message.usage.output_tokens} out")
```

With a system prompt (recommended for production):

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    system="You are a senior software engineer. Provide concise, technically accurate answers. Use code examples when helpful. Always mention potential edge cases or gotchas.",
    messages=[
        {
            "role": "user",
            "content": "How do I handle database connection pooling in a Node.js Express app?"
        }
    ]
)

print(message.content[0].text)
```

Multi-turn conversation (maintaining history):

```python
import anthropic

client = anthropic.Anthropic()

conversation_history = []

def chat(user_message: str) -> str:
    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system="You are a helpful coding assistant.",
        messages=conversation_history
    )

    assistant_message = response.content[0].text
    conversation_history.append({
        "role": "assistant",
        "content": assistant_message
    })

    return assistant_message

# Usage
print(chat("I'm building a REST API in Python. Where should I start?"))
print(chat("What framework would you recommend?"))
print(chat("Show me a basic FastAPI app structure."))
```

---

### Node.js

Install the official SDK:

```bash
npm install @anthropic-ai/sdk
```

Basic call:

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // Reads ANTHROPIC_API_KEY from environment

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content:
        "Explain the difference between async/await and Promises in JavaScript in 3 bullet points.",
    },
  ],
});

console.log(message.content[0].text);
console.log(
  `Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`
);
```

With error handling (production-ready):

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function callClaude(userMessage, systemPrompt = null) {
  try {
    const params = {
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: userMessage }],
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    const message = await client.messages.create(params);
    return {
      text: message.content[0].text,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`API Error ${error.status}: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

// Usage
const result = await callClaude(
  "What are the SOLID principles?",
  "You are a senior software architect. Be concise."
);
console.log(result.text);
```

---

## Step 4: Streaming Responses

For long responses, streaming dramatically improves perceived performance — your UI can display tokens as they arrive rather than waiting for the full response.

### Python Streaming

```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    messages=[
        {
            "role": "user",
            "content": "Write a comprehensive guide to building a REST API with FastAPI."
        }
    ]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

    # Access final message after stream completes
    final_message = stream.get_final_message()
    print(f"\n\nTotal tokens: {final_message.usage.input_tokens + final_message.usage.output_tokens}")
```

### Node.js Streaming

```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content:
        "Write a comprehensive guide to building a REST API with FastAPI.",
    },
  ],
});

stream.on("text", (text) => {
  process.stdout.write(text);
});

const finalMessage = await stream.finalMessage();
console.log(
  `\nTotal tokens: ${finalMessage.usage.input_tokens + finalMessage.usage.output_tokens}`
);
```

### Streaming in an Express API

This pattern is common for building Claude-powered web apps:

```javascript
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const client = new Anthropic();

app.post("/api/chat", express.json(), async (req, res) => {
  const { message, systemPrompt } = req.body;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt || "You are a helpful assistant.",
    messages: [{ role: "user", content: message }],
  });

  stream.on("text", (text) => {
    res.write(`data: ${JSON.stringify({ text })}\n\n`);
  });

  stream.on("finalMessage", (msg) => {
    res.write(`data: ${JSON.stringify({ done: true, usage: msg.usage })}\n\n`);
    res.end();
  });

  stream.on("error", (err) => {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  });
});
```

---

## Step 5: Prompt Engineering Best Practices

The quality of your prompts directly determines the quality of Claude's output. Here are the patterns that work:

### Use a System Prompt

Always define Claude's role and constraints in the system prompt rather than in the user message:

```python
system = """You are a code review assistant specializing in Python.

Your responsibilities:
- Identify bugs, security issues, and performance problems
- Suggest improvements with specific code examples
- Rate severity: Critical / High / Medium / Low
- Be concise — no filler text

Format your response as:
1. Summary (2-3 sentences)
2. Issues found (bulleted, with severity)
3. Suggested improvements (with code)
"""
```

### Be Specific About Output Format

Claude follows formatting instructions reliably:

```python
user_message = """
Review this function and respond in JSON format:
{
  "has_bugs": boolean,
  "bugs": [{"line": number, "description": string, "severity": string}],
  "suggestions": [string],
  "overall_quality": "poor" | "acceptable" | "good" | "excellent"
}

Function to review:
```python
def get_user(id):
    return db.query("SELECT * FROM users WHERE id = " + id)
```
"""
```

### Chain of Thought for Complex Tasks

For reasoning-heavy tasks, instruct Claude to think step by step:

```python
user_message = """
Debug this issue step by step:
1. First, analyze what the code is supposed to do
2. Trace the execution flow
3. Identify where the logic breaks down
4. Propose a fix

Code: [paste your code here]
Error: [paste the error here]
"""
```

### Few-Shot Examples

Show Claude the pattern you want by providing examples:

```python
system = """
You classify developer questions into categories. Examples:

Q: "How do I reverse a string in Python?" → Category: "syntax-basics"
Q: "My Docker container won't start" → Category: "devops-debugging"
Q: "What's the best way to structure a microservices API?" → Category: "architecture"
Q: "How do I fix a merge conflict?" → Category: "git-workflow"

Respond with only the category name.
"""
```

---

## Step 6: Token Management

Tokens are the unit of cost and context. Understanding token usage helps you optimize for both.

**Approximate token counts:**
- 1 token ≈ 4 characters in English
- 1 token ≈ 0.75 words
- 1,000 tokens ≈ 750 words ≈ a medium-length article

**Estimating tokens before a call:**

```python
import anthropic

client = anthropic.Anthropic()

# Count tokens without making a full API call
token_count = client.messages.count_tokens(
    model="claude-sonnet-4-6",
    system="You are a helpful assistant.",
    messages=[
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ]
)

print(f"This request will use approximately {token_count.input_tokens} input tokens")
```

**Tips for managing token costs:**

1. **Trim conversation history**: Don't pass the full conversation history for every turn. Keep only the last N turns or summarize older context.
2. **Use Haiku for simple tasks**: Classification, short summaries, and keyword extraction don't need Sonnet.
3. **Set appropriate `max_tokens`**: Don't set 4096 if you only need a 200-word response.
4. **Cache repeated system prompts**: Anthropic's prompt caching feature reduces costs for long, repeated system prompts (check current API docs for availability).

---

## Step 7: Rate Limits and Error Handling

### Rate Limits

Claude API rate limits are based on:
- **Requests per minute (RPM)**
- **Tokens per minute (TPM)**
- **Tokens per day (TPD)**

Limits vary by usage tier. You can check your current limits in the Anthropic console.

### Production Error Handling

```python
import anthropic
import time

client = anthropic.Anthropic()

def call_with_retry(messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            return client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                messages=messages
            )
        except anthropic.RateLimitError:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"Rate limited. Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                raise
        except anthropic.APIStatusError as e:
            if e.status_code >= 500:
                # Server error — retry
                if attempt < max_retries - 1:
                    time.sleep(1)
                    continue
            raise  # Client errors (4xx) — don't retry

    raise Exception("Max retries exceeded")
```

---

## Step 8: Cost Management in Production

**Track spending with usage logs:**

```python
import anthropic
import json
from datetime import datetime

client = anthropic.Anthropic()

def tracked_call(messages, system=None, tags=None):
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system or "You are a helpful assistant.",
        messages=messages
    )

    # Log usage
    usage_log = {
        "timestamp": datetime.utcnow().isoformat(),
        "model": response.model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "cost_usd": (response.usage.input_tokens * 0.000003) + (response.usage.output_tokens * 0.000015),
        "tags": tags or []
    }

    with open("usage_log.jsonl", "a") as f:
        f.write(json.dumps(usage_log) + "\n")

    return response

# Usage
response = tracked_call(
    messages=[{"role": "user", "content": "Summarize this document..."}],
    tags=["summarization", "user-facing"]
)
```

You can validate and inspect your JSON usage logs with [DevPlaybook's JSON Formatter](https://devplaybook.cc/tools/json-formatter).

**Cost comparison for a 100,000-request-per-month chatbot:**

Assuming average 500 input tokens + 300 output tokens per conversation:
- **Haiku**: (500 × 0.80 + 300 × 4.00) / 1M × 100,000 = ~$160/month
- **Sonnet**: (500 × 3.00 + 300 × 15.00) / 1M × 100,000 = ~$600/month
- **Opus**: (500 × 15.00 + 300 × 75.00) / 1M × 100,000 = ~$3,000/month

This math makes model selection critical. Use Haiku for classification and routing, Sonnet for substantive responses, Opus only when you genuinely need maximum reasoning.

---

## Common Patterns and Use Cases

### Document Q&A

```python
def answer_about_document(document_text: str, question: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system="You answer questions based solely on the provided document. If the answer isn't in the document, say so clearly.",
        messages=[
            {
                "role": "user",
                "content": f"Document:\n\n{document_text}\n\nQuestion: {question}"
            }
        ]
    )
    return response.content[0].text
```

### Code Review Bot

```python
def review_code(code: str, language: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system="You are a senior code reviewer. Respond only with valid JSON.",
        messages=[
            {
                "role": "user",
                "content": f"Review this {language} code and respond in JSON with keys: bugs (array), improvements (array), security_issues (array), overall_score (1-10).\n\n```{language}\n{code}\n```"
            }
        ]
    )
    import json
    return json.loads(response.content[0].text)
```

### Structured Data Extraction

```python
def extract_from_text(raw_text: str) -> dict:
    response = client.messages.create(
        model="claude-haiku-4-5",  # Simple extraction → use Haiku
        max_tokens=512,
        system="Extract structured data from text. Respond only with valid JSON.",
        messages=[
            {
                "role": "user",
                "content": f"Extract: company_name, contact_email, phone_number, address from:\n\n{raw_text}\n\nUse null for missing fields."
            }
        ]
    )
    import json
    return json.loads(response.content[0].text)
```

---

## Testing Your Claude Integration

Use [DevPlaybook's API Tester](https://devplaybook.cc/tools/api-tester) to manually test your Anthropic API calls before writing code. You can also use it to validate that your endpoint wrapper is correctly forwarding requests.

For validating JSON payloads your app sends and receives, [DevPlaybook's JSON Formatter](https://devplaybook.cc/tools/json-formatter) makes it easy to inspect and pretty-print complex API responses.

---

## Quick Reference

**Base URL**: `https://api.anthropic.com/v1`

**Required headers**:
```
x-api-key: YOUR_API_KEY
anthropic-version: 2023-06-01
content-type: application/json
```

**Key endpoint**: `POST /v1/messages`

**Python SDK**: `pip install anthropic`

**Node.js SDK**: `npm install @anthropic-ai/sdk`

**Console**: [console.anthropic.com](https://console.anthropic.com)

**Full API docs**: [docs.anthropic.com](https://docs.anthropic.com)

---

The Claude API is one of the cleanest AI APIs to work with — well-documented, predictable, and powerful. Start with Sonnet for most tasks, use Haiku for volume, and graduate to Opus only when you actually need it. Track your token usage from day one so cost surprises don't catch you at the end of the month.

*DevPlaybook is a free toolkit for developers. No affiliate relationship with Anthropic.*
