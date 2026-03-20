---
title: "How to Build Your First AI Agent: A Step-by-Step Tutorial"
description: "Learn how to build an AI agent from scratch. This step-by-step tutorial covers tool use, memory, planning, and deployment using Claude, GPT-4, and open-source models."
date: "2026-03-19"
author: "DevPlaybook Team"
tags: ["ai", "ai-agents", "tutorial", "claude", "automation", "llm"]
readingTime: "18 min read"
---

AI agents are no longer a research curiosity. They ship production features, automate DevOps pipelines, and run entire customer-support workflows. Yet most tutorials stop at "call an LLM and print the response." This guide goes further. By the end you will have a working Python agent that reasons, uses tools, remembers context across sessions, and can be extended into a multi-agent system.

Whether you are building with Claude, GPT-4, or an open-source model like Llama 3, the patterns are the same. Let's build one from scratch.

## What Is an AI Agent (and How Is It Different from a Chatbot)?

A **chatbot** receives a message and returns a response. The conversation is stateless or lightly stateful, and the model never takes real-world actions.

An **AI agent** closes the loop between thinking and doing. It can:

1. **Perceive** its environment (read files, query APIs, observe logs).
2. **Reason** about what to do next (planning, self-reflection).
3. **Act** on the world (run code, call APIs, write files).
4. **Remember** what happened (short-term scratchpad, long-term storage).

The simplest mental model is a while-loop:

```
while goal is not achieved:
    observe the environment
    think about the next step
    take an action
    record the result
```

If your "AI project" never enters that loop, you have a chatbot. If it does, you have an agent.

### Why Agents Matter Now

Three things converged to make agents practical in 2025-2026:

- **Stronger reasoning models** -- Claude Opus 4, GPT-4.1, and Llama 3 405B can follow multi-step instructions reliably.
- **Tool-use standards** -- The Model Context Protocol (MCP) and OpenAI's function-calling spec give models a structured way to invoke external tools.
- **Cheaper inference** -- Batch APIs and caching make long agent loops affordable.

## Agent Architecture Overview

Every production agent shares four pillars. Think of them as the skeleton you will flesh out with code in the sections that follow.

```
+------------------------------------------------------+
|                    AGENT CORE                         |
|                                                       |
|   +------------+    +------------+    +------------+  |
|   |    LLM     |    |   TOOLS    |    |   MEMORY   |  |
|   | (reasoning)|<-->| (actions)  |<-->| (state)    |  |
|   +------------+    +------------+    +------------+  |
|          |                                  |         |
|          v                                  v         |
|   +----------------------------------------------+   |
|   |              PLANNING / ORCHESTRATION         |   |
|   +----------------------------------------------+   |
+------------------------------------------------------+
         |                          |
         v                          v
   External APIs              User Interface
   Databases                  CLI / Web / Slack
   File System
```

**LLM** -- The reasoning engine. It decides *what* to do and *interprets* tool results.

**Tools** -- Functions the agent can call: web search, code execution, database queries, API calls.

**Memory** -- Short-term (conversation buffer) and long-term (vector store, file-based logs).

**Planning** -- The strategy layer that decomposes goals into steps, re-plans on failure, and knows when to stop.

Let's build each pillar in Python.

## Step 1: Project Setup

Create a clean project structure. We will use the Anthropic SDK for Claude, but every pattern translates to OpenAI or open-source models.

```bash
mkdir ai-agent && cd ai-agent
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install anthropic openai tiktoken rich
```

Directory layout:

```
ai-agent/
  agent/
    __init__.py
    core.py          # main agent loop
    tools.py         # tool definitions
    memory.py        # memory system
    planner.py       # planning logic
  config.py          # API keys, model settings
  main.py            # entry point
```

Create `config.py`:

```python
import os

MODEL = "claude-sonnet-4-20250514"
API_KEY = os.environ["ANTHROPIC_API_KEY"]
MAX_ITERATIONS = 20
VERBOSE = True
```

