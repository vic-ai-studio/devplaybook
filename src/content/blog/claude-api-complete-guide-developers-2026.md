---
title: "Claude API Complete Guide for Developers 2026: Models, Pricing & Best Practices"
description: "Complete guide to the Claude API in 2026. Covers model lineup, TypeScript and Python integration, system prompts, tool use, vision, prompt caching, extended thinking, batch processing, and production patterns."
date: "2026-04-01"
tags: [claude, anthropic, llm, api, typescript]
readingTime: "15 min read"
---

# Claude API Complete Guide for Developers 2026: Models, Pricing & Best Practices

Anthropic's Claude API has matured significantly heading into 2026. The model lineup now spans Haiku (fast and cheap), Sonnet (the daily driver), and Opus (the heavyweight), each with distinct cost/quality tradeoffs. Features like prompt caching, extended thinking, the Batches API, and first-class tool use make Claude genuinely production-ready for complex applications.

This guide covers the full API surface — not just "here's a hello world" but the patterns experienced developers actually reach for: caching expensive system prompts, batching large workloads, structuring multi-turn tool flows, and keeping costs predictable at scale.

## Model Lineup

| Model | Context | Input | Output | Best For |
|-------|---------|-------|--------|---------|
| Claude Opus 4.6 | 200,000 | $15.00/1M | $75.00/1M | Complex reasoning, architecture, highest-stakes tasks |
| Claude Sonnet 4.6 | 200,000 | $3.00/1M | $15.00/1M | Production workloads, agents, code generation |
| Claude Haiku 4.5 | 200,000 | $0.80/1M | $4.00/1M | High-volume classification, extraction, low-latency chat |

**Decision rule:** Default to Sonnet 4.6 for most applications. It hits the right balance of quality, speed, and cost. Upgrade to Opus for tasks where quality is the primary constraint and cost is secondary — complex multi-step reasoning, nuanced writing, deep code analysis. Use Haiku for workloads that scale to millions of requests where Sonnet-level quality isn't needed.

All models share the same API interface, so switching models is a one-line change.

## API Setup

### Get Your API Key

Go to [console.anthropic.com](https://console.anthropic.com) and create an API key. Set it as an environment variable:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Install the SDK

```bash
# TypeScript / Node.js
npm install @anthropic-ai/sdk

# Python
pip install anthropic
```

## Basic Usage: Messages API

### TypeScript

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generate(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text from the first content block
  const block = message.content[0];
  if (block.type === "text") {
    return block.text;
  }
  throw new Error("Unexpected response type");
}

const result = await generate("What are the tradeoffs between PostgreSQL and MongoDB?");
console.log(result);
```

### Python

```python
import anthropic
import os

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def generate(prompt: str) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

result = generate("Explain how a consistent hash ring works.")
print(result)
```

## System Prompts: Writing Effective Instructions

The system prompt is your primary lever for shaping Claude's behavior. Claude follows system prompt instructions reliably — more so than most models.

Structure your system prompts with three components:

1. **Role** — who Claude is in this context
2. **Format** — how responses should be structured
3. **Constraints** — what Claude must not do

```typescript
const systemPrompt = `You are a senior backend engineer reviewing pull requests.

When reviewing code, you:
- Focus on correctness, performance, and security issues first
- Point out style issues only if they create maintenance problems
- Suggest specific fixes with code examples
- Rate each issue as CRITICAL, MAJOR, or MINOR

Format your response as:
## Summary
One sentence overview.

## Issues
For each issue:
**[SEVERITY] Title**
Location: filename:line
Problem: explanation
Fix:
\`\`\`language
corrected code
\`\`\`

If no issues found, say "LGTM" with a brief rationale.`;

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: systemPrompt,
  messages: [{ role: "user", content: `Review this:\n\n${prDiff}` }],
});
```

**Tips for effective system prompts:**
- Be explicit about output format — Claude follows formatting instructions precisely
- Use examples for complex formats (few-shot in the system prompt)
- Separate concerns: one section for persona, one for format, one for rules
- Avoid negatives when possible — "respond only in JSON" beats "don't add prose around the JSON"

## Multi-turn Conversations

Claude has no built-in memory — you must manage conversation history in your application.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface Message {
  role: "user" | "assistant";
  content: string;
}

class ConversationSession {
  private history: Message[] = [];
  private model = "claude-sonnet-4-6";

  async send(userMessage: string): Promise<string> {
    this.history.push({ role: "user", content: userMessage });

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: "You are a helpful technical assistant.",
      messages: this.history,
    });

    const assistantMessage = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    this.history.push({ role: "assistant", content: assistantMessage });

    // Trim history to stay within context budget
    if (this.history.length > 40) {
      this.history = this.history.slice(-40);
    }

    return assistantMessage;
  }
}

const session = new ConversationSession();
console.log(await session.send("I'm debugging a memory leak in Node.js. Where do I start?"));
console.log(await session.send("I'm using Express. What tools help detect the leak?"));
console.log(await session.send("How do I interpret the heap snapshot?"));
```

