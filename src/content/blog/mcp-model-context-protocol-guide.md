---
title: "Model Context Protocol (MCP): The Complete Guide for 2026"
description: "Complete guide to Model Context Protocol (MCP) — Anthropic's open standard for connecting AI to tools. Learn architecture, build your first MCP server, and explore the ecosystem."
date: "2026-04-01"
tags: [mcp, ai-agents, anthropic, typescript, developer-tools]
readingTime: "12 min read"
---

Model Context Protocol (MCP) has quickly become the backbone of modern AI tool integrations. Since Anthropic open-sourced the spec in late 2024, it has grown from an internal project into a community-driven standard with hundreds of servers, broad SDK support, and adoption across the major AI platforms. This guide covers everything you need to understand MCP deeply — from the architectural decisions to a working TypeScript server you can run today.

## The Context Integration Problem MCP Solves

Before MCP, connecting an AI assistant to external data or tools was a bespoke engineering effort. You had three unsatisfying choices:

1. **Prompt stuffing** — dump raw data into the system prompt. This burns tokens, hits context limits fast, and makes deterministic retrieval impossible.
2. **Custom function calling** — each vendor had their own JSON schema for tools. OpenAI's `tools` array, Anthropic's `tool_use`, Gemini's `functionDeclarations` — incompatible formats, incompatible semantics.
3. **RAG pipelines** — powerful but heavy. A full retrieval pipeline just to let Claude read a local file was massive overkill.

The deeper problem: every integration was *point-to-point*. An IDE plugin connecting to GitHub required bespoke code. A different IDE talking to the same GitHub would need completely different code. M tools × N clients = M×N integrations.

MCP flips this to M + N. Each tool exposes one MCP server. Each client speaks the MCP protocol. The combinatorial explosion disappears.

Anthropic built MCP to solve this for Claude Desktop initially, but the protocol was designed from the start to be client-agnostic. The result is an open standard that benefits the entire AI ecosystem.

## MCP Architecture Deep Dive

MCP defines three roles in every interaction:

### Hosts

The **host** is the application the user runs — Claude Desktop, Claude Code, an IDE plugin like Zed or Cursor, or a custom application you build. The host owns the conversation context and decides which MCP servers to connect to. It presents the final output to the user.

### Clients

Each **client** is a connection to a single MCP server, managed by the host. A host can maintain multiple clients simultaneously — one connected to your filesystem server, another to a GitHub server, another to a Postgres server. Clients are protocol-level abstractions; in practice they are embedded inside the host process.

### Servers

An **MCP server** is a standalone process (or embedded module) that exposes capabilities through the MCP protocol. It knows nothing about the AI model. It just responds to well-defined requests: list your tools, execute this tool call, provide this resource. Servers are where your integration logic lives.

```
┌────────────────────────────────────────────┐
│  Host (Claude Desktop / Claude Code / IDE)  │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Client 1 │  │ Client 2 │  │ Client 3 │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
└───────┼─────────────┼─────────────┼────────┘
        │             │             │
   JSON-RPC 2.0  JSON-RPC 2.0  JSON-RPC 2.0
        │             │             │
┌───────▼──┐  ┌───────▼──┐  ┌───────▼──┐
│FS Server │  │GH Server │  │PG Server │
└──────────┘  └──────────┘  └──────────┘
```

### Transport Layer: JSON-RPC 2.0

MCP uses **JSON-RPC 2.0** as its wire format, which means every message is a JSON object with a `jsonrpc: "2.0"` field, a `method`, optional `params`, and either an `id` (for requests expecting a response) or no `id` (for notifications).

Two transport mechanisms are officially supported:

**stdio** — the host spawns the server as a child process and communicates over stdin/stdout. This is the most common option for local servers. Zero network configuration, no port conflicts, easy process management.

**SSE (Server-Sent Events)** — the server runs as an HTTP server. The client connects via HTTP GET for the SSE stream (server → client) and HTTP POST for sending messages (client → server). Used when the server is remote or needs to be shared across multiple clients.

A third transport, **WebSockets**, is in the spec as an optional extension and has growing SDK support.

## Core Primitives

MCP defines four capability primitives. A server can implement any combination.

### Tools

**Tools** are functions the AI model can invoke. This is the most-used primitive. A tool has:

- A `name` (string identifier)
- A `description` (shown to the model, should be clear and specific)
- An `inputSchema` (JSON Schema describing the parameters)
- An execution handler (your code that runs when the tool is called)

The model sees tool descriptions and decides when to call them. Good descriptions are the single biggest lever on tool reliability.

### Resources

