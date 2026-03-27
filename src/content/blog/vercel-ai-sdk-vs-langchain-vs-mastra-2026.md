---
title: "Vercel AI SDK vs LangChain.js vs Mastra: AI Framework Comparison 2026"
description: "A comprehensive technical comparison of Vercel AI SDK, LangChain.js, and Mastra for building AI applications in 2026 — covering streaming, tool calling, RAG, agents, and when to choose each."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["ai", "llm", "vercel-ai-sdk", "langchain", "mastra", "rag", "agents", "typescript", "nextjs", "javascript"]
readingTime: "16 min read"
---

The JavaScript AI framework ecosystem has matured rapidly. In early 2024, LangChain.js was the default choice. By late 2025, Vercel AI SDK had captured most of the Next.js ecosystem, and Mastra emerged as a focused competitor with a compelling DX story. In 2026, all three are production-grade — but they serve different use cases.

This guide gives you code-level comparisons so you can make an informed choice.

---

## Quick Comparison: At a Glance

| | **Vercel AI SDK** | **LangChain.js** | **Mastra** |
|---|---|---|---|
| **Primary use case** | UI streaming in Next.js/React | Complex multi-step chains/agents | Agent workflows with memory |
| **Learning curve** | Low | High | Medium |
| **Streaming support** | First-class (`useChat`, `streamText`) | Yes (via callbacks) | Yes (built-in) |
| **Tool calling** | Excellent (Zod schema) | Good (multiple formats) | Excellent (typed) |
| **RAG support** | Basic (bring your own vector) | Full pipeline | Built-in vector integration |
| **Agent support** | Via `generateText` + tools | Full agent executor | First-class workflows |
| **Multi-model** | Yes (60+ providers via AI SDK) | Yes (many providers) | Yes (provider-agnostic) |
| **Memory** | Manual | Via `ConversationBufferMemory` | Built-in short/long-term |
| **Observability** | LangSmith, custom | LangSmith, LangFuse | Built-in tracing |
| **Bundle size** | Small (`ai` core ~35KB) | Large (tree-shake needed) | Medium |
| **Maintained by** | Vercel | LangChain Inc. | Mastra Labs |

---

## Vercel AI SDK: Streaming-First, React-Native

Vercel AI SDK (`ai` package) is designed around one core insight: in web apps, **streaming UX is the product**. Every primitive is built to make streaming to the browser trivially easy.

### Setup

```bash
npm install ai @ai-sdk/openai
# or
npm install ai @ai-sdk/anthropic @ai-sdk/google
```

### Basic text generation

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Explain dependency injection in 3 sentences.',
});
```

### Streaming to the UI — the killer feature

```typescript
// app/api/chat/route.ts (Next.js App Router)
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

```tsx
// components/Chat.tsx
'use client';
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

That's a full streaming chat UI in ~25 lines. No custom WebSocket, no manual chunk parsing, no state management — `useChat` handles all of it.

### Tool calling with Zod

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const { text, toolCalls } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    getWeather: tool({
      description: 'Get the weather for a city',
      parameters: z.object({
        city: z.string().describe('City name'),
        unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
      }),
      execute: async ({ city, unit }) => {
        // real API call here
        return { temperature: 22, condition: 'sunny', city, unit };
      },
    }),
  },
  prompt: 'What is the weather in Tokyo?',
  maxSteps: 5,  // allow multi-turn tool use
});
```

### Multi-model with minimal change

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Swap model without changing any other code
const result = await streamText({
  model: anthropic('claude-sonnet-4-6'),  // or google('gemini-2.0-flash')
  messages,
});
```

### When Vercel AI SDK is the right choice

- You're building with Next.js or any React framework
- Streaming UX is a priority (chat, copilots, live generation)
- You want a small, well-typed API surface
- You don't need complex multi-hop chains or persistent memory

---

## LangChain.js: The Swiss Army Knife

LangChain.js is the oldest and most feature-complete framework. Its model is **chains** — composable units that can be linked, branched, and orchestrated into complex pipelines.

### Setup

```bash
npm install langchain @langchain/openai @langchain/core
```

### Basic chain

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({ model: 'gpt-4o' });
const prompt = ChatPromptTemplate.fromTemplate(
  'Summarize this article in bullet points:\n\n{article}'
);
const parser = new StringOutputParser();

const chain = prompt.pipe(model).pipe(parser);

const result = await chain.invoke({ article: '...' });
```

### RAG pipeline — LangChain's strength

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Document } from '@langchain/core/documents';