> **Tip:** Never hard-code API keys. Use environment variables or a secrets manager. For a production-grade config pattern, check our [Fullstack Boilerplate Collection](/products/fullstack-boilerplate-collection) which includes secure credential handling for every major framework.

## Step 2: The Agent Loop

The agent loop is the heartbeat. It sends messages to the LLM, checks whether the model wants to call a tool, executes the tool, feeds the result back, and repeats until the model says it is done.

```python
# agent/core.py
import anthropic
from config import MODEL, API_KEY, MAX_ITERATIONS, VERBOSE
from agent.tools import TOOL_DEFINITIONS, execute_tool
from agent.memory import MemoryStore

client = anthropic.Anthropic(api_key=API_KEY)

SYSTEM_PROMPT = """You are a helpful AI agent. You can use tools to accomplish tasks.
Think step-by-step. When you have completed the user's request, respond
with your final answer without calling any more tools."""


def run_agent(user_message: str, memory: MemoryStore) -> str:
    """Run the agent loop until completion or max iterations."""

    # Load relevant memories
    context = memory.retrieve(user_message, top_k=5)

    messages = []
    if context:
        messages.append({
            "role": "user",
            "content": f"Relevant context from previous sessions:\n{context}"
        })
        messages.append({
            "role": "assistant",
            "content": "Thanks, I'll keep that context in mind."
        })

    messages.append({"role": "user", "content": user_message})

    for iteration in range(MAX_ITERATIONS):
        if VERBOSE:
            print(f"\n--- Iteration {iteration + 1} ---")

        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
        )

        # Check stop reason
        if response.stop_reason == "end_turn":
            final_text = _extract_text(response)
            memory.store(user_message, final_text)
            return final_text

        # Process tool calls
        assistant_content = response.content
        messages.append({"role": "assistant", "content": assistant_content})

        tool_results = []
        for block in assistant_content:
            if block.type == "tool_use":
                if VERBOSE:
                    print(f"  Tool: {block.name}({block.input})")
                result = execute_tool(block.name, block.input)
                if VERBOSE:
                    print(f"  Result: {result[:200]}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        messages.append({"role": "user", "content": tool_results})

    return "Agent reached maximum iterations without completing the task."


def _extract_text(response) -> str:
    return "".join(
        block.text for block in response.content if hasattr(block, "text")
    )
```

### How It Works

1. We inject **long-term memory** at the start of the conversation so the agent has context from previous sessions.
2. Each iteration sends the full conversation to the LLM.
3. If the model returns `stop_reason == "end_turn"`, we have our answer.
4. If the model returns tool-use blocks, we execute each tool and append the results.
5. A hard cap (`MAX_ITERATIONS`) prevents runaway loops -- an essential safety rail.

This is the same loop pattern used by Claude Code, AutoGPT, and every serious agent framework. Master it and everything else is an extension.

## Step 3: Defining and Implementing Tools

Tools are what turn a chatbot into an agent. A tool has three parts: a **schema** (so the LLM knows how to call it), an **implementation** (what actually runs), and a **result format** (what goes back to the LLM).

### Tool Schema

Claude and GPT-4 both accept JSON Schema definitions for tools. Here is a minimal set: a calculator, a web search stub, and a file reader.