## Streaming

Streaming lets you display tokens as they arrive, significantly improving perceived response time for chat interfaces.

### TypeScript Streaming

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function streamMessage(prompt: string): Promise<void> {
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      process.stdout.write(chunk.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  console.log(`\n\nTokens used: ${finalMessage.usage.input_tokens} in, ${finalMessage.usage.output_tokens} out`);
}

await streamMessage("Write a TypeScript function that implements a debounce with cancellation.");
```

### Streaming with the `stream` Helper (Python)

```python
import anthropic

client = anthropic.Anthropic()

with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain CQRS with a practical example."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)

final = stream.get_final_message()
print(f"\n\nInput tokens: {final.usage.input_tokens}")
print(f"Output tokens: {final.usage.output_tokens}")
```

## Tool Use / Function Calling

Claude's tool use is among the most reliable in the industry. Define your tools, and Claude decides when to call them and returns structured arguments.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const tools: Anthropic.Tool[] = [
  {
    name: "get_github_pr",
    description: "Fetch the diff and metadata for a GitHub pull request",
    input_schema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "Repository owner (username or org)",
        },
        repo: { type: "string", description: "Repository name" },
        pr_number: { type: "number", description: "Pull request number" },
      },
      required: ["owner", "repo", "pr_number"],
    },
  },
  {
    name: "post_pr_comment",
    description: "Post a comment on a GitHub pull request",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        pr_number: { type: "number" },
        body: { type: "string", description: "Comment text (Markdown)" },
      },
      required: ["owner", "repo", "pr_number", "body"],
    },
  },
];

async function runAgentLoop(userMessage: string): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools,
      messages,
    });

    // Add assistant's response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Final text response
      const text = response.content.find((b) => b.type === "text");
      if (text?.type === "text") console.log(text.text);
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        console.log(`Calling tool: ${block.name}`, block.input);

        // Execute your actual tool here
        let result: unknown;
        if (block.name === "get_github_pr") {
          result = await fetchPR(block.input as { owner: string; repo: string; pr_number: number });
        } else if (block.name === "post_pr_comment") {
          result = await postComment(block.input as { owner: string; repo: string; pr_number: number; body: string });
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: "user", content: toolResults });
    }
  }
}

await runAgentLoop("Review PR #42 in the acme/api-server repo and post a code review comment.");
```

## Vision: Sending Images

```typescript
import fs from "fs";

const imageData = fs.readFileSync("./screenshot.png");
const base64Image = imageData.toString("base64");

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Image,
          },
        },
        {
          type: "text",
          text: "What does this error message say and how do I fix it?",
        },
      ],
    },
  ],
});

console.log(message.content[0].type === "text" ? message.content[0].text : "");
```

You can also pass images via URL:

```typescript
{
  type: "image",
  source: {
    type: "url",
    url: "https://example.com/diagram.png",
  },
}
```

## Prompt Caching

Prompt caching is one of Claude's most impactful cost-reduction features. Mark stable content with `cache_control: {type: "ephemeral"}` and subsequent requests that share that prefix are served from cache at a 90% cost reduction.

```typescript
const systemPrompt = `You are an expert at analyzing legal contracts.
Your role is to identify clauses that may be unfavorable and explain them in plain English.
Always cite the specific section number when referring to contract language.
Format findings as a numbered list ordered by severity.`;

const contractText = fs.readFileSync("./service-agreement.txt", "utf-8");

// First request — caches the system prompt + contract text
const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" },  // cache the system prompt
    },
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: contractText,
          cache_control: { type: "ephemeral" },  // cache the document
        },
        {
          type: "text",
          text: "Identify any automatic renewal clauses.",
        },
      ],
    },
  ],
});

console.log("Cache write tokens:", message.usage.cache_creation_input_tokens);
console.log("Cache read tokens:", message.usage.cache_read_input_tokens);

// Follow-up questions reuse the cached prefix — ~90% cheaper for the cached portion
const followUp = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: [
    {
      type: "text",
      text: systemPrompt,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: contractText,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: "What are the liability limits?" },
      ],
    },
  ],
});

console.log("Cache read tokens (second request):", followUp.usage.cache_read_input_tokens);
```

**When caching helps:**
- Long system prompts (>1024 tokens) reused across many requests
- Large documents analyzed with multiple questions
- Codebases fed as context for iterative Q&A
- RAG retrievals where the same chunks appear repeatedly

Cached tokens cost $0.30/1M (write) and $0.30/1M (read) vs $3.00/1M for normal Sonnet input — a 10x reduction on the cached portion.

## Extended Thinking

Claude Sonnet 4.6 supports extended thinking — an explicit reasoning phase before generating its final response. Improves quality on math, logic, complex code design, and multi-step planning.

```typescript
const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  thinking: {
    type: "enabled",
    budget_tokens: 10000,  // tokens Claude can use for internal reasoning
  },
  messages: [
    {
      role: "user",
      content:
        "Design a fault-tolerant distributed task queue. Cover: architecture, data model, " +
        "failure modes, retry strategy, deduplication, and monitoring. Be thorough.",
    },
  ],
});

// Response contains both thinking blocks and text blocks
for (const block of message.content) {
  if (block.type === "thinking") {
    console.log("=== Claude's reasoning ===");
    console.log(block.thinking);
  } else if (block.type === "text") {
    console.log("=== Final answer ===");
    console.log(block.text);
  }
}
```

Extended thinking is billed at the same token rates. Set `budget_tokens` between 1,024 and 100,000. Higher budgets improve quality on hard problems but increase latency and cost.

## Batch Processing: Messages Batches API

The Batches API lets you submit up to 10,000 requests in a single batch, processed asynchronously at 50% the normal API price. Ideal for large-scale classification, extraction, or evaluation workloads.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Prepare batch requests
const requests = documents.map((doc, i) => ({
  custom_id: `doc-${i}`,
  params: {
    model: "claude-haiku-4-5",  // use Haiku for volume workloads
    max_tokens: 256,
    messages: [
      {
        role: "user" as const,
        content: `Classify this support ticket as: bug, feature_request, billing, or other.
Return only the category label.

Ticket: ${doc.text}`,
      },
    ],
  },
}));

// Submit the batch
const batch = await client.messages.batches.create({ requests });
console.log(`Batch ID: ${batch.id}, Status: ${batch.processing_status}`);

// Poll for completion (or use a webhook)
async function waitForBatch(batchId: string) {
  while (true) {
    const status = await client.messages.batches.retrieve(batchId);

    if (status.processing_status === "ended") {
      console.log(`Completed: ${status.request_counts.succeeded} succeeded, ${status.request_counts.errored} errors`);
      return status;
    }

    console.log(
      `Processing: ${status.request_counts.processing} remaining...`
    );
    await new Promise((r) => setTimeout(r, 10_000));  // poll every 10s
  }
}

await waitForBatch(batch.id);

// Stream results
for await (const result of await client.messages.batches.results(batch.id)) {
  if (result.result.type === "succeeded") {
    const category = result.result.message.content[0];
    if (category.type === "text") {
      console.log(`${result.custom_id}: ${category.text}`);
    }
  }
}
```

At 50% off, Haiku batch processing costs $0.40/1M input + $2.00/1M output. For 1 million classification requests averaging 500 input tokens, that's $200 — far cheaper than alternatives.

## Model Comparison: Claude vs GPT-4o vs Gemini 2.5 Pro

| Dimension | Claude Sonnet 4.6 | GPT-4o | Gemini 2.5 Pro |
|-----------|-------------------|--------|----------------|
| Input cost | $3.00/1M | $2.50/1M | $1.25–$2.50/1M |
| Output cost | $15.00/1M | $10.00/1M | $10.00–$15.00/1M |
| Context window | 200,000 | 128,000 | 1,000,000 |
| Extended thinking | ✅ | ❌ (o3 separate) | ✅ |
| Tool use reliability | Excellent | Very good | Good |
| Instruction following | Excellent | Very good | Very good |
| Long context accuracy | Very good | Good | Excellent |
| Prompt caching | ✅ | ❌ | ❌ (limited) |
| Batch API | ✅ | ✅ | ❌ |
| Vision | ✅ | ✅ | ✅ |
| Fine-tuning | ❌ | ✅ | ❌ |

**Claude wins for:** Agentic systems (instruction following under complexity), safe content handling, prompt caching for repeated-context workloads, nuanced writing quality.

**GPT-4o wins for:** Existing OpenAI integrations, Assistants API, fine-tuning on custom datasets, slightly lower output cost.

**Gemini 2.5 Pro wins for:** Very long context (>200K tokens), cost efficiency at scale, multimodal video/audio inputs, Google Cloud ecosystem.

## Common Production Patterns

### Forcing JSON Output

```python
import anthropic
import json

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system="""You are a data extractor. Always respond with valid JSON only.
No prose before or after the JSON. No markdown code fences.""",
    messages=[{
        "role": "user",
        "content": f"""Extract the following from this job posting and return as JSON:
{{
  "title": "string",
  "company": "string",
  "location": "string",
  "salary_min": number | null,
  "salary_max": number | null,
  "remote": boolean,
  "required_skills": ["string"]
}}

Job posting:
{job_text}"""
    }]
)