// 1. Embed documents
const embeddings = new OpenAIEmbeddings();
const vectorStore = await MemoryVectorStore.fromDocuments(
  [
    new Document({ pageContent: 'pnpm uses a content-addressable store...' }),
    new Document({ pageContent: 'Yarn Berry introduces Plug\'n\'Play...' }),
  ],
  embeddings
);

// 2. Build retriever
const retriever = vectorStore.asRetriever({ k: 2 });

// 3. Build QA chain
const model = new ChatOpenAI({ model: 'gpt-4o' });
const prompt = ChatPromptTemplate.fromTemplate(`
Answer based on context only:
<context>{context}</context>
Question: {input}
`);

const documentChain = await createStuffDocumentsChain({ llm: model, prompt });
const retrievalChain = await createRetrievalChain({
  retriever,
  combineDocsChain: documentChain,
});

const { answer } = await retrievalChain.invoke({
  input: 'How does pnpm save disk space?',
});
```

### Agent executor

```typescript
import { createOpenAIFunctionsAgent, AgentExecutor } from 'langchain/agents';
import { ChatOpenAI } from '@langchain/openai';
import { pull } from 'langchain/hub';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

const tools = [new TavilySearchResults({ maxResults: 3 })];
const model = new ChatOpenAI({ model: 'gpt-4o' });
const prompt = await pull<ChatPromptTemplate>('hwchase17/openai-functions-agent');