```python
# agent/tools.py
import subprocess
import json
import os
import urllib.request
import urllib.parse

TOOL_DEFINITIONS = [
    {
        "name": "calculator",
        "description": "Evaluate a mathematical expression. Use Python syntax.",
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "A Python math expression, e.g. '2 ** 10 + 3'",
                }
            },
            "required": ["expression"],
        },
    },
    {
        "name": "read_file",
        "description": "Read the contents of a file from disk.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Absolute or relative file path.",
                }
            },
            "required": ["path"],
        },
    },
    {
        "name": "write_file",
        "description": "Write content to a file on disk.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path to write to."},
                "content": {"type": "string", "description": "Content to write."},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "run_python",
        "description": "Execute a Python script and return stdout/stderr.",
        "input_schema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "Python code to execute.",
                }
            },
            "required": ["code"],
        },
    },
    {
        "name": "web_search",
        "description": "Search the web and return top results.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query."}
            },
            "required": ["query"],
        },
    },
]


def execute_tool(name: str, inputs: dict) -> str:
    """Dispatch a tool call and return the result as a string."""
    try:
        if name == "calculator":
            # Safe eval for math only
            allowed = {
                "__builtins__": {},
                "abs": abs, "round": round, "min": min, "max": max,
                "pow": pow, "sum": sum,
            }
            import math
            allowed.update(vars(math))
            result = eval(inputs["expression"], allowed)
            return str(result)

        elif name == "read_file":
            with open(inputs["path"], "r", encoding="utf-8") as f:
                content = f.read()
            return content[:10_000]  # Truncate for safety

        elif name == "write_file":
            with open(inputs["path"], "w", encoding="utf-8") as f:
                f.write(inputs["content"])
            return f"Successfully wrote {len(inputs['content'])} chars to {inputs['path']}"

        elif name == "run_python":
            result = subprocess.run(
                ["python", "-c", inputs["code"]],
                capture_output=True, text=True, timeout=30,
                encoding="utf-8", errors="replace",
            )
            output = result.stdout + result.stderr
            return output[:5_000] or "(no output)"

        elif name == "web_search":
            # Stub -- replace with SerpAPI, Brave Search, etc.
            return f"[Search results for '{inputs['query']}' would appear here. Integrate a real search API for production use.]"

        else:
            return f"Unknown tool: {name}"

    except Exception as e:
        return f"Tool error: {type(e).__name__}: {e}"
```

### Tool Design Best Practices

1. **Keep schemas precise.** Vague descriptions lead to wrong calls. Include examples in the description field.
2. **Return strings, not objects.** The LLM consumes text. Serialize results to readable strings.
3. **Truncate large outputs.** A 50 KB file dump wastes context window tokens. Return summaries or the first N characters.
4. **Sandbox execution.** The `run_python` tool above is dangerous in production. Use Docker containers, gVisor, or a managed sandbox like E2B.
5. **Timeouts on everything.** Network calls hang. Subprocess calls hang. Always set timeouts.

> Production agents often need dozens of tools. Our [MCP Studio Complete](/products/mcp-studio-complete) package includes 40+ pre-built MCP tool servers for databases, APIs, file systems, and cloud services -- ready to plug into any agent.

## Step 4: Building a Memory System

Agents without memory repeat mistakes and forget instructions. A practical memory system has two layers:

### Short-Term Memory (Conversation Buffer)

This is the `messages` list in our agent loop. It holds the current session's context and is automatically managed by the loop.

### Long-Term Memory (Persistent Store)

Long-term memory persists across sessions. The simplest production-ready approach uses embedding-based retrieval.

```python
# agent/memory.py
import json
import os
from datetime import datetime
from pathlib import Path

MEMORY_DIR = Path("memory")
MEMORY_FILE = MEMORY_DIR / "memories.jsonl"


class MemoryStore:
    """Simple file-based memory with keyword retrieval.

    For production, replace with a vector database (Chroma, Pinecone,
    Weaviate) and use embeddings for semantic search.
    """

    def __init__(self):
        MEMORY_DIR.mkdir(exist_ok=True)
        if not MEMORY_FILE.exists():
            MEMORY_FILE.touch()

    def store(self, query: str, response: str, metadata: dict = None):
        """Store a memory entry."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "response": response[:2000],  # Truncate long responses
            "metadata": metadata or {},
        }
        with open(MEMORY_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def retrieve(self, query: str, top_k: int = 5) -> str:
        """Retrieve relevant memories using keyword matching.

        In production, use vector similarity:
            embedding = embed(query)
            results = vector_db.query(embedding, top_k=top_k)
        """
        if not MEMORY_FILE.exists():
            return ""

        query_words = set(query.lower().split())
        scored = []

        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                entry = json.loads(line)
                entry_words = set(entry["query"].lower().split())
                overlap = len(query_words & entry_words)
                if overlap > 0:
                    scored.append((overlap, entry))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]

        if not top:
            return ""

        parts = ["## Relevant Memories\n"]
        for score, entry in top:
            parts.append(
                f"- **{entry['timestamp'][:10]}** | Q: {entry['query'][:100]}\n"
                f"  A: {entry['response'][:300]}\n"
            )
        return "\n".join(parts)

    def store_lesson(self, topic: str, lesson: str):
        """Store a reusable lesson learned."""
        self.store(
            query=f"LESSON: {topic}",
            response=lesson,
            metadata={"type": "lesson"},
        )
```

