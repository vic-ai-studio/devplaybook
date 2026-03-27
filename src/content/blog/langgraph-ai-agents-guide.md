---
title: "LangGraph AI Agents: A Complete Guide to Building Stateful Agent Systems"
description: "Learn how to build production-ready stateful AI agents with LangGraph. Covers state management, multi-agent workflows, human-in-the-loop, and real-world patterns."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["ai", "langchain", "agents", "python"]
readingTime: "14 min read"
---

Most AI agent tutorials show you how to make an agent call a tool. That part is easy. The hard part is what happens when an agent needs to remember what it decided three steps ago, loop back when a tool fails, or pause and ask a human for input before continuing.

LangGraph was built specifically for this — stateful, cyclical agent workflows where control flow matters. This guide shows you how it actually works, with code you can run today.

---

## Why LangGraph Exists

LangChain's original approach to agents used `AgentExecutor`: a linear think-act-observe loop. It worked for simple tools but struggled when agents needed:

- **Persistent state** across multiple steps
- **Branching logic** based on intermediate results
- **Human approval gates** before sensitive actions
- **Multi-agent coordination** where agents hand off to each other
- **Fault tolerance** with retry and recovery logic

LangGraph solves this by modeling agents as graphs — nodes do work, edges define transitions, and state flows between them. If you've worked with state machines or workflow engines, the concepts will feel familiar.

---

## Core Concepts

### Nodes

Nodes are Python functions that receive state and return updated state. Each node does one thing: call an LLM, execute a tool, validate output, or route to the next step.

```python
def call_llm(state: AgentState) -> AgentState:
    messages = state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}
```

### Edges

Edges define how nodes connect. There are two types:

- **Normal edges**: always go from node A to node B
- **Conditional edges**: check state and route to different nodes based on the result

```python
def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "end"
```

### State

State is a TypedDict (or Pydantic model) that flows through the graph. Every node reads from it and writes to it. LangGraph merges state updates automatically.

```python
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    tool_results: list
    iteration_count: int
```

---

## Building Your First LangGraph Agent

Let's build a research agent that searches the web, processes results, and generates a summary.

### Setup

```bash
pip install langgraph langchain-openai langchain-community
```

### Define the State and Tools

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

class ResearchState(TypedDict):
    messages: Annotated[list, add_messages]
    research_topic: str
    search_results: list[str]
    final_summary: str

@tool
def web_search(query: str) -> str:
    """Search the web for information about a topic."""
    # Replace with actual search implementation
    return f"Search results for: {query}"

@tool
def extract_key_facts(text: str) -> str:
    """Extract key facts from a block of text."""
    return f"Key facts extracted from: {text[:100]}..."

tools = [web_search, extract_key_facts]
llm = ChatOpenAI(model="gpt-4o").bind_tools(tools)
```

### Define Nodes

```python
def research_agent(state: ResearchState) -> ResearchState:
    """Main agent node: decides what to do next."""
    messages = state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}

def summarize(state: ResearchState) -> ResearchState:
    """Generate final summary from collected information."""
    from langchain_openai import ChatOpenAI
    summarizer = ChatOpenAI(model="gpt-4o")

    prompt = f"""Based on the conversation history, write a comprehensive summary about: {state['research_topic']}

    Keep it concise but complete."""

    response = summarizer.invoke([{"role": "user", "content": prompt}])
    return {"final_summary": response.content}

tool_node = ToolNode(tools)
```

### Define Routing Logic

```python
def should_use_tools(state: ResearchState) -> str:
    """Route to tools, summarize, or end."""
    last_message = state["messages"][-1]

    # If the LLM called tools, execute them
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    # If we have enough context, summarize
    if len(state["messages"]) > 6:
        return "summarize"

    return "agent"  # Continue researching
```

### Build and Compile the Graph

```python
from langgraph.graph import StateGraph, END

workflow = StateGraph(ResearchState)

# Add nodes
workflow.add_node("agent", research_agent)
workflow.add_node("tools", tool_node)
workflow.add_node("summarize", summarize)

# Set entry point
workflow.set_entry_point("agent")

# Add edges
workflow.add_conditional_edges(
    "agent",
    should_use_tools,
    {
        "tools": "tools",
        "summarize": "summarize",
        "agent": "agent"
    }
)

workflow.add_edge("tools", "agent")  # After tools, go back to agent
workflow.add_edge("summarize", END)  # Summary is the final step

# Compile
app = workflow.compile()
```

### Run the Agent

```python
initial_state = {
    "messages": [
        {"role": "user", "content": "Research the latest developments in quantum computing and their practical applications"}
    ],
    "research_topic": "quantum computing developments 2026",
    "search_results": [],
    "final_summary": ""
}

