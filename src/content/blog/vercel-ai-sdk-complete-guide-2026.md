---
title: "Vercel AI SDK Complete Guide 2026: Streaming, Tool Calls & Multi-Provider"
description: "The complete guide to the Vercel AI SDK in 2026. Learn streaming text and objects, tool calling, multi-provider setup, Next.js integration, and production patterns for building LLM-powered apps."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["vercel-ai-sdk", "ai", "nextjs", "streaming", "tool-calling", "openai", "anthropic", "typescript", "react"]
readingTime: "20 min read"
---

The Vercel AI SDK has become the default choice for building AI-powered Next.js applications. It abstracts away provider-specific APIs, gives you first-class streaming support, and integrates seamlessly with React Server Components. In 2026, with multi-model workflows and agentic patterns going mainstream, knowing the Vercel AI SDK inside out is a core skill for any full-stack developer.

This guide covers everything from basic setup to advanced multi-provider routing, tool calling, and production optimization patterns.

Want to test your AI API calls before writing code? Use our [API Request Builder](/tools/api-request-builder) to validate responses from any LLM endpoint.

---

## What Is the Vercel AI SDK?

The Vercel AI SDK (`ai` package on npm) is an open-source TypeScript library that provides:

- **Unified provider interface** — one API for OpenAI, Anthropic, Google, Mistral, Groq, and more
- **First-class streaming** — `streamText`, `streamObject`, and `streamUI` for real-time responses
- **Tool calling** — structured function execution with automatic schema validation
- **React hooks** — `useChat`, `useCompletion`, `useObject` for frontend integration
- **Next.js optimized** — works natively with App Router, Server Actions, and Edge Runtime

The SDK has two main layers:

1. **AI Core** (`ai`) — provider-agnostic primitives for text generation, object generation, and streaming
2. **AI UI** (`ai/react`) — React hooks for client-side state management and real-time updates

---

## Installation and Basic Setup

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic
# or
pnpm add ai @ai-sdk/openai @ai-sdk/anthropic
```

Set your API keys in `.env.local`:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Basic text generation:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const { text } = await generateText({
  model: openai("gpt-4o"),
  prompt: "Explain React Server Components in one paragraph.",
});

console.log(text);
```

That's it. The SDK handles authentication, retries, and response parsing automatically.

---

## Core Primitives

### `generateText` — Non-streaming Generation

Use `generateText` for tasks where you need the complete response before doing anything with it: summaries, classifications, short answers.

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const { text, usage, finishReason } = await generateText({
  model: anthropic("claude-opus-4-6"),
  system: "You are a helpful coding assistant.",
  messages: [
    { role: "user", content: "What is the difference between null and undefined in JavaScript?" },
  ],
  maxTokens: 500,
  temperature: 0.3,
});

console.log(text);
console.log(`Tokens used: ${usage.totalTokens}`);
console.log(`Finish reason: ${finishReason}`); // "stop" | "length" | "tool-calls"
```

### `streamText` — Streaming Generation

For chat interfaces and long-form content, streaming dramatically improves perceived performance.

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const result = streamText({
  model: openai("gpt-4o"),
  prompt: "Write a 500-word blog introduction about TypeScript generics.",
});

// Stream to stdout
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Get full text after stream completes
const fullText = await result.text;
const usage = await result.usage;
```

### `generateObject` — Structured Output

`generateObject` forces the model to return valid JSON matching a Zod schema. No more prompt engineering to extract structured data.

```typescript
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const { object } = await generateObject({
  model: openai("gpt-4o"),
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()).max(5),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    estimatedReadTime: z.number().describe("Reading time in minutes"),
  }),
  prompt: "Generate metadata for a blog post about React Server Components.",
});

console.log(object.title);     // "Understanding React Server Components"
console.log(object.difficulty); // "intermediate"
```

The schema is sent to the model as a tool definition, so this works reliably with any provider that supports tool use.

---

## Streaming in Next.js App Router

The most common pattern: a streaming chat API route.

```typescript
// app/api/chat/route.ts
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "edge"; // Optional: run on Vercel Edge Network

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: "You are a helpful assistant.",
    messages,
  });

  return result.toDataStreamResponse();
}
```

On the client, use the `useChat` hook:

```tsx
// app/components/Chat.tsx
"use client";
import { useChat } from "ai/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className="inline-block p-3 rounded-lg bg-gray-100 max-w-[80%]">
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-gray-400 animate-pulse">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-500 text-white rounded">
          Send
        </button>
      </form>
    </div>
  );
}
```

`useChat` handles message history, streaming state, and error recovery automatically.

---

## Tool Calling

Tool calling is where the AI SDK really shines. It lets models invoke typed functions with schema-validated arguments.

### Defining Tools