### Upgrading to Vector Search

The keyword matcher above works for prototypes. For production, swap in a vector database:

```python
# Example: Chroma-based memory (install: pip install chromadb)
import chromadb

class VectorMemoryStore:
    def __init__(self, collection_name="agent_memory"):
        self.client = chromadb.PersistentClient(path="./memory/chroma")
        self.collection = self.client.get_or_create_collection(collection_name)
        self._counter = self.collection.count()

    def store(self, query: str, response: str, metadata: dict = None):
        self._counter += 1
        self.collection.add(
            documents=[f"Q: {query}\nA: {response}"],
            ids=[f"mem_{self._counter}"],
            metadatas=[metadata or {}],
        )

    def retrieve(self, query: str, top_k: int = 5) -> str:
        results = self.collection.query(
            query_texts=[query], n_results=top_k
        )
        if not results["documents"][0]:
            return ""
        return "\n\n".join(results["documents"][0])
```

### Memory Architecture Patterns

| Pattern | Best For | Trade-off |
|---|---|---|
| **Conversation buffer** | Single session context | Lost on restart |
| **Summary memory** | Long conversations | Lossy compression |
| **JSONL + keywords** | Prototypes | No semantic understanding |
| **Vector DB** | Production agents | Requires embedding model |
| **Hybrid (vector + structured)** | Complex agents | More infrastructure |

## Step 5: Adding a Planning Layer

Raw tool-calling agents are reactive -- they stumble forward one step at a time. A planning layer lets the agent decompose goals, track progress, and recover from failures.

```python
# agent/planner.py

PLANNING_PROMPT = """Before taking action, create a brief plan.

Format your plan as:
## Plan
1. [First step]
2. [Second step]
...

## Current Step
I will now execute step 1: [description]

After each tool call, update your progress:
- Step 1: DONE / FAILED
- Step 2: IN PROGRESS
- Step 3: TODO

If a step fails, revise the plan before continuing."""


def wrap_with_planning(user_message: str) -> str:
    """Wrap a user message with planning instructions."""
    return f"""{user_message}

{PLANNING_PROMPT}"""
```

Integrate planning into the agent loop by modifying `run_agent`:

```python
from agent.planner import wrap_with_planning

# Inside run_agent, before building messages:
user_message = wrap_with_planning(user_message)
```

### Advanced Planning: ReAct Pattern

The **ReAct** (Reasoning + Acting) pattern interleaves thinking and doing. The model explicitly outputs its reasoning before each action:

```
Thought: I need to find the user's config file first.
Action: read_file(path="~/.config/myapp/config.json")
Observation: {"theme": "dark", "language": "en"}
Thought: The config exists. Now I need to update the language to "fr".
Action: write_file(path="~/.config/myapp/config.json", content=...)
Observation: Successfully wrote 45 chars.
Thought: Done. I'll report the result.
```

