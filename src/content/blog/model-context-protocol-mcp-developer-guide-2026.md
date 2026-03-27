---
title: "Model Context Protocol (MCP): The Developer Guide to AI Tool Integration 2026"
description: "Build production-grade MCP servers from scratch. Covers TypeScript and Python SDKs, resources vs tools vs prompts, testing with Inspector, security patterns, and real integrations for Claude Desktop, Cursor, and Zed."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["mcp", "model-context-protocol", "claude", "cursor", "ai-tools", "typescript", "python", "developer-tools", "llm-integration"]
readingTime: "20 min read"
---

The Model Context Protocol (MCP) has become the standard for connecting AI assistants to external systems in 2026. If you've used Claude Desktop with file access, or Cursor with database introspection, you've used MCP without knowing it.

This guide is for developers who want to **build** MCP servers — not just consume them. We cover both the TypeScript and Python SDKs, the three primitive types (resources, tools, prompts), testing, security, and real-world integrations with Claude Desktop, Cursor, and Zed.

> Already know MCP basics? Jump to [Building a Full MCP Server](#building-a-full-mcp-server) or [Security Patterns](#security-patterns).

---

## MCP Primitives: Resources, Tools, Prompts

MCP servers expose three types of capabilities. Understanding the distinction is critical to good server design.

| Primitive | Direction | Use Case |
|-----------|-----------|----------|
| **Resource** | Server → Client (read-only) | Expose data the LLM can read: files, DB rows, API responses |
| **Tool** | Client → Server (executes) | Actions the LLM can trigger: write file, run query, call API |
| **Prompt** | Server → Client (templates) | Pre-built prompt templates with parameters |

### Resources

Resources are like `GET` endpoints. They have a URI, a MIME type, and content. The LLM reads them but cannot modify them directly.

```
mcp://my-server/files/config.json
mcp://my-server/database/users?limit=10
mcp://my-server/git/log?branch=main&count=20
```

### Tools

Tools are like `POST` endpoints. They take arguments and produce side effects. The LLM calls them to accomplish tasks.

```json
{
  "name": "write_file",
  "description": "Write content to a file at the specified path",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {"type": "string"},
      "content": {"type": "string"}
    },
    "required": ["path", "content"]
  }
}
```

### Prompts

Prompts are reusable prompt templates with parameters. Less commonly used, but powerful for domain-specific workflows.

---

## Environment Setup

### TypeScript SDK

```bash
npm create mcp-server@latest my-mcp-server
cd my-mcp-server
npm install
```

Or from scratch:

```bash
mkdir my-mcp-server && cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node tsx
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Python SDK

```bash
pip install mcp
# Or with uv:
uv add mcp
```

---

## Building a Full MCP Server

Let's build a practical MCP server: a **GitHub repository assistant** that exposes PR data as resources and provides tools to create issues and add labels.

### TypeScript Implementation

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Octokit } from "octokit";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const server = new McpServer({ name: "github-assistant", version: "1.0.0" });

// --- RESOURCES ---

// List open PRs as a resource
server.resource(
  "open-prs",
  "github://prs/open",
  async () => {
    const { data } = await octokit.rest.pulls.list({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
      state: "open",
      per_page: 20
    });

    const content = data.map(pr =>
      `#${pr.number} — ${pr.title} (@${pr.user?.login}) — ${pr.created_at}`
    ).join("\n");

    return {
      contents: [{
        uri: "github://prs/open",
        mimeType: "text/plain",
        text: content || "No open PRs"
      }]
    };
  }
);

// Single PR detail as a resource with URI template
server.resource(
  "pr-detail",
  new URL("github://prs/{number}"),
  async (uri) => {
    const match = uri.pathname.match(/\/prs\/(\d+)/);
    const prNumber = parseInt(match?.[1] ?? "0");

    const [{ data: pr }, { data: files }] = await Promise.all([
      octokit.rest.pulls.get({
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        pull_number: prNumber
      }),
      octokit.rest.pulls.listFiles({
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        pull_number: prNumber
      })
    ]);

    const content = `
# PR #${pr.number}: ${pr.title}
**Author:** @${pr.user?.login}
**Status:** ${pr.state} | **Mergeable:** ${pr.mergeable}
**Files changed:** ${files.length}

## Description
${pr.body ?? "_No description_"}

## Changed Files
${files.map(f => `- ${f.filename} (+${f.additions} -${f.deletions})`).join("\n")}
    `.trim();

    return {
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: content
      }]
    };
  }
);

// --- TOOLS ---

server.tool(
  "create_issue",
  "Create a GitHub issue in the repository",
  {
    title: z.string().min(1).max(256),
    body: z.string().optional(),
    labels: z.array(z.string()).optional(),
    assignees: z.array(z.string()).optional()
  },
  async ({ title, body, labels, assignees }) => {
    const { data } = await octokit.rest.issues.create({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
      title,
      body,
      labels,
      assignees
    });

    return {
      content: [{
        type: "text",
        text: `Created issue #${data.number}: ${data.html_url}`
      }]
    };
  }
);

