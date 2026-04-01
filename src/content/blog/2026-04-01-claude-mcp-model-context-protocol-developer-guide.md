---
title: "Claude MCP Protocol: Complete Developer Guide to Model Context Protocol (2026)"
description: "Complete guide to building MCP (Model Context Protocol) servers for Claude. Learn server types, tool definition schema, TypeScript SDK, real examples, and deployment patterns."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["claude", "mcp", "ai", "typescript", "developer-tools"]
readingTime: "14 min read"
---

# Claude MCP Protocol: Complete Developer Guide to Model Context Protocol (2026)

Model Context Protocol (MCP) is the open standard that lets AI models like Claude talk to external tools, databases, file systems, and APIs in a structured, secure way. If you've ever wanted Claude to read your local files, query a database, call a custom API, or interact with your own services — MCP is how you do it.

This guide covers everything you need to build production-ready MCP servers in 2026: architecture, the TypeScript SDK, real implementation examples, testing strategies, and deployment patterns.

## What Is MCP and Why Does It Matter?

Before MCP, integrating an LLM with external tools was ad-hoc. Every team invented their own function-calling format, their own context injection pattern, their own error handling. The result was fragmented, brittle integrations that didn't compose.

MCP solves this with a **universal protocol** for AI-tool communication. It defines:

- A standard wire format (JSON-RPC 2.0 over stdio or HTTP/SSE)
- A capability negotiation handshake
- Three core primitives: **tools**, **resources**, and **prompts**
- A transport layer abstraction (local vs. remote)

The practical payoff: an MCP server you build today works with Claude Desktop, the Claude API, Claude Code CLI, and any future MCP-compatible host — without modification.

### The Ecosystem in 2026

Anthropic open-sourced MCP in late 2024. By 2026, the ecosystem includes:

- Official SDKs for TypeScript and Python
- Community SDKs for Go, Rust, Java, and C#
- 300+ published MCP servers on npm and GitHub
- Native support in Claude Desktop, Claude Code, and the Claude API
- Growing support in third-party AI frameworks (LangChain, LlamaIndex, Vercel AI SDK)

## MCP Architecture: Hosts, Clients, and Servers

Understanding MCP's three-layer architecture is critical before writing any code.

```
┌─────────────────────────────────────┐
│           Host Application          │
│  (Claude Desktop / Claude Code CLI) │
│                                     │
│  ┌────────────────────────────────┐ │
│  │         MCP Client             │ │
│  │  (manages server connections)  │ │
│  └────────────┬───────────────────┘ │
└───────────────┼─────────────────────┘
                │  JSON-RPC 2.0
                │  (stdio or HTTP/SSE)
                ▼
┌─────────────────────────────────────┐
│           MCP Server                │
│  (your code — exposes tools,        │
│   resources, and prompts)           │
└─────────────────────────────────────┘
```

**Host** — the application that embeds the AI model (e.g., Claude Desktop). The host decides which MCP servers to connect to and manages the overall AI session.

**Client** — a protocol-level component inside the host that handles the MCP handshake, capability negotiation, and message routing to one or more servers.

**Server** — your code. It receives requests from the client and responds with results. A server can expose tools the model can call, resources the model can read, and prompt templates the model can use.

This separation means you write one server and any compliant host can use it.

## The Three Primitives

### 1. Tools

Tools are functions the AI can call to take actions or retrieve computed data. They're the most commonly used primitive.

```
Tool definition → JSON Schema for inputs → handler function → result
```

Examples: `run_sql_query`, `read_file`, `send_email`, `search_web`, `create_github_issue`.

### 2. Resources

Resources are data sources the AI can read — like files, database records, or API responses. Unlike tools, resources are identified by a URI and are meant to be read, not executed.

```
resource://myserver/config.json
resource://myserver/users/42
```

Resources support subscription (the server notifies the client when a resource changes), making them suitable for live data.

### 3. Prompts

