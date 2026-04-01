---
title: "Building AI Agents with Claude API in 2026: Complete Developer Guide"
description: "Practical guide to building autonomous AI agents using Anthropic Claude API. Cover agentic loop design, tool use patterns, multi-agent orchestration, streaming, and cost optimization."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["claude", "ai", "agents", "anthropic", "typescript"]
readingTime: "15 min read"
---

# Building AI Agents with Claude API in 2026: Complete Developer Guide

An AI agent is not a chatbot. A chatbot answers questions. An agent takes actions — it plans, uses tools, observes results, adapts, and keeps going until the task is done.

In 2026, Claude is the most capable model for building production agents. Its extended context window, reliable tool use, and strong reasoning make it uniquely suited for complex multi-step workflows. This guide teaches you how to build real agents using the Anthropic API — from a single-tool loop to orchestrated multi-agent systems.

## What Makes an Agent vs a Simple LLM Call

A simple LLM call is stateless: you send a prompt, you get a response, done. The model has no memory of previous calls and can't take actions in the world.

An agent has:

1. **A goal** — a high-level objective that may take many steps to achieve
2. **Tools** — functions it can call to act on the world (read files, query APIs, run code)
3. **Memory** — context that persists across steps (conversation history, working notes)
4. **A loop** — it keeps running until the goal is met or it decides to stop

The architectural difference is the loop. An LLM call is a single request. An agent is a request inside a `while` loop that terminates on a stop condition.

```typescript
// Simple LLM call — one shot
const response = await claude.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Summarize this document." }],
});

// Agent — runs until stop condition
while (!agent.isComplete()) {
  const response = await agent.step();
  if (response.stop_reason === "end_turn") break;
  if (response.stop_reason === "tool_use") await agent.executeTool(response);
}
```

## The Agentic Loop: Observe → Think → Act

Claude's agentic pattern follows a standard loop:

```
┌─────────────────────────────────────────┐
│                                         │
│  1. OBSERVE — Read current state        │
│     (conversation history, tool results)│
│                                         │
│  2. THINK — Generate next action        │
│     (Claude decides what to do next)    │
│                  │                      │
│     ┌────────────┴──────────────────┐   │
│     │  stop_reason: "end_turn"      │   │
│     │  → Task complete, return      │   │
│     └───────────────────────────────┘   │
│     ┌────────────────────────────────┐  │
│     │  stop_reason: "tool_use"       │  │
│     │  → Execute tool, add result    │  │
│     │    to history, loop back       │  │
│     └────────────────────────────────┘  │
│                                         │
│  3. ACT — Execute tool or return result │
│                                         │
└─────────────────────────────────────────┘
```

When Claude's response has `stop_reason: "tool_use"`, it means Claude wants to call one or more tools. You execute those tools, append the results to the conversation, and send the next request. When `stop_reason: "end_turn"`, Claude is done.

Here's the minimal agentic loop in TypeScript:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface Tool {
  name: string;
  description: string;
  input_schema: object;
  handler: (input: unknown) => Promise<string>;
}

async function runAgent(userMessage: string, tools: Tool[]): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  const toolDefinitions = tools.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema,
  }));

  let iterations = 0;
  const MAX_ITERATIONS = 20; // Safety limit

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      tools: toolDefinitions,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extract final text response
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return text;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const tool = tools.find((t) => t.name === block.name);
        if (!tool) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: Unknown tool "${block.name}"`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = await tool.handler(block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${(err as Error).message}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  throw new Error(`Agent exceeded max iterations (${MAX_ITERATIONS})`);
}
```

## Tool Use / Function Calling with Claude API

Tools are declared in the `tools` array of your API request. Each tool has a name, description, and JSON Schema for its inputs.

```typescript
const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description:
      "Search the web for current information. Use when you need facts you don't have.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        num_results: {
          type: "number",
          description: "Number of results to return (1-10)",
          default: 5,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "run_javascript",
    description:
      "Execute JavaScript code and return the output. Use for calculations and data processing.",
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript code to execute",
        },
      },
      required: ["code"],
    },
  },
];
```