server.tool(
  "add_pr_label",
  "Add a label to a pull request",
  {
    pr_number: z.number().int().positive(),
    label: z.string()
  },
  async ({ pr_number, label }) => {
    await octokit.rest.issues.addLabels({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
      issue_number: pr_number,
      labels: [label]
    });

    return {
      content: [{
        type: "text",
        text: `Added label "${label}" to PR #${pr_number}`
      }]
    };
  }
);

server.tool(
  "request_review",
  "Request a code review from a GitHub user",
  {
    pr_number: z.number().int().positive(),
    reviewer: z.string()
  },
  async ({ pr_number, reviewer }) => {
    await octokit.rest.pulls.requestReviewers({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
      pull_number: pr_number,
      reviewers: [reviewer]
    });

    return {
      content: [{
        type: "text",
        text: `Requested review from @${reviewer} on PR #${pr_number}`
      }]
    };
  }
);

// --- PROMPTS ---

server.prompt(
  "review_pr",
  "Generate a code review prompt for a PR",
  { pr_number: z.string() },
  async ({ pr_number }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please review PR #${pr_number}. Check for:
1. Logic errors and edge cases
2. Security vulnerabilities (injection, auth bypass, data leaks)
3. Performance issues
4. Missing tests
5. Documentation gaps

Provide specific, actionable feedback with line references.`
      }
    }]
  })
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("GitHub Assistant MCP server running");
```

### Python Implementation

For teams preferring Python:

```python
# server.py
import os
import httpx
from mcp.server.fastmcp import FastMCP
from mcp import types

mcp = FastMCP("github-assistant")

GH_TOKEN = os.environ["GITHUB_TOKEN"]
GH_OWNER = os.environ["GITHUB_OWNER"]
GH_REPO = os.environ["GITHUB_REPO"]
GH_BASE = f"https://api.github.com/repos/{GH_OWNER}/{GH_REPO}"
GH_HEADERS = {"Authorization": f"Bearer {GH_TOKEN}", "X-GitHub-Api-Version": "2022-11-28"}


@mcp.resource("github://prs/open")
async def list_open_prs() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{GH_BASE}/pulls?state=open&per_page=20", headers=GH_HEADERS)
        resp.raise_for_status()
        prs = resp.json()
    lines = [f"#{pr['number']} — {pr['title']} (@{pr['user']['login']})" for pr in prs]
    return "\n".join(lines) or "No open PRs"


@mcp.tool()
async def create_issue(title: str, body: str = "", labels: list[str] | None = None) -> str:
    """Create a GitHub issue."""
    payload = {"title": title, "body": body, "labels": labels or []}
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{GH_BASE}/issues", json=payload, headers=GH_HEADERS)
        resp.raise_for_status()
        issue = resp.json()
    return f"Created issue #{issue['number']}: {issue['html_url']}"


@mcp.tool()
async def add_pr_label(pr_number: int, label: str) -> str:
    """Add a label to a pull request."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GH_BASE}/issues/{pr_number}/labels",
            json={"labels": [label]},
            headers=GH_HEADERS
        )
        resp.raise_for_status()
    return f'Added label "{label}" to PR #{pr_number}'


if __name__ == "__main__":
    mcp.run()
```

---

## Testing with MCP Inspector

Never ship an MCP server without testing it with the official Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

The Inspector opens a browser UI where you can:

1. Browse all exposed resources and fetch their content
2. Invoke tools with custom arguments and inspect responses
3. Test prompt templates
4. View the full JSON-RPC message log

For Python:

```bash
npx @modelcontextprotocol/inspector python server.py
```

**Automated tests** using the SDK's in-process client:

```typescript
// tests/server.test.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, it, expect, beforeEach } from "vitest";
import { buildServer } from "../src/index.js";

describe("GitHub Assistant MCP", () => {
  let client: Client;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = buildServer(); // refactor to accept transport
    await server.connect(serverTransport);
    client = new Client({ name: "test-client", version: "1.0.0" }, {});
    await client.connect(clientTransport);
  });

  it("lists available tools", async () => {
    const { tools } = await client.listTools();
    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain("create_issue");
    expect(toolNames).toContain("add_pr_label");
  });

  it("create_issue validates required fields", async () => {
    await expect(
      client.callTool("create_issue", {})
    ).rejects.toThrow();
  });
});
```

---

## Connecting to Claude Desktop

Add your server to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "github-assistant": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_OWNER": "your-org",
        "GITHUB_REPO": "your-repo"
      }
    }
  }
}
```

For Python:

```json
{
  "mcpServers": {
    "github-assistant": {
      "command": "python",
      "args": ["/absolute/path/to/server.py"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GITHUB_OWNER": "your-org",
        "GITHUB_REPO": "your-repo"
      }
    }
  }
}
```

Restart Claude Desktop. Your tools appear automatically in the toolbar.

---

## Connecting to Cursor

In Cursor settings → MCP:

```json
{
  "github-assistant": {
    "command": "node",
    "args": ["/path/to/dist/index.js"],
    "env": {
      "GITHUB_TOKEN": "ghp_..."
    }
  }
}
```

Cursor's agent can now call your tools directly during coding sessions — e.g., "create a GitHub issue for this bug I just found."

---

## HTTP Transport (For Remote Servers)

Stdio is fine for local tools. For shared team servers, use HTTP+SSE:

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const app = express();
app.use(express.json());

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});

app.post("/mcp", (req, res) => transport.handleRequest(req, res, req.body));
app.get("/mcp", (req, res) => transport.handleRequest(req, res));
app.delete("/mcp", (req, res) => transport.handleRequest(req, res));

await server.connect(transport);
app.listen(3100, () => console.log("MCP server on http://localhost:3100/mcp"));
```

