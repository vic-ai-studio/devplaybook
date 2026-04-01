---
title: "Model Context Protocol (MCP): The Complete Developer Guide 2026"
description: "Everything you need to know about Model Context Protocol (MCP): what it is, how it works, building MCP servers from scratch, integrating with Claude Code and other LLM clients, and production best practices."
date: "2026-04-01"
tags: [mcp, model-context-protocol, claude, llm, ai-tools, developer-tools]
readingTime: "13 min read"
---

# Model Context Protocol (MCP): The Complete Developer Guide 2026

**Model Context Protocol (MCP)** has become the USB standard of the AI world. Before MCP, every AI tool needed custom integrations — each IDE plugin, each agent framework, each LLM provider had its own way of connecting to databases, APIs, and file systems. MCP standardizes how LLMs connect to external context and tools.

This guide covers everything: what MCP is, how it works under the hood, building your first MCP server, integrating with Claude Code, and patterns for production use.

---

## What Is MCP?

MCP is an **open protocol** (created by Anthropic, now community-maintained) that defines a standard communication layer between:

- **MCP Hosts** — LLM applications (Claude Code, Claude Desktop, custom agents)
- **MCP Clients** — built into hosts, manage connections to servers
- **MCP Servers** — expose tools, resources, and prompts to LLMs

```
┌─────────────────────┐     MCP Protocol      ┌─────────────────────┐
│   MCP Host          │ ◄──────────────────── │   MCP Server        │
│  (Claude Code,      │ ──────────────────────► │  (your integration) │
│   Claude Desktop)   │                        │                     │
└─────────────────────┘                        └──────────┬──────────┘
                                                          │
                                               ┌──────────▼──────────┐
                                               │   External Service  │
                                               │  (DB, API, FS, etc) │
                                               └─────────────────────┘
```

### The Three Primitives

MCP servers expose three types of capabilities:

1. **Tools** — functions the LLM can call (like function calling / tool use)
2. **Resources** — data the LLM can read (files, database records, API responses)
3. **Prompts** — reusable prompt templates with parameters

---

## How MCP Works Under the Hood

MCP uses **JSON-RPC 2.0** over one of several transports:

- **stdio** — subprocess stdin/stdout (most common for local servers)
- **HTTP + SSE** — for remote servers (Server-Sent Events for server→client messages)
- **WebSocket** — bidirectional streaming

### Connection Lifecycle

```
Client                        Server
  │                              │
  │──── initialize ─────────────►│
  │◄─── initialized ────────────│
  │                              │
  │──── tools/list ─────────────►│
  │◄─── [tool definitions] ─────│
  │                              │
  │──── tools/call ─────────────►│  (when LLM wants to use a tool)
  │◄─── tool result ────────────│
  │                              │
  │──── resources/list ─────────►│
  │◄─── [resource list] ────────│
  │                              │
  │──── resources/read ─────────►│
  │◄─── resource content ───────│
```

### Message Format

```json
// Request (client → server)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_database",
    "arguments": {
      "query": "latest sales data",
      "limit": 10
    }
  }
}

// Response (server → client)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 10 records: ..."
      }
    ]
  }
}
```

---

## Building Your First MCP Server

### Option 1: Python SDK

```bash
pip install mcp
```

```python
# server.py
import asyncio
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp import types

# Create server instance
app = Server("my-mcp-server")

@app.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """Return available tools."""
    return [
        types.Tool(
            name="get_weather",
            description="Get current weather for a city",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name"
                    }
                },
                "required": ["city"]
            }
        ),
        types.Tool(
            name="search_docs",
            description="Search internal documentation",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "default": 5}
                },
                "required": ["query"]
            }
        )
    ]

@app.call_tool()
async def handle_call_tool(
    name: str,
    arguments: dict
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution."""
    if name == "get_weather":
        city = arguments.get("city")
        # Call actual weather API here
        weather_data = await fetch_weather(city)
        return [types.TextContent(
            type="text",
            text=f"Weather in {city}: {weather_data['temp']}°C, {weather_data['condition']}"
        )]

    elif name == "search_docs":
        query = arguments.get("query")
        limit = arguments.get("limit", 5)
        results = await search_documentation(query, limit)
        return [types.TextContent(
            type="text",
            text="\n".join([f"- {r['title']}: {r['snippet']}" for r in results])
        )]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="my-mcp-server",
                server_version="0.1.0",
                capabilities=app.get_capabilities(
                    notification_options=None,
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
```

