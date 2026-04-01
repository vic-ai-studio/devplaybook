---
title: "Vercel AI SDK: Complete Guide to Streaming, Tool Calling & Multi-Provider in 2026"
description: "Master the Vercel AI SDK in 2026. Streaming text and objects, tool calling, multi-provider support (OpenAI, Claude, Gemini), agents, and production patterns. TypeScript-first guide."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["vercel-ai-sdk", "openai", "claude", "gemini", "ai", "typescript", "streaming"]
readingTime: "14 min read"
---

The Vercel AI SDK has become the standard library for building AI-powered applications in the JavaScript/TypeScript ecosystem. Version 4.x (current in 2026) provides a unified API across OpenAI, Anthropic Claude, Google Gemini, and 20+ other providers — with first-class streaming, type-safe tool calling, and built-in React hooks.

This guide covers everything you need to build production AI features.

---

## Setup and Core Concepts

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

The SDK is provider-agnostic. You swap models without changing your application code:

```typescript
// lib/ai.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Pick your model — same API for all providers
export const model = openai('gpt-4o');
// export const model = anthropic('claude-opus-4-6');
// export const model = google('gemini-2.0-flash');
```

---

## Text Generation

### generateText — non-streaming

For server-side generation where you need the complete response before proceeding:

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text, usage, finishReason } = await generateText({
  model: openai('gpt-4o'),
  system: 'You are a concise technical writer.',
  prompt: 'Explain WebSockets in one paragraph.',
  maxTokens: 200,
  temperature: 0.3,
});

console.log(text);
console.log(`Used ${usage.totalTokens} tokens`);
```

### streamText — streaming

For UI responses where you want to show output progressively:

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  prompt: 'Write a React component that renders a data table.',
});

// Stream to stdout
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Or get the full text when done
const fullText = await result.text;
```

---

## Streaming in Next.js API Routes

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: 'You are a helpful assistant.',
    messages,
  });

  return result.toDataStreamResponse();
}
```

The `toDataStreamResponse()` method handles all the SSE formatting. The client can consume it with the `useChat` hook.

---

## React Hooks: useChat and useCompletion

```tsx
'use client';
import { useChat } from 'ai/react';

export function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      console.log('Final message:', message.content);
    },
  });

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
              m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-gray-500">Thinking...</div>}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask anything..."
          className="flex-1 border rounded-lg px-3 py-2"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

`useChat` handles message history, streaming display, and error states. It automatically appends streamed chunks to the last assistant message in real-time.

---

## Tool Calling

Tool calling (function calling) lets the model request data from your application before generating a final response.

### Define tools with Zod schemas

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    getWeather: tool({
      description: 'Get current weather for a city',
      parameters: z.object({
        city: z.string().describe('The city name'),
        units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
      }),
      execute: async ({ city, units }) => {
        const data = await fetch(`/api/weather?city=${city}&units=${units}`).then(r => r.json());
        return { temperature: data.temp, condition: data.condition, city };
      },
    }),

    searchWeb: tool({
      description: 'Search the web for current information',
      parameters: z.object({
        query: z.string().describe('Search query'),
      }),
      execute: async ({ query }) => {
        const results = await searchAPI(query);
        return results.slice(0, 3).map(r => ({ title: r.title, snippet: r.snippet, url: r.url }));
      },
    }),
  },
  prompt: 'What is the weather in Tokyo and what are the top news stories today?',
  maxSteps: 5, // allow up to 5 tool call rounds
});

console.log(result.text); // Final response after tool calls
console.log(result.steps); // Array of each step taken
```

The `maxSteps` parameter enables agentic loops — the model can call multiple tools in sequence before producing a final answer.

### Streaming with tools

```typescript
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4o'),
  tools: { getWeather, searchWeb },
  prompt: 'What is the current state of TypeScript adoption?',
  maxSteps: 3,
});

// Stream tool calls in real-time
for await (const chunk of result.fullStream) {
  if (chunk.type === 'tool-call') {
    console.log(`Calling tool: ${chunk.toolName}`, chunk.args);
  }
  if (chunk.type === 'tool-result') {
    console.log(`Tool result:`, chunk.result);
  }
  if (chunk.type === 'text-delta') {
    process.stdout.write(chunk.textDelta);
  }
}
```

---

## Structured Object Generation

Generate type-safe structured data instead of plain text:

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const schema = z.object({
  title: z.string(),
  summary: z.string().max(280),
  tags: z.array(z.string()).min(1).max(5),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedReadTime: z.number().int().positive(),
});

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema,
  prompt: 'Analyze this article and extract metadata: ' + articleContent,
});

// object is fully typed — TypeScript infers the schema
console.log(object.title);           // string
console.log(object.difficulty);      // 'beginner' | 'intermediate' | 'advanced'
console.log(object.estimatedReadTime); // number
```