You can implement ReAct by adding a `thinking` field to your system prompt or by using Claude's extended thinking feature:

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=16000,
    thinking={
        "type": "enabled",
        "budget_tokens": 10000,
    },
    system=SYSTEM_PROMPT,
    tools=TOOL_DEFINITIONS,
    messages=messages,
)
```

This makes the model's internal reasoning visible and steerable, which is invaluable for debugging agent behavior.

> Writing effective system prompts is an art. Get a head start with our [AI Prompt Engineering Toolkit](/products/ai-prompt-engineering-toolkit) -- it includes battle-tested templates for agent system prompts, ReAct chains, and multi-tool orchestration.

## Step 6: Understanding MCP (Model Context Protocol)

MCP is an open standard (initiated by Anthropic, now widely adopted) that defines how AI models interact with external tools and data sources. Think of it as **USB-C for AI tools** -- a universal plug that any model can connect to.

### Why MCP Matters

Before MCP, every agent framework invented its own tool format. If you wrote a "search database" tool for LangChain, you had to rewrite it for AutoGen, CrewAI, and every other framework. MCP solves this with a standardized protocol.

### MCP Architecture

```
Your Agent  <---->  MCP Client  <---->  MCP Server (tool provider)
                        |
                        +---->  MCP Server (another tool)
                        |
                        +---->  MCP Server (data source)
```

An **MCP Server** exposes tools, resources (data), and prompts through a standard interface. An **MCP Client** (your agent) connects to one or more servers.

### Adding an MCP Server to Your Agent

Here is a minimal MCP server that provides a weather tool:

```python
# mcp_weather_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Weather Service")

@mcp.tool()
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    # In production, call a real weather API
    mock_data = {
        "tokyo": "22C, Sunny",
        "london": "14C, Cloudy",
        "new york": "18C, Partly Cloudy",
    }
    return mock_data.get(city.lower(), f"No data for {city}")

@mcp.resource("weather://cities")
def list_cities() -> str:
    """List available cities."""
    return "tokyo, london, new york"

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

Your agent connects to this server through the MCP client SDK. The model automatically discovers available tools and can call them through the standard tool-use interface.

### MCP in Practice

Production teams use MCP to:

- **Share tools across agents** -- One MCP server for your database, used by coding agents, support agents, and analytics agents.
- **Manage permissions** -- MCP supports scoped access. A junior agent can read data; a senior agent can write.
- **Version tools independently** -- Update a tool server without touching agent code.

For a deep dive into building and deploying MCP servers, including authentication, streaming, and advanced resource management, see our [MCP Studio Complete](/products/mcp-studio-complete) guide.

## Step 7: Putting It All Together

Here is the entry point that ties everything together:

```python
# main.py
from agent.core import run_agent
from agent.memory import MemoryStore
from rich.console import Console

console = Console()
memory = MemoryStore()


def main():
    console.print("[bold green]AI Agent Ready[/bold green]")
    console.print("Type 'quit' to exit, 'memories' to view stored memories.\n")

    while True:
        user_input = console.input("[bold blue]You:[/bold blue] ").strip()

        if not user_input:
            continue
        if user_input.lower() == "quit":
            console.print("[dim]Goodbye![/dim]")
            break
        if user_input.lower() == "memories":
            console.print(memory.retrieve("", top_k=10) or "No memories yet.")
            continue

        console.print("[dim]Agent is thinking...[/dim]")
        result = run_agent(user_input, memory)
        console.print(f"\n[bold green]Agent:[/bold green] {result}\n")


if __name__ == "__main__":
    main()
```

Run it:

```bash
export ANTHROPIC_API_KEY="your-key-here"
python main.py
```

Try asking:

- "Read the file README.md and summarize it"
- "Calculate the compound interest on $10,000 at 5% for 10 years"
- "Write a Python script that generates a random password and save it to password_gen.py"

The agent will plan, call tools, observe results, and iterate until it has an answer.

## Multi-Agent Orchestration Basics

A single agent hits limits when tasks require different expertise or parallel work. Multi-agent systems solve this by giving each agent a specialized role.

### Common Patterns

**1. Manager-Worker**

A manager agent decomposes a task and delegates sub-tasks to worker agents:

```python
class ManagerAgent:
    def __init__(self):
        self.workers = {
            "researcher": Agent(system_prompt="You are a research specialist..."),
            "coder": Agent(system_prompt="You are a senior Python developer..."),
            "reviewer": Agent(system_prompt="You are a code reviewer..."),
        }

    def run(self, task: str) -> str:
        plan = self.plan(task)  # Decompose into sub-tasks

        results = {}
        for step in plan:
            worker = self.workers[step["role"]]
            results[step["id"]] = worker.run(
                step["instruction"],
                context=results,  # Pass previous results
            )

        return self.synthesize(results)
```

**2. Pipeline**

Agents are chained sequentially. The output of one becomes the input of the next:

```
User Request -> Research Agent -> Drafting Agent -> Review Agent -> Final Output
```

**3. Debate / Consensus**

Multiple agents propose solutions, critique each other, and converge:

```python
def debate(question: str, agents: list, rounds: int = 3) -> str:
    proposals = [agent.run(question) for agent in agents]

    for round_num in range(rounds):
        new_proposals = []
        for i, agent in enumerate(agents):
            others = [p for j, p in enumerate(proposals) if j != i]
            critique_prompt = (
                f"Your proposal: {proposals[i]}\n"
                f"Other proposals: {others}\n"
                f"Revise your answer considering the other perspectives."
            )
            new_proposals.append(agent.run(critique_prompt))
        proposals = new_proposals

    # Final synthesis
    return synthesizer.run(
        f"Synthesize these final proposals into one answer: {proposals}"
    )
```

### When to Use Multi-Agent

| Scenario | Single Agent | Multi-Agent |
|---|---|---|
| Simple Q&A | Yes | Overkill |
| Code generation | Yes | Better with reviewer |
| Research + writing | Possible | Much better |
| Complex workflows | Struggles | Necessary |
| Parallel tasks | Sequential only | True parallelism |

The overhead of multi-agent orchestration is real -- more API calls, more complexity, harder debugging. Start with a single agent and add agents only when you hit clear limits.

## Deployment Considerations

Building an agent on your laptop is one thing. Running it in production is another. Here are the key concerns.

### 1. Cost Control

Agent loops can run for many iterations. Each iteration consumes tokens. A runaway agent can burn through your API budget in minutes.

**Mitigations:**

- Set `MAX_ITERATIONS` (we used 20 above).
- Track token usage per session and set hard budget limits.
- Use cheaper models (Claude Haiku, GPT-4o mini) for simple tool-routing and reserve expensive models for complex reasoning.
- Cache repeated tool calls.

### 2. Error Handling and Recovery

Agents fail in novel ways: tools timeout, APIs return errors, the model hallucinates a tool name that does not exist. Build defensive layers:

```python
# Retry with exponential backoff
import time

def robust_tool_call(name, inputs, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = execute_tool(name, inputs)
            if "Tool error" not in result:
                return result
        except Exception as e:
            if attempt == max_retries - 1:
                return f"Tool permanently failed after {max_retries} attempts: {e}"
            time.sleep(2 ** attempt)
    return "Tool failed"
```

### 3. Safety and Sandboxing

An agent that can run arbitrary code or write files is powerful but dangerous. In production:

- **Sandbox code execution** in Docker containers or a cloud sandbox (E2B, Modal).
- **Allowlist tools** per user role. Not every user should trigger `run_python`.
- **Human-in-the-loop** for destructive actions (deleting files, sending emails, making purchases).
- **Audit logging** -- Record every tool call, every LLM response, every decision.

### 4. Observability

You cannot debug what you cannot see. Log:

- Every LLM request and response (with token counts).
- Every tool call and its result.
- Planning decisions and re-planning events.
- Memory retrievals and stores.

Tools like Langfuse, Braintrust, and Arize Phoenix provide agent-specific observability dashboards.

### 5. Latency

Agent loops are inherently slow -- each iteration is a round trip to the LLM API. Reduce latency by:

- **Streaming responses** so the user sees progress.
- **Parallel tool calls** when the model requests multiple tools in one turn.
- **Prompt caching** (supported by Claude and OpenAI) to avoid re-processing the system prompt.