result = app.invoke(initial_state)
print(result["final_summary"])
```

---

## Human-in-the-Loop: Pause for Approval

One of LangGraph's most valuable features is the ability to pause execution and wait for human input. This is essential for agents that take irreversible actions (sending emails, modifying databases, making purchases).

### Using Breakpoints

```python
from langgraph.checkpoint.memory import MemorySaver

# Add a checkpointer to enable interrupts
memory = MemorySaver()
app = workflow.compile(
    checkpointer=memory,
    interrupt_before=["tools"]  # Pause before executing any tool
)

# First execution — will pause before tools
config = {"configurable": {"thread_id": "research-session-1"}}
result = app.invoke(initial_state, config=config)

# Check what tool the agent wants to call
current_state = app.get_state(config)
print("Agent wants to call:", current_state.next)

# Human reviews and approves — resume execution
result = app.invoke(None, config=config)
```

### Dynamic Approval Nodes

For more control, add an explicit approval node:

```python
def human_approval(state: ResearchState) -> ResearchState:
    """
    This node pauses and waits for human input.
    In practice, you'd integrate this with your UI or notification system.
    """
    # The graph will pause here when interrupted
    # When resumed, execution continues from this point
    print(f"Pending approval for action on: {state['research_topic']}")
    return state  # Pass through unchanged

workflow.add_node("human_approval", human_approval)
workflow.add_edge("human_approval", "tools")
```

---

## Multi-Agent Workflows

LangGraph shines for multi-agent systems where specialized agents hand off to each other.

### Supervisor Pattern

A common pattern is a supervisor agent that routes work to specialized sub-agents:

```python
from langchain_core.messages import HumanMessage
from typing import Literal

members = ["researcher", "coder", "writer"]

def supervisor(state):
    """Decides which agent should act next."""
    system_prompt = f"""You are a supervisor managing these workers: {members}.

    Given the conversation history, decide who should act next.
    Respond with the worker name or 'FINISH' if the task is complete."""

    llm = ChatOpenAI(model="gpt-4o")
    response = llm.invoke([
        {"role": "system", "content": system_prompt},
        *state["messages"]
    ])

    # Parse which worker to route to
    next_worker = response.content.strip()
    return {"next": next_worker}

def researcher_agent(state):
    """Specialized agent for research tasks."""
    research_llm = ChatOpenAI(model="gpt-4o").bind_tools([web_search])
    response = research_llm.invoke(state["messages"])
    return {"messages": [response]}

def coder_agent(state):
    """Specialized agent for writing code."""
    coder_llm = ChatOpenAI(model="gpt-4o")
    coding_prompt = "You are an expert programmer. Write clean, well-documented code."
    messages = [{"role": "system", "content": coding_prompt}] + state["messages"]
    response = coder_llm.invoke(messages)
    return {"messages": [response]}

# Build the supervisor graph
class TeamState(TypedDict):
    messages: Annotated[list, add_messages]
    next: str

team_graph = StateGraph(TeamState)
team_graph.add_node("supervisor", supervisor)
team_graph.add_node("researcher", researcher_agent)
team_graph.add_node("coder", coder_agent)

team_graph.set_entry_point("supervisor")

# Supervisor routes to workers
team_graph.add_conditional_edges(
    "supervisor",
    lambda state: state["next"],
    {
        "researcher": "researcher",
        "coder": "coder",
        "FINISH": END
    }
)

# Workers always report back to supervisor
team_graph.add_edge("researcher", "supervisor")
team_graph.add_edge("coder", "supervisor")

team_app = team_graph.compile()
```

---

## Persistent State with Checkpointing

For production agents, you need state that persists across sessions. LangGraph supports multiple checkpoint backends:

```python
# In-memory (development only)
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()

# SQLite (simple production setup)
from langgraph.checkpoint.sqlite import SqliteSaver
sqlite = SqliteSaver.from_conn_string("./agent_state.db")

# PostgreSQL (production scale)
from langgraph.checkpoint.postgres import PostgresSaver
postgres = PostgresSaver.from_conn_string(
    "postgresql://user:password@host:5432/dbname"
)

# Compile with checkpointer
app = workflow.compile(checkpointer=postgres)

# Each thread_id maintains independent state
config = {"configurable": {"thread_id": "user-123-session-1"}}
result = app.invoke(initial_state, config=config)

# Resume the same thread later (state is preserved)
follow_up = {"messages": [{"role": "user", "content": "What did you find?"}]}
result = app.invoke(follow_up, config=config)
```

---

## Error Handling and Retry Logic

Production agents need to handle tool failures gracefully:

```python
import functools
from langchain_core.messages import ToolMessage

def with_retry(node_fn, max_retries=3):
    """Wrap a node function with retry logic."""
    @functools.wraps(node_fn)
    def wrapper(state):
        retries = state.get("retry_count", 0)

        try:
            return node_fn(state)
        except Exception as e:
            if retries < max_retries:
                error_message = ToolMessage(
                    content=f"Error: {str(e)}. Retrying...",
                    tool_call_id="retry"
                )
                return {
                    "messages": [error_message],
                    "retry_count": retries + 1
                }
            else:
                # Max retries reached, route to error handler
                return {"error": str(e), "failed": True}

    return wrapper