### Streaming structured objects

```typescript
import { streamObject } from 'ai';

const result = streamObject({
  model: openai('gpt-4o'),
  schema: z.object({
    recommendations: z.array(z.object({
      tool: z.string(),
      reason: z.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
    })),
  }),
  prompt: 'Recommend 5 developer tools for building a SaaS app in 2026.',
});

// Partial objects stream in as they're generated
for await (const partial of result.partialObjectStream) {
  console.log(partial.recommendations?.length ?? 0, 'recommendations so far');
}

const { object } = await result;
```

---

## Multi-Provider Strategy

The SDK makes provider switching trivial. Use this for:

- **Cost optimization**: route simple tasks to cheaper models
- **Reliability**: fallback to another provider on errors
- **Capability routing**: use the best model for each task type

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

type TaskType = 'simple' | 'complex' | 'code' | 'reasoning';

const MODEL_ROUTING: Record<TaskType, Parameters<typeof generateText>[0]['model']> = {
  simple: openai('gpt-4o-mini'),         // cheap, fast
  complex: anthropic('claude-opus-4-6'), // best reasoning
  code: openai('gpt-4o'),                // strong at code
  reasoning: google('gemini-2.0-flash'), // fast reasoning
};

async function generateWithRouting(prompt: string, taskType: TaskType) {
  return generateText({
    model: MODEL_ROUTING[taskType],
    prompt,
  });
}
```

### Fallback pattern

```typescript
import { generateText } from 'ai';

async function generateWithFallback(prompt: string) {
  const providers = [
    openai('gpt-4o'),
    anthropic('claude-sonnet-4-6'),
    google('gemini-2.0-flash'),
  ];

  for (const model of providers) {
    try {
      return await generateText({ model, prompt });
    } catch (error) {
      console.warn(`Provider failed, trying next:`, error);
    }
  }

  throw new Error('All providers failed');
}
```

---

## Embeddings

Generate vector embeddings for semantic search and RAG:

```typescript
import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

// Single embedding
const { embedding } = await embed({
  model: openai.embedding('text-embedding-3-small'),
  value: 'React hooks best practices',
});
// embedding is number[] with 1536 dimensions

// Batch embeddings
const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: [
    'React hooks best practices',
    'Vue.js composition API',
    'Angular dependency injection',
  ],
});
// embeddings is number[][] — one per input
```

---

## Production Patterns

### Rate limiting and cost control

```typescript
import { generateText } from 'ai';

export async function safeGenerate(userId: string, prompt: string) {
  // Check rate limit before calling AI
  const allowed = await rateLimiter.check(userId);
  if (!allowed) throw new Error('Rate limit exceeded');

  // Set hard token limits
  const result = await generateText({
    model: openai('gpt-4o'),
    prompt,
    maxTokens: 1000, // never exceed this
    abortSignal: AbortSignal.timeout(30_000), // 30s hard timeout
  });

  // Log usage for billing
  await trackUsage(userId, result.usage);

  return result;
}
```

### Caching responses

```typescript
import { generateText } from 'ai';
import { cache } from 'react'; // or use Redis

// React's cache() memoizes per-request (Next.js)
export const generateCached = cache(async (prompt: string) => {
  const cacheKey = `ai:${hash(prompt)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt,
  });

  await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1h TTL
  return result;
});
```

### Observability

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explain microservices.',
  experimental_telemetry: {
    isEnabled: true,
    functionId: 'explain-microservices',
    metadata: { userId, sessionId },
  },
});
```

The AI SDK integrates with OpenTelemetry — traces appear in LangFuse, Helicone, Vercel's AI observability dashboard, or any OTEL-compatible backend.

---

## Provider Feature Comparison (2026)

| Feature | OpenAI GPT-4o | Claude Opus 4.6 | Gemini 2.0 Flash |
|---------|---------------|-----------------|------------------|
| Context window | 128K | 200K | 1M |
| Tool calling | ✅ | ✅ | ✅ |
| Image input | ✅ | ✅ | ✅ |
| PDF input | ❌ | ✅ | ✅ |
| Structured output | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ |
| Speed | Fast | Medium | Very fast |
| Cost (per 1M output) | $15 | $75 | $0.60 |

---

## What to Build Next

The Vercel AI SDK abstracts away the complexity of working with multiple AI providers. For most applications, the architecture is simple:

1. Use `useChat` for conversational interfaces
2. Use `generateObject` for structured data extraction
3. Use tools + `maxSteps` for agents that need to gather information
4. Route between providers based on task complexity and cost

The TypeScript-first design means you get full autocomplete and type safety throughout — the schema you define for `generateObject` becomes the TypeScript type of the output automatically.

Explore the [JSON Schema Builder](/tools/json-schema-builder) for designing schemas, and the [API Response Formatter](/tools/api-response-formatter) for testing your AI endpoints.