### Option 2: TypeScript SDK

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
// server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "my-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_database",
        description: "Execute a read-only SQL query",
        inputSchema: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "SQL SELECT query to execute",
            },
          },
          required: ["sql"],
        },
      } satisfies Tool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "query_database") {
    const { sql } = args as { sql: string };

    // Validate it's read-only
    if (!sql.trim().toUpperCase().startsWith("SELECT")) {
      throw new Error("Only SELECT queries are allowed");
    }

    const results = await db.query(sql);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Adding Resources to Your MCP Server

Resources let LLMs read data without "calling" anything — like a file system or database view.

```python
@app.list_resources()
async def handle_list_resources() -> list[types.Resource]:
    return [
        types.Resource(
            uri="file:///project/docs",
            name="Project Documentation",
            description="All project documentation files",
            mimeType="text/markdown"
        ),
        types.Resource(
            uri="db://users/recent",
            name="Recent Users",
            description="Last 100 registered users",
            mimeType="application/json"
        )
    ]

@app.read_resource()
async def handle_read_resource(uri: str) -> str:
    if uri == "file:///project/docs":
        docs = load_all_docs("/project/docs")
        return "\n\n".join(docs)

    elif uri == "db://users/recent":
        users = await db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT 100")
        return json.dumps(users)

    raise ValueError(f"Unknown resource: {uri}")
```

---

## Integrating MCP with Claude Code

Claude Code (the Anthropic CLI) has native MCP support. Configure servers in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb",
        "API_KEY": "your-api-key"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    }
  }
}
```

After configuration, Claude Code automatically connects to your servers at startup. You can then reference tools and resources in conversation.

### Remote MCP Server (HTTP + SSE)

For hosted/shared servers:

```json
{
  "mcpServers": {
    "remote-analytics": {
      "url": "https://mcp.yourcompany.com/analytics",
      "headers": {
        "Authorization": "Bearer ${ANALYTICS_TOKEN}"
      }
    }
  }
}
```

---

## Building a Production MCP Server

Here's a complete example: a database MCP server with proper error handling, connection pooling, and security:

```python
# production_db_server.py
import asyncio
import os
import logging
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.server.models import InitializationOptions
from mcp import types

logger = logging.getLogger(__name__)

# Connection pool (initialized at startup)
pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(
            os.environ["DATABASE_URL"],
            min_size=2,
            max_size=10,
            command_timeout=30
        )
    return pool

app = Server("production-db-server")