```typescript
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const result = await generateText({
  model: openai("gpt-4o"),
  tools: {
    getWeather: tool({
      description: "Get current weather for a city",
      parameters: z.object({
        city: z.string().describe("City name"),
        unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
      }),
      execute: async ({ city, unit }) => {
        // Call your weather API here
        const weather = await fetchWeather(city, unit);
        return {
          temperature: weather.temp,
          condition: weather.description,
          humidity: weather.humidity,
        };
      },
    }),

    searchDocs: tool({
      description: "Search the documentation for a topic",
      parameters: z.object({
        query: z.string(),
        limit: z.number().default(3),
      }),
      execute: async ({ query, limit }) => {
        const results = await vectorSearch(query, limit);
        return results;
      },
    }),
  },
  toolChoice: "auto", // Model decides when to use tools
  maxSteps: 5,        // Allow up to 5 tool call rounds
  prompt: "What's the weather in Tokyo and find docs about Next.js caching?",
});

console.log(result.text);
console.log(result.steps); // Array of all tool calls and results
```

### Streaming Tool Calls

For interactive UIs, stream tool results as they arrive:

```typescript
// app/api/agent/route.ts
import { streamText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-4-6"),
    messages,
    tools: {
      createTask: tool({
        description: "Create a new task in the project management system",
        parameters: z.object({
          title: z.string(),
          priority: z.enum(["low", "medium", "high"]),
          assignee: z.string().optional(),
        }),
        execute: async (params) => {
          const task = await db.tasks.create(params);
          return { taskId: task.id, url: `/tasks/${task.id}` };
        },
      }),
    },
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
}
```

On the client, `useChat` renders tool call states automatically if you configure it:

```tsx
const { messages } = useChat({
  api: "/api/agent",
  // Render tool invocations inline
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === "createTask") {
      // Optimistically show the task being created
      console.log("Creating task:", toolCall.args);
    }
  },
});
```

---

## Multi-Provider Setup

One of the SDK's most powerful features: switch providers per request without changing application code.

### Provider Factory Pattern

```typescript
// lib/ai-providers.ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

type Task = "chat" | "code" | "summary" | "fast";

const providerMap: Record<Task, ReturnType<typeof openai>> = {
  chat: openai("gpt-4o"),
  code: anthropic("claude-opus-4-6"),
  summary: google("gemini-2.0-flash"),
  fast: groq("llama-3.3-70b-versatile"),
};

export function getModel(task: Task) {
  return providerMap[task];
}
```

```typescript
// Usage
import { generateText } from "ai";
import { getModel } from "@/lib/ai-providers";

// Automatically routes to Claude for code tasks
const { text } = await generateText({
  model: getModel("code"),
  prompt: "Optimize this SQL query...",
});
```

### Fallback Pattern

For high-availability systems, fall back to a secondary provider on error:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

async function generateWithFallback(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
    });
    return text;
  } catch (primaryError) {
    console.warn("Primary provider failed, falling back:", primaryError.message);

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      prompt,
    });
    return text;
  }
}
```

---

## React Server Components Integration

The AI SDK works natively with React Server Components via `streamUI` (experimental) or by streaming from Server Actions.

### Server Action Pattern

```typescript
// app/actions/summarize.ts
"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createStreamableValue } from "ai/rsc";

export async function summarizeArticle(articleText: string) {
  const stream = createStreamableValue("");

  (async () => {
    const { textStream } = streamText({
      model: openai("gpt-4o-mini"),
      prompt: `Summarize this article in 3 bullet points:\n\n${articleText}`,
    });

    for await (const chunk of textStream) {
      stream.update(chunk);
    }

    stream.done();
  })();

  return { output: stream.value };
}
```

```tsx
// app/components/ArticleSummary.tsx
"use client";
import { readStreamableValue } from "ai/rsc";
import { summarizeArticle } from "../actions/summarize";
import { useState } from "react";

export function ArticleSummary({ articleText }: { articleText: string }) {
  const [summary, setSummary] = useState("");

  const handleSummarize = async () => {
    const { output } = await summarizeArticle(articleText);

    for await (const chunk of readStreamableValue(output)) {
      setSummary((prev) => prev + chunk);
    }
  };

  return (
    <div>
      <button onClick={handleSummarize}>Summarize</button>
      {summary && <p>{summary}</p>}
    </div>
  );
}
```

---

## Production Patterns

### Rate Limiting

Never expose raw AI endpoints without rate limiting:

```typescript
// app/api/chat/route.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per minute
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too many requests", { status: 429 });
  }

  // ... rest of handler
}
```

### Token Budget Management

Track and limit token usage per user:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const MAX_TOKENS_PER_USER_PER_DAY = 50_000;

async function generateWithBudget(userId: string, prompt: string) {
  const usedToday = await getTokenUsage(userId);

  if (usedToday >= MAX_TOKENS_PER_USER_PER_DAY) {
    throw new Error("Daily token limit reached");
  }

  const remaining = MAX_TOKENS_PER_USER_PER_DAY - usedToday;

  const { text, usage } = await generateText({
    model: openai("gpt-4o"),
    prompt,
    maxTokens: Math.min(2000, remaining),
  });

  await incrementTokenUsage(userId, usage.totalTokens);

  return text;
}
```

### Error Handling