Prompts are reusable prompt templates with dynamic parameters. The server exposes them, and the host can offer them to the user as slash commands or workflow starting points.

```
/summarize-pr  → fills in a template with PR data from your server
/explain-error → fills in a template with stack trace context
```

## Server Types: Local (stdio) vs Remote (HTTP/SSE)

MCP supports two transport mechanisms:

| Transport | Best For | Latency | Auth |
|-----------|----------|---------|------|
| `stdio` | Local tools, filesystem access, dev workflows | ~0ms | OS-level (process isolation) |
| `HTTP/SSE` | Remote APIs, shared team servers, cloud deployment | Network | API keys, OAuth |

**stdio servers** run as a local process. Claude Desktop or Claude Code spawns them on demand. They're simple to build and secure by default since they run with your OS user permissions.

**HTTP/SSE servers** run as a web service. The client connects over HTTP; the server sends responses as server-sent events. Use these when you need to share a server across a team or deploy to the cloud.

For most developer tools and personal workflows, start with stdio. Move to HTTP/SSE when you need remote access or multi-user support.

## TypeScript SDK Setup

The official `@modelcontextprotocol/sdk` package handles the protocol layer so you focus on your tool logic.

```bash
npm install @modelcontextprotocol/sdk zod
```

Zod is the recommended schema validation library. The SDK uses it for input validation and JSON Schema generation.