ALLOWED_TABLES = {"products", "orders", "customers", "analytics"}  # allowlist

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="query_table",
            description="Query a database table with filters",
            inputSchema={
                "type": "object",
                "properties": {
                    "table": {
                        "type": "string",
                        "enum": list(ALLOWED_TABLES),
                        "description": "Table to query"
                    },
                    "filters": {
                        "type": "object",
                        "description": "Key-value filters (WHERE clause)"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 20,
                        "maximum": 100
                    }
                },
                "required": ["table"]
            }
        ),
        types.Tool(
            name="get_schema",
            description="Get the schema for a database table",
            inputSchema={
                "type": "object",
                "properties": {
                    "table": {
                        "type": "string",
                        "enum": list(ALLOWED_TABLES)
                    }
                },
                "required": ["table"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    db = await get_pool()

    if name == "query_table":
        table = arguments["table"]

        # Security: validate table is in allowlist
        if table not in ALLOWED_TABLES:
            raise ValueError(f"Table '{table}' not allowed")

        filters = arguments.get("filters", {})
        limit = min(arguments.get("limit", 20), 100)

        # Build parameterized query (safe from SQL injection)
        where_clauses = []
        params = []
        for i, (col, val) in enumerate(filters.items(), 1):
            # Validate column name (alphanumeric + underscore only)
            if not col.replace("_", "").isalnum():
                raise ValueError(f"Invalid column name: {col}")
            where_clauses.append(f"{col} = ${i}")
            params.append(val)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"SELECT * FROM {table} {where_sql} LIMIT ${len(params)+1}"
        params.append(limit)

        async with db.acquire() as conn:
            rows = await conn.fetch(query, *params)

        result = [dict(row) for row in rows]
        return [types.TextContent(
            type="text",
            text=f"Query returned {len(result)} rows:\n{json.dumps(result, indent=2, default=str)}"
        )]

    elif name == "get_schema":
        table = arguments["table"]
        if table not in ALLOWED_TABLES:
            raise ValueError(f"Table '{table}' not allowed")

        async with db.acquire() as conn:
            columns = await conn.fetch(
                "SELECT column_name, data_type, is_nullable "
                "FROM information_schema.columns "
                "WHERE table_name = $1 ORDER BY ordinal_position",
                table
            )

        schema = [dict(col) for col in columns]
        return [types.TextContent(
            type="text",
            text=f"Schema for {table}:\n{json.dumps(schema, indent=2)}"
        )]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="production-db-server",
                server_version="1.0.0",
                capabilities=app.get_capabilities(
                    notification_options=None,
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Popular Pre-Built MCP Servers

You don't always need to build from scratch. The MCP ecosystem has grown rapidly:

| Server | What it does | Install |
|--------|-------------|---------|
| `@modelcontextprotocol/server-filesystem` | Read/write local files | `npx -y @mcp/server-filesystem` |
| `@modelcontextprotocol/server-github` | GitHub repos, issues, PRs | `npx -y @mcp/server-github` |
| `@modelcontextprotocol/server-postgres` | PostgreSQL queries | `npx -y @mcp/server-postgres` |
| `@modelcontextprotocol/server-brave-search` | Brave web search | `npx -y @mcp/server-brave-search` |
| `@modelcontextprotocol/server-puppeteer` | Browser automation | `npx -y @mcp/server-puppeteer` |
| `mcp-server-sqlite` | SQLite database | `uvx mcp-server-sqlite` |
| `mcp-server-git` | Git operations | `uvx mcp-server-git` |
| `@anthropic/mcp-server-bash` | Execute bash commands | `npx -y @anthropic/mcp-server-bash` |

---

## MCP Security Best Practices

MCP servers run with whatever permissions the host process has. Security matters:

1. **Input validation** — validate all tool arguments before executing
2. **Allowlists** — restrict which tables/files/operations are accessible
3. **Parameterized queries** — never build SQL/commands via string concatenation
4. **Read-only by default** — only expose write operations when explicitly needed
5. **Rate limiting** — throttle expensive operations
6. **Audit logging** — log all tool calls for security review
7. **Secrets in env vars** — never hardcode credentials in server code
8. **Scope isolation** — each server should have minimal required permissions

---

## Testing Your MCP Server

Use the official MCP Inspector:

```bash
npx @modelcontextprotocol/inspector python server.py
```

This opens a web UI where you can:
- Browse available tools and resources
- Call tools with custom arguments
- Inspect request/response messages
- Debug connection issues

For automated testing:

```python
# test_server.py
import pytest
import asyncio
from mcp.client.session import ClientSession
from mcp.client.stdio import stdio_client

@pytest.mark.asyncio
async def test_tools_available():
    async with stdio_client(["python", "server.py"]) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            tool_names = [t.name for t in tools.tools]
            assert "get_weather" in tool_names
            assert "search_docs" in tool_names

@pytest.mark.asyncio
async def test_tool_call():
    async with stdio_client(["python", "server.py"]) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("get_weather", {"city": "Tokyo"})
            assert len(result.content) > 0
            assert "Tokyo" in result.content[0].text
```

---

## DevPlaybook Tools for MCP Development

When building MCP servers, these DevPlaybook tools are handy:
- **JSON Schema Validator** — validate your tool `inputSchema` definitions
- **JSON Formatter** — pretty-print MCP request/response payloads during debugging
- **Base64 Encoder** — encode binary data for MCP resource content
- **Regex Tester** — test patterns for parsing tool arguments

---

## The MCP Ecosystem in 2026

MCP has seen explosive adoption:

- **Claude Desktop** and **Claude Code** ship with native MCP support
- **Continue.dev**, **Cursor**, and **Zed** have added MCP support
- **AWS**, **Google Cloud**, and **Microsoft Azure** all ship MCP servers for their services
- The official MCP registry lists 500+ community servers
- OpenAI announced MCP compatibility in early 2026

The protocol is also evolving:
- **MCP 1.1** added OAuth 2.0 support for remote server authentication
- **Batch operations** — call multiple tools in a single round-trip
- **Streaming resources** — push updates to clients in real-time
- **Agent-to-agent MCP** — agents can expose their capabilities as MCP servers to other agents

---

## Summary

MCP solves the N×M integration problem in AI tooling. Instead of every LLM client needing custom integrations with every data source, MCP provides a standard protocol that any client can speak and any server can implement.

For developers, this means:
- **Build once, use everywhere** — one MCP server works with Claude Code, Claude Desktop, and any future MCP-compatible tool
- **Standard security model** — the protocol defines permission boundaries
- **Rich tooling** — inspector, SDKs for Python/TypeScript/Rust/Go, 500+ community servers

Whether you're connecting an LLM to your database, internal wiki, SaaS APIs, or file system — MCP is the standard way to do it in 2026.