```typescript
import { generateText } from "ai";
import { APICallError, RetryError } from "ai";

async function safeGenerate(prompt: string) {
  try {
    return await generateText({
      model: openai("gpt-4o"),
      prompt,
      maxRetries: 3, // SDK handles retries automatically
    });
  } catch (error) {
    if (APICallError.isInstance(error)) {
      // API-level error (auth, quota, etc.)
      console.error("API error:", error.message, "Status:", error.statusCode);
    } else if (RetryError.isInstance(error)) {
      // All retries exhausted
      console.error("All retries failed:", error.lastError);
    }
    throw error;
  }
}
```

### Caching Responses

Cache deterministic responses to reduce costs and latency:

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHash } from "crypto";

const cache = new Map<string, string>();

async function cachedGenerate(prompt: string, temperature = 0): Promise<string> {
  // Only cache deterministic requests (temperature = 0)
  if (temperature === 0) {
    const cacheKey = createHash("sha256").update(prompt).digest("hex");
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0,
    });

    cache.set(cacheKey, text);
    return text;
  }

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt,
    temperature,
  });
  return text;
}
```

In production, replace the in-memory `Map` with Redis or a database-backed cache.

---

## Comparing Providers

| Provider | Best For | Strengths | Limitations |
|----------|----------|-----------|-------------|
| OpenAI GPT-4o | General chat, vision | Fast, reliable, huge ecosystem | Cost |
| Anthropic Claude | Long docs, code, reasoning | Best context handling, instruction following | No image generation |
| Google Gemini Flash | High-volume tasks | Very fast, cheap | Less reliable structured output |
| Groq (Llama) | Low-latency inference | Extremely fast (200+ tokens/sec) | Smaller models |
| Mistral | European compliance | GDPR-friendly, strong multilingual | Smaller ecosystem |

The Vercel AI SDK abstracts away these differences so you can benchmark them with a config change.

---

## Debugging Tips

**1. Enable verbose logging:**

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Log all requests and responses
process.env.AI_SDK_LOG_LEVEL = "debug";

const result = await generateText({
  model: openai("gpt-4o"),
  prompt: "Hello",
});
```

**2. Inspect full message history:**

```typescript
const result = await generateText({ /* ... */ });
console.log(JSON.stringify(result.request.messages, null, 2));
```

**3. Check finish reason to debug truncation:**

```typescript
if (result.finishReason === "length") {
  console.warn("Response was truncated — increase maxTokens");
}
```

**4. Monitor token usage in development:**

```typescript
const { usage } = await generateText({ /* ... */ });
console.log(`Prompt: ${usage.promptTokens}, Completion: ${usage.completionTokens}, Total: ${usage.totalTokens}`);
// Estimate cost: totalTokens * (cost per 1M tokens / 1_000_000)
```

---

## Putting It Together: A Full Chat Application

```typescript
// app/api/chat/route.ts
import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
});

export const runtime = "edge";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system: `You are a helpful developer assistant. You have access to tools to help users.
Today's date is ${new Date().toISOString().split("T")[0]}.`,
    messages,
    tools: {
      calculateComplexity: tool({
        description: "Estimate code complexity using Big O notation",
        parameters: z.object({
          algorithm: z.string().describe("Description of the algorithm"),
        }),
        execute: async ({ algorithm }) => {
          // In production: call a real analysis service
          return { complexity: "O(n log n)", explanation: "Analysis complete" };
        },
      }),
    },
    maxSteps: 3,
    maxTokens: 1000,
    temperature: 0.7,
    onFinish: ({ usage, finishReason }) => {
      // Log usage for billing/monitoring
      console.log(`Chat: ${usage.totalTokens} tokens, reason: ${finishReason}`);
    },
  });

  return result.toDataStreamResponse();
}
```

---

## Summary

The Vercel AI SDK in 2026 is the most complete TypeScript library for building LLM-powered applications:

- **`generateText` / `streamText`** — simple text generation with optional streaming
- **`generateObject` / `streamObject`** — structured output with Zod schemas
- **Tool calling** — typed function execution with automatic schema validation
- **`useChat` / `useCompletion`** — React hooks for real-time streaming UIs
- **Multi-provider routing** — switch between OpenAI, Anthropic, Google, and more with a config change
- **Production patterns** — rate limiting, token budgets, caching, error handling

Start with `useChat` + a streaming route for your chat UI, add tool calling when you need the model to take actions, and layer in multi-provider routing when you need cost optimization or fallback reliability.

Want to explore the API endpoints your AI app will call? Try our [JSON Formatter](/tools/json-formatter) to visualize and validate API responses as you build.

---

## Migrating from the OpenAI SDK

If you're already using the raw `openai` npm package, migration is straightforward:

```typescript
// Before: raw OpenAI SDK
import OpenAI from "openai";
const client = new OpenAI();
const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello" }],
  stream: true,
});

// After: Vercel AI SDK
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
const result = streamText({
  model: openai("gpt-4o"),
  messages: [{ role: "user", content: "Hello" }],
});
```

The main benefits of migrating: built-in `useChat` hook eliminates ~100 lines of streaming boilerplate, Zod-based tool definitions replace manual JSON Schema, and you gain instant access to every other provider without adding new SDKs.
