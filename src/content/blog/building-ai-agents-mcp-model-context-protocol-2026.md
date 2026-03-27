---
title: "Building AI Agents with MCP (Model Context Protocol) 2026: A Practical Guide"
description: "Step-by-step guide to building AI agents using MCP (Model Context Protocol). Covers MCP server and client architecture, tool calling, resource providers, real-world integrations, and production patterns."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["mcp", "ai-agents", "model-context-protocol", "anthropic", "claude", "llm", "tool-calling", "python"]
readingTime: "16 min read"
---

MCP (Model Context Protocol) has shifted from interesting spec to production infrastructure in 2026. Major AI tools — Claude Desktop, Cursor, Windsurf, Zed, and dozens of third-party integrations — all speak MCP. If you want your AI agent to interact with real systems, you'll build MCP servers.

This guide goes beyond explaining what MCP is. It shows you how to **build** with it: a working MCP server, client integration, tool calling patterns, and the architectural decisions that matter in production.

---

## What MCP Solves

Before MCP, every AI integration was bespoke. You'd write a custom tool definition for Claude, a different format for GPT, and custom middleware to handle results. When you swapped models or tools, you rewrote integrations.

MCP standardizes the interface between AI models and external capabilities:

```
┌─────────────┐     MCP Protocol     ┌─────────────────┐
│   AI Client  │ ←─────────────────→ │   MCP Server     │
│ (Claude,     │    JSON-RPC 2.0     │ (your tools,     │
│  Cursor, etc)│                     │  your data)      │
└─────────────┘                      └─────────────────┘
```

Write an MCP server once. Any MCP-compatible AI client can use it without modification.

---

## MCP Architecture Fundamentals

### The Three Primitives

MCP servers expose three types of capabilities:

1. **Tools** — Functions the AI can call (read a file, query a database, call an API)
2. **Resources** — Data the AI can read (documents, database records, live data feeds)
3. **Prompts** — Pre-built prompt templates with dynamic arguments

Most AI agent use cases primarily use **tools**. Resources are valuable for RAG pipelines. Prompts are useful for standardizing complex multi-step tasks.

### Transport Mechanisms

MCP supports two transport mechanisms:

- **stdio** — Server runs as a subprocess, communicates via stdin/stdout. Simple, no network overhead. Best for local tools.
- **HTTP with SSE** — Server runs as a web service, uses Server-Sent Events for streaming. Better for remote or shared servers.

For most agent use cases, start with stdio. Migrate to HTTP when you need multi-user access or remote deployment.

---

## Building Your First MCP Server

### Setup

```bash
# Python SDK (official)
pip install mcp

# Or with uv (recommended)
uv add mcp
```

### A Minimal MCP Server

```python
# server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
import asyncio

app = Server("my-agent-tools")

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="get_weather",
            description="Get current weather for a location",
            inputSchema={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name or coordinates"
                    }
                },
                "required": ["location"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "get_weather":
        location = arguments["location"]
        # Real implementation would call a weather API
        return [types.TextContent(
            type="text",
            text=f"Current weather in {location}: 22°C, partly cloudy"
        )]
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

This is a complete, working MCP server. It declares one tool and handles calls to it.

---

## Building a Production-Grade MCP Server

A real agent tool server needs more: error handling, typed inputs, multiple tools, and external integrations. Here's a practical example — a code analysis server:

```python
# code_analysis_server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types
from pathlib import Path
import asyncio
import ast
import json

app = Server("code-analysis")