### Tool Choice

Control how Claude uses tools:

```typescript
// Auto (default) — Claude decides when to use tools
tool_choice: { type: "auto" }

// Force Claude to use a specific tool
tool_choice: { type: "tool", name: "web_search" }

// Prevent tool use (text-only response)
tool_choice: { type: "none" }

// Force Claude to use at least one tool
tool_choice: { type: "any" }
```

### Parallel Tool Calls

Claude can call multiple tools in a single response. Your loop needs to handle this:

```typescript
// response.content may contain multiple tool_use blocks
const toolUseBlocks = response.content.filter(
  (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
);

// Execute all tool calls in parallel
const results = await Promise.all(
  toolUseBlocks.map(async (block) => {
    const result = await executeToolCall(block.name, block.input);
    return {
      type: "tool_result" as const,
      tool_use_id: block.id,
      content: result,
    };
  })
);
```

Parallel execution reduces latency significantly when Claude needs multiple independent pieces of information.

## Computer Use API (Beta)

Anthropic's computer use feature lets Claude control a desktop environment — clicking, typing, taking screenshots, and navigating GUIs.

```typescript
const response = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 4096,
  tools: [
    {
      type: "computer_20241022",
      name: "computer",
      display_width_px: 1280,
      display_height_px: 800,
      display_number: 1,
    },
    {
      type: "text_editor_20241022",
      name: "str_replace_editor",
    },
    {
      type: "bash_20241022",
      name: "bash",
    },
  ],
  messages: [
    {
      role: "user",
      content: "Open the terminal and run `npm test`",
    },
  ],
  betas: ["computer-use-2024-10-22"],
});
```

Computer use is best suited for tasks that don't have a programmatic API — legacy software, web scraping with complex JavaScript, GUI testing. It's significantly slower and more expensive than tool-based agents, so use it only when necessary.

| Approach | Speed | Cost | Reliability | Use When |
|----------|-------|------|-------------|----------|
| Tool use | Fast | Low | High | API-accessible actions |
| Computer use | Slow | High | Medium | GUI-only tasks |
| MCP server | Fast | Low | High | Reusable integrations |

## Multi-Agent Orchestration Patterns

Single agents hit limits on complex tasks: long chains of steps exhaust context, parallel workstreams need coordination, and specialized tasks benefit from specialized models.

Multi-agent systems solve this with an **orchestrator + subagent** pattern:

```
┌──────────────────────────────────┐
│         Orchestrator Agent       │
│   (Claude Opus — high reasoning) │
│   - Breaks task into subtasks    │
│   - Delegates to subagents       │
│   - Synthesizes results          │
└────────┬──────────┬──────────────┘
         │          │
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│  Research    │  │  Code Writer │
│  Subagent    │  │  Subagent    │
│ (Claude      │  │ (Claude      │
│  Sonnet)     │  │  Sonnet)     │
└──────────────┘  └──────────────┘
```

### Orchestrator Implementation

```typescript
async function orchestrate(task: string): Promise<string> {
  // Step 1: Orchestrator plans the work
  const plan = await runAgent(
    `You are an orchestrator. Break this task into parallel subtasks:
     Task: ${task}
     Return a JSON array of subtask descriptions.`,
    []
  );

  const subtasks: string[] = JSON.parse(extractJson(plan));

  // Step 2: Run subtasks in parallel with specialized subagents
  const results = await Promise.all(
    subtasks.map((subtask) =>
      runSubagent(subtask, getSubagentTools(subtask))
    )
  );

  // Step 3: Orchestrator synthesizes results
  const synthesis = await runAgent(
    `Synthesize these research results into a final answer:
     Original task: ${task}
     Results: ${results.join("\n---\n")}`,
    []
  );

  return synthesis;
}
```