const agent = await createOpenAIFunctionsAgent({ llm: model, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const result = await executor.invoke({
  input: 'What are the top 3 JavaScript trends in 2026?',
});
```

### Streaming in LangChain

```typescript
const stream = await chain.stream({ article: '...' });

for await (const chunk of stream) {
  process.stdout.write(chunk);
}

// Or with callbacks
const result = await chain.invoke(
  { article: '...' },
  { callbacks: [{ handleLLMNewToken: (token) => console.log(token) }] }
);
```

### When LangChain.js is the right choice

- You need a battle-tested RAG pipeline with vector store integrations
- You're building complex multi-step chains with branches/conditionals
- You need access to LangChain's large ecosystem of integrations (100+ vector stores, loaders, tools)
- You're already using LangSmith for evaluation and observability
- You need cross-language parity with LangChain Python

---

## Mastra: The Agent-First Framework

Mastra is the newest of the three, purpose-built for **agent workflows** with built-in memory, deterministic state machines, and first-class observability.

### Setup

```bash
npm install @mastra/core
```

### Basic agent

```typescript
import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';  // Mastra uses AI SDK models

const mastra = new Mastra();

const researchAgent = new Agent({
  name: 'ResearchAgent',
  instructions: 'You are a technical research assistant.',
  model: openai('gpt-4o'),
});

const { text } = await researchAgent.generate(
  'Summarize the key differences between REST and GraphQL.'
);
```

### Tool calling

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const searchTool = createTool({
  id: 'web-search',
  description: 'Search the web for information',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({
    results: z.array(z.object({ title: z.string(), url: z.string() })),
  }),
  execute: async ({ context: { query } }) => {
    // real search implementation
    return { results: [{ title: 'Result 1', url: 'https://...' }] };
  },
});

const agent = new Agent({
  name: 'SearchAgent',
  instructions: 'Use search to answer questions.',
  model: openai('gpt-4o'),
  tools: { searchTool },
});
```

### Workflows — Mastra's unique feature

Mastra's `Workflow` API is a **deterministic state machine** for multi-step agent pipelines. Unlike LangChain chains (which are functional compositions), Mastra workflows are explicit DAGs with error handling and retry built in:

```typescript
import { Workflow, Step } from '@mastra/core/workflows';
import { z } from 'zod';

const workflow = new Workflow({
  name: 'research-and-summarize',
  triggerSchema: z.object({ topic: z.string() }),
});

const searchStep = new Step({
  id: 'search',
  execute: async ({ context }) => {
    const { topic } = context.triggerData;
    // search for topic
    return { articles: ['article1', 'article2'] };
  },
});

const summarizeStep = new Step({
  id: 'summarize',
  execute: async ({ context }) => {
    const { articles } = context.getStepResult('search');
    // summarize with LLM
    return { summary: 'Combined summary...' };
  },
});

workflow
  .step(searchStep)
  .then(summarizeStep)
  .commit();

const { runId, start } = await workflow.createRun();
const result = await start({ triggerData: { topic: 'AI frameworks 2026' } });
```

### Built-in memory

```typescript
import { Memory } from '@mastra/memory';

const memory = new Memory();  // in-memory by default; swap for Upstash, Redis, etc.

const agent = new Agent({
  name: 'AssistantWithMemory',
  instructions: 'You remember previous conversations.',
  model: openai('gpt-4o'),
  memory,
});

// First turn
await agent.generate('My name is Alex.', { threadId: 'thread-1' });

// Second turn — agent remembers Alex
const { text } = await agent.generate('What is my name?', { threadId: 'thread-1' });
// → "Your name is Alex."
```

### Streaming in Mastra

```typescript
const stream = await agent.stream('Explain quantum entanglement simply.');

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### When Mastra is the right choice

- You're building complex multi-step agent workflows
- You need built-in memory without wiring it up manually
- You want deterministic workflow control (vs. the flexibility/chaos of open-ended LLM agents)
- Observability and tracing matter from day one
- You like Mastra's opinionated project structure and CLI tooling

---

## Code Comparison: RAG Pipeline

Here's the same RAG use case across all three frameworks:

### Vercel AI SDK (manual approach)

```typescript
// No built-in RAG — compose your own
import { generateText, embed } from 'ai';
import { openai } from '@ai-sdk/openai';

async function ragQuery(question: string, documents: string[]) {
  // 1. Embed question
  const { embedding } = await embed({ model: openai.embedding('text-embedding-3-small'), value: question });

  // 2. Retrieve (implement your own vector similarity)
  const relevant = await vectorStore.query(embedding, 3);

  // 3. Generate
  const { text } = await generateText({
    model: openai('gpt-4o'),
    prompt: `Context: ${relevant.join('\n')}\n\nQuestion: ${question}`,
  });
  return text;
}
```

### LangChain.js (built-in pipeline)

```typescript
// Full pipeline in ~15 lines (see above)
const { answer } = await retrievalChain.invoke({ input: question });
```

### Mastra (with RAG integration)

```typescript
import { MastraVector } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';

const vector = new MastraVector({ provider: 'pgvector', connectionString: process.env.DATABASE_URL });

const agent = new Agent({
  name: 'RAGAgent',
  model: openai('gpt-4o'),
  tools: {
    retrieve: createVectorQueryTool({ vectorStoreName: 'docs', topK: 3 }),
  },
});
```

**Winner for RAG**: LangChain.js has the most out-of-the-box support. Mastra is close behind with explicit vector integrations. Vercel AI SDK requires more manual wiring.

---

## Observability Comparison

| | Vercel AI SDK | LangChain.js | Mastra |
|---|---|---|---|
| Built-in tracing | No | LangSmith (hosted) | Yes (local + Mastra Cloud) |
| Token usage | Via response metadata | Via callbacks | Built-in |
| Step-by-step visibility | Manual | LangSmith trace | Workflow step history |
| Cost tracking | Manual | LangSmith | Built-in |

LangSmith is the most mature observability platform, but it's LangChain-specific. Mastra's built-in tracing is compelling for teams that don't want a separate SaaS dependency.

---

## Decision Guide

**Use Vercel AI SDK when:**
- Building with Next.js and streaming chat/copilot UIs
- You want minimal abstraction and maximum control
- Bundle size matters (SSR/edge deployments)
- You're fine composing your own agent/RAG logic

**Use LangChain.js when:**
- You need the largest ecosystem (100+ integrations)
- RAG pipelines are central to your product
- You want LangSmith for evaluation and prompt management
- Your team knows LangChain Python and wants consistency

**Use Mastra when:**
- You're building autonomous agents or multi-step workflows
- Built-in memory is a requirement
- You want deterministic workflow control with state machines
- You value opinionated project structure and built-in tracing

**The 2026 verdict**: Vercel AI SDK for UI-heavy apps, LangChain.js for RAG-heavy pipelines, Mastra for agent-heavy workflows. There's no single winner — the choice depends on your primary use case.

---

## Key Takeaways

- **Vercel AI SDK** excels at streaming UX and multi-model swapping — 25-line streaming chat is its signature achievement
- **LangChain.js** has the deepest RAG and integration ecosystem — if your app is primarily retrieval-augmented, start here
- **Mastra's workflow API** is unique: deterministic state machines for agent pipelines with built-in memory and tracing
- All three support **tool calling with Zod schemas** in 2026 — the DX is converging
- For **multi-model flexibility**, Vercel AI SDK has the best provider abstraction (60+ providers via `@ai-sdk/*` packages)
- Mastra leverages the AI SDK model layer internally — you can mix both in a project

---

*Versions referenced: Vercel AI SDK 4.x, LangChain.js 0.3.x, Mastra 0.6.x. Verify latest APIs at official documentation.*