def analyze_python_file(filepath: str) -> dict:
    """Extract structure from a Python file."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {filepath}")
    if not path.suffix == '.py':
        raise ValueError(f"Expected .py file, got: {path.suffix}")

    source = path.read_text()
    tree = ast.parse(source)

    functions = [
        node.name for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef)
    ]
    classes = [
        node.name for node in ast.walk(tree)
        if isinstance(node, ast.ClassDef)
    ]
    imports = [
        ast.unparse(node) for node in ast.walk(tree)
        if isinstance(node, (ast.Import, ast.ImportFrom))
    ]

    return {
        "file": filepath,
        "lines": len(source.splitlines()),
        "functions": functions,
        "classes": classes,
        "imports": imports
    }

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="analyze_file",
            description="Analyze a Python file and return its structure (functions, classes, imports)",
            inputSchema={
                "type": "object",
                "properties": {
                    "filepath": {
                        "type": "string",
                        "description": "Absolute or relative path to the Python file"
                    }
                },
                "required": ["filepath"]
            }
        ),
        types.Tool(
            name="list_python_files",
            description="List all Python files in a directory",
            inputSchema={
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory path to search"
                    },
                    "recursive": {
                        "type": "boolean",
                        "description": "Search recursively (default: false)",
                        "default": False
                    }
                },
                "required": ["directory"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent | types.ImageContent]:
    try:
        if name == "analyze_file":
            result = analyze_python_file(arguments["filepath"])
            return [types.TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]

        elif name == "list_python_files":
            directory = Path(arguments["directory"])
            recursive = arguments.get("recursive", False)

            if not directory.exists():
                raise FileNotFoundError(f"Directory not found: {directory}")

            pattern = "**/*.py" if recursive else "*.py"
            files = [str(f) for f in directory.glob(pattern)]

            return [types.TextContent(
                type="text",
                text=json.dumps({"directory": str(directory), "files": files}, indent=2)
            )]

        raise ValueError(f"Unknown tool: {name}")

    except (FileNotFoundError, ValueError) as e:
        # Return error as tool result (not exception) — let the AI handle it
        return [types.TextContent(type="text", text=f"Error: {e}")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

Key patterns here:
- **Catch errors and return them as tool results** — don't let exceptions propagate; give the AI something to reason about
- **Typed input schemas** — the AI uses these to generate correct arguments
- **Descriptive tool names and descriptions** — the AI uses these to decide when to call your tool

---

## Connecting to Claude Desktop

Register your MCP server in Claude Desktop's config:

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "code-analysis": {
      "command": "python",
      "args": ["/path/to/code_analysis_server.py"],
      "env": {
        "PYTHONPATH": "/path/to/your/project"
      }
    }
  }
}
```

After restarting Claude Desktop, your tools appear in the interface. Claude can now call `analyze_file` and `list_python_files` in any conversation.

---

## MCP Resources: Feeding Context to Agents

Resources let your MCP server expose data that the AI can read — documentation, database records, live dashboards:

```python
@app.list_resources()
async def list_resources() -> list[types.Resource]:
    return [
        types.Resource(
            uri="file:///project/README.md",
            name="Project README",
            description="Main project documentation",
            mimeType="text/markdown"
        ),
        types.Resource(
            uri="db://users/schema",
            name="User Database Schema",
            description="Current database schema for the users table",
            mimeType="application/json"
        )
    ]

@app.read_resource()
async def read_resource(uri: str) -> str:
    if uri == "file:///project/README.md":
        return Path("/project/README.md").read_text()

    elif uri == "db://users/schema":
        # Query your actual database
        schema = await get_db_schema("users")
        return json.dumps(schema)

    raise ValueError(f"Unknown resource: {uri}")
```

Resources are ideal for:
- Documentation files that should inform AI responses
- Live system state (API quotas, queue depths, error logs)
- Database schemas for code generation

---

## Real-World Integration Patterns

### Pattern 1: Database Query Tool

```python
import asyncpg

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [types.Tool(
        name="query_database",
        description="Run a read-only SQL query against the production database",
        inputSchema={
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "SELECT query to execute (read-only)"
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum rows to return (default: 100, max: 1000)"
                }
            },
            "required": ["sql"]
        }
    )]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "query_database":
        sql = arguments["sql"]
        limit = min(arguments.get("limit", 100), 1000)

        # Validate: only allow SELECT
        if not sql.strip().upper().startswith("SELECT"):
            return [types.TextContent(type="text", text="Error: Only SELECT queries are allowed")]

        # Add LIMIT if not present
        if "LIMIT" not in sql.upper():
            sql = f"{sql} LIMIT {limit}"

        conn = await asyncpg.connect(DATABASE_URL)
        try:
            rows = await conn.fetch(sql)
            result = [dict(row) for row in rows]
            return [types.TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
        finally:
            await conn.close()
```

### Pattern 2: API Integration Tool

```python
import httpx

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "search_github":
        query = arguments["query"]
        language = arguments.get("language", "")

        params = {"q": query, "per_page": 10}
        if language:
            params["q"] += f" language:{language}"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/search/repositories",
                params=params,
                headers={"Authorization": f"token {GITHUB_TOKEN}"}
            )
            response.raise_for_status()
            data = response.json()

        repos = [{
            "name": r["full_name"],
            "stars": r["stargazers_count"],
            "description": r["description"],
            "url": r["html_url"]
        } for r in data["items"]]

        return [types.TextContent(type="text", text=json.dumps(repos, indent=2))]
```

### Pattern 3: File System Tool with Safety Guardrails

```python
ALLOWED_PATHS = ["/project/src", "/project/tests"]

def is_allowed_path(filepath: str) -> bool:
    path = Path(filepath).resolve()
    return any(str(path).startswith(allowed) for allowed in ALLOWED_PATHS)

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "write_file":
        filepath = arguments["filepath"]
        content = arguments["content"]

        if not is_allowed_path(filepath):
            return [types.TextContent(
                type="text",
                text=f"Error: Access denied. Allowed paths: {ALLOWED_PATHS}"
            )]

        Path(filepath).write_text(content)
        return [types.TextContent(type="text", text=f"Written: {filepath}")]
```

---

## HTTP Transport: MCP for Shared Servers

When you need multiple users or remote access, use HTTP transport:

```python
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.routing import Route, Mount
import uvicorn

app_server = Server("shared-tools")

# ... tool definitions ...

sse = SseServerTransport("/messages")

async def handle_sse(request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await app_server.run(
            streams[0], streams[1],
            app_server.create_initialization_options()
        )

starlette_app = Starlette(routes=[
    Route("/sse", endpoint=handle_sse),
    Mount("/messages", app=sse.handle_post_message),
])

uvicorn.run(starlette_app, host="0.0.0.0", port=8080)
```

Connect clients to your HTTP server:

```json
{
  "mcpServers": {
    "shared-tools": {
      "url": "http://your-server:8080/sse",
      "transport": "sse"
    }
  }
}
```

---

## Building an MCP Client

Sometimes you want to build an agent that *calls* MCP servers programmatically:

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import anthropic

async def run_agent_with_mcp():
    # Connect to MCP server
    server_params = StdioServerParameters(
        command="python",
        args=["code_analysis_server.py"]
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Discover available tools
            tools_result = await session.list_tools()

            # Convert MCP tools to Anthropic tool format
            anthropic_tools = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in tools_result.tools
            ]

            # Run Claude with MCP tools
            client = anthropic.Anthropic()
            messages = [{"role": "user", "content": "Analyze the Python files in /project/src"}]

            while True:
                response = client.messages.create(
                    model="claude-opus-4-6",
                    max_tokens=4096,
                    tools=anthropic_tools,
                    messages=messages
                )

                # Handle tool use
                if response.stop_reason == "tool_use":
                    tool_results = []
                    for block in response.content:
                        if block.type == "tool_use":
                            result = await session.call_tool(
                                block.name,
                                block.input
                            )
                            tool_results.append({
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result.content[0].text
                            })

                    messages.append({"role": "assistant", "content": response.content})
                    messages.append({"role": "user", "content": tool_results})
                else:
                    # Final response
                    print(response.content[0].text)
                    break
```

This pattern — MCP client + Claude + tool loop — is the foundation of most production AI agents built on MCP.

---

## Production Considerations

### Authentication

MCP doesn't specify authentication at the protocol level. For HTTP servers, handle it at the transport layer:

```python
async def handle_sse(request):
    # Validate API key or JWT
    auth_header = request.headers.get("Authorization", "")
    if not validate_token(auth_header):
        return Response("Unauthorized", status_code=401)

    async with sse.connect_sse(...) as streams:
        await app_server.run(...)
```

### Logging and Observability

```python
import structlog

log = structlog.get_logger()

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    log.info("tool_called", tool=name, args=arguments)

    start = time.monotonic()
    try:
        result = await _execute_tool(name, arguments)
        log.info("tool_success", tool=name, duration_ms=(time.monotonic() - start) * 1000)
        return result
    except Exception as e:
        log.error("tool_error", tool=name, error=str(e))
        return [types.TextContent(type="text", text=f"Error: {e}")]
```

### Rate Limiting

For shared MCP servers, add per-client rate limiting:

```python
from collections import defaultdict
import time

rate_limit_counts = defaultdict(list)
RATE_LIMIT = 100  # calls per minute

def check_rate_limit(client_id: str) -> bool:
    now = time.time()
    minute_ago = now - 60

    # Clean old entries
    rate_limit_counts[client_id] = [
        t for t in rate_limit_counts[client_id] if t > minute_ago
    ]

    if len(rate_limit_counts[client_id]) >= RATE_LIMIT:
        return False

    rate_limit_counts[client_id].append(now)
    return True
```

---

## The MCP Ecosystem in 2026

The MCP server ecosystem has grown rapidly. Before building from scratch, check:

- **Anthropic's official servers** — filesystem, GitHub, Postgres, Slack, Brave Search
- **Community servers** — [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) lists 200+ maintained servers
- **Commercial MCP hubs** — Several vendors now offer hosted MCP endpoints for common services

Build custom MCP servers when:
- You need access to your own internal systems
- Existing servers don't match your security requirements
- You need custom business logic around tool calls

---

## Summary

MCP is the standardization layer that makes building AI agents sustainable. Write your tools once, use them across any MCP-compatible AI client.

Key takeaways:
- **Start with stdio transport** for local tools, move to HTTP for shared access
- **Return errors as tool results** — let the AI decide how to handle them
- **Write good descriptions** — the AI uses them to decide when to call your tool
- **Validate inputs and guard paths** — AI agents call your tools; treat them like untrusted API consumers
- **The client loop pattern** (discover tools → call Claude → handle tool_use → repeat) is the core of every MCP-based agent

The [official MCP documentation](https://modelcontextprotocol.io) and [Python SDK](https://github.com/modelcontextprotocol/python-sdk) are the authoritative references for staying current as the spec evolves.