try:
    data = json.loads(response.content[0].text)
except json.JSONDecodeError as e:
    print(f"Parse failed: {e}\nRaw: {response.content[0].text}")
```

### Retry Logic with Exponential Backoff

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function createWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 5
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.log(`Rate limited. Retry ${attempt + 1}/${maxRetries} in ${delay.toFixed(0)}ms`);
        await new Promise((r) => setTimeout(r, delay));
      } else if (error instanceof Anthropic.APIStatusError && error.status >= 500) {
        const delay = Math.pow(2, attempt) * 500;
        console.log(`Server error ${error.status}. Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw error;  // Don't retry 4xx errors (except 429)
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}
```

### Rate Limiting on Your Side

The Claude API has per-minute token limits. Implement a simple request queue to stay within limits:

```typescript
class RateLimitedClient {
  private queue: Array<() => Promise<void>> = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const task = this.queue.shift()!;
    await task();
    this.running--;
    this.process();
  }
}

const limiter = new RateLimitedClient(5);

// Wrap all API calls through the limiter
const result = await limiter.enqueue(() =>
  client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  })
);
```

## DevPlaybook Tools for Claude API Development

These tools speed up development without writing code:

- [Claude API Config Builder](/tools/claude-api-config-builder) — build and validate your message request payload with a UI, then copy the generated TypeScript or Python
- [System Prompt Tester](/tools/system-prompt-tester) — test system prompts against sample inputs, compare outputs across versions
- [Prompt Token Counter](/tools/prompt-token-counter) — estimate token usage for your prompts and context before making API calls

## Pricing Summary (April 2026)

| Model | Input | Output | Batch Input | Batch Output | Cache Write | Cache Read |
|-------|-------|--------|-------------|--------------|-------------|------------|
| Claude Opus 4.6 | $15.00/1M | $75.00/1M | $7.50/1M | $37.50/1M | $18.75/1M | $1.50/1M |
| Claude Sonnet 4.6 | $3.00/1M | $15.00/1M | $1.50/1M | $7.50/1M | $3.75/1M | $0.30/1M |
| Claude Haiku 4.5 | $0.80/1M | $4.00/1M | $0.40/1M | $2.00/1M | $1.00/1M | $0.08/1M |

At Sonnet prices with 50% cache hit rate on a 2K-token system prompt:
- Without caching: 1000 requests × 2K system tokens = $6.00
- With caching: $3.75 (write, first request) + 999 × $0.30 × 2K/1M ≈ $0.60 = **$4.35 total** (~27% savings)

The savings compound dramatically with longer system prompts and more requests.

## Summary

The Claude API in 2026 is mature, reliable, and well-suited for production systems. The three things that differentiate it from alternatives:

1. **Tool use quality** — Claude follows complex tool schemas reliably and handles multi-step agentic flows without hallucinating tool calls
2. **Prompt caching** — genuinely impactful for applications that reuse system prompts or large context windows across many requests
3. **Instruction following** — Claude stays within its instructions under edge cases better than competing models, which matters for systems that need predictable formatting and behavior

Start with Sonnet 4.6 for most tasks. Layer in prompt caching as soon as you have stable system prompts. Use the Batches API for any workload that can tolerate async processing. Use extended thinking selectively for your hardest reasoning tasks.