**Resources** are read-only data sources the model can access. Think of them as URIs: `file:///home/user/project/README.md` or `postgres://mydb/users`. Resources can be static (fixed content) or dynamic (query-time content). They support binary data via base64 encoding for images and other non-text content.

Resources differ from tools conceptually: they represent *state* in the world, not *actions* on the world.

### Prompts

**Prompts** are reusable, parameterized message templates. A server can expose prompts that the host can surface in its UI — for example, a "summarize PR" prompt that accepts a PR URL and generates a structured summary request. Prompts are how servers contribute workflow patterns, not just capabilities.

### Sampling

**Sampling** lets servers request that the host perform an LLM inference on their behalf. This enables agentic loops where a server needs AI reasoning mid-execution — for example, a code analysis server that asks Claude to classify a finding before deciding how to proceed. Sampling is a powerful primitive for building AI-native servers that are more than simple tool wrappers.

## Building Your First MCP Server in TypeScript

Let's build a practical MCP server that exposes three tools: reading a file, listing a directory, and running a shell command with an allowlist. This is a complete, runnable example.

### Setup

```bash
mkdir my-mcp-server && cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

### The Server

Create `src/index.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Initialize the server
const server = new McpServer({
  name: "dev-utils",
  version: "1.0.0",
});

// Tool 1: Read a file
server.tool(
  "read_file",
  "Read the contents of a file at the given path",
  {
    filePath: z.string().describe("Absolute or relative path to the file"),
  },
  async ({ filePath }) => {
    const resolved = path.resolve(filePath);
    const content = await fs.readFile(resolved, "utf-8");
    return {
      content: [{ type: "text", text: content }],
    };
  }
);

// Tool 2: List a directory
server.tool(
  "list_directory",
  "List files and directories at the given path",
  {
    dirPath: z.string().describe("Directory path to list"),
    showHidden: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include hidden files"),
  },
  async ({ dirPath, showHidden }) => {
    const resolved = path.resolve(dirPath);
    const entries = await fs.readdir(resolved, { withFileTypes: true });

    const filtered = showHidden
      ? entries
      : entries.filter((e) => !e.name.startsWith("."));

    const lines = filtered.map((e) => {
      const prefix = e.isDirectory() ? "DIR  " : "FILE ";
      return `${prefix} ${e.name}`;
    });

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

// Tool 3: Run an allowed command
const ALLOWED_COMMANDS = new Set(["git", "npm", "node", "npx", "tsc"]);

server.tool(
  "run_command",
  "Run an allowed shell command. Permitted commands: git, npm, node, npx, tsc",
  {
    command: z.string().describe("The command to run (must be in allowlist)"),
    args: z.array(z.string()).describe("Arguments to pass to the command"),
    cwd: z
      .string()
      .optional()
      .describe("Working directory for the command"),
  },
  async ({ command, args, cwd }) => {
    if (!ALLOWED_COMMANDS.has(command)) {
      throw new Error(
        `Command '${command}' is not allowed. Permitted: ${[...ALLOWED_COMMANDS].join(", ")}`
      );
    }

    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: cwd ? path.resolve(cwd) : process.cwd(),
      timeout: 30_000,
    });

    const output = [stdout, stderr].filter(Boolean).join("\n---stderr---\n");
    return {
      content: [{ type: "text", text: output || "(no output)" }],
    };
  }
);

// Connect and start
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Running It

```bash
npx tsx src/index.ts
```

The server will wait on stdin. To test it interactively, use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

This opens a browser UI where you can call each tool and inspect the JSON-RPC traffic.