### Subagent with Specialized Context

```typescript
async function runSubagent(
  task: string,
  tools: Tool[],
  systemPrompt?: string
): Promise<string> {
  const system =
    systemPrompt ??
    `You are a specialized subagent. Complete the given task precisely.
     Be concise. Return structured output when possible.`;

  return runAgent(task, tools, { system });
}
```

### When to Use Multi-Agent vs Single Agent

| Scenario | Use |
|----------|-----|
| Linear task, < 10 steps | Single agent |
| Parallel independent subtasks | Multi-agent |
| Needs specialist knowledge | Multi-agent with specialist system prompts |
| Context window would overflow | Multi-agent with chunking |
| Single well-scoped workflow | Single agent |

## Streaming Responses with Server-Sent Events

For user-facing agents, streaming makes the experience feel responsive. Claude starts emitting text before the full response is ready.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function streamAgent(userMessage: string): Promise<void> {
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: userMessage }],
  });

  // Stream text deltas as they arrive
  stream.on("text", (text) => {
    process.stdout.write(text);
  });

  // Get the full message when streaming completes
  const message = await stream.finalMessage();
  console.log("\n\nFinal stop reason:", message.stop_reason);
}

// For Next.js API routes (streaming to browser)
export async function POST(req: Request) {
  const { message } = await req.json();

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: message }],
  });

  // Convert to Web ReadableStream for the browser
  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(
              new TextEncoder().encode(chunk.delta.text)
            );
          }
        }
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    }
  );
}
```

### Streaming with Tool Use

Streaming and tool use interact in a specific way. Tool input is streamed as it arrives, but you should wait for `tool_use` blocks to complete before executing:

```typescript
const stream = client.messages.stream({
  model: "claude-opus-4-5",
  max_tokens: 4096,
  tools: myTools,
  messages,
});

// Stream text to the user in real time
stream.on("text", (text) => process.stdout.write(text));