### Minimal stdio Server

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  {
    name: "my-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Declare available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "hello_world",
        description: "Returns a greeting for the given name",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name to greet",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "hello_world") {
    const { name } = request.params.arguments as { name: string };
    return {
      content: [
        {
          type: "text",
          text: `Hello, ${name}! This response came from your MCP server.`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Example: Building a Filesystem MCP Server

A filesystem server lets Claude read, write, and list files within a sandboxed directory.

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

const ROOT_DIR = process.env.MCP_ROOT_DIR ?? process.cwd();

// Input schemas with Zod
const ReadFileSchema = z.object({
  path: z.string().describe("Relative path to the file"),
});

const WriteFileSchema = z.object({
  path: z.string().describe("Relative path to the file"),
  content: z.string().describe("File content to write"),
});

const ListDirSchema = z.object({
  path: z.string().default(".").describe("Relative path to the directory"),
});

function resolveSafe(relativePath: string): string {
  const resolved = path.resolve(ROOT_DIR, relativePath);
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error("Path traversal attempt blocked");
  }
  return resolved;
}

const server = new Server(
  { name: "filesystem-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read_file",
      description: "Read the contents of a file",
      inputSchema: zodToJsonSchema(ReadFileSchema),
    },
    {
      name: "write_file",
      description: "Write content to a file (creates if not exists)",
      inputSchema: zodToJsonSchema(WriteFileSchema),
    },
    {
      name: "list_directory",
      description: "List files and directories at a path",
      inputSchema: zodToJsonSchema(ListDirSchema),
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "read_file") {
      const { path: filePath } = ReadFileSchema.parse(args);
      const content = await fs.readFile(resolveSafe(filePath), "utf-8");
      return { content: [{ type: "text", text: content }] };
    }

    if (name === "write_file") {
      const { path: filePath, content } = WriteFileSchema.parse(args);
      const resolved = resolveSafe(filePath);
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, "utf-8");
      return { content: [{ type: "text", text: `Written: ${filePath}` }] };
    }

    if (name === "list_directory") {
      const { path: dirPath } = ListDirSchema.parse(args);
      const entries = await fs.readdir(resolveSafe(dirPath), {
        withFileTypes: true,
      });
      const listing = entries
        .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
        .join("\n");
      return { content: [{ type: "text", text: listing }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Note the `resolveSafe` function — always validate that resolved paths stay within your sandboxed root. Path traversal (`../../etc/passwd`) is the most common MCP security mistake.

## Example: Building a Database Query MCP Server

This server exposes read-only SQL queries against a SQLite database. Use [/tools/json-schema-validator](/tools/json-schema-validator) to validate your tool schemas before wiring them up.

```typescript
import Database from "better-sqlite3";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const DB_PATH = process.env.DB_PATH ?? "./data.db";
const db = new Database(DB_PATH, { readonly: true });

const QuerySchema = z.object({
  sql: z
    .string()
    .describe("SELECT query to execute")
    .refine(
      (s) => s.trim().toUpperCase().startsWith("SELECT"),
      "Only SELECT queries are permitted"
    ),
  params: z.array(z.unknown()).default([]).describe("Query parameters"),
});

const server = new Server(
  { name: "sqlite-server", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_db",
      description:
        "Run a read-only SQL SELECT query. Always parameterize user input.",
      inputSchema: {
        type: "object",
        properties: {
          sql: { type: "string", description: "SELECT statement" },
          params: {
            type: "array",
            items: {},
            description: "Bind parameters",
          },
        },
        required: ["sql"],
      },
    },
    {
      name: "list_tables",
      description: "List all tables in the database",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "list_tables") {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    return {
      content: [
        {
          type: "text",
          text: tables.map((t) => t.name).join("\n"),
        },
      ],
    };
  }

  if (name === "query_db") {
    const { sql, params } = QuerySchema.parse(args);
    try {
      const rows = db.prepare(sql).all(...params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rows, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `SQL Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Key patterns here: `readonly: true` on the database connection, a Zod refine that blocks non-SELECT queries, and parameterized queries to prevent SQL injection.

## Tool Definition Schema and Zod Validation

The `inputSchema` field in tool definitions is a JSON Schema object. Writing JSON Schema by hand is error-prone. Use Zod with `zod-to-json-schema` to generate it automatically:

```bash
npm install zod-to-json-schema
```

```typescript
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const SearchSchema = z.object({
  query: z.string().min(1).max(500).describe("Search query"),
  limit: z.number().int().min(1).max(50).default(10).describe("Max results"),
  filters: z
    .object({
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

// Use in tool definition
const toolDef = {
  name: "search",
  description: "Search the knowledge base",
  inputSchema: zodToJsonSchema(SearchSchema, { $refStrategy: "none" }),
};
```

The `{ $refStrategy: "none" }` option inlines all `$ref` definitions, which is required for Claude's tool calling — it doesn't follow external `$ref` URIs.

At runtime, parse incoming arguments with Zod before using them:

```typescript
const parsed = SearchSchema.safeParse(request.params.arguments);
if (!parsed.success) {
  return {
    content: [{ type: "text", text: `Invalid input: ${parsed.error.message}` }],
    isError: true,
  };
}
const { query, limit, filters } = parsed.data;
```

## Testing with Claude Desktop and Claude Code CLI

### Claude Desktop

Add your server to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/path/to/your/server/dist/index.js"],
      "env": {
        "MCP_ROOT_DIR": "/Users/yourname/projects"
      }
    },
    "sqlite": {
      "command": "node",
      "args": ["/path/to/sqlite-server/dist/index.js"],
      "env": {
        "DB_PATH": "/Users/yourname/data.db"
      }
    }
  }
}
```

Restart Claude Desktop, open a new conversation, and you should see your tools available. Claude will offer to use them when relevant to the task.

### Claude Code CLI

Add servers to your Claude Code configuration:

```bash
# Add an MCP server (stdio)
claude mcp add filesystem node /path/to/server/dist/index.js

# Add with environment variables
claude mcp add sqlite node /path/to/sqlite-server/dist/index.js \
  --env DB_PATH=/path/to/data.db

# List configured servers
claude mcp list

# Test a specific server
claude mcp test filesystem
```

You can also use the MCP Inspector for debugging:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

The Inspector gives you a UI to call tools directly, inspect schemas, and view request/response logs — essential for development.

## Deployment Patterns

### npm Package

Package your server for easy distribution:

```json
{
  "name": "mcp-my-server",
  "version": "1.0.0",
  "bin": {
    "mcp-my-server": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

Users install with `npm install -g mcp-my-server` and reference `mcp-my-server` as the command in their config.

### Docker

For HTTP/SSE servers, Docker is the standard deployment unit:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
docker build -t my-mcp-server .
docker run -p 3000:3000 -e DB_PATH=/data/db.sqlite my-mcp-server
```

### Cloudflare Workers

For lightweight HTTP/SSE servers, Cloudflare Workers offer global edge deployment with zero cold starts:

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class MyMcpAgent extends McpAgent {
  server = new McpServer({ name: "edge-server", version: "1.0.0" });

  async init() {
    this.server.tool("ping", {}, async () => ({
      content: [{ type: "text", text: "pong from the edge" }],
    }));
  }
}

export default {
  fetch: MyMcpAgent.mount("/mcp"),
};
```

Deploy with `wrangler deploy`. Clients connect to `https://your-worker.workers.dev/mcp`.

## Security Considerations

MCP servers run with real system access. Security is your responsibility as the server author.

**Input validation** — always validate with Zod before using any argument. Never trust the model's output as safe input to your tools.

**Path traversal** — sandbox all file operations to a declared root directory. Use `path.resolve` and check the result starts with your root.

**SQL injection** — use parameterized queries exclusively. Validate that query text starts with `SELECT` before executing.

**Principle of least privilege** — request only the permissions your server needs. A read-only database server should connect with a read-only database user.

**Secret management** — pass credentials via environment variables, never hardcode. The `env` field in Claude Desktop config lets you inject secrets at runtime.

**Rate limiting** — for HTTP/SSE servers, implement rate limiting on tool calls to prevent abuse. The `@upstash/ratelimit` package works well with edge deployments.

**Audit logging** — log all tool calls with timestamps, arguments, and results. This is essential for debugging and for understanding how Claude is using your server.

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const start = Date.now();
  const { name, arguments: args } = request.params;

  console.error(
    JSON.stringify({
      event: "tool_call",
      tool: name,
      args,
      timestamp: new Date().toISOString(),
    })
  );

  const result = await handleTool(name, args);
  const duration = Date.now() - start;

  console.error(
    JSON.stringify({
      event: "tool_result",
      tool: name,
      duration_ms: duration,
      is_error: result.isError ?? false,
    })
  );

  return result;
});
```

Note: MCP servers log to `stderr`, not `stdout`. The stdout channel carries the protocol messages.

## Advanced Patterns

### Resources with Subscriptions

Expose live data that the client can subscribe to:

```typescript
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: "resource://myserver/metrics",
      name: "Live Metrics",
      mimeType: "application/json",
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === "resource://myserver/metrics") {
    const metrics = await fetchCurrentMetrics();
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(metrics, null, 2),
        },
      ],
    };
  }
});
```

### Prompt Templates

Expose structured prompt templates for common workflows:

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "review_pr",
      description: "Generate a code review for a pull request",
      arguments: [
        { name: "pr_number", description: "PR number", required: true },
        {
          name: "focus",
          description: "Review focus: security, performance, readability",
          required: false,
        },
      ],
    },
  ],
}));
```

## What to Build Next

Now that you understand MCP's architecture and implementation, some high-value servers to build:

- **GitHub MCP server** — list PRs, create issues, review diffs
- **Slack MCP server** — read channel history, post messages
- **Calendar MCP server** — check availability, create events
- **Monitoring MCP server** — query Datadog/Grafana metrics
- **Documentation MCP server** — semantic search over your docs

Use [/tools/typescript-playground](/tools/typescript-playground) to prototype your schema logic before building out the full server.

The MCP ecosystem is young and moving fast. Start simple with a stdio server that wraps one useful API, ship it, and iterate. The protocol is stable — what you build today will keep working as the AI tooling landscape evolves.