Connect a client:

```typescript
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3100/mcp"));
await client.connect(transport);
```

---

## Security Patterns

### 1. Input Validation — Never Trust Tool Arguments

The LLM generates tool arguments. Always validate them server-side:

```typescript
server.tool(
  "read_file",
  "Read a file from the allowed directory",
  { path: z.string() },
  async ({ path }) => {
    // Prevent path traversal
    const resolved = resolve(ALLOWED_DIR, path);
    if (!resolved.startsWith(ALLOWED_DIR)) {
      throw new Error("Path traversal attempt blocked");
    }

    // Validate extension whitelist
    const ext = extname(resolved);
    if (![".md", ".txt", ".json", ".ts", ".py"].includes(ext)) {
      throw new Error(`File type ${ext} not allowed`);
    }

    return { content: [{ type: "text", text: await readFile(resolved, "utf-8") }] };
  }
);
```

### 2. Authentication for Remote Servers

```typescript
app.use("/mcp", (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !isValidToken(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  // Attach user context for downstream tools
  (req as any).user = decodeToken(token);
  next();
});
```

### 3. Rate Limiting per Session

```typescript
import { RateLimiterRedis } from "rate-limiter-flexible";

const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "mcp_rl",
  points: 100,   // 100 tool calls
  duration: 60   // per minute
});

// In tool handler:
async function guardedToolCall(sessionId: string, fn: () => Promise<any>) {
  try {
    await limiter.consume(sessionId);
    return await fn();
  } catch (e) {
    throw new Error("Rate limit exceeded. Try again in 60 seconds.");
  }
}
```

### 4. Audit Logging

Every tool call should be logged with the session, tool name, arguments (sanitized), and outcome:

```typescript
server.setToolCallMiddleware(async (toolCall, next) => {
  const start = Date.now();
  logger.info("mcp_tool_call", {
    tool: toolCall.name,
    session: currentSession(),
    args: sanitizeArgs(toolCall.arguments)
  });

  try {
    const result = await next(toolCall);
    logger.info("mcp_tool_success", { tool: toolCall.name, ms: Date.now() - start });
    return result;
  } catch (err) {
    logger.error("mcp_tool_error", { tool: toolCall.name, error: String(err) });
    throw err;
  }
});
```

---

## Publishing Your MCP Server

The MCP ecosystem has a growing registry. To publish:

1. Add an `mcp` section to `package.json`:

```json
{
  "mcp": {
    "entry": "dist/index.js",
    "transport": ["stdio", "http"],
    "tools": ["create_issue", "add_pr_label", "request_review"],
    "resources": ["github://prs/open", "github://prs/{number}"]
  }
}
```

2. Submit to [mcp.run](https://mcp.run) or the Smithery registry for discoverability.

3. Include a `README` with connection instructions for Claude Desktop, Cursor, and Zed — these are the three most common clients in 2026.

---

## Patterns Worth Memorizing

```
Resource = read-only data endpoint (GET)
Tool = action with side effects (POST)
Prompt = reusable prompt template
```

The single biggest mistake developers make: **exposing tools that have no guard rails**. Every tool that writes, deletes, or calls external APIs needs:
- Input validation (path traversal, SQL injection, argument type checks)
- Confirmation prompts for destructive actions
- Rate limiting
- Audit logging

Build the guard rails first, tool logic second.

---

## Further Reading

- [MCP Complete Guide](/blog/model-context-protocol-mcp-complete-guide-2026) — architecture deep dive and protocol internals
- [Building Production AI Agents](/blog/ai-agents-architecture-patterns-2026) — integrate MCP into multi-agent systems
- [API Security Best Practices](/blog/api-security-best-practices-owasp-rate-limiting-jwt-2026) — secure your HTTP transport layer

Use our free [JSON Formatter](/tools/json-formatter) to inspect MCP JSON-RPC messages, and the [API Request Builder](/tools/api-request-builder) to test your HTTP MCP endpoints without writing client code.