# Wrap your nodes
safe_tool_node = with_retry(tool_node)

# Add error handling in routing
def route_with_error_check(state) -> str:
    if state.get("failed"):
        return "error_handler"
    return should_use_tools(state)
```

---

## Streaming Agent Outputs

For UI applications, you want to stream agent output as it's generated:

```python
async def stream_agent():
    async for event in app.astream_events(
        initial_state,
        config={"configurable": {"thread_id": "stream-1"}},
        version="v1"
    ):
        kind = event["event"]

        if kind == "on_chat_model_stream":
            # Streaming LLM tokens
            content = event["data"]["chunk"].content
            if content:
                print(content, end="", flush=True)

        elif kind == "on_tool_start":
            # Tool execution started
            print(f"\n🔧 Using tool: {event['name']}")

        elif kind == "on_tool_end":
            # Tool finished
            print(f"✅ Tool completed")

import asyncio
asyncio.run(stream_agent())
```

---

## Production Patterns and Best Practices

### Keep Nodes Small and Focused

Each node should do exactly one thing. Debugging a failing agent is much easier when nodes are small — you can trace exactly which step failed.

**Bad:**
```python
def do_everything(state):
    # Search, extract, summarize, and format all in one node
    ...
```

**Good:**
```python
def search(state): ...
def extract(state): ...
def summarize(state): ...
def format_output(state): ...
```

### Use Pydantic for State Validation

```python
from pydantic import BaseModel, Field
from typing import Optional

class AgentState(BaseModel):
    messages: list = Field(default_factory=list)
    research_topic: str
    iteration_count: int = 0
    max_iterations: int = 10
    final_result: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
```

### Add Iteration Guards

Without iteration limits, agents can loop indefinitely:

```python
def should_continue(state: AgentState) -> str:
    # Hard stop if we've iterated too many times
    if state.get("iteration_count", 0) >= state.get("max_iterations", 10):
        return "force_end"

    # Normal routing logic
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"

    return "end"
```

### Structured Logging for Observability

```python
import logging
import json

logger = logging.getLogger("langgraph_agent")

def log_node_execution(node_name: str):
    """Decorator to log node inputs/outputs."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(state):
            logger.info(json.dumps({
                "event": "node_start",
                "node": node_name,
                "message_count": len(state.get("messages", []))
            }))
            result = fn(state)
            logger.info(json.dumps({
                "event": "node_end",
                "node": node_name
            }))
            return result
        return wrapper
    return decorator

@log_node_execution("research_agent")
def research_agent(state):
    ...
```

---

## When to Use LangGraph

LangGraph is the right tool when:

- Your agent needs to **loop** — retry on failure, iterate until conditions are met
- Your workflow has **branching logic** — different paths based on intermediate results
- You need **human checkpoints** — pause for approval before irreversible actions
- You're building **multi-agent systems** — agents handing off to specialized sub-agents
- You need **persistence** — resuming conversations or workflows across sessions

Simpler alternatives (like calling an LLM with tools directly) are fine when:

- The workflow is linear and predictable
- State management is trivial
- You don't need persistence or human-in-the-loop

---

## LangGraph vs. Alternatives in 2026

| Feature | LangGraph | CrewAI | AutoGen | LlamaIndex Workflows |
|---------|-----------|--------|---------|---------------------|
| State management | Explicit, typed | Implicit | Implicit | Explicit |
| Human-in-loop | First-class | Limited | Supported | Limited |
| Multi-agent | Full support | Core feature | Core feature | Moderate |
| Persistence | Multiple backends | Limited | Limited | Limited |
| Streaming | Yes | Limited | Limited | Yes |
| Learning curve | Medium | Low | Medium | Medium |

LangGraph's explicit graph model makes it more complex to get started but dramatically easier to debug and reason about in production.

---

## Getting Started Today

The fastest path to understanding LangGraph:

1. Install: `pip install langgraph langchain-openai`
2. Start with the basic ReAct agent — one LLM node, one tool node, one conditional edge
3. Add checkpointing with `MemorySaver` to understand state persistence
4. Add a `interrupt_before` on your tool node to see human-in-the-loop in action
5. Once comfortable, build a supervisor pattern with 2-3 specialized agents

LangGraph has excellent documentation with working examples for each of these patterns at [python.langchain.com/docs/langgraph](https://python.langchain.com/docs/langgraph).

The mental shift from "calling an LLM" to "designing a graph" takes a few hours. After that, you'll find it the most natural way to think about any non-trivial agent workflow.

---

*Building developer tools? Check out [DevPlaybook's free tools](https://devplaybook.cc) — JSON formatters, JWT decoders, regex testers, and more, all browser-based with no sign-up required.*