### 6. Testing

Agent behavior is non-deterministic. Traditional unit tests are not enough. Add:

- **Scenario tests** -- Given this input, does the agent eventually produce an acceptable output?
- **Tool call assertions** -- Did the agent call the right tools in a reasonable order?
- **Regression tests** -- Save agent traces and re-run them when you change prompts or tools.
- **Cost tests** -- Does this scenario stay within the token budget?

## Common Mistakes to Avoid

After building dozens of agent systems, these are the traps we see most often:

1. **Too many tools.** More tools means more confusion for the model. Start with 5-10 well-documented tools and add more only when needed.

2. **No iteration limit.** Without `MAX_ITERATIONS`, a confused agent will loop forever, burning money and producing nothing.

3. **Ignoring memory.** An agent that forgets everything between sessions frustrates users. Even a simple JSONL memory file is better than nothing.

4. **Monolithic system prompts.** A 5,000-word system prompt hurts more than it helps. Keep the base prompt short and inject context dynamically from memory and tool results.

5. **Skipping planning.** Reactive agents work for simple tasks but fail spectacularly on multi-step problems. Always include at least a basic planning prompt.

6. **No human oversight.** The best agents know when to ask for help. Build in confidence thresholds and escalation paths.

## Next Steps

You now have a working agent with tools, memory, and planning. Here is where to go next:

1. **Add real tools.** Replace the search stub with Brave Search or SerpAPI. Add a database tool for your specific use case. Explore MCP servers for pre-built integrations.

2. **Upgrade memory.** Install ChromaDB or Pinecone and switch to embedding-based retrieval. This dramatically improves the agent's ability to recall relevant information.

3. **Build a web interface.** Wrap the agent in a FastAPI server and connect a React frontend. Users should not need a terminal to interact with your agent.

4. **Add evaluation.** Set up automated scenario tests. Measure success rate, average iterations, cost per task, and latency.

5. **Go multi-agent.** When a single agent is not enough, add a reviewer agent, a research agent, or a specialized domain expert.

6. **Explore production frameworks.** Once you outgrow your DIY agent, look at LangGraph, CrewAI, or AutoGen for battle-tested orchestration.

For a comprehensive deep-dive into Claude-specific agent patterns, prompt engineering, and advanced tool use, check out our [Claude Code Mastery Guide](/products/claude-code-mastery-guide). It covers everything from basic setup to production multi-agent systems with real-world case studies.

## Resources

### Documentation

- [Anthropic Claude API Docs](https://docs.anthropic.com) -- Official Claude documentation, including tool use and extended thinking.
- [Model Context Protocol Spec](https://modelcontextprotocol.io) -- The MCP specification and SDK documentation.
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling) -- If you are using GPT-4 instead of Claude.

### Tools and Libraries

- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) -- The official Python client for Claude.
- [ChromaDB](https://www.trychroma.com/) -- Open-source embedding database for agent memory.
- [E2B](https://e2b.dev/) -- Cloud sandboxes for safe code execution.
- [Langfuse](https://langfuse.com/) -- Open-source LLM observability.

### DevPlaybook Resources

- [AI Prompt Engineering Toolkit](/products/ai-prompt-engineering-toolkit) -- Production-ready prompt templates for agents, chains, and evaluations.
- [MCP Studio Complete](/products/mcp-studio-complete) -- 40+ pre-built MCP tool servers with authentication, streaming, and deployment configs.
- [Claude Code Mastery Guide](/products/claude-code-mastery-guide) -- From zero to production Claude agents.
- [Fullstack Boilerplate Collection](/products/fullstack-boilerplate-collection) -- Starter templates for agent backends with FastAPI, Next.js, and more.
- [Free Developer Tools](/tools) -- Calculators, converters, and utilities for your development workflow.

---

*This tutorial was written by the DevPlaybook Team. We build guides, tools, and templates that help developers ship AI-powered products faster. If this article helped you, share it with a colleague who is getting started with AI agents.*