### Registering with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "dev-utils": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/my-mcp-server/src/index.ts"]
    }
  }
}
```

Restart Claude Desktop. Your tools will appear in the tool picker.

## The MCP Ecosystem: Popular Servers

The community has built a rich ecosystem. Here are the most widely used servers as of 2026:

| Server | Capabilities | Transport |
|--------|-------------|-----------|
| **@modelcontextprotocol/server-filesystem** | Read/write files, directory listing | stdio |
| **@modelcontextprotocol/server-github** | Repos, PRs, issues, code search | stdio / SSE |
| **@modelcontextprotocol/server-postgres** | Query execution, schema inspection | stdio |
| **@modelcontextprotocol/server-puppeteer** | Browser automation, screenshots | stdio |
| **@modelcontextprotocol/server-brave-search** | Web search via Brave API | stdio |
| **mcp-server-sqlite** | SQLite read/write | stdio |
| **mcp-atlassian** | Jira, Confluence | stdio |
| **mcp-server-kubernetes** | Cluster management | stdio |

Most servers follow the pattern above: a handful of well-named tools, clear descriptions, and strict input validation. The quality of tool descriptions directly determines how reliably the model uses them.

## MCP vs Function Calling vs OpenAI Tools API

This comparison comes up constantly. Here is a clear breakdown:

| Dimension | MCP | OpenAI Tools API | Anthropic tool_use |
|-----------|-----|-----------------|-------------------|
| **Standard** | Open, vendor-neutral | Proprietary to OpenAI | Proprietary to Anthropic |
| **Server reuse** | One server works with any MCP client | Must redefine per integration | Must redefine per integration |
| **Transport** | stdio, SSE, WebSocket | HTTP (API call) | HTTP (API call) |
| **Resources** | First-class primitive | Not supported | Not supported |
| **Prompts** | First-class primitive | Not supported | Not supported |
| **Sampling** | Server can invoke LLM | Not supported | Not supported |
| **Schema** | JSON Schema (via Zod etc.) | JSON Schema | JSON Schema |
| **Streaming** | Supported | Supported | Supported |
| **Best for** | Persistent local tools, reusable integrations | One-off API tools | Anthropic-native integrations |

The key insight: MCP and function calling/tool_use are *complementary*, not competing. Under the hood, an MCP client translates tool calls from the model's native format (tool_use for Claude) into MCP protocol calls. You write the server once in MCP; the client handles the translation.

## Security Model and Authorization

MCP takes security seriously. Key considerations:

**Process isolation** — each MCP server runs in its own process with its own permissions. A compromised filesystem server cannot access a Postgres server's credentials.

**Capability declaration** — servers declare their capabilities on connection. A client (and thus the host) knows exactly what a server can do before any tools are called.

**Human-in-the-loop** — hosts are expected to request user approval before executing tool calls, especially for write operations. Claude Desktop shows a confirmation dialog. Claude Code respects permission boundaries configured by the user.

**Authorization (OAuth 2.0)** — the MCP spec includes an authorization framework for remote SSE servers, built on OAuth 2.0 with PKCE. This handles cases where the server needs to act on behalf of the user with third-party services (GitHub, Google, Slack).

**Input validation** — always validate inputs server-side even though the schema is declared. The model can send unexpected values; a server should never trust that the input matches the schema without verification.

**Prompt injection** — a server that reads user-controlled content (emails, web pages, documents) can inadvertently introduce prompt injection. Sanitize content returned to the model, especially in resource reads.

## Claude Desktop and Claude Code Integration

**Claude Desktop** was the first MCP host. It reads `claude_desktop_config.json` at startup, spawns the configured servers as child processes, and presents their tools in the chat UI. Tool calls appear with a confirmation dialog; the user can approve or reject each one. Resources are accessible but not surfaced as prominently as tools.

**Claude Code** (the CLI you're using right now) supports MCP natively via the `~/.claude/settings.json` config or project-level `.claude/settings.json`. Claude Code is particularly powerful with MCP because it operates in a headless, automated context — perfect for MCP servers that expose development tools like linters, test runners, or deployment scripts.

To add a server to Claude Code:

```json
// .claude/settings.json
{
  "mcpServers": {
    "dev-utils": {
      "command": "npx",
      "args": ["tsx", "./mcp-servers/dev-utils/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

The server starts when Claude Code initializes and its tools are available throughout the session.

## The 2026 Roadmap

MCP has been evolving rapidly. Key developments in progress:

**Streamable HTTP transport** — a new transport that replaces SSE with a cleaner streaming HTTP approach, better suited for cloud deployments and proxying.

**Multi-server routing** — hosts routing specific tool calls to specific servers based on capability declarations, enabling more intelligent tool selection at scale.

**Server-to-server communication** — an experimental extension where one MCP server can call another, enabling composable tool pipelines without the host as an intermediary.

**Typed resource schemas** — stronger typing for resources beyond raw text/binary, enabling structured data resources with declared schemas.

**MCP Registry** — a centralized discovery service for finding and installing MCP servers, similar to npm for packages. This will significantly lower the barrier to finding quality servers.

The protocol has reached a level of stability where production adoption is solid, but the ecosystem is still early enough that the servers you build today will have a real impact on the standard's evolution.

## Getting Started Checklist

- Install the MCP Inspector: `npm install -g @modelcontextprotocol/inspector`
- Browse official servers: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- Read the spec: [spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io)
- Join the Discord: active community with server authors and Anthropic engineers
- Pick a use case you hit repeatedly (reading logs, querying a DB, running tests) and build a server for it

MCP is one of those rare standards that is well-designed enough to be worth learning deeply, not just skimming. The architecture is clean, the primitives are the right abstractions, and the ecosystem momentum is real. If you're building anything with AI agents in 2026, understanding MCP is no longer optional.