// Wait for the complete message to handle tool calls
const message = await stream.finalMessage();
if (message.stop_reason === "tool_use") {
  await handleToolCalls(message);
}
```

## Error Handling and Retry Strategies

Claude API errors fall into two categories: transient (retry) and permanent (fix your code).

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function callWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxRetries = 3
): Promise<Anthropic.Message> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastError = err as Error;

      if (err instanceof Anthropic.RateLimitError) {
        // Exponential backoff for rate limits
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        console.warn(`Rate limited. Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      if (err instanceof Anthropic.APIConnectionError) {
        // Network errors — retry with backoff
        await sleep(1000 * (attempt + 1));
        continue;
      }

      if (err instanceof Anthropic.InternalServerError) {
        // 5xx errors — retry with longer backoff
        await sleep(5000 * (attempt + 1));
        continue;
      }

      // Non-retryable errors (4xx except rate limits)
      throw err;
    }
  }

  throw new Error(`Max retries exceeded: ${lastError?.message}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Agent-Level Error Handling

Beyond API errors, agents encounter logic errors — tools failing, invalid outputs, infinite loops:

```typescript
async function runResilientAgent(
  userMessage: string,
  tools: Tool[]
): Promise<string> {
  try {
    return await runAgent(userMessage, tools);
  } catch (err) {
    if (err instanceof MaxIterationsError) {
      // Agent didn't finish — summarize what was accomplished
      return await runAgent(
        `The previous agent run timed out. Summarize progress and next steps.`,
        []
      );
    }

    if (err instanceof ToolExecutionError) {
      // A tool failed — try alternative approach
      const fallbackTools = tools.filter((t) => t.name !== err.toolName);
      return await runAgent(
        `${userMessage}\n\nNote: ${err.toolName} is unavailable. Use alternatives.`,
        fallbackTools
      );
    }

    throw err;
  }
}
```

## Model Routing: Haiku vs Sonnet vs Opus

Anthropic offers three tiers in 2026, each with different capability/cost tradeoffs:

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| Claude Haiku | Fastest | Lowest | Classification, extraction, simple Q&A |
| Claude Sonnet | Balanced | Medium | Most agent tasks, code generation, analysis |
| Claude Opus | Slowest | Highest | Complex reasoning, orchestration, long plans |

Route intelligently to minimize cost without sacrificing quality:

```typescript
type TaskComplexity = "simple" | "standard" | "complex";

function selectModel(complexity: TaskComplexity): string {
  const models: Record<TaskComplexity, string> = {
    simple: "claude-haiku-4-5",
    standard: "claude-sonnet-4-5",
    complex: "claude-opus-4-5",
  };
  return models[complexity];
}

async function routedAgent(task: string, tools: Tool[]): Promise<string> {
  // Use a cheap, fast model to classify the task first
  const classificationResponse = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `Classify this task as "simple", "standard", or "complex":
          - simple: single lookup, summarization, format conversion
          - standard: multi-step reasoning, code generation, analysis
          - complex: long-horizon planning, architecture decisions, ambiguous problems

          Task: ${task}

          Reply with only one word: simple, standard, or complex.`,
      },
    ],
  });

  const complexity = (
    classificationResponse.content[0] as Anthropic.TextBlock
  ).text
    .trim()
    .toLowerCase() as TaskComplexity;

  const model = selectModel(complexity);
  console.log(`Routing to ${model} (complexity: ${complexity})`);

  return runAgent(task, tools, { model });
}
```

### Real-World Routing Heuristics

```typescript
function estimateComplexity(task: string, tools: Tool[]): TaskComplexity {
  // Long tasks with many tools → complex
  if (task.length > 1000 && tools.length > 5) return "complex";

  // Multi-step keywords → standard or complex
  const complexKeywords = ["architect", "design", "plan", "strategy", "refactor"];
  const standardKeywords = ["analyze", "generate", "write", "implement", "debug"];

  if (complexKeywords.some((k) => task.toLowerCase().includes(k))) return "complex";
  if (standardKeywords.some((k) => task.toLowerCase().includes(k))) return "standard";

  return "simple";
}
```

## Rate Limiting and Cost Optimization

### Token Budgeting

Track token usage across your agent runs:

```typescript
interface AgentStats {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  iterations: number;
}

async function runAgentWithStats(
  userMessage: string,
  tools: Tool[]
): Promise<{ result: string; stats: AgentStats }> {
  const stats: AgentStats = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    iterations: 0,
  };

  // ... run agent loop, accumulate usage from each response
  // response.usage.input_tokens, response.usage.output_tokens
  // response.usage.cache_read_input_tokens (with prompt caching)

  return { result, stats };
}
```

### Prompt Caching

For agents with large system prompts or static context, enable prompt caching to reduce input token costs by up to 90%:

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  system: [
    {
      type: "text",
      text: LARGE_SYSTEM_PROMPT, // e.g., 50k token documentation
      cache_control: { type: "ephemeral" }, // Cache this block
    },
  ],
  messages,
});
```

Cached tokens cost ~10% of regular input tokens. For agents that process the same context repeatedly, this alone can cut API costs by 60-80%.

### Context Window Management

Long agent runs accumulate conversation history. Prune aggressively:

```typescript
function pruneHistory(
  messages: Anthropic.MessageParam[],
  maxTokens = 50000
): Anthropic.MessageParam[] {
  // Keep system context and recent messages
  // Summarize old tool results that are no longer relevant

  const estimatedTokens = messages.reduce(
    (sum, m) => sum + estimateTokens(m),
    0
  );

  if (estimatedTokens <= maxTokens) return messages;

  // Summarize middle messages, keep first 2 and last 10
  const head = messages.slice(0, 2);
  const tail = messages.slice(-10);
  const middle = messages.slice(2, -10);

  const summary = `[${middle.length} earlier messages summarized: ${summarizeMessages(middle)}]`;

  return [
    ...head,
    { role: "user", content: summary },
    { role: "assistant", content: "Understood, continuing from context." },
    ...tail,
  ];
}
```

## Real Code: Complete Research Agent

Here's a complete, production-ready research agent that searches the web, reads pages, and synthesizes findings:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const researchTools: Anthropic.Tool[] = [
  {
    name: "search_web",
    description:
      "Search the web for current information. Returns titles, URLs, and snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        num_results: {
          type: "number",
          description: "Results to return (1-10)",
          default: 5,
        },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_url",
    description: "Fetch the text content of a URL.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
      },
      required: ["url"],
    },
  },
  {
    name: "save_note",
    description: "Save a research note for later synthesis.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        source: { type: "string", description: "URL or source name" },
      },
      required: ["title", "content"],
    },
  },
];

const RESEARCH_SYSTEM = `You are a thorough research agent. For any research task:
1. Search broadly first to understand the landscape
2. Identify 3-5 most authoritative sources
3. Fetch and read those sources in detail
4. Save key findings with save_note
5. Synthesize a comprehensive answer with citations

Be systematic. Don't stop after one search.`;

async function researchAgent(question: string): Promise<string> {
  const notes: { title: string; content: string; source?: string }[] = [];

  const tools = [
    ...researchTools.map((t) => ({ ...t })),
    // Inject notes context into tool handlers
  ];

  const toolHandlers: Record<string, (input: unknown) => Promise<string>> = {
    search_web: async (input) => {
      const { query, num_results = 5 } = input as {
        query: string;
        num_results?: number;
      };
      // Call your search API here
      return JSON.stringify(await searchWeb(query, num_results));
    },
    fetch_url: async (input) => {
      const { url } = input as { url: string };
      return await fetchPage(url);
    },
    save_note: async (input) => {
      const note = input as { title: string; content: string; source?: string };
      notes.push(note);
      return `Note saved: "${note.title}"`;
    },
  };

  return runAgent(question, researchTools, toolHandlers, {
    system: RESEARCH_SYSTEM,
    model: "claude-opus-4-5",
  });
}
```

## Testing Your Agent

Agents are harder to unit test than pure functions. Focus on:

**Determinism** — use `temperature: 0` in tests for reproducible tool call sequences.

**Tool mocking** — mock external tools to test the agent's decision-making without side effects.

**Scenario testing** — write end-to-end tests for complete scenarios with expected outcomes.

```typescript
describe("Research Agent", () => {
  it("searches and synthesizes for factual questions", async () => {
    const mockSearch = vi.fn().mockResolvedValue([
      { title: "Test Result", url: "https://example.com", snippet: "..." },
    ]);

    const result = await researchAgent("What is MCP?", {
      tools: { search_web: mockSearch },
      model: "claude-haiku-4-5", // Use cheaper model for tests
      temperature: 0,
    });

    expect(mockSearch).toHaveBeenCalled();
    expect(result).toContain("Model Context Protocol");
  }, 30000); // Agents take time — set generous timeouts
});
```

## What to Build with Claude Agents

With a solid agentic loop in place, the applications are broad:

- **Code review agent** — reads PRs, checks style, flags security issues
- **Content research agent** — researches topics, finds sources, drafts outlines
- **Data pipeline agent** — fetches, cleans, transforms, and loads data
- **Customer support agent** — reads tickets, searches KB, drafts responses
- **DevOps agent** — monitors logs, diagnoses issues, runs remediation scripts

For reusable external integrations, combine your agent with an MCP server — that way the same tools work in Claude Desktop, Claude Code CLI, and your custom application.

The ecosystem around Claude agent development is maturing rapidly. The patterns in this guide are stable; the tooling keeps improving. Build something that creates real value, instrument it carefully, and iterate.

---

For more TypeScript tooling to accelerate your agent development, check the [DevPlaybook tools directory](/tools) — there are validators, playground environments, and schema generators that save hours of boilerplate.
